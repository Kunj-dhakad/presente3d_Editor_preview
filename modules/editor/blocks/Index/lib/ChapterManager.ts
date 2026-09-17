import type { SlideType, TextData } from "@editor/store/editorStore";
import { plainText } from "@shared/plainText";

export type ChapterEntry = {
  elementId: string;
  slideId: string;
  title: string;
  subtitle?: string;
  startPage: number;
  endPage: number;
  displayTitle: string;
};

/**
 * The document's slide array is the sole page-order authority. This pure,
 * memoizable derivation keeps TOC data correct for insertions, deletion,
 * reordering, duplication, and history restores without storing stale ranges.
 */
function chaptersEqual(a: ChapterEntry[], b: ChapterEntry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => {
    const other = b[index];
    return (
      entry.elementId === other.elementId &&
      entry.slideId === other.slideId &&
      entry.title === other.title &&
      entry.subtitle === other.subtitle &&
      entry.startPage === other.startPage &&
      entry.endPage === other.endPage &&
      entry.displayTitle === other.displayTitle
    );
  });
}

let cachedSlides: SlideType[] | null = null;
let cachedChapters: ChapterEntry[] = [];

type SlideElement = SlideType["elements"][number];

/**
 * Per-slide memo of "which element on this page starts a chapter".
 *
 * The reference cache below only hits when the very same array comes back, and
 * immer hands out a new `slides` array after every edit — so the full
 * O(slides x elements) scan was running on every store notification, on every
 * keystroke. Immer does keep *unchanged slides* identical, so keying on the
 * slide object means an edit only rescans the one page that actually changed.
 * A WeakMap lets discarded slides be collected.
 */
const chapterElementCache = new WeakMap<SlideType, SlideElement | null>();

function chapterElementOf(slide: SlideType): SlideElement | null {
  const cached = chapterElementCache.get(slide);
  if (cached !== undefined) return cached;

  const found =
    slide.elements.find((candidate) => {
      const candidateData = candidate.data as TextData;
      return candidateData.type === "text" && candidateData.bookRole === "chapter";
    }) ?? null;

  chapterElementCache.set(slide, found);
  return found;
}

/**
 * Called from a zustand selector, so this runs on every store notification.
 * Two layers of caching keep that cheap:
 *  - a reference hit skips the O(slides x elements) scan entirely;
 *  - an equal result returns the *previous* array, so the reference stays
 *    stable across edits that don't touch chapters and subscribers don't
 *    re-render.
 * The returned array must be treated as read-only (all callers already do).
 */
export function getChapters(slides: SlideType[]): ChapterEntry[] {
  if (slides === cachedSlides) return cachedChapters;
  const next = computeChapters(slides);
  cachedSlides = slides;
  if (!chaptersEqual(next, cachedChapters)) cachedChapters = next;
  return cachedChapters;
}

function computeChapters(slides: SlideType[]): ChapterEntry[] {
  const starts: Array<Omit<ChapterEntry, "endPage" | "displayTitle"> & { autoNumber: boolean }> = [];
  slides.forEach((slide, slideIndex) => {
    // A page is a chapter start once, even if a template accidentally contains
    // more than one Chapter element on the same page.
    const element = chapterElementOf(slide);
    if (!element) return;
      const data = element.data as TextData;
      starts.push({
        elementId: element.id,
        slideId: slide.id,
        title: plainText(data.text) || "Untitled chapter",
        subtitle: data.chapterSubtitle?.trim() || undefined,
        startPage: slideIndex + 1,
        autoNumber: data.chapterAutoNumber !== false,
      });
  });

  return starts.map((chapter, index) => ({
    elementId: chapter.elementId,
    slideId: chapter.slideId,
    title: chapter.title,
    subtitle: chapter.subtitle,
    startPage: chapter.startPage,
    endPage: (starts[index + 1]?.startPage ?? slides.length + 1) - 1,
    displayTitle: chapter.autoNumber ? `Chapter ${index + 1}: ${chapter.title}` : chapter.title,
  }));
}
