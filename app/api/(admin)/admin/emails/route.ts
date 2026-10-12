import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { apiError } from "@shared/server/api";
import { db } from "@shared/server/db";
import { requireAdmin } from "@admin/server/adminAuth";
import { loadTemplates } from "@shared/server/emailTemplates";
import { mailConfigured } from "@shared/server/mail";

/** Every email the site can send, with the last few that went out. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [log] = await db.query<RowDataPacket[]>(
      "SELECT id, template, recipient, subject, status, error, created_at FROM email_log ORDER BY created_at DESC LIMIT 20");
    return NextResponse.json({ templates: await loadTemplates(), log, configured: mailConfigured() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
