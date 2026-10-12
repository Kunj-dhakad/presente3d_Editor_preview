import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { db } from "./db";

/**
 * Signing in as a customer from Administration — the reference panel's "Login"
 * action, for looking at a problem the way the customer sees it.
 *
 * It is an endpoint of the authentication server itself, because only there can
 * a session cookie be written the way a real sign-in writes one. The caller must
 * hold an administrator session; a customer's own session means nothing here.
 * The administrator session is read with a query of its own, so this file never
 * has to import the panel and the panel never has to import authentication.
 */

const ADMIN_COOKIE = "abc_admin_session";

function adminToken(header: string | null) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function signedInAdmin(cookie: string | null) {
  const token = adminToken(cookie);
  if (!token) return null;
  // The panel stores a hash of the cookie, never the cookie itself.
  const stored = createHash("sha256").update(token).digest("hex");
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.id, a.email, a.name FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token=? AND s.expires_at > UTC_TIMESTAMP(3) AND a.disabled_at IS NULL`, [stored]);
  return rows.length ? { id: String(rows[0].id), email: String(rows[0].email), name: String(rows[0].name) } : null;
}

export const loginAsUser = {
  id: "admin-login-as",
  endpoints: {
    adminLoginAs: createAuthEndpoint("/admin-login-as", { method: "POST", requireHeaders: true }, async ctx => {
      const admin = await signedInAdmin(ctx.headers?.get("cookie") ?? ctx.request?.headers.get("cookie") ?? null);
      // Not an administrator: this endpoint does not exist as far as anyone else
      // is concerned.
      if (!admin) throw new APIError("NOT_FOUND", { message: "Not found." });

      const userId = String((ctx.body as { userId?: unknown })?.userId ?? "");
      const user = userId ? await ctx.context.internalAdapter.findUserById(userId) : null;
      if (!user) throw new APIError("NOT_FOUND", { message: "No account with that id." });

      const [suspended] = await db.execute<RowDataPacket[]>(
        "SELECT suspended_at FROM user_plans WHERE user_id=?", [userId]);
      if (suspended[0]?.suspended_at) throw new APIError("FORBIDDEN", { message: "This account is switched off. Switch it back on first." });

      const session = await ctx.context.internalAdapter.createSession(user.id, true);
      await setSessionCookie(ctx, { session, user });
      console.warn(`Administration: ${admin.email} signed in as ${user.email}.`);
      return ctx.json({ success: true, email: user.email });
    }),
  },
} satisfies BetterAuthPlugin;
