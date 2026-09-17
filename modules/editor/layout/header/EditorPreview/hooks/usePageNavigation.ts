"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BookPageData, ViewMode } from "../types/book";

interface PageFlipHandle {
  current?: PageFlipHandle | null;
  pageFlip?: (() => PageFlipHandle) | PageFlipHandle;
  turnToPage?: (page: number) => void;
  flip?: (page: number) => void;
  turnPage?: (page: number) => void;
  flipNext?: () => void;
  flipPrev?: () => void;
  turnToPrevPage?: () => void;
}

interface UsePageNavigationArgs {
  pages: BookPageData[] | null;
  viewMode: ViewMode;
  bookWidth: number;
  bookHeight: number;
  /** Portrait reader: one sheet on screen instead of a two-page spread. */
  singlePage: boolean;
}

export function usePageNavigation({
  pages,
  viewMode,
  bookWidth,
  bookHeight,
  singlePage,
}: UsePageNavigationArgs) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const pageFlipRef = useRef<PageFlipHandle | null>(null);

  const setPageFlipRef = useCallback((refValue: unknown) => {
    pageFlipRef.current = refValue as PageFlipHandle | null;
  }, []);

  const getPageFlip = useCallback((): PageFlipHandle | null => {
    let instance: PageFlipHandle | null | undefined = pageFlipRef.current;

    if (!instance) return null;

    if (instance.current) {
      instance = instance.current;
    }

    if (!instance) return null;

    if (typeof instance.pageFlip === "function") {
      return instance.pageFlip();
    }

    if (instance.pageFlip) {
      return instance.pageFlip;
    }

    return instance;
  }, []);

  const scrollToPage = useCallback(
    (pageNumber: number) => {
      let el: HTMLElement | null = null;

      if (viewMode === "vertical") {
        el = document.getElementById(`vert-page-wrapper-${pageNumber}`);
      } else if (viewMode === "horizontal") {
        el = document.getElementById(`horiz-page-wrapper-${pageNumber}`);
      } else {
        el = document.getElementById(`reader-page-${pageNumber}`);
      }

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    },
    [viewMode],
  );

  const goToPage = useCallback(
    (pageNumber: number) => {
      if (!pages || pages.length === 0) return;

      const target = Math.max(1, Math.min(pages.length, pageNumber));
      const pf = getPageFlip();

      setCurrentPage(target);

      if (viewMode === "flipbook" && pf) {
        const zeroBasedIndex = target - 1;

        if (typeof pf.turnToPage === "function") {
          pf.turnToPage(zeroBasedIndex);
        } else if (typeof pf.flip === "function") {
          pf.flip(zeroBasedIndex);
        } else if (typeof pf.turnPage === "function") {
          pf.turnPage(zeroBasedIndex);
        }
      } else {
        scrollToPage(target);
      }
    },
    [pages, viewMode, getPageFlip, scrollToPage],
  );

  const goToLinkedPage = useCallback(
    (linkValue: string) => {
      if (!linkValue || !pages || pages.length === 0) return;

      const cleanLink = String(linkValue).trim();

      let targetIndex = pages.findIndex(
        (page) => String(page.id).trim() === cleanLink,
      );

      if (targetIndex === -1 && !Number.isNaN(Number(cleanLink))) {
        targetIndex = Number(cleanLink) - 1;
      }

      if (targetIndex < 0 || targetIndex >= pages.length) {
        console.warn("Linked page not found:", cleanLink);
        return;
      }

      const targetPage = targetIndex + 1;

      goToPage(targetPage);
    },
    [pages, goToPage],
  );

  useEffect(() => {
    if (viewMode !== "flipbook" || !pages) return;

    const calculateScale = () => {
      const availableWidth = window.innerWidth - 180;
      const availableHeight = window.innerHeight - 150;

      const openBookWidth = bookWidth * 2;

      const calculatedScale = Math.min(
        1,
        availableWidth / openBookWidth,
        availableHeight / bookHeight,
      );

      setScale(Math.max(0.1, calculatedScale));
    };

    calculateScale();

    window.addEventListener("resize", calculateScale);

    return () => window.removeEventListener("resize", calculateScale);
  }, [viewMode, bookWidth, bookHeight, pages]);

  const nextPage = useCallback(() => {
    if (!pages || pages.length === 0) return;

    const pf = getPageFlip();

    if (viewMode === "flipbook" && pf) {
      if (typeof pf.flipNext === "function") {
        pf.flipNext();
      }
    } else {
      const next = Math.min(pages.length, currentPage + 1);
      goToPage(next);
    }
  }, [pages, viewMode, currentPage, getPageFlip, goToPage]);

  const prevPage = useCallback(() => {
    if (!pages || pages.length === 0) return;

    const pf = getPageFlip();

    if (viewMode === "flipbook" && pf) {
      // `flipPrev` animates by simulating a drag at `x: 10` — an absolute
      // coordinate that ignores where the book actually starts, unlike
      // `flipNext`, which adds the book's own left offset. A single portrait
      // sheet is centred inside a spread-width stage, so x=10 lands off the
      // page and the turn never begins: the button looked alive and did
      // nothing. `turnToPrevPage` moves without simulating a drag.
      if (singlePage && typeof pf.turnToPrevPage === "function") {
        pf.turnToPrevPage();
      } else if (typeof pf.flipPrev === "function") {
        pf.flipPrev();
      }
    } else {
      const prev = Math.max(1, currentPage - 1);
      goToPage(prev);
    }
  }, [pages, viewMode, currentPage, getPageFlip, goToPage, singlePage]);

  const setPage = useCallback(
    (pageNumber: number) => {
      goToPage(pageNumber);
    },
    [goToPage],
  );

  const totalPages = pages ? pages.length : 0;

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    goToPage,
    goToLinkedPage,
    nextPage,
    prevPage,
    setPage,
    scrollToPage,
    scale,
    setPageFlipRef,
  };
}
