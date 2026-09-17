"use client";
import React, { useState } from "react";
import { useThrottledCommit } from "@editor/lib/hooks/useThrottledCommit";
import { useAnchoredPopup } from "./useAnchoredPopup";
import PopupShell from "./PopupShell";
import { PanelProps, patchOf } from "./types";

const POPUP_WIDTH = 248;
const PRESETS = [100, 75, 50, 25];

function OpacityPanel<T extends { opacity?: number }>({
  data,
  updateButton,
  targetRef,
  onClose,
}: PanelProps<T>) {
  const { pos, mounted, popupRef } = useAnchoredPopup(targetRef, onClose, {
    width: POPUP_WIDTH,
  });

  // opacity 0–1 store me, UI 0–100 dikhata hai
  const opacityPct = Math.round((data.opacity ?? 1) * 100);
  const [inputVal, setInputVal] = useState<string>(String(opacityPct));

  // Slider drag pehle har pixel par store likhta tha aur canvas dobara
  // render hota tha. Thumb local state se chalta hai, commit throttled
  // hai, aur aakhri value release par flush hoti hai.
  const {
    liveValue: sliderPct,
    change: sliderChange,
    release: sliderRelease,
  } = useThrottledCommit(opacityPct, (pct: number) => {
    updateButton(patchOf<T>({ opacity: Math.min(100, Math.max(0, pct)) / 100 }));
  });

  const commitPct = (pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    updateButton(patchOf<T>({ opacity: clamped / 100 }));
    setInputVal(String(clamped));
  };

  const handleInputBlur = () => {
    commitPct(inputVal === "" ? 100 : Number(inputVal));
  };

  return (
    <PopupShell
      popupRef={popupRef}
      pos={pos}
      mounted={mounted}
      width={POPUP_WIDTH}
      boxClassName="px-3 pt-3 pb-2.5 flex flex-col gap-2.5"
    >
      <span className="kd-field-label text-xs font-semibold tracking-wide uppercase">
        Transparency
      </span>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderPct}
          onChange={(e) => {
            setInputVal(e.target.value);
            sliderChange(Number(e.target.value));
          }}
          onPointerUp={sliderRelease}
          onKeyUp={sliderRelease}
          className="kd-range flex-1 h-1.5 cursor-pointer"
        />

        <input
          type="text"
          inputMode="numeric"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleInputBlur();
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowUp") commitPct(Math.min(100, opacityPct + 1));
            if (e.key === "ArrowDown") commitPct(Math.max(0, opacityPct - 1));
          }}
          maxLength={3}
          className="kd-input w-12 px-1.5 py-1 text-xs text-center font-medium"
        />
      </div>

      <div className="flex gap-1">
        {PRESETS.map((pct) => (
          <button
            key={pct}
            onClick={() => commitPct(pct)}
            data-active={opacityPct === pct}
            className="kd-chip flex-1 py-1 text-[11px] font-medium"
          >
            {pct}%
          </button>
        ))}
      </div>
    </PopupShell>
  );
}

export default OpacityPanel;
