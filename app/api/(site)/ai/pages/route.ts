import { NextResponse } from "next/server";
import { ApiError, apiError, jsonBody, requireUser } from "@shared/server/api";
import { consumeAi } from "@shared/server/limits";
import { BOOK_LANGUAGE } from "@shared/aiBook";
import { backCover, chapterMarks, checkWritingOptions, contentPage, coverPage, designOf, indexPageCount, indexPages, writePage, LAYOUTS, PAGE_BATCH, PAGE_SIZES, MAX_PAGES, type Brief, type Layout, type Outline, type SizeId } from "@shared/server/ai-book";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await jsonBody(request, 128 * 1024);
    const options = checkWritingOptions(body);
    const sent = body.outline as Outline;
    if (!sent || typeof sent.title !== "string" || !Array.isArray(sent.pages)) throw new ApiError(400, "Send the outline from the previous step.");
    const outline: Outline = { ...sent, style: options.publicationType };
    const size: SizeId = Object.hasOwn(PAGE_SIZES, body.size) ? body.size : "portrait";
    const language = BOOK_LANGUAGE;
    const topic = String(body.topic || outline.title).slice(0, 2000);
    const photos: string[] = Array.isArray(body.photos) ? body.photos.filter((p: unknown) => typeof p === "string" && (p.startsWith("https://") || /^\/api\/assets\/[a-zA-Z0-9-]+\/file$/.test(p))).slice(0, 20) : [];

    if (outline.pages.length > MAX_PAGES) throw new ApiError(400, `A book can have at most ${MAX_PAGES} pages.`);
    const chapters = chapterMarks(outline.pages);
    const pagesBeforeContent = 1 + indexPageCount(outline, size);

    const items = (Array.isArray(body.items) ? body.items : []).slice(0, PAGE_BATCH) as { index: number; brief: Brief }[];
    if (!items.length) throw new ApiError(400, "No pages were requested.");
    if (items.some(item => !Number.isInteger(item?.index) || item.index < 0 || item.index > MAX_PAGES) || new Set(items.map(item => item.index)).size !== items.length) throw new ApiError(400, "Invalid page indexes.");

    const writes = items.filter(item => item.index > 0);
    if (writes.length) await consumeAi(user.id, writes.length);

    const pages = await Promise.all(items.map(async item => {
      if (item.index === 0) return { index: 0, page: coverPage(outline, size, photos[0]) };
      const brief: Brief = {
        heading: String(item.brief?.heading || "").slice(0, 90),
        summary: String(item.brief?.summary || topic).slice(0, 300),
        layout: (LAYOUTS.includes(String(item.brief?.layout) as Layout) ? item.brief.layout : designOf(outline.style).cycle[0]) as Layout,
        chapter: String(item.brief?.chapter || "").slice(0, 80),
      };
      const copy = await writePage(topic, brief, language, options);
      const pageNumber = pagesBeforeContent + item.index;
      return { index: item.index, page: contentPage(copy, brief.layout, outline, size, item.index, photos, pageNumber, chapters[item.index - 1] ?? null) };
    }));

    const extras = items.some(item => item.index === 0)
      ? { index: indexPages(outline, size), back: backCover(outline, size, photos[photos.length - 1]) }
      : undefined;
    return NextResponse.json({ pages, extras }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
