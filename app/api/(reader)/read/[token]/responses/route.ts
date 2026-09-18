import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@shared/server/db";
import { apiError, jsonBody, consumeLimit, checkOrigin, ApiError } from "@shared/server/api";
import { sharedBookInfo } from "@shared/server/shares";
import { checkResponse } from "@shared/server/engagement";

/**
 * A reader's lead form, contact form, quiz or question from a published book.
 * It lands in the author's Leads.
 */
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    checkOrigin(request);
    const { token } = await context.params;
    const book = await sharedBookInfo(token);
    await consumeLimit(createHash("sha256").update(token).digest("hex"), "responses", 60);
    const body = await jsonBody(request, 32 * 1024);
    const response = checkResponse(book.id, body);
    if (response.kind === "lead" && !book.leadForm) throw new ApiError(403, "This book does not collect leads.");
    await db.execute("INSERT INTO book_responses (id, book_id, data) VALUES (?, ?, ?)", [randomUUID(), book.id, JSON.stringify(response)]);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
