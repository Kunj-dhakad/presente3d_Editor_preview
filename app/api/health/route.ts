import { NextResponse } from "next/server";
import { db } from "@shared/server/db";
export async function GET() { try { await db.query("SELECT 1"); return NextResponse.json({ status: "ok", app: "AI Book Creator" }, { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ status: "unavailable" }, { status: 503 }); } }

