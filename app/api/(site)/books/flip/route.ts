import { NextResponse } from "next/server";
import { ApiError, apiError, consumeLimit, requireUser } from "@shared/server/api";
import { assertBookQuota } from "@shared/server/limits";
import { createBook } from "@shared/server/books";
import { flipDocument, pdfPictures, photoPictures } from "@shared/server/flip-book";
import { BOOK_PAGE_LIMIT } from "@shared/aiBook";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Creates a flip or photo book from one PDF or a set of photos (multipart form:
 * title, kind = "pdf" | "images", file / files).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await consumeLimit(user.id, "flip-book", 6, 600);
    await assertBookQuota(user.id);
    if (Number(request.headers.get("content-length")) > 60 * 1024 * 1024) throw new ApiError(413, "Upload up to 60 MB at a time.");
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    if (!title) throw new ApiError(400, "Give your book a name.");

    let pictures;
    if (form.get("kind") === "pdf") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size) throw new ApiError(400, "Choose a PDF to upload.");
      pictures = await pdfPictures(user.id, Buffer.from(await file.arrayBuffer()), file.name.replace(/\.pdf$/i, ""));
    } else {
      const files = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
      if (files.length > BOOK_PAGE_LIMIT) throw new ApiError(413, `Choose up to ${BOOK_PAGE_LIMIT} photos.`);
      pictures = await photoPictures(user.id, files);
    }

    const { slides } = flipDocument(pictures);
    const book = await createBook(user.id, title, { slides }, "flip");
    return NextResponse.json({ ...book, pages: slides.length }, { status: 201 });
  } catch (error) { return apiError(error); }
}
