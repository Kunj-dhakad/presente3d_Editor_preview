import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ status: "ok", app: "Presentation editor" }, { headers: { "Cache-Control": "no-store" } }); }
