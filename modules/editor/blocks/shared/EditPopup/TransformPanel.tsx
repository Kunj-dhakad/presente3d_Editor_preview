"use client";
import React from "react";
import { useAnchoredPopup } from "./useAnchoredPopup";
import PopupShell from "./PopupShell";
import { PanelProps, patchOf } from "./types";

const POPUP_WIDTH = 248;
const ANGLES = [0, 90, 180, 270];

function TransformPanel<T extends { rotation?: number }>({
  data,
  updateButton,
  targetRef,
  onClose,
}: PanelProps<T>) {
  const { pos, mounted, popupRef } = useAnchoredPopup(targetRef, onClose, {
    width: POPUP_WIDTH,
  });

  const rotation = data.rotation ?? 0;
  const rotate = (delta: number) =>
    updateButton(patchOf<T>({ rotation: (rotation + delta + 360) % 360 }));

  return (
    <PopupShell
      popupRef={popupRef}
      pos={pos}
      mounted={mounted}
      width={POPUP_WIDTH}
      boxClassName="p-2.5 flex flex-col gap-0.5"
    >
      <span className="kd-fg-subtle text-[11px] font-medium uppercase tracking-widest px-1 pt-1 pb-0.5">
        Rotate
      </span>

      <button
        className="kd-btn-ghost flex items-center gap-2.5 px-2 py-1.5 text-sm w-full text-left"
        onClick={() => rotate(-90)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span className="flex-1">Rotate left</span>
        <span className="kd-fg-subtle text-xs">−90°</span>
      </button>

      <button
        className="kd-btn-ghost flex items-center gap-2.5 px-2 py-1.5 text-sm w-full text-left"
        onClick={() => rotate(90)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        <span className="flex-1">Rotate right</span>
        <span className="kd-fg-subtle text-xs">+90°</span>
      </button>

      <div className="flex gap-1 px-1 pb-1 pt-0.5">
        {ANGLES.map((a) => (
          <button
            key={a}
            onClick={() => updateButton(patchOf<T>({ rotation: a }))}
            data-active={rotation === a}
            className="kd-chip flex-1 py-1 text-xs font-medium"
          >
            {a}°
          </button>
        ))}
      </div>
    </PopupShell>
  );
}

export default TransformPanel;
