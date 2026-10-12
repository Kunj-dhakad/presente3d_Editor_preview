import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { removeObject } from "./storage";
import { planOf, type Plan } from "@shared/plans";
import { checkForPackage, type UserPackage } from "./bms";
import { UNLIMITED as UNLIMITED_VALUE } from "@shared/bms";

// Kept free of `./api` and `@shared/auth` imports: lib/auth.ts uses these helpers
// in its hooks, so importing either here would create a cycle.


export const mailEnabled = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

export type AccountStatus = { plan: Plan; suspended: boolean; suspendReason: string | null; account: UserPackage };

/**
 * Where a package field ends up in the shape the app has always read. A field
 * no package grants is nothing; "unlimited" is a number nothing reaches.
 */
const UNLIMITED = Number.MAX_SAFE_INTEGER;
const allowance = (account: UserPackage, condition_val: string, fallback: number) => {
  const value = account.fields[condition_val]?.value;
  if (value === undefined || value === null) return account.package_id ? 0 : fallback;
  return value === UNLIMITED_VALUE ? UNLIMITED : Number(value);
};

/**
 * The account's plan, its limits and whether it is suspended.
 *
 * The plan comes from the packages the customer has bought (Administration owns
 * those); an account with none falls back to the free plan the app ships with,
 * which is what a fresh install has before its packages are seeded.
 */
export async function accountStatus(userId: string): Promise<AccountStatus> {
  const [[rows], account] = await Promise.all([
    db.execute<RowDataPacket[]>("SELECT plan, suspended_at, suspend_reason FROM user_plans WHERE user_id=?", [userId]),
    checkForPackage(userId),
  ]);
  const row = rows[0];
  const fallback = planOf(row?.plan);
  const plan: Plan = account.package_id
    ? {
      ...fallback,
      id: fallback.id, name: account.title ?? fallback.name,
      price: account.price ? `$${account.price.toFixed(account.price % 1 ? 2 : 0)}` : "$0",
      period: account.period === "once" ? "one time" : `per ${account.period}`,
      limits: {
        books: allowance(account, "books", fallback.limits.books),
        aiDaily: allowance(account, "ai_daily", fallback.limits.aiDaily),
        videoDaily: allowance(account, "video_daily", fallback.limits.videoDaily),
        storageBytes: allowance(account, "storage_bytes", fallback.limits.storageBytes),
      },
    }
    : fallback;
  return { plan, suspended: Boolean(row?.suspended_at), suspendReason: row?.suspend_reason ?? null, account };
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
    features: status.account.features,
    packages: status.account.purchases.map(purchase => ({
      id: purchase.id, package_id: purchase.package_id, title: purchase.title, status: purchase.status,
      add_time: purchase.add_time, expire_time: purchase.expire_time, source: purchase.source,
    })),
    usage: { books, storageBytes: storage, aiToday, videoToday },
    checklist: {
      createdBook: Number(p.books_created) > 0, editedBook: Number(p.edited) > 0, uploadedMedia: Number(p.uploads) > 0,
      exported: Number(p.exports) > 0, shared: Number(p.shared) > 0,
    },
  };
}

/** Removes everything the app stores for a user. Auth rows are removed by better-auth. */
export async function deleteUserData(userId: string) {
  const [books] = await db.execute<RowDataPacket[]>("SELECT id, document_key, cover_key FROM books WHERE user_id=?", [userId]);
  const [assets] = await db.execute<RowDataPacket[]>("SELECT object_key FROM assets WHERE user_id=?", [userId]);
  const keys: string[] = [...books.map(b => b.document_key), ...books.filter(b => b.cover_key).map(b => b.cover_key), ...assets.map(a => a.object_key)];
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
  // What they bought goes with them; the orders stay as a record of the money,
  // with nothing left pointing at an account that is gone.
  await db.execute("DELETE FROM tbl_package_purchase WHERE user_id=?", [userId]);
  await db.execute("UPDATE tbl_package_order SET purchase_id=NULL WHERE user_id=?", [userId]);
  await db.execute("UPDATE contact_messages SET user_id=NULL WHERE user_id=?", [userId]);
  for (const key of new Set(keys)) await removeObject(key).catch(() => {});
}
