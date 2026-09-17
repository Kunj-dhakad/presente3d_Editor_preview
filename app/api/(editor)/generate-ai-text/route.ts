import {protectedRoute} from "@shared/server/protected-route";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

async function handlePOST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt?.trim()) {
            return NextResponse.json(
                { success: false, error: "Prompt is required" },
                { status: 400 }
            );
        }

        const system = `
            You are a professional copywriter.

            Generate SHORT, clear text based on the user's prompt.

            STRICT RULES:
            - Output must be UNDER 300 CHARACTERS TOTAL
            - Count characters carefully
            - Return ONLY plain text
            - No explanations
            - If needed, compress ideas
            - Suitable for presentation text
            `;


        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const text = completion.choices[0]?.message?.content?.trim();

        if (!text) {
            throw new Error("No text generated");
        }

        return NextResponse.json({
            success: true,
            text,
        });
    } catch (error) {
        console.error("❌ AI Text API Error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export const POST = protectedRoute(handlePOST);
