import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { requireAdmin } from "@admin/server/adminAuth";
import { addUser, getUserList } from "@admin/server/users";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const data = await getUserList({
      keyword: (params.get("keyword") || params.get("q") || "").trim().slice(0, 100),
      package_id: params.get("package_id") || "",
      start_date: params.get("start_date") || "",
      end_date: params.get("end_date") || "",
      page: Number(params.get("page")) || 1,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

/** Adds an account by hand. It starts on the free package, like any signup. */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await addUser(await jsonBody(request, 8192)), { status: 201 });
  } catch (e) { return apiError(e); }
}
