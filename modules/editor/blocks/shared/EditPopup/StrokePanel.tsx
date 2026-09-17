"use client";
import React from "react";
import { useAnchoredPopup } from "./useAnchoredPopup";
import PopupShell from "./PopupShell";
import { PanelProps, patchOf } from "./types";

const POPUP_WIDTH = 296;

interface StrokeData {
  strokeWidth?: number;
  strokeStyle?: string;
  /** Buttons apni border width `borderWidth` me rakhte hain. */
  borderWidth?: number;
}

interface Props<T extends StrokeData> extends PanelProps<T> {
  /**
   * Buttons ki width `borderWidth` me store hoti hai, baaki sab ki
   * `strokeWidth` me. Purane saved buttons ke liye legacy fallback
   * bhi isi flag se chalta hai.
   */
  widthKey?: "strokeWidth" | "borderWidth";
  /**
   * Teesre dash preset ka naam block ke hisaab se badalta hai —
   * Video use karta hai "semi-dashed", baaki "inset".
   */
  midStyle?: { id: string; label: string };
}

function StrokePanel<T extends StrokeData>({
  targetRef,
  data,
  updateButton,
  onClose,
  widthKey = "strokeWidth",
  midStyle = { id: "inset", label: "Inset" },
}: Props<T>) {
  const { pos, mounted, popupRef } = useAnchoredPopup(targetRef, onClose, {
    width: POPUP_WIDTH,
    minLeft: 8,
  });

  const strokeStyles = [
    { id: "none", label: "None", dash: null },
    { id: "solid", label: "Solid", dash: "none" },
    { id: "dashed", label: "Dashed", dash: "8 4" },
    { id: midStyle.id, label: midStyle.label, dash: "12 6" },
    { id: "dotted", label: "Dotted", dash: "2 4" },
  ];

  const strokeWidth =
    widthKey === "borderWidth"
      ? data.borderWidth ?? data.strokeWidth ?? 0
      : data.strokeWidth ?? 0;
  const strokeStyle = strokeWidth > 0 ? data.strokeStyle ?? "solid" : "none";

  const setWidth = (px: number) => updateButton(patchOf<T>({ [widthKey]: px }));

  return (
    <PopupShell
      popupRef={popupRef}
      pos={pos}
      mounted={mounted}
      boxClassName="w-[296px] flex flex-col overflow-hidden"
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <span className="kd-field-label">Style</span>
          <div className="flex gap-1">
            {strokeStyles.map((s) => (
              <button
                key={s.id}
                title={s.label}
                onClick={() =>
                  updateButton(
                    s.id === "none"
                      ? patchOf<T>({ strokeStyle: undefined, [widthKey]: 0 })
                      : patchOf<T>({ strokeStyle: s.id }),
                  )
                }
                data-active={strokeStyle === s.id}
                className="kd-chip flex-1 h-9 flex flex-col items-center justify-center"
              >
                {s.id === "none" ? (
                  <svg width="22" height="14" viewBox="0 0 22 14">
                    <line x1="2" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3" y1="3" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="22" height="14" viewBox="0 0 22 14">
                    <line
                      x1="2" y1="7" x2="20" y2="7"
                      stroke="currentColor" strokeWidth="2"
                      strokeDasharray={s.dash === "none" ? undefined : s.dash ?? undefined}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="kd-field-label">Weight</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={strokeWidth}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="kd-range flex-1"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={20}
                value={strokeWidth}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="kd-input w-12 px-1.5 py-1 text-xs text-center"
              />
              <span className="kd-fg-subtle text-[11px]">px</span>
            </div>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

export default StrokePanel;
