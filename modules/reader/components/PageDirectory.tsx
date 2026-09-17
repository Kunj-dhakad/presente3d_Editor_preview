"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import PageRenderer from "../render/PageRenderer";

const THUMB_WIDTH = 140;

export default function PageDirectory() {
  const { pages, goToPage, setViewMode, theme } = useBookPreview();

  const scale = THUMB_WIDTH / theme.pageWidth;
  const thumbHeight = theme.pageHeight * scale;

  const open = (pageNumber: number) => {
    goToPage(pageNumber);
    setViewMode("flipbook");
  };

  return (
    <div className="h-full w-full select-none overflow-y-auto bg-slate-100 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-(--kd-accent) p-2 text-white shadow-md">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-sans text-lg font-bold text-slate-800 md:text-xl">
                Pages
              </h2>
              <p className="font-sans text-xs text-slate-500">
                Click any page to open it in the flipbook.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode("flipbook")}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50"
          >
            ← Back to Flipbook
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {pages.map((page, index) => {
            const pageNumber = index + 1;
            const firstText = page.blocks.find((block) => block.kind === "text");
            const title =
              firstText && firstText.kind === "text" && firstText.text.trim()
                ? firstText.text
                : "Empty page";

            /*
             * div[role=button], not <button>: the thumbnail's PageRenderer
             * renders interaction <button>s, and <button> inside <button>
             * is invalid HTML (hydration error).
             */
            return (
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                aria-label={`Open page ${pageNumber}`}
                onClick={() => open(pageNumber)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(pageNumber);
                  }
                }}
                className="group flex w-full cursor-pointer flex-col items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-(--kd-brand-400) hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-(--kd-accent)/20"
              >
                <div
                  className="relative flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs transition-shadow group-hover:shadow-md"
                  style={{ width: THUMB_WIDTH, height: thumbHeight }}
                >
                  
                  <div
                    className="pointer-events-none absolute left-0 top-0"
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      width: theme.pageWidth,
                      height: theme.pageHeight,
                    }}
                  >
                    <PageRenderer page={page} pageNumber={pageNumber} thumbnail />
                  </div>
                </div>

                <div className="mt-3 flex w-full flex-col justify-start">
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider text-(--kd-accent)">
                    Page {pageNumber}
                  </span>
                  <h4
                    className="mt-0.5 w-full truncate text-xs font-bold text-slate-800 transition-colors group-hover:text-(--kd-accent)"
                    title={title}
                  >
                    {title}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}