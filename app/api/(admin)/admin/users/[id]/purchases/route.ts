import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { addPackagePurchase, checkForPackage } from "@shared/server/bms";

type Context = { params: Promise<{ id: string }> };

/** What this customer is allowed to do, and every package they have bought. */
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await checkForPackage((await context.params).id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

/** Sells the customer a package. Everything they already hold stays. */
export async function POST(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await jsonBody(request, 8192);
    const sold = await addPackagePurchase(id, null, String(body.package_id ?? body.packageId), {
      source: "admin", months: Number(body.months) || undefined,
      note: typeof body.note === "string" ? body.note.slice(0, 255) : undefined, adminId: admin.id,
    });
    return NextResponse.json({ id: sold.id, package: sold.package.title }, { status: 201 });
  } catch (e) { return apiError(e); }
}
