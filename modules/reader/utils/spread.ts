import type { ViewMode } from "../types/view";

/*
 * StPageFlip (landscape + showCover) groups pages into spreads
 * [0], [1,2], [3,4], ... and getCurrentPageIndex() always returns the
 * spread's first page. Targets must be normalized the same way, otherwise
 * a right-hand page (e.g. index 8 in [7,8]) is never "reached".
 */
export function toSpreadStart(index: number): number {
  if (index <= 0) return 0;
  return index % 2 === 1 ? index : index - 1;
}

/**
 * 1-based page numbers visible for the reader's current position.
 *
 * `singlePage` is the flipbook on a narrow screen, where one page fills the
 * width instead of a two-page spread.
 */
export function pagesInView(
  currentPage: number,
  totalPages: number,
  viewMode: ViewMode,
  singlePage = false,
): number[] {
  if (totalPages <= 0) return [];

  if (viewMode === "flipbook" && !singlePage) {
    if (currentPage === 1) return [1];
    if (currentPage < totalPages) return [currentPage, currentPage + 1];
    return [currentPage];
  }

  return [currentPage];
}

/** True when the reader already shows the book's last page. */
export function isOnLastPage(
  currentPage: number,
  totalPages: number,
  viewMode: ViewMode,
  singlePage = false,
): boolean {
  const visible = pagesInView(currentPage, totalPages, viewMode, singlePage);
  return visible.length === 0 || visible[visible.length - 1] >= totalPages;
}
