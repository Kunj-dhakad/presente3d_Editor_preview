/**
 * Contract between the AI planner (server) and the editor executor (client).
 *
 * The model only ever emits data in these shapes — never code, never editor
 * state. `lib/ai/actions/validate` rejects anything else, and
 * `lib/ai/executor/executeActions` is the only thing that can touch the store.
 */

/* ==================== INTENTS ==================== */

export const INTENTS = [
    "GENERATE_SLIDE",
    "EDIT_ELEMENT",
    "EDIT_SLIDE",
    "EDIT_PRESENTATION",
    "STYLE_SLIDE",
    "STYLE_PRESENTATION",
    "REWRITE_CONTENT",
    "TRANSLATE_CONTENT",
    "IMAGE_OPERATION",
    "LAYOUT_OPERATION",
    "DELETE_OPERATION",
    "ADD_ELEMENT",
    "REGENERATE",
    "CLARIFY",
    "CHAT",
] as const;
export type Intent = (typeof INTENTS)[number];

/* ==================== SEMANTIC ROLES ==================== */

export const ELEMENT_ROLES = [
    "title",
    "heading",
    "subtitle",
    "body",
    "caption",
    "index",
    "image",
    "hero_image",
    "logo",
    "video",
    "button",
    "interaction",
    "card",
    "shape",
    "table",
    "chart",
    "watermark",
    "decorative",
] as const;
export type ElementRole = (typeof ELEMENT_ROLES)[number];

/* ==================== TARGETING ==================== */

export type TargetScope = "selection" | "slide" | "presentation";

/**
 * How an action names what it applies to. The planner is given real element ids
 * so it normally fills `ids`; roles/types/scope cover presentation-wide work
 * ("all headings") without listing every id.
 */
export type AITarget = {
    ids?: string[];
    roles?: ElementRole[];
    types?: string[];
    scope?: TargetScope;
    /** Explicit opt-in required before a destructive action may hit many elements. */
    allowMultiple?: boolean;
};

/* ==================== ACTIONS ==================== */

export const AI_ACTION_TYPES = [
    "UPDATE_TEXT",
    "REPLACE_TEXT",
    "REWRITE_TEXT",
    "UPDATE_FONT",
    "UPDATE_FONT_SIZE",
    "UPDATE_FONT_WEIGHT",
    "UPDATE_TEXT_COLOR",
    "UPDATE_TEXT_ALIGNMENT",
    "UPDATE_LINE_HEIGHT",
    "UPDATE_LETTER_SPACING",
    "UPDATE_BACKGROUND_COLOR",
    "UPDATE_BACKGROUND_IMAGE",
    "REPLACE_IMAGE",
    "REMOVE_IMAGE",
    "ADD_IMAGE",
    "MOVE_ELEMENT",
    "RESIZE_ELEMENT",
    "ROTATE_ELEMENT",
    "DELETE_ELEMENT",
    "DUPLICATE_ELEMENT",
    "ADD_TEXT",
    "ADD_SHAPE",
    "UPDATE_SHAPE_COLOR",
    "UPDATE_BORDER",
    "UPDATE_OPACITY",
    "ALIGN_ELEMENTS",
    "DISTRIBUTE_ELEMENTS",
    "GROUP_ELEMENTS",
    "UNGROUP_ELEMENTS",
    "CHANGE_THEME",
    "CHANGE_ACCENT_COLOR",
    "APPLY_STYLE",
    "REWRITE_SLIDE",
    "TRANSLATE_SLIDE",
    "REORDER_ELEMENTS",
    "DUPLICATE_SLIDE",
    "DELETE_SLIDE",
    "ADD_SLIDE",
    "REGENERATE_IMAGE",
    "REGENERATE_SLIDE",
    "GENERATE_SLIDE",
] as const;
export type AIActionType = (typeof AI_ACTION_TYPES)[number];

/** Text replacement carried by REWRITE_SLIDE / TRANSLATE_SLIDE. */
export type TextEdit = { targetId: string; value: string };

/** Palette a design-level action may apply. All fields optional. */
export type ThemePatch = {
    background?: string;
    text?: string;
    heading?: string;
    accent?: string;
    cardBackground?: string;
};

export type AIAction = {
    type: AIActionType;
    target?: AITarget;
    slideId?: string;

    /** Primary value: text, colour, font family, alignment, url, … */
    value?: string | number;
    /** Relative change (font size steps, nudges, rotation). */
    delta?: number;
    /** Multiplier for size changes ("20% bigger" → 1.2). */
    scale?: number;

    x?: number;
    y?: number;
    width?: number;
    height?: number;
    position?: "left" | "right" | "top" | "bottom" | "center";

    /** Image sourcing. */
    query?: string;
    url?: string;
    source?: "search" | "generate";

    /** Text search/replace for REPLACE_TEXT. */
    find?: string;

    /** Per-element text for REWRITE_SLIDE / TRANSLATE_SLIDE. */
    texts?: TextEdit[];

    /** ALIGN_ELEMENTS / DISTRIBUTE_ELEMENTS. */
    axis?: "left" | "center" | "right" | "top" | "middle" | "bottom" | "horizontal" | "vertical";
    relativeTo?: "slide" | "selection";
    gap?: number;

    /** UPDATE_BORDER. */
    radius?: number;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: "none" | "solid" | "dashed" | "dotted";

    /** CHANGE_THEME. */
    theme?: ThemePatch;

    /** APPLY_STYLE — validated against a property whitelist. */
    style?: Record<string, string | number | boolean>;

    /** REORDER_ELEMENTS. */
    to?: "front" | "back" | "forward" | "backward";

    /** GENERATE_SLIDE / REGENERATE_SLIDE. */
    prompt?: string;
    mode?: "replace_current" | "new_slide";
};

/* ==================== MODEL RESPONSE ==================== */

export type CopilotResponse = {
    intent: Intent;
    message: string;
    /** Set instead of actions when the request is ambiguous. */
    clarification?: string;
    actions: AIAction[];
};

/* ==================== EXECUTION ==================== */

export type ExecutionOutcome = "applied" | "clarify" | "rejected" | "error";

export type ExecutionResult = {
    outcome: ExecutionOutcome;
    /** Sentence shown in the chat. Never raw JSON. */
    message: string;
    /** Applied action types, for the debug log. */
    appliedActions: AIActionType[];
    /** Actions understood but not supported yet / unsafe, with reasons. */
    skipped: { type: string; reason: string }[];
    /** Element ids the command touched — resolves "make it bigger" next turn. */
    touchedElementIds: string[];
    /** Set when the command needs a yes/no before it can run. */
    confirmation?: { question: string; actions: AIAction[] };
};

/* ==================== CONTEXT ==================== */

export type ContextElement = {
    id: string;
    type: string;
    role: ElementRole;
    /** Ordinal within the same role, 1-based: "the second card". */
    roleIndex: number;
    /** Reading-order position, e.g. "left/top". */
    side: "left" | "center" | "right";
    band: "top" | "middle" | "bottom";
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    src?: string;
    style?: Record<string, string | number>;
    layer: number;
};

export type SlideContext = {
    slideId: string;
    index: number;
    width: number;
    height: number;
    background: string;
    elements: ContextElement[];
};

export type PresentationContext = {
    slideCount: number;
    activeSlideIndex: number;
    /** Compact per-slide digest so presentation-wide asks are groundable. */
    slides: { slideId: string; index: number; background: string; roles: string[] }[];
    design: {
        fonts: string[];
        headingFont?: string;
        bodyFont?: string;
        textColors: string[];
        backgrounds: string[];
        accentColors: string[];
        borderRadius?: number;
    };
};

export type CopilotContext = {
    slide: SlideContext;
    presentation: PresentationContext;
    selection: { ids: string[]; elements: ContextElement[] };
    /** Elements the previous command touched, for "it"/"that" follow-ups. */
    lastTouchedIds: string[];
    availableFonts: string[];
};

export type ChatTurn = { role: "user" | "assistant"; content: string };
