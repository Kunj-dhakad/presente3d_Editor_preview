import { NextResponse } from "next/server";
import { apiError } from "@shared/server/api";
import { publicPlans } from "@shared/server/bms";

/** The price list, as the site shows it. Public on purpose. */
export async function GET() {
  try {
    return NextResponse.json({ plans: await publicPlans() }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) { return apiError(e); }
}
