/**
 * Where a flipbook's pages sit when only one of them is showing.
 *
 * With `showCover` the reader opens on the cover alone and may end on a back
 * cover alone, but StPageFlip keeps the book two pages wide either way and
 * parks the lone page on one side. Left as-is that reads as a blank second
 * page next to the cover; shifting the book by half a page centres it instead.
 *
 * Page numbering here is 1-based, matching the toolbar.
 */

export type SpreadSide = "cover" | "back" | "spread";

/**
 * Which pages the reader is showing.
 *
 * After the cover, pages pair up as (2,3), (4,5), … — so in zero-based terms
 * odd indices are left-hand pages. The final page is therefore on its own
 * exactly when its index is odd and nothing follows it.
 */
export const spreadSide = (page: number, total: number): SpreadSide => {
  if (total <= 0) return "spread";
  if (page <= 1) return "cover";
  const index = page - 1;
  if (index === total - 1 && index % 2 === 1) return "back";
  return "spread";
};

/**
 * How far to slide the book so a lone page lands in the middle of the stage,
 * in unscaled page pixels. The cover sits on the right half, so it moves left;
 * a lone back cover sits on the left half and moves right.
 */
export const singlePageOffset = (
  page: number,
  total: number,
  pageWidth: number,
): number => {
  const side = spreadSide(page, total);
  if (side === "cover") return -pageWidth / 2;
  if (side === "back") return pageWidth / 2;
  return 0;
};

/**
 * The slide indices (0-based, as the editor stores them) that share a spread
 * with `slideIndex`, left page first.
 *
 * Same pairing rule as `spreadSide`, just from the editor's side of the fence:
 * the cover stands alone, then (1,2), (3,4), … A trailing page with no partner
 * comes back on its own, so callers get one index or two and never a gap.
 */
export const spreadSlideIndices = (slideIndex: number, total: number): number[] => {
  if (slideIndex <= 0 || slideIndex >= total) return [Math.max(0, Math.min(slideIndex, total - 1))];
  const left = slideIndex % 2 === 1 ? slideIndex : slideIndex - 1;
  const right = left + 1;
  return right < total ? [left, right] : [left];
};
