import {protectedRoute} from "@shared/server/protected-route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Text-to-speech for the reader's "read this page aloud" control.
 *
 * The client (`useTts`) wants two things back: the audio as base64 MP3, and
 * Speechify's speech marks, which carry a `start` character offset per word.
 * That offset is what lets the reader highlight the word currently being
 * spoken, so the marks are not optional extra — dropping them would leave the
 * page silent-highlighted while the audio plays.
 */

const SPEECHIFY_ENDPOINT = "https://api.sws.speechify.com/v1/audio/speech";

/** Speechify rejects very long inputs; a page of a book sits well under this. */
const MAX_CHARS = 8000;

const DEFAULT_VOICE = "henry";

async function handlePOST(req: Request) {
    try {
        const apiKey = process.env.SPEECHIFY_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Speech is not configured on this server." },
                { status: 503 },
            );
        }

        const { text, voiceId } = await req.json();

        if (typeof text !== "string" || !text.trim()) {
            return NextResponse.json(
                { error: "There is no text on this page to read." },
                { status: 400 },
            );
        }

        const input = text.trim().slice(0, MAX_CHARS);

        const speechifyRes = await fetch(SPEECHIFY_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input,
                voice_id: typeof voiceId === "string" && voiceId ? voiceId : DEFAULT_VOICE,
                audio_format: "mp3",
            }),
        });

        if (!speechifyRes.ok) {
            // Speechify's own message is the useful one here — it says whether
            // the key is bad, the voice is unknown, or the quota is spent.
            const detail = await speechifyRes.text().catch(() => "");
            console.error("Speechify request failed:", speechifyRes.status, detail);
            return NextResponse.json(
                {
                    error:
                        speechifyRes.status === 401 || speechifyRes.status === 403
                            ? "Speech credentials were rejected."
                            : "Speech could not be generated right now.",
                },
                { status: 502 },
            );
        }

        const data = await speechifyRes.json();

        if (!data?.audio_data) {
            return NextResponse.json(
                { error: "Speech came back empty." },
                { status: 502 },
            );
        }

        return NextResponse.json({
            audioBase64: data.audio_data,
            speechMarks: data.speech_marks ?? null,
        });
    } catch (error) {
        console.error("Speechify route error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Speech could not be generated right now.",
            },
            { status: 500 },
        );
    }
}

export const POST = protectedRoute(handlePOST);
