import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { apiError } from "@shared/server/api";
import { requireAdmin } from "@shared/server/admin";

const PAGE_SIZE = 25;

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const search = (params.get("q") || "").trim().slice(0, 100);
    const page = Math.max(1, Number(params.get("page")) || 1);
    const plan = params.get("plan") || "";
    const where: string[] = []; const args: unknown[] = [];
    if (search) { where.push("(u.email LIKE ? OR u.name LIKE ?)"); args.push(`%${search}%`, `%${search}%`); }
    if (plan === "suspended") where.push("p.suspended_at IS NOT NULL");
    else if (["free", "pro", "business"].includes(plan)) { where.push("COALESCE(p.plan,'free')=?"); args.push(plan); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [[count]] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`user\` u LEFT JOIN user_plans p ON p.user_id=u.id ${clause}`, args);
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT u.id,u.name,u.email,u.emailVerified,u.createdAt,COALESCE(p.plan,'free') AS plan,p.suspended_at,p.suspend_reason,p.note,
        (SELECT COUNT(*) FROM books b WHERE b.user_id=u.id AND b.deleted_at IS NULL) AS books,
        (SELECT COALESCE(SUM(a.bytes),0) FROM assets a WHERE a.user_id=u.id) AS bytes,
        (SELECT MAX(s.updatedAt) FROM session s WHERE s.userId=u.id) AS last_active
       FROM \`user\` u LEFT JOIN user_plans p ON p.user_id=u.id ${clause}
       ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`, [...args, PAGE_SIZE, (page - 1) * PAGE_SIZE]);
    return NextResponse.json({ users, total: Number(count.n), page, pageSize: PAGE_SIZE }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
