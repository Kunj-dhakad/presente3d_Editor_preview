import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { requireUser, apiError } from "@shared/server/api";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT r.id, r.data, r.created_at, b.title AS book_title
       FROM book_responses r JOIN books b ON b.id = r.book_id
       WHERE b.user_id = ? AND b.deleted_at IS NULL
       ORDER BY r.created_at DESC LIMIT 500`, [user.id],
    );
    return NextResponse.json({ leads: rows.map(row => ({ ...row, data: typeof row.data === "string" ? JSON.parse(row.data) : row.data })) });
  } catch (error) { return apiError(error); }
}
