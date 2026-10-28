import { NextResponse } from "next/server";
import { decodePhpToken } from "./phpToken";
import { trustedOrigins } from "./origins";
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
/** The header the editor sends its PHP access token in (see @editor/lib/apiFetch). */
export const TOKEN_HEADER = "x-access-token";
export function currentUser(request: Request) {
  const user = decodePhpToken(request.headers.get(TOKEN_HEADER) || "");
  if (!user) throw new ApiError(401, "Your editor session has expired. Reopen the editor from your dashboard.");
  return user;
}
export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if ((origin && !trustedOrigins().includes(origin)) || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "Request origin is not allowed.");
}
export async function requireUser(request: Request) { checkOrigin(request); return currentUser(request); }

// Rate limits live in memory: the editor has no database of its own. One
// instance is enough for these coarse limits; credits are PHP's business.
const hits = new Map<string, { count: number; expires: number }>();
export async function consumeLimit(userId: string, scope: string, max = 60, seconds = 60, cost = 1) {
  const now = Date.now();
  if (hits.size > 10_000) for (const [key, value] of hits) if (value.expires <= now) hits.delete(key);
  const key = `${userId}:${scope}:${Math.floor(now / (seconds * 1000))}`;
  const entry = hits.get(key) ?? { count: 0, expires: now + seconds * 1000 };
  entry.count += cost;
  hits.set(key, entry);
  if (entry.count > max) throw new ApiError(429, "Usage limit reached. Please try again later.");
}
export async function consumeAi(userId: string, cost = 1) {
  await consumeLimit(userId, "ai-day", Number(process.env.AI_DAILY_LIMIT || 300), 86_400, cost);
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ status: 0, error: error.message, message: error.message }, { status: error.status });
  // Production logs stay terse on purpose; development needs the real cause.
  if (process.env.NODE_ENV === "production") console.error("Editor request failed:", error instanceof Error ? error.name : "Unknown error");
  else console.error("Editor request failed:", error);
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
