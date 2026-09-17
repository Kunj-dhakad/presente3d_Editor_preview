"use client";
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import PageRenderer from "../render/PageRenderer";
import { pagesInView } from "../hooks/useNarration";


const THUMB_WIDTH = 96;

export default function PagesThumbnailPanel() {
  const {
    pages,
    theme,
    currentPage,
    totalPages,
    viewMode,
    goToPage,
    isPagesPanelOpen,
    setPagesPanelOpen,
  } = useBookPreview();

 
  const activeRef = useRef<HTMLDivElement | null>(null);

  
  const activePages =
    totalPages > 0 ? pagesInView(currentPage, totalPages, viewMode) : [];

  useEffect(() => {
    if (!isPagesPanelOpen) return;
    activeRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentPage, isPagesPanelOpen, viewMode]);

  if (!isPagesPanelOpen || pages.length === 0) return null;

  const scale = THUMB_WIDTH / theme.pageWidth;
  const thumbHeight = theme.pageHeight * scale;

  const formatPageNumber = (n: number) =>
    n < 10 ? `0${n}` : String(n);

  return (
    <aside
      className="pointer-events-auto absolute left-3 top-1/2 z-50 flex max-h-[min(78vh,640px)] w-[132px] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#36454] shadow-2xl md:left-4 md:w-[148px]"
      aria-label="Pages"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
        <span className="font-sans text-sm font-semibold tracking-wide text-black">
          Pages
        </span>
        <button
          type="button"
          onClick={() => setPagesPanelOpen(false)}
          aria-label="Close pages panel"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2.5">
        <div className="flex flex-col gap-2.5">
          {pages.map((page, index) => {
            const pageNumber = index + 1;
            const isActive = activePages.includes(pageNumber);

            return (
            
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                ref={
                  isActive && pageNumber === activePages[0]
                    ? activeRef
                    : undefined
                }
                onClick={() => goToPage(pageNumber)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToPage(pageNumber);
                  }
                }}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={isActive ? "page" : undefined}
                className={`group relative mx-auto shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--kd-brand-400) ${
                  isActive
                    ? "ring-2 ring-(--kd-accent) shadow-[0_0_0_3px_rgba(59,130,246,0.35)]"
                    : "ring-1 ring-white/15 hover:ring-white/40"
                }`}
                style={{ width: THUMB_WIDTH, height: thumbHeight }}
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 origin-top-left bg-white"
                  style={{
                    transform: `scale(${scale})`,
                    width: theme.pageWidth,
                    height: theme.pageHeight,
                  }}
                >
                  <PageRenderer page={page} pageNumber={pageNumber} thumbnail />
                </div>

                <span
                  className={`absolute right-1 top-1 z-10 rounded px-1 py-0.5 font-mono text-[10px] font-bold leading-none ${
                    isActive
                      ? "bg-(--kd-accent) text-white"
                      : "bg-black/55 text-white/90"
                  }`}
                >
                  {formatPageNumber(pageNumber)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}