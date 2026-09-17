"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useBook } from '../context/BookStateContext';
import BookPage from './BookPage';
import { BookPageData } from '../types/book';

export function VerticalReader() {
  const { pages, currentPage, setCurrentPage, bookWidth, bookHeight, zoomLevel } = useBook();
  const [scale, setScale] = useState<number>(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const paddingX = 48;
      const paddingY = 48;
      const availableWidth = rect.width - paddingX;
      const availableHeight = rect.height - paddingY;

      const scaleX = availableWidth / bookWidth;
      const scaleY = availableHeight / bookHeight;
      const calculatedScale = Math.min(1, scaleX, scaleY);
      setScale(calculatedScale > 0.1 ? calculatedScale : 0.1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [bookWidth, bookHeight]);

  const lastPageSwiped = useRef<number | null>(null);
  const didMount = useRef(false);

  useEffect(() => {
    // The first position is owned by the mount effect below; without this
    // guard the page the previous view mode had left off on dragged this one
    // straight into the middle of the book.
    if (!didMount.current) return;

    if (currentPage !== lastPageSwiped.current) {
      lastPageSwiped.current = currentPage;
      const el = document.getElementById(`vert-page-wrapper-${currentPage}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentPage]);

  // Opening this view starts at the first page, instead of inheriting a
  // scroll position that lands between two pages.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({ top: 0 });
    lastPageSwiped.current = 1;
    didMount.current = true;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pages || pages.length === 0) return;

    const observerOptions = {
      root: viewport,
      rootMargin: '0px',
      threshold: 0.5,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const indexStr = entry.target.getAttribute('data-page-index');
          if (indexStr) {
            const index = parseInt(indexStr, 10);
            if (!isNaN(index) && index !== lastPageSwiped.current) {
              lastPageSwiped.current = index;
              setCurrentPage(index);
            }
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    pages.forEach((_, idx) => {
      const el = document.getElementById(`vert-page-wrapper-${idx + 1}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages, setCurrentPage]);

  const pagesList = pages || [];

  return (
    <div
      ref={viewportRef}
      id="vertical-viewport"
      className="w-full h-full overflow-y-auto snap-y snap-proximity kd-bg-hover select-none flex flex-col items-center"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {pagesList.map((page: BookPageData, index: number) => {
        const pageNum = index + 1;
        const isCurrent = currentPage === pageNum;

        return (
          <section
            key={page.id || `vert-page-${index}`}
            id={`vert-page-wrapper-${pageNum}`}
            data-page-index={pageNum}
            className="kd-reader-page-section min-h-full min-w-full h-full snap-start flex items-center justify-center relative shrink-0"
          >
            <div
              style={{
                width: `${bookWidth * scale * (zoomLevel / 100)}px`,
                height: `${bookHeight * scale * (zoomLevel / 100)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `scale(${scale * (zoomLevel / 100)})`,
                  transformOrigin: 'center center',
                  width: `${bookWidth}px`,
                  height: `${bookHeight}px`,
                  position: 'absolute',
                }}
                className={`rounded-xl overflow-hidden kd-reader-page-frame shadow-2xl ${
                  isCurrent ? 'ring-4 kd-bd-accent kd-shadow-accent' : 'ring-1 kd-bd'
                }`}
              >
                <BookPage page={page} pageIndex={index} />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default VerticalReader;
