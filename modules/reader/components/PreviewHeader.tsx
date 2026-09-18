"use client";

import React, { useCallback, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import type { ViewMode } from "../types/view";
import ReaderSettingsPopup from "./ReaderSettingsPopup";
import { brandLogo } from "@shared/siteArt";
import { SITE } from "@shared/site";

interface Props {
  onBack?: () => void;
  backLabel?: string;
}

const MODES: Array<{ mode: ViewMode; label: string; short: string }> = [
  { mode: "flipbook", label: "Flipbook View", short: "Flipbook" },
  { mode: "vertical", label: "Vertical View", short: "Vertical" },
  { mode: "horizontal", label: "Horizontal View", short: "Horizontal" },
];

export default function PreviewHeader({ onBack, backLabel = "Back" }: Props) {
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    clearSearch,
    searchMatchCount: matchCount,
    searchCurrentMatchDisplay: currentMatchDisplay,
    goToNextMatch,
    goToPrevMatch,
  } = useBookPreview();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearSearch();
        inputRef.current?.blur();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (event.shiftKey) {
          goToPrevMatch();
        } else {
          goToNextMatch();
        }
      }
    },
    [clearSearch, goToNextMatch, goToPrevMatch],
  );

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <header className="sticky top-0 z-50 flex h-15 w-full items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 text-slate-800 shadow-xs sm:gap-3 md:px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        {onBack && (
          <button type="button" onClick={onBack} className="kd-btn px-4 py-1">
            {backLabel}
          </button>
        )}
        <a href="/" target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg pr-1 no-underline" aria-label={`Made with ${SITE.name}`} title={`Made with ${SITE.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo */}
          <img src={brandLogo} width={30} height={30} alt="" className="h-7.5 w-7.5 rounded-lg shadow-sm" />
          <span className="hidden text-[15px] font-bold tracking-tight text-(--kd-brand-900) lg:inline">{SITE.name}</span>
        </a>
      </div>

      {/* Find / Search — VS Code / Word style */}
      <div className="flex min-w-0 flex-1 items-center justify-center sm:px-2">
        <div className="flex w-full max-w-md items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 focus-within:border-(--kd-brand-400) focus-within:ring-2 focus-within:ring-(--kd-brand-100)">
          <svg
            aria-hidden
            className="h-4 w-4 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find in book…"
            aria-label="Find in book"
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            autoComplete="off"
            spellCheck={false}
          />
          {hasQuery && (
            <span
              className="shrink-0 whitespace-nowrap px-1 text-xs tabular-nums text-slate-500"
              aria-live="polite"
            >
              {matchCount === 0
                ? "0 of 0"
                : `${currentMatchDisplay} of ${matchCount}`}
            </span>
          )}
          {hasQuery && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              title="Clear (Esc)"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
          {MODES.map(({ mode, label, short }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={label}
              className={`cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-medium transition-all sm:px-4 ${
                viewMode === mode
                  ? "bg-(--kd-accent) text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          data-settings-toggle
          onClick={() => setIsSettingsOpen((open) => !open)}
          aria-label="Open reader settings"
          aria-expanded={isSettingsOpen}
          title="Reader settings"
          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
            isSettingsOpen
              ? "border-(--kd-brand-200) bg-(--kd-brand-50) text-(--kd-accent-hover)"
              : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {isSettingsOpen && (
        <ReaderSettingsPopup onClose={() => setIsSettingsOpen(false)} />
      )}
    </header>
  );
}