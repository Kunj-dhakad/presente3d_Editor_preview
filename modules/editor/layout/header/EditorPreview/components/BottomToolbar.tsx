"use client";

import React, { useState, useEffect } from 'react';
import { useBook } from '../context/BookStateContext';
import {
  RefreshCw,
  List,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Play,
  Pause,
  Square,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

export function BottomToolbar() {
  const {
    currentPage,
    setPage,
    totalPages,
    zoomLevel,
    zoomIn,
    zoomOut,
    setZoomLevel,
    resetBook,
    isAutoPlaying,
    toggleAutoPlay,
    viewMode,
    setViewMode,
    isSpeaking,
    isPaused,
    ttsMessage,
    speakCurrentPage,
    pauseSpeech,
    resumeSpeech,
    stopSpeech
  } = useBook();

  const [tempPageInput, setTempPageInput] = useState<string>(currentPage.toString());

  // Keep temporary typed page input in sync with current page state
  useEffect(() => {
    setTempPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = parseInt(tempPageInput, 10);
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPage(val);
      } else {
        setTempPageInput(currentPage.toString());
      }
    }
  };

  const handlePageInputBlur = () => {
    const val = parseInt(tempPageInput, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setPage(val);
    } else {
      setTempPageInput(currentPage.toString());
    }
  };

  const handleIndexClick = () => {
    if (viewMode === 'index') {
      setViewMode('horizontal');
    } else {
      setViewMode('index');
    }
  };

  return (
    <footer className="relative min-h-[60px] py-2 md:py-0 w-full border-t kd-bd-subtle kd-bg-surface kd-fg flex flex-wrap md:flex-nowrap items-center justify-center md:justify-between px-2 md:px-6 bottom-0 z-50 shadow-md gap-x-2 gap-y-2 md:gap-0">

      {ttsMessage && (
        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-50 kd-bg-inverse kd-fg-inverse text-xs py-2 px-4 rounded-lg shadow-xl border kd-bd-strong flex items-center gap-2 select-none animate-bounce font-sans pointer-events-none transition-all">
          <div className="w-1.5 h-1.5 rounded-full kd-bg-danger animate-ping" />
          <span className="font-semibold tracking-wide">{ttsMessage}</span>
        </div>
      )}

      <div className="flex items-center gap-1 md:gap-2 order-2 md:order-1 w-auto md:w-1/3 justify-center md:justify-start">
        <button
          id="btn-toolbar-refresh"
          onClick={resetBook}
          title="Reset Book to First Page & Default Zoom"
          className="p-2 kd-fg-muted kd-hv-fg kd-hv-bg-sunken rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          id="btn-toolbar-index"
          onClick={handleIndexClick}
          title={viewMode === 'index' ? "Close Index View" : "Open Pages Index View"}
          className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            viewMode === 'index'
              ? 'kd-bg-accent-subtle kd-fg-accent border kd-bd-accent shadow-3xs'
              : 'kd-fg-muted kd-hv-fg kd-hv-bg-sunken'
          }`}
        >
          <List className={`w-4 h-4 ${viewMode === 'index' ? 'kd-fg-accent' : 'kd-fg-accent'}`} />
          <span className="hidden sm:inline">Index</span>
        </button>

        <button
          id="btn-toolbar-autoplay"
          onClick={toggleAutoPlay}
          disabled={totalPages <= 1}
          title={isAutoPlaying ? 'Stop auto play' : 'Play the book on its own'}
          className={`p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none ${
            isAutoPlaying
              ? 'kd-bg-success-soft kd-fg-success border kd-bd-success shadow-3xs'
              : 'kd-fg-muted kd-hv-fg kd-hv-bg-sunken'
          }`}
        >
          {isAutoPlaying ? (
            <PauseCircle className="w-4 h-4 kd-fg-success" />
          ) : (
            <PlayCircle className="w-4 h-4 kd-fg-success" />
          )}
          <span className="hidden sm:inline">{isAutoPlaying ? 'Playing' : 'Auto play'}</span>
        </button>

      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-3 order-1 md:order-2 w-full md:w-1/3">
        {totalPages > 0 ? (
          <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium kd-fg">
            {/* Nav Left Button */}
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-full kd-hv-bg-sunken kd-fg-muted kd-hv-fg  cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">


              {/* Typeable Input */}
              <input
                id="toolbar-page-input"
                type="text"
                value={tempPageInput}
                onChange={(e) => setTempPageInput(e.target.value)}
                onKeyDown={handlePageInputSubmit}
                onBlur={handlePageInputBlur}
                className="w-10 h-7 text-center text-xs font-bold border kd-bd-subtle rounded kd-fc-bd-accent focus:ring-1 kd-fc-ring focus:outline-none kd-bg-app kd-fg"
                title="Type page number and press Enter"
              />

              <span className="text-xs kd-fg-subtle select-none">or</span>

              {/* Selection Dropdown */}
              <select
                id="toolbar-page-select"
                value={currentPage}
                onChange={(e) => setPage(parseInt(e.target.value, 10))}
                className="h-7 text-xs border kd-bd-subtle rounded px-1 kd-fc-bd-accent focus:ring-1 kd-fc-ring focus:outline-none kd-bg-surface font-semibold cursor-pointer kd-fg animate-none opacity-100"
                title="Select page from dropdown"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <option key={pNum} value={pNum}>
                    Pg {pNum}
                  </option>
                ))}
              </select>
            </div>

            <span className="kd-fg-subtle text-xs sm:inline hidden">of</span>
            <span className="kd-fg-subtle text-xs sm:hidden">/</span>
            <span className="kd-fg-muted font-bold text-xs">{totalPages}</span>

            {/* Nav Right Button */}
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-full kd-hv-bg-sunken kd-fg-muted kd-hv-fg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs kd-fg-subtle font-sans">Awaiting pages...</span>
        )}

        {/* TTS Audio Controls Container */}
        <div
          id="tts-controls-wrapper"
          className="flex items-center gap-1 kd-bg-sunken border kd-bd-subtle rounded-lg p-0.5 shadow-3xs"
        >
          {/* 1. Playback / Speaker Button */}
          <button
            id="tts-btn-play"
            disabled={isSpeaking}
            onClick={speakCurrentPage}
            title="Read Current Page Aloud"
            className={`p-1.5 rounded-md cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none ${
              isSpeaking && !isPaused
                ? 'kd-bg-success kd-fg-inverse shadow-sm scale-102 font-bold'
                : 'kd-fg-muted kd-hv-fg-success kd-hv-bg-surface'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          {/* 2. Pause Button */}
          <button
            id="tts-btn-pause"
            onClick={pauseSpeech}
            disabled={!isSpeaking || isPaused}
            title="Pause Reading"
            className={`p-1.5 rounded-md cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none ${
              isSpeaking && isPaused
                ? 'kd-bg-warning kd-fg-inverse shadow-sm'
                : 'kd-fg-muted kd-hv-fg-warning kd-hv-bg-surface'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          {/* 3. Resume Button */}
          <button
            id="tts-btn-resume"
            onClick={resumeSpeech}
            disabled={!isSpeaking || !isPaused}
            title="Resume Reading"
            className="p-1.5 rounded-md kd-fg-muted kd-hv-fg-accent kd-hv-bg-surface disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-200"
          >
            <Play className="w-3.5 h-3.5" />
          </button>

          {/* 4. Stop Button */}
          <button
  id="tts-btn-stop"
  type="button"
  onMouseDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    stopSpeech();
  }}
  title="Stop Reading"
  className="p-1.5 rounded-md kd-fg-muted kd-hv-fg-danger kd-hv-bg-surface cursor-pointer transition-all duration-200"
>
  <Square
    className="w-3.5 h-3.5 fill-current pointer-events-none"
  />
</button>
        </div>
      </div>

      {/* Right Section: Zoom Controls */}
      <div className="flex items-center gap-1.5 md:gap-2.5 order-3 w-auto md:w-1/3 justify-center md:justify-end">
        <button
          id="btn-toolbar-zoom-out"
          onClick={zoomOut}
          title="Zoom Out"
          className="p-1.5 kd-fg-muted kd-hv-fg kd-hv-bg-sunken rounded-lg transition cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs font-bold kd-fg min-w-[42px] text-center font-mono select-none">
          {zoomLevel}%
        </span>

        <button
          id="btn-toolbar-zoom-in"
          onClick={zoomIn}
          title="Zoom In"
          className="p-1.5 kd-fg-muted kd-hv-fg kd-hv-bg-sunken rounded-lg transition cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          id="btn-toolbar-zoom-reset"
          onClick={() => setZoomLevel(100)}
          title="Reset Zoom to 100%"
          className="p-1.5 kd-fg-subtle kd-hv-fg kd-hv-bg-sunken rounded-lg transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}

export default BottomToolbar;
