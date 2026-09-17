import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { requireUser, apiError, jsonBody, consumeLimit } from "@shared/server/api";
import { createBook } from "@shared/server/books";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const trash = new URL(request.url).searchParams.get("trash") === "true";
    const [books] = await db.execute<RowDataPacket[]>(`SELECT id,short_id,title,version,page_count,created_at,updated_at,deleted_at FROM books WHERE user_id=? AND deleted_at IS ${trash ? "NOT " : ""}NULL ORDER BY updated_at DESC LIMIT 500`, [user.id]);
    return NextResponse.json({ books });
  } catch(e) { return apiError(e); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request); await consumeLimit(user.id,"create-book",20);
    const body = await jsonBody(request);
    return NextResponse.json(await createBook(user.id,body.title,body.document),{status:201});
  } catch(e) { return apiError(e); }
}

