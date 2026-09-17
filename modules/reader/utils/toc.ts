import type { ChapterEntry, PreviewPage } from "../types/book";
import type { IndexBlock, TextBlock } from "../types/blocks";
import { plainText } from "@shared/plainText";

/**
 * Chapters are derived from page order, never stored, so a book that was
 * reordered or trimmed before export still produces a correct table of
 * contents.
 */
export function deriveChapters(pages: PreviewPage[]): ChapterEntry[] {
  const starts: Array<{
    blockId: string;
    pageId: string;
    title: string;
    subtitle?: string;
    startPage: number;
  }> = [];

  pages.forEach((page, pageIndex) => {
    // A page opens a chapter at most once, even if a template accidentally
    // carries two chapter headings.
    const heading = page.blocks.find(
      (block): block is TextBlock =>
        block.kind === "text" && block.role === "chapter",
    );
    if (!heading) return;

    starts.push({
      blockId: heading.id,
      pageId: page.id,
      title: plainText(heading.text) || "Untitled chapter",
      startPage: pageIndex + 1,
    });
  });

  return starts.map((chapter, index) => ({
    ...chapter,
    endPage: (starts[index + 1]?.startPage ?? pages.length + 1) - 1,
    displayTitle: `Chapter ${index + 1}: ${chapter.title}`,
  }));
}

export interface IndexSlice {
  page: number;
  entries: ChapterEntry[];
}

/**
 * Splits the chapter list across however many index pages the author's box
 * can hold, mirroring how the book was laid out at authoring time.
 */
export function paginateIndex(
  chapters: ChapterEntry[],
  block: IndexBlock,
): IndexSlice[] {
  const rowHeight = Math.max(16, block.fontSize * block.lineHeight) + block.spacing;
  const headerHeight = block.fontSize * block.lineHeight * 1.25 + block.spacing * 1.5;
  const printableHeight = Math.max(
    1,
    block.height - block.marginTop - block.marginBottom,
  );
  // Always keep at least one entry per page, even for a deliberately tiny box.
  const perPage = Math.max(
    1,
    Math.floor(Math.max(0, printableHeight - headerHeight) / rowHeight),
  );

  const slices: IndexSlice[] = [];
  for (let start = 0; start < chapters.length; start += perPage) {
    slices.push({
      page: slices.length,
      entries: chapters.slice(start, start + perPage),
    });
  }
  return slices.length ? slices : [{ page: 0, entries: [] }];
}
