import {protectedRoute} from "@shared/server/protected-route";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 60000,
  maxRetries: 2,
});

type QuizAiOption = { text: string; correct: boolean };
type QuizAiQuestion = { question: string; options: QuizAiOption[] };

async function handlePOST(req: Request) {
  try {
    const { prompt, mode = "quiz", count = 3 } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (mode === "question") {
      const ai = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `
              Write ONE short, clear open-ended question for a reader engagement popup about: "${prompt}".
              Also write a short placeholder hint for the answer textbox.

              Return ONLY JSON:
              {
                "question": "max 15 words",
                "placeholder": "max 8 words"
              }
            `,
          },
        ],
      });
      const raw = ai.choices[0]?.message?.content;
      const content = raw ? JSON.parse(raw) : {};
      return NextResponse.json({
        success: true,
        question: content.question ?? prompt,
        placeholder: content.placeholder ?? "Type your answer here…",
      });
    }

    // mode === "quiz"
    const questionCount = Math.min(Math.max(Number(count) || 3, 1), 8);
    const ai = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `
            Create a short quiz about: "${prompt}".
            Generate exactly ${questionCount} multiple-choice questions.
            Each question must have exactly 4 options, with exactly ONE correct option.
            Keep questions and options short and clear.

            Return ONLY JSON in this exact shape:
            {
              "title": "max 6 words",
              "questions": [
                {
                  "question": "max 18 words",
                  "options": [
                    { "text": "max 8 words", "correct": true },
                    { "text": "max 8 words", "correct": false },
                    { "text": "max 8 words", "correct": false },
                    { "text": "max 8 words", "correct": false }
                  ]
                }
              ]
            }
          `,
        },
      ],
    });

    const raw = ai.choices[0]?.message?.content;
    const content: { title?: string; questions?: QuizAiQuestion[] } = raw
      ? JSON.parse(raw)
      : {};

    if (!content.questions?.length) {
      throw new Error("No quiz content generated");
    }

    return NextResponse.json({
      success: true,
      title: content.title ?? "Quick quiz",
      questions: content.questions,
    });
  } catch (error) {
    console.error("❌ Quiz AI Generate Error:", error);
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
