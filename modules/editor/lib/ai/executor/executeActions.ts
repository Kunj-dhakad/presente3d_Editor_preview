import useEditorStore, {
    type AIEditOp,
    type ElementData,
    type ElementType,
    type ImageData,
    type ShapeData,
    type SlideType,
    type TextData,
} from "@editor/store/editorStore";
import { loadGoogleFont } from "@shared/fonts/useFontLoader";
import { backgroundImageValue, readableTextColor } from "../actions/colors";
import {
    INLINE_STYLE_CONFLICTS,
    estimateTextHeight,
    fitTextToBox,
    stripInlineStyles,
} from "../actions/textFit";
import { isDestructive, unsupportedReason } from "../actions/validate";
import { buildSlideContext } from "../context/buildContext";
import { resolveImage } from "../image/imageService";
import type {
    AIAction,
    AIActionType,
    ContextElement,
    CopilotContext,
    ExecutionResult,
} from "../types";

/* ==================== HELPERS ==================== */

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

type ResolvedTarget = {
    slideId: string;
    slideIndex: number;
    element: ElementType;
    context: ContextElement;
    slide: SlideType;
};

const TEXT_LIKE = new Set(["text"]);
const IMAGE_LIKE = new Set(["image", "svg", "video"]);
const BUTTON_LIKE = new Set(["button", "interaction"]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Slides an action may look at, honouring `scope`. */
const scopedSlides = (action: AIAction, slides: SlideType[], activeIndex: number): SlideType[] => {
    if (action.target?.scope === "presentation") return slides;
    if (action.slideId) {
        const found = slides.find((slide) => slide.id === action.slideId);
        return found ? [found] : [slides[activeIndex]];
    }
    return [slides[activeIndex]];
};

/**
 * Turns a target descriptor into concrete elements.
 *
 * Priority matches how people actually refer to things: an explicit id wins,
 * then the canvas selection, then a semantic role, then whatever the previous
 * command touched ("make it bigger").
 */
const resolveTargets = (action: AIAction, ctx: CopilotContext): ResolvedTarget[] => {
    const { slides, activeSlide } = useEditorStore.getState();
    const activeIndex = clamp(activeSlide, 0, slides.length - 1);

    const collect = (slideList: SlideType[]): ResolvedTarget[] => {
        const resolved: ResolvedTarget[] = [];
        slideList.forEach((slide) => {
            const slideIndex = slides.indexOf(slide);
            const context = buildSlideContext(slide, slideIndex);
            slide.elements.forEach((element) => {
                const elementContext = context.elements.find((item) => item.id === element.id);
                if (elementContext) {
                    resolved.push({ slideId: slide.id, slideIndex, element, context: elementContext, slide });
                }
            });
        });
        return resolved;
    };

    const pool = collect(scopedSlides(action, slides, activeIndex));
    const target = action.target;

    if (target?.ids?.length) {
        const wanted = new Set(target.ids);
        // The page in front of the user wins: an id that also exists elsewhere
        // must not turn a single-slide edit into a document-wide one.
        const onThisSlide = pool.filter((item) => wanted.has(item.element.id));
        if (onThisSlide.length) return onThisSlide;
        const anywhere = collect(slides).filter((item) => wanted.has(item.element.id));
        if (anywhere.length) return anywhere;
    }

    const selection = ctx.selection.ids;
    const hasFilters = !!(target?.roles?.length || target?.types?.length);

    if (selection.length && (target?.scope === "selection" || !hasFilters)) {
        const wanted = new Set(selection);
        const selected = pool.filter((item) => wanted.has(item.element.id));
        if (selected.length) return selected;
    }

    if (hasFilters) {
        const roles = new Set(target?.roles ?? []);
        const types = new Set(target?.types ?? []);
        const filtered = pool.filter((item) => {
            const roleMatch = roles.size === 0 || roles.has(item.context.role);
            const typeMatch = types.size === 0 || types.has(item.element.data.type);
            return roleMatch && typeMatch;
        });
        if (filtered.length) return filtered;
    }

    if (ctx.lastTouchedIds.length) {
        const wanted = new Set(ctx.lastTouchedIds);
        const recent = collect(slides).filter((item) => wanted.has(item.element.id));
        if (recent.length) return recent;
    }

    return [];
};

/** Slides an action applies to when it is slide-level rather than element-level. */
const resolveSlides = (action: AIAction): SlideType[] => {
    const { slides, activeSlide } = useEditorStore.getState();
    if (action.target?.scope === "presentation") return slides;
    if (action.slideId) {
        const found = slides.find((slide) => slide.id === action.slideId);
        if (found) return [found];
    }
    return [slides[clamp(activeSlide, 0, slides.length - 1)]];
};

/** Element-level style must beat leftover inline spans in stored html. */
const withInlineStripped = (
    element: ElementType,
    patch: Partial<TextData>,
): Partial<TextData> => {
    if (element.data.type !== "text") return patch;
    const properties = Object.keys(patch).flatMap((key) => INLINE_STYLE_CONFLICTS[key] ?? []);
    if (!properties.length) return patch;
    const html = stripInlineStyles((element.data as TextData).html, properties);
    return html === undefined ? patch : { ...patch, html };
};

/** New text for a text element, refitted so it cannot blow up the layout. */
const textUpdatePatch = (target: ResolvedTarget, value: string): { patch: Partial<TextData>; shrunk: boolean } => {
    const data = target.element.data as TextData;
    const slideHeight = target.slide.height || 480;
    const fit = fitTextToBox(value, data, slideHeight);
    const patch: Partial<TextData> = {
        text: value,
        // Stale html would keep rendering the old copy — RenderText prefers it.
        html: "",
        height: Math.max(fit.height, Number(data.fontSize) || 16),
    };
    if (fit.fontSize !== undefined) patch.fontSize = fit.fontSize;
    return { patch, shrunk: fit.shrunk };
};

const buttonTextKey = (data: ElementData) => (BUTTON_LIKE.has(data.type) ? "textColor" : "color");

/* ==================== EXECUTION ==================== */

type Plan = {
    ops: AIEditOp[];
    applied: AIActionType[];
    skipped: { type: string; reason: string }[];
    touched: Set<string>;
    notes: string[];
    /** Deferred work that cannot be expressed as ops (slide generation). */
    generators: (() => Promise<void>)[];
};

const emptyPlan = (): Plan => ({
    ops: [],
    applied: [],
    skipped: [],
    touched: new Set(),
    notes: [],
    generators: [],
});

const blankSlideLike = (slide: SlideType): SlideType => ({
    id: newId(),
    width: slide.width,
    height: slide.height,
    background: slide.background,
    subtitle_url: "",
    subtitle_text: "",
    subtitle_json: "",
    thumbnail: "",
    elements: [],
});

/**
 * Brings a page into view after the AI adds one. The canvas' own scroll observer
 * keeps `activeSlide` in sync with what is on screen, so without this a new page
 * is created off-screen and the user never sees it.
 */
const scrollCanvasToSlide = (index: number) => {
    if (typeof document === "undefined") return;
    requestAnimationFrame(() => {
        document
            .querySelector<HTMLElement>(`[data-slide-index="${index}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
};

/** Generates slide content through the existing generator route. */
const generateSlideContent = async (prompt: string, slide: SlideType) => {
    const res = await fetch("/api/generate-Ai-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            pageNum: 1,
            totalPages: 1,
            width: slide.width ?? 350,
            height: slide.height ?? 434,
        }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success || !data?.content) {
        throw new Error(data?.error || "Slide generation failed");
    }
    return data.content;
};

/**
 * Plans one action into store ops. Async only where an image or slide has to be
 * fetched first, so the whole command still lands as a single transaction.
 */
const planAction = async (action: AIAction, ctx: CopilotContext, plan: Plan): Promise<void> => {
    const unsupported = unsupportedReason(action);
    if (unsupported) {
        plan.skipped.push({ type: action.type, reason: unsupported });
        return;
    }

    const skip = (reason: string): void => {
        plan.skipped.push({ type: action.type, reason });
    };
    const done = (targets: ResolvedTarget[] = []) => {
        plan.applied.push(action.type);
        targets.forEach((target) => plan.touched.add(target.element.id));
    };

    // Destructive/replacing actions keep every match so the case below can stop
    // and ask instead of picking one at random.
    const elementTargets = () => resolveTargets(action, ctx);

    const pushPatch = (targets: ResolvedTarget[], build: (target: ResolvedTarget) => Partial<ElementData> | null) => {
        targets.forEach((target) => {
            const patch = build(target);
            if (patch && Object.keys(patch).length) {
                plan.ops.push({ kind: "updateElement", slideId: target.slideId, elementId: target.element.id, patch });
            }
        });
    };

    switch (action.type) {
        /* ---------- TEXT CONTENT ---------- */
        case "UPDATE_TEXT":
        case "REWRITE_TEXT":
        case "REPLACE_TEXT": {
            const targets = resolveTargets(action, ctx).filter(
                (target) => TEXT_LIKE.has(target.element.data.type) || BUTTON_LIKE.has(target.element.data.type),
            );
            if (!targets.length) return skip("I couldn't tell which text you meant");

            targets.forEach((target) => {
                const data = target.element.data;
                let value = String(action.value ?? "");
                if (action.type === "REPLACE_TEXT" && action.find) {
                    const current = (data as TextData).text ?? "";
                    if (!current.includes(action.find)) return;
                    value = current.split(action.find).join(value);
                }
                if (BUTTON_LIKE.has(data.type)) {
                    plan.ops.push({
                        kind: "updateElement",
                        slideId: target.slideId,
                        elementId: target.element.id,
                        patch: { text: value } as Partial<ElementData>,
                    });
                    return;
                }
                const { patch, shrunk } = textUpdatePatch(target, value);
                if (shrunk) plan.notes.push("reduced the font size slightly so the new text fits");
                plan.ops.push({ kind: "updateElement", slideId: target.slideId, elementId: target.element.id, patch });
            });
            done(targets);
            return;
        }

        case "REWRITE_SLIDE":
        case "TRANSLATE_SLIDE": {
            const { slides, activeSlide } = useEditorStore.getState();
            const active = slides[clamp(activeSlide, 0, slides.length - 1)];
            const edits = action.texts ?? [];
            const touched: ResolvedTarget[] = [];
            edits.forEach((edit) => {
                // Rewrites belong to the page being looked at.
                const searchOrder = active.elements.some((item) => item.id === edit.targetId)
                    ? [active]
                    : slides;
                searchOrder.forEach((slide) => {
                    const slideIndex = slides.indexOf(slide);
                    const element = slide.elements.find((item) => item.id === edit.targetId);
                    if (!element) return;
                    const context = buildSlideContext(slide, slideIndex).elements.find((item) => item.id === element.id);
                    if (!context) return;
                    const target: ResolvedTarget = { slideId: slide.id, slideIndex, element, context, slide };
                    if (BUTTON_LIKE.has(element.data.type)) {
                        plan.ops.push({
                            kind: "updateElement",
                            slideId: slide.id,
                            elementId: element.id,
                            patch: { text: edit.value } as Partial<ElementData>,
                        });
                    } else if (TEXT_LIKE.has(element.data.type)) {
                        const { patch, shrunk } = textUpdatePatch(target, edit.value);
                        if (shrunk) plan.notes.push("reduced some font sizes so the text still fits");
                        plan.ops.push({ kind: "updateElement", slideId: slide.id, elementId: element.id, patch });
                    } else {
                        return;
                    }
                    touched.push(target);
                });
            });
            if (!touched.length) return skip("I couldn't match the rewritten text to any element");
            done(touched);
            return;
        }

        /* ---------- TYPOGRAPHY ---------- */
        case "UPDATE_FONT": {
            const family = String(action.value);
            const targets = resolveTargets(action, ctx).filter(
                (target) => TEXT_LIKE.has(target.element.data.type) || BUTTON_LIKE.has(target.element.data.type),
            );
            if (!targets.length) return skip("I couldn't tell which text you meant");
            void loadGoogleFont(family);
            pushPatch(targets, (target) => withInlineStripped(target.element, { fontFamily: family }));
            done(targets);
            return;
        }

        case "UPDATE_FONT_SIZE": {
            const targets = resolveTargets(action, ctx).filter(
                (target) => TEXT_LIKE.has(target.element.data.type) || BUTTON_LIKE.has(target.element.data.type),
            );
            if (!targets.length) return skip("I couldn't tell which text you meant");
            pushPatch(targets, (target) => {
                const data = target.element.data as TextData;
                const current = Number(data.fontSize) || 16;
                const next = clamp(
                    action.value !== undefined
                        ? Number(action.value)
                        : action.scale !== undefined
                            ? current * action.scale
                            : current + (action.delta ?? 0),
                    6,
                    400,
                );
                const patch: Partial<TextData> = { fontSize: Math.round(next * 10) / 10 };
                if (TEXT_LIKE.has(data.type)) {
                    patch.height = estimateTextHeight(
                        data.text ?? "",
                        { ...data, fontSize: patch.fontSize },
                        data.width,
                    );
                }
                return withInlineStripped(target.element, patch);
            });
            done(targets);
            return;
        }

        case "UPDATE_FONT_WEIGHT": {
            const targets = resolveTargets(action, ctx).filter(
                (target) => TEXT_LIKE.has(target.element.data.type) || BUTTON_LIKE.has(target.element.data.type),
            );
            if (!targets.length) return skip("I couldn't tell which text you meant");
            pushPatch(targets, (target) =>
                withInlineStripped(target.element, { fontWeight: Number(action.value) }),
            );
            done(targets);
            return;
        }

        case "UPDATE_TEXT_COLOR": {
            const color = String(action.value);
            const targets = resolveTargets(action, ctx).filter(
                (target) => TEXT_LIKE.has(target.element.data.type) || BUTTON_LIKE.has(target.element.data.type),
            );
            if (!targets.length) return skip("I couldn't tell which text you meant");
            pushPatch(targets, (target) =>
                withInlineStripped(target.element, { [buttonTextKey(target.element.data)]: color } as Partial<TextData>),
            );
            done(targets);
            return;
        }

        case "UPDATE_TEXT_ALIGNMENT": {
            const value = String(action.value) as TextData["textAlign"];
            const targets = resolveTargets(action, ctx).filter((target) => TEXT_LIKE.has(target.element.data.type));
            if (!targets.length) return skip("I couldn't tell which text you meant");
            pushPatch(targets, (target) =>
                withInlineStripped(target.element, {
                    textAlign: value,
                    align: value as TextData["align"],
                }),
            );
            done(targets);
            return;
        }

        case "UPDATE_LINE_HEIGHT":
        case "UPDATE_LETTER_SPACING": {
            const key = action.type === "UPDATE_LINE_HEIGHT" ? "lineHeight" : "letterSpacing";
            const targets = resolveTargets(action, ctx).filter((target) => TEXT_LIKE.has(target.element.data.type));
            if (!targets.length) return skip("I couldn't tell which text you meant");
            pushPatch(targets, (target) => {
                const data = target.element.data as TextData;
                const patch: Partial<TextData> = { [key]: Number(action.value) };
                if (key === "lineHeight") {
                    patch.height = estimateTextHeight(
                        data.text ?? "",
                        { ...data, lineHeight: Number(action.value) },
                        data.width,
                    );
                }
                return withInlineStripped(target.element, patch);
            });
            done(targets);
            return;
        }

        /* ---------- SLIDE BACKGROUND ---------- */
        case "UPDATE_BACKGROUND_COLOR": {
            const slides = resolveSlides(action);
            slides.forEach((slide) =>
                plan.ops.push({ kind: "updateSlide", slideId: slide.id, patch: { background: String(action.value) } }),
            );
            done();
            return;
        }

        case "UPDATE_BACKGROUND_IMAGE": {
            const slides = resolveSlides(action);
            const url =
                action.url ??
                (await resolveImage({
                    query: action.query || action.prompt || "abstract background",
                    source: action.source,
                    aspectRatio: (slides[0]?.width || 853) / (slides[0]?.height || 480),
                }))?.url;
            if (!url) return skip("I couldn't find a background image for that");
            slides.forEach((slide) =>
                plan.ops.push({
                    kind: "updateSlide",
                    slideId: slide.id,
                    patch: { background: backgroundImageValue(url) },
                }),
            );
            done();
            return;
        }

        /* ---------- IMAGES ---------- */
        case "REPLACE_IMAGE":
        case "REGENERATE_IMAGE": {
            const targets = elementTargets().filter((target) => IMAGE_LIKE.has(target.element.data.type));
            if (!targets.length) return skip("I couldn't identify which image you meant");
            if (targets.length > 1 && !action.target?.allowMultiple) {
                return skip("there are several images here, so I didn't want to guess which one");
            }
            const target = targets[0];
            const data = target.element.data as ImageData;
            const query = action.query || action.prompt || "professional photo";
            const image = action.url
                ? { url: action.url, source: "search" as const }
                : await resolveImage({
                    query,
                    source: action.type === "REGENERATE_IMAGE" ? "generate" : action.source,
                    aspectRatio: data.width / Math.max(1, data.height),
                });
            if (!image) return skip("I couldn't find a replacement image, so I left the original in place");
            // Only the source changes: position, size, radius, filters all stay.
            plan.ops.push({
                kind: "updateElement",
                slideId: target.slideId,
                elementId: target.element.id,
                patch: { src: image.url } as Partial<ElementData>,
            });
            done([target]);
            return;
        }

        case "REMOVE_IMAGE":
        case "DELETE_ELEMENT": {
            const targets = elementTargets();
            const filtered = action.type === "REMOVE_IMAGE"
                ? targets.filter((target) => IMAGE_LIKE.has(target.element.data.type))
                : targets;
            if (!filtered.length) return skip("I couldn't identify which element you meant");
            if (filtered.length > 1 && !action.target?.allowMultiple) {
                return skip("more than one element matched, so I didn't delete anything");
            }
            filtered.forEach((target) =>
                plan.ops.push({ kind: "removeElement", slideId: target.slideId, elementId: target.element.id }),
            );
            done(filtered);
            return;
        }

        case "ADD_IMAGE": {
            const { slides, activeSlide } = useEditorStore.getState();
            const slide = slides[clamp(activeSlide, 0, slides.length - 1)];
            const slideWidth = slide.width || 853;
            const slideHeight = slide.height || 480;
            const width = action.width ?? Math.round(slideWidth * 0.4);
            const height = action.height ?? Math.round(slideHeight * 0.5);
            const image = action.url
                ? { url: action.url }
                : await resolveImage({
                    query: action.query || action.prompt || "professional photo",
                    source: action.source,
                    aspectRatio: width / Math.max(1, height),
                });
            if (!image) return skip("I couldn't find an image for that");

            const x = action.x ?? (
                action.position === "left" ? Math.round(slideWidth * 0.06)
                    : action.position === "right" ? Math.round(slideWidth * 0.94 - width)
                        : Math.round((slideWidth - width) / 2)
            );
            const y = action.y ?? (
                action.position === "top" ? Math.round(slideHeight * 0.08)
                    : action.position === "bottom" ? Math.round(slideHeight * 0.92 - height)
                        : Math.round((slideHeight - height) / 2)
            );

            const element: ElementType = {
                id: newId(),
                data: {
                    type: "image",
                    src: image.url,
                    x: clamp(x, 0, Math.max(0, slideWidth - width)),
                    y: clamp(y, 0, Math.max(0, slideHeight - height)),
                    width,
                    height,
                    rotation: 0,
                    opacity: 1,
                    zIndex: 1,
                    fit: "cover",
                    objectFit: "cover",
                    borderRadius: "0",
                } as ImageData,
            };
            plan.ops.push({ kind: "addElement", slideId: slide.id, element });
            plan.applied.push(action.type);
            plan.touched.add(element.id);
            return;
        }

        /* ---------- LAYOUT ---------- */
        case "MOVE_ELEMENT": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which element to move");
            pushPatch(targets, (target) => {
                const data = target.element.data;
                const slideWidth = target.slide.width || 853;
                const slideHeight = target.slide.height || 480;
                let x = data.x;
                let y = data.y;

                if (action.position === "left") x = Math.round(slideWidth * 0.06);
                if (action.position === "right") x = Math.round(slideWidth * 0.94 - data.width);
                if (action.position === "center") x = Math.round((slideWidth - data.width) / 2);
                if (action.position === "top") y = Math.round(slideHeight * 0.06);
                if (action.position === "bottom") y = Math.round(slideHeight * 0.94 - data.height);

                if (action.x !== undefined) x = action.x;
                if (action.y !== undefined) y = action.y;
                // A bare delta means "nudge" — vertical unless an axis says otherwise.
                if (action.delta !== undefined) {
                    if (action.axis === "horizontal") x += action.delta;
                    else y += action.delta;
                }

                return {
                    x: clamp(x, 0, Math.max(0, slideWidth - data.width)),
                    y: clamp(y, 0, Math.max(0, slideHeight - data.height)),
                } as Partial<ElementData>;
            });
            done(targets);
            return;
        }

        case "RESIZE_ELEMENT": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which element to resize");
            pushPatch(targets, (target) => {
                const data = target.element.data;
                const slideWidth = target.slide.width || 853;
                const slideHeight = target.slide.height || 480;
                const scale = action.scale;
                let width = action.width ?? (scale ? data.width * scale : data.width);
                let height = action.height ?? (scale ? data.height * scale : data.height);
                width = clamp(Math.round(width), 8, slideWidth);
                height = clamp(Math.round(height), 8, slideHeight);
                // Grow around the centre so the element stays where it looked.
                const x = clamp(Math.round(data.x - (width - data.width) / 2), 0, Math.max(0, slideWidth - width));
                const y = clamp(Math.round(data.y - (height - data.height) / 2), 0, Math.max(0, slideHeight - height));
                return { width, height, x, y } as Partial<ElementData>;
            });
            done(targets);
            return;
        }

        case "ROTATE_ELEMENT": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which element to rotate");
            pushPatch(targets, (target) => {
                const current = target.element.data.rotation ?? 0;
                const next = action.value !== undefined ? Number(action.value) : current + (action.delta ?? 0);
                return { rotation: Math.round(next) } as Partial<ElementData>;
            });
            done(targets);
            return;
        }

        case "ALIGN_ELEMENTS": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which elements to align");
            const useSelection = action.relativeTo === "selection" && targets.length > 1;
            const bounds = {
                left: Math.min(...targets.map((target) => target.element.data.x)),
                right: Math.max(...targets.map((target) => target.element.data.x + target.element.data.width)),
                top: Math.min(...targets.map((target) => target.element.data.y)),
                bottom: Math.max(...targets.map((target) => target.element.data.y + target.element.data.height)),
            };
            pushPatch(targets, (target) => {
                const data = target.element.data;
                const slideWidth = target.slide.width || 853;
                const slideHeight = target.slide.height || 480;
                const box = useSelection
                    ? bounds
                    : { left: 0, right: slideWidth, top: 0, bottom: slideHeight };
                switch (action.axis) {
                    case "left":
                        return { x: Math.round(box.left) } as Partial<ElementData>;
                    case "right":
                        return { x: Math.round(box.right - data.width) } as Partial<ElementData>;
                    case "center":
                        return { x: Math.round(box.left + (box.right - box.left - data.width) / 2) } as Partial<ElementData>;
                    case "top":
                        return { y: Math.round(box.top) } as Partial<ElementData>;
                    case "bottom":
                        return { y: Math.round(box.bottom - data.height) } as Partial<ElementData>;
                    case "middle":
                        return { y: Math.round(box.top + (box.bottom - box.top - data.height) / 2) } as Partial<ElementData>;
                    default:
                        return null;
                }
            });
            done(targets);
            return;
        }

        case "DISTRIBUTE_ELEMENTS": {
            const targets = resolveTargets(action, ctx);
            if (targets.length < 3 && !action.gap) {
                if (targets.length < 2) return skip("I need at least two elements to distribute");
            }
            const horizontal = action.axis === "horizontal";
            const sorted = [...targets].sort((a, b) =>
                horizontal ? a.element.data.x - b.element.data.x : a.element.data.y - b.element.data.y,
            );
            const first = sorted[0].element.data;
            const last = sorted[sorted.length - 1].element.data;
            const start = horizontal ? first.x : first.y;
            const end = horizontal ? last.x + last.width : last.y + last.height;
            const totalSize = sorted.reduce(
                (sum, target) => sum + (horizontal ? target.element.data.width : target.element.data.height),
                0,
            );
            const gap = action.gap ?? Math.max(0, (end - start - totalSize) / Math.max(1, sorted.length - 1));

            let cursor = start;
            sorted.forEach((target) => {
                const data = target.element.data;
                const patch = horizontal
                    ? ({ x: Math.round(cursor) } as Partial<ElementData>)
                    : ({ y: Math.round(cursor) } as Partial<ElementData>);
                plan.ops.push({ kind: "updateElement", slideId: target.slideId, elementId: target.element.id, patch });
                cursor += (horizontal ? data.width : data.height) + gap;
            });
            done(sorted);
            return;
        }

        case "REORDER_ELEMENTS": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which element to reorder");
            targets.forEach((target) =>
                plan.ops.push({
                    kind: "moveElementLayer",
                    slideId: target.slideId,
                    elementId: target.element.id,
                    to: action.to ?? "front",
                }),
            );
            done(targets);
            return;
        }

        /* ---------- APPEARANCE ---------- */
        case "UPDATE_SHAPE_COLOR": {
            const targets = resolveTargets(action, ctx).filter(
                (target) => target.element.data.type === "shape" || target.element.data.type === "svg",
            );
            if (!targets.length) return skip("I couldn't tell which shape you meant");
            pushPatch(targets, () => ({ fill: String(action.value), color: String(action.value) } as Partial<ElementData>));
            done(targets);
            return;
        }

        case "UPDATE_BORDER": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which element you meant");
            pushPatch(targets, (target) => {
                const patch: Record<string, unknown> = {};
                if (action.radius !== undefined) {
                    // Buttons/tables store a number, media stores a CSS string.
                    patch.borderRadius = BUTTON_LIKE.has(target.element.data.type)
                        ? action.radius
                        : String(action.radius);
                }
                if (action.borderWidth !== undefined) {
                    patch.strokeWidth = action.borderWidth;
                    if (BUTTON_LIKE.has(target.element.data.type)) patch.borderWidth = action.borderWidth;
                }
                if (action.borderColor) {
                    patch.strokeColor = action.borderColor;
                    if (BUTTON_LIKE.has(target.element.data.type)) patch.borderColor = action.borderColor;
                }
                if (action.borderStyle) patch.strokeStyle = action.borderStyle;
                return patch as Partial<ElementData>;
            });
            done(targets);
            return;
        }

        case "UPDATE_OPACITY": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which element you meant");
            pushPatch(targets, () => ({ opacity: Number(action.value) } as Partial<ElementData>));
            done(targets);
            return;
        }

        case "APPLY_STYLE": {
            const targets = resolveTargets(action, ctx);
            if (!targets.length) return skip("I couldn't tell which elements to restyle");
            pushPatch(targets, (target) => {
                const style = { ...(action.style ?? {}) };
                // "color" means the label colour on button-like elements.
                if (BUTTON_LIKE.has(target.element.data.type) && style.color !== undefined) {
                    style.textColor = style.color;
                    delete style.color;
                }
                if (target.element.data.type === "shape" && style.color !== undefined) {
                    style.fill = style.color;
                }
                return withInlineStripped(target.element, style as Partial<TextData>);
            });
            done(targets);
            return;
        }

        case "CHANGE_ACCENT_COLOR": {
            const accent = String(action.value);
            const targets = resolveTargets(
                { ...action, target: { ...action.target, roles: action.target?.roles ?? ["button", "interaction", "shape", "decorative"] } },
                ctx,
            );
            if (!targets.length) return skip("there's nothing accent-coloured on this slide");
            pushPatch(targets, (target) => {
                const data = target.element.data;
                if (BUTTON_LIKE.has(data.type)) {
                    return {
                        backgroundColor: accent,
                        gradientFrom: accent,
                        gradientTo: accent,
                        textColor: readableTextColor(accent),
                    } as Partial<ElementData>;
                }
                if (data.type === "shape" || data.type === "svg") {
                    return { fill: accent, color: accent } as Partial<ElementData>;
                }
                return null;
            });
            done(targets);
            return;
        }

        case "CHANGE_THEME": {
            const theme = action.theme ?? {};
            const slides = resolveSlides(action);
            const { slides: allSlides } = useEditorStore.getState();
            const touched: ResolvedTarget[] = [];

            slides.forEach((slide) => {
                if (theme.background) {
                    plan.ops.push({ kind: "updateSlide", slideId: slide.id, patch: { background: theme.background } });
                }
                const context = buildSlideContext(slide, allSlides.indexOf(slide));
                slide.elements.forEach((element) => {
                    const elementContext = context.elements.find((item) => item.id === element.id);
                    if (!elementContext) return;
                    const patch: Record<string, unknown> = {};
                    const role = elementContext.role;

                    if (TEXT_LIKE.has(element.data.type)) {
                        const heading = role === "title" || role === "heading" || role === "subtitle";
                        const color = heading ? theme.heading ?? theme.text : theme.text;
                        if (color) patch.color = color;
                    } else if (BUTTON_LIKE.has(element.data.type) && theme.accent) {
                        patch.backgroundColor = theme.accent;
                        patch.gradientFrom = theme.accent;
                        patch.gradientTo = theme.accent;
                        patch.textColor = readableTextColor(theme.accent);
                    } else if (element.data.type === "shape") {
                        if (role === "card" && theme.cardBackground) {
                            patch.fill = theme.cardBackground;
                            patch.color = theme.cardBackground;
                        } else if (role !== "card" && theme.accent) {
                            patch.fill = theme.accent;
                            patch.color = theme.accent;
                        }
                    }

                    if (Object.keys(patch).length) {
                        const merged = withInlineStripped(element, patch as Partial<TextData>);
                        plan.ops.push({
                            kind: "updateElement",
                            slideId: slide.id,
                            elementId: element.id,
                            patch: merged as Partial<ElementData>,
                        });
                        touched.push({
                            slideId: slide.id,
                            slideIndex: allSlides.indexOf(slide),
                            element,
                            context: elementContext,
                            slide,
                        });
                    }
                });
            });

            if (!plan.ops.length) return skip("that palette had nothing to change here");
            done(touched);
            return;
        }

        /* ---------- ADD ELEMENTS ---------- */
        case "ADD_TEXT": {
            const { slides, activeSlide } = useEditorStore.getState();
            const slide = slides[clamp(activeSlide, 0, slides.length - 1)];
            const slideWidth = slide.width || 853;
            const slideHeight = slide.height || 480;
            const width = action.width ?? Math.round(slideWidth * 0.7);
            const fontSize = action.height ?? 18;
            const value = String(action.value);
            const data: TextData = {
                type: "text",
                text: value,
                x: action.x ?? Math.round((slideWidth - width) / 2),
                y: action.y ?? Math.round(slideHeight * 0.7),
                width,
                height: 0,
                fontSize,
                fontFamily: ctx.presentation.design.bodyFont || ctx.presentation.design.fonts[0] || "Inter",
                fontWeight: 400,
                color: ctx.presentation.design.textColors[0] || "#111111",
                textAlign: "left",
                lineHeight: 1.4,
                letterSpacing: 0,
                rotation: 0,
                opacity: 1,
                zIndex: 2,
            };
            data.height = estimateTextHeight(value, data, width);
            data.y = clamp(data.y, 0, Math.max(0, slideHeight - data.height));
            const element: ElementType = { id: newId(), data };
            plan.ops.push({ kind: "addElement", slideId: slide.id, element });
            plan.applied.push(action.type);
            plan.touched.add(element.id);
            return;
        }

        case "ADD_SHAPE": {
            const { slides, activeSlide } = useEditorStore.getState();
            const slide = slides[clamp(activeSlide, 0, slides.length - 1)];
            const slideWidth = slide.width || 853;
            const slideHeight = slide.height || 480;
            const width = action.width ?? Math.round(slideWidth * 0.3);
            const height = action.height ?? Math.round(slideHeight * 0.3);
            const fill = String(action.value ?? "#e5e7eb");
            const element: ElementType = {
                id: newId(),
                data: {
                    type: "shape",
                    shape: "<rect x='0' y='0' width='100' height='100' />",
                    fill,
                    color: fill,
                    x: action.x ?? Math.round((slideWidth - width) / 2),
                    y: action.y ?? Math.round((slideHeight - height) / 2),
                    width,
                    height,
                    rotation: 0,
                    opacity: 1,
                    zIndex: 1,
                    borderRadius: "12",
                } as ShapeData,
            };
            plan.ops.push({ kind: "addElement", slideId: slide.id, element });
            plan.applied.push(action.type);
            plan.touched.add(element.id);
            return;
        }

        case "DUPLICATE_ELEMENT": {
            const targets = elementTargets();
            if (!targets.length) return skip("I couldn't tell which element to duplicate");
            if (targets.length > 1 && !action.target?.allowMultiple) {
                return skip("more than one element matched, so I didn't duplicate anything");
            }
            targets.forEach((target) => {
                const clone: ElementType = {
                    id: newId(),
                    data: {
                        ...structuredClone(target.element.data),
                        x: target.element.data.x + 20,
                        y: target.element.data.y + 20,
                    } as ElementData,
                };
                plan.ops.push({ kind: "addElement", slideId: target.slideId, element: clone });
                plan.touched.add(clone.id);
            });
            plan.applied.push(action.type);
            return;
        }

        /* ---------- SLIDES ---------- */
        case "DUPLICATE_SLIDE": {
            const [slide] = resolveSlides(action);
            const { slides } = useEditorStore.getState();
            const index = slides.indexOf(slide);
            const clone: SlideType = {
                ...structuredClone(slide),
                id: newId(),
                elements: slide.elements.map((element) => ({
                    id: newId(),
                    data: structuredClone(element.data),
                })),
            };
            plan.ops.push({ kind: "insertSlide", slide: clone, atIndex: index + 1 });
            plan.ops.push({ kind: "setActiveSlide", index: index + 1 });
            plan.applied.push(action.type);
            return;
        }

        case "DELETE_SLIDE": {
            const { slides } = useEditorStore.getState();
            if (slides.length <= 1) return skip("this is the only page, so I can't delete it");
            const [slide] = resolveSlides(action);
            plan.ops.push({ kind: "removeSlide", slideId: slide.id });
            plan.applied.push(action.type);
            return;
        }

        case "ADD_SLIDE": {
            const { slides, activeSlide } = useEditorStore.getState();
            const index = clamp(activeSlide, 0, slides.length - 1);
            plan.ops.push({ kind: "insertSlide", slide: blankSlideLike(slides[index]), atIndex: index + 1 });
            plan.ops.push({ kind: "setActiveSlide", index: index + 1 });
            plan.applied.push(action.type);
            return;
        }

        case "GENERATE_SLIDE":
        case "REGENERATE_SLIDE": {
            const prompt = action.prompt ?? "";
            const wantsNewSlide = action.mode === "new_slide" && action.type === "GENERATE_SLIDE";
            plan.generators.push(async () => {
                const store = useEditorStore.getState();
                const index = clamp(store.activeSlide, 0, store.slides.length - 1);
                const baseSlide = store.slides[index];
                const content = await generateSlideContent(prompt, baseSlide);
                if (wantsNewSlide) {
                    const blank = blankSlideLike(baseSlide);
                    store.applyAIEdits([
                        { kind: "insertSlide", slide: blank, atIndex: index + 1 },
                        { kind: "setActiveSlide", index: index + 1 },
                    ]);
                    useEditorStore.getState().slideUpdateAI(blank.id, content);
                    scrollCanvasToSlide(index + 1);
                } else {
                    store.slideUpdateAI(baseSlide.id, content);
                }
            });
            plan.applied.push(action.type);
            return;
        }

        default:
            plan.skipped.push({ type: action.type, reason: "that edit isn't supported yet" });
            return;
    }
};

/* ==================== PUBLIC API ==================== */

const summarize = (modelMessage: string, plan: Plan): string => {
    const base = modelMessage.trim();
    const notes = Array.from(new Set(plan.notes));
    if (base && notes.length) return `${base} (${notes.join("; ")})`;
    if (base) return base;
    if (plan.applied.length) return `Applied ${plan.applied.length} change${plan.applied.length === 1 ? "" : "s"}.`;
    return "Nothing to change.";
};

/**
 * Runs validated actions against the editor.
 *
 * Everything async (image lookups, slide generation) resolves first, then all
 * document mutations are handed to `applyAIEdits` in one batch — so a compound
 * command is atomic and undoes in a single step.
 */
export const executeAIActions = async (
    actions: AIAction[],
    ctx: CopilotContext,
    options: { modelMessage?: string; confirmed?: boolean } = {},
): Promise<ExecutionResult> => {
    if (!actions.length) {
        return {
            outcome: "rejected",
            message: options.modelMessage || "I couldn't work out what to change.",
            appliedActions: [],
            skipped: [],
            touchedElementIds: [],
        };
    }

    // Destructive work asks first, unless the user already said yes.
    if (!options.confirmed) {
        const risky = actions.filter(isDestructive);
        if (risky.length) {
            const question =
                risky.some((action) => action.type === "DELETE_SLIDE")
                    ? "Delete this page?"
                    : "Regenerate this page from scratch? Its current content will be replaced.";
            return {
                outcome: "clarify",
                message: question,
                appliedActions: [],
                skipped: [],
                touchedElementIds: [],
                confirmation: { question, actions },
            };
        }
    }

    const plan = emptyPlan();

    for (const action of actions) {
        try {
            await planAction(action, ctx, plan);
        } catch (error) {
            console.error("AI action failed:", action, error);
            plan.skipped.push({ type: action.type, reason: "something went wrong while applying that" });
        }
    }

    if (plan.ops.length) {
        useEditorStore.getState().applyAIEdits(plan.ops);
    }

    for (const generator of plan.generators) {
        try {
            await generator();
        } catch (error) {
            console.error("AI slide generation failed:", error);
            plan.skipped.push({ type: "GENERATE_SLIDE", reason: "slide generation failed" });
            plan.applied.pop();
        }
    }

    const touchedElementIds = Array.from(plan.touched);

    if (!plan.applied.length) {
        const reason = plan.skipped[0]?.reason;
        return {
            outcome: plan.skipped.length ? "rejected" : "error",
            message: reason
                ? `I couldn't do that — ${reason}. Try selecting the element first, or describe it (for example "the image on the right").`
                : "I couldn't apply that change.",
            appliedActions: [],
            skipped: plan.skipped,
            touchedElementIds: [],
        };
    }

    return {
        outcome: "applied",
        message: summarize(options.modelMessage ?? "", plan),
        appliedActions: plan.applied,
        skipped: plan.skipped,
        touchedElementIds,
    };
};
