import { NextResponse } from "next/server";
import { apiError } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { changePackageStatus } from "@shared/server/bms";

/** Takes a package back: the purchase is switched off, and the account rebuilt. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string; purchaseId: string }> }) {
  try {
    await requireAdmin(request);
    await changePackageStatus((await context.params).purchaseId, "inactive");
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
