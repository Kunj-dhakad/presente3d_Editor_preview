import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, consumeLimit } from "@shared/server/api";
import type { NarrationVoice } from "@reader/types/voice";


interface RawVoice {
  id?: string;
  display_name?: string;
  gender?: string;
  locale?: string;
  preview_audio?: string | null;
  avatar_image?: string | null;
  models?: Array<{
    name?: string;
    languages?: Array<{ locale?: string; preview_audio?: string | null }>;
  }>;
}

/* The voice list rarely changes — keep it in memory for an hour. */
const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { voices: NarrationVoice[]; at: number } | null = null;

function normalizeGender(value: string | undefined): NarrationVoice["gender"] {
  const g = (value ?? "").toLowerCase();
  if (g === "male") return "male";
  if (g === "female") return "female";
  return "other";
}

function normalizeVoice(raw: RawVoice): NarrationVoice | null {
  if (!raw.id) return null;

  const languages = (raw.models ?? []).flatMap((m) => m.languages ?? []);
  const english = languages.find((l) => l.locale?.toLowerCase().startsWith("en"));
  const locale = raw.locale ?? english?.locale ?? languages[0]?.locale ?? "";

  return {
    id: raw.id,
    name: raw.display_name || raw.id,
    gender: normalizeGender(raw.gender),
    locale,
    previewUrl: raw.preview_audio || english?.preview_audio || null,
    avatarUrl: raw.avatar_image || null,
  };
}

/* Narration uses the simba-english model, so only offer English voices. */
function speaksEnglish(raw: RawVoice): boolean {
  if (raw.locale?.toLowerCase().startsWith("en")) return true;
  return (raw.models ?? []).some((m) =>
    (m.languages ?? []).some((l) => l.locale?.toLowerCase().startsWith("en")),
  );
}

export async function GET(req: Request) {
  try {
    await consumeLimit(createHash("sha256").update((req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown").digest("hex").slice(0, 40), "tts-voices", 20, 3600);
  } catch (e) { return apiError(e); }
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ voices: cache.voices });
  }

  const apiKey = process.env.SPEECHIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Speechify API key missing" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.sws.speechify.com/v1/voices", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Speechify voices request failed (${response.status})` },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as RawVoice[] | { voices?: RawVoice[] };
    const rawVoices = Array.isArray(payload) ? payload : (payload.voices ?? []);

    const english = rawVoices.filter(speaksEnglish);
    const voices = (english.length > 0 ? english : rawVoices)
      .map(normalizeVoice)
      .filter((voice): voice is NarrationVoice => voice !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    cache = { voices, at: Date.now() };
    return NextResponse.json({ voices });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Speechify voices request failed",
      },
      { status: 500 },
    );
  }
}
