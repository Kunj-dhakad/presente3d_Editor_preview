"use client";
import React, { useRef, useCallback, memo, useEffect, useState } from "react";
import { trackAnchor } from "@editor/lib/ui/anchorTracking";
import { createPortal } from "react-dom";
import { Move, RotateCcw } from "lucide-react";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import useEditorStore from "@editor/store/editorStore";
import { applyCopiedStyleIfActive } from "@editor/lib/styleClipboard";
import { getPageClipPath, PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import useSnapGuideStore from "@editor/store/useSnapGuideStore";
import {
  boundsOf,
  prepareSnap,
  snapMove,
  snapResize,
  type ResizeHandle,
  type SnapPlan,
} from "@editor/lib/canvas/snapping";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "rotate";

interface Rect { x: number; y: number; width: number; height: number; rotation: number; }

interface Props {
  id: string;
  rect: Rect;
  isSelected: boolean;
  imageExportMode?: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onElementClick?: () => void;
  onChange: (r: Rect) => void;
  onContainerChange?: (el: HTMLDivElement | null) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  /**
   * Opening an element's own editor. It belongs here rather than on whatever
   * the block renders inside, because this layer calls `preventDefault` on
   * pointer-down — a handler further in never hears the second click.
   */
  onDoubleClick?: () => void;
  clipBounds?: PageClipBounds;
  /**
   * Extra room, in px, for artwork that paints outside its own box — a shape's
   * glow or drop shadow. The content layer clips to the element's box, so
   * without this the effect is sliced off at the edge.
   */
  effectBleed?: number;
  dragDisabled?: boolean;
  allowTextSelection?: boolean;
  children: React.ReactNode;
}

const DEG = Math.PI / 180;

/**
 * A floor, not a working minimum. 20px used to be as small as anything could
 * get, which is larger than plenty of legitimate rules, dots and dividers — but
 * an element with no area at all cannot be grabbed, selected or resized back,
 * so a couple of pixels are kept.
 */
const MIN_SIZE = 2;

/** Corner handle at full size, and how far it is allowed to shrink. */
const CORNER_SIZE = 10;
const CORNER_SIZE_MIN = 5;

/**
 * An edge shorter than this cannot carry a side handle without the handle
 * hiding the very thing being resized. Below it the side handles step aside and
 * the corners do the work — and they come back on their own as soon as the edge
 * is long enough again, mid-drag included.
 */
const SIDE_HANDLE_MIN_EDGE = 44;

/** How close, in screen pixels, a line has to come before it snaps. */
const SNAP_TOLERANCE_PX = 6;

/** Folds any angle into (-180, 180], the range the readout speaks in. */
const wrapAngle = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

const isCorner = (h: Handle) => h.length === 2;

/**
 * The rect the page-clip polygon is measured against.
 *
 * The polygon's coordinates are relative to the content layer's own top-left
 * corner, and the bleed pushes that corner out by `bleed` in both axes — so
 * the rect has to grow to match or the clip lands offset by exactly the bleed.
 * Growing symmetrically keeps the centre put, which is what the rotation in
 * getPageClipPath pivots around.
 */
const clipRectFor = (rect: Rect, bleed: number) =>
  bleed > 0
    ? {
        x: rect.x - bleed,
        y: rect.y - bleed,
        width: rect.width + bleed * 2,
        height: rect.height + bleed * 2,
        rotation: rect.rotation,
      }
    : rect;

/** Corner handle size for an element of these dimensions. */
const cornerSizeFor = (width: number, height: number) =>
  Math.round(
    Math.min(
      CORNER_SIZE,
      Math.max(CORNER_SIZE_MIN, Math.min(width, height) * 0.45),
    ),
  );

export const CanvasDragDrop: React.FC<Props> = memo(({
  id, rect, isSelected, imageExportMode = false,
  onSelect, onElementClick, onChange, onContainerChange, onContextMenu, onDoubleClick, clipBounds,
  effectBleed = 0, dragDisabled = false, allowTextSelection = false, children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentClipRef = useRef<HTMLDivElement>(null);
  const quickControlsRef = useRef<HTMLDivElement>(null);
  const liveRect = useRef<Rect>({ ...rect });
  const dragState = useRef<{
    handle: Handle | "drag";
    startX: number;
    startY: number;
    /** Rotation is accumulated move by move, so a sweep can pass the seam. */
    lastAngle: number;
    turned: number;
    snap: Rect;
    started: boolean;
    /** What to line up against, worked out once at the start — none of it
        can move while this one element is being dragged. */
    plan: SnapPlan;
    slideIndex: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [controlsPos, setControlsPos] = useState<{ left: number; top: number } | null>(null);
  const [rotationBadge, setRotationBadge] = useState<{ left: number; top: number; value: number } | null>(null);
  const [sizeBadge, setSizeBadge] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const movedRef = useRef(false);
  // Where a read-only (preview/export) press started, so pointer-up can tell a
  // click apart from a scroll/flip gesture that merely passed over the element.
  const readOnlyPressRef = useRef<{ x: number; y: number } | null>(null);
  const lastHandleRef = useRef<Handle | "drag" | null>(null);
  const previousCursorRef = useRef("");
  const zoom = useEditorUIStore((s) => s.MainCanvasScale);
  const selectedCount = useEditorStore((s) => s.selectedElementIds.length);
  const isMultiSelection = selectedCount > 1;

  const formatRotation = useCallback(
    (rotation: number) => wrapAngle(Math.round(rotation)),
    [],
  );

  const updateControlsPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el || !isSelected || imageExportMode) {
      setControlsPos(null);
      return;
    }
    const box = el.getBoundingClientRect();
    setControlsPos({
      left: box.left + box.width / 2,
      top: box.bottom + 12,
    });
  }, [imageExportMode, isSelected]);

  const setChromeVisible = useCallback((visible: boolean) => {
    if (quickControlsRef.current) {
      quickControlsRef.current.style.display = visible ? "flex" : "none";
    }
    document.querySelectorAll<HTMLElement>(".kd-text-toolbar").forEach((el) => {
      el.style.display = visible ? "" : "none";
    });
  }, []);

  const setGlobalCursor = useCallback((cursor: string | null) => {
    if (typeof document === "undefined") return;
    if (cursor) {
      previousCursorRef.current = document.body.style.cursor;
      document.body.style.cursor = cursor;
    } else {
      document.body.style.cursor = previousCursorRef.current;
    }
  }, []);

  // Only the selected element has controls to keep in place. This used to
  // listen on window for every element on every mounted slide, so a scroll
  // anywhere — canvas, pages panel, a sidebar — woke up every element's
  // handler; the selected one then measured layout on each of those.
  useEffect(() => {
    const raf = requestAnimationFrame(updateControlsPosition);
    if (!isSelected || imageExportMode) {
      return () => cancelAnimationFrame(raf);
    }

    const el = containerRef.current;
    const stopTracking = el ? trackAnchor(el, updateControlsPosition) : undefined;
    return () => {
      cancelAnimationFrame(raf);
      stopTracking?.();
    };
  }, [
    rect.x, rect.y, rect.width, rect.height, rect.rotation,
    updateControlsPosition, zoom, isSelected, imageExportMode,
  ]);

  /**
   * Sizes the resize chrome to the element it sits on.
   *
   * Written straight to the DOM because it has to keep up with a live drag,
   * which deliberately never re-renders — the same values are also in the JSX,
   * so a render puts everything back in step and neither can go stale.
   */
  const applyHandleChrome = useCallback((width: number, height: number) => {
    const el = containerRef.current;
    if (!el) return;
    const size = cornerSizeFor(width, height);
    const inset = `${-Math.round(size * 0.3)}px`;
    el.querySelectorAll<HTMLElement>("[data-resize-handle]").forEach((node) => {
      const h = node.dataset.resizeHandle as Handle;
      if (isCorner(h)) {
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        if (h.includes("n")) node.style.top = inset;
        else node.style.bottom = inset;
        if (h.includes("w")) node.style.left = inset;
        else node.style.right = inset;
        return;
      }
      const edge = h === "n" || h === "s" ? width : height;
      node.style.display = edge >= SIDE_HANDLE_MIN_EDGE ? "block" : "none";
    });
  }, []);

  const applyRectToDOM = useCallback((r: Rect) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.left = r.x + "px";
    el.style.top = r.y + "px";
    el.style.width = r.width + "px";
    el.style.height = r.height + "px";
    el.style.transform = `rotate(${r.rotation}deg)`;
    const clipPath = getPageClipPath(clipRectFor(r, effectBleed), clipBounds) ?? "";
    if (contentClipRef.current) {
      contentClipRef.current.style.clipPath = clipPath;
      contentClipRef.current.style.setProperty("-webkit-clip-path", clipPath);
    }
    applyHandleChrome(r.width, r.height);
  }, [applyHandleChrome, clipBounds, effectBleed]);

  const getPointerAngle = useCallback((clientX: number, clientY: number) => {
    const elRect = containerRef.current?.getBoundingClientRect();
    if (!elRect) return 0;
    const cx = elRect.left + elRect.width / 2;
    const cy = elRect.top + elRect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, handle: Handle | "drag") => {
    e.stopPropagation();
    if (dragDisabled && handle === "drag") return;

    // Preview and export are read-only views of the canvas. A press there may
    // still turn into a click — links, buttons and interactions have to keep
    // working — but it must never move, resize, rotate or select the element.
    // (TextDragAndDrop already did this; without the same guard here every
    // non-text element stayed draggable inside the preview.)
    if (imageExportMode) {
      if (handle === "drag") {
        readOnlyPressRef.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    e.preventDefault();
    if (e.button === 0 && applyCopiedStyleIfActive(id)) return;
    if (handle === "drag" && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      onSelect(e);
      return;
    }
    if (!isSelected) onSelect(e);

    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
    if (isSelected) {
      // Resizing keeps its handles on screen: they are what the author is
      // aiming at, and watching them shrink away is the cue that the element
      // has got smaller than they can serve. Only a move hides them, so
      // nothing trails along under the cursor.
      if (handle === "drag") setIsTransforming(true);
      setChromeVisible(false);
    }
    if (handle === "rotate") setGlobalCursor("grabbing");
    if (handle === "drag") setGlobalCursor("move");

    // Selection has already put the store on this element's slide, so the
    // siblings to align against are the ones sitting there with it.
    const store = useEditorStore.getState();
    const slideIndex = store.activeSlide;
    const slide = store.slides[slideIndex];
    const plan = prepareSnap(
      (slide?.elements ?? [])
        .filter((other) => other.id !== id)
        .map((other) => boundsOf(other.data as unknown as Rect)),
      { width: slide?.width ?? 0, height: slide?.height ?? 0 },
    );

    liveRect.current = { ...rect };
    dragState.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      lastAngle:
        handle === "rotate" ? getPointerAngle(e.clientX, e.clientY) : 0,
      turned: 0,
      snap: { ...rect },
      started: false,
      plan,
      slideIndex,
    };
    lastHandleRef.current = handle;
    movedRef.current = false;

    setIsDragging(true);
  }, [dragDisabled, getPointerAngle, id, imageExportMode, isSelected, onSelect, rect, setChromeVisible, setGlobalCursor]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;

    const safeZoom = zoom || 1;
    const rawDx = e.clientX - ds.startX;
    const rawDy = e.clientY - ds.startY;
    const dx = rawDx / safeZoom;
    const dy = rawDy / safeZoom;

    const passedDragThreshold = Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3;
    if ((ds.handle === "drag" || ds.handle === "rotate") && !ds.started) {
      if (!passedDragThreshold) return;
      ds.started = true;
      movedRef.current = true;
      setChromeVisible(false);
      // Pointer-down only hides the chrome for an element that was *already*
      // selected, so the very first drag of a fresh one used to carry its
      // handles along with it. Movement is the honest signal either way.
      if (ds.handle === "drag") setIsTransforming(true);
    } else if (passedDragThreshold) {
      movedRef.current = true;
    }

    const s = ds.snap;
    let newRect: Rect;

    // Holding Alt puts the element exactly where the pointer says, for the
    // times a snap is the thing getting in the way.
    const snapping = !e.altKey;
    const tolerance = SNAP_TOLERANCE_PX / safeZoom;
    const guides = useSnapGuideStore.getState();

    if (ds.handle === "drag") {
      newRect = { ...s, x: s.x + dx, y: s.y + dy };
      if (snapping) {
        const snapped = snapMove(newRect, ds.plan, tolerance);
        newRect = snapped.rect;
        guides.show(ds.slideIndex, snapped.guides, snapped.spacing);
      } else {
        guides.clear();
      }

    } else if (ds.handle === "rotate") {
      const angle = getPointerAngle(e.clientX, e.clientY);
      // atan2 flips sign at ±180. Measured against the angle the drag started
      // at, crossing that seam read as most of a turn in the wrong direction —
      // so anticlockwise past it snapped the element round instead of taking
      // the rotation negative. Each move now contributes the short way round.
      ds.turned += wrapAngle(angle - ds.lastAngle);
      ds.lastAngle = angle;
      newRect = { ...s, rotation: wrapAngle(s.rotation + ds.turned) };
      guides.clear();
      const box = containerRef.current?.getBoundingClientRect();
      setRotationBadge({
        left: box ? box.left + box.width / 2 : e.clientX,
        top: box ? box.bottom + 44 : e.clientY + 18,
        value: formatRotation(newRect.rotation),
      });

    } else {
      // The pointer travels in screen space; the box grows along its own axes.
      const cos = Math.cos(-s.rotation * DEG);
      const sin = Math.sin(-s.rotation * DEG);
      const ldx = dx * cos - dy * sin;
      const ldy = dx * sin + dy * cos;

      // Which way each axis grows for this handle, or 0 for an axis it leaves
      // alone. "ne" grows east and north, "s" only south, and so on.
      const h = ds.handle;
      const growX = h.includes("e") ? 1 : h.includes("w") ? -1 : 0;
      const growY = h.includes("s") ? 1 : h.includes("n") ? -1 : 0;
      if (!growX && !growY) return;

      const width = growX
        ? Math.max(MIN_SIZE, s.width + growX * ldx)
        : s.width;
      const height = growY
        ? Math.max(MIN_SIZE, s.height + growY * ldy)
        : s.height;

      // x/y are the *unrotated* top-left while the transform spins the box
      // about its centre, so "hold the far edge still" is a statement about
      // the centre, not about x/y. Moving x/y directly — as this did — held
      // the wrong edge once the element was rotated, and the box slid off at
      // an angle as it grew. The centre shifts by half the growth along the
      // element's own axes, turned back into screen space.
      const localCx = (growX * (width - s.width)) / 2;
      const localCy = (growY * (height - s.height)) / 2;
      const cosT = Math.cos(s.rotation * DEG);
      const sinT = Math.sin(s.rotation * DEG);
      const cx = s.x + s.width / 2 + (localCx * cosT - localCy * sinT);
      const cy = s.y + s.height / 2 + (localCx * sinT + localCy * cosT);

      newRect = {
        x: cx - width / 2,
        y: cy - height / 2,
        width,
        height,
        rotation: s.rotation,
      };

      if (snapping) {
        const snapped = snapResize(
          newRect,
          h as ResizeHandle,
          ds.plan,
          tolerance,
        );
        newRect = snapped.rect;
        guides.show(ds.slideIndex, snapped.guides, snapped.spacing);
      } else {
        guides.clear();
      }

      setSizeBadge({
        left: e.clientX + 14,
        top: e.clientY + 14,
        width: Math.round(newRect.width),
        height: Math.round(newRect.height),
      });
    }

    liveRect.current = newRect;
    applyRectToDOM(newRect);

  }, [applyRectToDOM, formatRotation, getPointerAngle, setChromeVisible, zoom]);

  const onPointerUp = useCallback((e?: React.PointerEvent) => {
    const readOnlyPress = readOnlyPressRef.current;
    if (readOnlyPress) {
      readOnlyPressRef.current = null;
      // Only a press that stayed put is a click; dragging across the element to
      // scroll or flip the page must not activate it.
      const strayed =
        !!e &&
        (Math.abs(e.clientX - readOnlyPress.x) > 4 ||
          Math.abs(e.clientY - readOnlyPress.y) > 4);
      if (!strayed) onElementClick?.();
      return;
    }

    const ds = dragState.current;
    if (!ds) return;
    const handle = lastHandleRef.current;
    const wasMove = movedRef.current;
    const el = containerRef.current;
    if (el) el.style.transition = "";
    dragState.current = null;
    lastHandleRef.current = null;
    setIsDragging(false);
    setChromeVisible(true);
    setRotationBadge(null);
    setSizeBadge(null);
    useSnapGuideStore.getState().clear();
    setGlobalCursor(null);

    if (handle === "drag" && (!wasMove || !ds.started)) {
      setIsTransforming(false);
      onElementClick?.();
      return;
    }

    if (handle === "rotate" && (!wasMove || !ds.started)) {
      setIsTransforming(false);
      return;
    }

    onChange(liveRect.current);
    requestAnimationFrame(() => {
      updateControlsPosition();
      setIsTransforming(false);
    });
  }, [onChange, onElementClick, setChromeVisible, setGlobalCursor, updateControlsPosition]);

  // The chrome scales with the element instead of the element having to stay
  // big enough for the chrome. Corners are always kept — with the side handles
  // gone they are the only way to grow a tiny element back, and the floating
  // move/rotate controls sit outside the element either way. All eight stay
  // mounted so a live drag can size and hide them without a re-render.
  const cornerSize = cornerSizeFor(rect.width, rect.height);
  // Keeps the handle tucked just inside the corner at every size (-3 at 10px).
  const cornerInset = -Math.round(cornerSize * 0.3);
  const corner = { width: cornerSize, height: cornerSize };
  const wideEnough = rect.width >= SIDE_HANDLE_MIN_EDGE ? "block" : "none";
  const tallEnough = rect.height >= SIDE_HANDLE_MIN_EDGE ? "block" : "none";

  const handles: { h: Handle; style: React.CSSProperties }[] = [
    { h: "nw", style: { top: cornerInset, left: cornerInset, ...corner, cursor: "nwse-resize" } },
    { h: "ne", style: { top: cornerInset, right: cornerInset, ...corner, cursor: "nesw-resize" } },
    { h: "sw", style: { bottom: cornerInset, left: cornerInset, ...corner, cursor: "nesw-resize" } },
    { h: "se", style: { bottom: cornerInset, right: cornerInset, ...corner, cursor: "nwse-resize" } },
    { h: "n", style: { top: -2, left: "50%", transform: "translateX(-50%)", width: 24, height: 6, cursor: "ns-resize", display: wideEnough } },
    { h: "s", style: { bottom: -2, left: "50%", transform: "translateX(-50%)", width: 24, height: 6, cursor: "ns-resize", display: wideEnough } },
    { h: "w", style: { left: -2, top: "50%", transform: "translateY(-50%)", width: 6, height: 20, cursor: "ew-resize", display: tallEnough } },
    { h: "e", style: { right: -2, top: "50%", transform: "translateY(-50%)", width: 6, height: 20, cursor: "ew-resize", display: tallEnough } },
  ];
  const showOutline = isSelected && !imageExportMode;
  const showControls = showOutline && !isMultiSelection && !isTransforming;
  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      onContainerChange?.(el);
    },
    [onContainerChange]
  );

  return (
    <div
      ref={setContainerRef}
      data-element="true"
      data-element-id={id}
      onPointerEnter={() => setIsHover(true)}
      onPointerLeave={() => setIsHover(false)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerDown={(e) => onPointerDown(e, "drag")}
      onDoubleClick={() => { if (!imageExportMode) onDoubleClick?.(); }}
      onContextMenu={onContextMenu}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        transform: `rotate(${rect.rotation}deg)`,
        transformOrigin: "center center",
        userSelect: allowTextSelection ? "text" : "none",
        touchAction: "none",
        cursor: isSelected ? "move" : "pointer",
        transition: isDragging ? "none" : undefined,
        overflow: "visible",
        // The /preview page wraps every element in a `pointer-events-none`
        // container (so empty page background doesn't intercept scroll/flip
        // gestures). Elements themselves must explicitly opt back in, or
        // clicks/drags never reach them at all — in the editor this is a
        // harmless no-op since there is no such ancestor.
        pointerEvents: "auto",
      }}
    >
      {isHover && !isSelected && !imageExportMode && (
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid var(--kd-accent)",
          pointerEvents: "none", zIndex: 9,
        }} />
      )}

      {showOutline && (
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid var(--kd-accent)",
          pointerEvents: "none", zIndex: 10,
        }} />
      )}

      <div
        ref={contentClipRef}
        style={{
          // With a bleed the layer is grown outwards and the same amount is
          // given back as padding, so the content box still measures exactly
          // the element's rect — children keep sizing off `100%` as before and
          // only the effect gets the extra room.
          position: effectBleed > 0 ? "absolute" : undefined,
          inset: effectBleed > 0 ? -effectBleed : undefined,
          padding: effectBleed > 0 ? effectBleed : undefined,
          boxSizing: "border-box",
          width: effectBleed > 0 ? undefined : "100%",
          height: effectBleed > 0 ? undefined : "100%",
          overflow: "hidden",
          // Clip only the rendered artwork to the page. The parent wrapper
          // remains unclipped so selection, dragging, resizing, and rotation
          // continue to work even when the element is outside the page.
          clipPath: getPageClipPath(clipRectFor(rect, effectBleed), clipBounds),
          WebkitClipPath: getPageClipPath(clipRectFor(rect, effectBleed), clipBounds),
        }}
      >
        {children}
      </div>

      {showControls && handles.map(({ h, style }) => (
        <div
          key={h}
          data-resize-handle={h}
          onPointerDown={(e) => onPointerDown(e, h)}
          style={{
            position: "absolute",
            background: "var(--kd-bg-surface)",
            border: "1px solid var(--kd-text)",
            borderRadius: isCorner(h) ? "50%" : 3,
            zIndex: 20,
            ...style,
          }}
        />
      ))}

      {showControls && controlsPos && typeof document !== "undefined" && createPortal(
        <div
          ref={quickControlsRef}
          data-element="true"
          data-transform-quick-controls="true"
          className="kd-transform-quick-controls"
          style={{
            top: controlsPos.top,
            left: controlsPos.left,
          }}
        >
          <button
            type="button"
            title="Rotate"
            className="kd-transform-control-btn kd-transform-control-btn-rotate"
            onPointerDown={(e) => {
              setChromeVisible(false);
              onPointerDown(e, "rotate");
            }}
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            title="Move"
            className="kd-transform-control-btn kd-transform-control-btn-move"
            onPointerDown={(e) => {
              setChromeVisible(false);
              onPointerDown(e, "drag");
            }}
          >
            <Move size={14} />
          </button>
        </div>,
        document.body
      )}
      {sizeBadge && typeof document !== "undefined" && createPortal(
        <div
          className="kd-transform-size-badge"
          style={{ left: sizeBadge.left, top: sizeBadge.top }}
        >
          w: {sizeBadge.width} h: {sizeBadge.height}
        </div>,
        document.body
      )}
      {rotationBadge && typeof document !== "undefined" && createPortal(
        <div
          className="kd-transform-rotation-badge"
          style={{
            left: rotationBadge.left,
            top: rotationBadge.top,
          }}
        >
          {rotationBadge.value}&deg;
        </div>,
        document.body
      )}
    </div>
  );
});

CanvasDragDrop.displayName = "CanvasDragDrop";
export default CanvasDragDrop;
