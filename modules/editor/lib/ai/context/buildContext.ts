import type {
    ButtonData,
    ElementData,
    ElementType,
    ImageData,
    ShapeData,
    SlideType,
    TextData,
} from "@editor/store/editorStore";
import { CURATED_FONTS } from "@shared/fonts/fonts";
import type {
    ContextElement,
    CopilotContext,
    ElementRole,
    PresentationContext,
    SlideContext,
} from "../types";

/* ==================== ROLE INFERENCE ==================== */

const area = (data: ElementData) => Math.max(0, data.width) * Math.max(0, data.height);

/**
 * Turns raw elements into semantic roles so the planner can talk about "the
 * heading" or "the second card" instead of guessing from coordinates. Derived
 * from type, relative text size, area and position — the editor's data model
 * has no explicit role field beyond `bookRole`.
 */
const inferTextRole = (
    data: TextData,
    slide: SlideType,
    fontSizeRank: number,
    distinctSizes: number,
): ElementRole => {
    if (data.bookRole === "index") return "index";

    const fontSize = Number(data.fontSize) || 16;
    const slideHeight = slide.height || 480;
    const inTopThird = data.y < slideHeight * 0.34;

    // Biggest type on the slide is the title when it sits high, a heading
    // otherwise (section headings further down the page).
    if (fontSizeRank === 0 && distinctSizes > 1) return inTopThird ? "title" : "heading";
    if (data.bookRole === "chapter") return "heading";
    if (fontSizeRank === 1 && distinctSizes > 2) return "subtitle";
    if (fontSize <= 10) return "caption";
    return "body";
};

const inferImageRole = (data: ImageData, slide: SlideType, isLargest: boolean): ElementRole => {
    const slideArea = (slide.width || 853) * (slide.height || 480);
    const ratio = slideArea > 0 ? area(data) / slideArea : 0;
    const slideHeight = slide.height || 480;
    if (ratio < 0.04 && data.y < slideHeight * 0.2) return "logo";
    return isLargest && ratio > 0.08 ? "hero_image" : "image";
};

const inferShapeRole = (data: ShapeData, slide: SlideType, self: ElementType): ElementRole => {
    const slideArea = (slide.width || 853) * (slide.height || 480);
    const ratio = slideArea > 0 ? area(data) / slideArea : 0;
    if (ratio < 0.015) return "decorative";

    // What makes a shape a "card" is that content sits on top of it.
    const holdsContent = slide.elements.some((other) => {
        if (other.id === self.id || other.data.type === "shape") return false;
        const centerX = other.data.x + other.data.width / 2;
        const centerY = other.data.y + other.data.height / 2;
        return (
            centerX >= data.x && centerX <= data.x + data.width &&
            centerY >= data.y && centerY <= data.y + data.height
        );
    });
    return holdsContent ? "card" : "shape";
};

const roleOf = (
    element: ElementType,
    slide: SlideType,
    helpers: { fontSizeRank: number; distinctSizes: number; isLargestImage: boolean },
): ElementRole => {
    const data = element.data;
    switch (data.type) {
        case "text":
            return inferTextRole(data as TextData, slide, helpers.fontSizeRank, helpers.distinctSizes);
        case "image":
            return inferImageRole(data as ImageData, slide, helpers.isLargestImage);
        case "svg":
            return "decorative";
        case "shape":
            return inferShapeRole(data as ShapeData, slide, element);
        case "button":
            return "button";
        case "interaction":
            return "interaction";
        // The role vocabulary is part of the prompt contract, so these map onto
        // the nearest existing role rather than widening it: a frame is an
        // image as far as layout advice goes, and a QR code is a graphic.
        case "frame":
            return "image";
        case "qr-code":
            return "decorative";
        case "video":
            return "video";
        case "table":
            return "table";
        case "chart":
            return "chart";
        case "watermark":
            return "watermark";
        default:
            return "shape";
    }
};

/* ==================== STYLE DIGEST ==================== */

/** Appearance fields buttons and interactions share. */
type ButtonLikeStyle = Pick<
    ButtonData,
    "backgroundColor" | "textColor" | "fontFamily" | "fontSize" | "fontWeight" | "borderRadius" | "text"
>;

const trim = (value: string | undefined, max: number) => {
    if (!value) return undefined;
    const flat = value.replace(/\s+/g, " ").trim();
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

const styleDigest = (data: ElementData): Record<string, string | number> | undefined => {
    const style: Record<string, string | number> = {};
    const put = (key: string, value: unknown) => {
        if (value === undefined || value === null || value === "") return;
        if (typeof value === "number" && !Number.isFinite(value)) return;
        style[key] = value as string | number;
    };

    if (data.type === "text") {
        const text = data as TextData;
        put("fontFamily", text.fontFamily);
        put("fontSize", text.fontSize);
        put("fontWeight", text.fontWeight);
        put("color", text.color);
        put("textAlign", text.textAlign ?? text.align);
        put("lineHeight", text.lineHeight);
        put("letterSpacing", text.letterSpacing);
        put("backgroundColor", text.backgroundColor);
    } else if (data.type === "image" || data.type === "svg" || data.type === "video") {
        const media = data as ImageData;
        put("borderRadius", media.borderRadius);
        put("opacity", media.opacity);
        put("rotation", media.rotation);
        put("fit", media.fit ?? media.objectFit);
    } else if (data.type === "shape") {
        const shape = data as ShapeData;
        put("fill", shape.fill ?? shape.color);
        put("borderRadius", shape.borderRadius);
        put("opacity", shape.opacity);
    } else if (data.type === "button" || data.type === "interaction") {
        // ButtonData & InteractionData collapses to never (conflicting `type`),
        // so read through the shared label/appearance fields.
        const button: ButtonLikeStyle = data;
        put("backgroundColor", button.backgroundColor);
        put("textColor", button.textColor);
        put("fontFamily", button.fontFamily);
        put("fontSize", button.fontSize);
        put("fontWeight", button.fontWeight);
        put("borderRadius", button.borderRadius);
    }

    return Object.keys(style).length ? style : undefined;
};

/* ==================== SLIDE CONTEXT ==================== */

export const buildSlideContext = (slide: SlideType, index: number): SlideContext => {
    const width = slide.width || 853.33;
    const height = slide.height || 480;

    const textSizes = Array.from(
        new Set(
            slide.elements
                .filter((el) => el.data.type === "text")
                .map((el) => Number((el.data as TextData).fontSize) || 16),
        ),
    ).sort((a, b) => b - a);

    const imageAreas = slide.elements
        .filter((el) => el.data.type === "image")
        .map((el) => area(el.data));
    const largestImageArea = imageAreas.length ? Math.max(...imageAreas) : 0;

    const elements = slide.elements.map((element, layer) => {
        const data = element.data;
        const fontSizeRank =
            data.type === "text"
                ? textSizes.indexOf(Number((data as TextData).fontSize) || 16)
                : -1;
        const role = roleOf(element, slide, {
            fontSizeRank,
            distinctSizes: textSizes.length,
            isLargestImage: data.type === "image" && area(data) === largestImageArea,
        });

        const centerX = data.x + data.width / 2;
        const centerY = data.y + data.height / 2;

        const contextElement: ContextElement = {
            id: element.id,
            type: data.type,
            role,
            // Filled in below, once the whole slide is known.
            roleIndex: 0,
            side: centerX < width * 0.38 ? "left" : centerX > width * 0.62 ? "right" : "center",
            band: centerY < height * 0.34 ? "top" : centerY > height * 0.66 ? "bottom" : "middle",
            x: Math.round(data.x),
            y: Math.round(data.y),
            width: Math.round(data.width),
            height: Math.round(data.height),
            layer,
            style: styleDigest(data),
        };

        if (data.type === "text") {
            contextElement.text = trim((data as TextData).text, 220);
        } else if (data.type === "button" || data.type === "interaction") {
            contextElement.text = trim((data as ButtonData).text, 80);
        } else if (data.type === "image" || data.type === "svg" || data.type === "video") {
            contextElement.src = trim((data as ImageData).src, 160);
        }

        return contextElement;
    });

    // "the second card" / "the third paragraph" mean reading order, not z-order.
    const byRole = new Map<ElementRole, ContextElement[]>();
    elements.forEach((element) => {
        const group = byRole.get(element.role) ?? [];
        group.push(element);
        byRole.set(element.role, group);
    });
    byRole.forEach((group) => {
        group
            .slice()
            .sort((a, b) => (Math.abs(a.y - b.y) > 12 ? a.y - b.y : a.x - b.x))
            .forEach((element, position) => {
                element.roleIndex = position + 1;
            });
    });

    return {
        slideId: slide.id,
        index,
        width: Math.round(width),
        height: Math.round(height),
        background: slide.background || "#ffffff",
        elements,
    };
};

/* ==================== PRESENTATION CONTEXT ==================== */

const uniqueTop = (values: (string | undefined)[], limit: number) =>
    Array.from(new Set(values.filter((value): value is string => !!value))).slice(0, limit);

const buildPresentationContext = (
    slides: SlideType[],
    activeSlideIndex: number,
): PresentationContext => {
    const fonts: string[] = [];
    const textColors: string[] = [];
    const accentColors: string[] = [];
    const radii: number[] = [];
    let headingFont: string | undefined;
    let bodyFont: string | undefined;
    let largestHeadingSize = 0;

    slides.forEach((slide) => {
        slide.elements.forEach((element) => {
            const data = element.data;
            if (data.type === "text") {
                const text = data as TextData;
                if (text.fontFamily) fonts.push(text.fontFamily);
                if (text.color) textColors.push(text.color);
                const size = Number(text.fontSize) || 0;
                if (size > largestHeadingSize) {
                    largestHeadingSize = size;
                    headingFont = text.fontFamily;
                } else if (size && size <= 18 && !bodyFont) {
                    bodyFont = text.fontFamily;
                }
            } else if (data.type === "button" || data.type === "interaction") {
                const button = data as ButtonData;
                if (button.backgroundColor) accentColors.push(button.backgroundColor);
                if (typeof button.borderRadius === "number") radii.push(button.borderRadius);
            } else if (data.type === "shape") {
                const shape = data as ShapeData;
                const fill = shape.fill ?? shape.color;
                if (fill) accentColors.push(fill);
            }
        });
    });

    // Digest, not a dump: presentation-wide asks only need what design language
    // is already in use plus a per-slide handle.
    const slideDigest = slides.slice(0, 60).map((slide, index) => ({
        slideId: slide.id,
        index,
        background: slide.background || "#ffffff",
        roles: Array.from(
            new Set(buildSlideContext(slide, index).elements.map((el) => el.role)),
        ),
    }));

    return {
        slideCount: slides.length,
        activeSlideIndex,
        slides: slideDigest,
        design: {
            fonts: uniqueTop(fonts, 6),
            headingFont,
            bodyFont,
            textColors: uniqueTop(textColors, 6),
            backgrounds: uniqueTop(slides.map((slide) => slide.background), 6),
            accentColors: uniqueTop(accentColors, 6),
            borderRadius: radii.length ? Math.round(radii.reduce((a, b) => a + b, 0) / radii.length) : undefined,
        },
    };
};

/* ==================== ENTRY POINT ==================== */

export const buildCopilotContext = (input: {
    slides: SlideType[];
    activeSlide: number;
    selectedElementIds: string[];
    lastTouchedIds?: string[];
}): CopilotContext => {
    const activeIndex = Math.max(0, Math.min(input.activeSlide, input.slides.length - 1));
    const slide = input.slides[activeIndex];
    const slideContext = buildSlideContext(slide, activeIndex);
    const selectionSet = new Set(input.selectedElementIds);

    return {
        slide: slideContext,
        presentation: buildPresentationContext(input.slides, activeIndex),
        selection: {
            ids: input.selectedElementIds,
            elements: slideContext.elements.filter((element) => selectionSet.has(element.id)),
        },
        lastTouchedIds: input.lastTouchedIds ?? [],
        availableFonts: CURATED_FONTS.map((font) => font.family),
    };
};
