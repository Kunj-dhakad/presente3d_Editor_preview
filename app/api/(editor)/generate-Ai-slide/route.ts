import {protectedRoute} from "@shared/server/protected-route";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 120000,
  maxRetries: 2,
});

type PageContent = {
  title?: string;
  subtitle?: string;
  paragraph1?: string;
  paragraph2?: string;
  cta?: string;
};

type SlideElementData = Record<string, unknown>;

type SlideElement = {
  id: string;
  data: SlideElementData;
};

function makeId() {
  return `${Date.now()}${Math.random()}`;
}

function words(v = "", max = 20) {
  return String(v).split(/\s+/).filter(Boolean).slice(0, max).join(" ");
}

function imageUrl(prompt: string, w: number, h: number, pageNum: number) {
  const seed = encodeURIComponent(`${prompt}-${w}-${h}-${pageNum}-${Date.now()}`);
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function text(data: SlideElementData) {
  return {
    id: makeId(),
    data: {
      type: "text",
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      fontFamily: "Inter",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: 0,
      text: "",
      fontSize: 16,
      fontWeight: 400,
      width: 100,
      height: 30,
      ...data,
    },
  };
}

function image(data: SlideElementData) {
  return {
    id: makeId(),
    data: {
      type: "image",
      src: "",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      stroke: "",
      strokeWidth: 0,
      borderRadius: "0",
      offsetX: 0,
      offsetY: 0,
      blur: 0,
      color: "transparent",
      fit: "cover",
      maxWidth: 300,
      maxHeight: 200,
      objectFit: "cover",
      contrast: 100,
      hueRotate: 0,
      saturate: 100,
      grayscale: 0,
      sepia: 0,
      brightness: 100,
      transform: "none",
      isDragging: false,
      animationType: "None",
      ...data,
    },
  };
}

function button(data: SlideElementData) {
  return {
    id: makeId(),
    data: {
      type: "button",
      text: "Read More",
      x: 0,
      y: 0,
      width: 130,
      height: 34,
      fontSize: 13,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      fontFamily: "Inter",
      buttonStyle: "gradient-red-pill",
      gradientFrom: "#7c3aed",
      gradientTo: "#a855f7",
      gradientDirection: "diagonal",
      backgroundColor: "#7c3aed",
      textColor: "#ffffff",
      borderRadius: 999,
      fontWeight: 700,
      borderWidth: 0,
      ...data,
    },
  };
}

function slide(width: number, height: number, background: string, elements: SlideElement[], subtitle = "") {
  return {
    background,
    width,
    height,
    subtitle_url: "",
    subtitle_text: subtitle,
    subtitle_json: "",
    thumbnail: "",
    elements: elements.map((el) => el.data),
  };
}
function buildPortrait(c: PageContent, src: string,) {
  const v = Math.floor(Math.random() * 4);
  const title = words(c.title, 6);
  const subtitle = words(c.subtitle, 12);
  const p1 = words(c.paragraph1, 26);
  const p2 = words(c.paragraph2, 18);
  const cta = words(c.cta || "Read More", 3);

  if (v === 0) {
    return slide(350, 434, "#ffffff", [
      text({ text: title, x: 28, y: 16, width: 294, height: 58, fontSize: 27, fontWeight: 800, textAlign: "center", lineHeight: 1.08 }),
      image({ src, x: 24, y: 88, width: 302, height: 122, borderRadius: "8" }),
      text({ text: subtitle, x: 28, y: 228, width: 294, height: 34, fontSize: 12, fontWeight: 600, textAlign: "center", color: "#555" }),
      text({ text: p1, x: 28, y: 278, width: 294, height: 58, fontSize: 10.2, textAlign: "center", lineHeight: 1.22, color: "#333" }),
      text({ text: p2, x: 28, y: 344, width: 294, height: 42, fontSize: 10.2, textAlign: "center", lineHeight: 1.22, color: "#444" }),
      button({ text: cta, x: 104, y: 398, width: 142, height: 30, fontSize: 12 }),
    ], subtitle);
  }

  if (v === 1) {
    return slide(350, 434, "#f8fafc", [
      image({ src, x: 0, y: 0, width: 136, height: 434 }),
      text({ text: title, x: 158, y: 38, width: 168, height: 76, fontSize: 23, fontWeight: 800, lineHeight: 1.08 }),
      text({ text: subtitle, x: 158, y: 132, width: 168, height: 42, fontSize: 11.5, fontWeight: 600, color: "#555", lineHeight: 1.22 }),
      text({ text: p1, x: 158, y: 196, width: 168, height: 90, fontSize: 9.8, lineHeight: 1.22, color: "#333" }),
      text({ text: p2, x: 158, y: 302, width: 168, height: 62, fontSize: 9.8, lineHeight: 1.22, color: "#444" }),
      button({ text: cta, x: 158, y: 382, width: 120, height: 30, fontSize: 12 }),
    ], subtitle);
  }

  if (v === 2) {
    return slide(350, 434, "#fff7ed", [
      text({ text: title, x: 24, y: 34, width: 302, height: 62, fontSize: 27, fontWeight: 800, textAlign: "left", lineHeight: 1.08 }),
      text({ text: subtitle, x: 24, y: 108, width: 302, height: 36, fontSize: 12, fontWeight: 600, color: "#555" }),
      image({ src, x: 24, y: 160, width: 302, height: 90, borderRadius: "10" }),
      text({ text: p1, x: 24, y: 270, width: 302, height: 62, fontSize: 10.2, lineHeight: 1.22, color: "#333" }),
      text({ text: p2, x: 24, y: 342, width: 302, height: 48, fontSize: 10.2, lineHeight: 1.22, color: "#444" }),
      button({ text: cta, x: 24, y: 400, width: 126, height: 30, fontSize: 12 }),
    ], subtitle);
  }

  return slide(350, 434, "#ecfeff", [
    text({ text: title, x: 24, y: 28, width: 302, height: 62, fontSize: 26, fontWeight: 800, textAlign: "center", color: "#164e63", lineHeight: 1.08 }),
    image({ src, x: 60, y: 106, width: 230, height: 116, borderRadius: "14" }),
    text({ text: subtitle, x: 30, y: 238, width: 290, height: 34, fontSize: 12, fontWeight: 600, textAlign: "center", color: "#0e7490" }),
    text({ text: p1, x: 30, y: 292, width: 290, height: 60, fontSize: 10.2, textAlign: "center", lineHeight: 1.22, color: "#164e63" }),
    text({ text: p2, x: 30, y: 360, width: 290, height: 42, fontSize: 10.2, textAlign: "center", lineHeight: 1.22, color: "#164e63" }),
  ], subtitle);
}

function buildSquare(c: PageContent, src: string) {
  const v = Math.floor(Math.random() * 4);
  const title = words(c.title, 6);
  const subtitle = words(c.subtitle, 12);
  const p1 = words(c.paragraph1, 26);
  const p2 = words(c.paragraph2, 18);
  const cta = words(c.cta || "Read More", 3);

  if (v === 0) {
    return slide(434, 434, "#ffffff", [
      text({ text: title, x: 44, y: 18, width: 346, height: 58, fontSize: 29, fontWeight: 800, textAlign: "center", lineHeight: 1.08 }),
      image({ src, x: 42, y: 92, width: 350, height: 122, borderRadius: "10" }),
      text({ text: subtitle, x: 44, y: 232, width: 346, height: 34, fontSize: 13, fontWeight: 600, textAlign: "center", color: "#555" }),
      text({ text: p1, x: 44, y: 286, width: 346, height: 58, fontSize: 10.5, textAlign: "center", lineHeight: 1.22, color: "#333" }),
      text({ text: p2, x: 44, y: 354, width: 346, height: 40, fontSize: 10.5, textAlign: "center", lineHeight: 1.22, color: "#444" }),
      button({ text: cta, x: 152, y: 400, width: 130, height: 30, fontSize: 12 }),
    ], subtitle);
  }

  if (v === 1) {
    return slide(434, 434, "#f8fafc", [
      image({ src, x: 0, y: 0, width: 170, height: 434 }),
      text({ text: title, x: 196, y: 42, width: 204, height: 72, fontSize: 27, fontWeight: 800, lineHeight: 1.08 }),
      text({ text: subtitle, x: 196, y: 130, width: 204, height: 42, fontSize: 12, fontWeight: 600, color: "#555" }),
      text({ text: p1, x: 196, y: 196, width: 204, height: 88, fontSize: 10.5, lineHeight: 1.22, color: "#333" }),
      text({ text: p2, x: 196, y: 302, width: 204, height: 58, fontSize: 10.5, lineHeight: 1.22, color: "#444" }),
      button({ text: cta, x: 196, y: 382, width: 124, height: 30, fontSize: 12 }),
    ], subtitle);
  }

  if (v === 2) {
    return slide(434, 434, "#fff7ed", [
      text({ text: title, x: 34, y: 38, width: 366, height: 60, fontSize: 29, fontWeight: 800, color: "#7c2d12", lineHeight: 1.08 }),
      text({ text: subtitle, x: 34, y: 112, width: 366, height: 34, fontSize: 13, fontWeight: 600, color: "#9a3412" }),
      image({ src, x: 34, y: 166, width: 366, height: 94, borderRadius: "12" }),
      text({ text: p1, x: 34, y: 280, width: 366, height: 58, fontSize: 10.5, lineHeight: 1.22, color: "#431407" }),
      text({ text: p2, x: 34, y: 348, width: 366, height: 42, fontSize: 10.5, lineHeight: 1.22, color: "#431407" }),
    ], subtitle);
  }

  return slide(434, 434, "#ecfeff", [
    text({ text: title, x: 40, y: 34, width: 354, height: 58, fontSize: 29, fontWeight: 800, textAlign: "center", color: "#164e63" }),
    image({ src, x: 92, y: 108, width: 250, height: 116, borderRadius: "16" }),
    text({ text: subtitle, x: 44, y: 242, width: 346, height: 34, fontSize: 13, fontWeight: 600, textAlign: "center", color: "#0e7490" }),
    text({ text: p1, x: 44, y: 296, width: 346, height: 58, fontSize: 10.5, textAlign: "center", lineHeight: 1.22, color: "#164e63" }),
    button({ text: cta, x: 152, y: 382, width: 130, height: 30, fontSize: 12 }),
  ], subtitle);
}
 
function buildLandscape(c: PageContent, src: string) {
  const v = Math.floor(Math.random() * 4);
  const title = words(c.title, 8);
  const subtitle = words(c.subtitle, 16);
  const p1 = words(c.paragraph1, 44);
  const p2 = words(c.paragraph2, 28);
  const cta = words(c.cta || "Read More", 3);

  if (v === 0) {
    return slide(690, 434, "#f8fafc", [
      image({ src, x: 0, y: 0, width: 300, height: 434 }),
      text({ text: title, x: 330, y: 46, width: 320, height: 78, fontSize: 33, fontWeight: 800, lineHeight: 1.08 }),
      text({ text: subtitle, x: 330,  y: 140, width: 310, height: 38, fontSize: 14, fontWeight: 600, color: "#555" }),
      text({ text: p1, x: 330, y: 202, width: 310, height: 90, fontSize: 12, lineHeight: 1.28, color: "#333" }),
      text({ text: p2, x: 330, y: 308, width: 310, height: 58, fontSize: 12, lineHeight: 1.28, color: "#444" }),
      button({ text: cta, x: 330, y: 382, width: 126, height: 32, fontSize: 12 }),
    ], subtitle);
  }

  if (v === 1) {
    return slide(690, 434, "#ffffff", [
      text({ text: title, x: 38, y: 38, width: 280, height: 82, fontSize: 34, fontWeight: 800, lineHeight: 1.08 }),
      text({ text: subtitle, x: 38, y: 138, width: 280, height: 42, fontSize: 14, fontWeight: 600, color: "#555" }),
      text({ text: p1, x: 38, y: 210, width: 280, height: 92, fontSize: 12, lineHeight: 1.28, color: "#333" }),
      image({ src, x: 370, y: 48, width: 250, height: 210, borderRadius: "16" }),
      button({ text: cta, x: 38, y: 350, width: 126, height: 34, fontSize: 12 }),
    ], subtitle);
  }

  if (v === 2) {
    return slide(690, 434, "#fff7ed", [
      image({ src, x: 40, y: 54, width: 240, height: 250, borderRadius: "18" }),
      text({ text: title, x: 330, y: 72, width: 280, height: 78, fontSize: 33, fontWeight: 800, color: "#7c2d12", lineHeight: 1.08 }),
      text({ text: subtitle, x: 330, y: 166, width: 280, height: 40, fontSize: 14, fontWeight: 600, color: "#9a3412" }),
      text({ text: p1, x: 330, y: 230, width: 280, height: 92, fontSize: 12, lineHeight: 1.28, color: "#431407" }),
      button({ text: cta, x: 330, y: 358, width: 130, height: 34, fontSize: 12 }),
    ], subtitle);
  }

  return slide(690, 434, "#ecfeff", [
    text({ text: title, x: 44, y: 46, width: 310, height: 80, fontSize: 34, fontWeight: 800, color: "#164e63", lineHeight: 1.08 }),
    text({ text: subtitle, x: 44, y: 140, width: 310, height: 38, fontSize: 14, fontWeight: 600, color: "#0e7490" }),
    text({ text: p1, x: 44, y: 204, width: 310, height: 92, fontSize: 12, lineHeight: 1.28, color: "#164e63" }),
    image({ src, x: 410, y: 68, width: 220, height: 190, borderRadius: "16" }),
    button({ text: cta, x: 44, y: 354, width: 126, height: 34, fontSize: 12 }),
  ], subtitle);
}

function buildPage(c: PageContent, prompt: string, width: number, height: number, pageNum: number) {
  const src = imageUrl(prompt, width, height, pageNum);

  if (width === 690 && height === 434) return buildLandscape(c, src);
  if (width === 434 && height === 434) return buildSquare(c, src);

  return buildPortrait(c, src);
}

async function handlePOST(req: Request) {
  try {
    const { prompt, width = 350, height = 434, pageNum = 1 } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ success: false, error: "Prompt required" }, { status: 400 });
    }

    const ai = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `
            Generate attractive book page content for: "${prompt}"
            
            Return ONLY JSON:
            {
              "title": "max 8 words",
              "subtitle": "max 16 words",
              "paragraph1": "30 to 40 words",
              "paragraph2": "20 to 30 words",
              "cta": "max 3 words"
            }
            `,
        },
      ],
    });

    const raw = ai.choices[0]?.message?.content;
    const content: PageContent = raw ? JSON.parse(raw) : {};

    const page = buildPage(content, prompt, Number(width), Number(height), Number(pageNum));

    return NextResponse.json({ success: true, content: page });

  } catch (error: unknown) {
    console.error("BOOK PAGE ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}







export const POST = protectedRoute(handlePOST);
