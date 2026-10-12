import { NextResponse } from "next/server";
import { apiError } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { planEngine } from "@admin/server/bms";

/** Everything the plan screens read: packages, features, sets, fields and apps. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await planEngine(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
