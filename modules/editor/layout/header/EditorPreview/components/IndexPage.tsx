"use client";

import React from 'react';
import { useBook } from '../context/BookStateContext';
import BookPage from './BookPage';
import { BookOpen } from 'lucide-react';
import { BookPageData } from '../types/book';

export function IndexPage() {
  const { pages, setPage, setViewMode } = useBook();
  const pageWidth = pages?.[0]?.width || 350;
  const pageHeight = pages?.[0]?.height || 434;
  const thumbWidth = 140;
  const scale = thumbWidth / pageWidth;
  const thumbHeight = pageHeight * scale;


  const handlePageSelect = (pageNumber: number) => {
    setPage(pageNumber);
    setViewMode('flipbook');
  };

  const pagesArray = pages || [];

  return (
    <div
      id="index-page-view"
      className="w-full h-full kd-bg-sunken overflow-y-auto px-4 py-6 md:px-8 md:py-8 select-none"
      style={{
        scrollbarWidth: 'thin',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Page Title & Back Badge */}
        <div className="flex items-center justify-between mb-6 border-b kd-bd-subtle pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 kd-bg-accent kd-fg-on-accent rounded-xl shadow-md">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg md:text-xl font-bold kd-fg font-sans">
                Ebook Pages Directory
              </h2>
              <p className="text-xs kd-fg-muted font-sans">
                Click any page block below to open it directly in the flipbook.
              </p>
            </div>
          </div>
          <button
            id="index-btn-back-to-flip"
            onClick={() => setViewMode('flipbook')}
            className="px-4 py-1.5 text-xs font-semibold kd-bg-surface kd-hv-bg border kd-bd-subtle kd-fg kd-hv-fg rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            ← Back to Flipbook
          </button>
        </div>

        {/* Responsive Grid mapping index entries */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {pagesArray.map((page: BookPageData, index: number) => {
            const pageNum = index + 1;

            // Try to find a nice descriptive title from elements configuration
            const firstTextElement = page.elements?.find((el) => el.data?.type === 'text');
            const pageTitle = firstTextElement?.data?.type === 'text'
              ? firstTextElement.data.text || `Empty Page`
              : `Empty Page`;

            return (
              <button
                key={page.id || `idx-card-${index}`}
                id={`index-page-card-${pageNum}`}
                onClick={() => handlePageSelect(pageNum)}
                className="group flex flex-col items-center kd-bg-surface border kd-bd-subtle rounded-xl p-3 shadow-2xs hover:shadow-lg kd-hv-bd-accent focus:outline-none focus:ring-2 kd-fc-ring transition-all duration-300 transform hover:-translate-y-1 text-left w-full cursor-pointer overflow-hidden"
              >
                {/* Dynamic Miniature Scaled BookPage Page Preview */}
                <div
                  className="rounded-lg border kd-bd-subtle kd-bg-surface relative overflow-hidden flex items-center justify-center shadow-xs group-hover:shadow-md transition-shadow"
                  style={{
                    width: `${thumbWidth}px`,
                    height: `${thumbHeight}px`,
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      width: `${pageWidth}px`,
                      height: `${pageHeight}px`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                  >
                    <BookPage page={page} pageIndex={index} />
                  </div>
                </div>

                {/* Meta details segment */}
                <div className="w-full mt-3 flex flex-col justify-start">
                  <span className="text-[10px] font-black uppercase kd-fg-accent tracking-wider font-mono">
                    Page {pageNum}
                  </span>
                  <h4
                    className="font-bold kd-fg text-xs truncate w-full mt-0.5 kd-gh-fg-accent transition-colors"
                    title={pageTitle}
                  >
                    {pageTitle}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default IndexPage;
