import { NextResponse } from "next/server";
import { apiError, checkOrigin, jsonBody } from "@shared/server/api";
import { ADMIN_COOKIE, requestContext, signInAdmin } from "@admin/server/adminAuth";

/** Administration sign-in. Separate from the site's own login in every way. */
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await jsonBody(request, 4096);
    const context = await requestContext();
    const { token, maxAge } = await signInAdmin(body.email, body.password, context);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge,
    });
    return response;
  } catch (e) { return apiError(e); }
}
