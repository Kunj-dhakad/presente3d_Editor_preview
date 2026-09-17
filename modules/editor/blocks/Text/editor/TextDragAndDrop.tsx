"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Move, RotateCcw } from "lucide-react";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import useEditorStore from "@editor/store/editorStore";
import { applyCopiedStyleIfActive } from "@editor/lib/styleClipboard";
import {
  getPageClipPath,
  PageClipBounds,
} from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import useSnapGuideStore from "@editor/store/useSnapGuideStore";
import {
  boundsOf,
  prepareSnap,
  snapMove,
  type SnapPlan,
} from "@editor/lib/canvas/snapping";

/** How close, in screen pixels, a line has to come before it snaps. */
const SNAP_TOLERANCE_PX = 6;

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "rotate";
type TransformKind = "drag" | "resize" | "rotate";

export type TextTransformRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type TransformMeta = {
  kind: TransformKind;
  handle: Handle | "drag";
};

interface Props {
  id: string;
  rect: TextTransformRect;
  isSelected: boolean;
  disabled?: boolean;
  imageExportMode?: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onElementClick?: () => void;
  onTransformStart?: (meta: TransformMeta) => void;
  onTransform?: (
    rect: TextTransformRect,
    meta: TransformMeta,
  ) => TextTransformRect | void;
  onTransformEnd: (rect: TextTransformRect, meta: TransformMeta) => void;
  onContainerChange?: (el: HTMLDivElement | null) => void;
  clipBounds?: PageClipBounds;
  children: React.ReactNode;
}

const DEG = Math.PI / 180;
const MIN_SIZE = 32;

const rotateVector = (x: number, y: number, rotation: number) => {
  const angle = rotation * DEG;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
};

const getFixedAnchor = (handle: Handle, width: number, height: number) => {
  switch (handle) {
    case "e":
      return { x: 0, y: height / 2 };
    case "w":
      return { x: width, y: height / 2 };
    case "se":
      return { x: 0, y: 0 };
    case "sw":
      return { x: width, y: 0 };
    case "ne":
      return { x: 0, y: height };
    case "nw":
      return { x: width, y: height };
    default:
      return { x: width / 2, y: height / 2 };
  }
};

const anchorResizeRect = (
  handle: Handle,
  snap: TextTransformRect,
  width: number,
  height: number,
): TextTransformRect => {
  const oldAnchor = getFixedAnchor(handle, snap.width, snap.height);
  const oldAnchorVector = rotateVector(
    oldAnchor.x - snap.width / 2,
    oldAnchor.y - snap.height / 2,
    snap.rotation,
  );
  const oldAnchorWorld = {
    x: snap.x + snap.width / 2 + oldAnchorVector.x,
    y: snap.y + snap.height / 2 + oldAnchorVector.y,
  };

  const newAnchor = getFixedAnchor(handle, width, height);
  const newAnchorVector = rotateVector(
    newAnchor.x - width / 2,
    newAnchor.y - height / 2,
    snap.rotation,
  );
  const newCenter = {
    x: oldAnchorWorld.x - newAnchorVector.x,
    y: oldAnchorWorld.y - newAnchorVector.y,
  };

  return {
    x: newCenter.x - width / 2,
    y: newCenter.y - height / 2,
    width,
    height,
    rotation: snap.rotation,
  };
};

const getKind = (handle: Handle | "drag"): TransformKind => {
  if (handle === "drag") return "drag";
  if (handle === "rotate") return "rotate";
  return "resize";
};

const getResizeCursor = (handle: Handle | "drag") => {
  if (handle === "nw") return "nw-resize";
  if (handle === "ne") return "ne-resize";
  if (handle === "sw") return "sw-resize";
  if (handle === "se") return "se-resize";
  if (handle === "w") return "w-resize";
  if (handle === "e") return "e-resize";
  if (handle === "n") return "n-resize";
  if (handle === "s") return "s-resize";
  if (handle === "rotate") return "grabbing";
  return "move";
};

const TextDragAndDrop: React.FC<Props> = memo(
  ({
    id,
    rect,
    isSelected,
    disabled = false,
    imageExportMode = false,
    onSelect,
    onElementClick,
    onTransformStart,
    onTransform,
    onTransformEnd,
    onContainerChange,
    clipBounds,
    children,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentClipRef = useRef<HTMLDivElement>(null);
    const quickControlsRef = useRef<HTMLDivElement>(null);
    const liveRect = useRef<TextTransformRect>({ ...rect });
    const dragState = useRef<{
      handle: Handle | "drag";
      startX: number;
      startY: number;
      startAngle: number;
      snap: TextTransformRect;
      started: boolean;
      wasSelected: boolean;
      /** Worked out once at the start — none of it moves meanwhile. */
      plan: SnapPlan;
      slideIndex: number;
    } | null>(null);
    const movedRef = useRef(false);
    const lastMetaRef = useRef<TransformMeta | null>(null);
    const hasGlobalCursorRef = useRef(false);
    const [isHover, setIsHover] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const [activeCursor, setActiveCursor] = useState<string | null>(null);
    const [controlsPos, setControlsPos] = useState<{
      left: number;
      top: number;
    } | null>(null);
    const [sizeBadge, setSizeBadge] = useState<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(null);
    const [rotationBadge, setRotationBadge] = useState<{
      left: number;
      top: number;
      value: number;
    } | null>(null);
    const zoom = useEditorUIStore((s) => s.MainCanvasScale);
    const selectedCount = useEditorStore((s) => s.selectedElementIds.length);
    const isMultiSelection = selectedCount > 1;

    const formatRotation = useCallback((rotation: number) => {
      const rounded = Math.round(rotation);
      return ((((rounded + 180) % 360) + 360) % 360) - 180;
    }, []);

    const updateControlsPosition = useCallback(() => {
      const el = containerRef.current;
      if (!el || !isSelected || disabled || imageExportMode) {
        setControlsPos(null);
        return;
      }
      const box = el.getBoundingClientRect();
      setControlsPos({
        left: box.left + box.width / 2,
        top: box.bottom + 12,
      });
    }, [disabled, imageExportMode, isSelected]);

    const setChromeVisible = useCallback((visible: boolean) => {
      if (quickControlsRef.current) {
        quickControlsRef.current.style.display = visible ? "flex" : "none";
      }
      document
        .querySelectorAll<HTMLElement>(".kd-text-toolbar")
        .forEach((el) => {
          el.style.display = visible ? "" : "none";
        });
    }, []);

    const setGlobalCursor = useCallback((cursor: string | null) => {
      if (typeof document === "undefined") return;
      if (cursor) {
        hasGlobalCursorRef.current = true;
        document.body.style.cursor = cursor;
        document.documentElement.style.cursor = cursor;
      } else {
        document.body.style.cursor = "";
        document.documentElement.style.cursor = "";
        hasGlobalCursorRef.current = false;
      }
    }, []);

    const lockCursor = useCallback(
      (cursor: string) => {
        setActiveCursor(cursor);
        setGlobalCursor(cursor);
      },
      [setGlobalCursor],
    );

    const unlockCursor = useCallback(() => {
      setActiveCursor(null);
      setGlobalCursor(null);
    }, [setGlobalCursor]);

    useEffect(() => {
      const clearCursor = () => unlockCursor();
      window.addEventListener("pointerup", clearCursor);
      window.addEventListener("pointercancel", clearCursor);
      window.addEventListener("blur", clearCursor);
      return () => {
        window.removeEventListener("pointerup", clearCursor);
        window.removeEventListener("pointercancel", clearCursor);
        window.removeEventListener("blur", clearCursor);
        clearCursor();
      };
    }, [unlockCursor]);

    useEffect(() => {
      const raf = requestAnimationFrame(updateControlsPosition);
      window.addEventListener("scroll", updateControlsPosition, true);
      window.addEventListener("resize", updateControlsPosition);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", updateControlsPosition, true);
        window.removeEventListener("resize", updateControlsPosition);
      };
    }, [
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      rect.rotation,
      updateControlsPosition,
      zoom,
    ]);

    const applyRectToDOM = useCallback(
      (next: TextTransformRect) => {
        const el = containerRef.current;
        if (!el) return;
        el.style.left = `${next.x}px`;
        el.style.top = `${next.y}px`;
        el.style.width = `${next.width}px`;
        el.style.height = `${next.height}px`;
        el.style.transform = `rotate(${next.rotation}deg)`;
        const clipPath = getPageClipPath(next, clipBounds) ?? "";
        if (contentClipRef.current) {
          contentClipRef.current.style.clipPath = clipPath;
          contentClipRef.current.style.setProperty(
            "-webkit-clip-path",
            clipPath,
          );
        }
      },
      [clipBounds],
    );

    const buildResizeRect = useCallback(
      (
        handle: Handle,
        snap: TextTransformRect,
        dx: number,
        dy: number,
      ): TextTransformRect => {
        const cos = Math.cos(-snap.rotation * DEG);
        const sin = Math.sin(-snap.rotation * DEG);
        const ldx = dx * cos - dy * sin;
        const ldy = dx * sin + dy * cos;

        let { width, height } = snap;

        switch (handle) {
          case "e":
            width = Math.max(MIN_SIZE, snap.width + ldx);
            break;
          case "w":
            width = Math.max(MIN_SIZE, snap.width - ldx);
            break;
          case "se":
          case "sw":
          case "ne":
          case "nw": {
            const widthScale = handle.includes("e")
              ? (snap.width + ldx) / snap.width
              : (snap.width - ldx) / snap.width;
            const heightScale = handle.includes("s")
              ? (snap.height + ldy) / snap.height
              : (snap.height - ldy) / snap.height;
            const rawScale =
              Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
                ? widthScale
                : heightScale;
            const minScale = Math.max(
              MIN_SIZE / snap.width,
              MIN_SIZE / snap.height,
            );
            const scale = Math.max(minScale, rawScale);
            width = snap.width * scale;
            height = snap.height * scale;
            break;
          }
          case "n":
          case "s":
            return snap;
        }

        return anchorResizeRect(handle, snap, width, height);
      },
      [],
    );

    const getPointerAngle = useCallback((clientX: number, clientY: number) => {
      const elRect = containerRef.current?.getBoundingClientRect();
      if (!elRect) return 0;
      const cx = elRect.left + elRect.width / 2;
      const cy = elRect.top + elRect.height / 2;
      return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
    }, []);

    const onPointerDown = useCallback(
      (e: React.PointerEvent, handle: Handle | "drag") => {
        if (disabled || imageExportMode) return;
        e.stopPropagation();
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
          setIsTransforming(true);
          setChromeVisible(false);
        }
        lockCursor(getResizeCursor(handle));

        const store = useEditorStore.getState();
        const slideIndex = store.activeSlide;
        const slide = store.slides[slideIndex];
        const plan = prepareSnap(
          (slide?.elements ?? [])
            .filter((other) => other.id !== id)
            .map((other) => boundsOf(other.data as unknown as TextTransformRect)),
          { width: slide?.width ?? 0, height: slide?.height ?? 0 },
        );

        liveRect.current = { ...rect };
        dragState.current = {
          handle,
          startX: e.clientX,
          startY: e.clientY,
          startAngle:
            handle === "rotate" ? getPointerAngle(e.clientX, e.clientY) : 0,
          snap: { ...rect },
          started: false,
          wasSelected: isSelected,
          plan,
          slideIndex,
        };
        movedRef.current = false;
        const meta = { kind: getKind(handle), handle };
        lastMetaRef.current = meta;
        if (meta.kind === "resize") {
          dragState.current.started = true;
          setChromeVisible(false);
          onTransformStart?.(meta);
        }
      },
      [
        disabled,
        getPointerAngle,
        id,
        imageExportMode,
        isSelected,
        lockCursor,
        onSelect,
        onTransformStart,
        rect,
        setChromeVisible,
      ],
    );

    const onPointerMove = useCallback(
      (e: React.PointerEvent) => {
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
        } else if (passedDragThreshold) {
          movedRef.current = true;
        }

        let next: TextTransformRect;
        const meta = lastMetaRef.current ?? {
          kind: getKind(ds.handle),
          handle: ds.handle,
        };
        if (meta.kind === "resize" || meta.kind === "rotate") {
          setGlobalCursor(getResizeCursor(ds.handle));
        }

        if (ds.handle === "drag") {
          next = { ...ds.snap, x: ds.snap.x + dx, y: ds.snap.y + dy };
          // Only a move snaps here. A text resize runs through
          // `buildResizeRect`, which scales the type with the box — pulling
          // that to an alignment would change the font size behind the
          // author's back, so it is left to the author's own hand.
          if (e.altKey) {
            useSnapGuideStore.getState().clear();
          } else {
            const snapped = snapMove(
              next,
              ds.plan,
              SNAP_TOLERANCE_PX / safeZoom,
            );
            next = snapped.rect;
            useSnapGuideStore
              .getState()
              .show(ds.slideIndex, snapped.guides, snapped.spacing);
          }
        } else if (ds.handle === "rotate") {
          const angle = getPointerAngle(e.clientX, e.clientY);
          next = {
            ...ds.snap,
            rotation: ds.snap.rotation + (angle - ds.startAngle),
          };
          const box = containerRef.current?.getBoundingClientRect();
          setRotationBadge({
            left: box ? box.left + box.width / 2 : e.clientX,
            top: box ? box.bottom + 44 : e.clientY + 18,
            value: formatRotation(next.rotation),
          });
        } else {
          next = buildResizeRect(ds.handle, ds.snap, dx, dy);
        }

        if (meta.kind === "resize") {
          const adjusted = onTransform?.(next, meta);
          if (adjusted) next = adjusted;
          setSizeBadge({
            left: e.clientX + 14,
            top: e.clientY + 14,
            width: Math.round(next.width),
            height: Math.round(next.height),
          });
        }
        liveRect.current = next;
        applyRectToDOM(next);
      },
      [
        applyRectToDOM,
        buildResizeRect,
        formatRotation,
        getPointerAngle,
        onTransform,
        setChromeVisible,
        setGlobalCursor,
        zoom,
      ],
    );

    const onPointerUp = useCallback(() => {
      const ds = dragState.current;
      if (!ds) return;

      const meta = lastMetaRef.current ?? {
        kind: getKind(ds.handle),
        handle: ds.handle,
      };
      const wasMove = movedRef.current;
      const el = containerRef.current;
      if (el) {
        el.style.transition = "";
      }
      dragState.current = null;
      lastMetaRef.current = null;
      setChromeVisible(true);
      setSizeBadge(null);
      setRotationBadge(null);
      useSnapGuideStore.getState().clear();
      unlockCursor();

      if (meta.kind === "drag" && (!wasMove || !ds.started)) {
        setIsTransforming(false);
        if (ds.wasSelected) onElementClick?.();
        return;
      }

      if (meta.kind === "rotate" && (!wasMove || !ds.started)) {
        setIsTransforming(false);
        return;
      }

      onTransformEnd(liveRect.current, meta);
      requestAnimationFrame(() => {
        updateControlsPosition();
        setIsTransforming(false);
      });
    }, [
      onElementClick,
      onTransformEnd,
      setChromeVisible,
      unlockCursor,
      updateControlsPosition,
    ]);

    const handles: { h: Handle; style: React.CSSProperties }[] = [
      { h: "nw", style: { cursor: getResizeCursor("nw") } },
      { h: "ne", style: { cursor: getResizeCursor("ne") } },
      { h: "sw", style: { cursor: getResizeCursor("sw") } },
      { h: "se", style: { cursor: getResizeCursor("se") } },
      { h: "w", style: { cursor: getResizeCursor("w") } },
      { h: "e", style: { cursor: getResizeCursor("e") } },
    ];

    const isCorner = (h: Handle) => ["nw", "ne", "sw", "se"].includes(h);
    const showOutline = isSelected && !imageExportMode;
    const showControls = showOutline && !disabled && !isMultiSelection;
    const showQuickControls = showControls && !isTransforming;
    const safeZoom = zoom || 1;
    const screenWidth = rect.width * safeZoom;
    const screenHeight = rect.height * safeZoom;
    const showCornerHandles = screenWidth >= 46 && screenHeight >= 26;
    const visibleHandles = handles.filter(
      ({ h }) => !isCorner(h) || showCornerHandles,
    );
    const cornerSize = 10 / safeZoom;
    const sideWidth = 6 / safeZoom;
    const sideHeight = Math.max(
      12 / safeZoom,
      Math.min(22 / safeZoom, rect.height - 4 / safeZoom),
    );

    const getHandleStyle = (
      h: Handle,
      cursor: React.CSSProperties["cursor"],
    ): React.CSSProperties => {
      if (isCorner(h)) {
        return {
          width: cornerSize,
          height: cornerSize,
          borderRadius: "50%",
          cursor,
          ...(h.includes("n")
            ? { top: -cornerSize / 2 }
            : { bottom: -cornerSize / 2 }),
          ...(h.includes("w")
            ? { left: -cornerSize / 2 }
            : { right: -cornerSize / 2 }),
        };
      }

      return {
        width: sideWidth,
        height: sideHeight,
        borderRadius: 999,
        cursor,
        top: "50%",
        transform: "translateY(-50%)",
        ...(h === "w" ? { left: -sideWidth / 2 } : { right: -sideWidth / 2 }),
      };
    };

    const setContainerRef = useCallback(
      (el: HTMLDivElement | null) => {
        containerRef.current = el;
        onContainerChange?.(el);
      },
      [onContainerChange],
    );

    return (
      <div
        ref={setContainerRef}
        data-element="true"
        data-element-id={id}
        data-text-transform-box="true"
        onPointerEnter={() => setIsHover(true)}
        onPointerLeave={() => setIsHover(false)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={(e) => onPointerDown(e, "drag")}
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          transform: `rotate(${rect.rotation}deg)`,
          transformOrigin: "center center",
          userSelect: disabled ? "text" : "none",
          touchAction: "none",
          cursor:
            activeCursor ??
            (disabled ? "text" : isSelected ? "move" : "pointer"),
          overflow: "visible",
        }}
      >
        {isHover && !isSelected && !imageExportMode && !disabled && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid var(--kd-accent)",
              pointerEvents: "none",
              zIndex: 9,
            }}
          />
        )}

        {showOutline && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "2px solid var(--kd-accent)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}

        <div
          ref={contentClipRef}
          style={{
            width: "100%",
            height: "100%",
            overflow: "visible",
            clipPath: getPageClipPath(rect, clipBounds),
            WebkitClipPath: getPageClipPath(rect, clipBounds),
          }}
        >
          {children}
        </div>

        {showControls &&
          visibleHandles.map(({ h, style }) => (
            <div
              key={h}
              data-text-resize-handle={h}
              onPointerDown={(e) => onPointerDown(e, h)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                ...getHandleStyle(h, style.cursor),
                cursor: style.cursor,
                background: "var(--kd-bg-surface)",
                border: "1px solid var(--kd-accent)",
                boxShadow: "0 1px 4px var(--kd-shadow-color)",
                pointerEvents: "auto",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                zIndex: 30,
              }}
            />
          ))}

        {showQuickControls &&
          controlsPos &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={quickControlsRef}
              data-element="true"
              data-text-quick-controls="true"
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
            document.body,
          )}
        {rotationBadge &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="kd-transform-rotation-badge"
              style={{
                left: rotationBadge.left,
                top: rotationBadge.top,
              }}
            >
              {rotationBadge.value}&deg;
            </div>,
            document.body,
          )}
        {sizeBadge &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="kd-transform-size-badge"
              style={{
                left: sizeBadge.left,
                top: sizeBadge.top,
              }}
            >
              w: {sizeBadge.width} h: {sizeBadge.height}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

TextDragAndDrop.displayName = "TextDragAndDrop";
export default TextDragAndDrop;
