import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { updatePassword } from "@admin/server/users";

/** The reset window: a new password, typed twice. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await jsonBody(request, 4096);
    await updatePassword(id, String(body.new_password ?? ""), String(body.confirm_password ?? ""));
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
