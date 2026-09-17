import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { auth } from "@shared/auth";
import { db } from "./db";
import { accountStatus } from "./account";
import { trustedOrigins } from "./origins";
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "Please log in to continue.");
  if ((await accountStatus(session.user.id)).suspended) throw new ApiError(403, "This account is suspended. Contact support for help.");
  return session.user;
}
export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if ((origin && !trustedOrigins().includes(origin)) || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "Request origin is not allowed.");
}
export async function requireUser(request: Request) { checkOrigin(request); return currentUser(); }
export async function consumeLimit(userId: string, scope: string, max = 60, seconds = 60, cost = 1) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = `${userId}:${scope}:${bucket}`;
  await db.execute("INSERT INTO usage_limits (bucket_key, user_id, scope, hits, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE hits = hits + VALUES(hits)", [key, userId, scope, cost, seconds * 2]);
  const [rows] = await db.execute<RowDataPacket[]>("SELECT hits FROM usage_limits WHERE bucket_key = ?", [key]);
  if (Number(rows[0].hits) > max) throw new ApiError(429, "Usage limit reached. Please try again later.");
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ status: 0, error: error.message, message: error.message }, { status: error.status });
  // Production logs stay terse on purpose; development needs the real cause.
  if (process.env.NODE_ENV === "production") console.error("AI Book Creator request failed:", error instanceof Error ? error.name : "Unknown error");
  else console.error("AI Book Creator request failed:", error);
  return NextResponse.json({ status: 0, error: "The request could not be completed. Please try again." }, { status: 500 });
}
export async function jsonBody(request: Request, maxBytes = 12 * 1024 * 1024) {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ApiError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, "Request is too large."); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Invalid JSON body."); }
}

