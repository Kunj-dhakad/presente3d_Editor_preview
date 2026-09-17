"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useBook } from '../context/BookStateContext';
import BookPage from './BookPage';
import { BookPageData } from '../types/book';

export function HorizontalReader() {
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
  const dragRef = useRef<{
    startX: number;
    startScroll: number;
    moved: boolean;
    dx: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // The first position is owned by the mount effect below; without this
    // guard the page the previous view mode had left off on dragged this one
    // straight into the middle of the book.
    if (!didMount.current) return;

    if (currentPage !== lastPageSwiped.current) {
      lastPageSwiped.current = currentPage;
      const el = document.getElementById(`horiz-page-wrapper-${currentPage}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentPage]);

  // Opening this view starts at the first page, instead of inheriting a
  // scroll position that lands between two pages.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({ left: 0 });
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
      const el = document.getElementById(`horiz-page-wrapper-${idx + 1}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages, setCurrentPage]);

  const pagesList = pages || [];

  // Grab-and-drag paging. A pointer press only becomes a drag once it has
  // travelled a few pixels, so buttons, links and quizzes on a page still take
  // ordinary clicks.
  const DRAG_THRESHOLD_PX = 6;

  /**
   * A short pull is enough to turn the page. Settling on whichever page is
   * nearest meant dragging past the halfway mark or the page snapped back,
   * which read as the drag not working.
   */
  const settleAfterDrag = (viewport: HTMLDivElement, dx: number) => {
    const width = viewport.clientWidth;
    // Where the drag began: the live scroll position has already moved by dx.
    const startIndex = Math.round((viewport.scrollLeft + dx) / width);
    const turnAt = Math.max(36, width * 0.1);

    let target = startIndex;
    if (dx <= -turnAt) target = startIndex + 1;
    else if (dx >= turnAt) target = startIndex - 1;

    target = Math.max(0, Math.min(pagesList.length - 1, target));

    lastPageSwiped.current = target + 1;
    setCurrentPage(target + 1);
    viewport.scrollTo({ left: target * width, behavior: 'smooth' });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !viewportRef.current) return;
    dragRef.current = {
      startX: event.clientX,
      startScroll: viewportRef.current.scrollLeft,
      moved: false,
      dx: 0,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport) return;

    const dx = event.clientX - drag.startX;
    drag.dx = dx;

    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setIsDragging(true);
      // Capture so the drag survives crossing an embed or leaving the window.
      viewport.setPointerCapture?.(event.pointerId);
    }

    // Snap is switched off while dragging (see the inline style below), so the
    // page follows the cursor one-to-one instead of being yanked to a stop.
    viewport.scrollLeft = drag.startScroll - dx;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    dragRef.current = null;
    if (!drag?.moved || !viewport) return;

    setIsDragging(false);
    try {
      viewport.releasePointerCapture?.(event.pointerId);
    } catch {
      /* the capture may already be gone */
    }
    settleAfterDrag(viewport, drag.dx);
  };

  return (
    <div className="relative w-full h-full">
    <div
      ref={viewportRef}
      id="horizontal-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="w-full h-full overflow-x-auto snap-x snap-mandatory flex kd-bg-hover select-none pb-2"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        // Mandatory snap would fight every pixel of a manual drag.
        scrollSnapType: isDragging ? 'none' : undefined,
      }}
    >
      {pagesList.map((page: BookPageData, index: number) => {
        const pageNum = index + 1;
        const isCurrent = currentPage === pageNum;

        return (
          <section
            key={page.id || `horiz-page-${index}`}
            id={`horiz-page-wrapper-${pageNum}`}
            data-page-index={pageNum}
            className="kd-reader-page-section min-w-full h-full snap-center flex items-center justify-center relative shrink-0"
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

    </div>
  );
}

export default HorizontalReader;
