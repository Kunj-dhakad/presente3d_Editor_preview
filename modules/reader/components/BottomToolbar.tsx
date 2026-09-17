"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Volume2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import { DEFAULT_ZOOM } from "../constants/reader";

const ICON_BUTTON =
  "flex cursor-pointer items-center gap-1.5 rounded-lg p-2 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800";

export default function BottomToolbar() {
  const {
    currentPage,
    totalPages,
    canGoNext,
    goToPage,
    nextPage,
    prevPage,
    viewMode,
    setViewMode,

    // Autoplay
    isAutoplaying,
    isAutoplayHoverPaused,
    toggleAutoplay,

    // Zoom
    zoomLevel,
    zoomIn,
    zoomOut,
    setZoomLevel,

    // General
    reset,

    // Pages Preview Panel
    isPagesPanelOpen,
    setPagesPanelOpen,

    // Narration
    isSpeaking,
    isPaused,
    narrationMessage,
    speak,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
  } = useBookPreview();

  const [pageInput, setPageInput] = useState(String(currentPage));

  const [syncedPage, setSyncedPage] = useState(currentPage);
  if (syncedPage !== currentPage) {
    setSyncedPage(currentPage);
    setPageInput(String(currentPage));
  }

  
  const readerControlsDisabled = viewMode === "index";

  const commitPageInput = () => {
    if (readerControlsDisabled) {
      setPageInput(String(currentPage));
      return;
    }
    const value = parseInt(pageInput, 10);
    if (!Number.isNaN(value) && value >= 1 && value <= totalPages) goToPage(value);
    else setPageInput(String(currentPage));
  };

  /* Phones: two rows (tools + zoom, then reading controls). md+: one row of three. */
  return (
    <footer className="relative bottom-0 z-50 flex min-h-[60px] w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-slate-200 bg-white px-3 py-2 shadow-md md:flex-nowrap md:gap-0 md:px-6 md:py-0">
      {narrationMessage && (
        <div className="pointer-events-none absolute bottom-[72px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/95 px-4 py-2 font-sans text-xs text-white shadow-xl">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-500" />
          <span className="font-semibold tracking-wide">{narrationMessage}</span>
        </div>
      )}

      <div className="order-1 flex items-center gap-1 sm:gap-2 md:w-1/3 md:justify-start">
        {/* Reset targets the reader (page 1, zoom, search) — nothing to reset on the Pages grid. */}
        <button
          type="button"
          onClick={reset}
          disabled={readerControlsDisabled}
          title={readerControlsDisabled ? "Reset is available in the reader" : "Reset"}
          className={ICON_BUTTON + " disabled:cursor-not-allowed disabled:opacity-30"}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        {/* Pages Button — always available (opens/closes index) */}
        <button
          type="button"
          onClick={() => {
            setPagesPanelOpen(false);
            setViewMode(viewMode === "index" ? "flipbook" : "index");
          }}
          title={viewMode === "index" ? "Close pages" : "Open pages"}
          className={
            viewMode === "index"
              ? "flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--kd-brand-200) bg-(--kd-brand-50) p-2 text-xs font-semibold text-(--kd-accent-hover)"
              : ICON_BUTTON
          }
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">Pages</span>
        </button>

        {/* Preview Button */}
        <button
          type="button"
          onClick={() => {
            if (viewMode === "index") {
              setViewMode("flipbook");
            }

            setPagesPanelOpen((open) => !open);
          }}
          title={isPagesPanelOpen ? "Close preview" : "Open preview"}
          className={
            isPagesPanelOpen && viewMode !== "index"
              ? "flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--kd-brand-200) bg-(--kd-brand-50) p-2 text-xs font-semibold text-(--kd-accent-hover)"
              : ICON_BUTTON
          }
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>

      <div className="order-3 flex w-full items-center justify-center gap-2 sm:gap-3 md:order-2 md:w-1/3">
        {totalPages > 0 ? (
          <div className="flex items-center gap-1 text-sm font-medium text-slate-700 sm:gap-2">
            <button
              type="button"
              onClick={prevPage}
              disabled={readerControlsDisabled || currentPage <= 1}
              aria-label="Previous page"
              className="cursor-pointer rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={pageInput}
              onChange={(event) => {
                if (readerControlsDisabled) return;
                setPageInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (readerControlsDisabled) {
                  event.preventDefault();
                  return;
                }
                if (event.key === "Enter") commitPageInput();
              }}
              onBlur={commitPageInput}
              readOnly={readerControlsDisabled}
              disabled={readerControlsDisabled}
              aria-label="Page number"
              className="h-7 w-10 rounded border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-800 focus:border-(--kd-accent) focus:outline-none focus:ring-1 focus:ring-(--kd-accent) disabled:cursor-not-allowed disabled:opacity-30"
            />

            <span className="hidden text-xs text-slate-400 sm:inline">of</span>
            <span className="text-xs text-slate-400 sm:hidden">/</span>
            <span className="text-xs font-bold text-slate-600">{totalPages}</span>

            <button
              type="button"
              onClick={nextPage}
              disabled={readerControlsDisabled || !canGoNext}
              aria-label="Next page"
              className="cursor-pointer rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="font-sans text-xs text-slate-400">No pages</span>
        )}

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-3xs">
          <button
            type="button"
            onClick={speak}
            disabled={readerControlsDisabled || isSpeaking}
            title="Read this page aloud"
            className={`cursor-pointer rounded-md p-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              isSpeaking && !isPaused
                ? "bg-emerald-600 font-bold text-white"
                : "text-slate-600 hover:bg-white hover:text-emerald-700"
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={pauseSpeech}
            disabled={readerControlsDisabled || !isSpeaking || isPaused}
            title="Pause"
            className={`cursor-pointer rounded-md p-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              isSpeaking && isPaused
                ? "bg-amber-500 text-white"
                : "text-slate-600 hover:bg-white hover:text-amber-600"
            }`}
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={resumeSpeech}
            disabled={readerControlsDisabled || !isSpeaking || !isPaused}
            title="Resume"
            className="cursor-pointer rounded-md p-1.5 text-slate-600 transition-all hover:bg-white hover:text-(--kd-accent) disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={stopSpeech}
            disabled={readerControlsDisabled || !isSpeaking}
            title="Stop"
            className="cursor-pointer rounded-md p-1.5 text-slate-600 transition-all hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>

        <button
          type="button"
          data-autoplay-toggle="true"
          onClick={toggleAutoplay}
          title={isAutoplaying ? "Stop autoplay" : "Start autoplay"}
          disabled={readerControlsDisabled || totalPages <= 1}
          className={
            isAutoplaying && !readerControlsDisabled
              ? "flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--kd-brand-200) bg-(--kd-brand-50) p-2 text-xs font-semibold text-(--kd-accent-hover) disabled:cursor-not-allowed disabled:opacity-30"
              : ICON_BUTTON + " disabled:cursor-not-allowed disabled:opacity-30"
          }
        >
          {isAutoplaying && !readerControlsDisabled ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isAutoplayHoverPaused && !readerControlsDisabled
              ? "Paused on hover"
              : "Autoplay"}
          </span>
        </button>
      </div>

      <div className="order-2 flex items-center justify-end gap-1 md:order-3 md:w-1/3 md:gap-2.5">
        <button
          type="button"
          onClick={zoomOut}
          title="Zoom out"
          className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[42px] select-none text-center font-mono text-xs font-bold text-slate-700">
          {zoomLevel}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          title="Zoom in"
          className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(DEFAULT_ZOOM)}
          title="Reset zoom"
          className="hidden cursor-pointer rounded-lg p-1.5 sm:block text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
}