import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { getChapters } from "@editor/blocks/Index/lib/ChapterManager";
import { paginateBookIndex } from "@editor/blocks/Index/lib/BookIndexPaginator";

export type Transform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
};

export type Border = {
  stroke?: string;
  strokeWidth?: number;
  BorderborderRadius?: number;
};

export type Shadow = {
  offsetX?: number;
  offsetY?: number;
  Shadowblur?: number;
  color?: string;
};

export type TextData = Transform & Border & Shadow & {
  type: "text";
  bookRole?: "chapter" | "index";
  chapterSubtitle?: string;
  chapterAutoNumber?: boolean;
  tocTitle?: string;
  tocLeader?: string;
  tocPageAlignment?: "left" | "right";
  tocShowRanges?: boolean;
  tocSpacing?: number;
  tocIndent?: number;
  tocMarginTop?: number;
  tocMarginBottom?: number;
  tocStyle?: string;
  tocAccentColor?: string;
  indexRootId?: string;
  indexPage?: number;
  text: string;
  html?: string;
  listType?: "none" | "ul" | "ol" | "checklist";
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecorationLine?: string;
  isDragging?: boolean;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: "underline" | "line-through" | "none";
  fontStyle?: "normal" | "italic";
  link?: string;
};

export type ImageData = Transform & Border & Shadow & {
  type: "image";
  assetKind?: "image" | "gif" | "sticker";
  src: string;
  alt?: string;
  fit?: "cover" | "contain";
  maxWidth?: number;
  maxHeight?: number;
  objectFit?: string;
  contrast?: number;
  hueRotate?: number;
  saturate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  brightness?: number;
  borderRadius?: string;
  rotation?: number;
  transform?: string;
  isDragging?: boolean;
  animationType?: string;
  link?: string;
  flipX?: boolean;
  flipY?: boolean;
  cropRatio?: string;
  strokeStyle?: "none" | "solid" | "dashed" | "dotted" | "inset";
  strokeWidth?: number;
  strokeColor?: string;

};

export type VideoData = Transform & Border & Shadow & {
  type: "video";
  thumbnail?: string;
  src: string;
  alt?: string;
  fit?: "cover" | "contain";
  maxWidth?: number;
  maxHeight?: number;
  objectFit?: string;
  contrast?: number;
  hueRotate?: number;
  saturate?: number;
  rotation?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  brightness?: number;
  borderRadius?: string;
  transform?: string;
  isDragging?: boolean;
  animationType?: string;
  link?: string;
  flipX?: boolean;
  flipY?: boolean;
  cropRatio?: string;
  strokeStyle?: "none" | "solid" | "dashed" | "dotted" | "semi-dashed";
  strokeWidth?: number;
  strokeColor?: string;
};

/**
 * The four things a shape effect can be. Every preset — the named ones
 * included — is one of these with different numbers, so the renderer only ever
 * has four cases to handle.
 */
export type ShapeEffectType = "none" | "drop" | "glow" | "echo" | "glitch";

/**
 * A shape's shadow/glow treatment, in the same vocabulary the panel speaks.
 *
 * `offset` is a percentage of the shape's shorter side rather than a pixel
 * count, so an effect set on a small shape still reads the same after the
 * shape is scaled up — a fixed pixel offset would look like a hairline on a
 * big shape and a smear on a small one.
 */
export type ShapeEffect = {
  type: ShapeEffectType;
  /** Which named preset produced this, so the panel can highlight its tile. */
  preset?: string;
  /** Degrees, -180..180. Used by drop, echo and glitch. */
  direction?: number;
  /** 0..100, as a share of the shorter side. Used by drop, echo and glitch. */
  offset?: number;
  /** 0..100. Drop only. */
  blur?: number;
  /** 0..100. Drop only. */
  transparency?: number;
  /** 0..100. Glow only. */
  intensity?: number;
  color?: string;
};

export type ShapeData = Transform & Border & {
  type: "shape";
  shape?: string;
  fill?: string;
  color?: string;
  link?: string;
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
  opacity?: number;
  borderRadius?: string;
  strokeStyle?: "none" | "solid" | "dashed" | "dotted" | "inset";
  strokeWidth?: number;
  strokeColor?: string;
  /**
   * Gradient fill. Both ends have to be set for it to apply; with either one
   * missing the shape falls back to the flat `color`. Named the same as
   * ButtonData's so the two read alike.
   */
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal";
  effect?: ShapeEffect;
};

export type SVGData = Transform & Shadow & {
  type: "svg";
  src: string;
  alt?: string;
  fit?: "cover" | "contain";
  maxWidth?: number;
  maxHeight?: number;
  objectFit?: string;
  contrast?: number;
  hueRotate?: number;
  saturate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  brightness?: number;
  borderRadius?: string;
  rotation?: number;
  transform?: string;
  isDragging?: boolean;
  animationType?: string;
  link?: string;
  flipX?: boolean;
  flipY?: boolean;
  cropRatio?: string;
  strokeStyle?: "none" | "solid" | "dashed" | "dotted" | "inset";
  strokeWidth?: number;
  strokeColor?: string;
};

export type ButtonData = Transform & Border & Shadow & {
  type: "button";
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  gradientFrom?: string;
  gradientTo?: string;
  link?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal";
  icon?: string;
  iconPosition?: "left" | "right";
  buttonStyle?: string;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle?: "normal" | "italic";
  textDecorationLine?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  strokeStyle?: "none" | "solid" | "dashed" | "dotted" | "inset";
  shadowPreset?: "none" | "soft" | "regular" | "retro";
  opacity?: number;
};

export type WatermarkData = Transform & {
  type: "watermark";
  text: string;
  color: string;
  fontSize: number;
  pattern: "single" | "grid";
  font?: string;
  letterSpacing?: string;
  imageSrc?: string;
  scale?: string;
};

export type TableCell = {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
};

export type TableData = Transform & Border & Shadow & {
  type: "table";
  rows: number;
  columns: number;
  cells: TableCell[][];
  styleId?: string;
  style: {
    borderColor: string;
    borderWidth: number;
    background: string;
    cellBackground: string;
    padding: number;
    borderRadius?: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number | string;
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline";
    textColor: string;
    lineHeight: number;
    letterSpacing: number;
    textAlign: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
    headerRow?: boolean;
    headerBackground?: string;
    headerTextColor?: string;
    headerFontWeight?: number | string;
    bandedRows?: boolean;
    bandBackground?: string;
    cellSpacing?: number;
    cellRadius?: number;
    borderStyle?: "all" | "outer" | "horizontal" | "none";
  };
  locked?: boolean;
  hidden?: boolean;
};

export type ChartType = "bar" | "line" | "pie" | "doughnut" | "area" | "radar";
export type ChartPoint = { label: string; value: number };
export type ChartData = Transform & Border & Shadow & {
  type: "chart";
  chartType: ChartType;
  title: string;
  data: ChartPoint[];
  style: {
    primaryColor: string; secondaryColor: string; background: string; gridColor: string; axisColor: string;
    labelColor: string; legendColor: string; borderRadius: number; padding: number;
    showLegend: boolean; legendPosition: "top" | "bottom" | "left" | "right";
    showGrid: boolean; showLabels: boolean; showXAxis: boolean; showYAxis: boolean;
    fontSize: number; fontFamily: string; fontWeight: number | string;
    animation: boolean; animationDuration: number;
  };
  locked?: boolean;
  hidden?: boolean;
};

export type InteractionKind = "link-area" | "link-button" | "tag" | "caption" | "social" | "quiz" | "question" | "contact-form" | "embed-media" | "spotlight"
  | "video-button"
  | "audio-button"
  | "slideshow"
  | "popup-slideshow"
  | "nav-prev-page"
  | "nav-next-page"
  | "nav-goto-page"
  | "nav-first-page"
  | "nav-last-page"
  | "product-card"
  | "product-button"
  | "price-tag";

export type QuizOption = {
  id: string;
  text: string;
  correct?: boolean;
};

export type QuizQuestionItem = {
  id: string;
  question: string;
  multiple?: boolean;
  options: QuizOption[];
};

export type ContactFieldType = "text" | "email" | "tel" | "textarea";
export type ContactFormField = {
  id: string;
  label: string;
  type: ContactFieldType;
  placeholder?: string;
  required?: boolean;
};


export type InteractionData = Transform & Border & Shadow & Pick<ButtonData, "fontSize" | "fontFamily" | "fontWeight" | "backgroundColor" | "textColor" | "borderColor" | "borderWidth" | "borderRadius" | "gradientFrom" | "gradientTo" | "gradientDirection" | "icon" | "iconPosition" | "letterSpacing" | "textTransform" | "fontStyle" | "textDecorationLine" | "textAlign" | "strokeStyle" | "shadowPreset" | "opacity"> & {
  type: "interaction";
  interactionKind: InteractionKind;
  svg: string;
  text: string;
  link?: string;
  url?: string;
  tooltip?: string;
  target?: "_self" | "_blank" | "popup";
  platform?: string;
  expandedText?: string;
  iconColor?: string;
  hoverColor?: string;
  padding?: number;
  embedUrl?: string;
  provider?: string;
  renderMode?: "image" | "video" | "iframe" | "external";
  thumbnail?: string;
  autoplay?: boolean;
  controls?: boolean;
  allowFullscreen?: boolean;

  submitUrl?: string;

  // ===== Quiz =====
  quizTitle?: string;
  quizQuestions?: QuizQuestionItem[];

  // ===== Question =====
  questionTitle?: string;
  questionText?: string;
  questionPlaceholder?: string;

  // ===== Contact form =====
  contactFormTitle?: string;
  contactFormDescription?: string;
  contactFields?: ContactFormField[];
  privacyPolicyText?: string;
  privacyPolicyLink?: string;
  showMarketingOptIn?: boolean;
  marketingOptInText?: string;

  // ===== Spotlight =====
  spotlightTitle?: string;
  spotlightContent?: string;
  spotlightImageUrl?: string;

  // ===== Video / Audio button =====
  videoUrl?: string;
  audioUrl?: string;

  // ===== Slideshow =====
  slideshowImages?: string[];
  slideshowInterval?: number;

  // ===== Navigation =====
  navTargetPage?: number;

  // ===== Shop =====
  productName?: string;
  productPrice?: string;
  productImageUrl?: string;
};
export const isInteractionData = (data: ElementData): data is InteractionData =>
  data.type === "interaction";

export const isButtonLikeData = (data: ElementData): data is ButtonData | InteractionData =>
  data.type === "button" || isInteractionData(data);


export type FrameData = Transform & Border & Shadow & {
  type: "frame";
  frameShape: string;
  imageSrc?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  backgroundColor?: string;
  link?: string;
};


export type QRCodeData = Transform & Border & Shadow & {
  type: "qr-code";
  content: string;
  foreground?: string;
  background?: string;
  ecLevel?: "L" | "M" | "Q" | "H";
  link?: string;
  /** Opens the book itself when it is read online (see useQrTarget). */
  bookLink?: boolean;
};

export type ElementData = TextData | ImageData | ShapeData | SVGData | ButtonData | VideoData | WatermarkData | TableData | ChartData | InteractionData | FrameData | QRCodeData;

export type ElementType = {
  id: string;
  data: ElementData;
};

type ElementClipboard = {
  elements: ElementType[];
};

const MULTI_STYLE_BLOCKED_PATCH_KEYS = new Set([
  "x",
  "y",
  "width",
  "height",
  "zIndex",
  "text",
  "html",
  "src",
  "thumbnail",
  "alt",
  "link",
  "imageSrc",
  "pattern",
  "scale",
]);

const isMultiStylePatch = (patch: Partial<ElementData>) =>
  Object.keys(patch).every((key) => !MULTI_STYLE_BLOCKED_PATCH_KEYS.has(key));

/**
 * Page par text ka default rang.
 *
 * Ye explicit rakhna zaroori hai. Pehle presets me `color` tha hi nahi, to
 * inline style se `color` gir jaata tha aur text app ki theme ka rang inherit
 * kar leta tha — dark mode me safed page par halka grey (1.3:1 contrast), aur
 * wahi rang PNG export me bhi chala jaata tha. Page surface theme ke saath
 * nahi badalta, isliye uske upar ka text bhi theme token se nahi aa sakta.
 */
export const DEFAULT_TEXT_COLOR = "#1a1a1a";

export type SlideType = {
  id: string;
  height?: number;
  width?: number;
  background?: string;
  subtitle_url?: string;
  subtitle_text?: string;
  subtitle_json?: string;
  thumbnail?: string;
  elements: ElementType[];
};


export type AIEditOp =
  | { kind: "updateElement"; slideId: string; elementId: string; patch: Partial<ElementData> }
  | { kind: "addElement"; slideId: string; element: ElementType }
  | { kind: "removeElement"; slideId: string; elementId: string }
  | { kind: "moveElementLayer"; slideId: string; elementId: string; to: "front" | "back" | "forward" | "backward" }
  | { kind: "updateSlide"; slideId: string; patch: Partial<Pick<SlideType, "background" | "width" | "height" | "subtitle_text">> }
  | { kind: "insertSlide"; slide: SlideType; atIndex: number }
  | { kind: "removeSlide"; slideId: string }
  | { kind: "setActiveSlide"; index: number }
  | { kind: "setSelection"; elementIds: string[] };

export type SlideTemplate = {
  background?: string;
  elements: { id: string; data: ElementData }[];
};

export type AISlideData = {
  background?: string;
  width?: number;
  height?: number;
  subtitle_text?: string;
  subtitle_json?: string;
  subtitle_url?: string;
  thumbnail?: string;
  elements: ElementData[];
};

interface EditorStore {
  slides: SlideType[];
  activeSlide: number;
  activeElementId: string | null;
  selectedElementIds: string[];
  elementClipboard: ElementClipboard | null;
  activeRightPanel: string | null;
  past: SlideType[][];
  future: SlideType[][];

  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;

  addSlide: (afterSlideId?: string) => void;
  addSlideToEnd: () => void;
  deleteSlide: (slideId: string) => void;
  duplicateSlide: (slideId?: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  updateSlideBackground: (slideIndex: number, background: string) => void;
  updateSlidesBackground: (updates: { slideIndex: number; background: string }[]) => void;
  updateSlideSubtitle: (text: string) => void;
  slideUpdateAI: (slideId: string, aiData: AISlideData) => void;

  addElement: (el: ElementData) => void;
  updateElement: (elementId: string, patch: Partial<ElementData>, options?: { history?: boolean }) => void;

  nudgeElements: (elementIds: string[], dx: number, dy: number, options?: { history?: boolean }) => void;
  updateChapterTitle: (chapterElementId: string, text: string) => void;
  applyCopiedStyle: (targetElementIds: string[], styleProperties: Record<string, unknown>) => void;

  fillFrameWithImage: (frameId: string, src: string, consumeElementId?: string) => void;
  deleteElement: (elementId: string) => void;
  deleteElements: (elementIds: string[]) => void;
  duplicateElement: (elementId: string) => void;
  duplicateElements: (elementIds: string[]) => void;
  copySelectedElements: () => void;
  pasteElements: () => void;

  bringForward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendBackward: (id: string) => void;
  sendToBack: (id: string) => void;
  moveElementToIndex: (id: string, toIndex: number) => void;

  setActiveSlide: (index: number) => void;
  setActiveElementId: (id: string | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  toggleSelectedElementId: (id: string) => void;
  clearSelection: () => void;
  setActiveRightPanel: (p: string | null) => void;
  applyFullTemplate: (slides: SlideType[], options?: { history?: boolean }) => void;
  applyAIEdits: (ops: AIEditOp[]) => void;
  updateAllSlidesSize: (width: number, height: number) => void;
  syncBookIndex: (rootElementId: string) => void;


  insertSlideAtStart: (slide: SlideType) => void;
  insertSlideAtEnd: (slide: SlideType) => void;
  applyBookCovers: (front?: SlideType, back?: SlideType) => void;
}

const generateId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const cloneElement = (element: ElementType): ElementType =>
  structuredClone(element);

/* ==================== PLACEMENT ==================== */

/** Ek cascade step, pixels me — utna hi jitna dikhe ki neeche kuch aur hai. */
const CASCADE_STEP = 14;

/**
 * Har panel naya element page ke center par daalta hai, to paanch baar
 * "Add Body Text" dabane par paanchon bilkul ek doosre ke upar chadh jaate the
 * aur lagta tha button kaam hi nahi kar raha. Agar us jagah pehle se koi
 * element baitha hai to naye ko thoda niche-daayein khiska dete hain, page ke
 * andar rehte hue.
 */
const cascadePlacement = (slide: SlideType, el: ElementData): ElementData => {
  const maxX = Math.max(0, (slide.width ?? 0) - el.width);
  const maxY = Math.max(0, (slide.height ?? 0) - el.height);
  const occupied = (x: number, y: number) =>
    slide.elements.some(
      (item) => Math.abs(item.data.x - x) < 1 && Math.abs(item.data.y - y) < 1
    );

  let { x, y } = el;
  // Bounded loop: page ke kinare par pahunchte hi ruk jaate hain.
  for (let step = 0; step < 24 && occupied(x, y); step += 1) {
    const nextX = Math.min(x + CASCADE_STEP, maxX);
    const nextY = Math.min(y + CASCADE_STEP, maxY);
    if (nextX === x && nextY === y) break;
    x = nextX;
    y = nextY;
  }

  return x === el.x && y === el.y ? el : { ...el, x, y };
};

const remapCopiedReferences = (value: unknown, idMap: Map<string, string>): unknown => {
  if (typeof value === "string") return idMap.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => remapCopiedReferences(item, idMap));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, remapCopiedReferences(item, idMap)])
    );
  }
  return value;
};

/* ==================== PERSIST STORAGE ==================== */


const PERSIST_WRITE_DELAY_MS = 500;

const createDebouncedSessionStorage = <T,>(): PersistStorage<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { name: string; value: StorageValue<T> } | null = null;
  let listenersAttached = false;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const { name, value } = pending;
    pending = null;
    try {
      sessionStorage.setItem(name, JSON.stringify(value));
    } catch {
      // sessionStorage may be unavailable (SSR, private mode) or over quota.
    }
  };

  const attachFlushListeners = () => {
    if (listenersAttached || typeof window === "undefined") return;
    listenersAttached = true;
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  };

  return {
    getItem: (name) => {
      try {
        const stored = sessionStorage.getItem(name);
        return stored ? (JSON.parse(stored) as StorageValue<T>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      attachFlushListeners();
      pending = { name, value };
      if (timer !== null) clearTimeout(timer);

      timer = setTimeout(() => {
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(flush, { timeout: PERSIST_WRITE_DELAY_MS });
        } else {
          flush();
        }
      }, PERSIST_WRITE_DELAY_MS);
    },
    removeItem: (name) => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      try {
        sessionStorage.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
};

const useEditorStore = create<EditorStore>()(
  persist(
    immer((set, get) => ({
      slides: [{
        id: "1", height: 480, width: 853.33, background: "#ffffff",
        subtitle_url: "", subtitle_text: "", subtitle_json: "", thumbnail: "", elements: [],
      }],
      activeSlide: 0,
      activeElementId: null,
      selectedElementIds: [],
      elementClipboard: null,
      activeRightPanel: "text",
      past: [],
      future: [],

      /* ==================== HISTORY ==================== */

      pushToHistory: () => {

        const snapshot = get().slides;
        set((state) => {
          state.past.push(snapshot);
          if (state.past.length > 15) state.past.shift();
          state.future = [];
        });
      },

      undo: () => {
        const past = get().past;
        if (past.length === 0) return;

        const currentSnapshot = get().slides;
        const previous = past[past.length - 1];
        set((state) => {
          state.future.unshift(currentSnapshot);
          if (state.future.length > 15) state.future.pop();
          state.slides = previous;
          state.past.pop();
        });
      },

      redo: () => {
        const future = get().future;
        if (future.length === 0) return;
        const currentSnapshot = get().slides;
        const next = future[0];
        set((state) => {
          state.past.push(currentSnapshot);
          if (state.past.length > 15) state.past.shift();
          state.slides = next;
          state.future.shift();
        });
      },

      /* ==================== SLIDES ==================== */

      updateAllSlidesSize: (width: number, height: number) => {
        get().pushToHistory();
        set((state) => { state.slides.forEach((s) => { s.width = width; s.height = height; }); });
      },

      syncBookIndex: (rootElementId: string) => {
        const state = get();
        const rootSlideIndex = state.slides.findIndex((slide) =>
          slide.elements.some((element) => element.id === rootElementId && (element.data as TextData).bookRole === "index" && !(element.data as TextData).indexRootId)
        );
        if (rootSlideIndex < 0) return;
        const rootSlide = state.slides[rootSlideIndex];
        const rootElement = rootSlide.elements.find((element) => element.id === rootElementId);
        if (!rootElement) return;
        const rootData = rootElement.data as TextData;
        const requiredPages = paginateBookIndex(getChapters(state.slides), rootData).length;
        const continuationIndices = state.slides
          .map((slide, index) => ({ slide, index }))
          .filter(({ slide }) => slide.elements.some((element) =>
            (element.data as TextData).bookRole === "index" && (element.data as TextData).indexRootId === rootElementId
          ))
          .map(({ index }) => index);
        const existing = continuationIndices.length;
        const neededContinuations = Math.max(0, requiredPages - 1);
        const isLinkedInOrder = existing === neededContinuations && continuationIndices.every((index, offset) => index === rootSlideIndex + offset + 1);
        if (isLinkedInOrder) return;
        set((draft) => {
          draft.slides = draft.slides.filter((slide) => !slide.elements.some((element) =>
            (element.data as TextData).bookRole === "index" && (element.data as TextData).indexRootId === rootElementId
          ));
          const rootPosition = draft.slides.findIndex((slide) => slide.id === rootSlide.id);
          if (rootPosition < 0) return;
          const additions: SlideType[] = Array.from({ length: neededContinuations }, (_, offset) => ({
            id: generateId(), height: rootSlide.height, width: rootSlide.width, background: rootSlide.background,
            subtitle_url: "", subtitle_text: "", subtitle_json: "", thumbnail: "",
            elements: [{ id: generateId(), data: { ...structuredClone(rootData), indexRootId: rootElementId, indexPage: offset + 1 } }],
          }));
          draft.slides.splice(rootPosition + 1, 0, ...additions);
        });
      },

      addSlide: (afterSlideId?: string) => {
        get().pushToHistory();
        set((state) => {
          const named = afterSlideId ? state.slides.findIndex((s) => s.id === afterSlideId) : -1;
          const at = named >= 0 ? named : state.activeSlide;
          const cur = state.slides[at];
          if (!cur) return;
          state.slides.splice(at + 1, 0, {
            id: generateId(), height: cur.height, width: cur.width, background: "#ffffff",
            subtitle_url: "", subtitle_text: "", subtitle_json: "", thumbnail: "", elements: [],
          });
          state.activeSlide = at + 1;
        });
      },

      addSlideToEnd: () => {
        get().pushToHistory();
        set((state) => {
          const last = state.slides[state.slides.length - 1];
          state.slides.push({
            id: generateId(), height: last.height, width: last.width, background: "#ffffff",
            subtitle_url: "", subtitle_text: "", subtitle_json: "", thumbnail: "", elements: [],
          });
          state.activeSlide = state.slides.length - 1;
        });
      },

      deleteSlide: (slideId: string) => {
        const currentSlides = get().slides;
        const index = currentSlides.findIndex((s) => s.id === slideId);
        if (index === -1) return;

        const activeIndex = get().activeSlide;
        const anchorId =
          activeIndex !== index && currentSlides[activeIndex]
            ? currentSlides[activeIndex].id
            : currentSlides[index - 1]?.id ?? currentSlides[index + 1]?.id;

        const rootIndexIds = currentSlides[index].elements
          .filter((element) => {
            const data = element.data as TextData;
            return data.bookRole === "index" && !data.indexRootId;
          })
          .map((element) => element.id);
        get().pushToHistory();
        set((state) => {
          state.slides.splice(index, 1);
          if (rootIndexIds.length) {
            state.slides = state.slides.filter((slide) => !slide.elements.some((element) => {
              const data = element.data as TextData;
              return data.bookRole === "index" && !!data.indexRootId && rootIndexIds.includes(data.indexRootId);
            }));
          }
          if (state.slides.length === 0) {
            state.slides = [{ id: generateId(), height: 434, width: 350, background: "#ffffff", elements: [] }];
            state.activeSlide = 0;
          } else {
            const anchorIndex = anchorId ? state.slides.findIndex((s) => s.id === anchorId) : -1;
            state.activeSlide =
              anchorIndex >= 0 ? anchorIndex : Math.min(index, state.slides.length - 1);
          }
          state.activeElementId = null;
          state.selectedElementIds = [];
        });
      },

      duplicateSlide: (slideId?: string) => {
        get().pushToHistory();
        set((state) => {
          const named = slideId ? state.slides.findIndex((s) => s.id === slideId) : -1;
          const at = named >= 0 ? named : state.activeSlide;
          const cur = state.slides[at];
          if (!cur) return;
          const newSlide: SlideType = {
            ...JSON.parse(JSON.stringify(cur)),
            id: generateId(),
            elements: cur.elements.map((el) => ({ id: generateId(), data: { ...el.data } })),
          };
          state.slides.splice(at + 1, 0, newSlide);
          state.activeSlide = at + 1;
          state.activeElementId = null;
          state.selectedElementIds = [];
        });
      },

      reorderSlides: (fromIndex: number, toIndex: number) => {
        get().pushToHistory();
        set((state) => {
          const [moved] = state.slides.splice(fromIndex, 1);
          state.slides.splice(toIndex, 0, moved);
        });
      },

      updateSlideBackground: (slideIndex: number, background: string) => {
        get().pushToHistory();
        set((state) => { if (state.slides[slideIndex]) state.slides[slideIndex].background = background; });
      },

      updateSlidesBackground: (updates) => {
        get().pushToHistory();
        set((state) => {
          for (const { slideIndex, background } of updates) {
            if (state.slides[slideIndex]) state.slides[slideIndex].background = background;
          }
        });
      },

      updateSlideSubtitle: (text: string) => {
        get().pushToHistory();
        set((state) => { if (state.slides[state.activeSlide]) state.slides[state.activeSlide].subtitle_text = text; });
      },

      slideUpdateAI: (slideId: string, aiData: AISlideData) => {
        get().pushToHistory();
        set((state) => {
          const slide = state.slides.find((s) => s.id === slideId);
          if (!slide) return;
          slide.background = aiData.background || slide.background;
          slide.subtitle_text = aiData.subtitle_text || slide.subtitle_text;
          slide.subtitle_json = aiData.subtitle_json || slide.subtitle_json;
          slide.subtitle_url = aiData.subtitle_url || slide.subtitle_url;
          slide.thumbnail = aiData.thumbnail || slide.thumbnail;
          slide.elements = aiData.elements.map((el) => ({ id: generateId(), data: el }));
        });
      },

      /* ==================== ELEMENTS ==================== */


      addElement: (el: ElementData) => {
        // History pehle push hoti hai, mutation ke baad nahi. Pehle ye
        // `setTimeout(..., 0)` me chalti thi, to snapshot me naya element
        // already baitha hota tha — undo usi state par lautta tha aur screen
        // par kuch nahi badalta tha. Baaki har action bhi pehle hi push karta hai.
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          slide.elements.push({ id: generateId(), data: cascadePlacement(slide, el) });
        });
      },


      updateElement: (elementId, patch, options) => {
        if (options?.history) {
          get().pushToHistory();
        }
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          const element = slide.elements.find((el) => el.id === elementId);
          if (!element) return;
          const selectedIds = state.selectedElementIds;
          const canApplyToSelection =
            selectedIds.length > 1 &&
            selectedIds.includes(elementId) &&
            isMultiStylePatch(patch);
          const selectedElements = canApplyToSelection
            ? slide.elements.filter((el) => selectedIds.includes(el.id))
            : [];
          const sameTypeSelection =
            selectedElements.length > 1 &&
            selectedElements.every((el) => el.data.type === element.data.type);
          const targets = sameTypeSelection ? selectedElements : [element];
          targets.forEach((target) => {
            Object.assign(target.data, patch);
          });
        });
      },


      nudgeElements: (elementIds, dx, dy, options) => {
        if (dx === 0 && dy === 0) return;
        const ids = new Set(elementIds);
        if (ids.size === 0) return;
        if (options?.history) get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          slide.elements.forEach((element) => {
            if (!ids.has(element.id)) return;
            element.data.x += dx;
            element.data.y += dy;
          });
        });
      },

      updateChapterTitle: (chapterElementId: string, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        get().pushToHistory();
        set((state) => {
          for (const slide of state.slides) {
            const element = slide.elements.find((el) => el.id === chapterElementId);
            if (element && element.data.type === "text" && (element.data as TextData).bookRole === "chapter") {
              (element.data as TextData).text = trimmed;
              break;
            }
          }
        });
      },

      fillFrameWithImage: (frameId, src, consumeElementId) => {
        if (!src) return;
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          const frame = slide.elements.find((el) => el.id === frameId);
          if (!frame || frame.data.type !== "frame") return;
          const data = frame.data as FrameData;
          data.imageSrc = src;
          data.imageScale = 1;
          data.imageOffsetX = 0;
          data.imageOffsetY = 0;
          if (consumeElementId) {
            const index = slide.elements.findIndex((el) => el.id === consumeElementId);
            if (index !== -1) slide.elements.splice(index, 1);
          }
          state.activeElementId = frameId;
          state.selectedElementIds = [frameId];
        });
      },

      deleteElement: (elementId: string) => {
        const selectedIds = get().selectedElementIds;
        if (selectedIds.length > 1 && selectedIds.includes(elementId)) {
          get().deleteElements(selectedIds);
          return;
        }
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          const index = slide.elements.findIndex((el) => el.id === elementId);
          if (index !== -1) {
            const removed = slide.elements[index].data as TextData;
            slide.elements.splice(index, 1);
            if (removed.bookRole === "index" && !removed.indexRootId) {
              state.slides = state.slides.filter((candidate) => !candidate.elements.some((el) =>
                (el.data as TextData).bookRole === "index" && (el.data as TextData).indexRootId === elementId
              ));
              state.activeSlide = Math.min(state.activeSlide, state.slides.length - 1);
            }
            state.selectedElementIds = state.selectedElementIds.filter((id) => id !== elementId);
            state.activeElementId = state.selectedElementIds[state.selectedElementIds.length - 1] ?? null;
          }
        });
      },

      deleteElements: (elementIds: string[]) => {
        const ids = Array.from(new Set(elementIds));
        if (!ids.length) return;
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          const roots = slide.elements
            .filter((el) => ids.includes(el.id))
            .filter((el) => {
              const data = el.data as TextData;
              return data.bookRole === "index" && !data.indexRootId;
            })
            .map((el) => el.id);
          slide.elements = slide.elements.filter((el) => !ids.includes(el.id));
          if (roots.length) {
            state.slides = state.slides.filter((candidate) => !candidate.elements.some((el) => {
              const data = el.data as TextData;
              return data.bookRole === "index" && !!data.indexRootId && roots.includes(data.indexRootId);
            }));
            state.activeSlide = Math.min(state.activeSlide, state.slides.length - 1);
          }
          state.selectedElementIds = state.selectedElementIds.filter((id) => !ids.includes(id));
          state.activeElementId = state.selectedElementIds[state.selectedElementIds.length - 1] ?? null;
        });
      },

      duplicateElement: (elementId: string) => {
        const selectedIds = get().selectedElementIds;
        if (selectedIds.length > 1 && selectedIds.includes(elementId)) {
          get().duplicateElements(selectedIds);
          return;
        }
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          const element = slide.elements.find((el) => el.id === elementId);
          if (!element) return;
          const newEl: ElementType = {
            id: generateId(),
            data: { ...element.data, x: element.data.x + 20, y: element.data.y + 20 },
          };
          slide.elements.push(newEl);
          state.activeElementId = newEl.id;
          state.selectedElementIds = [newEl.id];
        });
      },

      duplicateElements: (elementIds: string[]) => {
        const ids = Array.from(new Set(elementIds));
        if (!ids.length) return;
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;
          const selected = new Set(ids);
          const duplicates = slide.elements
            .filter((el) => selected.has(el.id))
            .map((el) => ({
              id: generateId(),
              data: {
                ...JSON.parse(JSON.stringify(el.data)),
                x: el.data.x + 20,
                y: el.data.y + 20,
              } as ElementData,
            }));
          if (!duplicates.length) return;
          slide.elements.push(...duplicates);
          state.selectedElementIds = duplicates.map((el) => el.id);
          state.activeElementId = state.selectedElementIds[state.selectedElementIds.length - 1] ?? null;
        });
      },

      copySelectedElements: () => {
        const { slides, activeSlide, selectedElementIds, activeElementId } = get();
        const slide = slides[activeSlide];
        if (!slide) return;
        const ids = selectedElementIds.length
          ? new Set(selectedElementIds)
          : activeElementId
            ? new Set([activeElementId])
            : new Set<string>();
        if (!ids.size) return;

        const elements = slide.elements
          .filter((element) => ids.has(element.id))
          .map(cloneElement);
        if (!elements.length) return;
        set((state) => {
          state.elementClipboard = { elements };
        });
      },

      pasteElements: () => {
        const clipboard = get().elementClipboard;
        if (!clipboard?.elements.length) return;
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;

          const idMap = new Map(clipboard.elements.map((element) => [element.id, generateId()]));
          const pasted = clipboard.elements.map((element) => ({
            id: idMap.get(element.id)!,
            data: remapCopiedReferences(cloneElement(element).data, idMap) as ElementData,
          }));

          slide.elements.push(...pasted);
          state.selectedElementIds = pasted.map((element) => element.id);
          state.activeElementId = state.selectedElementIds[state.selectedElementIds.length - 1] ?? null;
        });
      },

      /* ==================== Z-INDEX ==================== */

      // Layer order is the element array's order, and every one of these four
      // snapshots first: without it a re-layer was the one edit Ctrl+Z could
      // not take back, so undo silently reached past it to the edit before.
      // The snapshot is taken only once the move is known to be possible, so a
      // no-op (already frontmost, already at the back) does not spend a step.
      bringForward: (id) => {
        const slide = get().slides[get().activeSlide];
        const i = slide?.elements.findIndex((el) => el.id === id) ?? -1;
        if (!slide || i === -1 || i === slide.elements.length - 1) return;
        get().pushToHistory();
        set((state) => {
          const s = state.slides[state.activeSlide];
          [s.elements[i], s.elements[i + 1]] = [s.elements[i + 1], s.elements[i]];
        });
      },

      bringToFront: (id) => {
        const slide = get().slides[get().activeSlide];
        const i = slide?.elements.findIndex((el) => el.id === id) ?? -1;
        if (!slide || i === -1 || i === slide.elements.length - 1) return;
        get().pushToHistory();
        set((state) => {
          const s = state.slides[state.activeSlide];
          const [el] = s.elements.splice(i, 1); s.elements.push(el);
        });
      },

      sendBackward: (id) => {
        const slide = get().slides[get().activeSlide];
        const i = slide?.elements.findIndex((el) => el.id === id) ?? -1;
        if (!slide || i <= 0) return;
        get().pushToHistory();
        set((state) => {
          const s = state.slides[state.activeSlide];
          [s.elements[i], s.elements[i - 1]] = [s.elements[i - 1], s.elements[i]];
        });
      },

      sendToBack: (id) => {
        const slide = get().slides[get().activeSlide];
        const i = slide?.elements.findIndex((el) => el.id === id) ?? -1;
        if (!slide || i <= 0) return;
        get().pushToHistory();
        set((state) => {
          const s = state.slides[state.activeSlide];
          const [el] = s.elements.splice(i, 1); s.elements.unshift(el);
        });
      },

      // The Layers panel drags a row several places at once. Repeating
      // bringForward/sendBackward for each step would stack one undo entry per
      // step, so a single drag would need several Ctrl+Z presses to take back.
      moveElementToIndex: (id, toIndex) => {
        const slide = get().slides[get().activeSlide];
        const from = slide?.elements.findIndex((el) => el.id === id) ?? -1;
        if (!slide || from === -1) return;
        const to = Math.min(Math.max(0, toIndex), slide.elements.length - 1);
        if (from === to) return;
        get().pushToHistory();
        set((state) => {
          const s = state.slides[state.activeSlide];
          const [el] = s.elements.splice(from, 1);
          s.elements.splice(to, 0, el);
        });
      },

      /* ==================== COPY STYLE ==================== */

      applyCopiedStyle: (targetElementIds, styleProperties) => {
        get().pushToHistory();
        set((state) => {
          const slide = state.slides[state.activeSlide];
          if (!slide) return;

          // Apply style properties to all target elements
          targetElementIds.forEach((elementId) => {
            const element = slide.elements.find((el) => el.id === elementId);
            if (element) {
              Object.assign(element.data, styleProperties);
            }
          });
        });
      },

      /* ==================== SETTERS ==================== */

      setActiveSlide: (index) => {
        if (get().activeSlide === index) return;
        set((s) => { s.activeSlide = index; });
      },
      setActiveElementId: (id) => {
        const { activeElementId, selectedElementIds } = get();
        const alreadySelected = id === null
          ? selectedElementIds.length === 0
          : selectedElementIds.length === 1 && selectedElementIds[0] === id;
        if (activeElementId === id && alreadySelected) return;
        set((s) => {
          s.activeElementId = id;
          s.selectedElementIds = id ? [id] : [];
        });
      },
      setSelectedElementIds: (ids) => set((s) => {
        const next = Array.from(new Set(ids));
        s.selectedElementIds = next;
        s.activeElementId = next[next.length - 1] ?? null;
      }),
      toggleSelectedElementId: (id) => set((s) => {
        const selected = new Set(s.selectedElementIds);
        if (selected.has(id)) {
          selected.delete(id);
        } else {
          selected.add(id);
        }
        const next = Array.from(selected);
        s.selectedElementIds = next;
        s.activeElementId = next[next.length - 1] ?? null;
      }),
      clearSelection: () => {
        const { activeElementId, selectedElementIds } = get();
        if (activeElementId === null && selectedElementIds.length === 0) return;
        set((s) => {
          s.activeElementId = null;
          s.selectedElementIds = [];
        });
      },
      setActiveRightPanel: (p) => set((s) => { s.activeRightPanel = p; }),



      /* ==================== TEMPLATE ==================== */


      applyFullTemplate: (templateSlides, options) => {
        if (options?.history) get().pushToHistory();
        set((state) => {
          state.slides = templateSlides.map((sl) => ({
            ...sl, id: generateId(),

            elements: sl.elements.map((el) => ({ id: generateId(), data: structuredClone(el.data) })),
          }));
          state.activeSlide = 0;
          state.activeElementId = null;
          state.selectedElementIds = [];
        });
      },



      /* ==================== AI COPILOT ==================== */

      applyAIEdits: (ops: AIEditOp[]) => {
        if (!ops.length) return;
        get().pushToHistory();
        set((state) => {
          const slideById = (id: string) => state.slides.find((s) => s.id === id);

          ops.forEach((op) => {
            switch (op.kind) {
              case "updateElement": {
                const element = slideById(op.slideId)?.elements.find((el) => el.id === op.elementId);
                if (element) Object.assign(element.data, op.patch);
                break;
              }
              case "addElement": {
                slideById(op.slideId)?.elements.push(op.element);
                break;
              }
              case "removeElement": {
                const slide = slideById(op.slideId);
                if (!slide) break;
                const index = slide.elements.findIndex((el) => el.id === op.elementId);
                if (index !== -1) slide.elements.splice(index, 1);
                break;
              }
              case "moveElementLayer": {
                const slide = slideById(op.slideId);
                if (!slide) break;
                const index = slide.elements.findIndex((el) => el.id === op.elementId);
                if (index === -1) break;
                const [element] = slide.elements.splice(index, 1);
                const target =
                  op.to === "front" ? slide.elements.length
                    : op.to === "back" ? 0
                      : op.to === "forward" ? Math.min(slide.elements.length, index + 1)
                        : Math.max(0, index - 1);
                slide.elements.splice(target, 0, element);
                break;
              }
              case "updateSlide": {
                const slide = slideById(op.slideId);
                if (slide) Object.assign(slide, op.patch);
                break;
              }
              case "insertSlide": {
                const index = Math.max(0, Math.min(state.slides.length, op.atIndex));
                state.slides.splice(index, 0, op.slide);
                break;
              }
              case "removeSlide": {
                const index = state.slides.findIndex((s) => s.id === op.slideId);
                if (index !== -1) state.slides.splice(index, 1);
                break;
              }
              case "setActiveSlide": {
                state.activeSlide = op.index;
                break;
              }
              case "setSelection": {
                state.selectedElementIds = op.elementIds;
                state.activeElementId = op.elementIds[op.elementIds.length - 1] ?? null;
                break;
              }
            }
          });

          // Slide/element removal can strand the cursor and the selection.
          if (state.slides.length === 0) {
            state.slides = [{ id: generateId(), height: 434, width: 350, background: "#ffffff", elements: [] }];
          }
          state.activeSlide = Math.max(0, Math.min(state.activeSlide, state.slides.length - 1));
          const liveIds = new Set(state.slides[state.activeSlide]?.elements.map((el) => el.id) ?? []);
          state.selectedElementIds = state.selectedElementIds.filter((id) => liveIds.has(id));
          state.activeElementId =
            state.activeElementId && liveIds.has(state.activeElementId)
              ? state.activeElementId
              : state.selectedElementIds[state.selectedElementIds.length - 1] ?? null;
        });
      },

      /* ==================== BOOK COVER HELPERS ==================== */

      insertSlideAtStart: (slide: SlideType) => {
        get().pushToHistory();
        set((state) => {
          const newSlide: SlideType = {
            ...slide,
            id: generateId(),
            elements: slide.elements.map((el) => ({
              id: generateId(),
              data: { ...el.data },
            })),
          };
          state.slides.unshift(newSlide);
          state.activeSlide = 0;
          state.activeElementId = null;
          state.selectedElementIds = [];
        });
      },

      insertSlideAtEnd: (slide: SlideType) => {
        get().pushToHistory();
        set((state) => {
          const newSlide: SlideType = {
            ...slide,
            id: generateId(),
            elements: slide.elements.map((el) => ({
              id: generateId(),
              data: { ...el.data },
            })),
          };
          state.slides.push(newSlide);
          state.activeSlide = state.slides.length - 1;
          state.activeElementId = null;
          state.selectedElementIds = [];
        });
      },

      // Optional: dono ek saath
      applyBookCovers: (front?: SlideType, back?: SlideType) => {
        get().pushToHistory();
        set((state) => {
          if (front) {
            const frontSlide: SlideType = {
              ...front,
              id: generateId(),
              elements: front.elements.map((el) => ({
                id: generateId(),
                data: { ...el.data },
              })),
            };
            state.slides.unshift(frontSlide);
          }
          if (back) {
            const backSlide: SlideType = {
              ...back,
              id: generateId(),
              elements: back.elements.map((el) => ({
                id: generateId(),
                data: { ...el.data },
              })),
            };
            state.slides.push(backSlide);
          }
          state.activeSlide = 0;
          state.activeElementId = null;
          state.selectedElementIds = [];
        });
      },
    })),
    {
      name: "editor-store",
      storage: createDebouncedSessionStorage(),
      skipHydration: true,
      partialize: (state) => ({
        slides: state.slides,
        activeSlide: state.activeSlide,
        activeElementId: state.activeElementId,
        selectedElementIds: state.selectedElementIds,
      }),
    }
  )
);

export default useEditorStore;
