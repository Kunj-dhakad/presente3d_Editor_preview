import { NextResponse } from "next/server";
import { db } from "@shared/server/db";
import { apiError, ApiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@shared/server/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const { status } = await jsonBody(request, 1024);
    if (!["open", "closed"].includes(status)) throw new ApiError(400, "Unknown status.");
    await db.execute("UPDATE contact_messages SET status=? WHERE id=?", [status, id]);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
