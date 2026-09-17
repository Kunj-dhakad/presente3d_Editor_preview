import {protectedRoute} from "@shared/server/protected-route";


import { NextResponse } from "next/server";
import OpenAI from "openai";

// Created on first use, so building the app does not need the API key.
let openai: OpenAI | null = null;
const client = () => (openai ??= new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
}));

async function handlePOST(req: Request) {
  const { prompt } = await req.json();

  /* -----------------------------
     ⚠️ SAME SYSTEM PROMPT (UNCHANGED)
  ----------------------------- */

  const system = `
You are an elite presentation designer for Apple keynotes and modern SaaS brands.
You design with strict layout math and clear hierarchy, not guesswork.

Your task:
Create  premium slide that is clean, bold, and perfectly aligned.
No overlap, no randomness in sizing, no accidental spacing.

────────────────────────
CANVAS
────────────────────────
- Width: 853.33
- Height: 480
- Background color MUST be pure white (#FFFFFF)

────────────────────────
LAYOUT STRUCTURE (HARD RULES)
────────────────────────
- Use EXACTLY two columns
- Image column = 40% of total canvas width
- Text column = 60% of total canvas width
- Leave a small internal gutter (16–24px) between image and text
- Columns must NEVER overlap
- Column side can be RANDOM:
  • Option A: Image left (40%), Text right (60%)
  • Option B: Text left (60%), Image right (40%)

────────────────────────
IMAGE RULES (VERY STRICT)
────────────────────────
- Single editorial image only
- Image must fill its column visually
- NO padding, NO inset, NO margin around image
- Image width = exact column width
- Image height = exact canvas height
- Image may be cropped but NEVER padded
- borderRadius: 20px applied directly on image
- Image must feel edge-to-edge inside its column

────────────────────────
TEXT COLUMN RULES (STRICT)
────────────────────────
- Text column MAY have padding only on TOP
- Top padding: 20–30px
- NO left/right padding except gutter separation
- Text alignment: left only
- Text must start from top and flow downward naturally

────────────────────────
TEXT ORDER & CONTENT
────────────────────────
- Fixed order ONLY:
  1. Heading
  2. Subheading
  3. Paragraph (body/spec text)
  4. Paragraph (body/spec text)
  5. Paragraph (body/spec text)

- Heading: exactly 1 block
- Subheading: exactly 1 block
- Paragraph: exactly 3 block
- No extra text blocks allowed

────────────────────────
TYPOGRAPHY (CONTROLLED SIZES)
────────────────────────
- Heading fontSize: 40–44
- Heading fontWeight: 600–700

- Subheading fontSize: 20–22
- Paragraph fontSize: 15–16

- Line height:
  • Heading: 1.25–1.3
  • Subheading: 1.35
  • Paragraph: 1.45

- Vertical spacing between text blocks: 16–20px

────────────────────────
OVERLAP & CANVAS BOUNDS (CRITICAL)
────────────────────────
- ALL text MUST fit inside the canvas height
- Text column must end at least 32px before canvas bottom
- Paragraph text is HARD-LIMITED to maximum 3 lines
- If content exceeds space:
  → FIRST reduce paragraph text
  → NEVER allow text to overflow or clip
- Text must remain 100% visible
────────────────────────
VERTICAL FLOW RULE (MANDATORY)
────────────────────────
- Text blocks must be stacked strictly top to bottom
- Each block must start AFTER the previous block ends
- Minimum spacing between blocks must always be respected
- Overlapping text blocks are strictly forbidden


────────────────────────
HEADING CONSTRAINTS (CRITICAL)
────────────────────────
- Heading is LIMITED to maximum 2 lines
- Heading must NEVER exceed 2 lines
- If heading text exceeds 2 lines:
  → shorten heading text
  → NEVER allow overlap with subheading

────────────────────────
COLOR RULES
────────────────────────
- Heading color: #0B0B0B
- Subheading color: #222222
- Paragraph color: #555555
- NEVER use white text
- NEVER auto-invert colors

────────────────────────
OUTPUT RULES (NON-NEGOTIABLE)
────────────────────────
- Output ONLY valid JSON
- No markdown
- No explanation
- No comments
- No extra keys
- No IDs
- Absolute positioning ONLY
────────────────────────
SUBTITLE TEXT RULE (METADATA)
────────────────────────
- subtitle_text MUST be 160–200 characters
- It describes WHAT this slide communicates
- It is NOT a visual subtitle on the slide
- It is for slide information, navigation, or AI understanding

────────────────────────
OUTPUT FORMAT (STRICT)
────────────────────────

Return ONLY JSON:

{
  "slides": [
    {
      "background": "#FFFFFF",
      "width": 853.33,
      "height": 480,
      "subtitle_text": string,
      "subtitle_url": string,

 "elements": [
                {
                    "id": "17661220964370.5743084696773377",
                    "data": {
                        "type": "text",
                        "x": ,
                        "y": ,
                        "width": ,
                        "height": ,
                        "rotation": 0,
                        "opacity": 1,
                        "zIndex": 1,
                        "text": "",
                        "fontSize": 24,
                        "fontFamily": "Playfair Display",
                        "fontWeight": "normal",
                        "color": "#ffffff",
                        "textAlign": "left",
                        "textColor": "#ffffff",
                        "textTransform": "none",
                        "textDecorationLine": "none",
                        "align": "left",
                        "lineHeight": 1.2,
                        "letterSpacing": 0,
                        "textDecoration": "none",
                        "fontStyle": "normal",
                        "strokeWidth": 0,
                        "BorderborderRadius": 0,
                        "offsetX": 0,
                        "offsetY": 0,
                        "Shadowblur": 0,
                        "isDragging": false
                    }
                },
                {
                    "id": "17661221873330.8061318121548889",
                    "data": {
                        "type": "image",
                        "src": "https://images.pexels.com/photos/2325447/pexels-photo-2325447.jpeg",
                        "x": 532.671875,
                        "y": 36,
                        "width": 300,
                        "height": 361,
                        "rotation": 0,
                        "opacity": 1,
                        "zIndex": 1,
                        "stroke": "",
                        "strokeWidth": 0,
                        "borderRadius": "0",
                        "offsetX": 0,
                        "offsetY": 0,
                        "blur": 0,
                        "color": "transparent",
                        "fit": "cover",
                        "maxWidth": 300,
                        "maxHeight": 200,
                        "objectFit": "cover",
                        "contrast": 100,
                        "hueRotate": 0,
                        "saturate": 100,
                        "grayscale": 0,
                        "sepia": 0,
                        "brightness": 100,
                        "transform": "none",
                        "isDragging": false,
                        "animationType": "None"
                    }
                }
            ]
    }
  ]
}

Rules:
- Absolute positioning only
- Output JSON only
`;
  /* -----------------------------
     GENERATE SINGLE SLIDE
  ----------------------------- */

  async function generateSingleSlide(index: number) {
    const userMessage = `
Generate ONLY slide ${index} of a 10-slide presentation based on this topic:
"${prompt}"

Return exactly ONE slide inside:
{
  "slides":[ ...single slide... ]
}
`;

    const completion = await client().chat.completions.create({
      model: "gpt-5.2",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    });

    const content = completion.choices[0].message.content!;
    const data = JSON.parse(content);

    return data.slides[0]; // single slide extract
  }

  /* -----------------------------
     🚀 PARALLEL GENERATION
  ----------------------------- */

  const slidePromises = Array.from({ length: 10 }).map((_, i) =>
    generateSingleSlide(i + 1)
  );

  const slides = await Promise.all(slidePromises);

  /* -----------------------------
     FINAL RESPONSE (UNCHANGED FORMAT)
  ----------------------------- */

  return NextResponse.json({
    slides,
  });
}
export const POST = protectedRoute(handlePOST);
