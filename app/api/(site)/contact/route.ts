import { randomUUID, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@shared/server/db";
import { auth } from "@shared/auth";
import { apiError, ApiError, checkOrigin, consumeLimit, jsonBody } from "@shared/server/api";

const TOPICS = ["general", "upgrade", "billing", "support", "privacy", "partnership"] as const;

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    await consumeLimit(createHash("sha256").update(ip).digest("hex").slice(0, 40), "contact", 5, 3600);
    const body = await jsonBody(request, 16384);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const topic = TOPICS.includes(body.topic) ? body.topic : "general";
    if (!name || name.length > 100) throw new ApiError(400, "Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, "Enter a valid email address.");
    if (message.length < 10 || message.length > 5000) throw new ApiError(400, "Write a message between 10 and 5,000 characters.");
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    await db.execute("INSERT INTO contact_messages (id,user_id,name,email,topic,message) VALUES (?,?,?,?,?,?)", [randomUUID(), session?.user.id ?? null, name, email, topic, message]);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) { return apiError(e); }
}
