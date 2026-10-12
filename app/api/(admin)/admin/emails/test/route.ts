import { NextResponse } from "next/server";
import { ApiError, apiError, consumeLimit, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { isTemplateId } from "@shared/server/emailTemplates";
import { sendEmail } from "@shared/server/mail";

/** Sends one email to the administrator, filled with sample values. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await jsonBody(request, 4096);
    if (!isTemplateId(body.template)) throw new ApiError(400, "Unknown email.");
    await consumeLimit(admin.id, "admin-test-email", 20, 3600);
    const to = typeof body.to === "string" && body.to.includes("@") ? body.to.trim().slice(0, 254) : admin.email;
    const result = await sendEmail(to, body.template, {
      name: admin.name, url: `${process.env.BETTER_AUTH_URL || ""}/dashboard`, plan: "Pro", amount: "$9.00",
      number: "ABC-TEST-0001", topic: "billing", note: "This is a test message.",
    }, { adminId: admin.id });
    if (!result.sent) throw new ApiError(503, result.reason || "The email could not be sent.");
    return NextResponse.json({ success: true, to });
  } catch (e) { return apiError(e); }
}
