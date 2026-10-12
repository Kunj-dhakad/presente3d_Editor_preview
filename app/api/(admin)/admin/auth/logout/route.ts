import { NextResponse } from "next/server";
import { apiError, checkOrigin } from "@shared/server/api";
import { ADMIN_COOKIE, signOutAdmin } from "@admin/server/adminAuth";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const token = request.headers.get("cookie")?.split(";").map(p => p.trim()).find(p => p.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
    await signOutAdmin(token);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (e) { return apiError(e); }
}
