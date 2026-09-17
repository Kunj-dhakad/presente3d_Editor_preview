import useEditorStore, { DEFAULT_TEXT_COLOR } from "@editor/store/editorStore";
import { TOC_STYLE_PRESETS, type TocStyleKey } from "@editor/blocks/Index/lib/tocStyles";

/**
 * A book has exactly one index, and it belongs on the page after the cover.
 *
 * Both entry points — the Book Index card in the Text panel and dragging it onto
 * the canvas — come through here, so neither can drop a second index or leave
 * one in the middle of the book.
 */

/** Page 2 of the book: index 0 is the cover. */
export const INDEX_PAGE = 1;

export function findBookIndex() {
  const slides = useEditorStore.getState().slides;
  for (let slide = 0; slide < slides.length; slide++) {
    const element = slides[slide].elements.find(el => (el.data as { bookRole?: string }).bookRole === "index");
    if (element) return { slide, id: element.id };
  }
  return null;
}

/**
 * Adds the index to page 2, or — when the book already has one — opens the page
 * it is on and selects it, so the click is never silently ignored.
 */
export function addBookIndex(styleKey: TocStyleKey = "classic"): "added" | "exists" {
  const store = useEditorStore.getState();
  const existing = findBookIndex();
  if (existing) {
    store.setActiveSlide(existing.slide);
    store.setActiveElementId(existing.id);
    return "exists";
  }

  // The cover keeps page 1, so make sure there is a page 2 to hold the index.
  const slides = useEditorStore.getState().slides;
  if (slides.length <= INDEX_PAGE) store.addSlide(slides[slides.length - 1].id);
  useEditorStore.getState().setActiveSlide(INDEX_PAGE);

  const page = useEditorStore.getState().slides[INDEX_PAGE];
  const width = page?.width || 350;
  const height = page?.height || 434;
  // Sized against the real page so the index keeps even margins on any canvas.
  const boxWidth = Math.round(width * 0.82);
  const boxHeight = Math.round(height * 0.65);
  const preset = TOC_STYLE_PRESETS.find(style => style.key === styleKey)?.preset ?? {};

  useEditorStore.getState().addElement({
    type: "text",
    bookRole: "index",
    text: "INDEX",
    tocTitle: "INDEX",
    tocLeader: ".",
    tocPageAlignment: "right",
    tocShowRanges: false,
    tocSpacing: 8,
    tocIndent: 16,
    tocMarginTop: 16,
    tocMarginBottom: 16,
    tocStyle: styleKey,
    x: Math.round((width - boxWidth) / 2),
    y: Math.round((height - boxHeight) / 2),
    width: boxWidth,
    height: boxHeight,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    fontFamily: "Plus Jakarta Sans",
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.4,
    textAlign: "left",
    letterSpacing: 0,
    color: DEFAULT_TEXT_COLOR,
    ...preset,
  });
  return "added";
}
