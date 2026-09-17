import { resolveFontFamily } from "@shared/fonts/fonts";
import {
    AI_ACTION_TYPES,
    ELEMENT_ROLES,
    INTENTS,
    type AIAction,
    type AIActionType,
    type CopilotResponse,
    type ElementRole,
    type Intent,
} from "../types";
import { normalizeColor } from "./colors";

/* ==================== LIMITS ==================== */

export const LIMITS = {
    fontSize: { min: 6, max: 400 },
    lineHeight: { min: 0.7, max: 4 },
    letterSpacing: { min: -10, max: 60 },
    opacity: { min: 0, max: 1 },
    rotation: { min: -360, max: 360 },
    scale: { min: 0.2, max: 6 },
    radius: { min: 0, max: 400 },
    borderWidth: { min: 0, max: 40 },
    textLength: 4000,
};

/** Style keys APPLY_STYLE may write. Anything else is dropped. */
export const ALLOWED_STYLE_KEYS = new Set([
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "color", "backgroundColor",
    "textAlign", "align", "lineHeight", "letterSpacing", "textTransform", "textDecoration",
    "opacity", "borderRadius", "strokeWidth", "strokeColor", "strokeStyle",
    "fill", "textColor", "borderColor", "borderWidth", "rotation",
]);

/** Actions that need a confirmation step before they run. */
const DESTRUCTIVE_TYPES = new Set<AIActionType>([
    "DELETE_SLIDE",
    "REGENERATE_SLIDE",
]);

/** Actions that must never silently hit several elements at once. */
const SINGLE_TARGET_TYPES = new Set<AIActionType>([
    "DELETE_ELEMENT",
    "REMOVE_IMAGE",
    "REPLACE_IMAGE",
    "REGENERATE_IMAGE",
    "DUPLICATE_ELEMENT",
]);

/** Understood, but the editor has no model for them yet. */
const UNSUPPORTED_TYPES: Partial<Record<AIActionType, string>> = {
    GROUP_ELEMENTS: "the editor has no element grouping yet",
    UNGROUP_ELEMENTS: "the editor has no element grouping yet",
};

export const isDestructive = (action: AIAction) => DESTRUCTIVE_TYPES.has(action.type);
export const needsSingleTarget = (action: AIAction) => SINGLE_TARGET_TYPES.has(action.type);
export const unsupportedReason = (action: AIAction) => UNSUPPORTED_TYPES[action.type];

/* ==================== NORMALISATION ==================== */

const asNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = parseFloat(value.replace(/[^\d.+-]/g, ""));
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const clampTo = (value: number, range: { min: number; max: number }) =>
    Math.min(range.max, Math.max(range.min, value));

const asStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const list = value.filter((item): item is string => typeof item === "string" && !!item.trim());
    return list.length ? list : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

export type ValidationIssue = { type: string; reason: string };

/**
 * Coerces one raw action from the model into a safe, typed action. Returns the
 * reason instead when it cannot be made safe — callers surface that to the user
 * rather than executing a half-understood command.
 */
const validateAction = (raw: unknown): { action: AIAction } | { issue: ValidationIssue } => {
    if (!isRecord(raw) || typeof raw.type !== "string") {
        return { issue: { type: "unknown", reason: "action had no type" } };
    }

    const type = raw.type.toUpperCase() as AIActionType;
    if (!(AI_ACTION_TYPES as readonly string[]).includes(type)) {
        return { issue: { type: raw.type, reason: "unsupported action type" } };
    }

    const action: AIAction = { type };

    /* -------- targeting -------- */
    if (isRecord(raw.target)) {
        const target = raw.target;
        // Roles arrive as free-form strings; keep only ones the context uses.
        const roles = (asStringArray(target.roles) ?? []).filter((role): role is ElementRole =>
            (ELEMENT_ROLES as readonly string[]).includes(role),
        );
        action.target = {
            ids: asStringArray(target.ids),
            roles: roles.length ? roles : undefined,
            types: asStringArray(target.types),
            scope:
                target.scope === "selection" || target.scope === "slide" || target.scope === "presentation"
                    ? target.scope
                    : undefined,
            allowMultiple: target.allowMultiple === true,
        };
    }
    if (typeof raw.slideId === "string") action.slideId = raw.slideId;

    /* -------- geometry / numbers -------- */
    const delta = asNumber(raw.delta);
    if (delta !== undefined) action.delta = delta;
    const scale = asNumber(raw.scale);
    if (scale !== undefined) action.scale = clampTo(scale, LIMITS.scale);
    (["x", "y", "width", "height", "gap"] as const).forEach((key) => {
        const value = asNumber(raw[key]);
        if (value !== undefined) action[key] = value;
    });
    if (raw.position === "left" || raw.position === "right" || raw.position === "top" || raw.position === "bottom" || raw.position === "center") {
        action.position = raw.position;
    }

    /* -------- strings -------- */
    (["query", "url", "find", "prompt"] as const).forEach((key) => {
        if (typeof raw[key] === "string" && raw[key]) action[key] = (raw[key] as string).slice(0, 600);
    });
    if (raw.source === "search" || raw.source === "generate") action.source = raw.source;
    if (raw.mode === "replace_current" || raw.mode === "new_slide") action.mode = raw.mode;
    if (raw.to === "front" || raw.to === "back" || raw.to === "forward" || raw.to === "backward") action.to = raw.to;
    if (typeof raw.axis === "string") action.axis = raw.axis.toLowerCase() as AIAction["axis"];
    if (raw.relativeTo === "slide" || raw.relativeTo === "selection") action.relativeTo = raw.relativeTo;

    /* -------- per-type value handling -------- */
    switch (type) {
        case "UPDATE_TEXT":
        case "REPLACE_TEXT":
        case "REWRITE_TEXT": {
            if (typeof raw.value !== "string" || !raw.value.trim()) {
                return { issue: { type, reason: "no replacement text was provided" } };
            }
            action.value = raw.value.slice(0, LIMITS.textLength);
            break;
        }
        case "UPDATE_FONT": {
            const requested = typeof raw.value === "string" ? raw.value : "";
            const resolved = resolveFontFamily(requested);
            if (!resolved) {
                return { issue: { type, reason: `the font "${requested || "unknown"}" isn't available in this editor` } };
            }
            action.value = resolved;
            break;
        }
        case "UPDATE_FONT_SIZE": {
            const value = asNumber(raw.value);
            if (value !== undefined) action.value = clampTo(value, LIMITS.fontSize);
            if (action.value === undefined && action.delta === undefined && action.scale === undefined) {
                return { issue: { type, reason: "no font size, delta or scale was provided" } };
            }
            break;
        }
        case "UPDATE_FONT_WEIGHT": {
            const numeric = asNumber(raw.value);
            if (numeric !== undefined) {
                action.value = clampTo(Math.round(numeric / 100) * 100, { min: 100, max: 900 });
            } else if (typeof raw.value === "string") {
                const word = raw.value.toLowerCase();
                const map: Record<string, number> = {
                    thin: 200, light: 300, normal: 400, regular: 400,
                    medium: 500, semibold: 600, "semi-bold": 600, bold: 700,
                    extrabold: 800, "extra-bold": 800, black: 900,
                };
                if (map[word] === undefined) return { issue: { type, reason: `unknown font weight "${raw.value}"` } };
                action.value = map[word];
            } else {
                return { issue: { type, reason: "no font weight was provided" } };
            }
            break;
        }
        case "UPDATE_TEXT_COLOR":
        case "UPDATE_BACKGROUND_COLOR":
        case "UPDATE_SHAPE_COLOR":
        case "CHANGE_ACCENT_COLOR": {
            const color = normalizeColor(raw.value);
            if (!color) {
                return { issue: { type, reason: `"${String(raw.value ?? "")}" isn't a colour I can apply` } };
            }
            action.value = color;
            break;
        }
        case "UPDATE_TEXT_ALIGNMENT": {
            const value = typeof raw.value === "string" ? raw.value.toLowerCase() : "";
            if (!["left", "center", "right", "justify"].includes(value)) {
                return { issue: { type, reason: `"${value}" isn't a text alignment` } };
            }
            action.value = value;
            break;
        }
        case "UPDATE_LINE_HEIGHT": {
            const value = asNumber(raw.value);
            if (value === undefined) return { issue: { type, reason: "no line height was provided" } };
            action.value = clampTo(value, LIMITS.lineHeight);
            break;
        }
        case "UPDATE_LETTER_SPACING": {
            const value = asNumber(raw.value);
            if (value === undefined) return { issue: { type, reason: "no letter spacing was provided" } };
            action.value = clampTo(value, LIMITS.letterSpacing);
            break;
        }
        case "UPDATE_OPACITY": {
            let value = asNumber(raw.value);
            if (value === undefined) return { issue: { type, reason: "no opacity was provided" } };
            if (value > 1) value = value / 100;
            action.value = clampTo(value, LIMITS.opacity);
            break;
        }
        case "ROTATE_ELEMENT": {
            const value = asNumber(raw.value);
            if (value !== undefined) action.value = clampTo(value, LIMITS.rotation);
            if (action.value === undefined && action.delta === undefined) {
                return { issue: { type, reason: "no rotation was provided" } };
            }
            break;
        }
        case "UPDATE_BORDER": {
            const radius = asNumber(raw.radius);
            if (radius !== undefined) action.radius = clampTo(radius, LIMITS.radius);
            const borderWidth = asNumber(raw.borderWidth);
            if (borderWidth !== undefined) action.borderWidth = clampTo(borderWidth, LIMITS.borderWidth);
            if (typeof raw.borderColor === "string") {
                const color = normalizeColor(raw.borderColor);
                if (color) action.borderColor = color;
            }
            if (raw.borderStyle === "none" || raw.borderStyle === "solid" || raw.borderStyle === "dashed" || raw.borderStyle === "dotted") {
                action.borderStyle = raw.borderStyle;
            }
            if (
                action.radius === undefined && action.borderWidth === undefined &&
                action.borderColor === undefined && action.borderStyle === undefined
            ) {
                return { issue: { type, reason: "no border change was provided" } };
            }
            break;
        }
        case "UPDATE_BACKGROUND_IMAGE":
        case "REPLACE_IMAGE":
        case "ADD_IMAGE":
        case "REGENERATE_IMAGE": {
            if (!action.url && !action.query && !action.prompt) {
                return { issue: { type, reason: "no image description or URL was provided" } };
            }
            if (action.url && !/^https?:\/\//i.test(action.url) && !action.url.startsWith("data:image/")) {
                return { issue: { type, reason: "the image URL wasn't valid" } };
            }
            break;
        }
        case "REWRITE_SLIDE":
        case "TRANSLATE_SLIDE": {
            const texts = Array.isArray(raw.texts)
                ? raw.texts
                    .filter(isRecord)
                    .filter((item) => typeof item.targetId === "string" && typeof item.value === "string")
                    .map((item) => ({
                        targetId: item.targetId as string,
                        value: (item.value as string).slice(0, LIMITS.textLength),
                    }))
                : [];
            if (!texts.length) return { issue: { type, reason: "no rewritten text was provided" } };
            action.texts = texts;
            break;
        }
        case "CHANGE_THEME": {
            if (!isRecord(raw.theme)) return { issue: { type, reason: "no palette was provided" } };
            const theme: NonNullable<AIAction["theme"]> = {};
            (["background", "text", "heading", "accent", "cardBackground"] as const).forEach((key) => {
                const color = normalizeColor(raw.theme && (raw.theme as Record<string, unknown>)[key]);
                if (color) theme[key] = color;
            });
            if (!Object.keys(theme).length) return { issue: { type, reason: "the palette had no usable colours" } };
            action.theme = theme;
            break;
        }
        case "APPLY_STYLE": {
            if (!isRecord(raw.style)) return { issue: { type, reason: "no style was provided" } };
            const style: NonNullable<AIAction["style"]> = {};
            Object.entries(raw.style).forEach(([key, value]) => {
                if (!ALLOWED_STYLE_KEYS.has(key)) return;
                if (typeof value === "number" || typeof value === "boolean") {
                    style[key] = value;
                    return;
                }
                if (typeof value !== "string") return;
                if (key === "color" || key === "backgroundColor" || key === "fill" || key === "textColor" || key === "strokeColor" || key === "borderColor") {
                    const color = normalizeColor(value);
                    if (color) style[key] = color;
                    return;
                }
                if (key === "fontFamily") {
                    const font = resolveFontFamily(value);
                    if (font) style[key] = font;
                    return;
                }
                style[key] = value;
            });
            if (!Object.keys(style).length) {
                return { issue: { type, reason: "none of those style properties are editable" } };
            }
            action.style = style;
            break;
        }
        case "ADD_TEXT": {
            if (typeof raw.value !== "string" || !raw.value.trim()) {
                return { issue: { type, reason: "no text to add was provided" } };
            }
            action.value = raw.value.slice(0, LIMITS.textLength);
            break;
        }
        case "ADD_SHAPE": {
            const color = normalizeColor(raw.value);
            action.value = color ?? "#e5e7eb";
            break;
        }
        case "ALIGN_ELEMENTS": {
            if (!action.axis || !["left", "center", "right", "top", "middle", "bottom"].includes(action.axis)) {
                return { issue: { type, reason: "no alignment axis was provided" } };
            }
            break;
        }
        case "DISTRIBUTE_ELEMENTS": {
            if (action.axis !== "horizontal" && action.axis !== "vertical") {
                return { issue: { type, reason: "distribute needs a horizontal or vertical axis" } };
            }
            break;
        }
        case "RESIZE_ELEMENT": {
            if (action.scale === undefined && action.width === undefined && action.height === undefined) {
                return { issue: { type, reason: "no size change was provided" } };
            }
            break;
        }
        case "MOVE_ELEMENT": {
            if (
                action.x === undefined && action.y === undefined &&
                action.delta === undefined && !action.position
            ) {
                return { issue: { type, reason: "no destination was provided" } };
            }
            break;
        }
        case "GENERATE_SLIDE":
        case "REGENERATE_SLIDE": {
            if (!action.prompt) {
                if (typeof raw.value === "string" && raw.value.trim()) action.prompt = raw.value.slice(0, 600);
                else return { issue: { type, reason: "no description for the new slide was provided" } };
            }
            break;
        }
        default:
            break;
    }

    return { action };
};

/* ==================== RESPONSE VALIDATION ==================== */

export type ValidatedResponse = {
    intent: Intent;
    message: string;
    clarification?: string;
    actions: AIAction[];
    issues: ValidationIssue[];
};

/** Validates a whole model response. Never throws. */
export const validateCopilotResponse = (raw: unknown): ValidatedResponse => {
    const record = isRecord(raw) ? raw : {};
    const intentRaw = typeof record.intent === "string" ? record.intent.toUpperCase() : "";
    const intent = ((INTENTS as readonly string[]).includes(intentRaw) ? intentRaw : "CHAT") as Intent;

    const actions: AIAction[] = [];
    const issues: ValidationIssue[] = [];

    const rawActions = Array.isArray(record.actions) ? record.actions.slice(0, 40) : [];
    rawActions.forEach((rawAction) => {
        const result = validateAction(rawAction);
        if ("action" in result) actions.push(result.action);
        else issues.push(result.issue);
    });

    const response: ValidatedResponse = {
        intent,
        message: typeof record.message === "string" ? record.message.slice(0, 400) : "",
        actions,
        issues,
    };
    if (typeof record.clarification === "string" && record.clarification.trim()) {
        response.clarification = record.clarification.slice(0, 400);
    }
    return response;
};

export type { CopilotResponse };
