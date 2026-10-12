import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { ApiError, apiError, checkOrigin } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { ensureSalesPageSchema } from "@shared/server/salesPage";
import { bucket, putObject, removeObject } from "@shared/server/storage";
import { db } from "@shared/server/db";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin(request);
    if (!bucket) throw new ApiError(503, "Image upload is unavailable. You can paste an image URL instead.");
    const max = 8 * 1024 * 1024;
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Choose an image to upload.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const result = await reader.read(); if (result.done) break; size += result.value.length; if (size > max) { await reader.cancel(); throw new ApiError(413, "Choose an image smaller than 8 MB."); } chunks.push(result.value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("image");
    if (!(file instanceof File)) throw new ApiError(400, "Choose an image to upload.");
    let image: Buffer;
    try {
      const raster = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000 });
      const metadata = await raster.metadata();
      if (!["png", "jpeg", "webp", "gif", "heif", "avif"].includes(metadata.format || "")) throw new Error("Unsupported image.");
      image = await raster.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    }
    catch { throw new ApiError(400, "Choose a valid PNG, JPEG, WebP or other raster image."); }
    await ensureSalesPageSchema();
    const id = randomUUID();
    const key = await putObject(admin.id, "sales-page", image, "image/webp", "webp");
    try { await db.execute("INSERT INTO sales_page_media (id, storage_key, created_by) VALUES (?, ?, ?)", [id, key, admin.id]); }
    catch (error) { await removeObject(key).catch(() => {}); throw error; }
    return NextResponse.json({ url: `/api/sales-page/media/${id}` }, { status: 201 });
  } catch (error) { return apiError(error); }
}
