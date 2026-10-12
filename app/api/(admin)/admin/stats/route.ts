import { NextResponse } from "next/server";
import { apiError } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { adminStats } from "@admin/server/dashboard";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await adminStats(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
