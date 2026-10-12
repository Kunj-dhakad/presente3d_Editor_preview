import { NextResponse } from "next/server";
import { apiError } from "@shared/server/api";
import { requireOwner } from "@admin/server/adminAuth";
import { deleteFeaturePlan } from "@admin/server/bms";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireOwner(request);
    await deleteFeaturePlan((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
