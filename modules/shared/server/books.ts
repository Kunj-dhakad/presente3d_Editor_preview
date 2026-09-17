import { createHash, randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "./db";
import { ApiError } from "./api";
import { putObject, getObject, removeObject } from "./storage";
import { validateDocument, bookTitle, blankDocument } from "./document";
import { storeBookMedia } from "./book-media";
import { assertBookQuota } from "./limits";
import { isShortId, newShortId } from "@shared/bookUrl";
import { isBookKind, type BookKind, type BookStatus } from "@shared/bookKinds";
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
/** Fingerprint of page 1: the stored cover is current while it matches. */
function pageHash(document: { slides: unknown[] }) {
  return createHash("sha256").update(JSON.stringify(document.slides[0] ?? null)).digest("hex");
}

export async function createBook(userId: string, title: unknown, input: unknown = blankDocument(), kind: unknown = "ai") {
  await assertBookQuota(userId);
  const document = await storeBookMedia(userId, validateDocument(input));
  const name = bookTitle(title);
  const id = randomUUID();
  const shortId = await freeShortId();
  const key = await putObject(userId, "books", Buffer.from(JSON.stringify(document)), "application/json", "json");
  try {
    await db.execute("INSERT INTO books (id, short_id, user_id, title, document_key, page_count, kind, page_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id,shortId,userId,name,key,document.slides.length,isBookKind(kind) ? kind : "ai",pageHash(document)]);
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
    await conn.execute<ResultSetHeader>("UPDATE books SET document_key=?, version=version+1, page_count=?, page_hash=?, updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=?", [key,document.slides.length,pageHash(document),id,userId]);
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
    ? await db.query<RowDataPacket[]>("SELECT id, document_key, cover_key FROM books WHERE user_id=? AND deleted_at IS NOT NULL AND id IN (?)", [userId, ids.length ? ids : [""]])
    : await db.query<RowDataPacket[]>("SELECT id, document_key, cover_key FROM books WHERE user_id=? AND deleted_at IS NOT NULL", [userId]);
  if (!books.length) return 0;
  const bookIds = books.map(book => String(book.id));
  const [revisions] = await db.query<RowDataPacket[]>("SELECT document_key FROM book_revisions WHERE book_id IN (?)", [bookIds]);
  const keys = new Set<string>([
    ...books.map(book => String(book.document_key)),
    ...books.filter(book => book.cover_key).map(book => String(book.cover_key)),
    ...revisions.map(revision => String(revision.document_key)),
  ]);
  await db.query("DELETE FROM book_responses WHERE book_id IN (?)", [bookIds]);
  // Shares, revisions, views and ratings cascade from books.
  await db.query("DELETE FROM books WHERE user_id=? AND deleted_at IS NOT NULL AND id IN (?)", [userId, bookIds]);
  await Promise.all([...keys].map(key => removeObject(key).catch(() => {})));
  return books.length;
}

/* ------------------------------------------------------------------ covers */

/**
 * Stores a picture of page 1, made in the browser, as the book's cover. It is
 * resized to a small WebP and marked as matching the current page 1.
 */
export async function saveCover(id: string, userId: string, bytes: Buffer) {
  const book = await ownedBook(id, userId, true);
  let image: Buffer;
  try {
    image = await sharp(bytes, { limitInputPixels: 40_000_000 }).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { throw new ApiError(400, "The cover must be a PNG, JPEG or WebP image."); }
  const key = await putObject(userId, "covers", image, "image/webp", "webp");
  await db.execute("UPDATE books SET cover_key=?, cover_hash=page_hash WHERE id=? AND user_id=?", [key, book.id, userId]);
  if (book.cover_key) await removeObject(String(book.cover_key)).catch(() => {});
  return { cover: coverUrl(book, book.page_hash) };
}

export async function readCover(id: string, userId: string) {
  const book = await ownedBook(id, userId, true);
  if (!book.cover_key) throw new ApiError(404, "This book has no cover yet.");
  return getObject(String(book.cover_key));
}

/** The owner-only cover route; the query changes whenever the picture does, so caches refresh. */
export const coverUrl = (book: RowDataPacket, hash = book.cover_hash) => `/api/books/${book.short_id ?? book.id}/cover?v=${String(hash ?? "").slice(0, 12)}`;

/* ----------------------------------------------------------------- library */

export type LibraryBook = {
  id: string; short_id: string | null; title: string; version: number; page_count: number;
  kind: BookKind; status: BookStatus; lead_form: boolean; share_token: string | null;
  cover: string | null; cover_stale: boolean;
  created_at: string; updated_at: string; published_at: string | null;
  stats: { views: number; readers: number; leads: number; rating: number; ratings: number; avg_pages: number; completion: number };
};

/** The library list with each book's status, cover and reader numbers. */
export async function listBooks(userId: string, trash: boolean): Promise<LibraryBook[]> {
  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT b.id, b.short_id, b.title, b.version, b.page_count, b.kind, b.lead_form, b.cover_key, b.cover_hash, b.page_hash,
      b.created_at, b.updated_at, b.published_at, s.short_token,
      (SELECT COUNT(*) FROM book_views v WHERE v.book_id = b.id) AS views,
      (SELECT COUNT(DISTINCT v.visitor) FROM book_views v WHERE v.book_id = b.id) AS readers,
      (SELECT AVG(v.max_page) FROM book_views v WHERE v.book_id = b.id) AS avg_pages,
      (SELECT AVG(v.completed) FROM book_views v WHERE v.book_id = b.id) AS completion,
      (SELECT COUNT(*) FROM book_responses r WHERE r.book_id = b.id
         AND JSON_UNQUOTE(JSON_EXTRACT(r.data, '$.kind')) IN ('lead', 'contact-form')) AS leads,
      (SELECT AVG(g.stars) FROM book_ratings g WHERE g.book_id = b.id) AS rating,
      (SELECT COUNT(*) FROM book_ratings g WHERE g.book_id = b.id) AS ratings
    FROM books b LEFT JOIN book_shares s ON s.book_id = b.id
    WHERE b.user_id = ? AND b.deleted_at IS ${trash ? "NOT " : ""}NULL
    ORDER BY b.updated_at DESC LIMIT 500`, [userId]);
  const iso = (value: unknown) => value ? new Date(value as string).toISOString() : null;
  return rows.map(row => ({
    id: String(row.id), short_id: row.short_id ? String(row.short_id) : null, title: String(row.title),
    version: Number(row.version), page_count: Number(row.page_count),
    kind: isBookKind(row.kind) ? row.kind : "ai",
    status: row.short_token ? "active" : row.published_at ? "private" : "draft",
    lead_form: Boolean(row.lead_form), share_token: row.short_token ? String(row.short_token) : null,
    cover: row.cover_key ? coverUrl(row) : null,
    cover_stale: !row.cover_key || row.cover_hash !== row.page_hash,
    created_at: iso(row.created_at)!, updated_at: iso(row.updated_at)!, published_at: iso(row.published_at),
    stats: {
      views: Number(row.views), readers: Number(row.readers), leads: Number(row.leads),
      rating: Math.round(Number(row.rating ?? 0) * 10) / 10, ratings: Number(row.ratings),
      avg_pages: Math.round(Number(row.avg_pages ?? 0) * 10) / 10,
      completion: Math.round(Number(row.completion ?? 0) * 100),
    },
  }));
}
