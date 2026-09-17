import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { apiError, ApiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@shared/server/admin";
import { PLANS } from "@shared/plans";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await jsonBody(request, 4096);
    const [users] = await db.execute<RowDataPacket[]>("SELECT id FROM `user` WHERE id=?", [id]);
    if (!users.length) throw new ApiError(404, "User not found.");
    await db.execute("INSERT IGNORE INTO user_plans (user_id, plan) VALUES (?, 'free')", [id]);
    if (body.plan !== undefined) {
      if (!(body.plan in PLANS)) throw new ApiError(400, "Unknown plan.");
      await db.execute("UPDATE user_plans SET plan=?, updated_at=UTC_TIMESTAMP(3) WHERE user_id=?", [body.plan, id]);
    }
    if (body.note !== undefined) {
      await db.execute("UPDATE user_plans SET note=?, updated_at=UTC_TIMESTAMP(3) WHERE user_id=?", [String(body.note).slice(0, 255) || null, id]);
    }
    if (body.suspended !== undefined) {
      if (id === admin.id) throw new ApiError(400, "You cannot suspend your own account.");
      if (body.suspended) {
        await db.execute("UPDATE user_plans SET suspended_at=UTC_TIMESTAMP(3), suspend_reason=?, updated_at=UTC_TIMESTAMP(3) WHERE user_id=?", [String(body.reason || "").slice(0, 255) || null, id]);
        await db.execute("DELETE FROM session WHERE userId=?", [id]);
        await db.execute("DELETE FROM book_shares WHERE book_id IN (SELECT id FROM books WHERE user_id=?)", [id]);
      } else {
        await db.execute("UPDATE user_plans SET suspended_at=NULL, suspend_reason=NULL, updated_at=UTC_TIMESTAMP(3) WHERE user_id=?", [id]);
      }
    }
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
