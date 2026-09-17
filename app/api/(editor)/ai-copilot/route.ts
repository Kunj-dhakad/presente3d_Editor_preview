import {protectedRoute} from "@shared/server/protected-route";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { COPILOT_SYSTEM_PROMPT, buildContextMessage } from "@editor/lib/ai/prompts/systemPrompt";
import type { ChatTurn, CopilotContext } from "@editor/lib/ai/types";

export const runtime = "nodejs";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 60000,
    maxRetries: 1,
});

/** Recent turns only — context must not grow without bound. */
const MAX_HISTORY_TURNS = 6;

type CopilotRequest = {
    message?: string;
    context?: CopilotContext;
    history?: ChatTurn[];
};

async function handlePOST(req: Request) {
    try {
        const { message, context, history }: CopilotRequest = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
        }
        if (!context?.slide) {
            return NextResponse.json({ success: false, error: "Editor context required" }, { status: 400 });
        }

        const recent = (Array.isArray(history) ? history : [])
            .slice(-MAX_HISTORY_TURNS)
            .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
            .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 600) }));

        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            temperature: 0.2,
            messages: [
                { role: "system", content: COPILOT_SYSTEM_PROMPT },
                { role: "system", content: `EDITOR CONTEXT:\n${buildContextMessage(context)}` },
                ...recent,
                { role: "user", content: message },
            ],
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new Error("Empty response from the model");

        // Parsed here so a malformed body fails as an API error, but validated
        // (and only trusted) on the client before anything is executed.
        return NextResponse.json({ success: true, plan: JSON.parse(raw) });
    } catch (error) {
        console.error("AI COPILOT ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Copilot request failed",
            },
            { status: 500 },
        );
    }
}

export const POST = protectedRoute(handlePOST);
