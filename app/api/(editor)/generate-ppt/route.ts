import {protectedRoute} from "@shared/server/protected-route";
import {exportInput} from "@shared/server/export";
import {saveAsset} from "@shared/server/assets";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { interactionFlatLabel } from "@editor/blocks/Interaction/renderer/interactionLabel";
import { qrToSvg } from "@editor/blocks/QRCode/qr";


const pxToIn = (px: number) => px / 96;



// ─── HTML helpers ────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
}

/** Convert css color string (rgb(...) or #hex) → 6-char hex (no #) */
function cssColorToHex(color: string): string {
    const rgbMatch = color.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
    if (rgbMatch) {
        return [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
            .map((n) => parseInt(n).toString(16).padStart(2, "0"))
            .join("");
    }
    return color.replace("#", "");
}

/**
 * Parse an HTML string (with inline <span style="..."> tags) into an array
 * of PptxGenJS TextProps runs so colours, underline, strike-through, etc.
 * are preserved in the exported PPTX.
 */
function parseHtmlToRuns(
    html: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaults: Record<string, any>
): PptxGenJS.TextProps[] {
    const runs: PptxGenJS.TextProps[] = [];

    const baseFontSize = ((defaults.fontSize as number) || 16) * 0.75;
    const baseFontFace = (defaults.fontFamily as string) || "Inter";
    const baseColor = ((defaults.color as string) || "#ffffff").replace("#", "");
    const baseBold =
        defaults.fontWeight === "bold" ||
        defaults.fontWeight === "700" ||
        defaults.fontWeight === 700;
    const baseItalic = defaults.fontStyle === "italic";

    // Match either a <span ...>text</span> block or a plain text node
    const spanRegex = /<span([^>]*)>([\s\S]*?)<\/span>|([^<]+)/g;
    let match: RegExpExecArray | null;

    while ((match = spanRegex.exec(html)) !== null) {
        // ── plain text node ──────────────────────────────────────────────────
        if (match[3] !== undefined) {
            const text = decodeHtmlEntities(match[3]);
            if (!text.trim() && text !== " ") continue;
            runs.push({
                text,
                options: {
                    fontSize: baseFontSize,
                    fontFace: baseFontFace,
                    color: baseColor,
                    bold: baseBold,
                    italic: baseItalic,
                },
            });
            continue;
        }

        // ── <span> node ──────────────────────────────────────────────────────
        const attrs = match[1];
        // Strip any nested tags inside the span (shouldn't happen, but safety first)
        const innerText = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ""));
        if (!innerText) continue;

        const styleMatch = attrs.match(/style="([^"]*)"/);
        const styleStr = styleMatch ? styleMatch[1] : "";

        const colorMatch    = styleStr.match(/(?:^|;)\s*color:\s*([^;]+)/);
        const textDecoMatch = styleStr.match(/text-decoration:\s*([^;]+)/);
        const fontWeightMatch = styleStr.match(/font-weight:\s*([^;]+)/);
        const fontStyleMatch  = styleStr.match(/font-style:\s*([^;]+)/);

        const runColor = colorMatch
            ? cssColorToHex(colorMatch[1].trim())
            : baseColor;

        const decorations  = textDecoMatch ? textDecoMatch[1].trim() : "";
        const isUnderline  = decorations.includes("underline");
        const isStrike     = decorations.includes("line-through");

        const isBold = fontWeightMatch
            ? fontWeightMatch[1].trim() === "bold" ||
              parseInt(fontWeightMatch[1].trim()) >= 700
            : baseBold;

        const isItalic = fontStyleMatch
            ? fontStyleMatch[1].trim() === "italic"
            : baseItalic;

        const runOpts: PptxGenJS.TextPropsOptions = {
            fontSize: baseFontSize,
            fontFace: baseFontFace,
            color: runColor,
            bold: isBold,
            italic: isItalic,
        };
        if (isUnderline) runOpts.underline = { style: "sng" };
        if (isStrike)    runOpts.strike    = "sngStrike";

        runs.push({ text: innerText, options: runOpts });
    }

    // Fallback: strip all tags and return plain run
    if (runs.length === 0) {
        runs.push({
            text: html.replace(/<[^>]+>/g, "") || "",
            options: {
                fontSize: baseFontSize,
                fontFace: baseFontFace,
                color: baseColor,
                bold: baseBold,
                italic: baseItalic,
            },
        });
    }

    return runs;
}

// ─── Route handler ───────────────────────────────────────────────────────────

async function handlePOST(req: NextRequest) {
    try {
        const {user,document:{slides}} = await exportInput(req);

        if (!slides || !Array.isArray(slides)) {
            return NextResponse.json({ error: "Slides missing" }, { status: 400 });
        }

        const CANVAS_WIDTH  = slides[0].width || 794;
        const CANVAS_HEIGHT = slides[0].height || 1123;

        const pptx = new PptxGenJS();

        pptx.defineLayout({
            name: "CUSTOM",
            width:  pxToIn(CANVAS_WIDTH),
            height: pxToIn(CANVAS_HEIGHT),
        });
        pptx.layout = "CUSTOM";

        for (const slide of slides) {
            const sld = pptx.addSlide();

            // ── Background ───────────────────────────────────────────────────
            const bg = slide.background;
            if (typeof bg === "string" && bg.startsWith("url(")) {
                const m = bg.match(/url\((.*?)\)/);
                if (m?.[1]) sld.background = { path: m[1].replace(/['"]/g, "") };
            } else if (typeof bg === "string") {
                sld.background = { color: bg.replace("#", "") };
            }

            // ── Elements ─────────────────────────────────────────────────────
            for (const el of slide.elements) {
                const data = el.data;

                // ── TEXT ─────────────────────────────────────────────────────
                if (data.type === "text") {
                    const htmlSource = data.html || data.text || "";
                    const richRuns   = parseHtmlToRuns(htmlSource, data);

                    sld.addText(richRuns, {
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                        fontFace: data.fontFamily,
                        align:    data.textAlign  || "left",
                        valign:   "top",
                        wrap:     true,
                    });
                }

                // ── BUTTON ───────────────────────────────────────────────────
                if (data.type === "button") {
                    const shapeOptions: Record<string, unknown> = {
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                    };

                    if (data.gradientFrom && data.gradientTo) {
                        shapeOptions.fill = {
                            type: "gradient",
                            stops: [
                                { pos: 0,   color: data.gradientFrom.replace("#", "") },
                                { pos: 100, color: data.gradientTo.replace("#", "")   },
                            ],
                        };
                    } else if (data.backgroundColor) {
                        shapeOptions.fill = { color: data.backgroundColor.replace("#", "") };
                    }

                    if (data.borderWidth && data.borderWidth > 0) {
                        shapeOptions.line = {
                            color: data.borderColor?.replace("#", "") || "000000",
                            pt:    data.borderWidth,
                        };
                    } else {
                        shapeOptions.line = { type: "none" };
                    }

                    if (data.borderRadius) {
                        shapeOptions.rectRadius = pxToIn(data.borderRadius);
                    }

                    sld.addShape(pptx.ShapeType.rect, shapeOptions);

                    const textOptions: Record<string, unknown> = {
                        x:       pxToIn(data.x),
                        y:       pxToIn(data.y),
                        w:       pxToIn(data.width),
                        h:       pxToIn(data.height),
                        fontSize: (data.fontSize || 16) * 0.75,
                        fontFace: data.fontFamily,
                        bold:    data.fontWeight === "bold",
                        color:   data.textColor?.replace("#", "") || "000000",
                        align:   "center",
                        valign:  "middle",
                        wrap:    false,
                    };

                    if (data.link && typeof data.link === "string") {
                        textOptions.hyperlink = { url: data.link };
                    }

                    sld.addText(data.text || "", textOptions);
                }

                // ── INTERACTION ──────────────────────────────────────────────
                // A deck cannot run quizzes or page-flips, but the element was
                // being dropped entirely — so the slide lost the button, its
                // label and its link. Export it as a shape + label + hyperlink.
                if (data.type === "interaction") {
                    const shapeOptions: Record<string, unknown> = {
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                        line: { type: "none" },
                    };
                    if (data.backgroundColor) {
                        shapeOptions.fill = { color: data.backgroundColor.replace("#", "") };
                    }
                    if (data.borderRadius) {
                        shapeOptions.rectRadius = pxToIn(Number(data.borderRadius) || 0);
                    }
                    sld.addShape(pptx.ShapeType.rect, shapeOptions);

                    const label = interactionFlatLabel(data);
                    if (label) {
                        const textOptions: Record<string, unknown> = {
                            x: pxToIn(data.x),
                            y: pxToIn(data.y),
                            w: pxToIn(data.width),
                            h: pxToIn(data.height),
                            fontSize: (data.fontSize || 13) * 0.75,
                            fontFace: data.fontFamily,
                            color: data.textColor?.replace("#", "") || "FFFFFF",
                            align: "center",
                            valign: "middle",
                            wrap: false,
                        };
                        const href = data.url || data.link;
                        if (typeof href === "string" && /^https?:\/\//i.test(href)) {
                            textOptions.hyperlink = { url: href };
                        }
                        sld.addText(label, textOptions);
                    }
                }

                // ── IMAGE ────────────────────────────────────────────────────
                if (data.type === "image" && data.src) {
                    sld.addImage({
                        data: data.src,
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                    });
                }

                // ── SHAPE ────────────────────────────────────────────────────
                if (data.type === "shape") {
                    sld.addShape(pptx.ShapeType.rect, {
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                        fill: { color: data.fill, transparency: Math.round((1 - Math.min(Math.max(Number(data.opacity ?? 1), 0), 1)) * 100) },
                        line: {
                            color: data.stroke || "FFFFFF",
                            width: data.strokeWidth || 0,
                        },
                    });
                }

                // ── QR CODE ──────────────────────────────────────────────────
                // Re-encoded from its content, for the same reason as in the
                // PDF route: the stored thing is the text, not a picture.
                if (data.type === "qr-code" && data.content) {
                    const svg = qrToSvg(String(data.content), {
                        ec: data.ecLevel,
                        foreground: data.foreground,
                        background: data.background,
                    });
                    if (svg) {
                        sld.addImage({
                            data:
                                "data:image/svg+xml;base64," +
                                Buffer.from(svg).toString("base64"),
                            x: pxToIn(data.x),
                            y: pxToIn(data.y),
                            w: pxToIn(data.width),
                            h: pxToIn(data.height),
                        });
                    }
                }

                // ── FRAME ────────────────────────────────────────────────────
                // PowerPoint has no equivalent of an arbitrary clip-path, so
                // the picture is placed at the frame's box without the mask.
                if (data.type === "frame" && data.imageSrc) {
                    sld.addImage({
                        path: data.imageSrc,
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                    });
                }

                // ── SVG ──────────────────────────────────────────────────────
                if (data.type === "svg") {
                    const finalSvg = data.src.replace(
                        /currentColor/g,
                        data.color || "#000000"
                    );
                    const base64 =
                        "data:image/svg+xml;base64," +
                        Buffer.from(finalSvg).toString("base64");

                    sld.addImage({
                        data: base64,
                        x: pxToIn(data.x),
                        y: pxToIn(data.y),
                        w: pxToIn(data.width),
                        h: pxToIn(data.height),
                    });
                }
            }
        }

        // ── Generate & upload ─────────────────────────────────────────────────
        const result = await pptx.stream();
        let buffer: Buffer;

        if (typeof result === "string") {
            buffer = Buffer.from(result, "base64");
        } else if (Buffer.isBuffer(result)) {
            buffer = result;
        } else if (result instanceof ArrayBuffer) {
            buffer = Buffer.from(new Uint8Array(result));
        } else if (result instanceof Uint8Array) {
            buffer = Buffer.from(result);
        } else if (typeof Blob !== "undefined" && result instanceof Blob) {
            buffer = Buffer.from(new Uint8Array(await result.arrayBuffer()));
        } else {
            buffer = Buffer.from(String(result));
        }

        const asset = await saveAsset(user.id, Buffer.from(buffer), "exports", "book.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx");
    return NextResponse.json({url:asset.url});
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
export const POST = protectedRoute(handlePOST,"export");
