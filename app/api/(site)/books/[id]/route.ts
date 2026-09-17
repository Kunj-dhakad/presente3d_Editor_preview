import { NextResponse } from "next/server";
import { db } from "@shared/server/db";
import { requireUser, apiError, jsonBody, ApiError } from "@shared/server/api";
import { ownedBook, readDocument, saveBook, createBook } from "@shared/server/books";
import { bookTitle } from "@shared/server/document";
import { assertBookQuota } from "@shared/server/limits";
type Context = { params: Promise<{id: string}> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request); const {id} = await context.params;
    const book = await ownedBook(id,user.id);
    return NextResponse.json({ id:book.id, short_id:book.short_id, title:book.title, version:book.version, document: await readDocument(book.document_key) }, {headers:{"Cache-Control":"private, no-store"}});
  } catch(e) { return apiError(e); }
}
export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser(request); const {id} = await context.params;
    const body = await jsonBody(request);
    return NextResponse.json(await saveBook(id,user.id,body.document,body.version));
  } catch(e) { return apiError(e); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(request); const {id} = await context.params;
    const body = await jsonBody(request,4096); const book = await ownedBook(id,user.id,true);
    if (body.action === "duplicate") return NextResponse.json(await createBook(user.id,`${book.title.slice(0,150)} (copy)`,await readDocument(book.document_key)),{status:201});
    if (body.action === "restore") { if (book.deleted_at) await assertBookQuota(user.id); await db.execute("UPDATE books SET deleted_at=NULL, updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=?",[book.id,user.id]); }
    else if (body.title !== undefined) await db.execute("UPDATE books SET title=?, updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=?",[bookTitle(body.title),book.id,user.id]);
    else throw new ApiError(400,"Unknown book action.");
    return NextResponse.json({success:true});
  } catch(e) { return apiError(e); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request); const {id} = await context.params;
    const bookId = String((await ownedBook(id,user.id)).id);
    await db.execute("UPDATE books SET deleted_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=?",[bookId,user.id]);
    await db.execute("DELETE FROM book_shares WHERE book_id=?",[bookId]);
    return NextResponse.json({success:true});
  } catch(e) { return apiError(e); }
}

