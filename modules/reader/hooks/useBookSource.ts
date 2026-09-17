"use client";

import { useEffect, useMemo, useState } from "react";
import type { PreviewBookResult } from "../types/book";
import { parseBook } from "../parser/parseBook";
import { parseTheme } from "../parser/parseTheme";

export interface BookSource {

  json?: string;
 
  jsonUrl?: string;
}

const EMPTY: PreviewBookResult = {
  ok: true,
  pages: [],
  theme: parseTheme([]),
  chapters: [],
};


export function useBookSource({ json, jsonUrl }: BookSource): {
  book: PreviewBookResult;
  loading: boolean;
} {
  const [fetched, setFetched] = useState<string | null>(null);
  // Why the URL gave no book (a private or removed book answers 404).
  const [unavailable, setUnavailable] = useState("");

  const [requestedUrl, setRequestedUrl] = useState(jsonUrl);
  if (requestedUrl !== jsonUrl) {
    setRequestedUrl(jsonUrl);
    setFetched(null);
    setUnavailable("");
  }

  useEffect(() => {
  
    if (json !== undefined || !jsonUrl) return;

    let active = true;

    fetch(jsonUrl)
      .then(async (response) => {
        const text = await response.text();
        if (!active) return;
        if (!response.ok) {
          setUnavailable(
            response.status === 404
              ? "This book is private or its link has changed. Ask the author for a new link."
              : "The book could not be loaded right now. Please try again in a moment.",
          );
          setFetched("");
          return;
        }
        setFetched(text);
      })
      .catch((error) => {
        console.warn("Preview could not fetch the book JSON", error);
       
        if (active) setFetched("");
      });

    return () => {
      active = false;
    };
  }, [json, jsonUrl]);

  const source = json ?? fetched;
  const loading = json === undefined && Boolean(jsonUrl) && fetched === null;

  const book = useMemo(() => {
    if (unavailable) return { ok: false as const, reason: unavailable };
    if (source === null || source === undefined) return EMPTY;
    return parseBook(source);
  }, [source, unavailable]);

  return { book, loading };
}
