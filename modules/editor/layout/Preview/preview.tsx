"use client";
import React, {
  // startTransition,
  useEffect,
  useState,
  useRef,
  useCallback,
  memo,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import MiniSlidePreview, { SCALE as MINI_SCALE } from "./MiniSlidePreview";
import SortableSlide from "./SortableSlide";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import useEditorStore, { SlideType } from "@editor/store/editorStore";
import MoreOptions from "./MoreOptions";
import { BiDotsVerticalRounded } from "react-icons/bi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type SidebarSlidesProps = {
  activeSlide: number;
  addSlide: () => void;
  jumpToSlide: (i: number) => void;
};

interface SlideItemProps {
  slide: SlideType;
  index: number;
  isActive: boolean;
  onJumpToSlide: (index: number) => void;
  openMenuId: string | null;
  onToggleMenu: (id: string | null) => void;
  observer: ThumbObserver;
}

/** Shared viewport watcher for the thumbnail list. */
type ThumbObserver = {
  observe: (el: Element, onEnter: () => void) => void;
  unobserve: (el: Element) => void;
};

/**
 * Thumbnails are at most THUMB_MAX_W wide so a 16:9 slide fits the 172px rail
 * with room around it; narrower (portrait) pages keep the usual scale.
 */
const THUMB_MAX_W = 140;
const thumbScale = (slide: SlideType) =>
  Math.min(MINI_SCALE, THUMB_MAX_W / (slide.width || 853.33));

/** Same footprint as the real thumbnail, so nothing shifts when it swaps in. */
const MiniSlidePlaceholder = memo(function MiniSlidePlaceholder({
  slide,
}: {
  slide: SlideType;
}) {
  const scale = thumbScale(slide);
  return (
    <div
      className="rounded"
      style={{
        width: (slide.width ?? 853.33) * scale,
        height: (slide.height ?? 480) * scale,
        background: slide.background || "#ffffff",
      }}
    />
  );
});

const SlideItem = memo(
  function SlideItem({
    slide,
    index,
    isActive,
    onJumpToSlide,
    openMenuId,
    onToggleMenu,
    observer,
  }: SlideItemProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const isMenuOpen = openMenuId === slide.id;

    // Every page used to build its whole element tree here, so a long book
    // rendered the entire document a second time just for the sidebar. The
    // sized box is always present — scrolling, dragging and the active
    // highlight are unaffected — only the artwork waits until it is near.
    const [seen, setSeen] = useState(false);

    useEffect(() => {
      const el = cardRef.current;
      if (!el || seen) return;
      observer.observe(el, () => setSeen(true));
      return () => observer.unobserve(el);
    }, [observer, seen]);

    const handleJump = useCallback(() => {
      onJumpToSlide(index);
    }, [onJumpToSlide, index]);

    const handleMenuToggle = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleMenu(isMenuOpen ? null : slide.id);
      },
      [onToggleMenu, isMenuOpen, slide.id]
    );

    return (
      <SortableSlide id={slide.id}>
        <div
          ref={cardRef}
          onMouseDown={handleJump}
          data-thumb-index={index}
          className={`group relative transition-all kd-slide-preview ${isActive ? "kd-slide-preview-active" : ""
            }`}
        >
          <div className="text-[11px] kd-text-muted select-none">
            {seen ? (
              <MiniSlidePreview slide={slide} scale={thumbScale(slide)} />
            ) : (
              <MiniSlidePlaceholder slide={slide} />
            )}
          </div>

          <div
            className={`absolute top-2 right-2 flex z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${isActive ? "opacity-100" : ""
              }`}
          >
            <button
              ref={buttonRef}
              // onClick={handleMenuToggle}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMenuToggle}
              className="kd-icon-btn-main"
            >
              <BiDotsVerticalRounded />
            </button>
          </div>


          {isMenuOpen &&
            typeof document !== "undefined" &&
            createPortal(
              <MoreOptions
                targetRef={buttonRef}
                onClose={() => onToggleMenu(null)}
                slideId={slide.id}
              />,
              document.body
            )}
        </div>
      </SortableSlide>
    );
  },
  (prev, next) => {
    const prevMenuOpen = prev.openMenuId === prev.slide.id;
    const nextMenuOpen = next.openMenuId === next.slide.id;
    return (
      // prev.slide === next.slide &&
      // new add
      prev.slide.width === next.slide.width &&
      prev.slide.height === next.slide.height &&
      prev.slide.background === next.slide.background &&
      prev.slide.elements === next.slide.elements &&
      //new add end  
      prev.isActive === next.isActive &&
      prevMenuOpen === nextMenuOpen &&
      prev.observer === next.observer &&
      prev.index === next.index
    );
  }
);

const ACTIVATION_CONSTRAINT = { distance: 8 };

/**
 * One observer for the whole list rather than one per thumbnail, and it stops
 * watching a card as soon as that card has been seen once.
 */
function useThumbObserver(): ThumbObserver {
  const stateRef = useRef<{
    observer: IntersectionObserver;
    callbacks: Map<Element, () => void>;
  } | null>(null);

  const ensure = useCallback(() => {
    let state = stateRef.current;
    if (!state) {
      const callbacks = new Map<Element, () => void>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const onEnter = callbacks.get(entry.target);
            callbacks.delete(entry.target);
            observer.unobserve(entry.target);
            onEnter?.();
          }
        },
        { rootMargin: "600px 0px" },
      );
      state = { observer, callbacks };
      stateRef.current = state;
    }
    return state;
  }, []);

  useEffect(
    () => () => {
      stateRef.current?.observer.disconnect();
      stateRef.current?.callbacks.clear();
      stateRef.current = null;
    },
    [],
  );

  return useMemo(
    () => ({
      observe: (el, onEnter) => {
        const state = ensure();
        state.callbacks.set(el, onEnter);
        state.observer.observe(el);
      },
      unobserve: (el) => {
        const state = stateRef.current;
        if (!state) return;
        state.callbacks.delete(el);
        state.observer.unobserve(el);
      },
    }),
    [ensure],
  );
}

// Breathing room kept between the active thumbnail and the panel edge.
const FOLLOW_MARGIN = 8;
// While the user is driving the thumbnail list themselves (wheel, drag of the
// scrollbar, clicking a page), auto-follow steps aside for this long so the
// two never fight over scrollTop.
const MANUAL_SCROLL_GRACE_MS = 700;

export default function Preview({
  // slides,
  activeSlide,
  addSlide,
  jumpToSlide,
}: SidebarSlidesProps) {
  // const [mounted, setMounted] = useState(false);

  // useEffect(() => {
  //   startTransition(() => setMounted(true));
  // }, []);
  const slides = useEditorStore((s) => s.slides);

  const reorderSlides = useEditorStore((s) => s.reorderSlides);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: ACTIVATION_CONSTRAINT }),
    useSensor(TouchSensor, { activationConstraint: ACTIVATION_CONSTRAINT })
  );

  const handleToggleMenu = useCallback((id: string | null) => {
    setOpenMenuId(id);
  }, []);

  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);
  const thumbObserver = useThumbObserver();

  // ── Keep the thumbnail list in sync with the canvas ──────────────────────
  // The canvas' IntersectionObserver already moves activeSlide as the user
  // scrolls; the panel just has to follow it. Everything below is refs +
  // one rAF so a fast canvas scroll (activeSlide changing many times a
  // second) never queues work or re-renders this list.
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeSlideRef = useRef(activeSlide);
  const isDraggingRef = useRef(false);
  const manualScrollUntilRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFollowedOnceRef = useRef(false);

  // Named function expression: the retry below re-arms `follow` by name, so
  // the two halves never have to depend on each other.
  const followActiveSlide = useCallback(function follow() {
    const list = listRef.current;
    // Reordering moves thumbnails under dnd-kit's own transforms — measuring
    // them mid-drag would scroll to a stale position.
    if (!list || isDraggingRef.current) return;

    const thumb = list.querySelector<HTMLElement>(
      `[data-thumb-index="${activeSlideRef.current}"]`
    );
    if (!thumb) return;

    const listBox = list.getBoundingClientRect();
    const thumbBox = thumb.getBoundingClientRect();

    // Scroll by the smallest amount that brings the thumbnail into view — if
    // it is already visible we do nothing, which is what keeps a fast canvas
    // scroll from jittering the panel.
    let delta = 0;
    if (thumbBox.top < listBox.top + FOLLOW_MARGIN) {
      delta = thumbBox.top - listBox.top - FOLLOW_MARGIN;
    } else if (thumbBox.bottom > listBox.bottom - FOLLOW_MARGIN) {
      delta = thumbBox.bottom - listBox.bottom + FOLLOW_MARGIN;
    }
    if (Math.abs(delta) < 1) return;

    // A long hop (page 2 → page 40) animated smoothly just looks like lag,
    // and so does the very first sync after mount.
    const jumpIsFar = Math.abs(delta) > list.clientHeight * 1.5;
    const behavior: ScrollBehavior =
      jumpIsFar || !hasFollowedOnceRef.current ? "auto" : "smooth";
    hasFollowedOnceRef.current = true;

    list.scrollTo({ top: list.scrollTop + delta, behavior });
  }, []);

  const scheduleFollow = useCallback(() => {
    // Coalesce every request in this frame into a single scroll decision.
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      followActiveSlide();
    });
  }, [followActiveSlide]);

  useEffect(() => {
    activeSlideRef.current = activeSlide;
    scheduleFollow();
  }, [activeSlide, scheduleFollow]);

  // A new/removed page shifts every thumbnail below it.
  useEffect(() => {
    scheduleFollow();
  }, [slideIds.length, scheduleFollow]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Wheel/pointer/touch only — deliberately not the `scroll` event, which our
  // own scrollTo also fires and would make auto-follow suppress itself.
  const markManualScroll = useCallback(() => {
    manualScrollUntilRef.current = Date.now() + MANUAL_SCROLL_GRACE_MS;
  }, []);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    scheduleFollow();
  }, [scheduleFollow]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      isDraggingRef.current = false;
      const { active, over } = event;
      if (!over) {
        scheduleFollow();
        return;
      }
      const oldIndex = slideIds.indexOf(String(active.id));
      const newIndex = slideIds.indexOf(String(over.id));
      if (oldIndex !== newIndex) {
        reorderSlides(oldIndex, newIndex);
        setActiveSlide(newIndex);
        jumpToSlide(newIndex);
      }
    },
    [slideIds, reorderSlides, setActiveSlide, jumpToSlide, scheduleFollow]
  );


  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="kd-btn z-50 toggle-btn cursor-pointer"
        >
          Open Panel
        </button>
      )}

      <aside
        className={`w-full flex flex-col min-h-0 flex-1 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-[calc(100%+10%)]"
          }`}
      >
        {/* <div className="p-2 flex items-center justify-center">
          <button
            onClick={addSlide}
            className="kd-left-sidebar-add w-full p-2 rounded text-sm"
          >
            <FontAwesomeIcon icon={faPlus} /> Add New
          </button>
        </div> */}

        <DndContext
          id="editor-slide-sortable"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={slideIds}
            strategy={verticalListSortingStrategy}
          >
            <div
              ref={listRef}
              onWheel={markManualScroll}
              onPointerDown={markManualScroll}
              onTouchStart={markManualScroll}
              className="flex flex-col items-center gap-1 overflow-y-auto kd-custom-scrollbar flex-1 min-h-0 w-full"
              style={{
                overscrollBehaviorY: "contain",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {slides.map((slide, index) => (
                <SlideItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === activeSlide}
                  onJumpToSlide={jumpToSlide}
                  openMenuId={openMenuId}
                  onToggleMenu={handleToggleMenu}
                  observer={thumbObserver}
                />
              ))}

              <div className="p-2 flex items-center justify-center">
                <button
                  onClick={addSlide}
                  className="kd-left-sidebar-add w-full p-2 rounded text-sm"
                >
                 <FontAwesomeIcon icon={faPlus} /> Add New
                </button>
              </div>
            </div>
          </SortableContext>
        </DndContext>


      </aside>
    </>
  );
}
