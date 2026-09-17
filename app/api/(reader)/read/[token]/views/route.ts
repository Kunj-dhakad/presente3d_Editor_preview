import { NextResponse } from "next/server";
import { apiError, checkOrigin, jsonBody } from "@shared/server/api";
import { sharedBookInfo } from "@shared/server/shares";
import { recordView } from "@shared/server/engagement";
type Context = { params: Promise<{ token: string }> };

/**
 * The reader reports when a book opens and as pages turn:
 * { visitor, page, total }. The answer tells the reader whether to offer the
 * lead form.
 */
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { token } = await context.params;
    const book = await sharedBookInfo(token);
    const body = await jsonBody(request, 1024);
    const view = await recordView(book, body.visitor, body.page, body.total);
    return NextResponse.json({ ...view, leadForm: book.leadForm }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return apiError(e); }
}
