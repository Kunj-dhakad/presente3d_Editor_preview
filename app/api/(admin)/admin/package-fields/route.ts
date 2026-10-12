import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { savePackageField } from "@admin/server/bms";
import { getPackageFields } from "@shared/server/bms";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ fields: await getPackageFields() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await savePackageField(await jsonBody(request, 8192)), { status: 201 });
  } catch (e) { return apiError(e); }
}
