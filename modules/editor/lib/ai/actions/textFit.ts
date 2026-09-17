import type { TextData } from "@editor/store/editorStore";

/**
 * Keeps AI text edits from wrecking a layout.
 *
 * `RenderText` re-measures and corrects the height of text it renders, but that
 * only happens for the slide on screen and only after the fact — so rewrites are
 * pre-measured here to decide whether the box can grow or the type has to come
 * down a notch.
 */

let measureContext: CanvasRenderingContext2D | null = null;

const getContext = (): CanvasRenderingContext2D | null => {
    if (measureContext) return measureContext;
    if (typeof document === "undefined") return null;
    measureContext = document.createElement("canvas").getContext("2d");
    return measureContext;
};

const wrappedLineCount = (
    ctx: CanvasRenderingContext2D,
    line: string,
    maxWidth: number,
): number => {
    const words = line.split(/\s+/).filter(Boolean);
    if (!words.length) return 1;
    let lines = 1;
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !current) {
            current = candidate;
        } else {
            lines += 1;
            current = word;
        }
    }
    return lines;
};

/** Mirrors RenderText's measurement closely enough to predict overflow. */
export const estimateTextHeight = (
    text: string,
    style: Pick<TextData, "fontSize" | "fontFamily" | "fontWeight" | "fontStyle" | "lineHeight">,
    boxWidth: number,
): number => {
    const fontSize = Number(style.fontSize) || 16;
    const lineHeight = Number(style.lineHeight) || 1.4;
    const ctx = getContext();
    if (!ctx || boxWidth <= 0) {
        const roughChars = Math.max(1, Math.floor(boxWidth / (fontSize * 0.55)) || 1);
        const lines = Math.max(1, Math.ceil(text.length / roughChars));
        return lines * fontSize * lineHeight;
    }

    ctx.font = `${style.fontStyle || "normal"} ${style.fontWeight || 400} ${fontSize}px ${style.fontFamily || "sans-serif"}`;
    const paragraphs = text.replace(/\r/g, "").split("\n");
    const lines = paragraphs.reduce(
        (total, paragraph) => total + (paragraph ? wrappedLineCount(ctx, paragraph, Math.max(1, boxWidth)) : 1),
        0,
    );
    return Math.max(1, lines) * fontSize * lineHeight;
};

export type FitResult = {
    height: number;
    /** Set when the type had to shrink for the text to fit the slide. */
    fontSize?: number;
    shrunk: boolean;
};

/**
 * Fits new text into an existing box: grows the box while it still fits on the
 * slide, and only then steps the font size down (never below 8px).
 */
export const fitTextToBox = (
    text: string,
    data: TextData,
    slideHeight: number,
): FitResult => {
    const originalFontSize = Number(data.fontSize) || 16;
    const available = Math.max(40, slideHeight - data.y - 8);

    let fontSize = originalFontSize;
    let height = estimateTextHeight(text, { ...data, fontSize }, data.width);

    while (height > available && fontSize > 8) {
        fontSize = Math.max(8, Math.round((fontSize - Math.max(1, fontSize * 0.08)) * 10) / 10);
        height = estimateTextHeight(text, { ...data, fontSize }, data.width);
    }

    return {
        height: Math.max(data.height > 0 ? Math.min(data.height, available) : 0, Math.min(height, available)),
        fontSize: fontSize !== originalFontSize ? fontSize : undefined,
        shrunk: fontSize !== originalFontSize,
    };
};

/**
 * Element-level style must win over inline spans left behind by manual
 * formatting, which is what the text toolbar does when a whole-element style is
 * applied. Strips the given CSS properties from stored html.
 */
export const stripInlineStyles = (html: string | undefined, properties: string[]): string | undefined => {
    if (!html) return html;
    if (typeof document === "undefined") {
        let output = html;
        properties.forEach((property) => {
            output = output.replace(new RegExp(`${property}\\s*:\\s*[^;"']+;?`, "gi"), "");
        });
        return output;
    }

    const holder = document.createElement("div");
    holder.innerHTML = html;
    holder.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
        properties.forEach((property) => node.style.removeProperty(property));
        if (!node.getAttribute("style")?.trim()) node.removeAttribute("style");
    });
    return holder.innerHTML;
};

/** CSS properties to clear for a given element-level patch key. */
export const INLINE_STYLE_CONFLICTS: Record<string, string[]> = {
    color: ["color"],
    fontFamily: ["font-family"],
    fontSize: ["font-size"],
    fontWeight: ["font-weight"],
    fontStyle: ["font-style"],
    textAlign: ["text-align"],
    lineHeight: ["line-height"],
    letterSpacing: ["letter-spacing"],
    backgroundColor: ["background-color", "background"],
};
