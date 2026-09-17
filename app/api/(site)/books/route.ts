import { NextResponse } from "next/server";
import { requireUser, apiError, jsonBody, consumeLimit } from "@shared/server/api";
import { createBook, listBooks, purgeBooks } from "@shared/server/books";
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const trash = new URL(request.url).searchParams.get("trash") === "true";
    return NextResponse.json({ books: await listBooks(user.id, trash) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch(e) { return apiError(e); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request); await consumeLimit(user.id,"create-book",20);
    const body = await jsonBody(request);
    // Agent books are published by the agent itself, through the share route.
    const kind = ["ai", "agent", "template", "blank"].includes(String(body.kind)) ? body.kind : "ai";
    return NextResponse.json(await createBook(user.id,body.title,body.document,kind),{status:201});
  } catch(e) { return apiError(e); }
}


/** DELETE /api/books?trash=true empties the trash for good. */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (new URL(request.url).searchParams.get("trash") !== "true") return NextResponse.json({ error: "Only the trash can be emptied." }, { status: 400 });
    await consumeLimit(user.id, "empty-trash", 10);
    return NextResponse.json({ deleted: await purgeBooks(user.id) });
  } catch(e) { return apiError(e); }
}
