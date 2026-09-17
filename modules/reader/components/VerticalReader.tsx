"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  useBookPreview,
  type PageHoverHandlers,
} from "../context/BookPreviewContext";
import { pageAnchorId } from "../hooks/usePageNavigation";
import PageRenderer from "../render/PageRenderer";
import type { PreviewPage } from "../types/book";
import type { PreviewTheme } from "../types/book";

const PAGES_PANEL_OFFSET_PX = 160;
const VIEW_INSET_PX = 48;
/** Controlled slide transition duration (ms). */
const SLIDE_ANIM_MS = 520;
/** Ignore tiny trackpad noise. */
const WHEEL_DELTA_THRESHOLD = 8;
/** Guard after animation so trackpad momentum cannot chain another step. */
const WHEEL_MOMENTUM_GUARD_MS = 140;

interface PageSlotProps {
  page: PreviewPage;
  pageNumber: number;
  isCurrent: boolean;
  theme: PreviewTheme;
  zoom: number;
  hoverHandlers: PageHoverHandlers;
}

const PageSlot = memo(function PageSlot({
  page,
  pageNumber,
  isCurrent,
  theme,
  zoom,
  hoverHandlers,
}: PageSlotProps) {
  return (
    <section
      id={pageAnchorId("vertical", pageNumber)}
      data-page-number={pageNumber}
      className="relative flex h-full min-h-full min-w-full shrink-0 items-center justify-center"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: `${theme.pageWidth}px ${theme.pageHeight}px`,
        contain: "layout style",
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: theme.pageWidth * zoom,
          height: theme.pageHeight * zoom,
          transform: "translateZ(0)",
        }}
      >
        <div
          {...hoverHandlers}
          className={`absolute overflow-hidden rounded-xl shadow-2xl ${
            isCurrent ? "ring-4 ring-(--kd-accent)/40" : "ring-1 ring-slate-300"
          }`}
          style={{
            transform: `scale(${zoom}) translateZ(0)`,
            transformOrigin: "center center",
            width: theme.pageWidth,
            height: theme.pageHeight,
            willChange: "transform",
          }}
        >
          <PageRenderer page={page} pageNumber={pageNumber} />
        </div>
      </div>
    </section>
  );
});

/** easeInOutCubic — smooth start and end, no overshoot. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * ScrollTop that centers the given page in the viewport.
 * Uses live DOM geometry (offsetTop / clientHeight) — never index * fixedHeight.
 */
function getCenteredScrollTop(
  viewport: HTMLElement,
  pageNumber: number,
): number {
  const el = document.getElementById(pageAnchorId("vertical", pageNumber));
  if (!el) {
    return Math.max(0, (pageNumber - 1) * viewport.clientHeight);
  }
  const slideCenter = el.offsetTop + el.offsetHeight / 2;
  const viewCenter = viewport.clientHeight / 2;
  const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  return Math.min(maxScroll, Math.max(0, slideCenter - viewCenter));
}

function findNearestPage(
  viewport: HTMLElement,
  pageCount: number,
): number {
  const vRect = viewport.getBoundingClientRect();
  const centerY = vRect.top + vRect.height / 2;

  let bestPage = 1;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < pageCount; i++) {
    const pageNumber = i + 1;
    const el = document.getElementById(pageAnchorId("vertical", pageNumber));
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 1) continue;
    const pageCenter = r.top + r.height / 2;
    const dist = Math.abs(pageCenter - centerY);
    if (dist < bestDist) {
      bestDist = dist;
      bestPage = pageNumber;
    }
  }

  return bestPage;
}

export default function VerticalReader() {
  const {
    pages,
    currentPage,
    setCurrentPage,
    theme,
    zoomLevel,
    isPagesPanelOpen,
    pageHoverHandlers,
  } = useBookPreview();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const syncedPageRef = useRef<number | null>(null);
  /** True while rAF slide animation (or instant jump) is in progress. */
  const animatingRef = useRef(false);
  const animRafRef = useRef<number | null>(null);
  const hasMountedScrollRef = useRef(false);
  /** Generation token so stale animation frames are ignored. */
  const navGenerationRef = useRef(0);
  const momentumUntilRef = useRef(0);

  const cancelAnimation = useCallback(() => {
    if (animRafRef.current != null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
  }, []);

  /**
   * Single controlled navigator: animate viewport.scrollTop from current value
   * to the exact centered position of `pageNumber` via rAF + easeInOutCubic.
   * Used by wheel, currentPage changes (arrows / Pages panel), and resize.
   */
  const animateToPage = useCallback(
    (pageNumber: number, behavior: "smooth" | "auto") => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      cancelAnimation();
      const generation = ++navGenerationRef.current;
      animatingRef.current = true;
      syncedPageRef.current = pageNumber;

      const targetTop = getCenteredScrollTop(viewport, pageNumber);
      const startTop = viewport.scrollTop;

      if (behavior === "auto" || Math.abs(targetTop - startTop) < 1) {
        viewport.scrollTop = targetTop;
        animatingRef.current = false;
        momentumUntilRef.current = performance.now() + WHEEL_MOMENTUM_GUARD_MS;
        return;
      }

      const startTime = performance.now();

      const step = (now: number) => {
        if (generation !== navGenerationRef.current) return;

        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / SLIDE_ANIM_MS);
        const eased = easeInOutCubic(t);
        viewport.scrollTop = startTop + (targetTop - startTop) * eased;

        if (t < 1) {
          animRafRef.current = requestAnimationFrame(step);
        } else {
          // Land exactly on target — no residual 1px drift.
          viewport.scrollTop = targetTop;
          animRafRef.current = null;
          animatingRef.current = false;
          momentumUntilRef.current =
            performance.now() + WHEEL_MOMENTUM_GUARD_MS;
        }
      };

      animRafRef.current = requestAnimationFrame(step);
    },
    [cancelAnimation],
  );

  useEffect(() => {
    const fit = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const panelOffset = isPagesPanelOpen ? PAGES_PANEL_OFFSET_PX : 0;
      const availableWidth = Math.max(
        100,
        rect.width - panelOffset - VIEW_INSET_PX,
      );
      const availableHeight = Math.max(100, rect.height - VIEW_INSET_PX);
      const next = Math.min(
        1,
        availableWidth / theme.pageWidth,
        availableHeight / theme.pageHeight,
      );
      setScale(next > 0.1 ? next : 0.1);
    };

    fit();
    window.addEventListener("resize", fit, { passive: true });
    return () => window.removeEventListener("resize", fit);
  }, [theme.pageHeight, theme.pageWidth, isPagesPanelOpen]);

  /**
   * Drive scroll from currentPage (wheel, arrows, Pages panel, enter vertical).
   * First mount jumps instantly; later navigations use the rAF animation.
   */
  useEffect(() => {
    if (currentPage === syncedPageRef.current) return;

    const behavior: "smooth" | "auto" = hasMountedScrollRef.current
      ? "smooth"
      : "auto";
    hasMountedScrollRef.current = true;

    // Commit active page first so UI stays in sync during the animation.
    syncedPageRef.current = currentPage;
    animateToPage(currentPage, behavior);
  }, [currentPage, animateToPage]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || syncedPageRef.current == null) return;

    const recenter = () => {
      if (animatingRef.current) return;
      animateToPage(syncedPageRef.current!, "auto");
    };

    const t = window.setTimeout(recenter, 50);
    window.addEventListener("resize", recenter, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", recenter);
    };
  }, [isPagesPanelOpen, animateToPage]);

  /**
   * Controlled wheel: preventDefault + ONE gesture → ONE slide.
   * Animation is the sole scroll controller — no native free scroll.
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pages.length === 0) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaY) < WHEEL_DELTA_THRESHOLD) return;
      if (animatingRef.current) return;
      if (performance.now() < momentumUntilRef.current) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const from = syncedPageRef.current ?? currentPage;
      const target = Math.min(pages.length, Math.max(1, from + dir));
      if (target === from) return;

      // Shared path: setCurrentPage → effect → animateToPage (rAF).
      setCurrentPage(target);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
    };
  }, [pages.length, setCurrentPage, currentPage]);

  /**
   * During custom animation, ignore scroll-driven page updates so we do not
   * fight the rAF loop. Outside animation, keep active page in sync for any
   * residual touch/drag (if present).
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pages.length === 0) return;

    let rafId: number | null = null;

    const onScroll = () => {
      if (animatingRef.current) return;
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (animatingRef.current) return;
        const next = findNearestPage(viewport, pages.length);
        if (next === syncedPageRef.current) return;
        syncedPageRef.current = next;
        setCurrentPage(next);
      });
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [pages, setCurrentPage]);

  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  const zoom = scale * (zoomLevel / 100);

  return (
    <div
      ref={viewportRef}
      className="flex h-full w-full select-none flex-col items-center overflow-y-auto overflow-x-hidden bg-slate-200 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
      style={{
        // No CSS scroll-snap — rAF animation is the only slide controller.
        overscrollBehaviorY: "contain",
        paddingLeft: isPagesPanelOpen ? PAGES_PANEL_OFFSET_PX : 0,
        transition: "padding-left 0.2s ease",
        boxSizing: "border-box",
      }}
    >
      {pages.map((page, index) => {
        const pageNumber = index + 1;
        return (
          <PageSlot
            key={page.id}
            page={page}
            pageNumber={pageNumber}
            isCurrent={currentPage === pageNumber}
            theme={theme}
            zoom={zoom}
            hoverHandlers={pageHoverHandlers}
          />
        );
      })}
    </div>
  );
}