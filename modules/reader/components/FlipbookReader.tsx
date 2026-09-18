"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useBookPreview } from "../context/BookPreviewContext";
import PageRenderer from "../render/PageRenderer";
import { toSpreadStart } from "../utils/spread";

interface FlipBookProps {
  width: number;
  height: number;
  size?: "fixed" | "stretch";
  showCover?: boolean;
  usePortrait?: boolean;
  drawShadow?: boolean;
  flippingTime?: number;
  useMouseEvents?: boolean;
  mobileScrollSupport?: boolean;
  maxShadowOpacity?: number;
  startPage?: number;
  swipeDistance?: number;
  clickEventForward?: boolean;
  showPageCorners?: boolean;
  disableFlipByClick?: boolean;
  onInit?: () => void;
  onFlip?: (event: { data: number }) => void;
  onChangeState?: (event: { data: string }) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const HTMLFlipBook = dynamic(() => import("react-pageflip"), {
  ssr: false,
}) as React.ForwardRefExoticComponent<
  FlipBookProps & React.RefAttributes<unknown>
>;


function SpineShadow({ pageWidth }: { pageWidth: number }) {
  return (
    <div
      aria-hidden
      data-spine-shadow="true"
      style={{
        position: "absolute",
        left: pageWidth,
        top: 0,
        bottom: 0,
        width: 40,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 2,
        background:
          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.03) 12%, rgba(0,0,0,0.08) 28%, rgba(0,0,0,0.16) 42%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.16) 58%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.03) 88%, transparent 100%)",
      }}
    />
  );
}

type PageFlipApi = {
  flip?: (page: number, corner?: string) => void;
  flipNext?: (corner?: string) => void;
  flipPrev?: (corner?: string) => void;
  turnToPage?: (page: number) => void;
  getCurrentPageIndex?: () => number;
  getPageCount?: () => number;
  getState?: () => string;
  getRender?: () => { finishAnimation?: () => void };
  __seqNavPatched?: boolean;
  __originalTurnToPage?: (page: number) => void;
};

function getPageFlipInstance(
  flipRef: React.MutableRefObject<unknown>,
): PageFlipApi | null {
  let instance = flipRef.current as {
    current?: unknown;
    pageFlip?: (() => unknown) | unknown;
  } | null;
  if (!instance) return null;
  if (instance.current) {
    instance = instance.current as typeof instance;
  }
  if (!instance) return null;
  if (typeof instance.pageFlip === "function") {
    try {
      return instance.pageFlip() as PageFlipApi;
    } catch {
      return null;
    }
  }
  return (instance.pageFlip ?? instance) as PageFlipApi;
}

type SeqNavState = {
  targetIndex: number | null;
  awaitingCompletion: boolean;
  generation: number;
  direction?: 1 | -1;
  step?: () => void;
};

/** Ordinal of a spread-start index: 0 → 0, 1 → 1, 3 → 2, 5 → 3 … */
function spreadOrdinal(spreadStart: number): number {
  return spreadStart === 0 ? 0 : (spreadStart + 1) / 2;
}

function patchSequentialTurnToPage(
  flipRef: React.MutableRefObject<unknown>,
  seqRef: React.MutableRefObject<SeqNavState>,
): void {
  const pf = getPageFlipInstance(flipRef);
  if (!pf) return;
  if (pf.__seqNavPatched) return;
  pf.__seqNavPatched = true;

  const libraryTurnToPage =
    typeof pf.turnToPage === "function" ? pf.turnToPage.bind(pf) : null;

  const resetSequence = () => {
    seqRef.current.generation += 1;
    seqRef.current.targetIndex = null;
    seqRef.current.awaitingCompletion = false;
    seqRef.current.direction = undefined;
  };

  /*
   * Jump without animation. Cancels any pending page-by-page chain and
   * completes a flip that is mid-animation first — otherwise the chain (or
   * that flip's end callback) kept turning pages after the jump, e.g. Reset
   * landed on page 1 and then flipped back toward the old target.
   */
  const instantTurn = (page: number) => {
    resetSequence();
    try {
      pf.getRender?.().finishAnimation?.();
    } catch {
      // nothing animating
    }
    libraryTurnToPage?.(page);
  };

  if (libraryTurnToPage) {
    pf.__originalTurnToPage = instantTurn;
  }

  const readIndex = (): number => {
    if (typeof pf.getCurrentPageIndex === "function") {
      try {
        return pf.getCurrentPageIndex();
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const stepTowardTarget = () => {
    const state = seqRef.current;
    if (state.targetIndex === null) return;
    if (state.awaitingCompletion) return;

    /* A flip is still animating — wait for its "read" event to step again. */
    if (typeof pf.getState === "function" && pf.getState() !== "read") {
      state.awaitingCompletion = true;
      return;
    }

    const current = toSpreadStart(readIndex());
    const target = state.targetIndex;
    const direction = target > current ? 1 : -1;

    /*
     * Stop on arrival, and also if we would reverse direction — that means
     * we overshot, and continuing would flip left/right forever.
     */
    if (
      current === target ||
      (state.direction !== undefined && state.direction !== direction)
    ) {
      state.targetIndex = null;
      state.awaitingCompletion = false;
      state.direction = undefined;
      return;
    }

    state.direction = direction;
    state.awaitingCompletion = true;

    try {
      if (target > current) {
        if (typeof pf.flipNext === "function") {
          pf.flipNext("top");
        } else if (typeof pf.flip === "function") {
          pf.flip(current + 1);
        } else {
          state.targetIndex = null;
          state.awaitingCompletion = false;
        }
      } else {
        if (typeof pf.flipPrev === "function") {
          pf.flipPrev("top");
        } else if (typeof pf.flip === "function") {
          pf.flip(current - 1);
        } else {
          state.targetIndex = null;
          state.awaitingCompletion = false;
        }
      }
    } catch {
      state.targetIndex = null;
      state.awaitingCompletion = false;
    }
  };

  pf.turnToPage = (page: number) => {
    const count =
      typeof pf.getPageCount === "function"
        ? pf.getPageCount()
        : Number.MAX_SAFE_INTEGER;
    const lastSpread = toSpreadStart(Math.max(0, count - 1));
    const target = toSpreadStart(
      Math.max(0, Math.min(count - 1, Math.floor(page))),
    );
    let current = toSpreadStart(readIndex());

    if (target === current) {
      resetSequence();
      return;
    }

    /*
     * Far jumps used to flip every page on the way (1 → 51 took ~10s).
     * Land instantly on the spread next to the target, then animate just
     * the final turn so the reader still sees a page flip.
     */
    if (Math.abs(spreadOrdinal(target) - spreadOrdinal(current)) > 1) {
      const neighbor =
        target > current
          ? target <= 1
            ? 0
            : target - 2
          : Math.min(lastSpread, target === 0 ? 1 : target + 2);
      instantTurn(neighbor);
      current = toSpreadStart(readIndex());
      if (current === target) return;
    }

    seqRef.current.generation += 1;
    seqRef.current.targetIndex = target;
    seqRef.current.awaitingCompletion = false;
    seqRef.current.direction = undefined;
    stepTowardTarget();
  };

  seqRef.current.step = stepTowardTarget;
}

function computeSettledOffset(
  pageCount: number,
  currentPage1Based: number,
  pageWidth: number,
): number {
  if (pageCount === 0) return 0;
  const half = pageWidth / 2;
  const pageIndex = Math.min(
    Math.max(currentPage1Based - 1, 0),
    pageCount - 1,
  );

  if (pageIndex === 0) {
    return pageCount === 1 ? half : -half;
  }

  const spreadStart = pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
  return spreadStart === pageCount - 1 ? half : 0;
}

export default function FlipbookReader() {
  const {
    pages,
    theme,
    zoomLevel,
    blockMouseFlip,
    currentPage,
    totalPages,
    setCurrentPage,
    setPageFlipRef,
    isPagesPanelOpen,
    pageHoverHandlers,
  } = useBookPreview();

  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<unknown>(null);
  const [scale, setScale] = useState(1);
  /* Side padding that keeps the spread clear of the round prev/next buttons (and the Pages panel). */
  const [inset, setInset] = useState({ left: 96, right: 96 });
  const [ready, setReady] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [clipLifted, setClipLifted] = useState(false);
  const [frozenOffset, setFrozenOffset] = useState<number | null>(null);
  const [allowOffsetTransition, setAllowOffsetTransition] = useState(true);

  const seqNavRef = useRef<SeqNavState>({
    targetIndex: null,
    awaitingCompletion: false,
    generation: 0,
  });

  /* StPageFlip reads startPage only when it is created (on mount). */
  const [initialPage] = useState(currentPage);

  /*
   * StPageFlip keeps the handlers from its first render, so values they
   * need are mirrored into refs (updated in effects, never during render).
   */
  const settledOffsetRef = useRef(0);
  const frozenOffsetRef = useRef<number | null>(null);

  const [previousPages, setPreviousPages] = useState(pages);
  if (pages !== previousPages) {
    setPreviousPages(pages);
    setReady(false);
  }

  const pageW = theme.pageWidth;
  const pageH = theme.pageHeight;

  const settledOffset = useMemo(
    () => computeSettledOffset(totalPages, currentPage, pageW),
    [totalPages, currentPage, pageW],
  );

  useEffect(() => {
    settledOffsetRef.current = settledOffset;
  }, [settledOffset]);

  const offset = frozenOffset !== null ? frozenOffset : settledOffset;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const fit = () => {
      /*
       * The spread sits between the prev/next buttons (NavButton: 48px at
       * 16px from the edge, 56px at 24px from md up), with the Pages panel on
       * the left when it is open, and keeps a little air around it.
       */
      const md = window.innerWidth >= 768;
      const nav = md ? 24 + 56 + 16 : 16 + 48 + 8;
      const left = isPagesPanelOpen ? (md ? 168 + 56 + 16 : 152 + 48 + 8) : nav;
      setInset(current => current.left === left && current.right === nav ? current : { left, right: nav });
      const cs = window.getComputedStyle(stage);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const availableHeight = stage.clientHeight - padY;
      const availableWidth = stage.clientWidth - left - nav;

      const next = Math.min(
        1,
        availableWidth / (theme.pageWidth * 2),
        availableHeight / theme.pageHeight,
      ) * 0.97;
      setScale(next > 0.1 ? next : 0.1);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [theme.pageHeight, theme.pageWidth, isPagesPanelOpen]);

  useEffect(() => {
    setPageFlipRef(flipRef);
    return () => setPageFlipRef(null);
  }, [setPageFlipRef, pages]);

  const startPageIndex = Math.max(
    0,
    Math.min(Math.max(totalPages - 1, 0), initialPage - 1),
  );

  const shellWidth = pageW * 2;

  const bookScale = scale * (zoomLevel / 100);
  /*
   * Zoomed past the fitted size: the stage becomes a scroll area and the
   * book gets a real layout box (transform alone doesn't create scrollable
   * overflow), so the enlarged book can be panned instead of being cut off.
   */
  const isZoomedIn = zoomLevel > 100;

  /*
   * react-pageflip re-runs updateFromHtml() whenever `children` changes
   * identity, which wipes and re-appends every page mid-fold. Without this
   * memo, each onChangeState setState re-rendered new children, reset the
   * fold, fired another state change, and looped into a flicker.
   */
  const pageElements = useMemo(
    () =>
      pages.map((page, index) => {
        const isCoverPage = index === 0 || index === pages.length - 1;
        return (
          <div
            key={page.id}
            data-density={isCoverPage ? "hard" : "soft"}
            className="overflow-hidden bg-white"
            style={{
              width: pageW,
              height: pageH,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <PageRenderer page={page} pageNumber={index + 1} />
          </div>
        );
      }),
    [pages, pageW, pageH],
  );

  return (
    <div
      ref={stageRef}
      className="flex h-full w-full bg-slate-200 py-3 transition-[padding] duration-200 md:py-8"
      style={{
        paddingLeft: inset.left,
        paddingRight: inset.right,
        overflow: isZoomedIn ? "auto" : clipLifted ? "visible" : "hidden",
      }}
    >
      {/* Layout box at the scaled size; margin:auto centers it without clipping when it overflows. */}
      <div
        className="relative m-auto shrink-0"
        style={{
          width: shellWidth * bookScale,
          height: pageH * bookScale,
          transition: "width 0.25s, height 0.25s",
        }}
      >
      <div
        className="absolute left-0 top-0 flex select-none"
        style={{
          width: shellWidth,
          height: pageH,
          transform: `scale(${bookScale})`,
          transformOrigin: "top left",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: ready ? 1 : 0,
          touchAction: "pan-y",
        }}
      >
        {/*
         * Hover is tracked on this stable shell, not on individual pages:
         * StPageFlip hides/moves page nodes mid-flip, which would drop
         * pointerleave events and leave autoplay stuck on hold.
         */}
        <div
          data-spread={settledOffset === 0 ? "true" : "false"}
          {...pageHoverHandlers}
          style={{
            position: "relative",
            width: shellWidth,
            height: pageH,
            overflow: clipLifted ? "visible" : "hidden",
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: shellWidth,
              height: pageH,
              transform: `translateX(${offset}px)`,
              transition: allowOffsetTransition
                ? "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
          >
            <HTMLFlipBook
              ref={flipRef}
              width={pageW}
              height={pageH}
              size="fixed"
              showCover={true}
              usePortrait={false}
              drawShadow={true}
              maxShadowOpacity={0.4}
              flippingTime={1000}
              useMouseEvents={!blockMouseFlip}
              mobileScrollSupport={false}
              swipeDistance={18}
              clickEventForward={true}
              showPageCorners={true}
              disableFlipByClick={true}
              startPage={startPageIndex}
              onInit={() => {
                setPageFlipRef(flipRef);
                setReady(true);
                setIsFlipping(false);
                setClipLifted(false);
                frozenOffsetRef.current = null;
                setFrozenOffset(null);
                setAllowOffsetTransition(true);
                patchSequentialTurnToPage(flipRef, seqNavRef);
              }}
              onChangeState={(event) => {
                const state = event?.data;

                if (state === "flipping" || state === "user_fold") {
                  setIsFlipping(true);
                  setClipLifted(true);

                  /* Freeze the shell at the spread position for the whole flip. */
                  if (frozenOffsetRef.current === null) {
                    const fromOffset = settledOffsetRef.current;
                    frozenOffsetRef.current = 0;
                    if (fromOffset !== 0) {
                      setAllowOffsetTransition(false);
                      requestAnimationFrame(() => {
                        setAllowOffsetTransition(true);
                      });
                    }
                    setFrozenOffset(0);
                  }
                } else if (state === "fold_corner") {
                  setClipLifted(true);
                } else if (state === "read") {
                  setIsFlipping(false);
                  setClipLifted(false);
                  setAllowOffsetTransition(true);
                  frozenOffsetRef.current = null;
                  setFrozenOffset(null);

                  const seq = seqNavRef.current;
                  if (seq.targetIndex === null) return;
                  if (!seq.awaitingCompletion) return;

                  const gen = seq.generation;
                  seq.awaitingCompletion = false;

                  requestAnimationFrame(() => {
                    if (seqNavRef.current.generation !== gen) return;
                    if (seqNavRef.current.targetIndex === null) return;
                    seqNavRef.current.step?.();
                  });
                }
              }}
              onFlip={(event) => {
                if (typeof event?.data === "number") {
                  setCurrentPage(event.data + 1);
                }
              }}
              className={
                settledOffset !== 0 || isFlipping ? "" : "shadow-2xl"
              }
              style={{ touchAction: "none" }}
            >
              {pageElements}
            </HTMLFlipBook>

            {settledOffset === 0 && !isFlipping ? (
              <SpineShadow pageWidth={pageW} />
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}