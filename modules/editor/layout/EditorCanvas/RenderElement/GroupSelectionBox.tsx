"use client";

import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, { ElementType } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import FloatingToolBar from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/FloatingToolBar";
import { applyCopiedStyleToElementsIfActive } from "@editor/lib/styleClipboard";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "drag";

const MIN_GROUP_SIZE = 20;
const HANDLE_SIZE = 12;
const TEXT_BOX_PADDING = 6;

const getTextScale = (handle: Handle, bounds: Bounds, dx: number, dy: number) => {
  if (handle === "drag") return 1;
  const xScale =
    handle.includes("e") ? (bounds.width + dx) / bounds.width :
      handle.includes("w") ? (bounds.width - dx) / bounds.width :
        Number.NaN;
  const yScale =
    handle.includes("s") ? (bounds.height + dy) / bounds.height :
      handle.includes("n") ? (bounds.height - dy) / bounds.height :
        Number.NaN;

  const candidates = [xScale, yScale].filter((value) => Number.isFinite(value));
  const rawScale = candidates.length
    ? candidates.reduce((best, value) => Math.abs(value - 1) > Math.abs(best - 1) ? value : best, candidates[0])
    : 1;
  const minScale = Math.max(MIN_GROUP_SIZE / bounds.width, MIN_GROUP_SIZE / bounds.height);
  return Math.max(minScale, rawScale);
};

const getScaledBounds = (handle: Handle, bounds: Bounds, scale: number): Bounds => {
  const nextWidth = bounds.width * scale;
  const nextHeight = bounds.height * scale;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  let x = centerX - nextWidth / 2;
  let y = centerY - nextHeight / 2;

  if (handle.includes("w")) x = bounds.x + bounds.width - nextWidth;
  if (handle.includes("e")) x = bounds.x;
  if (handle.includes("n")) y = bounds.y + bounds.height - nextHeight;
  if (handle.includes("s")) y = bounds.y;

  return { x, y, width: nextWidth, height: nextHeight };
};

const getElementBounds = (el: ElementType): Bounds & { rotation: number } => {
  const { x, y, width, height, rotation = 0 } = el.data;
  if (el.data.type === "text") {
    return {
      x: x - TEXT_BOX_PADDING,
      y: y - TEXT_BOX_PADDING,
      width: width + TEXT_BOX_PADDING * 2,
      height: height + TEXT_BOX_PADDING * 2,
      rotation,
    };
  }
  return { x, y, width, height, rotation };
};

const getRotatedBounds = (el: ElementType): Bounds => {
  const { x, y, width, height, rotation } = getElementBounds(el);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });

  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
};

const getGroupBounds = (elements: ElementType[]): Bounds | null => {
  if (elements.length < 2) return null;
  const bounds = elements.map(getRotatedBounds);
  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width));
  const maxY = Math.max(...bounds.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const GroupSelectionBox: React.FC<{ slideIndex: number }> = memo(({ slideIndex }) => {
  // Rendered once per slide. `selectedElementIds` is re-created on every
  // selection change and the whole slide object changes on every element edit,
  // so both needed narrowing to stop N re-renders per store write.
  const selectedIds = useEditorStore(useShallow((s) => s.selectedElementIds));
  const slideElements = useEditorStore((s) => s.slides[slideIndex]?.elements);
  const updateElement = useEditorStore((s) => s.updateElement);
  const pushToHistory = useEditorStore((s) => s.pushToHistory);
  const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
  const zoom = useEditorUIStore((s) => s.MainCanvasScale);
  const [dragBounds, setDragBounds] = useState<Bounds | null>(null);
  const [groupEl, setGroupEl] = useState<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    bounds: Bounds;
    starts: Record<string, {
      x: number;
      y: number;
      width: number;
      height: number;
      dataX: number;
      dataY: number;
      dataWidth: number;
      dataHeight: number;
      fontSize?: number;
    }>;
    moved: boolean;
    dx: number;
    dy: number;
    nextBounds: Bounds;
  } | null>(null);

  const selectedElements = useMemo(() => {
    if (!slideElements || selectedIds.length < 2) return [];
    const selected = new Set(selectedIds);
    return slideElements.filter((el) => selected.has(el.id));
  }, [selectedIds, slideElements]);

  const bounds = useMemo(() => getGroupBounds(selectedElements), [selectedElements]);
  const currentBounds = dragBounds ?? bounds;

  const applyLiveTransform = useCallback((nextBounds: Bounds) => {
    const ds = dragRef.current;
    if (!ds) return;
    const sx = ds.bounds.width > 0 ? nextBounds.width / ds.bounds.width : 1;
    const sy = ds.bounds.height > 0 ? nextBounds.height / ds.bounds.height : 1;
    const fontScale = Math.max(sx, sy);
    selectedElements.forEach((el) => {
      const start = ds.starts[el.id];
      const node = document.querySelector<HTMLElement>(`[data-element-id="${el.id}"]`);
      if (!start || !node) return;
      const next = {
        x: nextBounds.x + (start.x - ds.bounds.x) * sx,
        y: nextBounds.y + (start.y - ds.bounds.y) * sy,
        width: Math.max(1, start.width * sx),
        height: Math.max(1, start.height * sy),
      };
      node.style.left = `${next.x}px`;
      node.style.top = `${next.y}px`;
      node.style.width = `${next.width}px`;
      node.style.height = `${next.height}px`;
      if (start.fontSize && Number.isFinite(start.fontSize) && fontScale > 0) {
        const nextFontSize = Math.max(4, start.fontSize * fontScale);
        node.style.fontSize = `${nextFontSize}px`;
        node.querySelectorAll<HTMLElement>("div, span").forEach((child) => {
          child.style.fontSize = `${nextFontSize}px`;
        });
      }
    });
  }, [selectedElements]);

  const getNextBounds = useCallback((handle: Handle, startBounds: Bounds, dx: number, dy: number): Bounds => {
    if (handle === "drag") {
      return { ...startBounds, x: startBounds.x + dx, y: startBounds.y + dy };
    }

    return getScaledBounds(handle, startBounds, getTextScale(handle, startBounds, dx, dy));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, handle: Handle = "drag") => {
    if (!bounds || imageExportMode) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.button === 0 && applyCopiedStyleToElementsIfActive(selectedIds)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      bounds,
      starts: Object.fromEntries(selectedElements.map((el) => [
        el.id,
        (() => {
          const elementBounds = getElementBounds(el);
          return {
          x: elementBounds.x,
          y: elementBounds.y,
          width: elementBounds.width,
          height: elementBounds.height,
          dataX: el.data.x,
          dataY: el.data.y,
          dataWidth: el.data.width,
          dataHeight: el.data.height,
          fontSize: el.data.type === "text" || el.data.type === "button" || el.data.type === "watermark"
            ? Number(el.data.fontSize)
            : undefined,
          };
        })(),
      ])),
      moved: false,
      dx: 0,
      dy: 0,
      nextBounds: bounds,
    };
  }, [bounds, imageExportMode, selectedElements, selectedIds]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragRef.current;
    if (!ds) return;
    const safeZoom = zoom || 1;
    const rawDx = e.clientX - ds.startX;
    const rawDy = e.clientY - ds.startY;
    const dx = rawDx / safeZoom;
    const dy = rawDy / safeZoom;
    if (Math.abs(rawDx) > 2 || Math.abs(rawDy) > 2) ds.moved = true;
    ds.dx = dx;
    ds.dy = dy;
    const nextBounds = getNextBounds(ds.handle, ds.bounds, dx, dy);
    ds.nextBounds = nextBounds;
    setDragBounds(nextBounds);
    applyLiveTransform(nextBounds);
  }, [applyLiveTransform, getNextBounds, zoom]);

  const handlePointerUp = useCallback(() => {
    const ds = dragRef.current;
    if (!ds) return;
    dragRef.current = null;
    setDragBounds(null);
    if (!ds.moved) return;
    pushToHistory();
    const sx = ds.bounds.width > 0 ? ds.nextBounds.width / ds.bounds.width : 1;
    const scale = sx;
    selectedElements.forEach((el) => {
      const start = ds.starts[el.id];
      if (!start) return;
      const nextVisual = {
        x: ds.nextBounds.x + (start.x - ds.bounds.x) * scale,
        y: ds.nextBounds.y + (start.y - ds.bounds.y) * scale,
        width: Math.max(1, start.width * scale),
        height: Math.max(1, start.height * scale),
      };
      const patch: Partial<ElementType["data"]> = {
        x: el.data.type === "text" ? nextVisual.x + TEXT_BOX_PADDING : nextVisual.x,
        y: el.data.type === "text" ? nextVisual.y + TEXT_BOX_PADDING : nextVisual.y,
        width: el.data.type === "text" ? Math.max(1, nextVisual.width - TEXT_BOX_PADDING * 2) : nextVisual.width,
        height: el.data.type === "text" ? Math.max(1, nextVisual.height - TEXT_BOX_PADDING * 2) : nextVisual.height,
      };
      if (start.fontSize && Number.isFinite(start.fontSize) && scale > 0) {
        Object.assign(patch, { fontSize: Math.max(4, Math.round(start.fontSize * scale)) });
      }
      updateElement(el.id, patch);
    });
  }, [pushToHistory, selectedElements, updateElement]);

  if (!currentBounds || imageExportMode) return null;

  return (
    <>
      <div
        ref={setGroupEl}
        data-element="true"
        data-group-selection="true"
        onPointerDown={(e) => handlePointerDown(e, "drag")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "absolute",
          left: currentBounds.x,
          top: currentBounds.y,
          width: currentBounds.width,
          height: currentBounds.height,
          border: "2px dotted var(--kd-accent)",
          background: "transparent",
          boxSizing: "border-box",
          cursor: "move",
          zIndex: 9999,
          touchAction: "none",
        }}
      >
        {([
          ["nw", { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: "nwse-resize" }],
          ["ne", { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: "nesw-resize" }],
          ["sw", { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: "nesw-resize" }],
          ["se", { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: "nwse-resize" }],
          ["n", { top: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" }],
          ["s", { bottom: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" }],
          ["w", { left: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" }],
          ["e", { right: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" }],
        ] as [Handle, React.CSSProperties][]).map(([handle, style]) => (
          <div
            key={handle}
            onPointerDown={(e) => handlePointerDown(e, handle)}
            style={{
              position: "absolute",
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              borderRadius: "50%",
              background: "var(--kd-bg-surface)",
              border: "1px solid var(--kd-accent)",
              boxShadow: "0 1px 4px var(--kd-shadow-color)",
              zIndex: 1,
              ...style,
            }}
          />
        ))}
      </div>
      <FloatingToolBar target={groupEl} />
    </>
  );
});

GroupSelectionBox.displayName = "GroupSelectionBox";
export default GroupSelectionBox;
