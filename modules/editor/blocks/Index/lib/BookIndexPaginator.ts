import type { TextData } from "@editor/store/editorStore";
import type { ChapterEntry } from "./ChapterManager";

export type BookIndexPage = { page: number; entries: ChapterEntry[] };

/** Computes whole-row TOC pages from the index element's printable rectangle. */
export function paginateBookIndex(chapters: ChapterEntry[], data: TextData): BookIndexPage[] {
  const fontSize = Number(data.fontSize) || 14;
  const lineHeight = typeof data.lineHeight === "number" ? data.lineHeight : 1.4;
  const rowHeight = Math.max(16, fontSize * lineHeight) + (data.tocSpacing ?? 8);
  const headerHeight = fontSize * lineHeight * 1.25 + (data.tocSpacing ?? 8) * 1.5;
  const printableHeight = Math.max(1, data.height - (data.tocMarginTop ?? 0) - (data.tocMarginBottom ?? 0));
  // At least one entry is retained per page even for an intentionally tiny box.
  const perPage = Math.max(1, Math.floor(Math.max(0, printableHeight - headerHeight) / rowHeight));
  const pages: BookIndexPage[] = [];
  for (let start = 0; start < chapters.length; start += perPage) {
    pages.push({ page: pages.length, entries: chapters.slice(start, start + perPage) });
  }
  return pages.length ? pages : [{ page: 0, entries: [] }];
}
