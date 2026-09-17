"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PreviewPage } from "../types/book";

export interface SearchMatch {
  pageNumber: number;
  blockId: string;
  start: number;
  end: number;
}

interface Args {
  pages: PreviewPage[];
  /** Navigate to a page. Search uses jump (non-sequential) so typing does not animate through every intermediate page. */
  goToPage: (pageNumber: number, options?: { sequential?: boolean }) => void;
  /** Current reader page — used to skip redundant navigation. */
  currentPage: number;
}

/** Settle delay while typing so intermediate queries do not each trigger navigation. */
const SEARCH_NAV_DEBOUNCE_MS = 280;

const renderedTextCache = new Map<string, string>();

/*
 * Text as it appears in the DOM. TextRenderer injects `html || text` as
 * HTML and TextRenderer places <mark>s by walking those DOM text nodes, so
 * offsets must come from the same string. Searching `block.text` instead
 * (which has "\n" and spacing the HTML doesn't) shifted highlights onto the
 * wrong letters.
 */
function renderedText(markup: string): string {
  if (typeof document === "undefined") return markup;
  const cached = renderedTextCache.get(markup);
  if (cached !== undefined) return cached;
  const template = document.createElement("template");
  template.innerHTML = markup;
  const text = template.content.textContent ?? "";
  renderedTextCache.set(markup, text);
  return text;
}

function findMatches(pages: PreviewPage[], rawQuery: string): SearchMatch[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const results: SearchMatch[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNumber = i + 1;

    for (const block of page.blocks) {
      let text = "";
      if (block.kind === "text") text = renderedText(block.html || block.text || "");
      else if (block.kind === "button") text = block.text || "";
      else continue;

      if (!text) continue;

      const lower = text.toLowerCase();
      let from = 0;
      while (from < lower.length) {
        const idx = lower.indexOf(query, from);
        if (idx === -1) break;
        results.push({
          pageNumber,
          blockId: block.id,
          start: idx,
          end: idx + query.length,
        });
        from = idx + 1;
      }
    }
  }

  return results;
}

function matchKey(match: SearchMatch): string {
  return `${match.pageNumber}:${match.blockId}:${match.start}:${match.end}`;
}

export function useFindSearch({ pages, goToPage, currentPage }: Args) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  /** Last match we already navigated to (prevents repeat goToPage). */
  const lastNavigatedKeyRef = useRef<string | null>(null);
  const currentPageRef = useRef(currentPage);
  const goToPageRef = useRef(goToPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
    goToPageRef.current = goToPage;
  }, [currentPage, goToPage]);

  const matches = useMemo(
    () => findMatches(pages, searchQuery),
    [pages, searchQuery],
  );

  /* Index stays in range when the result list shrinks (derived, no effect). */
  const safeMatchIndex =
    matches.length === 0 ? 0 : currentMatchIndex >= matches.length ? 0 : currentMatchIndex;

  /*
   * ONE intentional navigation when the selected match changes.
   * - Debounced so typing "g" → "ge" → "geo" only navigates once after settle.
   * - Skips if already on the match page (no reader motion).
   * - Uses sequential: false so Flipbook jumps to the page (no multi-page flip chain).
   */
  useEffect(() => {
    if (matches.length === 0) return;
    const match = matches[safeMatchIndex];
    if (!match) return;

    const key = matchKey(match);
    if (lastNavigatedKeyRef.current === key) return;

    const timer = window.setTimeout(() => {
      /* Re-read in case a newer effect cancelled/replaced this timer's intent. */
      if (lastNavigatedKeyRef.current === key) return;

      lastNavigatedKeyRef.current = key;

      if (currentPageRef.current === match.pageNumber) {
        /* Already showing this page — highlights update; no navigation. */
        return;
      }

      goToPageRef.current(match.pageNumber, { sequential: false });
    }, SEARCH_NAV_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [safeMatchIndex, matches]);

  const setQuery = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentMatchIndex(0);
    /*
     * Clear navigated key so a new query can navigate once after debounce.
     * Do NOT call goToPage here — the debounced effect owns navigation.
     */
    lastNavigatedKeyRef.current = null;
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setCurrentMatchIndex(0);
    lastNavigatedKeyRef.current = null;
  }, []);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((i) => ((i >= matches.length ? 0 : i) + 1) % matches.length);
  }, [matches.length]);

  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((i) => ((i >= matches.length ? 0 : i) - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const activeMatch =
    matches.length > 0 ? (matches[safeMatchIndex] ?? null) : null;

  return {
    searchQuery,
    setSearchQuery: setQuery,
    clearSearch,
    matches,
    matchCount: matches.length,
    currentMatchIndex,
    currentMatchDisplay: matches.length === 0 ? 0 : currentMatchIndex + 1,
    activeMatch,
    goToNextMatch,
    goToPrevMatch,
  };
}