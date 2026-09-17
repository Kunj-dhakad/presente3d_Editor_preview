import type { PreviewBlock } from "./blocks";

/** One rendered page of the book. */
export interface PreviewPage {
  id: string;
  index: number;
  width: number;
  height: number;
  background?: string;
  blocks: PreviewBlock[];
}

/** A chapter derived from the pages that carry a "chapter" text block. */
export interface ChapterEntry {
  blockId: string;
  pageId: string;
  title: string;
  subtitle?: string;
  startPage: number;
  endPage: number;
  displayTitle: string;
}

/** Page geometry + palette the reader chrome sizes itself against. */
export interface PreviewTheme {
  pageWidth: number;
  pageHeight: number;
  background: string;
}

export interface PreviewBook {
  pages: PreviewPage[];
  theme: PreviewTheme;
  chapters: ChapterEntry[];
}

/**
 * A book that failed to parse. Kept as a value rather than a thrown error so
 * the reader can show the malformed-JSON panel instead of unmounting.
 */
export interface PreviewBookError {
  ok: false;
  reason: string;
}

export type PreviewBookResult = ({ ok: true } & PreviewBook) | PreviewBookError;
