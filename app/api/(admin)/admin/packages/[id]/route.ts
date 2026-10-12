import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin, requireOwner } from "@admin/server/adminAuth";
import { deletePackage, updatePackage } from "@admin/server/bms";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    return NextResponse.json(await updatePackage((await context.params).id, await jsonBody(request, 16 * 1024), admin.id));
  } catch (e) { return apiError(e); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireOwner(request);
    await deletePackage((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
