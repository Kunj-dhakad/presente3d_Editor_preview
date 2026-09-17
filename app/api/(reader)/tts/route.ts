import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, checkOrigin, consumeLimit } from "@shared/server/api";

// Public endpoint: the reader needs it without an account, so it is limited per IP.
const clientKey = (req: NextRequest) =>
  createHash("sha256").update((req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown").digest("hex").slice(0, 40);

const DEFAULT_VOICE_ID = "george";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      console.error(`Speechify fetch attempt ${attempt + 1} failed:`, error);

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    await consumeLimit(clientKey(req), "tts", 40, 3600);
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "Text is too long to read aloud." }, { status: 413 });
    }

    const voice =
      typeof voiceId === "string" && /^[\w.-]{1,100}$/.test(voiceId)
        ? voiceId
        : DEFAULT_VOICE_ID;

    const apiKey = process.env.SPEECHIFY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Speechify API key missing" },
        { status: 500 }
      );
    }

    let response: Response;

    try {
      response = await fetchWithRetry(
        "https://api.sws.speechify.com/v1/audio/speech",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: text,
            voice_id: voice,
            audio_format: "mp3",
            model: "simba-english",
          }),
        },
        2
      );

      console.log("SPEECHIFY STATUS =", response.status);
    } catch (err) {
      console.error("SPEECHIFY FETCH ERROR =", err);

      return NextResponse.json(
        {
          error: "Speechify fetch failed",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }

    const rawText = await response.text();

    console.log("SPEECHIFY RAW RESPONSE =", rawText.slice(0, 300));

    let data: {
      audio_data?: string;
      message?: string;
      error?: string;
      speech_marks?: unknown;
      speechMarks?: unknown;
      chunks?: unknown;
      metadata?: { speech_marks?: unknown };
    } | null = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Speechify returned non-JSON response",
          detail: rawText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Speechify returned an empty response" },
        { status: 500 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.message || data?.error || "Speechify API failed",
          detail: data,
        },
        { status: response.status }
      );
    }

    if (!data.audio_data) {
      return NextResponse.json(
        {
          error: "No audio_data received from Speechify",
          detail: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audioBase64: data.audio_data,
      speechMarks:
        data.speech_marks ||
        data.speechMarks ||
        data.chunks ||
        data.metadata?.speech_marks ||
        null,
    });
  } catch (error) {
    console.error("ROUTE ERROR =", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Speechify request failed",
      },
      { status: 500 }
    );
  }
}