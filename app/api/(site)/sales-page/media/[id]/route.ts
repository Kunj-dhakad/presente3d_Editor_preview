import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { getObject } from "@shared/server/storage";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  try {
    const [rows] = await db.query<RowDataPacket[]>("SELECT storage_key FROM sales_page_media WHERE id=?", [id]);
    if (!rows[0]) return new NextResponse(null, { status: 404 });
    const image = await getObject(rows[0].storage_key);
    if (!image.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(image.Body.transformToWebStream(), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
