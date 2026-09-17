import useEditorStore, { type ElementData, type ElementType } from "@editor/store/editorStore";
import type { TemplateSlide } from "./types";

/* ==================== CONSTANTS ==================== */

const DEFAULT_SLIDE_WIDTH = 853.33;
const DEFAULT_SLIDE_HEIGHT = 480;
const DEFAULT_SLIDE_BACKGROUND = "#ffffff";

/** Copy shown when the JSON could not be fetched or parsed. */
export const TEMPLATE_LOAD_ERROR_MESSAGE = "Unable to load template preview.";
/** Copy shown when the JSON loaded but carries nothing renderable. */
export const TEMPLATE_EMPTY_MESSAGE = "No preview available for this template.";

const generateId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

/* ==================== PARSING ==================== */

/**
 * Some templates are stored double-encoded (a JSON string inside a JSON body),
 * which the previous inline loaders already had to unwrap.
 */
const unwrapJson = (raw: unknown): unknown => {
    let value = raw;
    for (let depth = 0; depth < 3 && typeof value === "string"; depth += 1) {
        try {
            value = JSON.parse(value);
        } catch {
            break;
        }
    }
    return value;
};

/**
 * `{ slides: [...] }` is the shape the backend writes. A bare array and the
 * legacy `{ <presetName>: { slides: [...] } }` layout used by
 * `public/templates.json` are accepted too, so an older URL still previews.
 */
const readRawSlides = (document: unknown): unknown[] | null => {
    if (Array.isArray(document)) return document;
    if (!isRecord(document)) return null;
    if (Array.isArray(document.slides)) return document.slides;
    for (const value of Object.values(document)) {
        if (isRecord(value) && Array.isArray(value.slides)) return value.slides;
    }
    return null;
};

const normalizeElement = (raw: unknown): ElementType | null => {
    if (!isRecord(raw) || !isRecord(raw.data)) return null;
    // An element the renderer cannot dispatch on is dropped rather than left to
    // blow up mid-render.
    if (typeof raw.data.type !== "string") return null;

    const data = structuredClone(raw.data) as ElementData & { isDragging?: boolean };
    // Transient editing flag; never meaningful for a freshly imported element.
    delete data.isDragging;

    return { id: generateId(), data: data as ElementData };
};

const numberOr = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Turns raw template slides into editor slides: unknown fields are preserved
 * (spread first), ids are regenerated, and the handful of properties the canvas
 * relies on get defaults when the template omits them.
 */
export const normalizeTemplateSlides = (rawSlides: unknown[]): TemplateSlide[] => {
    const slides: TemplateSlide[] = [];

    rawSlides.forEach((raw) => {
        if (!isRecord(raw)) return;
        const rawElements = Array.isArray(raw.elements) ? raw.elements : [];
        const elements = rawElements
            .map(normalizeElement)
            .filter((element): element is ElementType => element !== null);

        slides.push({
            ...(raw as object),
            id: generateId(),
            width: numberOr(raw.width, DEFAULT_SLIDE_WIDTH),
            height: numberOr(raw.height, DEFAULT_SLIDE_HEIGHT),
            background:
                typeof raw.background === "string" && raw.background
                    ? raw.background
                    : DEFAULT_SLIDE_BACKGROUND,
            elements,
        });
    });

    return slides;
};

/** Parses a fetched template body. Returns `[]` when it holds no slides. */
export const parseTemplateDocument = (raw: unknown): TemplateSlide[] => {
    const rawSlides = readRawSlides(unwrapJson(raw));
    if (!rawSlides) return [];
    return normalizeTemplateSlides(rawSlides);
};

/* ==================== LOADING ==================== */

// Templates are immutable documents on S3, so re-opening the same preview in a
// session should not refetch. Keyed by the exact backend-provided URL.
const slideCache = new Map<string, TemplateSlide[]>();
const inFlight = new Map<string, Promise<TemplateSlide[]>>();

/**
 * Fetches + parses a template JSON URL. Use the URL exactly as the backend
 * returned it — it is already percent-encoded.
 *
 * Resolves with the parsed slides (possibly empty) or rejects when the document
 * cannot be fetched/parsed. The returned array is shared with the cache and must
 * be treated as read-only; `applyTemplateSlides` deep-clones before it writes.
 */
export const loadTemplateSlides = async (url: string): Promise<TemplateSlide[]> => {
    const cached = slideCache.get(url);
    if (cached) return cached;

    const pending = inFlight.get(url);
    if (pending) return pending;

    const request = (async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Template request failed: ${res.status}`);
        const slides = parseTemplateDocument(await res.json());
        slideCache.set(url, slides);
        return slides;
    })();

    inFlight.set(url, request);
    try {
        return await request;
    } finally {
        inFlight.delete(url);
    }
};

/* ==================== APPLYING ==================== */

/**
 * The one way template slides reach the editor. `applyFullTemplate` mints fresh
 * slide/element ids and deep-clones the data, so the same call serves "Apply
 * all", "Apply selected" and the LOAD_TEMPLATE handoff.
 */
export const applyTemplateSlides = (
    slides: readonly TemplateSlide[],
    options?: { history?: boolean },
): boolean => {
    if (!slides.length) return false;
    useEditorStore.getState().applyFullTemplate([...slides], options);
    return true;
};

/**
 * Replaces the page the user is on with a single template slide, leaving every
 * other page untouched. Reuses the store's `slideUpdateAI`, which already keeps
 * the page's position, mints fresh element ids and records history.
 *
 * The page keeps its own width/height: page size is a document-wide property
 * here, so one replaced page must not end up a different size from its
 * neighbours.
 */
export const applyTemplateSlideToActivePage = (slide: TemplateSlide): boolean => {
    const { slides, activeSlide, slideUpdateAI } = useEditorStore.getState();
    const target = slides[activeSlide];
    if (!target) return false;

    slideUpdateAI(target.id, {
        background: slide.background,
        subtitle_text: slide.subtitle_text,
        subtitle_json: slide.subtitle_json,
        subtitle_url: slide.subtitle_url,
        thumbnail: slide.thumbnail,
        // Cloned: the parsed template is cached and may be applied many times.
        elements: slide.elements.map((el) => structuredClone(el.data)),
    });
    return true;
};

/**
 * Fetch-and-apply used by the parent-window LOAD_TEMPLATE message. Kept
 * history-less so the initial handoff still lands as a fresh document.
 */
export const applyTemplateFromUrl = async (url: string): Promise<boolean> => {
    try {
        const slides = await loadTemplateSlides(url);
        if (!slides.length) {
            console.error("Invalid template structure", url);
            return false;
        }
        return applyTemplateSlides(slides);
    } catch (err) {
        console.error("Error loading template:", err);
        return false;
    }
};
