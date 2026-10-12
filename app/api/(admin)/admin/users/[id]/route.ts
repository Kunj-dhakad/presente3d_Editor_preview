import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin, requireOwner } from "@admin/server/adminAuth";
import { deleteUser, getUserDetail, setStatus, updateUser } from "@admin/server/users";

type Context = { params: Promise<{ id: string }> };

/** Everything this account is and holds, for the detail window. */
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await getUserDetail((await context.params).id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await jsonBody(request, 4096);
    if (body.status !== undefined) await setStatus(id, body.status === "inactive" ? "inactive" : "active", String(body.reason || ""));
    if (body.name !== undefined || body.note !== undefined) await updateUser(id, body);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}

/** Removing an account takes its books, files and purchases with it. */
export async function DELETE(request: Request, context: Context) {
  try {
    await requireOwner(request);
    await deleteUser((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
