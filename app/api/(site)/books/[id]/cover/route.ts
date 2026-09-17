import { NextResponse } from "next/server";
import { requireUser, apiError, consumeLimit, ApiError } from "@shared/server/api";
import { readCover, saveCover } from "@shared/server/books";
type Context = { params: Promise<{ id: string }> };

const MAX_BYTES = 4 * 1024 * 1024;

/** The book's cover picture (page 1), for its owner. */
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request); const { id } = await context.params;
    const object = await readCover(id, user.id);
    const bytes = Buffer.from(await object.Body!.transformToByteArray());
    // The URL carries a version, so the browser may keep it.
    return new NextResponse(bytes, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch (e) { return apiError(e); }
}

/** Saves a picture of page 1 that the browser rendered. Body: the image bytes. */
export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser(request); const { id } = await context.params;
    await consumeLimit(user.id, "book-cover", 60);
    const type = request.headers.get("content-type") || "";
    if (!/^image\/(png|jpeg|webp)$/.test(type)) throw new ApiError(415, "Send a PNG, JPEG or WebP image.");
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new ApiError(413, "The cover image is too large.");
    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) throw new ApiError(413, "The cover image is too large.");
    return NextResponse.json(await saveCover(id, user.id, bytes));
  } catch (e) { return apiError(e); }
}
