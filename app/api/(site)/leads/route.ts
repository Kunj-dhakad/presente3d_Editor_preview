import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { requireUser, apiError } from "@shared/server/api";
import type { Lead, LeadReader as Reader } from "@shared/leads";

const LIMIT = 1000;
const TITLES: Record<string, string> = { lead: "Lead form", "contact-form": "Contact form", quiz: "Quiz", question: "Question", review: "Rating" };

/** Any stored answer value as plain text. */
const text = (value: unknown): string => typeof value === "string" ? value : Array.isArray(value) ? value.map(text).join(", ") : value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

/**
 * Everything readers sent from the author's published books — lead forms,
 * contact forms, quizzes, questions and ratings — newest first, with the
 * reader's name wherever they gave it in any of their answers to that book.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const [responses] = await db.execute<RowDataPacket[]>(
      `SELECT r.id, r.data, r.created_at, b.id AS book_uuid, COALESCE(b.short_id, b.id) AS book_id, b.title AS book_title
       FROM book_responses r JOIN books b ON b.id = r.book_id
       WHERE b.user_id = ? AND b.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT ${LIMIT}`, [user.id]);
    const [ratings] = await db.execute<RowDataPacket[]>(
      `SELECT g.id, g.stars, g.comment, g.visitor, g.created_at, b.id AS book_uuid, COALESCE(b.short_id, b.id) AS book_id, b.title AS book_title
       FROM book_ratings g JOIN books b ON b.id = g.book_id
       WHERE b.user_id = ? AND b.deleted_at IS NULL ORDER BY g.created_at DESC LIMIT ${LIMIT}`, [user.id]);

    const parsed = responses.map(row => ({ row, data: (typeof row.data === "string" ? JSON.parse(row.data) : row.data) as Record<string, unknown> }));

    // Who each reader is, per book, from whichever answer they gave a name or email in.
    const known = new Map<string, Reader>();
    for (const { row, data } of [...parsed].reverse()) {
      const visitor = typeof data.visitor === "string" ? data.visitor : "";
      if (!visitor) continue;
      const reader = readerOf(data);
      if (!reader.name && !reader.email) continue;
      const key = `${row.book_uuid}:${visitor}`;
      known.set(key, { ...known.get(key), ...Object.fromEntries(Object.entries(reader).filter(([, v]) => v)) });
    }

    const leads: Lead[] = parsed.map(({ row, data }) => {
      const kind = (["lead", "contact-form", "quiz", "question"].includes(String(data.kind)) ? data.kind : "contact-form") as Lead["kind"];
      const answers = answerList(data.answers);
      const visitor = typeof data.visitor === "string" ? data.visitor : "";
      const reader = { ...(visitor ? known.get(`${row.book_uuid}:${visitor}`) : undefined), ...clean(readerOf(data)) };
      const score = data.score && typeof data.score === "object" ? data.score as Lead["score"] : undefined;
      return {
        id: String(row.id), kind, title: typeof data.title === "string" && data.title ? data.title : TITLES[kind],
        answers, score, reader,
        book: { id: String(row.book_id), title: String(row.book_title) },
        created_at: new Date(row.created_at).toISOString(),
      };
    });

    for (const row of ratings) {
      const stars = Number(row.stars);
      leads.push({
        id: String(row.id), kind: "review", title: TITLES.review, stars,
        answers: row.comment ? [["Comment", String(row.comment)]] : [],
        reader: known.get(`${row.book_uuid}:${row.visitor}`) ?? {},
        book: { id: String(row.book_id), title: String(row.book_title) },
        created_at: new Date(row.created_at).toISOString(),
      });
    }
    leads.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ leads: leads.slice(0, LIMIT) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

/** Answers as ordered [label, value] pairs; older responses stored an object. */
function answerList(value: unknown): [string, string][] {
  if (Array.isArray(value)) return value.filter(Array.isArray).map(([label, answer]) => [text(label), text(answer)]);
  if (value && typeof value === "object") return Object.entries(value).map(([label, answer]) => [label, text(answer)]);
  return [];
}

/** Name / email from a response: its reader block, or the answers of older lead forms. */
function readerOf(data: Record<string, unknown>): Reader {
  const reader = data.reader && typeof data.reader === "object" ? data.reader as Reader : {};
  const answers: Record<string, unknown> = Object.fromEntries(answerList(data.answers));
  const pick = (...keys: string[]) => keys.map(key => answers[key]).find(value => typeof value === "string" && value.trim()) as string | undefined;
  return {
    name: reader.name || (data.kind === "lead" ? pick("Name", "name") : undefined),
    email: reader.email || (data.kind === "lead" ? pick("Email", "email") : undefined),
    phone: reader.phone || (data.kind === "lead" ? pick("Phone", "phone") : undefined),
  };
}

const clean = (reader: Reader) => Object.fromEntries(Object.entries(reader).filter(([, value]) => value)) as Reader;
