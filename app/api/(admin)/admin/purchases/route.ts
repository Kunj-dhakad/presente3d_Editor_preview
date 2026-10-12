import { NextResponse } from "next/server";
import { apiError } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { getPurchaseList } from "@admin/server/bms";

/** The ledger: every package sold, newest first. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const list = await getPurchaseList({
      search: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: Number(url.searchParams.get("page")) || 1,
    });
    return NextResponse.json(list, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
