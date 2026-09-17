"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewPage } from "../types/book";
import type { ViewMode } from "../types/view";
import { isOnLastPage } from "../utils/spread";

interface PageFlipHandle {
  current?: PageFlipHandle | null;
  pageFlip?: (() => PageFlipHandle) | PageFlipHandle;
  turnToPage?: (page: number) => void;
  flip?: (page: number) => void;
  turnPage?: (page: number) => void;
  flipNext?: () => void;
  flipPrev?: () => void;
  /** Saved by FlipbookReader sequential patch — instant jump without multi-page animation. */
  __originalTurnToPage?: (page: number) => void;
}

export interface GoToPageOptions {
  /**
   * Flipbook only.
   * - true / undefined: sequential page-by-page flip (Pages panel, next/prev).
   * - false: instant jump (search) — no intermediate flips.
   */
  sequential?: boolean;
}

interface Args {
  pages: PreviewPage[];
  viewMode: ViewMode;
}

export const pageAnchorId = (viewMode: ViewMode, pageNumber: number): string => {
  if (viewMode === "vertical") return `preview-vert-page-${pageNumber}`;
  if (viewMode === "horizontal") return `preview-horiz-page-${pageNumber}`;
  return `preview-page-${pageNumber}`;
};

const NAV_COOLDOWN_MS = 320;

export function usePageNavigation({ pages, viewMode }: Args) {
  const [currentPage, setCurrentPage] = useState(1);
  const [blockMouseFlip, setBlockMouseFlip] = useState(false);
  const flipRef = useRef<PageFlipHandle | null>(null);
  /* Read by callbacks; kept in sync after commit and eagerly on navigation. */
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  const lastNavAtRef = useRef(0);
  const totalPages = pages.length;

  const setPageFlipRef = useCallback((value: unknown) => {
    flipRef.current = value as PageFlipHandle | null;
  }, []);

  const getPageFlip = useCallback((): PageFlipHandle | null => {
    let instance: PageFlipHandle | null | undefined = flipRef.current;
    if (!instance) return null;
    if (instance.current) instance = instance.current;
    if (!instance) return null;
    if (typeof instance.pageFlip === "function") return instance.pageFlip();
    return instance.pageFlip ?? instance;
  }, []);

  /**
   * Go to a page.
   *
   * Flipbook: drives StPageFlip (sequential or instant jump).
   * Vertical / Horizontal: ONLY updates currentPage — the active reader owns
   * scroll/centering. Calling scrollTo here as well caused a second competing
   * scroll (search + keystroke loops looked like continuous opposite motion).
   */
  const goToPage = useCallback(
    (pageNumber: number, options?: GoToPageOptions) => {
      if (totalPages === 0) return;
      const target = Math.max(1, Math.min(totalPages, pageNumber));

      /* Already on this page — do not re-trigger reader motion. */
      if (target === currentPageRef.current) {
        return;
      }

      setCurrentPage(target);
      currentPageRef.current = target;

      if (viewMode === "flipbook") {
        const flip = getPageFlip();
        if (!flip) return;
        const zeroBased = target - 1;
        const sequential = options?.sequential !== false;

        if (!sequential && typeof flip.__originalTurnToPage === "function") {
          flip.__originalTurnToPage(zeroBased);
          return;
        }
        if (typeof flip.turnToPage === "function") {            
          flip.turnToPage(zeroBased);
          return;
        }
        if (typeof flip.flip === "function") {
          flip.flip(zeroBased);
          return;
        }
        if (typeof flip.turnPage === "function") {
          flip.turnPage(zeroBased);
        }
        return;
      }

      /*
       * Vertical / Horizontal: currentPage change alone is enough.
       * HorizontalReader / VerticalReader effects center the active page.
       * Do NOT call a second scrollTo/scrollIntoView here.
       */
    },
    [getPageFlip, totalPages, viewMode],
  );

  const canNavigate = useCallback(() => {
    const now = Date.now();
    if (now - lastNavAtRef.current < NAV_COOLDOWN_MS) return false;
    lastNavAtRef.current = now;
    return true;
  }, []);

     const nextPage = useCallback(() => {
    if (totalPages === 0 || !canNavigate()) return;
    /*
     * Already showing the last page — no-op so autoplay can detect the stall.
     * In flipbook the last spread (e.g. 50/51) counts, not just page 51.
     */
    if (isOnLastPage(currentPageRef.current, totalPages, viewMode)) return;
    if (viewMode === "flipbook") {
      const flip = getPageFlip();
      if (flip?.flipNext) {
        flip.flipNext();
        return;
      }
    }
    goToPage(currentPageRef.current + 1);
  }, [canNavigate, getPageFlip, goToPage, totalPages, viewMode]);
  
  const prevPage = useCallback(() => {
    if (totalPages === 0 || !canNavigate()) return;
    if (viewMode === "flipbook") {
      const flip = getPageFlip();
      if (flip?.flipPrev) {
        flip.flipPrev();
        return;
      }
    }
    goToPage(currentPageRef.current - 1);
  }, [canNavigate, getPageFlip, goToPage, totalPages, viewMode]);

  const goToLinkedPage = useCallback(
    (link: string) => {
      const clean = String(link ?? "").trim();
      if (!clean || totalPages === 0) return;
      let index = pages.findIndex((page) => page.id.trim() === clean);
      if (index === -1 && !Number.isNaN(Number(clean))) index = Number(clean) - 1;
      if (index < 0 || index >= totalPages) return;
      goToPage(index + 1);
    },
    [goToPage, pages, totalPages],
  );

  const [knownTotal, setKnownTotal] = useState(totalPages);
  if (knownTotal !== totalPages) {
    setKnownTotal(totalPages);
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    canGoNext: !isOnLastPage(currentPage, totalPages, viewMode),
    goToPage,
    goToLinkedPage,
    nextPage,
    prevPage,
    setPageFlipRef,
    blockMouseFlip,
    setBlockMouseFlip,
  };
}