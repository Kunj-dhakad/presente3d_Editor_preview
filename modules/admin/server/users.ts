import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { ApiError } from "@shared/server/api";
import { passwordError } from "@shared/password";
import { addPackagePurchase, changePackageStatus, getPackageList, updateUserPackage } from "@shared/server/bms";
import { deleteUserData } from "@shared/server/account";

/**
 * The people who use the site, managed the way the reference BMS manages them:
 * search by package and date, see what they hold, sell them a package, reset a
 * password, switch an account off, sign in as them, or remove them for good.
 */

export type UserRow = {
  id: string; name: string; email: string; emailVerified: number | boolean; created: number;
  status: "active" | "inactive"; plans: string; books: number; bytes: number; last_active: string | null;
};

const PAGE_SIZE = 10;
const seconds = (value: string) => Math.floor(new Date(value).getTime() / 1000);

/** The list, its filters and the three counts above it. */
export async function getUserList(options: {
  keyword?: string; package_id?: string; start_date?: string; end_date?: string; page?: number; pageSize?: number;
} = {}) {
  const pageSize = Math.min(100, Math.max(5, options.pageSize ?? PAGE_SIZE));
  const page = Math.max(1, options.page ?? 1);
  const where: string[] = []; const args: unknown[] = [];
  if (options.keyword) { where.push("(u.email LIKE ? OR u.name LIKE ?)"); args.push(`%${options.keyword}%`, `%${options.keyword}%`); }
  if (options.package_id) {
    where.push(`EXISTS (SELECT 1 FROM tbl_package_purchase b WHERE b.user_id=u.id AND b.status='active' AND b.package_id=?)`);
    args.push(Number(options.package_id));
  }
  if (options.start_date) { where.push("u.createdAt >= ?"); args.push(new Date(options.start_date)); }
  if (options.end_date) { where.push("u.createdAt <= ?"); args.push(new Date(`${options.end_date}T23:59:59`)); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [[count]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n,
            SUM(p.suspended_at IS NULL) AS active,
            SUM(p.suspended_at IS NOT NULL) AS inactive
     FROM \`user\` u LEFT JOIN user_plans p ON p.user_id=u.id ${clause}`, args);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.emailVerified, u.createdAt, p.suspended_at, p.suspend_reason, p.note,
            (SELECT GROUP_CONCAT(DISTINCT b.title ORDER BY b.id SEPARATOR ', ')
               FROM tbl_package_purchase b WHERE b.user_id=u.id AND b.status='active') AS plans,
            (SELECT COUNT(*) FROM books k WHERE k.user_id=u.id AND k.deleted_at IS NULL) AS books,
            (SELECT COALESCE(SUM(a.bytes),0) FROM assets a WHERE a.user_id=u.id) AS bytes,
            (SELECT MAX(s.updatedAt) FROM session s WHERE s.userId=u.id) AS last_active
     FROM \`user\` u LEFT JOIN user_plans p ON p.user_id=u.id ${clause}
     ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`, [...args, pageSize, (page - 1) * pageSize]);

  return {
    users: rows.map(row => ({
      id: String(row.id), name: String(row.name), email: String(row.email), emailVerified: row.emailVerified,
      created: seconds(row.createdAt), status: row.suspended_at ? "inactive" : "active",
      suspend_reason: row.suspend_reason ?? null, note: row.note ?? null,
      plans: row.plans ?? "", books: Number(row.books), bytes: Number(row.bytes),
      last_active: row.last_active ? new Date(row.last_active).toISOString() : null,
    })),
    total: Number(count.n), page, pageSize,
    totals: { total: Number(count.n), active: Number(count.active || 0), inactive: Number(count.inactive || 0) },
  };
}

/** Everything one account is and holds, for the detail window. */
export async function getUserDetail(id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.emailVerified, u.createdAt, p.suspended_at, p.suspend_reason, p.note,
            (SELECT COUNT(*) FROM books k WHERE k.user_id=u.id AND k.deleted_at IS NULL) AS books,
            (SELECT COALESCE(SUM(a.bytes),0) FROM assets a WHERE a.user_id=u.id) AS bytes,
            (SELECT MAX(s.updatedAt) FROM session s WHERE s.userId=u.id) AS last_active
     FROM \`user\` u LEFT JOIN user_plans p ON p.user_id=u.id WHERE u.id=?`, [id]);
  if (!rows.length) throw new ApiError(404, "No account with that id.");
  const row = rows[0];
  const [purchases] = await db.execute<RowDataPacket[]>(
    `SELECT id, package_id, title, price, plan_type, plan_level, sell_type, source, status, add_time, expire_time
     FROM tbl_package_purchase WHERE user_id=? ORDER BY id DESC`, [id]);
  const [orders] = await db.execute<RowDataPacket[]>(
    "SELECT id, number, price, payment_status, order_time FROM tbl_package_order WHERE user_id=? ORDER BY id DESC LIMIT 10", [id]);
  return {
    detail: {
      id: String(row.id), name: String(row.name), email: String(row.email), emailVerified: Boolean(row.emailVerified),
      created: seconds(row.createdAt), status: row.suspended_at ? "inactive" : "active",
      suspend_reason: row.suspend_reason ?? null, note: row.note ?? null,
      books: Number(row.books), bytes: Number(row.bytes),
      last_active: row.last_active ? new Date(row.last_active).toISOString() : null,
    },
    purchases, orders,
  };
}

/** The packages this account holds right now, by package id. */
export async function getUserPurchasedPlans(id: string) {
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT DISTINCT package_id FROM tbl_package_purchase WHERE user_id=? AND status='active'", [id]);
  return rows.map(row => Number(row.package_id));
}

/**
 * Sets which packages an account holds. Anything newly ticked is sold to them;
 * anything unticked is switched off — the reference's updateUserPlan.
 */
export async function updateUserPlan(id: string, packageIds: (string | number)[], adminId: string) {
  const wanted = packageIds.map(Number).filter(Number.isFinite);
  const held = await getUserPurchasedPlans(id);
  const packages = await getPackageList();
  const added: string[] = []; const removed: string[] = [];

  for (const packageId of wanted) {
    if (held.includes(packageId)) continue;
    const found = packages.find(item => item.id === packageId);
    if (!found) continue;
    await addPackagePurchase(id, null, packageId, { source: "admin", adminId });
    added.push(found.title);
  }
  for (const packageId of held) {
    if (wanted.includes(packageId)) continue;
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM tbl_package_purchase WHERE user_id=? AND package_id=? AND status='active'", [id, packageId]);
    for (const row of rows) await changePackageStatus(Number(row.id), "inactive");
    removed.push(packages.find(item => item.id === packageId)?.title ?? String(packageId));
  }
  await updateUserPackage(id);
  return { added, removed };
}

/** Adds an account by hand, exactly as a signup would, free package and all. */
export async function addUser(input: Record<string, unknown>) {
  const name = String(input.name ?? "").trim().slice(0, 100);
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const confirm = String(input.confirm_password ?? password);
  if (!name) throw new ApiError(400, "The account needs a name.");
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) throw new ApiError(400, "That email address does not look right.");
  if (password !== confirm) throw new ApiError(400, "The two passwords are not the same.");
  const wrong = passwordError(password);
  if (wrong) throw new ApiError(400, wrong);
  const [existing] = await db.execute<RowDataPacket[]>("SELECT id FROM `user` WHERE LOWER(email)=?", [email]);
  if (existing.length) throw new ApiError(409, "An account with that email already exists.");

  const { auth } = await import("@shared/auth");
  const created = await auth.api.signUpEmail({ body: { name, email, password } });
  return { id: created.user.id, email, name };
}

export async function updateUser(id: string, input: Record<string, unknown>) {
  const name = String(input.name ?? "").trim().slice(0, 100);
  if (!name) throw new ApiError(400, "The account needs a name.");
  const [result] = await db.execute<RowDataPacket[]>("SELECT id FROM `user` WHERE id=?", [id]);
  if (!result.length) throw new ApiError(404, "No account with that id.");
  await db.execute("UPDATE `user` SET name=? WHERE id=?", [name, id]);
  if (input.note !== undefined) {
    await db.execute("INSERT INTO user_plans (user_id, note) VALUES (?, ?) ON DUPLICATE KEY UPDATE note=VALUES(note)",
      [id, String(input.note).slice(0, 255) || null]);
  }
  return { id, name };
}

/** Gives the account a new password, the way the panel's reset window does. */
export async function updatePassword(id: string, password: string, confirm: string) {
  if (password !== confirm) throw new ApiError(400, "The two passwords are not the same.");
  const wrong = passwordError(password);
  if (wrong) throw new ApiError(400, wrong);
  const { auth } = await import("@shared/auth");
  const ctx = await auth.$context;
  const account = await ctx.internalAdapter.findCredentialAccount?.(id);
  if (!account) throw new ApiError(400, "This account signs in another way, so it has no password to reset.");
  await ctx.internalAdapter.updatePassword(id, await ctx.password.hash(password));
  // Every session goes: whoever was signed in has to use the new password.
  await db.execute("DELETE FROM session WHERE userId=?", [id]);
  return { id };
}

/** Switching an account off ends its sessions and takes its reader links down. */
export async function setStatus(id: string, status: "active" | "inactive", reason?: string) {
  await db.execute("INSERT IGNORE INTO user_plans (user_id, plan) VALUES (?, 'free')", [id]);
  if (status === "inactive") {
    await db.execute(
      "UPDATE user_plans SET suspended_at=UTC_TIMESTAMP(3), suspend_reason=?, updated_at=UTC_TIMESTAMP(3) WHERE user_id=?",
      [String(reason || "").slice(0, 255) || null, id]);
    await db.execute("DELETE FROM session WHERE userId=?", [id]);
    await db.execute("DELETE FROM book_shares WHERE book_id IN (SELECT id FROM books WHERE user_id=?)", [id]);
  } else {
    await db.execute("UPDATE user_plans SET suspended_at=NULL, suspend_reason=NULL, updated_at=UTC_TIMESTAMP(3) WHERE user_id=?", [id]);
  }
  return { id, status };
}

/** Removes the account and everything it owns. */
export async function deleteUser(id: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id FROM `user` WHERE id=?", [id]);
  if (!rows.length) throw new ApiError(404, "No account with that id.");
  await deleteUserData(id);
  await db.execute("DELETE FROM session WHERE userId=?", [id]);
  await db.execute("DELETE FROM account WHERE userId=?", [id]);
  await db.execute("DELETE FROM verification WHERE identifier=(SELECT email FROM `user` WHERE id=?)", [id]);
  await db.execute("DELETE FROM `user` WHERE id=?", [id]);
  return { id };
}
