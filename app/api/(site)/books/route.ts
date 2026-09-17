import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { requireUser, apiError, jsonBody, consumeLimit } from "@shared/server/api";
import { createBook, purgeBooks } from "@shared/server/books";
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


/** DELETE /api/books?trash=true empties the trash for good. */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (new URL(request.url).searchParams.get("trash") !== "true") return NextResponse.json({ error: "Only the trash can be emptied." }, { status: 400 });
    await consumeLimit(user.id, "empty-trash", 10);
    return NextResponse.json({ deleted: await purgeBooks(user.id) });
  } catch(e) { return apiError(e); }
}
