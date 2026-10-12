import { NextResponse } from "next/server";
import { ApiError, apiError, jsonBody } from "@shared/server/api";
import { countAdmins, deleteAdmin, requireAdmin, requireOwner, setAdminDisabled, setAdminPassword } from "@admin/server/adminAuth";
import { db } from "@shared/server/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await jsonBody(request, 4096);
    // Anyone may change their own password; everything else is the owner's.
    const own = id === admin.id;
    if (body.password !== undefined) {
      if (!own && admin.role !== "owner") throw new ApiError(403, "Only an owner can reset another administrator's password.");
      await setAdminPassword(id, body.password);
    }
    if (body.disabled !== undefined) {
      await requireOwner(request);
      if (own) throw new ApiError(400, "You cannot disable your own account.");
      if (body.disabled && await countAdmins() <= 1) throw new ApiError(400, "Keep at least one active administrator.");
      await setAdminDisabled(id, Boolean(body.disabled));
    }
    if (body.role !== undefined) {
      await requireOwner(request);
      if (own) throw new ApiError(400, "You cannot change your own role.");
      await db.execute("UPDATE admin_users SET role=? WHERE id=?", [body.role === "owner" ? "owner" : "manager", id]);
    }
    if (body.name !== undefined && (own || admin.role === "owner")) {
      await db.execute("UPDATE admin_users SET name=? WHERE id=?", [String(body.name).slice(0, 100), id]);
    }
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const owner = await requireOwner(request);
    const { id } = await context.params;
    if (id === owner.id) throw new ApiError(400, "You cannot remove your own account.");
    if (await countAdmins() <= 1) throw new ApiError(400, "Keep at least one active administrator.");
    await deleteAdmin(id);
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
