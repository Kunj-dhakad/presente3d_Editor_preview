"use client";

import React, { forwardRef, type CSSProperties } from "react";
import type { PreviewPage } from "../types/book";
import { useBookPreview } from "../context/BookPreviewContext";
import BlockRenderer from "./BlockRenderer";

interface Props {
  page: PreviewPage;
  /** 1-based page number. */
  pageNumber?: number;
  style?: CSSProperties;
  className?: string;
  /** Small preview (Pages panel / directory): never mount real media. */
  thumbnail?: boolean;
}

/*
 * Pages within this many pages of currentPage count as "nearby": their
 * images load eagerly and their video/embed players mount. Covers the next
 * two flipbook spreads so they are ready before the turn starts.
 */
const NEARBY_PAGE_RADIUS = 4;

/**
 * Renders one authored-size book page.
 *
 * Narration behaviour:
 *
 * - Front cover  → only front cover can highlight
 * - Normal spread → both LEFT and RIGHT pages can highlight
 * - Back cover   → only back cover can highlight
 *
 * In a normal two-page spread, currentPage represents the LEFT page,
 * while currentPage + 1 represents the RIGHT page.
 */
const PageRenderer = forwardRef<HTMLDivElement, Props>(
  function PageRenderer(
    {
      page,
      pageNumber,
      style,
      className,
      thumbnail = false,
    },
    ref,
  ) {
    const {
      chapters,
      goToPage,
      goToLinkedPage,
      speakingBlockId,
      speakingWordIndex,
      currentPage,
      pages,
      viewMode,
    } = useBookPreview();

    /*
     * Resolve the page's 1-based page number.
     *
     * Prefer the explicit pageNumber supplied by the reader.
     * Otherwise find the page by its ID.
     */
    const resolvedNumber =
      pageNumber ??
      (() => {
        const idx = pages.findIndex(
          (p) => p.id === page.id,
        );

        return idx >= 0 ? idx + 1 : -1;
      })();

    /*
     * Determine whether this page is currently part of
     * the visible narration spread.
     *
     * Flipbook mode:
     *
     *   Front cover:
     *      currentPage = 1
     *      visible = [1]
     *
     *   Normal spread:
     *      currentPage = 4
     *      visible = [4, 5]
     *
     *   Back cover:
     *      currentPage = last page
     *      visible = [last]
     *
     * Other view modes:
     *      only currentPage is considered active.
     */
    const isFlipbookMode = viewMode === "flipbook";

    const isFrontCover =
      currentPage === 1;

    const isBackCover =
      currentPage === pages.length;

    const isCurrentPage =
      resolvedNumber === currentPage;

    const isRightSpreadPage =
      isFlipbookMode &&
      !isFrontCover &&
      !isBackCover &&
      resolvedNumber === currentPage + 1;

    /*
     * A page can receive narration highlighting if it is
     * either the current LEFT page or the visible RIGHT page.
     */
    const isNarrationPage =
      isCurrentPage || isRightSpreadPage;

    /*
     * Active for chart refresh: same pages that are in the resting spread.
     * Vertical/Horizontal still treat only currentPage as active.
     */
    const isPageActive = isNarrationPage;

    const isPageNearby =
      !thumbnail &&
      resolvedNumber > 0 &&
      Math.abs(resolvedNumber - currentPage) <= NEARBY_PAGE_RADIUS;

    /*
     * Only pass the narration state to pages that are actually
     * visible in the current reading spread.
     *
     * This is the critical fix:
     *
     * Before:
     *   RIGHT PAGE → narratingBlockId = null
     *
     * Now:
     *   LEFT PAGE  → narratingBlockId = speakingBlockId
     *   RIGHT PAGE → narratingBlockId = speakingBlockId
     */
    const activeNarratingBlockId =
      isNarrationPage
        ? speakingBlockId
        : null;

    const activeNarratingWordIndex =
      isNarrationPage
        ? speakingWordIndex
        : null;

    return (
      <div
        ref={ref}
        data-page-id={page.id}
        data-page-number={
          resolvedNumber > 0
            ? resolvedNumber
            : undefined
        }
        className={`relative shrink-0 overflow-hidden shadow-md ${
          className ?? ""
        }`}
        style={{
          width: page.width,
          height: page.height,
          // White when the page has none. Not a bg-white class: Bootstrap (on the pitch
          // viewer) gives .bg-white !important, which would hide every page background.
          background: page.background || "#ffffff",
          ...style,
        }}
      >
        {page.blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            chapters={chapters}
            pageWidth={page.width}
            pageHeight={page.height}
            narratingBlockId={
              activeNarratingBlockId
            }
            narratingWordIndex={
              activeNarratingWordIndex
            }
            onOpenPage={goToPage}
            onFollowLink={goToLinkedPage}
            isPageActive={isPageActive}
            isPageNearby={isPageNearby}
          />
        ))}
      </div>
    );
  },
);

export default PageRenderer;