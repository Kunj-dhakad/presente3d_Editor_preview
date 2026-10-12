import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { addPackageOrder, getOrderList } from "@admin/server/packageOrder";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const data = await getOrderList({
      search: (params.get("q") || "").trim().slice(0, 100),
      status: params.get("status") || "",
      page: Number(params.get("page")) || 1,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await jsonBody(request, 8192);
    return NextResponse.json(await addPackageOrder(body, admin.id), { status: 201 });
  } catch (e) { return apiError(e); }
}
