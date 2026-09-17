"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTERVAL_MS = 2000;

interface Args {
  currentPage: number;
  totalPages: number;
  nextPage: () => void;
  blocked?: boolean;
  /**
   * Temporarily hold autoplay (e.g. mouse hovering a page) without turning
   * it off. The timer restarts with a full interval once released.
   */
  paused?: boolean;
}

export function useAutoplay({
  currentPage,
  totalPages,
  nextPage,
  blocked = false,
  paused = false,
}: Args) {
  const [isAutoplaying, setIsAutoplaying] = useState(false);

  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const nextPageRef = useRef(nextPage);
  const blockedRef = useRef(blocked);
  const intervalIdRef = useRef<number | null>(null);
  /** Detect stalled nextPage (already at end / flip no-op). */
  const lastAdvanceFromRef = useRef<number | null>(null);

  /* Mirrors for the interval callback, synced after each commit. */
  useEffect(() => {
    currentPageRef.current = currentPage;
    totalPagesRef.current = totalPages;
    nextPageRef.current = nextPage;
    blockedRef.current = blocked;
  }, [currentPage, totalPages, nextPage, blocked]);

  /*
   * Blocked mode (Pages grid) or reaching the last page turns autoplay off.
   * Adjusted during render rather than in an effect, so the UI never shows
   * an "active" frame that is already stale.
   */
  if (
    isAutoplaying &&
    (blocked || totalPages <= 1 || currentPage >= totalPages)
  ) {
    setIsAutoplaying(false);
  }

  const clearTimer = useCallback(() => {
    if (intervalIdRef.current != null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const stopAutoplay = useCallback(() => {
    clearTimer();
    lastAdvanceFromRef.current = null;
    setIsAutoplaying(false);
  }, [clearTimer]);

  const startAutoplay = useCallback(() => {
    if (blockedRef.current) return;
    if (totalPagesRef.current <= 1) return;
    if (currentPageRef.current >= totalPagesRef.current) return;
    lastAdvanceFromRef.current = null;
    setIsAutoplaying(true);
  }, []);

  const toggleAutoplay = useCallback(() => {
    setIsAutoplaying((on) => {
      if (on) {
        if (intervalIdRef.current != null) {
          window.clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        lastAdvanceFromRef.current = null;
        return false;
      }
      if (blockedRef.current) return false;
      if (totalPagesRef.current <= 1) return false;
      if (currentPageRef.current >= totalPagesRef.current) return false;
      lastAdvanceFromRef.current = null;
      return true;
    });
  }, []);

  /*
   * Main interval.
   * Stops when:
   * - blocked
   * - already on last page (currentPage >= totalPages)
   * - previous nextPage did not advance (stuck at end)
   */
  useEffect(() => {
    clearTimer();

    if (!isAutoplaying) return;
    if (blocked) return;
    if (paused) return;

    intervalIdRef.current = window.setInterval(() => {
      if (blockedRef.current) {
        if (intervalIdRef.current != null) {
          window.clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        lastAdvanceFromRef.current = null;
        setIsAutoplaying(false);
        return;
      }

      const page = currentPageRef.current;
      const total = totalPagesRef.current;

      if (total <= 0 || page >= total) {
        if (intervalIdRef.current != null) {
          window.clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        lastAdvanceFromRef.current = null;
        setIsAutoplaying(false);
        return;
      }

      /*
       * If we already tried to advance from this page and currentPage
       * never moved, the flip engine is at the end — stop autoplay.
       */
      if (lastAdvanceFromRef.current === page) {
        if (intervalIdRef.current != null) {
          window.clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        lastAdvanceFromRef.current = null;
        setIsAutoplaying(false);
        return;
      }

      lastAdvanceFromRef.current = page;
      nextPageRef.current();
    }, INTERVAL_MS);

    return () => {
      clearTimer();
    };
  }, [isAutoplaying, blocked, paused, clearTimer]);

  return {
    isAutoplaying,
    setIsAutoplaying,
    toggleAutoplay,
    startAutoplay,
    stopAutoplay,
  };
}