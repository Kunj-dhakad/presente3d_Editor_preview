"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBookPreview } from "../context/BookPreviewContext";
import { pageAnchorId } from "../hooks/usePageNavigation";
import PageRenderer from "../render/PageRenderer";

const VIEW_INSET_PX = 48;
/** Fallback if browser has no scrollend event (and the scroll never starts). */
const SMOOTH_SCROLL_FALLBACK_MS = 600;
/** Without scrollend: scroll counts as finished after this much idle time. */
const SMOOTH_SCROLL_IDLE_MS = 160;
/** Absolute cap so a stuck scroll can't keep page tracking disabled. */
const SMOOTH_SCROLL_MAX_MS = 4000;
/** Wheel/trackpad travel needed to turn one page. */
const WHEEL_PAGE_THRESHOLD_PX = 40;
/** Wheel silence that ends a gesture (covers trackpad inertia tails). */
const WHEEL_GESTURE_QUIET_MS = 220;

function findPagesPanel(): HTMLElement | null {
  const byLabel = document.querySelector(
    'aside[aria-label="Pages"]',
  ) as HTMLElement | null;
  if (byLabel) return byLabel;

  const closeBtn = document.querySelector(
    'button[aria-label="Close pages panel"]',
  );
  if (closeBtn) {
    const aside = closeBtn.closest("aside");
    if (aside instanceof HTMLElement) return aside;
  }

  const asides = document.querySelectorAll("main aside, .relative aside");
  for (const node of asides) {
    if (!(node instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(node);
    if (style.position === "absolute" || style.position === "fixed") {
      return node;
    }
  }
  return null;
}

/**
 * Visible Horizontal View band (excludes floating Pages panel).
 */
function measureVisibleBand(
  viewport: HTMLElement,
  panelOpen: boolean,
): {
  viewportLeft: number;
  viewportWidth: number;
  visibleLeft: number;
  visibleRight: number;
  visibleWidth: number;
  visibleCenter: number;
  centerOffsetFromViewportLeft: number;
} {
  const vr = viewport.getBoundingClientRect();
  let visibleLeft = vr.left;
  if (panelOpen) {
    const panel = findPagesPanel();
    if (panel) {
      visibleLeft = Math.max(vr.left, panel.getBoundingClientRect().right);
    }
  }
  const visibleRight = vr.right;
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleCenter = visibleLeft + visibleWidth / 2;
  return {
    viewportLeft: vr.left,
    viewportWidth: vr.width,
    visibleLeft,
    visibleRight,
    visibleWidth,
    visibleCenter,
    centerOffsetFromViewportLeft: visibleCenter - vr.left,
  };
}

/**
 * Leading/trailing spacer so min-w-full slide 1 can reach the visible center
 * without scrollLeft < 0.
 */
function computeEdgeSpacerPx(
  viewport: HTMLElement,
  panelOpen: boolean,
): number {
  const band = measureVisibleBand(viewport, panelOpen);
  const naturalCenter = viewport.clientWidth / 2;
  return Math.max(
    0,
    Math.round(band.centerOffsetFromViewportLeft - naturalCenter),
  );
}

/** A drag longer than this always turns the page, even if it stops short of halfway. */
const DRAG_FLICK_PX = 50;

export default function HorizontalReader() {
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
  const [edgeSpacerPx, setEdgeSpacerPx] = useState(0);
  const syncedPageRef = useRef<number | null>(null);
  /** True while a programmatic scroll animation is in progress. */
  const programmaticRef = useRef(false);
  const panelOpenRef = useRef(isPagesPanelOpen);
  useLayoutEffect(() => {
    panelOpenRef.current = isPagesPanelOpen;
  }, [isPagesPanelOpen]);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const hasInitializedRef = useRef(false);
  /** Cancels pending end-of-scroll cleanup. */
  const scrollEndCleanupRef = useRef<(() => void) | null>(null);
  /** Generation token so stale RAF/scroll callbacks are ignored. */
  const navGenerationRef = useRef(0);

  /* ---- scale + edge spacer from live geometry ---- */
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const vp = viewportRef.current;
      if (!vp) return;
      /* Do not recalc spacers mid-animation — that reflows and kills smooth scroll. */
      if (programmaticRef.current || isDraggingRef.current) return;

      const spacer = computeEdgeSpacerPx(vp, panelOpenRef.current);
      setEdgeSpacerPx(spacer);

      const band = measureVisibleBand(vp, panelOpenRef.current);
      vp.style.scrollPaddingLeft = `${Math.round(
        band.visibleLeft - band.viewportLeft,
      )}px`;
      vp.style.scrollPaddingRight = "0px";

      const availableWidth = Math.max(100, band.visibleWidth - VIEW_INSET_PX);
      const availableHeight = Math.max(
        100,
        vp.getBoundingClientRect().height - VIEW_INSET_PX,
      );
      const next = Math.min(
        1,
        availableWidth / theme.pageWidth,
        availableHeight / theme.pageHeight,
      );
      setScale(next > 0.1 ? next : 0.1);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(viewport);
    window.addEventListener("resize", measure, { passive: true });
    const t = window.setTimeout(measure, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, [theme.pageHeight, theme.pageWidth, isPagesPanelOpen]);

  /**
   * Single authoritative scroll-to-center.
   * - Temporarily disables scroll-snap so snap-mandatory cannot cancel the
   *   smooth animation (common Chrome/Safari issue).
   * - Locks IntersectionObserver via programmaticRef until scrollend.
   * - Only ONE scrollTo call per navigation generation.
   */
  const scrollPageIntoVisibleCenter = useCallback(
    (pageNumber: number, behavior: ScrollBehavior) => {
      const vp = viewportRef.current;
      if (!vp) return;

      const generation = ++navGenerationRef.current;

      /* Cancel any previous scroll-end listeners/timers. */
      if (scrollEndCleanupRef.current) {
        scrollEndCleanupRef.current();
        scrollEndCleanupRef.current = null;
      }

      const run = () => {
        if (generation !== navGenerationRef.current) return;

        const viewport = viewportRef.current;
        const pageEl = document.getElementById(
          pageAnchorId("horizontal", pageNumber),
        );
        if (!viewport || !pageEl) return;

        const band = measureVisibleBand(viewport, panelOpenRef.current);
        const pageRect = pageEl.getBoundingClientRect();
        const pageCenter = pageRect.left + pageRect.width / 2;
        const delta = pageCenter - band.visibleCenter;

        if (Math.abs(delta) < 0.5) {
          programmaticRef.current = false;
          viewport.style.scrollSnapType = "";
          return;
        }

        const target = Math.max(0, viewport.scrollLeft + delta);

        programmaticRef.current = true;

        if (behavior === "smooth") {
          /*
           * Disable snap for the duration of the smooth scroll. With
           * snap-mandatory active, many browsers interrupt or "jump"
           * programmatic smooth scrolls to the nearest snap point.
           */
          // Snap is only ever switched off inline (here and while dragging),
          // so finishing always hands it back to the stylesheet.
          viewport.style.scrollSnapType = "none";

          viewport.scrollTo({ left: target, behavior: "smooth" });

          /*
           * Finish on `scrollend`, or — without it — once scrolling has been
           * idle for a moment. A fixed 600ms timeout used to fire while a
           * long jump was still scrolling, re-enabling the observer mid-way
           * so it picked an intermediate page (jump to 30 ended on 29).
           */
          let idleTimer = window.setTimeout(finish, SMOOTH_SCROLL_FALLBACK_MS);
          const hardStopTimer = window.setTimeout(finish, SMOOTH_SCROLL_MAX_MS);

          function cleanup() {
            viewport!.removeEventListener("scrollend", finish);
            viewport!.removeEventListener("scroll", onScroll);
            window.clearTimeout(idleTimer);
            window.clearTimeout(hardStopTimer);
          }

          function onScroll() {
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(finish, SMOOTH_SCROLL_IDLE_MS);
          }

          function finish() {
            cleanup();
            if (generation !== navGenerationRef.current) return;
            viewport!.style.scrollSnapType = "";
            programmaticRef.current = false;
            scrollEndCleanupRef.current = null;
          }

          viewport.addEventListener("scrollend", finish, { once: true });
          viewport.addEventListener("scroll", onScroll, { passive: true });

          scrollEndCleanupRef.current = () => {
            cleanup();
            viewport.style.scrollSnapType = "";
          };
        } else {
          viewport.scrollTo({ left: target, behavior: "auto" });
          programmaticRef.current = false;
        }
      };

      /* One frame so layout (spacers) is settled; avoid double-rAF pile-up. */
      requestAnimationFrame(run);
    },
    [],
  );

  /*
   * PAGE NAVIGATION — the only path that uses smooth scrolling.
   * First center after mount is instant; every later change is smooth.
   */
  useEffect(() => {
    if (currentPage === syncedPageRef.current) return;
    if (isDraggingRef.current) return;

    syncedPageRef.current = currentPage;
    if (!viewportRef.current) return;

    const behavior: ScrollBehavior = hasInitializedRef.current
      ? "smooth"
      : "auto";
    hasInitializedRef.current = true;

    scrollPageIntoVisibleCenter(currentPage, behavior);
  }, [currentPage, scrollPageIntoVisibleCenter]);

  /*
   * GEOMETRY ONLY (spacer / scale) — instant re-center.
   * MUST NOT list currentPage: that was cancelling smooth page transitions.
   */
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (!hasInitializedRef.current) return;
    if (programmaticRef.current) return;

    const page = syncedPageRef.current;
    if (page == null) return;

    scrollPageIntoVisibleCenter(page, "auto");
  }, [edgeSpacerPx, scale, scrollPageIntoVisibleCenter]);

  /*
   * PANEL OPEN/CLOSE ONLY — instant re-center.
   * currentPage is intentionally NOT a dependency.
   */
  useEffect(() => {
    if (isDraggingRef.current) return;
    if (!hasInitializedRef.current) return;

    const page = syncedPageRef.current;
    if (page == null) return;

    scrollPageIntoVisibleCenter(page, "auto");
  }, [isPagesPanelOpen, scrollPageIntoVisibleCenter]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        /* Suppress while programmatic smooth scroll or drag is active. */
        if (programmaticRef.current || isDraggingRef.current) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.getAttribute("data-page-number"));
          if (Number.isNaN(index) || index === syncedPageRef.current) return;
          syncedPageRef.current = index;
          setCurrentPage(index);
        });
      },
      { root: viewport, threshold: 0.55 },
    );

    pages.forEach((_, index) => {
      const element = document.getElementById(
        pageAnchorId("horizontal", index + 1),
      );
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [pages, setCurrentPage]);

  /*
   * Mouse wheel / trackpad → one page per gesture. Without this the vertical
   * wheel did nothing and sideways swipes were pulled back by scroll-snap.
   * Deltas accumulate (trackpads send many tiny events); after a page turn
   * further events are ignored until the gesture has been quiet for a bit,
   * so inertial scrolling can't skip several pages.
   */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || pages.length === 0) return;

    let accumulated = 0;
    let lockedUntilQuiet = false;
    let quietTimer: number | null = null;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return; // pinch-zoom
      event.preventDefault();

      if (quietTimer != null) window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        lockedUntilQuiet = false;
        accumulated = 0;
      }, WHEEL_GESTURE_QUIET_MS);

      if (lockedUntilQuiet || isDraggingRef.current) return;

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      accumulated += event.deltaMode === 1 ? delta * 16 : delta;
      if (Math.abs(accumulated) < WHEEL_PAGE_THRESHOLD_PX) return;

      const from = syncedPageRef.current ?? 1;
      const target = Math.min(
        pages.length,
        Math.max(1, from + (accumulated > 0 ? 1 : -1)),
      );
      accumulated = 0;
      lockedUntilQuiet = true;
      if (target !== from) setCurrentPage(target);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      if (quietTimer != null) window.clearTimeout(quietTimer);
    };
  }, [pages.length, setCurrentPage]);

  useEffect(() => {
    return () => {
      if (scrollEndCleanupRef.current) {
        scrollEndCleanupRef.current();
        scrollEndCleanupRef.current = null;
      }
    };
  }, []);

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        "button, a, input, textarea, select, label, [role='button'], [contenteditable='true']",
      ),
    );
  };

  /**
   * After a drag: the page nearest the centre, except that a short, decisive
   * drag (over DRAG_FLICK_PX) always moves one page in the drag direction,
   * like a carousel.
   */
  const settleToNearestPage = useCallback((startPage?: number, dragDelta = 0) => {
    const viewport = viewportRef.current;
    if (!viewport || pages.length === 0) return;

    const { visibleCenter } = measureVisibleBand(
      viewport,
      panelOpenRef.current,
    );

    let bestPage = syncedPageRef.current ?? 1;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < pages.length; i++) {
      const pageNumber = i + 1;
      const el = document.getElementById(
        pageAnchorId("horizontal", pageNumber),
      );
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const pageCenter = r.left + r.width / 2;
      const dist = Math.abs(pageCenter - visibleCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestPage = pageNumber;
      }
    }

    if (startPage !== undefined && bestPage === startPage && Math.abs(dragDelta) > DRAG_FLICK_PX) {
      bestPage = Math.min(pages.length, Math.max(1, startPage + (dragDelta < 0 ? 1 : -1)));
    }

    syncedPageRef.current = bestPage;
    setCurrentPage(bestPage);
    scrollPageIntoVisibleCenter(bestPage, "smooth");
  }, [pages, setCurrentPage, scrollPageIntoVisibleCenter]);

  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    /* Cancel any in-flight programmatic scroll. */
    if (scrollEndCleanupRef.current) {
      scrollEndCleanupRef.current();
      scrollEndCleanupRef.current = null;
    }
    programmaticRef.current = false;
    navGenerationRef.current += 1;

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = viewport.scrollLeft;
    // Mandatory snap pulls the strip back on every move, so the page would
    // not follow the cursor; it is off until the settle scroll finishes.
    viewport.style.scrollSnapType = "none";
    const startPage = syncedPageRef.current ?? currentPage;
    let lastX = event.clientX;
    event.preventDefault();

    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const vp = viewportRef.current;
      if (!vp) return;
      lastX = e.clientX;
      const delta = e.clientX - dragStartXRef.current;
      vp.scrollLeft = dragStartScrollLeftRef.current - delta;
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const delta = lastX - dragStartXRef.current;
      if (Math.abs(delta) < 3) { viewportRef.current!.style.scrollSnapType = ""; return; } // a click, not a drag
      settleToNearestPage(startPage, delta);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const zoom = scale * (zoomLevel / 100);

  return (
    <div
      ref={viewportRef}
      className="flex h-full w-full snap-x snap-mandatory overflow-x-auto bg-slate-200 pb-2 [scrollbar-width:none]"
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: isDragging ? "none" : undefined,
        WebkitUserSelect: isDragging ? "none" : undefined,
        boxSizing: "border-box",
      }}
      onMouseDown={onMouseDown}
    >
      {edgeSpacerPx > 0 ? (
        <div
          aria-hidden
          data-edge-spacer="leading"
          className="shrink-0 grow-0"
          style={{
            width: edgeSpacerPx,
            minWidth: edgeSpacerPx,
            height: "100%",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {pages.map((page, index) => {
        const pageNumber = index + 1;
        const isCurrent = currentPage === pageNumber;
 
        return (
          <section
            key={page.id}
            id={pageAnchorId("horizontal", pageNumber)}
            data-page-number={pageNumber}
            className="relative flex h-full min-w-full shrink-0 snap-center items-center justify-center"
          >
            <div
              className="relative flex items-center justify-center transition-all duration-200"
              style={{
                width: theme.pageWidth * zoom,
                height: theme.pageHeight * zoom,
             }}
            >
              <div
                {...pageHoverHandlers}
                className={`absolute overflow-hidden rounded-xl shadow-2xl transition-all duration-300 ${
                  isCurrent
                    ? "ring-4 ring-(--kd-accent)/40"
                    : "ring-1 ring-slate-300"
                }`}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  width: theme.pageWidth,
                  height: theme.pageHeight,
                  pointerEvents: isDragging ? "none" : undefined,
                }}
              >
                <PageRenderer page={page} pageNumber={pageNumber} />
              </div>
            </div>
          </section>
        );
      })}

      {edgeSpacerPx > 0 ? (
        <div
          aria-hidden
          data-edge-spacer="trailing"
          className="shrink-0 grow-0"
          style={{
            width: edgeSpacerPx,
            minWidth: edgeSpacerPx,
            height: "100%",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}