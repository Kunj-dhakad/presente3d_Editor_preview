import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { saveFeaturePlan } from "@admin/server/bms";
import { listFeaturePlans } from "@shared/server/bms";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ featurePlans: await listFeaturePlans() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    return NextResponse.json(await saveFeaturePlan(await jsonBody(request, 16 * 1024), admin.id), { status: 201 });
  } catch (e) { return apiError(e); }
}
