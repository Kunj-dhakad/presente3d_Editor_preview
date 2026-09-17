import type { PreviewPage, PreviewTheme } from "../types/book";
import {
  DEFAULT_PAGE_BACKGROUND,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
} from "../constants/reader";

/**
 * The reader sizes its flipbook spread once, from the first page — pages in a
 * book share geometry, and a per-page measurement would make the spread jump.
 */
export function parseTheme(pages: PreviewPage[]): PreviewTheme {
  const first = pages[0];
  return {
    pageWidth: first?.width ?? DEFAULT_PAGE_WIDTH,
    pageHeight: first?.height ?? DEFAULT_PAGE_HEIGHT,
    background: first?.background ?? DEFAULT_PAGE_BACKGROUND,
  };
}
