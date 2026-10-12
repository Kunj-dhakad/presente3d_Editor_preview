import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin, requireOwner } from "@admin/server/adminAuth";
import { deletePackageOrder, updatePackageOrder } from "@admin/server/packageOrder";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    await updatePackageOrder(id, await jsonBody(request, 8192), admin.id);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}

/** Removing the record entirely is an owner's job; a package already sold stays. */
export async function DELETE(request: Request, context: Context) {
  try {
    await requireOwner(request);
    await deletePackageOrder((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
