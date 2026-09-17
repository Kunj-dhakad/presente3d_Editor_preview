"use client";
import React from "react";
import { useAnchoredPopup } from "./useAnchoredPopup";
import PopupShell from "./PopupShell";
import { PanelProps, patchOf } from "./types";

const POPUP_WIDTH = 296;
const CORNER_PRESETS = [0, 10, 25, 50];

function BorderRadiusPanel<T extends { borderRadius?: string | number }>({
  targetRef,
  data,
  updateButton,
  onClose,
}: PanelProps<T>) {
  const { pos, mounted, popupRef } = useAnchoredPopup(targetRef, onClose, {
    width: POPUP_WIDTH,
    minLeft: 8,
  });

  const radiusNum = parseInt(String(data.borderRadius ?? "0%")) || 0;
  const setRadius = (pct: number | string) =>
    updateButton(patchOf<T>({ borderRadius: `${pct}%` }));

  return (
    <PopupShell
      popupRef={popupRef}
      pos={pos}
      mounted={mounted}
      boxClassName="w-[296px] flex flex-col overflow-hidden"
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <span className="kd-field-label">Radius</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={radiusNum}
              onChange={(e) => setRadius(e.target.value)}
              className="kd-range flex-1"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={50}
                value={radiusNum}
                onChange={(e) => setRadius(e.target.value)}
                className="kd-input w-12 px-1.5 py-1 text-xs text-center"
              />
              <span className="kd-fg-subtle text-[11px]">%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {CORNER_PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              data-active={radiusNum === r}
              className="kd-chip flex-1 py-1.5 text-[11px] font-medium"
            >
              {r === 0 ? "▪ 0" : r === 50 ? "● 50" : `${r}%`}
            </button>
          ))}
        </div>
      </div>
    </PopupShell>
  );
}

export default BorderRadiusPanel;
