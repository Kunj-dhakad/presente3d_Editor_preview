import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError, apiError, checkOrigin, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { parseSalesPage } from "@shared/salesPage";
import { readSalesPage, writeSalesPage } from "@shared/server/salesPage";

export async function GET(request: Request) {
  try { await requireAdmin(request); return NextResponse.json(await readSalesPage(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin(request);
    const body = await jsonBody(request, 512 * 1024);
    if (!body || !["save", "publish", "unpublish"].includes(body.action) || !Number.isSafeInteger(body.revision) || body.revision < 0) throw new ApiError(400, "Invalid save request.");
    let document = null;
    if (body.action !== "unpublish") {
      try { document = parseSalesPage(body.document); } catch (error) { throw new ApiError(400, error instanceof Error ? error.message : "Invalid page content."); }
      if (body.action === "publish" && !document.sections.some(section => section.enabled && section.type !== "offer" && section.type !== "footer")) throw new ApiError(400, "Enable at least one content section before publishing.");
    }
    const result = await writeSalesPage(document, body.revision, body.action, admin.id);
    if (body.action !== "save") revalidatePath("/");
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
