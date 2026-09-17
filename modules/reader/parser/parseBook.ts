import type { PreviewBookResult } from "../types/book";
import { deriveChapters } from "../utils/toc";
import { parsePages } from "./parsePages";
import { parseTheme } from "./parseTheme";
import { isRecord } from "./primitives";

/**
 * Exported books have shipped under a few envelope shapes over time. The
 * reader accepts all of them so an older file still opens.
 */
function extractPageArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return null;
  for (const key of ["slides", "pages", "items"] as const) {
    if (Array.isArray(parsed[key])) return parsed[key];
  }
  return null;
}

/** Builds the preview model from an already-decoded JSON value. */
export function parseBookValue(parsed: unknown): PreviewBookResult {
  const rawPages = extractPageArray(parsed);
  if (!rawPages) {
    return {
      ok: false,
      reason: "The book JSON has no slides, pages or items array.",
    };
  }

  const pages = parsePages(rawPages);
  return {
    ok: true,
    pages,
    theme: parseTheme(pages),
    chapters: deriveChapters(pages),
  };
}

/**
 * Entry point of the whole preview pipeline: exported JSON in, render model
 * out. Nothing downstream ever touches raw JSON again.
 */
export function parseBook(json: string): PreviewBookResult {
  if (!json || !json.trim()) {
    return { ok: true, pages: [], theme: parseTheme([]), chapters: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "The book JSON could not be parsed." };
  }

  // Some producers double-encode the payload (a JSON string inside JSON).
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { ok: false, reason: "The book JSON could not be parsed." };
    }
  }

  return parseBookValue(parsed);
}
