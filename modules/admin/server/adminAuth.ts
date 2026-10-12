import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { ApiError, consumeLimit } from "@shared/server/api";
import { passwordError } from "@shared/password";

/**
 * Administration accounts, kept entirely apart from the site's own users: their
 * own table, their own passwords and their own session cookie. Signing in to
 * the site never reaches the panel, and an administrator has no books, plan or
 * reader links of their own.
 */

export const ADMIN_COOKIE = "abc_admin_session";
const SESSION_DAYS = 7;
const SCRYPT_KEY = 64;

export type AdminRole = "owner" | "manager";
export type Admin = { id: string; email: string; name: string; role: AdminRole; disabled_at: string | null; last_login_at: string | null; created_at: string };

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

/** scrypt with a per-password salt, stored as "scrypt:<salt>:<key>". */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, SCRYPT_KEY);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, key] = String(stored).split(":");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = await scryptAsync(password, salt, expected.length || SCRYPT_KEY);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The same password policy the site uses, so there is one rule to remember. */
export function checkPassword(password: unknown) {
  const problem = passwordError(password);
  if (problem) throw new ApiError(400, problem);
  return String(password);
}

export function checkEmail(email: unknown) {
  const value = String(email ?? "").trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) throw new ApiError(400, "Enter a valid email address.");
  return value;
}

/* ------------------------------------------------------------- accounts */

export async function listAdmins(): Promise<Admin[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id, email, name, role, disabled_at, last_login_at, created_at FROM admin_users ORDER BY created_at");
  return rows as Admin[];
}

export async function countAdmins() {
  const [[row]] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM admin_users WHERE disabled_at IS NULL");
  return Number(row.n);
}

export async function createAdmin(input: { email: unknown; name: unknown; password: unknown; role?: unknown; createdBy?: string }) {
  const email = checkEmail(input.email);
  const password = checkPassword(input.password);
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim().slice(0, 100) || email.split("@")[0];
  const role: AdminRole = input.role === "owner" ? "owner" : "manager";
  const [existing] = await db.execute<RowDataPacket[]>("SELECT id FROM admin_users WHERE email=?", [email]);
  if (existing.length) throw new ApiError(409, "An administrator with that email already exists.");
  const id = randomUUID();
  await db.execute("INSERT INTO admin_users (id, email, name, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [id, email, name, await hashPassword(password), role, input.createdBy ?? null]);
  return { id, email, name, role };
}

export async function setAdminPassword(id: string, password: unknown) {
  await db.execute("UPDATE admin_users SET password_hash=? WHERE id=?", [await hashPassword(checkPassword(password)), id]);
  // Everything that account was signed in to ends with the old password.
  await db.execute("DELETE FROM admin_sessions WHERE admin_id=?", [id]);
}

export async function setAdminDisabled(id: string, disabled: boolean) {
  await db.execute(`UPDATE admin_users SET disabled_at=${disabled ? "UTC_TIMESTAMP(3)" : "NULL"} WHERE id=?`, [id]);
  if (disabled) await db.execute("DELETE FROM admin_sessions WHERE admin_id=?", [id]);
}

export async function deleteAdmin(id: string) {
  await db.execute("DELETE FROM admin_sessions WHERE admin_id=?", [id]);
  await db.execute("DELETE FROM admin_users WHERE id=?", [id]);
}

/* ------------------------------------------------------------- sessions */

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Checks the password and opens a session; the caller sets the cookie. */
export async function signInAdmin(email: unknown, password: unknown, context: { ip?: string; agent?: string } = {}) {
  const address = checkEmail(email);
  // Slow down guessing, per address and per caller.
  await consumeLimit(`admin-login:${address}`, "admin-login", 8, 300);
  const [rows] = await db.execute<RowDataPacket[]>("SELECT id, password_hash, disabled_at FROM admin_users WHERE email=?", [address]);
  const row = rows[0];
  const valid = row ? await verifyPassword(String(password ?? ""), String(row.password_hash)) : false;
  if (!row || !valid) throw new ApiError(401, "Wrong email or password.");
  if (row.disabled_at) throw new ApiError(403, "This administrator account is disabled.");
  const token = randomBytes(32).toString("hex");
  await db.execute(
    "INSERT INTO admin_sessions (token, admin_id, expires_at, ip, agent) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? DAY), ?, ?)",
    [hashToken(token), row.id, SESSION_DAYS, (context.ip || "").slice(0, 64) || null, (context.agent || "").slice(0, 255) || null]);
  await db.execute("UPDATE admin_users SET last_login_at=UTC_TIMESTAMP(3) WHERE id=?", [row.id]);
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export async function signOutAdmin(token: string | undefined) {
  if (token) await db.execute("DELETE FROM admin_sessions WHERE token=?", [hashToken(token)]);
}

async function adminForToken(token: string | undefined): Promise<Admin | null> {
  if (!token) return null;
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.id, a.email, a.name, a.role, a.disabled_at, a.last_login_at, a.created_at
     FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token=? AND s.expires_at > UTC_TIMESTAMP(3) AND a.disabled_at IS NULL`, [hashToken(token)]);
  return (rows[0] as Admin) ?? null;
}

/** The signed-in administrator in a server component, or null. */
export async function currentAdmin() {
  const store = await cookies();
  return adminForToken(store.get(ADMIN_COOKIE)?.value);
}

const cookieValue = (header: string | null, name: string) =>
  header?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);

/** The signed-in administrator in an API route; throws 404 when there is none. */
export async function requireAdmin(request: Request): Promise<Admin> {
  const admin = await adminForToken(cookieValue(request.headers.get("cookie"), ADMIN_COOKIE));
  // The panel is not advertised to anyone who is not signed in to it.
  if (!admin) throw new ApiError(404, "Not found.");
  return admin;
}

export async function requireOwner(request: Request) {
  const admin = await requireAdmin(request);
  if (admin.role !== "owner") throw new ApiError(403, "Only an owner can do this.");
  return admin;
}

/** Where the request came from, for the session list. */
export async function requestContext() {
  const list = await headers();
  return { ip: (list.get("x-forwarded-for") || "").split(",")[0].trim(), agent: list.get("user-agent") || "" };
}

export async function clearExpiredAdminSessions() {
  await db.execute("DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP(3)");
}
