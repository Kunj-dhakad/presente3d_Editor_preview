import { NextResponse } from "next/server";
import { requireUser, apiError } from "@shared/server/api";
import { accountUsage } from "@shared/server/account";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await accountUsage(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}
