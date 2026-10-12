import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { saveFeature } from "@admin/server/bms";
import { listFeatures } from "@shared/server/bms";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ features: await listFeatures() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

/** Adds a feature, or saves the one whose id is in the body. */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await saveFeature(await jsonBody(request, 8192)), { status: 201 });
  } catch (e) { return apiError(e); }
}
