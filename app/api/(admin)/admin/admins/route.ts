import { NextResponse } from "next/server";
import { apiError, jsonBody } from "@shared/server/api";
import { createAdmin, listAdmins, requireAdmin, requireOwner } from "@admin/server/adminAuth";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ admins: await listAdmins() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return apiError(e); }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request);
    const body = await jsonBody(request, 4096);
    const admin = await createAdmin({ email: body.email, name: body.name, password: body.password, role: body.role, createdBy: owner.id });
    return NextResponse.json(admin, { status: 201 });
  } catch (e) { return apiError(e); }
}
