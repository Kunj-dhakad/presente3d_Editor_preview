import { NextResponse } from "next/server";
import { ApiError, apiError, consumeLimit, jsonBody, requireUser } from "@shared/server/api";
import { extractPdfSource, extractUrlSource } from "@shared/server/book-source";
import { PDF_SIZE_LIMIT } from "@shared/aiBook";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await consumeLimit(user.id, "book-source", 12);
    let source;
    if (request.headers.get("content-type")?.split(";")[0] === "application/pdf") {
      if (Number(request.headers.get("content-length")) > PDF_SIZE_LIMIT) throw new ApiError(413, "Choose a PDF smaller than 10 MB.");
      const reader = request.body?.getReader();
      if (!reader) throw new ApiError(400, "Choose a PDF to upload.");
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > PDF_SIZE_LIMIT) { await reader.cancel(); throw new ApiError(413, "Choose a PDF smaller than 10 MB."); }
        chunks.push(value);
      }
      let name = "Imported PDF";
      try { name = decodeURIComponent(request.headers.get("x-file-name") || name).slice(0, 160); } catch { /* use the fallback */ }
      source = await extractPdfSource(Buffer.concat(chunks), name);
    } else {
      const body = await jsonBody(request, 8192);
      source = await extractUrlSource(body.url);
    }
    return NextResponse.json(source, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
