import { NextResponse } from "next/server";
import { apiError, jsonBody, requireUser } from "@shared/server/api";
import { consumeAi } from "@shared/server/limits";
import { BOOK_LANGUAGE } from "@shared/aiBook";
import { assertBookQuota } from "@shared/server/limits";
import { checkPrompt, checkWritingOptions, designOf, planBook, prepareImages, PAGE_SIZES, type SizeId } from "@shared/server/ai-book";

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
    // Photo-led designs (magazine, lookbook) get more pictures to choose from.
    const photoCount = designOf(options.publicationType).photos;

    const [outline, { photos, photoIssue }] = options.sourceText
      ? await planBook(topic, count, language, options, body.avoid).then(async plan => [plan, await prepareImages(user.id, plan.imageQuery, photoCount)] as const)
      : await Promise.all([planBook(topic, count, language, options, body.avoid), prepareImages(user.id, topic, photoCount)]);
    return NextResponse.json({ outline, photos, photoIssue, size, language, topic }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
