import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { getUserPurchasedPlans, updateUserPlan } from "@admin/server/users";
import { getPackageList } from "@shared/server/bms";

type Context = { params: Promise<{ id: string }> };

/** The plan window: every package, and the ones this account holds. */
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const [packages, held] = await Promise.all([getPackageList(), getUserPurchasedPlans(id)]);
    return NextResponse.json({
      packages: packages.filter(item => item.status === "active").map(item => ({ id: item.id, title: item.title, price: item.price, plan_type: item.plan_type })),
      held,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

/** Ticked packages are sold to the account; unticked ones are switched off. */
export async function PUT(request: Request, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await jsonBody(request, 8192);
    const asked = Array.isArray(body.plan_id) ? body.plan_id : [];
    return NextResponse.json(await updateUserPlan(id, asked, admin.id));
  } catch (e) { return apiError(e); }
}
