import { NextResponse } from "next/server";
import { apiError, jsonBody, requireUser } from "@shared/server/api";
import { consumeAi } from "@shared/server/limits";
import { BOOK_LANGUAGE } from "@shared/aiBook";
import { assertBookQuota } from "@shared/server/limits";
import { checkPrompt, checkWritingOptions, planBook, prepareImages, PAGE_SIZES, type SizeId } from "@shared/server/ai-book";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Step 1 of an AI book: plan every page, and grab the photos the pages will share. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await assertBookQuota(user.id);
    const body = await jsonBody(request, 128 * 1024);
    const { topic, count } = checkPrompt(body.prompt, body.pages);
    const options = checkWritingOptions(body);
    const size: SizeId = Object.hasOwn(PAGE_SIZES, body.size) ? body.size : "portrait";
    const language = BOOK_LANGUAGE;
    await consumeAi(user.id);

    // A typed description is a fine photo search, so the photos download while the
    // outline is written. With an imported PDF or URL the prompt is only a file or
    // page name, so wait for the outline's own photo subject instead.
    const [outline, { photos, photoIssue }] = options.sourceText
      ? await planBook(topic, count, language, options).then(async plan => [plan, await prepareImages(user.id, plan.imageQuery)] as const)
      : await Promise.all([planBook(topic, count, language, options), prepareImages(user.id, topic)]);
    // photoIssue says why a book has no photos (e.g. the stock photo key is not set on this server).
    return NextResponse.json({ outline, photos, photoIssue, size, language, topic }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
