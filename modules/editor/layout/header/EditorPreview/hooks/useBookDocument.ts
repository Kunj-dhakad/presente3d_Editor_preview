"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SlideType } from "@editor/store/editorStore";
import type { BookPageData } from "../types/book";

interface UseBookDocumentArgs {
  document?: SlideType[];
  jsonUrl?: string;
}

export function useBookDocument({ document, jsonUrl }: UseBookDocumentArgs) {
  const [fetchedJson, setFetchedJson] = useState<string>("");
  const [manualJson, setManualJson] = useState<string | null>(null);
  const [prevDocument, setPrevDocument] = useState(document);

  if (document !== prevDocument) {
    setPrevDocument(document);
    setManualJson(null);
  }

  useEffect(() => {
    if (document !== undefined || !jsonUrl) return;

    let active = true;

    fetch(jsonUrl)
      .then((res) => res.text())
      .then((text) => {
        if (active) setFetchedJson(text);
      })
      .catch((error) => {
        console.warn("Failed to fetch jsonUrl for PreviewBook", error);
        if (active) setFetchedJson("");
      });

    return () => {
      active = false;
    };
  }, [jsonUrl, document]);

  const rawJson = useMemo(() => {
    if (manualJson !== null) return manualJson;
    if (document !== undefined) return JSON.stringify(document, null, 2);
    return fetchedJson;
  }, [manualJson, document, fetchedJson]);

  const setRawJson = useCallback((json: string) => {
    setManualJson(json);
  }, []);

  const normalizedData = useMemo(() => {
    try {
      if (!rawJson || !rawJson.trim()) {
        return {
          pages: [],
          width: 350,
          height: 434,
          isCorrupted: false,
        };
      }

      // One parse, not two: on a large book the throwaway validation parse
      // cost as much as the real one.
      let isCorrupted = false;
      let parsed: unknown = null;

      try {
        parsed = JSON.parse(rawJson) as unknown;
      } catch {
        isCorrupted = true;
      }

      if (isCorrupted) {
        return { pages: null, width: 350, height: 434, isCorrupted: true };
      }

      const source = Array.isArray(parsed)
        ? parsed
        : ((
            parsed as {
              slides?: unknown[];
              pages?: unknown[];
              items?: unknown[];
            }
          )?.slides ??
          (parsed as { pages?: unknown[] })?.pages ??
          (parsed as { items?: unknown[] })?.items ??
          []);
      const pages = source as BookPageData[];
      const firstPage = pages[0];

      return {
        pages: isCorrupted ? null : pages,
        width: firstPage?.width ?? 350,
        height: firstPage?.height ?? 434,
        isCorrupted,
      };
    } catch (error) {
      console.warn("Failed to parse Book JSON via normalizer", error);

      return {
        pages: null,
        width: 350,
        height: 434,
        isCorrupted: true,
      };
    }
  }, [rawJson]);

  return {
    rawJson,
    setRawJson,
    pages: normalizedData.pages as BookPageData[] | null,
    bookWidth: normalizedData.width,
    bookHeight: normalizedData.height,
  };
}
