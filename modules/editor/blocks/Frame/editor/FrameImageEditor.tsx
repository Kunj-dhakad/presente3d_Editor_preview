"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Move } from "lucide-react";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import type { FrameData } from "@editor/store/editorStore";
import { clampOffset, clampScale, frameImageRoom, type NaturalSize } from "../frames";

const DEG = Math.PI / 180;

export type FramePatch = {
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
};

/**
 * Adjusting the picture inside a frame, with the frame itself held still.
 *
 * Sits over the frame and takes the pointer, so the drag layer underneath
 * never sees the gesture — which is what keeps the frame from travelling with
 * the image. Pan is written back as a fraction of the available overflow, so
 * it cannot produce a gap at the edge of the mask no matter how far it is
 * pushed, and it stays right if the frame is later resized.
 */
const FrameImageEditor: React.FC<{
  id: string;
  frame: FrameData;
  natural: NaturalSize | null;
  onChange: (patch: FramePatch, history?: boolean) => void;
}> = ({ id, frame, natural, onChange }) => {
  const setFrameEditElementId = useEditorUIStore((s) => s.setFrameEditElementId);
  const zoom = useEditorUIStore((s) => s.MainCanvasScale) || 1;
  const drag = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const exit = useCallback(
    () => setFrameEditElementId(null),
    [setFrameEditElementId],
  );

  // The rest of the editor leaves a mode on Escape, and a click anywhere else
  // is the other thing people try; supporting neither would strand them here.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exit();
    };
    const onDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) exit();
    };
    window.addEventListener("keydown", onKey);
    // Deferred to the capture-free bubble phase of the *next* tick so the click
    // that opened this mode does not immediately close it again.
    const timer = window.setTimeout(
      () => document.addEventListener("pointerdown", onDown),
      0,
    );
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [exit]);

  /**
   * Pixels of travel in each direction: the crop cover sizing already applied,
   * plus whatever the zoom has added on top.
   */
  const room = () => frameImageRoom(frame, frame, natural);

  const onPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: clampOffset(frame.imageOffsetX),
      offsetY: clampOffset(frame.imageOffsetY),
    };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const available = room();
    if (available.x === 0 && available.y === 0) return;

    // Screen travel, unscaled by the canvas zoom and turned back into the
    // frame's own axes so a rotated frame still pans the way it looks.
    const dx = (event.clientX - state.startX) / zoom;
    const dy = (event.clientY - state.startY) / zoom;
    const angle = -(frame.rotation ?? 0) * DEG;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

    onChange({
      imageOffsetX: available.x
        ? clampOffset(state.offsetX + localX / available.x)
        : 0,
      imageOffsetY: available.y
        ? clampOffset(state.offsetY + localY / available.y)
        : 0,
    });
  };

  const endDrag = (event: React.PointerEvent) => {
    setDragging(false);
    if (!drag.current) return;
    drag.current = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    // One history entry for the whole gesture, not one per pointer move.
    onChange({}, true);
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onChange({ imageScale: clampScale(clampScale(frame.imageScale) - event.deltaY * 0.002) });
  };

  return (
    <div
      ref={hostRef}
      data-element="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      style={{
        position: "absolute",
        inset: 0,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        boxShadow: "inset 0 0 0 2px var(--kd-accent)",
      }}
      title="Drag to move the picture, scroll to zoom"
      aria-label={`Adjust image inside frame ${id}`}
    >
      {/* The thirds grid is what makes this read as positioning rather than as
          a stuck element: the picture moves under a reference that does not.
          Drawn light over dark so it survives whatever it is laid across. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.75,
          backgroundImage: [
            "linear-gradient(to right, transparent calc(33.333% - 0.5px), var(--kd-on-media) calc(33.333% - 0.5px), var(--kd-on-media) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px))",
            "linear-gradient(to right, transparent calc(66.666% - 0.5px), var(--kd-on-media) calc(66.666% - 0.5px), var(--kd-on-media) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px))",
            "linear-gradient(to bottom, transparent calc(33.333% - 0.5px), var(--kd-on-media) calc(33.333% - 0.5px), var(--kd-on-media) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px))",
            "linear-gradient(to bottom, transparent calc(66.666% - 0.5px), var(--kd-on-media) calc(66.666% - 0.5px), var(--kd-on-media) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px))",
          ].join(","),
          filter: "drop-shadow(0 0 1px var(--kd-scrim))",
        }}
      />

      {/* Fades out the moment the picture starts moving — by then it has said
          what it had to say and is only in the way. */}
      {!dragging && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 8,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            maxWidth: "92%",
            padding: "4px 9px",
            borderRadius: 999,
            background: "var(--kd-scrim)",
            color: "var(--kd-text-inverse)",
            fontFamily: "var(--kd-font)",
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
          }}
        >
          <Move size={11} /> Drag to reposition · scroll to zoom
        </div>
      )}
    </div>
  );
};

export default FrameImageEditor;
