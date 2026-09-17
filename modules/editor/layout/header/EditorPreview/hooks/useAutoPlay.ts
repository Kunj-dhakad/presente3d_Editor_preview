"use client";

import { useCallback, useEffect, useState } from "react";

/** The flip itself takes 900ms, so this leaves ~0.6s on each page. */
const AUTOPLAY_INTERVAL_MS = 1500;

interface UseAutoPlayArgs {
  currentPage: number;
  totalPages: number;
  nextPage: () => void;
}

/**
 * Turns the reader into a hands-off slideshow: pages advance on their own
 * until the book ends, in whichever view mode is open.
 */
export function useAutoPlay({ currentPage, totalPages, nextPage }: UseAutoPlayArgs) {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = window.setInterval(() => {
      // Checked in the tick rather than up front, so reaching the last page
      // stops the run instead of spinning against the end of the book.
      if (totalPages > 0 && currentPage >= totalPages) {
        setIsAutoPlaying(false);
        return;
      }
      nextPage();
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, currentPage, totalPages, nextPage]);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((on) => !on);
  }, []);

  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
  }, []);

  return { isAutoPlaying, toggleAutoPlay, stopAutoPlay };
}
