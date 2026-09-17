import { NextResponse } from "next/server";
import { apiError, checkOrigin, jsonBody } from "@shared/server/api";
import { sharedBookInfo } from "@shared/server/shares";
import { rateBook } from "@shared/server/engagement";
type Context = { params: Promise<{ token: string }> };

/** A reader's star rating, with an optional comment: { visitor, stars, comment }. */
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { token } = await context.params;
    const book = await sharedBookInfo(token);
    const body = await jsonBody(request, 4096);
    await rateBook(book.id, body.visitor, body.stars, body.comment);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
