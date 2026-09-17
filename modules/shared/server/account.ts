import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { removeObject } from "./storage";
import { planOf, type Plan } from "@shared/plans";

// Kept free of `./api` and `@shared/auth` imports: lib/auth.ts uses these helpers
// in its hooks, so importing either here would create a cycle.

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean).includes(email.toLowerCase());
}

export const mailEnabled = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

export type AccountStatus = { plan: Plan; suspended: boolean; suspendReason: string | null };

export async function accountStatus(userId: string): Promise<AccountStatus> {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT plan, suspended_at, suspend_reason FROM user_plans WHERE user_id=?", [userId]);
  const row = rows[0];
  return { plan: planOf(row?.plan), suspended: Boolean(row?.suspended_at), suspendReason: row?.suspend_reason ?? null };
}

export const utcDayBucket = () => Math.floor(Date.now() / 86400000);

/** Hits recorded by consumeLimit() for the current window, without adding one. */
export async function windowHits(userId: string, scope: string, seconds: number) {
  const key = `${userId}:${scope}:${Math.floor(Date.now() / (seconds * 1000))}`;
  const [rows] = await db.execute<RowDataPacket[]>("SELECT hits FROM usage_limits WHERE bucket_key=?", [key]);
  return Number(rows[0]?.hits || 0);
}

export async function storageUsed(userId: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT COALESCE(SUM(bytes),0) AS total FROM assets WHERE user_id=?", [userId]);
  return Number(rows[0].total);
}

export async function activeBookCount(userId: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM books WHERE user_id=? AND deleted_at IS NULL", [userId]);
  return Number(rows[0].n);
}

export async function accountUsage(userId: string) {
  const [status, books, storage, aiToday, videoToday, progress] = await Promise.all([
    accountStatus(userId), activeBookCount(userId), storageUsed(userId),
    windowHits(userId, "ai-daily", 86400), windowHits(userId, "video-daily", 86400),
    db.execute<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM books WHERE user_id=?) AS books_created,
      (SELECT COUNT(*) FROM books b JOIN book_shares s ON s.book_id=b.id WHERE b.user_id=?) AS shared,
      (SELECT COUNT(*) FROM assets WHERE user_id=? AND kind IN ('images','videos')) AS uploads,
      (SELECT COUNT(*) FROM assets WHERE user_id=? AND kind='exports') AS exports,
      (SELECT COUNT(*) FROM books WHERE user_id=? AND version > 1) AS edited`, [userId, userId, userId, userId, userId]),
  ]);
  const p = progress[0][0];
  return {
    plan: status.plan, suspended: status.suspended,
    usage: { books, storageBytes: storage, aiToday, videoToday },
    checklist: {
      createdBook: Number(p.books_created) > 0, editedBook: Number(p.edited) > 0, uploadedMedia: Number(p.uploads) > 0,
      exported: Number(p.exports) > 0, shared: Number(p.shared) > 0,
    },
  };
}

/** Removes everything the app stores for a user. Auth rows are removed by better-auth. */
export async function deleteUserData(userId: string) {
  const [books] = await db.execute<RowDataPacket[]>("SELECT id, document_key FROM books WHERE user_id=?", [userId]);
  const [assets] = await db.execute<RowDataPacket[]>("SELECT object_key FROM assets WHERE user_id=?", [userId]);
  const keys: string[] = [...books.map(b => b.document_key), ...assets.map(a => a.object_key)];
  if (books.length) {
    const ids = books.map(b => b.id);
    const [revisions] = await db.query<RowDataPacket[]>("SELECT document_key FROM book_revisions WHERE book_id IN (?)", [ids]);
    keys.push(...revisions.map(r => r.document_key));
    await db.query("DELETE FROM book_responses WHERE book_id IN (?)", [ids]);
  }
  // Shares and revisions cascade from books.
  await db.execute("DELETE FROM books WHERE user_id=?", [userId]);
  await db.execute("DELETE FROM assets WHERE user_id=?", [userId]);
  await db.execute("DELETE FROM ai_jobs WHERE user_id=?", [userId]);
  await db.execute("DELETE FROM usage_limits WHERE user_id=?", [userId]);
  await db.execute("DELETE FROM user_plans WHERE user_id=?", [userId]);
  await db.execute("UPDATE contact_messages SET user_id=NULL WHERE user_id=?", [userId]);
  for (const key of new Set(keys)) await removeObject(key).catch(() => {});
}
