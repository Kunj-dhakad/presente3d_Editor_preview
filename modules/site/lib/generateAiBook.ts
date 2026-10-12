"use client";
import { recentDesigns, rememberDesign } from "./designHistory";

export type AiBookRequest = {
  prompt: string; pages: number; size: string;
  category?: string; tone?: string; audience?: string;
  /** Picks the book's design; a plain book when left out. */
  publicationType?: string;
  kind?: "ai" | "agent";
};
export type AiBookProgress = { stage: "planning" | "writing" | "saving"; done: number; total: number; title?: string };
export type CreatedBook = { id: string; short_id: string | null; title: string; pages: number; readPath?: string };

type Brief = { heading: string; summary: string; layout: string; chapter?: string };
type Outline = { title: string; subtitle: string; variant?: number; pages: Brief[] };
type Slide = { id: string };
export type BookExtras = { index: Slide[]; back: Slide };

export function assembleBook<S extends Slide>(slides: Map<number, S>, contentPages: number, extras: { index: S[]; back: S }) {
  const content = Array.from({ length: contentPages }, (_, i) => slides.get(i + 1));
  if (!slides.get(0) || content.some(page => !page)) throw new Error("Some pages are missing. Please try again.");
  return [slides.get(0)!, ...extras.index, ...(content as S[]), extras.back];
}

const BATCH = 8;

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data: Record<string, unknown> = {};
  try { data = await response.json(); } catch { /* reported below */ }
  if (!response.ok) throw new Error(String(data.error || data.message || "The AI could not finish this step. Please try again."));
  return data as T;
}

export async function generateAiBook(request: AiBookRequest, onProgress: (progress: AiBookProgress) => void): Promise<CreatedBook> {
  const options = { publicationType: request.publicationType, category: request.category, tone: request.tone, audience: request.audience };
  const total = request.pages + 1;
  onProgress({ stage: "planning", done: 0, total });

  const plan = await post<{ outline: Outline; photos: string[]; topic: string }>("/api/ai/outline", {
    prompt: request.prompt, pages: request.pages, size: request.size, ...options,
    avoid: recentDesigns(request.publicationType),
  });
  const outline = plan.outline;
  rememberDesign(request.publicationType, outline.variant);
  onProgress({ stage: "writing", done: 0, total, title: outline.title });

  const items = [
    { index: 0, brief: { heading: outline.title, summary: outline.subtitle, layout: "text" } },
    ...outline.pages.map((brief, i) => ({ index: i + 1, brief })),
  ];
  const batches: typeof items[] = [];
  for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));

  const slides = new Map<number, Slide>();
  let extras: BookExtras | undefined;
  await Promise.all(batches.map(async batch => {
    const result = await post<{ pages: { index: number; page: Slide }[]; extras?: BookExtras }>("/api/ai/pages", {
      outline, size: request.size, topic: plan.topic, photos: plan.photos, items: batch, ...options,
    });
    for (const entry of result.pages) if (entry.page?.id) slides.set(entry.index, entry.page);
    if (result.extras) extras = result.extras;
    onProgress({ stage: "writing", done: slides.size, total: items.length, title: outline.title });
  }));
  if (slides.size !== items.length || !extras) throw new Error("Some pages could not be written. Please try again.");
  const document = { slides: assembleBook(slides, outline.pages.length, extras) };

  onProgress({ stage: "saving", done: items.length, total: items.length, title: outline.title });
  const book = await post<{ id: string; short_id: string | null; title: string }>("/api/books", {
    title: outline.title,
    kind: request.kind ?? "ai",
    document,
  });
  let readPath: string | undefined;
  if (request.kind === "agent") {
    readPath = await post<{ path: string }>(`/api/books/${book.short_id ?? book.id}/share`, {}).then(share => share.path).catch(() => undefined);
  }
  return { ...book, pages: document.slides.length, readPath };
}
