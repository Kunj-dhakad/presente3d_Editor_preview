import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { ApiError, consumeLimit } from "./api";

/**
 * Reader numbers for published books.
 *
 * A view is a reading session, as analytics tools count them: the same browser
 * coming back within 30 minutes continues its view instead of adding one.
 * Browsers are told apart by a random id kept in the reader's local storage;
 * only its hash (salted with the book) is stored.
 */
export const SESSION_MINUTES = 30;

/** A visitor id is a random UUID the reader page created. */
export function visitorKey(bookId: string, visitor: unknown) {
  if (typeof visitor !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(visitor)) throw new ApiError(400, "Invalid reader id.");
  return createHash("sha256").update(`${bookId}:${visitor}`).digest("hex");
}

const whole = (value: unknown, max: number) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.min(Math.max(number, 1), max) : 1;
};

/** Starts or continues a view and records the furthest page reached. */
export async function recordView(book: { id: string; pages: number }, visitor: unknown, page: unknown, total: unknown) {
  const key = visitorKey(book.id, visitor);
  await consumeLimit(key, "reader-views", 120);
  const pages = whole(total, Math.max(book.pages, 1) + 50);
  const reached = whole(page, pages);
  const completed = reached >= pages ? 1 : 0;
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT id FROM book_views WHERE book_id=? AND visitor=? AND last_seen_at > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${SESSION_MINUTES} MINUTE)
     ORDER BY last_seen_at DESC LIMIT 1`, [book.id, key]);
  if (rows.length) {
    await db.execute(
      "UPDATE book_views SET max_page=GREATEST(max_page, ?), total_pages=?, completed=GREATEST(completed, ?), last_seen_at=UTC_TIMESTAMP(3) WHERE id=?",
      [reached, pages, completed, rows[0].id]);
    return { view: String(rows[0].id), started: false };
  }
  const id = randomUUID();
  await db.execute("INSERT INTO book_views (id, book_id, visitor, max_page, total_pages, completed) VALUES (?, ?, ?, ?, ?, ?)",
    [id, book.id, key, reached, pages, completed]);
  return { view: id, started: true };
}

/** One rating per reader per book; rating again replaces the earlier one. */
export async function rateBook(bookId: string, visitor: unknown, stars: unknown, comment: unknown) {
  const key = visitorKey(bookId, visitor);
  await consumeLimit(key, "reader-rating", 10);
  const value = Number(stars);
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new ApiError(400, "Choose between 1 and 5 stars.");
  const note = typeof comment === "string" ? comment.replace(/\s+/g, " ").trim().slice(0, 500) : "";
  await db.execute(
    "INSERT INTO book_ratings (id, book_id, visitor, stars, comment) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE stars=VALUES(stars), comment=VALUES(comment), created_at=UTC_TIMESTAMP(3)",
    [randomUUID(), bookId, key, value, note || null]);
}

/** Checks the reader lead form: name and email are required, phone is optional. */
export function checkLead(answers: unknown): Record<string, string> {
  const input = (answers && typeof answers === "object" ? answers : {}) as Record<string, unknown>;
  const text = (value: unknown, max: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const name = text(input.Name, 100);
  const email = text(input.Email, 254).toLowerCase();
  const phone = text(input.Phone, 30);
  if (name.length < 2) throw new ApiError(400, "Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ApiError(400, "Enter a valid email address.");
  if (phone && !/^[+\d][\d\s().-]{5,}$/.test(phone)) throw new ApiError(400, "Enter a valid phone number, or leave it empty.");
  const lead: Record<string, string> = { Name: name, Email: email };
  if (phone) lead.Phone = phone;
  return lead;
}

/* ------------------------------------------------------------ responses */

export const RESPONSE_KINDS = ["lead", "contact-form", "quiz", "question"] as const;
export type ResponseKind = (typeof RESPONSE_KINDS)[number];

const clip = (value: unknown, max: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/**
 * A reader response as it is stored: the form's answers as label → text, who
 * sent it (when they told us), and a per-book reader key that links their
 * lead form, quiz answers, questions and rating together.
 */
export function checkResponse(bookId: string, body: Record<string, unknown>) {
  const kind = String(body.kind) as ResponseKind;
  if (!RESPONSE_KINDS.includes(kind)) throw new ApiError(400, "Invalid response.");
  const raw = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : null;
  if (!raw) throw new ApiError(400, "Invalid response.");

  let answers: Record<string, string> = {};
  if (kind === "lead") answers = checkLead(raw);
  else {
    for (const [label, value] of Object.entries(raw).slice(0, 40)) {
      const key = clip(label, 200);
      if (key) answers[key] = clip(typeof value === "number" || typeof value === "boolean" ? String(value) : value, 2000);
    }
    if (!Object.values(answers).some(Boolean)) throw new ApiError(400, "The response is empty.");
  }

  const readerInput = body.reader && typeof body.reader === "object" ? body.reader as Record<string, unknown> : {};
  const email = clip(readerInput.email, 254).toLowerCase();
  const reader = {
    name: clip(kind === "lead" ? answers.Name : readerInput.name, 100) || undefined,
    email: (kind === "lead" ? answers.Email : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "") || undefined,
    phone: clip(kind === "lead" ? answers.Phone : readerInput.phone, 30) || undefined,
  };

  const scoreInput = body.score && typeof body.score === "object" ? body.score as Record<string, unknown> : null;
  const total = Math.floor(Number(scoreInput?.total));
  const correct = Math.floor(Number(scoreInput?.correct));
  const score = kind === "quiz" && Number.isFinite(total) && total > 0 && Number.isFinite(correct)
    ? { correct: Math.min(Math.max(correct, 0), total), total: Math.min(total, 500) }
    : undefined;

  return {
    kind,
    title: clip(body.title, 160) || undefined,
    // Stored as [label, value] pairs: MySQL's JSON type reorders object keys,
    // and the form's own order is what the author expects to read.
    answers: Object.entries(answers),
    score,
    reader,
    visitor: body.visitor ? visitorKey(bookId, body.visitor) : undefined,
  };
}
