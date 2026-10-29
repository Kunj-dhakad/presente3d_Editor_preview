import { NextRequest, NextResponse } from "next/server";
import { protectedRoute } from "@shared/server/protected-route";
import { ApiError, apiError } from "@shared/server/api";
import { exportPptx } from "@shared/server/pptx";
export const runtime = "nodejs";

// Large decks can outgrow this server function; set NEXT_PUBLIC_PPT_EXPORT_URL
// to send exports to the ppt-export Lambda instead (see lambda/ppt-export).
async function handlePOST(req: NextRequest) {
    try {
        return NextResponse.json(await exportPptx(req));
    } catch (error: unknown) {
        if (error instanceof ApiError) return apiError(error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
export const POST = protectedRoute(handlePOST, "export");
