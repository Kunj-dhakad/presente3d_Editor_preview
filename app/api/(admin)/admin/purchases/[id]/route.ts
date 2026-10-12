import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { changePackageStatus } from "@shared/server/bms";

type Context = { params: Promise<{ id: string }> };

/** Switching a purchase off takes the package away from the customer. */
export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const body = await jsonBody(request, 2048);
    await changePackageStatus((await context.params).id, body.status === "active" ? "active" : "inactive");
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    await changePackageStatus((await context.params).id, "inactive");
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
