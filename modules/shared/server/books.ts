import { randomBytes, randomUUID } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "./db";
import { ApiError } from "./api";
import { putObject, getObject, removeObject } from "./storage";
import { validateDocument, bookTitle, blankDocument } from "./document";
import { storeBookMedia } from "./book-media";
import { assertBookQuota } from "./limits";
import { isShortId, newShortId } from "@shared/bookUrl";
/** Accepts either the short link id from the URL or the internal uuid. */
export async function ownedBook(id: string, userId: string, includeTrash = false) {
  const column = isShortId(id) ? "short_id" : "id";
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT * FROM books WHERE ${column} = ? AND user_id = ? ${includeTrash ? "" : "AND deleted_at IS NULL"}`, [id,userId]);
  if (!rows.length) throw new ApiError(404, "Book not found.");
  return rows[0];
}

/** A short id nobody else is using yet. */
async function freeShortId() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = newShortId(randomBytes);
    const [taken] = await db.execute<RowDataPacket[]>("SELECT 1 FROM books WHERE short_id = ?", [candidate]);
    if (!taken.length) return candidate;
  }
  throw new ApiError(503, "Could not create the book. Please try again.");
}
export async function readDocument(key: string) {
  const object = await getObject(key);
  if (!object.Body) throw new Error("Book document is unavailable.");
  return JSON.parse(await object.Body.transformToString());
}
export async function createBook(userId: string, title: unknown, input: unknown = blankDocument()) {
  await assertBookQuota(userId);
  const document = await storeBookMedia(userId, validateDocument(input));
  const name = bookTitle(title);
  const id = randomUUID();
  const shortId = await freeShortId();
  const key = await putObject(userId, "books", Buffer.from(JSON.stringify(document)), "application/json", "json");
  try {
    await db.execute("INSERT INTO books (id, short_id, user_id, title, document_key, page_count) VALUES (?, ?, ?, ?, ?, ?)", [id,shortId,userId,name,key,document.slides.length]);
  } catch (e) { await removeObject(key).catch(() => {}); throw e; }
  return { id, short_id: shortId, title: name, version: 1 };
}
export async function saveBook(id: string, userId: string, input: unknown, version: unknown) {
  if (!Number.isInteger(version) || Number(version) < 1) throw new ApiError(400, "The document version is required.");
  id = String((await ownedBook(id,userId)).id);
  const document = await storeBookMedia(userId, validateDocument(input));
  const key = await putObject(userId,"books",Buffer.from(JSON.stringify(document)),"application/json","json");
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<RowDataPacket[]>("SELECT * FROM books WHERE id = ? AND user_id = ? AND deleted_at IS NULL FOR UPDATE", [id,userId]);
    if (!rows.length) throw new ApiError(404,"Book not found.");
    const current = rows[0];
    if (current.version !== version) throw new ApiError(409,"This book changed in another tab. Download your draft, then reload to avoid overwriting changes.");
    await conn.execute("INSERT INTO book_revisions (id,book_id,document_key,version) VALUES (?,?,?,?)", [randomUUID(),id,current.document_key,current.version]);
    await conn.execute<ResultSetHeader>("UPDATE books SET document_key=?, version=version+1, page_count=?, updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=?", [key,document.slides.length,id,userId]);
    await conn.commit();
    return { version: Number(version) + 1, document };
  } catch (e) {
    await conn.rollback(); await removeObject(key).catch(() => {}); throw e;
  } finally { conn.release(); }
}

/**
 * Deletes books from the trash for good: the rows, their revisions, shares and
 * form responses, and the stored documents. Only books already in the trash are
 * touched; with no ids, the whole trash is emptied. Media stays in the library.
 */
export async function purgeBooks(userId: string, ids?: string[]) {
  const [books] = ids
    ? await db.query<RowDataPacket[]>("SELECT id, document_key FROM books WHERE user_id=? AND deleted_at IS NOT NULL AND id IN (?)", [userId, ids.length ? ids : [""]])
    : await db.query<RowDataPacket[]>("SELECT id, document_key FROM books WHERE user_id=? AND deleted_at IS NOT NULL", [userId]);
  if (!books.length) return 0;
  const bookIds = books.map(book => String(book.id));
  const [revisions] = await db.query<RowDataPacket[]>("SELECT document_key FROM book_revisions WHERE book_id IN (?)", [bookIds]);
  const keys = new Set<string>([...books.map(book => String(book.document_key)), ...revisions.map(revision => String(revision.document_key))]);
  await db.query("DELETE FROM book_responses WHERE book_id IN (?)", [bookIds]);
  // Shares and revisions cascade from books.
  await db.query("DELETE FROM books WHERE user_id=? AND deleted_at IS NOT NULL AND id IN (?)", [userId, bookIds]);
  await Promise.all([...keys].map(key => removeObject(key).catch(() => {})));
  return books.length;
}
