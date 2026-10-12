import { NextResponse } from "next/server";
import { ApiError, apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { isTemplateId, loadTemplate, resetTemplate, saveTemplate } from "@shared/server/emailTemplates";
import { renderEmail } from "@shared/server/mail";

type Context = { params: Promise<{ id: string }> };

/** The saved wording plus a rendered preview. */
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    if (!isTemplateId(id)) throw new ApiError(404, "Unknown email.");
    const template = await loadTemplate(id);
    const preview = await renderEmail(id, { name: "Alex Carter", email: "alex@example.com", url: "https://example.com/link", plan: "Pro", amount: "$9.00", number: "ABC-20260921-1234", topic: "billing", note: "Pay by bank transfer." });
    return NextResponse.json({ template, preview }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    if (!isTemplateId(id)) throw new ApiError(404, "Unknown email.");
    await saveTemplate(id, await jsonBody(request, 16 * 1024), admin.id);
    return NextResponse.json({ template: await loadTemplate(id) });
  } catch (e) { return apiError(e); }
}

/** Puts one email back to the wording shipped with the app. */
export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    if (!isTemplateId(id)) throw new ApiError(404, "Unknown email.");
    await resetTemplate(id);
    return NextResponse.json({ template: await loadTemplate(id) });
  } catch (e) { return apiError(e); }
}
