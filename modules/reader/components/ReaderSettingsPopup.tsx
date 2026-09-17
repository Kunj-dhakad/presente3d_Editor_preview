"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Check, Palette, Settings, X } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import VoicePicker from "./VoicePicker";

type SettingsTab = "colors" | "voice";

const PRESET_COLORS = [
  "#ffe600",
  "#fdba74",
  "#f9a8d4",
  "#c4b5fd",
  "#93c5fd",
  "#86efac",
];

/*
 * The flipbook (StPageFlip) listens for mouse/touch moves on `window` and
 * folds page corners based on cursor position. The popup floats over the
 * book, so without this its interactions leaked through and curled pages.
 * Stopping native propagation at the popup keeps them from reaching window.
 */
const SHIELDED_EVENTS = [
  "mousedown",
  "mousemove",
  "mouseup",
  "touchstart",
  "touchmove",
  "touchend",
] as const;

function shieldFromFlipbook(node: HTMLElement | null) {
  if (!node) return;
  const stop = (event: Event) => event.stopPropagation();
  SHIELDED_EVENTS.forEach((type) => node.addEventListener(type, stop));
  return () => {
    SHIELDED_EVENTS.forEach((type) => node.removeEventListener(type, stop));
  };
}

function ColorSetting({
  label,
  description,
  sample,
  value,
  onChange,
}: {
  label: string;
  description: string;
  sample: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalized = value.toLowerCase();
  const isCustom = !PRESET_COLORS.includes(normalized);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800">{label}</div>
          <div className="mt-0.5 text-xs text-slate-500">{description}</div>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
          {sample}
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        {PRESET_COLORS.map((color) => {
          const selected = normalized === color;
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`${label}: ${color}`}
              aria-pressed={selected}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 ${
                selected
                  ? "ring-2 ring-(--kd-accent) ring-offset-2"
                  : "ring-1 ring-black/10"
              }`}
              style={{ backgroundColor: color }}
            >
              {selected && (
                <Check className="h-3.5 w-3.5 text-slate-800" strokeWidth={3} />
              )}
            </button>
          );
        })}

        <span className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden />

        <label
          title="Custom color"
          className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 ${
            isCustom ? "ring-2 ring-(--kd-accent) ring-offset-2" : "ring-1 ring-black/10"
          }`}
          style={{
            background: isCustom
              ? value
              : "conic-gradient(#f87171, #fbbf24, #a3e635, #34d399, #38bdf8, #818cf8, #e879f9, #f87171)",
          }}
        >
          {isCustom && (
            <Check className="h-3.5 w-3.5 text-slate-800" strokeWidth={3} />
          )}
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label} custom color`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <span className="ml-auto font-mono text-[10px] uppercase text-slate-400">
          {value}
        </span>
      </div>
    </div>
  );
}

export default function ReaderSettingsPopup({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    narrationHighlightColor,
    textBackgroundColor,
    searchHighlightColor,
    setNarrationHighlightColor,
    setTextBackgroundColor,
    setSearchHighlightColor,
  } = useBookPreview();

  const [tab, setTab] = useState<SettingsTab>("colors");

  const popupRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* Esc or a press outside the popup closes it (the gear toggles on its own). */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popupRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-settings-toggle]")) return;
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  const setPopupNode = useCallback((node: HTMLDivElement | null) => {
    popupRef.current = node;
    return shieldFromFlipbook(node);
  }, []);

  const tabs: Array<{
    value: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "colors", label: "Colors", icon: Palette },
    { value: "voice", label: "Voice", icon: AudioLines },
  ];

  return (
    <div
      ref={setPopupNode}
      role="dialog"
      aria-label="Reader settings"
      /* top-17 clears the header; the height leaves room above the bottom toolbar. */
      className="absolute right-4 top-17 z-50 flex h-[min(580px,calc(100vh-10.5rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.28)] md:right-6"
    >
      {/* Header */}
      <div className="shrink-0 bg-white px-5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-(--kd-accent) to-(--kd-accent) text-white shadow-md shadow-(--kd-accent)/25">
              <Settings className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold leading-tight text-slate-900">
                Reader settings
              </h2>
              <p className="text-xs leading-tight text-slate-500">
                Personalize how the book reads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader settings"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1"
        >
          {tabs.map(({ value, label, icon: Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(value)}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-white text-(--kd-accent-hover) shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div
        role="tabpanel"
        className="flex min-h-0 flex-1 flex-col border-t border-slate-200/70 px-4 py-4"
      >
        {tab === "colors" ? (
          <div className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 scrollbar-thin">
            <ColorSetting
              label="Narration highlight"
              description="Word being read aloud"
              value={narrationHighlightColor}
              onChange={setNarrationHighlightColor}
              sample={
                <>
                  Read{" "}
                  <span
                    className="rounded px-1"
                    style={{ backgroundColor: narrationHighlightColor }}
                  >
                    aloud
                  </span>
                </>
              }
            />
            <ColorSetting
              label="Text background"
              description="Text block being narrated"
              value={textBackgroundColor}
              onChange={setTextBackgroundColor}
              sample={
                /* TextRenderer paints this at 35% opacity. */
                <span
                  className="rounded px-1"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${textBackgroundColor} 35%, transparent)`,
                  }}
                >
                  Sentence
                </span>
              }
            />
            <ColorSetting
              label="Search highlight"
              description="Matches from Find in book"
              value={searchHighlightColor}
              onChange={setSearchHighlightColor}
              sample={
                <>
                  Find{" "}
                  <span
                    className="rounded px-1"
                    style={{ backgroundColor: searchHighlightColor }}
                  >
                    match
                  </span>
                </>
              }
            />
          </div>
        ) : (
          <VoicePicker />
        )}
      </div>
    </div>
  );
}
