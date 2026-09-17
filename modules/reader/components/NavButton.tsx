"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";

const BUTTON_CLASS =
  "pointer-events-auto flex h-12 w-12 cursor-pointer select-none items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-lg transition-all duration-200 hover:scale-105 hover:text-(--kd-accent) active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:text-slate-700 md:h-14 md:w-14";


export default function NavButton() {
  const {
    viewMode,
    currentPage,
    totalPages,
    canGoNext,
    nextPage,
    prevPage,
    isPagesPanelOpen,
  } = useBookPreview();

  if (totalPages === 0 || (viewMode !== "flipbook" && viewMode !== "horizontal")) {
    return null;
  }


  const leftClass = isPagesPanelOpen
    ? "left-[152px] md:left-[168px]"
    : "left-4 md:left-6";

 
  const handlePrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    prevPage();
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    nextPage();
  };

  return (
    <>
      <div
        className={`pointer-events-none absolute top-1/2 z-40 -translate-y-1/2 transition-[left] duration-200 ${leftClass}`}
      >
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className={BUTTON_CLASS}
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>

      <div className="pointer-events-none absolute right-4 top-1/2 z-40 -translate-y-1/2 md:right-6">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Next page"
          className={BUTTON_CLASS}
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      </div>
    </>
  );
}