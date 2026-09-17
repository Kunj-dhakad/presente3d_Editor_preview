"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import useEditorStore from "@editor/store/editorStore";

export type CanvasPreset = {
  label: string;
  width: number;
  height: number;
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { label: "Portrait",     width: 346,  height: 490  },
  { label: "Landscape",    width: 690,  height: 388  },
  { label: "Square",       width: 490,  height: 490  },
  { label: "Story (9:16)", width: 346,  height: 615  },
  { label: "Wide (16:9)",  width: 853,  height: 480  },
  { label: "Custom",       width: 0,    height: 0    },
];

export default function CanvasSizeSelector() {
  const [open, setOpen]           = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom]       = useState({ w: "", h: "" });
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const triggerRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateAllSlidesSize = useEditorStore((s) => s.updateAllSlidesSize);
  const currentWidth  = useEditorStore((s) => s.slides[0]?.width  ?? 346);
  const currentHeight = useEditorStore((s) => s.slides[0]?.height ?? 490);

  const currentLabel =
    CANVAS_PRESETS.find(
      (p) => p.width === currentWidth && p.height === currentHeight
    )?.label ?? "Custom";

  // Calculate dropdown position from trigger button
  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top:  rect.bottom + 6,
        left: rect.left,
      });
    }
    setOpen(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (preset: CanvasPreset) => {
    if (preset.label === "Custom") {
      setShowCustom(true);
      return;
    }
    updateAllSlidesSize(preset.width, preset.height);
    setOpen(false);
    setShowCustom(false);
  };

  const handleCustomApply = () => {
    const w = parseInt(custom.w);
    const h = parseInt(custom.h);
    if (w > 0 && h > 0) {
      updateAllSlidesSize(w, h);
      setOpen(false);
      setShowCustom(false);
      setCustom({ w: "", h: "" });
    }
  };

  // Ratio box helper
  const getRatioBox = (width: number, height: number, isActive: boolean) => {
    const maxW = 28, maxH = 20;
    let boxW = maxW, boxH = maxH;
    if (width > 0 && height > 0) {
      const ratio = width / height;
      if (ratio > maxW / maxH) boxH = Math.round(maxW / ratio);
      else boxW = Math.round(maxH * ratio);
    }
    return (
      <div
        className="flex  kd-text-secondary items-center justify-center shrink-0"
        style={{ width: maxW, height: maxH }}
      >
        {width > 0 ? (
          <div
            style={{
              width: boxW,
              height: boxH,
              border: `1.5px solid ${isActive ? "currentColor" : "var(--kd-border-subtle)"}`,
              borderRadius: 2,
              opacity: isActive ? 1 : 0.6,
            }}
          />
        ) : (
          <span className="text-sm">✏️</span>
        )}
      </div>
    );
  };

  const dropdown = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top:  dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 99999,
            minWidth: 240,
          }}
          className="rounded-xl shadow-2xl kd-left-sidebar border p-1.5"
        >
          {CANVAS_PRESETS.map((preset) => {
            const isActive =
              preset.width === currentWidth && preset.height === currentHeight;

            return (
              <button
                key={preset.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(preset);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-sm text-left transition-all cursor-pointer
                            ${isActive
                              ? "kd-slide-preview-active"
                              : "hover:kd-slide-preview"
                            }`}
              >
                {getRatioBox(preset.width, preset.height, isActive)}

                <div className="flex-1">
                  <div className="font-medium">{preset.label}</div>
                  {preset.width > 0 && (
                    <div className="text-xs opacity-50">
                      {preset.width} × {preset.height} px
                    </div>
                  )}
                </div>

                {isActive && (
                  <span className="kd-fg-success text-sm ml-auto">✓</span>
                )}
              </button>
            );
          })}

          {/* Custom size inputs */}
          {showCustom && (
            <div className="mt-1 pt-2 border-t kd-bd-inverse px-2 pb-1">
              <p className="text-xs opacity-50 mb-1.5 px-1">Custom size (px)</p>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Width"
                  value={custom.w}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, w: e.target.value }))
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  className="kd-input-inverse w-full px-2 py-1.5 text-sm"
                />
                <span className="opacity-40 shrink-0">×</span>
                <input
                  type="number"
                  placeholder="Height"
                  value={custom.h}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, h: e.target.value }))
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  className="kd-input-inverse w-full px-2 py-1.5 text-sm"
                />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCustomApply();
                  }}
                  className="kd-btn px-3 py-1.5 text-xs rounded shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className="kd-btn flex items-center gap-2 px-3 py-1.5 text-sm"
      >
        <span>{currentLabel}</span>
        <span className="text-xs opacity-60">
          {currentWidth}×{currentHeight}
        </span>
        <span className="text-xs">{open ? "▴" : "▾"}</span>
      </button>

      {dropdown}
    </div>
  );
}