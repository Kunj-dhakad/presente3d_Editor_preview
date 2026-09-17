"use client";
import React, {
  useEffect,
  useCallback,
  useRef,
  memo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useShallow } from "zustand/shallow";
import { addBookIndex } from "@editor/lib/bookIndex";
import useEditorStore, { DEFAULT_TEXT_COLOR, ElementData, TextData } from "@editor/store/editorStore";
import RenderTable from "@editor/blocks/Table/renderer/RenderTable";
// recharts drags in the whole d3 subtree (~450KB). Charts are rare on a page,
// so load the renderer on demand rather than on every editor boot.
const RenderChart = dynamic(
  () => import("@editor/blocks/Chart/renderer/RenderChart"),
  { ssr: false, loading: () => null },
);
import RenderText from "@editor/blocks/Text/renderer/RenderText";
import RenderBookIndex from "./RenderElement/RenderBookIndex";
import RenderImage from "@editor/blocks/Image/renderer/RenderImage";
import RenderButton from "@editor/blocks/Button/renderer/RenderButton";
import RenderShape from "@editor/blocks/Shape/renderer/RenderShape";
import RenderVideo from "@editor/blocks/Video/renderer/RenderVideo";
import SlideSettingToolbar from "./toolbar/SlideSetting/SlideSettingToolbar";
// Direct import, not the barrel: the barrel also re-exports generateSlidesZip,
// which pulls jszip + file-saver + html-to-image into the canvas boot path.
import { registerSlideRef } from "@editor/lib/outputGenerateLibrary/slideRefRegistry";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import RenderWatermark from "@editor/blocks/Watermark/renderer/RenderWatermark";
import RenderSvgElements from "@editor/blocks/Sticker/renderer/RenderSvgElements";
import { getCenteredMediaPlacement } from "./utils/mediaPlacement";
import { readDragPayload } from "./utils/dragPayloads";
import { addTextTemplateAtPoint } from "@editor/blocks/Text/components/textTemplate";
import GroupSelectionBox from "./RenderElement/GroupSelectionBox";
import AlignmentGuides from "@editor/layout/EditorCanvas/RenderElement/AlignmentGuides";
import RenderFrame from "@editor/blocks/Frame/renderer/RenderFrame";
import RenderQRCode from "@editor/blocks/QRCode/renderer/RenderQRCode";
import RenderInteraction from "@editor/blocks/Interaction/renderer/RenderInteraction";
import {
  isCanvasScrollSyncSuppressed,
  scrollCanvasToSlide,
} from "@editor/lib/ui/canvasScroll";

/** Arrow-key nudge distance, in canvas pixels. Shift takes the bigger step. */
const NUDGE_STEP = 1;
const NUDGE_STEP_LARGE = 10;

/**
 * How long a gap between nudges ends a burst. Below it the moves keep folding
 * into the same undo step; above it the next arrow press starts a new one.
 */
const NUDGE_BURST_MS = 500;

/** Which way each arrow key moves an element, as a unit vector. */
const NUDGE_VECTORS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

export type TextPresetKey =
  | "text-title"
  | "text-h1"
  | "text-h2"
  | "text-h3"
  | "text-p"
  | "text-quote";

export type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight?: number;
  fontStyle?: "normal" | "italic";
  width: number;
  height: number;
};

export const TEXT_PRESETS: Record<TextPresetKey, TextPreset> = {
  "text-title": {
    text: "Add a title",
    fontSize: 50,
    fontWeight: 700,
    lineHeight: 1.1,
    width: 295,
    height: 80,
  },
  "text-h1": {
    text: "Add a heading",
    fontSize: 36,
    fontWeight: 600,
    width: 270,
    height: 50,
  },
  "text-h2": {
    text: "Add a subheading",
    fontSize: 28,
    fontWeight: 600,
    width: 260,
    height: 44,
  },
  "text-h3": {
    text: "Add a section title",
    fontSize: 22,
    fontWeight: 500,
    width: 202,
    height: 40,
  },
  "text-p": {
    text: "Start writing your paragraph hereâ€¦",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    width: 280,
    height: 35,
  },
  "text-quote": {
    text: "Add a quote or highlight",
    fontSize: 20,
    fontWeight: 500,
    fontStyle: "italic",
    width: 250,
    height: 50,
  },
};


interface SlideCanvasProps {
  slideId: string;
  idx: number;
  isActive: boolean;
  shouldRenderContent: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSlideMouseDown: (idx: number) => (e: React.MouseEvent) => void;
}

const SlideCanvas = memo(
  ({ slideId, idx, isActive, shouldRenderContent, onDrop, onSlideMouseDown }: SlideCanvasProps) => {
    const { clearSelection, setSelectedElementIds } = useEditorStore(
      useShallow((s) => ({
        clearSelection: s.clearSelection,
        setSelectedElementIds: s.setSelectedElementIds,
      }))
    );
    const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
    const zoom = useEditorUIStore((s) => s.MainCanvasScale);
    const slideRef = useRef<HTMLDivElement | null>(null);
    const marqueeRef = useRef<{
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      active: boolean;
      moved: boolean;
    } | null>(null);
    const [marquee, setMarquee] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
      visible: boolean;
    } | null>(null);

    // zustand runs every subscriber's selector on every set(), and one of these
    // components is mounted per page — so a linear `find` here was O(pages^2)
    // work on every store write. The index is right in all but the frame right
    // after a reorder, so it is used as an O(1) fast path with the scan kept as
    // the fallback.
    const slide = useEditorStore(
      useCallback(
        (s) => {
          const atIndex = s.slides[idx];
          if (atIndex?.id === slideId) return atIndex;
          return s.slides.find((sl) => sl.id === slideId);
        },
        [slideId, idx],
      ),
    );

    // Only the active slide and its immediate neighbours keep their element
    // tree mounted. Distant slides keep their sized wrapper — so scroll
    // position, registerSlideRef and the IntersectionObserver are unaffected —
    // they just render no children. Export needs every slide's real content to
    // rasterize it, so it bypasses the window entirely.
    const renderContent = imageExportMode || shouldRenderContent;

    const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
      const el = slideRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const safeZoom = zoom || 1;
      return {
        x: (e.clientX - rect.left) / safeZoom,
        y: (e.clientY - rect.top) / safeZoom,
      };
    }, [zoom]);

    const buildMarquee = useCallback((startX: number, startY: number, currentX: number, currentY: number) => ({
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
      visible: true,
    }), []);

    const handleSlideMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-element="true"]')) return;
      if (e.button !== 0 || imageExportMode) return;
      onSlideMouseDown(idx)(e);
      const point = getCanvasPoint(e);
      marqueeRef.current = {
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        active: true,
        moved: false,
      };
      clearSelection();
      setMarquee({ x: point.x, y: point.y, width: 0, height: 0, visible: true });
    }, [clearSelection, getCanvasPoint, idx, imageExportMode, onSlideMouseDown]);

    const handleSlideMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const state = marqueeRef.current;
      if (!state?.active) return;
      const point = getCanvasPoint(e);
      state.currentX = point.x;
      state.currentY = point.y;
      const next = buildMarquee(state.startX, state.startY, point.x, point.y);
      state.moved = next.width > 4 || next.height > 4;
      setMarquee(next);
    }, [buildMarquee, getCanvasPoint]);

    const finishMarquee = useCallback(() => {
      const state = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);
      if (!state || !slide) return;
      const box = buildMarquee(state.startX, state.startY, state.currentX, state.currentY);
      if (!state.moved || box.width < 4 || box.height < 4) {
        clearSelection();
        return;
      }
      const intersects = (a: typeof box, b: { x: number; y: number; width: number; height: number }) =>
        a.x <= b.x + b.width &&
        a.x + a.width >= b.x &&
        a.y <= b.y + b.height &&
        a.y + a.height >= b.y;
      const selectedIds = slide.elements
        .filter((el) => intersects(box, {
          x: el.data.x,
          y: el.data.y,
          width: el.data.width,
          height: el.data.height,
        }))
        .map((el) => el.id);
      setSelectedElementIds(selectedIds);
    }, [buildMarquee, clearSelection, setSelectedElementIds, slide]);

    if (!slide) return null;
    const clipBounds = {
      x: 0,
      y: 0,
      width: slide.width ?? 0,
      height: slide.height ?? 0,
    };
    return (
      <div data-slide-index={idx}>
        {/* Per-page toolbar sirf un pages par jinka content mount hai. Ye 25
            DOM nodes hai aur store se chaar jagah subscribe karta hai, to
            200-page book me sirf yahi ~5,000 nodes tha aur har edit par
            saare 200 dobara render hote the.

            `minHeight` toolbar ki naapi hui layout height hai (13px label +
            4px margin; buttons 14px, isse chhote). Isse bina toolbar wale
            pages bhi utni hi jagah lete hain aur scroll position nahi khiskti.
            Div khud har page ke liye rehta hai — `jumpToSlide` ise index se
            dhoondta hai. */}
        <div className="kd-slide-scroll " style={{ minHeight: 17 }}>
          {!imageExportMode && renderContent && (
            <SlideSettingToolbar slideIndex={idx} />
          )}
        </div>
        <div
          onMouseDown={onSlideMouseDown(idx)}
          className={`
          relative w-full h-auto transition-all duration-150 mb-10  kd-slide
          ${isActive ? "kd-slide-active" : "kd-slide-inactive"}
        `}
        >

          <div
            ref={(el) => {
              slideRef.current = el;
              registerSlideRef(idx, el);
            }}
            // The drop listens here rather than on the bordered wrapper above.
            // `.kd-slide` carries a 2px border, and a bounding rect includes it,
            // so measuring from the wrapper put every drop 2px off — this box is
            // the page surface itself, which is the coordinate space elements
            // are actually stored in.
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="relative w-full"
            style={{
              height: slide.height,
              background: slide.background || "#ffffff",
              // overflow: "hidden",
              boxShadow:
                "0px 2px 6px rgba(0,0,0,0.04), 0px 10px 20px rgba(0,0,0,0.06), 0px 25px 50px rgba(0,0,0,0.08)",
            }}
            onMouseDown={handleSlideMouseDown}
            onMouseMove={handleSlideMouseMove}
            onMouseUp={finishMarquee}
            onMouseLeave={finishMarquee}
          >
         

            {renderContent && slide.elements.map((el) => {
              const d = el.data as ElementData;
              if (d.type === "text" && d.bookRole === "index")
                return <RenderBookIndex key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "text")
                return <RenderText key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "image")
                return <RenderImage key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "video")
                return <RenderVideo key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "button")
                return <RenderButton key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "shape")
                return <RenderShape key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "svg")
                return <RenderSvgElements key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "watermark")
                return <RenderWatermark key={el.id} id={el.id} data={d} slideIndex={idx} />;
              if (d.type === "table")
                return <RenderTable key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "chart")
                return <RenderChart key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
          
              if (d.type === "interaction")
                return <RenderInteraction key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "frame")
                return <RenderFrame key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
              if (d.type === "qr-code")
                return <RenderQRCode key={el.id} id={el.id} data={d} slideIndex={idx} clipBounds={clipBounds} />;
            
              return null;
            })}
            {marquee?.visible && (
              <div
                data-element="true"
                style={{
                  position: "absolute",
                  left: marquee.x,
                  top: marquee.y,
                  width: marquee.width,
                  height: marquee.height,
                  border: "1px solid var(--kd-accent)",
                  background: "var(--kd-accent-subtle)",
                  opacity: 0.55,
                  pointerEvents: "none",
                  zIndex: 9998,
                }}
              />
            )}
            <GroupSelectionBox slideIndex={idx} />
            {/* Only the active slide can be dragged on, and every mounted
                copy would re-render on each pointer move of a drag — in a book
                of a hundred-odd pages that is the whole frame budget. */}
            {isActive && <AlignmentGuides slideIndex={idx} />}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.slideId === next.slideId &&
    prev.idx === next.idx &&
    prev.isActive === next.isActive &&
    prev.shouldRenderContent === next.shouldRenderContent &&
    prev.onDrop === next.onDrop &&
    prev.onSlideMouseDown === next.onSlideMouseDown
);

SlideCanvas.displayName = "SlideCanvas";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN CANVAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MainCanvas: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ containerRef }) => {

  const slideIds = useEditorStore(
    useShallow((s) => s.slides.map((sl) => sl.id))
  );

  const activeSlide = useEditorStore((s) => s.activeSlide);
  const [canvasViewportHeight, setCanvasViewportHeight] = useState(0);
  const [renderedSlideIds, setRenderedSlideIds] = useState<Set<string>>(
    () => new Set(slideIds.slice(0, 3)),
  );

  // âœ… Canvas width â€” sirf ye ek value
  const canvasWidth = useEditorStore(
    useCallback((s) => s.slides[s.activeSlide]?.width, [])
  );
  const canvasHeight = useEditorStore(
    useCallback((s) => s.slides[s.activeSlide]?.height, [])
  );
  const canvasStackHeight = useEditorStore(
    useCallback(
      (s) =>
        s.slides.reduce(
          (total, slide) => total + (slide.height ?? 0) + 57,
          0,
        ),
      [],
    ),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => setCanvasViewportHeight(container.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  // const canvasWidth = 346;
  const { setActiveSlide, setActiveElementId, clearSelection, addElement } = useEditorStore(
    useShallow((s) => ({
      setActiveSlide: s.setActiveSlide,
      setActiveElementId: s.setActiveElementId,
      clearSelection: s.clearSelection,
      addElement: s.addElement,
    }))
  );

  const { deleteElement, deleteElements, duplicateElement, duplicateElements, copySelectedElements, pasteElements, undo, redo, nudgeElements } = useEditorStore(
    useShallow((s) => ({
      deleteElement: s.deleteElement,
      deleteElements: s.deleteElements,
      duplicateElement: s.duplicateElement,
      duplicateElements: s.duplicateElements,
      copySelectedElements: s.copySelectedElements,
      pasteElements: s.pasteElements,
      undo: s.undo,
      redo: s.redo,
      nudgeElements: s.nudgeElements,
    }))
  );

  const activeElementIdRef = useRef<string | null>(
    useEditorStore.getState().activeElementId
  );
  const selectedElementIdsRef = useRef<string[]>(
    useEditorStore.getState().selectedElementIds
  );

  // Aakhri activeSlide jo canvas ke apne scroll se aaya tha. Isse pata chalta
  // hai ki naya activeSlide scroll ka nateeja hai ya kisi action ka.
  const activeFromScrollRef = useRef(activeSlide);

  // Mount window ke do inputs — dono ref me, taaki observer callback aur
  // effect dobara chalne par inki value bani rahe.
  const activeSlideRef = useRef(activeSlide);
  const nearIndexesRef = useRef<Set<number>>(new Set());


  // Jab activeSlide scroll ke alawa kisi aur wajah se badle — page add hua,
  // duplicate hua, thumbnail se jump kiya — to canvas ko wahan le jao. Pehle
  // store activeSlide set kar deta tha par canvas hilta hi nahi tha, isliye
  // "Add page" dabane ke baad bhi user purane page par likhta reh jaata tha.
  useEffect(() => {
    if (activeFromScrollRef.current === activeSlide) return;
    activeFromScrollRef.current = activeSlide;
    scrollCanvasToSlide(activeSlide);
  }, [activeSlide]);

// Which page is "current" as the canvas scrolls.
//
// This used to re-query every `[data-slide-index]` node and call
// getBoundingClientRect() on ALL of them on every scroll frame — a forced
// layout per page, per frame, so a long book paid hundreds of layout flushes a
// second while scrolling. The page geometry only changes when pages are
// added/removed or the zoom changes, so it is measured once into a table and
// the scroll handler then does plain arithmetic against scrollTop.
//
// (An IntersectionObserver version of this used to live below, unreachable
// after an early return; it is gone rather than left to rot.)
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  type PageOffset = { index: number; center: number };
  let offsets: PageOffset[] = [];

  const measure = () => {
    offsets = Array.from(
      container.querySelectorAll<HTMLElement>("[data-slide-index]"),
      (page) => ({
        index: Number(page.dataset.slideIndex),
        center: page.offsetTop + page.offsetHeight / 2,
      }),
    ).filter((entry) => Number.isInteger(entry.index));
  };

  let scrollRaf: number | null = null;
  const syncActivePageFromScroll = () => {
    scrollRaf = null;
    if (offsets.length === 0) return;
    // Jab hum khud kisi page tak scroll kar rahe hain to raste me padne wale
    // pages ko active mat banao — warna page add karne par activeSlide turant
    // purane page par wapas aa jaata hai aur scroll bekaar chala jaata hai.
    if (isCanvasScrollSyncSuppressed()) return;

    // No layout reads here: pure maths against the cached table.
    const viewportCenter = container.scrollTop + container.clientHeight / 2;
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const { index, center } of offsets) {
      const distance = Math.abs(center - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    if (nearestIndex >= 0 && useEditorStore.getState().activeSlide !== nearestIndex) {
      // Yaad rakho ki ye badlaav scroll se aaya hai, taaki neeche wala
      // follow-effect ise dobara scroll karne ki koshish na kare.
      activeFromScrollRef.current = nearestIndex;
      useEditorStore.getState().clearSelection();
      setActiveSlide(nearestIndex);
    }
  };

  const handleCanvasScroll = () => {
    if (isCanvasScrollSyncSuppressed()) return;
    useEditorStore.getState().clearSelection();
    if (scrollRaf === null) scrollRaf = requestAnimationFrame(syncActivePageFromScroll);
  };

  // Re-measure when the pages themselves move: zoom, window resize, or a page
  // growing because its text reflowed.
  const remeasure = () => {
    measure();
    if (scrollRaf === null) scrollRaf = requestAnimationFrame(syncActivePageFromScroll);
  };

  measure();
  syncActivePageFromScroll();

  container.addEventListener("scroll", handleCanvasScroll, { passive: true });
  const resizeObserver = new ResizeObserver(remeasure);
  resizeObserver.observe(container);
  const unsubscribeZoom = useEditorUIStore.subscribe((state, previous) => {
    if (state.MainCanvasScale !== previous.MainCanvasScale) remeasure();
  });

  return () => {
    container.removeEventListener("scroll", handleCanvasScroll);
    resizeObserver.disconnect();
    unsubscribeZoom();
    if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
  };
}, [slideIds.length, setActiveSlide, containerRef]);




  // Viewport ke aas-paas wale pages ka content mount rehta hai, baaki ka
  // unmount ho jaata hai.
  //
  // Pehle ye Set sirf badhta tha — jo page ek baar mount hua wo hamesha ke
  // liye mounted reh jaata tha. 200-page book ko ek baar poora scroll karne ke
  // baad DOM 7,900 se 12,500 nodes aur heap 21 se 68 MB ho jaata tha, aur
  // wahin se har edit dhima padta tha. Ab window scroll ke saath khiskati hai.
  //
  // `nearIndexes` ref me hai (state me nahi) taaki effect dobara chalne par —
  // yaani page add/remove hone par — abhi-abhi dekhe gaye pages bhool na jaayen
  // aur ek frame ke liye sab kuch unmount na ho jaye.
  const commitMountWindow = useCallback(() => {
    setRenderedSlideIds((current) => {
      const next = new Set<string>();
      const keep = (index: number) => {
        const id = slideIds[index];
        if (id) next.add(id);
      };

      // Observer already 150% rootMargin ke saath dekh raha hai, to yahan ek
      // page ka aur margin kaafi hai.
      for (const index of nearIndexesRef.current) {
        keep(index - 1);
        keep(index);
        keep(index + 1);
      }
      // Active page hamesha mounted — thumbnail se jump karne ke turant baad
      // wo abhi viewport me nahi hota, par uspar kaam shuru ho sakta hai.
      for (let offset = -1; offset <= 1; offset += 1) keep(activeSlideRef.current + offset);

      if (next.size === current.size && [...next].every((id) => current.has(id))) {
        return current;
      }
      return next;
    });
  }, [slideIds]);

  useEffect(() => {
    activeSlideRef.current = activeSlide;
    commitMountWindow();
  }, [activeSlide, commitMountWindow]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const near = nearIndexesRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.slideIndex);
          if (!Number.isInteger(index)) continue;
          if (entry.isIntersecting) near.add(index);
          else near.delete(index);
        }
        commitMountWindow();
      },
      { root: container, rootMargin: "150% 0px", threshold: 0 },
    );

    container.querySelectorAll("[data-slide-index]").forEach((el) => observer.observe(el));
    commitMountWindow();
    return () => observer.disconnect();
  }, [containerRef, slideIds, commitMountWindow]);

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state) => {
      activeElementIdRef.current = state.activeElementId;
      selectedElementIdsRef.current = state.selectedElementIds;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Arrow nudges fold into bursts, so holding an arrow down is one undo step
    // rather than one per key repeat. A pause longer than NUDGE_BURST_MS, or
    // moving on to a different selection, opens the next one.
    let lastNudgeAt = 0;
    let lastNudgeTarget = "";

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "input" ||
        target.tagName.toLowerCase() === "textarea" ||
        target.isContentEditable
      ) return;

      const activeId = activeElementIdRef.current;
      const selectedIds = selectedElementIdsRef.current;

      const nudge = NUDGE_VECTORS[e.key];
      // Ctrl/Cmd/Alt + arrow belongs to the browser and the OS, not to us.
      if (nudge && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ids = selectedIds.length > 1 ? selectedIds : activeId ? [activeId] : [];
        if (ids.length === 0) return;
        // Without this the canvas scrolls under the element being moved.
        e.preventDefault();

        const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
        const burstTarget = ids.join(",");
        const now = Date.now();
        const startsBurst = burstTarget !== lastNudgeTarget || now - lastNudgeAt > NUDGE_BURST_MS;
        lastNudgeAt = now;
        lastNudgeTarget = burstTarget;

        nudgeElements(ids, nudge.dx * step, nudge.dy * step, { history: startsBurst });
        return;
      }

      if (e.key === "Delete" && selectedIds.length > 1) {
        e.preventDefault();
        deleteElements(selectedIds);
        return;
      }

      if (e.key === "Delete" && activeId) {
        e.preventDefault();
        deleteElement(activeId);
        return;
      }

      if (e.key.toLowerCase() === "d" && e.ctrlKey && selectedIds.length > 1) {
        e.preventDefault();
        duplicateElements(selectedIds);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelectedElements();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteElements();
        return;
      }

      if (e.key.toLowerCase() === "d" && e.ctrlKey && activeId) {
        e.preventDefault();
        duplicateElement(activeId);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySelectedElements, deleteElement, deleteElements, duplicateElement, duplicateElements, pasteElements, undo, redo, nudgeElements]);

  // âœ… Drop handler â€” stable
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const {
        element: type,
        imageSrc: imgSrc,
        videoSrc,
        shapeSvg,
        buttonStyle,
        buttonData,
        textTemplateUrl,
      } = readDragPayload(e.dataTransfer);

      // The page stack renders under `transform: scale(zoom)`, so the rect the
      // browser reports is in screen pixels while element coordinates are in
      // unscaled page pixels. Without dividing, a drop landed `distance ×
      // (zoom − 1)` away from the cursor — nothing at the top-left corner, and
      // further off the further out you dropped. Read from the store rather
      // than a hook so this callback keeps its identity across zoom changes;
      // SlideCanvas memoizes on it.
      const zoom = useEditorUIStore.getState().MainCanvasScale || 1;
      const slideRect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - slideRect.left) / zoom;
      const y = (e.clientY - slideRect.top) / zoom;

      /**
       * Where an element of this size should sit so the cursor ends up in its
       * middle, kept inside the page. Text, shapes and buttons used to anchor
       * their top-left corner at the cursor instead, which read as the element
       * jumping down and to the right of where it was dropped — by half its own
       * size, so a wide heading missed by a lot.
       */
      const place = (w: number, h: number) => ({
        x: Math.min(Math.max(0, x - w / 2), Math.max(0, (canvasWidth || w) - w)),
        y: Math.min(Math.max(0, y - h / 2), Math.max(0, (canvasHeight || h) - h)),
      });

      if (type === "book-chapter") {
        addElement({ type: "text", bookRole: "chapter", text: "Chapter title", chapterSubtitle: "", chapterAutoNumber: true, ...place(270, 70), width: 270, height: 70, rotation: 0, opacity: 1, zIndex: 1, fontFamily: "Plus Jakarta Sans", fontSize: 30, fontWeight: 700, lineHeight: 1.2, textAlign: "left", letterSpacing: 0, color: DEFAULT_TEXT_COLOR });
        return;
      }
      if (type === "book-index") {
        // Always page two, always one per book — wherever it was dropped.
        addBookIndex();
        return;
      }
      if (type.startsWith("text")) {
        const preset = TEXT_PRESETS[type as TextPresetKey];
        if (!preset) return;
        const element: TextData = {
          type: "text",
          ...place(preset.width, preset.height),
          width: preset.width,
          height: preset.height,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          text: preset.text,
          fontSize: preset.fontSize,
          fontWeight: preset.fontWeight,
          lineHeight: preset.lineHeight,
          fontStyle: preset.fontStyle,
          fontFamily: "Plus Jakarta Sans",
          textAlign: "left",
          letterSpacing: 0,
          color: DEFAULT_TEXT_COLOR,
        };
        addElement(element);
        return;
      }

      if (type === "image" && imgSrc) {
        const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, 300, 200);
        addElement({
          type: "image",
          src: imgSrc,
          ...place(placement.width, placement.height),
          width: placement.width,
          height: placement.height,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          stroke: "",
          strokeWidth: 0,
          borderRadius: "0",
          offsetX: 0,
          offsetY: 0,
          blur: 0,
          color: "transparent",
          fit: "cover",
          maxWidth: 300,
          maxHeight: 200,
          objectFit: "cover",
          contrast: 100,
          hueRotate: 0,
          saturate: 100,
          grayscale: 0,
          sepia: 0,
          brightness: 100,
          transform: "none",
          isDragging: false,
          animationType: "None",
        });
        return;
      }

      if (type === "video" && videoSrc) {
        // No natural size is available at drop time the way the panel's own
        // click path has it, so a 16:9 box is fitted to the page and then
        // centred on the cursor — same two steps as an image.
        const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, 320, 180);
        addElement({
          type: "video",
          src: videoSrc,
          ...place(placement.width, placement.height),
          width: placement.width,
          height: placement.height,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          stroke: "",
          strokeWidth: 0,
          borderRadius: "0",
          offsetX: 0,
          offsetY: 0,
          color: "transparent",
          isDragging: false,
          animationType: "None",
        });
        return;
      }

      if (type === "shape" && shapeSvg) {
        addElement({
          type: "svg",
          src: shapeSvg,
          ...place(120, 120),
          color: "",
          width: 120,
          height: 120,
          offsetX: 0,
          offsetY: 0,
          Shadowblur: 0,
          rotation: 0,
          opacity: 1,
        });
        return;
      }

      if (type === "button" && buttonData) {
        // The gallery entry ships its own style object, so there is nothing to
        // look up here — the drop and the panel's click produce the same button.
        addElement({
          type: "button",
          text: "Read More",
          ...place(140, 44),
          width: 140,
          height: 44,
          fontSize: 14,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          fontFamily: "Inter",
          buttonStyle: buttonStyle || undefined,
          ...buttonData,
        } as ElementData);
        return;
      }

      if (type === "text-template" && textTemplateUrl) {
        void addTextTemplateAtPoint(textTemplateUrl, x, y);
        return;
      }
    },
    [addElement, canvasHeight, canvasWidth]
  );

  const handleSlideMouseDown = useCallback(
    (idx: number) => (e: React.MouseEvent) => {
      setActiveSlide(idx);
      if (e.target === e.currentTarget) {
        setActiveElementId(null);
      }
    },
    [setActiveSlide, setActiveElementId]
  );

  const zoom = useEditorUIStore((s) => s.MainCanvasScale);
  const setZoom = useEditorUIStore((s) => s.setMainCanvasScale);
  const centerZoomedStack =
    canvasViewportHeight > 0 && canvasStackHeight * zoom <= canvasViewportHeight;

  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = zoomRef.current - e.deltaY * 0.001;
      setZoom(Math.min(2, Math.max(0.1, next)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [containerRef, setZoom]);

  // Keyboard zoom
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setZoom(Math.min(2, zoomRef.current + 0.1));
        }
        if (e.key === "-") {
          e.preventDefault();
          setZoom(Math.max(0.1, zoomRef.current - 0.1));
        }
        if (e.key === "0") {
          e.preventDefault();
          setZoom(1);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setZoom]);

  return (
    <div
      className="relative w-full h-full shadow-xl overflow-hidden"
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-element="true"]')) {
          clearSelection();
        }
      }}
    >
      <div
        ref={containerRef}
        className="default-img absolute inset-0 my-2 kd-default-scroll-panel overflow-auto w-full flex flex-col items-center"
        style={{ justifyContent: centerZoomedStack ? "center" : "flex-start" }}
      >
        <div
          style={{
            width: canvasWidth,
            flexShrink: 0,
            // Unlike transform: scale(), CSS zoom changes the layout and
            // scroll dimensions too. That keeps every page visible at low
            // zoom and lets the viewport center the entire page stack.
            zoom,
          }}
        >
          {slideIds.map((slideId, idx) => (
            <SlideCanvas
              key={slideId}
              slideId={slideId}
              idx={idx}
              isActive={idx === activeSlide}
              shouldRenderContent={renderedSlideIds.has(slideId)}
              onDrop={handleDrop}
              onSlideMouseDown={handleSlideMouseDown}
            />
          ))}
        </div>
      </div>

    </div>
  );
};

export default MainCanvas;











