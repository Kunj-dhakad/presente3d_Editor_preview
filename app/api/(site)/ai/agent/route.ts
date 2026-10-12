import { NextResponse } from "next/server";
import { apiError, consumeLimit, jsonBody, requireUser } from "@shared/server/api";
import { agentTurn, checkConversation } from "@shared/server/book-agent";
import { PAGE_SIZES, type SizeId } from "@shared/server/ai-book";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await consumeLimit(user.id, "agent", 20, 60);
    await consumeLimit(user.id, "agent-daily", 300, 86400);
    const body = await jsonBody(request, 96 * 1024);
    const messages = checkConversation(body.messages);
    const size: SizeId = typeof body.size === "string" && Object.hasOwn(PAGE_SIZES, body.size) ? body.size as SizeId : "portrait";
    return NextResponse.json(await agentTurn(messages, size, body.brief), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
