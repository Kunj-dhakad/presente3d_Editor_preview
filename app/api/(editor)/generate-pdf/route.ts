import {protectedRoute} from "@shared/server/protected-route";
import {exportInput} from "@shared/server/export";
import {saveAsset} from "@shared/server/assets";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFPage, rgb, StandardFonts, PDFFont } from "pdf-lib";
import { interactionFlatLabel } from "@editor/blocks/Interaction/renderer/interactionLabel";
import { qrToSvg } from "@editor/blocks/QRCode/qr";



function hexToRgb(hex?: string | null) {
  if (!hex) return rgb(0, 0, 0);

  const trimmed = String(hex).trim();
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return rgb(
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255
    );
  }


  const namedColors: Record<string, string> = {
    red: "ff0000", green: "008000", blue: "0000ff", yellow: "ffff00",
    white: "ffffff", black: "000000", orange: "ffa500", purple: "800080",
    pink: "ffc0cb", cyan: "00ffff", magenta: "ff00ff", gray: "808080",
    grey: "808080",
  };
  const lower = trimmed.toLowerCase();
  if (namedColors[lower]) {
    return hexToRgb("#" + namedColors[lower]);
  }

  let s = trimmed.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length !== 6) return rgb(0, 0, 0);

  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return rgb(0, 0, 0);
  return rgb(r, g, b);
}

async function fetchImageBytes(url: string) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "";
    const ab = await resp.arrayBuffer();
    return { bytes: Buffer.from(new Uint8Array(ab)), contentType };
  } catch (err) {
    console.error("fetchImageBytes error", err);
    return null;
  }
}

async function resolveImage(src: string) {
  if (!src) return null;
  if (src.startsWith("data:")) {
    const match = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) return null;
    return { bytes: Buffer.from(match[2], "base64"), contentType: match[1] };
  }
  if (/^https?:\/\//i.test(src)) return await fetchImageBytes(src);
  return null;
}

// ─── HTML → rich text runs ────────────────────────────────────────────────────

interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string;
  fontSize: number;
}


function parseHtmlToRuns(
  html: string,
  baseColor: string,
  baseFontSize: number
): TextRun[][] {
  const lines: TextRun[][] = [[]];

  interface Frame {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    color: string;
    fontSize: number;
  }

  const stack: Frame[] = [{
    bold: false, italic: false, underline: false,
    strikethrough: false, color: baseColor, fontSize: baseFontSize,
  }];

  const top = () => stack[stack.length - 1];
  const push = (patch: Partial<Frame>) => stack.push({ ...top(), ...patch });
  const pop = () => { if (stack.length > 1) stack.pop(); };

  const TOKEN = /<([^>]+)>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(html)) !== null) {
    const tagContent = m[1];
    const textContent = m[2];

    // ── Plain text node ──
    if (textContent !== undefined) {
      const decoded = textContent
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const parts = decoded.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) lines.push([]);
        if (parts[i]) {
          lines[lines.length - 1].push({ text: parts[i], ...top() });
        }
      }
      continue;
    }

    if (tagContent === undefined) continue;
    const tag = tagContent.trim();
    const tagLower = tag.toLowerCase();

    // Line break
    if (/^br[\s/]/i.test(tagLower) || tagLower === "br") {
      lines.push([]);
      continue;
    }


    if (tag.startsWith("/")) { pop(); continue; }


    if (tag.endsWith("/")) continue;




    if (/^(b|strong)(\s|$)/i.test(tagLower)) { push({ bold: true }); continue; }

    if (/^(i|em)(\s|$)/i.test(tagLower)) { push({ italic: true }); continue; }

    if (/^u(\s|$)/i.test(tagLower)) { push({ underline: true }); continue; }

    if (/^(s|strike|del)(\s|$)/i.test(tagLower)) { push({ strikethrough: true }); continue; }

    if (/^(p|div)(\s|$)/i.test(tagLower)) {
      if (lines[lines.length - 1].length > 0) lines.push([]);
      push({});
      continue;
    }

    const fontColorMatch = tag.match(/^font\b[^>]*\bcolor=["']?([^"'\s>]+)/i);
    if (fontColorMatch) {
      push({ color: fontColorMatch[1].trim() });
      continue;
    }

    if (/^span(\s|$)/i.test(tagLower)) {
      const styleMatch = tag.match(/style=["']([^"']+)["']/i);
      const patch: Partial<Frame> = {};

      if (styleMatch) {
        const styleStr = styleMatch[1];
        const colorMatch = styleStr.match(/\bcolor\s*:\s*([^;]+)/i);
        if (colorMatch) {
          patch.color = colorMatch[1].trim();
        }
        const fsMatch = styleStr.match(/font-size\s*:\s*([\d.]+)px/i);
        if (fsMatch) patch.fontSize = parseFloat(fsMatch[1]);

        const fwMatch = styleStr.match(/font-weight\s*:\s*(\w+)/i);
        if (fwMatch) {
          patch.bold = fwMatch[1] === "bold" || parseInt(fwMatch[1]) >= 700;
        }

        const fiMatch = styleStr.match(/font-style\s*:\s*(\w+)/i);
        if (fiMatch) patch.italic = fiMatch[1] === "italic";


        const tdMatch = styleStr.match(/text-decoration\s*:\s*([^;]+)/i);
        if (tdMatch) {
          const td = tdMatch[1].toLowerCase();
          if (td.includes("underline")) patch.underline = true;
          if (td.includes("line-through")) patch.strikethrough = true;
        }
      }

      push(patch);
      continue;
    }
    push({});
  }

  return lines;
}



function pickFont(
  fonts: { normal: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont },
  bold: boolean,
  italic: boolean
) {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.normal;
}



async function drawRichText(
  page: PDFPage,
  pdfDoc: PDFDocument,
  helv: PDFFont,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  yTop: number,
  maxWidth: number
) {
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helvBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const fonts = { normal: helv, bold: helvBold, italic: helvOblique, boldItalic: helvBoldOblique };

  const baseFontSize = Number(data.fontSize) || 24;
  const baseColor = data.color || "#000000";
  const lhRaw = data.lineHeight;
  const lhMult = typeof lhRaw === "number" ? lhRaw : parseFloat(String(lhRaw ?? "1.2")) || 1.2;

  const globalBold =
    data.fontWeight === "bold" ||
    (typeof data.fontWeight === "number" && data.fontWeight >= 700);
  const globalItalic = data.fontStyle === "italic";

  const source = (data.html || data.text || "").trim();
  const isHtml = /<[a-zA-Z]/.test(source);

  let paragraphLines: TextRun[][];

  if (isHtml) {
    paragraphLines = parseHtmlToRuns(source, baseColor, baseFontSize);
    paragraphLines = paragraphLines.map((line) =>
      line.map((run) => ({
        ...run,
        bold: run.bold || globalBold,
        italic: run.italic || globalItalic,
      }))
    );
  } else {
    paragraphLines = source.split(/\n/).map((line: string) => [
      {
        text: line || " ",
        bold: globalBold,
        italic: globalItalic,
        underline: false,
        strikethrough: false,
        color: baseColor,
        fontSize: baseFontSize,
      },
    ]);
  }

  interface VisualLine {
    runs: (TextRun & { width: number })[];
    lineHeight: number;
  }
  const visualLines: VisualLine[] = [];

  for (const paraLine of paragraphLines) {
    if (paraLine.length === 0) {
      visualLines.push({ runs: [], lineHeight: baseFontSize * lhMult });
      continue;
    }

    interface Word { text: string; run: TextRun }
    const words: Word[] = [];

    for (const run of paraLine) {
      const chunks = run.text.split(/(\s+)/);
      for (const chunk of chunks) {
        if (chunk) words.push({ text: chunk, run });
      }
    }

    let curLineRuns: (TextRun & { width: number })[] = [];
    let curWidth = 0;
    let curMaxFs = baseFontSize;

    const flushLine = () => {
      if (curLineRuns.length > 0) {
        visualLines.push({ runs: curLineRuns, lineHeight: curMaxFs * lhMult });
      }
      curLineRuns = [];
      curWidth = 0;
      curMaxFs = baseFontSize;
    };

    for (const word of words) {
      const font = pickFont(fonts, word.run.bold, word.run.italic);
      const w = font.widthOfTextAtSize(word.text, word.run.fontSize);

      if (!/^\s+$/.test(word.text) && curWidth + w > maxWidth && curLineRuns.length > 0) {
        flushLine();
      }

      curLineRuns.push({ ...word.run, text: word.text, width: w });
      curWidth += w;
      if (word.run.fontSize > curMaxFs) curMaxFs = word.run.fontSize;
    }
    flushLine();
  }

  let cursorY = canvasHeight - yTop - baseFontSize;

  for (const vline of visualLines) {
    let cursorX = x;

    for (const run of vline.runs) {
      if (!run.text || /^\s+$/.test(run.text)) {
        cursorX += run.width;
        continue;
      }

      const font = pickFont(fonts, run.bold, run.italic);
      const color = hexToRgb(run.color);

      page.drawText(run.text, {
        x: cursorX,
        y: cursorY,
        size: run.fontSize,
        font,
        color,
      });

      if (run.underline) {
        page.drawLine({
          start: { x: cursorX, y: cursorY - 2 },
          end: { x: cursorX + run.width, y: cursorY - 2 },
          thickness: Math.max(1, run.fontSize * 0.06),
          color,
        });
      }

      if (run.strikethrough) {
        const sy = cursorY + run.fontSize * 0.3;
        page.drawLine({
          start: { x: cursorX, y: sy },
          end: { x: cursorX + run.width, y: sy },
          thickness: Math.max(1, run.fontSize * 0.06),
          color,
        });
      }

      cursorX += run.width;
    }

    cursorY -= vline.lineHeight;
  }
}


  // ─── HELPERS — route.ts ke TOP mein add karo (POST function ke upar) ──────

  function drawRoundedRect(
    page: PDFPage,
    x: number, y: number, w: number, h: number, r: number,
    color: ReturnType<typeof rgb>,
    borderColor?: ReturnType<typeof rgb>,
    borderWidth?: number
  ) {
    r = Math.min(r, h / 2, w / 2);
    if (r <= 0) {
      page.drawRectangle({ x, y, width: w, height: h, color, borderColor, borderWidth });
      return;
    }
    // Fill body
    page.drawRectangle({ x: x + r, y, width: w - 2 * r, height: h, color, borderWidth: 0 });
    page.drawRectangle({ x, y: y + r, width: w, height: h - 2 * r, color, borderWidth: 0 });
    // Four corners
    [
      { cx: x + r, cy: y + r },
      { cx: x + w - r, cy: y + r },
      { cx: x + r, cy: y + h - r },
      { cx: x + w - r, cy: y + h - r },
    ].forEach(({ cx, cy }) =>
      page.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r, color, borderWidth: 0 })
    );
    // Border lines
    if (borderWidth && borderWidth > 0 && borderColor) {
      page.drawLine({ start: { x: x + r, y: y + h }, end: { x: x + w - r, y: y + h }, thickness: borderWidth, color: borderColor });
      page.drawLine({ start: { x: x + r, y }, end: { x: x + w - r, y }, thickness: borderWidth, color: borderColor });
      page.drawLine({ start: { x, y: y + r }, end: { x, y: y + h - r }, thickness: borderWidth, color: borderColor });
      page.drawLine({ start: { x: x + w, y: y + r }, end: { x: x + w, y: y + h - r }, thickness: borderWidth, color: borderColor });
    }
  }

  // function drawGradientRoundedRect(
  //   page: PDFPage,
  //   x: number, y: number, w: number, h: number, r: number,
  //   fromHex: string, toHex: string,
  //   direction: "horizontal" | "vertical" | "diagonal" = "diagonal",
  //   steps = 80
  // ) {
  //   r = Math.min(r, h / 2, w / 2);
  //   const from = hexToRgb(fromHex) as unknown as { red: number; green: number; blue: number };
  //   const to = hexToRgb(toHex) as unknown as { red: number; green: number; blue: number };

  //   const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  //   const gradColor = (t: number) =>
  //     rgb(lerp(from.red, to.red, t), lerp(from.green, to.green, t), lerp(from.blue, to.blue, t));

  //   if (direction === "horizontal" || direction === "diagonal") {
  //     for (let i = 0; i < steps; i++) {
  //       const t = i / (steps - 1);
  //       const color = gradColor(t);
  //       const sliceX = x + (w / steps) * i;
  //       const sliceW = w / steps + 0.6;
  //       const centerX = sliceX + sliceW / 2;
  //       const dist = Math.min(centerX - x, x + w - centerX);
  //       let sy = y, sh = h;
  //       if (r > 0 && dist < r) {
  //         const angle = Math.acos(Math.max(-1, Math.min(1, (r - dist) / r)));
  //         const avail = Math.sin(angle) * r;
  //         sh = h - 2 * (r - avail);
  //         sy = y + (r - avail);
  //       }
  //       page.drawRectangle({ x: sliceX, y: sy, width: sliceW, height: sh, color, borderWidth: 0 });
  //     }
  //   } else {
  //     // vertical
  //     for (let i = 0; i < steps; i++) {
  //       const t = i / (steps - 1);
  //       const color = gradColor(t);
  //       const sliceY = y + (h / steps) * i;
  //       const sliceH = h / steps + 0.6;
  //       const centerY = sliceY + sliceH / 2;
  //       const dist = Math.min(centerY - y, y + h - centerY);
  //       let sx = x, sw = w;
  //       if (r > 0 && dist < r) {
  //         const angle = Math.acos(Math.max(-1, Math.min(1, (r - dist) / r)));
  //         const avail = Math.sin(angle) * r;
  //         sw = w - 2 * (r - avail);
  //         sx = x + (r - avail);
  //       }
  //       page.drawRectangle({ x: sx, y: sliceY, width: sw, height: sliceH, color, borderWidth: 0 });
  //     }
  //   }
  // }
  

function drawGradientRoundedRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number, r: number,
  fromHex: string, toHex: string,
  direction: "horizontal" | "vertical" | "diagonal" = "diagonal",
  steps = 120  // ✅ steps badha do — smoother gradient
) {
  r = Math.min(r, h / 2, w / 2);
  
  const parseHexToValues = (hex: string) => {
    let s = hex.replace("#", "");
    if (s.length === 3) s = s.split("").map(c => c + c).join("");
    return {
      r: parseInt(s.slice(0, 2), 16) / 255,
      g: parseInt(s.slice(2, 4), 16) / 255,
      b: parseInt(s.slice(4, 6), 16) / 255,
    };
  };
  
  const from = parseHexToValues(fromHex);
  const to   = parseHexToValues(toHex);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  if (direction === "horizontal" || direction === "diagonal") {
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const color = rgb(lerp(from.r, to.r, t), lerp(from.g, to.g, t), lerp(from.b, to.b, t));
      
      const sliceX = x + (w * i) / steps;
      const sliceW = (w / steps) + 1; 
    
      const centerX = sliceX + sliceW / 2;
      const distFromEdge = Math.min(centerX - x, x + w - centerX);
      
      let sliceY = y;
      let sliceH = h;
      
      if (r > 0 && distFromEdge < r) {
        const cutHeight = r - Math.sqrt(Math.max(0, r * r - (r - distFromEdge) * (r - distFromEdge)));
        sliceH = h - cutHeight * 2;
        sliceY = y + cutHeight;
      }
      
      if (sliceH > 0) {
        page.drawRectangle({
          x: sliceX,
          y: sliceY,
          width: sliceW,
          height: sliceH,
          color,
          borderWidth: 0,
        });
      }
    }
  } else {
    // vertical
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const color = rgb(lerp(from.r, to.r, t), lerp(from.g, to.g, t), lerp(from.b, to.b, t));
      
      const sliceY = y + (h * i) / steps;
      const sliceH = (h / steps) + 1;
      
      const centerY = sliceY + sliceH / 2;
      const distFromEdge = Math.min(centerY - y, y + h - centerY);
      
      let sliceX = x;
      let sliceW = w;
      
      if (r > 0 && distFromEdge < r) {
        const cutWidth = r - Math.sqrt(Math.max(0, r * r - (r - distFromEdge) * (r - distFromEdge)));
        sliceW = w - cutWidth * 2;
        sliceX = x + cutWidth;
      }
      
      if (sliceW > 0) {
        page.drawRectangle({
          x: sliceX,
          y: sliceY,
          width: sliceW,
          height: sliceH,
          color,
          borderWidth: 0,
        });
      }
    }
  }
}








async function handlePOST(req: NextRequest) {
  try {
    const {user,document:{slides}} = await exportInput(req);

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "Slides missing or invalid" }, { status: 400 });
    }

    const CANVAS_WIDTH: number = slides[0]?.width ?? 853.333;
    const CANVAS_HEIGHT: number = slides[0]?.height ?? 480;

    const pdfDoc = await PDFDocument.create();
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const slide of slides) {
      const page = pdfDoc.addPage([CANVAS_WIDTH, CANVAS_HEIGHT]);

      try {
        const bg = slide?.background;
        if (typeof bg === "string") {
          const urlMatch = bg.match(/url\((['"]?)(.*?)\1\)/);
          if (urlMatch) {
            const resolved = await resolveImage(urlMatch[2]);
            if (resolved) {
              const { bytes, contentType } = resolved;
              let img;
              if (contentType.includes("png")) img = await pdfDoc.embedPng(bytes);
              else if (contentType.includes("jpeg") || contentType.includes("jpg"))
                img = await pdfDoc.embedJpg(bytes);

              if (img) {
                const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
                const dw = img.width * scale;
                const dh = img.height * scale;
                page.drawImage(img, {
                  x: (CANVAS_WIDTH - dw) / 2,
                  y: (CANVAS_HEIGHT - dh) / 2,
                  width: dw,
                  height: dh,
                });
              } else {
                page.drawRectangle({
                  x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
                  color: hexToRgb("#ffffff"),
                });
              }
            } else {
              page.drawRectangle({
                x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
                color: hexToRgb("#ffffff"),
              });
            }
          } else {
            page.drawRectangle({
              x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
              color: hexToRgb(bg),
            });
          }
        } else {
          page.drawRectangle({
            x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
            color: hexToRgb("#ffffff"),
          });
        }
      } catch (bgErr) {
        console.error("Background error:", bgErr);
        page.drawRectangle({
          x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
          color: hexToRgb("#ffffff"),
        });
      }

      if (!Array.isArray(slide.elements)) continue;
      for (const el of slide.elements) {
        const data = el?.data;
        if (!data || !data.type) continue;

        try {

          if (data.type === "text") {
            const x = Number.isFinite(data.x) ? data.x : 0;
            const yTop = Number.isFinite(data.y) ? data.y : 0;
            const maxWidth = Number.isFinite(data.width) ? data.width : CANVAS_WIDTH - x - 20;
            await drawRichText(page, pdfDoc, helv, data, CANVAS_WIDTH, CANVAS_HEIGHT, x, yTop, maxWidth);
          }

          else if (data.type === "image" && data.src) {
            const resolved = await resolveImage(String(data.src));
            if (!resolved) {
              console.warn("Image not resolved, skipping");
              continue;
            }
            const { bytes, contentType } = resolved;
            let img;
            if (contentType.includes("png")) img = await pdfDoc.embedPng(bytes);
            else if (contentType.includes("jpeg") || contentType.includes("jpg"))
              img = await pdfDoc.embedJpg(bytes);
            else {
              try { img = await pdfDoc.embedJpg(bytes); } catch {
                try { img = await pdfDoc.embedPng(bytes); } catch {
                  console.warn("Unsupported image type, skipping");
                  continue;
                }
              }
            }
            const w = Number.isFinite(data.width) ? data.width : img.width;
            const h = Number.isFinite(data.height) ? data.height : img.height;
            const x = Number.isFinite(data.x) ? data.x : 0;
            const yTop = Number.isFinite(data.y) ? data.y : 0;
            page.drawImage(img, { x, y: CANVAS_HEIGHT - yTop - h, width: w, height: h });
          }

          // ── BUTTON ──
          // else if (data.type === "button") {
          //   const x = Number.isFinite(data.x) ? data.x : 0;
          //   const yTop = Number.isFinite(data.y) ? data.y : 0;
          //   const w = Number.isFinite(data.width) ? data.width : 200;
          //   const h = Number.isFinite(data.height) ? data.height : 48;
          //   const bgColor = hexToRgb(data.backgroundColor || data.fill || "#007bff");
          //   const borderColor = hexToRgb(data.borderColor || "#000000");
          //   const borderWidth = Number(data.borderWidth) || 0;

          //   page.drawRectangle({
          //     x, y: CANVAS_HEIGHT - yTop - h, width: w, height: h,
          //     color: bgColor,
          //     borderColor: borderWidth > 0 ? borderColor : undefined,
          //     borderWidth: borderWidth > 0 ? borderWidth : undefined,
          //   });

          //   const btnText = String(data.text ?? "");
          //   const fontSize = Number(data.fontSize) || 16;
          //   const textWidth = helv.widthOfTextAtSize(btnText, fontSize);
          //   const textX = x + Math.max(0, (w - textWidth) / 2);
          //   const textY = CANVAS_HEIGHT - yTop - (h + fontSize) / 2 + fontSize * 0.25;
          //   page.drawText(btnText, {
          //     x: textX, y: textY, size: fontSize, font: helv,
          //     color: hexToRgb(data.textColor || "#ffffff"),
          //   });
          // }




          // ── BUTTON ──
          else if (data.type === "button") {
            const x = Number.isFinite(data.x) ? data.x : 0;
            const yTop = Number.isFinite(data.y) ? data.y : 0;
            const w = Number.isFinite(data.width) ? data.width : 140;
            const h = Number.isFinite(data.height) ? data.height : 44;
            const pdfY = CANVAS_HEIGHT - yTop - h;
            const borderRadius = Number(data.borderRadius) || 0;
            const borderWidth = Number(data.borderWidth) || 0;
            const hasGradient = data.gradientFrom && data.gradientTo;
            const fontSize = Number(data.fontSize) || 14;
            const fontWeight = data.fontWeight;
            const isBold = fontWeight === "bold" || (typeof fontWeight === "number" && fontWeight >= 700);
            const btnFont = isBold ? await pdfDoc.embedFont(StandardFonts.HelveticaBold) : helv;
            const icon = data.icon ? String(data.icon) : "";
            const iconPos = data.iconPosition || "right";
            const rawText = String(data.text ?? "Read More");
            const fullText = icon
              ? (iconPos === "left" ? `${icon}  ${rawText}` : `${rawText}  ${icon}`)
              : rawText;
            const textColor = hexToRgb(data.textColor || "#ffffff");

            // ── Draw background ──
            if (hasGradient) {
              drawGradientRoundedRect(
                page, x, pdfY, w, h, borderRadius,
                data.gradientFrom || "#ffffff", data.gradientTo || "#ffffff",
                data.gradientDirection || "diagonal"
              );
              // Border on top of gradient
              if (borderWidth > 0) {
                drawRoundedRect(
                  page, x, pdfY, w, h, borderRadius,
                  rgb(0, 0, 0), // dummy — no fill
                  hexToRgb(data.borderColor || "#000000"),
                  borderWidth
                );
              }
            } else {
              const isTransparent =
                !data.backgroundColor ||
                data.backgroundColor === "transparent";
              if (!isTransparent) {
                drawRoundedRect(
                  page, x, pdfY, w, h, borderRadius,
                  hexToRgb(data.backgroundColor),
                  borderWidth > 0 ? hexToRgb(data.borderColor || "#000000") : undefined,
                  borderWidth > 0 ? borderWidth : undefined
                );
              } else if (borderWidth > 0) {
                // Outline-only button (transparent background)
                drawRoundedRect(
                  page, x, pdfY, w, h, borderRadius,
                  rgb(1, 1, 1), // white fill (transparent not possible in pdf-lib)
                  hexToRgb(data.borderColor || "#000000"),
                  borderWidth
                );
              }
            }

            // ── Draw text + icon ──
            const textWidth = btnFont.widthOfTextAtSize(fullText, fontSize);
            const textX = x + Math.max(0, (w - textWidth) / 2);
            const textY = pdfY + (h - fontSize) / 2 + fontSize * 0.2;
            page.drawText(fullText, {
              x: textX, y: textY,
              size: fontSize, font: btnFont,
              color: textColor,
            });
          }










          // ── INTERACTION ──
          // Quizzes and page-flips cannot run in a PDF, but the element was
          // being skipped completely — the page lost the button, its label and
          // its colour. Draw the pill and its label instead.
          else if (data.type === "interaction") {
            const x = Number.isFinite(data.x) ? data.x : 0;
            const yTop = Number.isFinite(data.y) ? data.y : 0;
            const w = Number.isFinite(data.width) ? data.width : 140;
            const h = Number.isFinite(data.height) ? data.height : 42;
            const pdfY = CANVAS_HEIGHT - yTop - h;
            const radius = Number(data.borderRadius) || 0;
            const isTransparent =
              !data.backgroundColor || data.backgroundColor === "transparent";

            if (!isTransparent) {
              drawRoundedRect(page, x, pdfY, w, h, radius, hexToRgb(data.backgroundColor));
            }

            const label = interactionFlatLabel(data);
            // pdf-lib standard fonts are WinAnsi only; drop anything outside it
            // rather than throwing while writing the document.
            const safeLabel = label.replace(/[^ -ÿ]/g, "").trim();
            if (safeLabel) {
              const fontSize = Number(data.fontSize) || 13;
              const weight = data.fontWeight;
              const isBold =
                weight === "bold" || (typeof weight === "number" && weight >= 600);
              const font = isBold
                ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
                : helv;
              const textWidth = font.widthOfTextAtSize(safeLabel, fontSize);
              page.drawText(safeLabel, {
                x: x + Math.max(0, (w - textWidth) / 2),
                y: pdfY + (h - fontSize) / 2 + fontSize * 0.2,
                size: fontSize,
                font,
                color: hexToRgb(data.textColor || "#ffffff"),
              });
            }
          }

          // ── SHAPE ──
          else if (data.type === "shape") {
            const x = Number.isFinite(data.x) ? data.x : 0;
            const yTop = Number.isFinite(data.y) ? data.y : 0;
            const w = Number.isFinite(data.width) ? data.width : 100;
            const h = Number.isFinite(data.height) ? data.height : 100;
            const fill = hexToRgb(data.fill || "#000000");
            const strokeColor = hexToRgb(data.stroke || "#000000");
            const strokeWidth = Number(data.strokeWidth) || 0;

            const opacity = Number.isFinite(Number(data.opacity)) ? Math.min(Math.max(Number(data.opacity), 0), 1) : 1;
            page.drawRectangle({
              x, y: CANVAS_HEIGHT - yTop - h, width: w, height: h,
              color: fill,
              opacity,
              borderColor: strokeWidth > 0 ? strokeColor : undefined,
              borderWidth: strokeWidth > 0 ? strokeWidth : undefined,
              borderOpacity: opacity,
            });
          }

          // ── SVG ──
          // A QR is stored as its content, so it is re-encoded here rather
          // than carried across as a picture — that keeps it vector-sharp at
          // whatever size the page happens to be.
          else if (data.type === "qr-code" && data.content) {
            try {
              const svg = qrToSvg(String(data.content), {
                ec: data.ecLevel,
                foreground: data.foreground,
                background: data.background,
              });
              if (!svg) continue;
              const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
              const resolved = await resolveImage(dataUri);
              if (!resolved) continue;
              const img =
                (await pdfDoc.embedPng(resolved.bytes).catch(() => null)) ||
                (await pdfDoc.embedJpg(resolved.bytes).catch(() => null));
              if (!img) continue;
              const w = Number.isFinite(data.width) ? data.width : img.width;
              const h = Number.isFinite(data.height) ? data.height : img.height;
              const x = Number.isFinite(data.x) ? data.x : 0;
              const yTop = Number.isFinite(data.y) ? data.y : 0;
              page.drawImage(img, { x, y: CANVAS_HEIGHT - yTop - h, width: w, height: h });
            } catch (qrErr) {
              console.warn("QR handling failed:", qrErr);
            }
          }

          // pdf-lib cannot clip to an arbitrary shape, so a frame contributes
          // its picture at the frame's box. The mask is lost, the content is
          // not — which beats dropping the image from the export entirely.
          else if (data.type === "frame" && data.imageSrc) {
            try {
              const resolved = await resolveImage(String(data.imageSrc));
              if (!resolved) continue;
              const img =
                (await pdfDoc.embedPng(resolved.bytes).catch(() => null)) ||
                (await pdfDoc.embedJpg(resolved.bytes).catch(() => null));
              if (!img) continue;
              const w = Number.isFinite(data.width) ? data.width : img.width;
              const h = Number.isFinite(data.height) ? data.height : img.height;
              const x = Number.isFinite(data.x) ? data.x : 0;
              const yTop = Number.isFinite(data.y) ? data.y : 0;
              page.drawImage(img, { x, y: CANVAS_HEIGHT - yTop - h, width: w, height: h });
            } catch (frameErr) {
              console.warn("Frame handling failed:", frameErr);
            }
          }

          else if (data.type === "svg" && data.src) {
            try {
              const finalSvg = String(data.src).replace(/currentColor/g, data.color || "#000000");
              const dataUri = `data:image/svg+xml;base64,${Buffer.from(finalSvg).toString("base64")}`;
              const resolved = await resolveImage(dataUri);
              if (!resolved) continue;
              const img =
                (await pdfDoc.embedPng(resolved.bytes).catch(() => null)) ||
                (await pdfDoc.embedJpg(resolved.bytes).catch(() => null));
              if (!img) continue;
              const w = Number.isFinite(data.width) ? data.width : img.width;
              const h = Number.isFinite(data.height) ? data.height : img.height;
              const x = Number.isFinite(data.x) ? data.x : 0;
              const yTop = Number.isFinite(data.y) ? data.y : 0;
              page.drawImage(img, { x, y: CANVAS_HEIGHT - yTop - h, width: w, height: h });
            } catch (svgErr) {
              console.warn("SVG handling failed:", svgErr);
            }
          }

        } catch (elErr) {
          console.error("Element render error:", elErr);
          continue;
        }
      }
    }

    // ── Save & Upload to S3 ──
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    const asset = await saveAsset(user.id, Buffer.from(buffer), "exports", "book.pdf", "application/pdf", "pdf");
    return NextResponse.json({url:asset.url});

  } catch (err) {
    console.error("PDF generation error", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
export const POST = protectedRoute(handlePOST,"export");
