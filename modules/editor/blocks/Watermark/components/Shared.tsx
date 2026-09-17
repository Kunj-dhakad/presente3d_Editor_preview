"use client";
import React, { useState } from "react";
import {  KdWmBanIcon, KdWmCheckCircleIcon, KdWmImageIcon, KdWmPencilIcon, KdWmPresetLockIcon, KdWmShieldIcon } from "@editor/lib/icon/icons";
import { BRAND } from "@shared/brand";

export type OpacityPct = 10 | 20 | 30 | 40 | 50 | 60;

export interface FormState {
  text: string;
  color: string;
  opacityPct: OpacityPct;
  rotation: number;
  fontSize: number;
  pattern: "single" | "grid";
  font: string;
  letterSpacing: string;
  stylePreset: string;
}


export const PRESETS = [
  { key: "confidential", label: "CONFIDENTIAL", icon:KdWmPresetLockIcon, color: "#2FBFCF", rotation: -45, fontSize: 38 },
  { key: "draft", label: "DRAFT", color: "#9D7F1A",icon:KdWmPencilIcon, rotation: -45, fontSize: 38 },
  { key: "donotcopy", label: "DO NOT COPY", icon:KdWmBanIcon, color: BRAND.accent, rotation: -45, fontSize: 38 },
  { key: "sample", label: "SAMPLE", icon:KdWmImageIcon, color: "#4385E2", rotation: -45, fontSize: 38 },
  { key: "topsecret", label: "TOP SECRET", icon:KdWmShieldIcon, color: "#FF404099", rotation: -45, fontSize: 38 },
  { key: "approved", label: "APPROVED", icon:KdWmCheckCircleIcon, color: "#20A133", rotation: -45, fontSize: 38 },
] as const;

export const OPACITY_OPTIONS: OpacityPct[] = [10, 20, 30, 40, 50, 60];

export const FONT_OPTIONS = ["Montserrat", "Plus Jakarta Sans", "Inter", "Poetsen One", "Playpen Sans"] as const;
export const SIZE_OPTIONS = [16, 20, 24, 28, 30, 36, 42, 48, 56, 64] as const;
export const LETTER_SPACING_OPTIONS = ["0%", "5%", "10%", "15%", "20%"] as const;
export const SCALE_OPTIONS = ["Auto", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"] as const;
/** Shared by the text and image editors so both offer the same angles. */
export const ROTATION_OPTIONS = ["-90°", "-45°", "-35°", "0°", "35°", "45°", "90°"] as const;

export const STYLE_PRESETS = [
  { id: "style-fill", rotation: 0},
  { id: "style-outline", rotation:310 },
  { id: "style-soft", rotation:235},
  { id: "style-bold", rotation: 90 },
] as const;

export const blankForm: FormState = {
  text: "",
  color: "#6A8CF6",
  opacityPct: 20,
  rotation: 0,
  fontSize: 30,
  pattern: "single",
  font: "Montserrat",
  letterSpacing: "5%",
  stylePreset: "style-fill",
};



export const Icon = {
  sparkle: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--kd-accent)">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  ),
  lock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),

  edit: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  ),
  back: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  textTab: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="9" y1="20" x2="15" y2="20" />
    </svg>
  ),
  imageTab: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  cloudUpload: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 18a4.5 4.5 0 0 1-1-8.9A5 5 0 0 1 16 7.1 4 4 0 0 1 17 15" />
      <path d="M12 12v7" /><path d="M9 16l3-3 3 3" />
    </svg>
  ),
  expand: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  close: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export const PresetIcon: React.FC<{ presetKey: string }> = ({ presetKey }) => {
  const common = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  switch (presetKey) {
    case "confidential":
      return <svg {...common}><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case "draft":
      return <svg {...common}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 12l7.5 1.5L18 13z" /></svg>;
    case "donotcopy":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "sample":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>;
    case "topsecret":
      return <svg {...common}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /></svg>;
    case "approved":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>;
    default:
      return null;
  }
};


interface MiniStampProps {
  text: string;
  color: string;
  opacity: number;
  rotation: number;
  size?: number;
}

export const MiniStamp: React.FC<MiniStampProps> = ({ text, color, opacity, rotation, size = 8 }) => (
  <span style={{
    color, opacity: opacity / 100,
    transform: `rotate(${rotation}deg)`, display: "inline-block",
    fontWeight: 800, fontSize: size, letterSpacing: 1.5,
    textTransform: "uppercase", fontFamily: "inherit",
    whiteSpace: "nowrap",
  }}>
    {text}
  </span>
);



interface DropdownProps {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`kd-wm-select-trigger ${open ? "kd-wm-select-trigger-open" : ""}
          w-full flex items-center justify-between gap-2  px-3 py-1.5 cursor-pointer transition-colors`}
      >
        <span>{value}</span>
        {Icon.chevronDown}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="kd-wm-select-menu absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[220px] overflow-y-auto rounded-lg border p-1 shadow-lg">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`kd-wm-select-option ${opt === value ? "kd-wm-select-option-active" : ""}
                  flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors`}
              >
                {opt}
                {opt === value && Icon.check}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};