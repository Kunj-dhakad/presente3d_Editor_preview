"use client";
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import PageRenderer from "../render/PageRenderer";
import { pagesInView } from "../hooks/useNarration";


const THUMB_WIDTH = 104;

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
      className="pointer-events-auto absolute left-3 top-1/2 z-50 flex max-h-[min(78vh,640px)] w-[136px] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-(--kd-brand-200) bg-white/95 shadow-[0_18px_40px_rgba(30,26,58,0.16)] backdrop-blur md:left-4 md:w-[144px]"
      aria-label="Pages"
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-(--kd-brand-100) bg-(--kd-brand-50) py-2 pl-3 pr-1.5">
        <span className="flex min-w-0 items-baseline gap-1.5 font-sans">
          <span className="text-[13px] font-bold text-(--kd-brand-900)">Pages</span>
          <span className="text-[11px] font-medium tabular-nums text-(--kd-brand-muted)">{activePages[0] ?? 1}/{totalPages}</span>
        </span>
        <button
          type="button"
          onClick={() => setPagesPanelOpen(false)}
          aria-label="Close pages panel"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-(--kd-brand-muted) transition-colors hover:bg-(--kd-brand-100) hover:text-(--kd-accent)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="kd-thin-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3" style={{ scrollbarGutter: "stable both-edges" }}>
        <div className="flex flex-col items-center gap-3">
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
                className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-lg bg-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--kd-brand-400) ${
                  isActive
                    ? "ring-2 ring-(--kd-accent) shadow-[0_6px_16px_color-mix(in_srgb,var(--kd-accent)_35%,transparent)]"
                    : "shadow-sm ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-(--kd-brand-300)"
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
                  className={`absolute bottom-1 right-1 z-10 rounded-md px-1.5 py-0.5 font-sans text-[10px] font-bold leading-none tabular-nums shadow-sm ${
                    isActive
                      ? "bg-(--kd-accent) text-white"
                      : "bg-white/90 text-(--kd-brand-900) ring-1 ring-slate-200"
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