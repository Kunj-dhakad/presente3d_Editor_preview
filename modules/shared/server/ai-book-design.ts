import { randomUUID } from "node:crypto";
import type { PublicationType } from "@shared/aiBook";
import { paginateBookIndex } from "@editor/blocks/Index/lib/BookIndexPaginator";
import type { ChapterEntry } from "@editor/blocks/Index/lib/ChapterManager";
import type { TextData } from "@editor/store/editorStore";
import { chapterMarks, type ChapterMark } from "@shared/bookChapters";
import { roundedRect } from "@shared/shapeMarkup";
import type { Outline, PageCopy } from "./ai-book";

/**
 * How an AI book looks. Every publication type is its own design: a novel
 * reads like a printed book, a magazine like an editorial issue, a lookbook
 * lets the photos speak. The page size never changes; the fonts, colours,
 * cover, contents page and page layouts do.
 *
 * Pages are composed from frames that cannot intersect, and text is grown or
 * shrunk to fill the frame it was handed, so a generated page never runs past
 * its edge or lets two blocks overlap.
 */

export const PAGE_SIZES = {
  portrait: { width: 350, height: 434, label: "Portrait" },
  landscape: { width: 690, height: 434, label: "Landscape" },
  square: { width: 434, height: 434, label: "Square" },
};
export type SizeId = keyof typeof PAGE_SIZES;

/** Page recipes. The outline picks one per page from its design's own set. */
export type Layout = "hero" | "split" | "gallery" | "text" | "quote" | "bullets" | "steps" | "checklist" | "exercise" | "keyidea" | "feature" | "mosaic" | "fullbleed" | "quiz" | "table" | "chart";
export const LAYOUTS: Layout[] = ["hero", "split", "gallery", "text", "quote", "bullets", "steps", "checklist", "exercise", "keyidea", "feature", "mosaic", "fullbleed", "quiz", "table", "chart"];

/** What each layout is, in the words the planner reads. */
export const LAYOUT_MEANINGS: Record<Layout, string> = {
  hero: "one big photo with a short line over it",
  split: "a photo beside a paragraph",
  gallery: "several photos with a short introduction",
  text: "a full page of writing",
  quote: "one memorable line, set large",
  bullets: "a short list of points",
  steps: "three numbered steps to follow in order",
  checklist: "a checklist the reader ticks off",
  exercise: "a hands-on exercise with space to write answers",
  keyidea: "one key idea explained, ending in a takeaway",
  feature: "a magazine article under a large photo",
  mosaic: "three photos arranged as a collage, with a caption",
  fullbleed: "one photo filling the whole page, with a title",
  quiz: "a short interactive quiz on what the reader has learned",
  table: "a small reference table",
  chart: "a simple chart of a suggested plan or recommended amounts",
};
const PHOTO_LAYOUTS = new Set<Layout>(["hero", "split", "gallery", "feature", "mosaic", "fullbleed"]);

type ThemeId = "warm" | "cool" | "mono" | "forest";
export const THEME_IDS: ThemeId[] = ["warm", "cool", "mono", "forest"];
/** paper: page colour · tint: soft accent fill · deep: dark fill, with onDeep text on it. */
type Palette = { paper: string; cover: string; ink: string; soft: string; accent: string; tint: string; deep: string; onDeep: string };

/** The visual system a design is drawn with. The six publication types' own designs double as looks. */
type Look = PublicationType;
type CoverId = "jacket" | "masthead" | "block" | "card" | "notebook" | "frame" | "split" | "poster";
/** "orig" keeps the look's hand-tuned palettes; the others are generated from the book's theme hue. */
type Family = "orig" | "paper" | "white" | "pastel" | "neutral";

type Design = {
  id: PublicationType;
  /** Which of the type's designs this is, and how it is drawn. */
  variant: number; look: Look; cover: CoverId; family: Family; hueShift: number;
  /** Headings, and how big they are set relative to the page. */
  display: string; displayWeight: number; displayItalic?: boolean; headingScale: number;
  body: string; bodyAlign: "left" | "justify";
  /** Small uppercase labels. */
  label: string; labelSpacing: number;
  radius: number;
  layouts: Layout[]; cycle: Layout[];
  toc: { style: string; title: string };
  /**
   * Interactive pages the book gets once each when it is long enough (quiz,
   * table, chart), with the page count each needs.
   */
  extras: Partial<Record<"quiz" | "table" | "chart", number>>;
  /** The back cover's contact form: readers' answers land in the author's Leads. */
  contact: { button: string; title: string; description: string };
  chapterLabel: (n: number) => string;
  /** Stock photos to fetch: photo-led designs use more. */
  photos: number;
  palettes: Record<ThemeId, Palette>;
};

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
const two = (n: number) => String(n).padStart(2, "0");

export const DESIGNS: Record<PublicationType, Omit<Design, "variant" | "look" | "cover" | "family" | "hueShift">> = {
  // A printed book: cream paper, serif type, justified text, quiet ornaments.
  ebook: {
    id: "ebook", display: "Playfair Display", displayWeight: 700, headingScale: 0.07,
    body: "Lora", bodyAlign: "justify", label: "Lora", labelSpacing: 2, radius: 0,
    layouts: ["text", "split", "quote", "hero", "bullets", "gallery"],
    cycle: ["text", "split", "text", "hero", "text", "bullets", "split", "quote"],
    toc: { style: "classic", title: "Contents" },
    chapterLabel: n => `Chapter ${WORDS[n] ?? n}`,
    photos: 10,
    extras: {},
    contact: { button: "Stay in touch", title: "Stay in touch", description: "Leave your details to hear about new books and updates." },
    palettes: {
      warm: { paper: "#fbf6ec", cover: "#efe3cc", ink: "#2b2118", soft: "#6b5a48", accent: "#9a5b2e", tint: "#f1e6d3", deep: "#2b2118", onDeep: "#f6ecdb" },
      cool: { paper: "#f7f6f1", cover: "#e4e7ef", ink: "#1f2433", soft: "#5b6275", accent: "#3b4f8a", tint: "#e5e8f1", deep: "#1c2233", onDeep: "#eef0f7" },
      mono: { paper: "#faf9f6", cover: "#e9e7e2", ink: "#1c1c1c", soft: "#5e5e5e", accent: "#1c1c1c", tint: "#ecebe7", deep: "#1c1c1c", onDeep: "#f3f2ee" },
      forest: { paper: "#f8f7f0", cover: "#e2eadf", ink: "#1f2a22", soft: "#56655a", accent: "#2f6b4f", tint: "#e3ebe2", deep: "#1c2b22", onDeep: "#eef3ec" },
    },
  },
  // An editorial issue: full-bleed photos, big contrast headlines, kicker tags.
  magazine: {
    id: "magazine", display: "Bodoni Moda", displayWeight: 700, headingScale: 0.085,
    body: "Inter", bodyAlign: "left", label: "Inter", labelSpacing: 1.5, radius: 0,
    layouts: ["feature", "hero", "split", "gallery", "quote", "bullets", "mosaic"],
    cycle: ["feature", "gallery", "split", "hero", "quote", "feature", "bullets", "mosaic"],
    toc: { style: "underline", title: "In this issue" },
    chapterLabel: n => `Feature ${two(n)}`,
    photos: 14,
    extras: {},
    contact: { button: "Get the next issue", title: "Get the next issue", description: "Leave your email and we'll send the next issue as soon as it's out." },
    palettes: {
      warm: { paper: "#ffffff", cover: "#f6f1ec", ink: "#141414", soft: "#55514d", accent: "#e0452b", tint: "#fdebe6", deep: "#141414", onDeep: "#ffffff" },
      cool: { paper: "#ffffff", cover: "#eef1fb", ink: "#10131c", soft: "#4f5566", accent: "#2346d8", tint: "#e8edfd", deep: "#10131c", onDeep: "#ffffff" },
      mono: { paper: "#ffffff", cover: "#f1f1f1", ink: "#111111", soft: "#555555", accent: "#111111", tint: "#efefef", deep: "#111111", onDeep: "#ffffff" },
      forest: { paper: "#ffffff", cover: "#edf4f0", ink: "#101a15", soft: "#4d5a53", accent: "#0f8a5f", tint: "#e1f3eb", deep: "#101a15", onDeep: "#ffffff" },
    },
  },
  // Study notes: numbered key ideas, takeaway cards, a reading-progress bar.
  summary: {
    id: "summary", display: "Plus Jakarta Sans", displayWeight: 700, headingScale: 0.064,
    body: "Plus Jakarta Sans", bodyAlign: "left", label: "Plus Jakarta Sans", labelSpacing: 1.5, radius: 14,
    layouts: ["keyidea", "text", "bullets", "quote", "split", "quiz", "table"],
    cycle: ["keyidea", "text", "bullets", "keyidea", "split", "quote"],
    toc: { style: "numbered", title: "Key ideas" },
    chapterLabel: n => `Part ${n}`,
    photos: 8,
    extras: { quiz: 4, table: 6 },
    contact: { button: "Get more summaries", title: "Get more summaries", description: "Leave your email to receive the next summary." },
    palettes: {
      warm: { paper: "#ffffff", cover: "#f08a24", ink: "#1f1a14", soft: "#5f5a52", accent: "#e57a12", tint: "#fff3e6", deep: "#2a1d10", onDeep: "#fff6ec" },
      cool: { paper: "#ffffff", cover: "#4f5bd5", ink: "#1a1d29", soft: "#5a6070", accent: "#4f5bd5", tint: "#eef0ff", deep: "#1b1f4b", onDeep: "#eef0ff" },
      mono: { paper: "#ffffff", cover: "#1e293b", ink: "#0f172a", soft: "#526077", accent: "#334155", tint: "#f1f5f9", deep: "#0f172a", onDeep: "#f1f5f9" },
      forest: { paper: "#ffffff", cover: "#15803d", ink: "#10231a", soft: "#4f6358", accent: "#15803d", tint: "#ecfdf3", deep: "#0f2e1c", onDeep: "#ecfdf3" },
    },
  },
  // A practical manual: numbered steps, tip boxes, checklists, section tabs.
  guide: {
    id: "guide", display: "Poppins", displayWeight: 700, headingScale: 0.064,
    body: "Inter", bodyAlign: "left", label: "Poppins", labelSpacing: 1, radius: 12,
    layouts: ["steps", "split", "checklist", "bullets", "text", "hero", "quiz", "table", "chart"],
    cycle: ["text", "steps", "split", "bullets", "steps", "hero", "checklist"],
    toc: { style: "colorBar", title: "Contents" },
    chapterLabel: n => `Section ${n}`,
    photos: 10,
    extras: { quiz: 5, table: 6, chart: 8 },
    contact: { button: "Ask a question", title: "Questions about this guide?", description: "Ask anything, or tell us what you'd like to learn next." },
    palettes: {
      warm: { paper: "#ffffff", cover: "#fff1e7", ink: "#111827", soft: "#4b5563", accent: "#ea580c", tint: "#fff1e7", deep: "#431407", onDeep: "#fff1e7" },
      cool: { paper: "#ffffff", cover: "#e6f7fb", ink: "#0f1b2a", soft: "#475569", accent: "#0891b2", tint: "#e6f7fb", deep: "#083344", onDeep: "#e6f7fb" },
      mono: { paper: "#ffffff", cover: "#f4f4f5", ink: "#18181b", soft: "#52525b", accent: "#27272a", tint: "#f4f4f5", deep: "#18181b", onDeep: "#fafafa" },
      forest: { paper: "#ffffff", cover: "#e7f7f1", ink: "#0f1f18", soft: "#4b5c54", accent: "#059669", tint: "#e7f7f1", deep: "#064e3b", onDeep: "#e7f7f1" },
    },
  },
  // Learning by doing: lesson pages, exercises with writing lines, checklists.
  workbook: {
    id: "workbook", display: "Nunito", displayWeight: 700, headingScale: 0.066,
    body: "Nunito", bodyAlign: "left", label: "Nunito", labelSpacing: 1.2, radius: 16,
    layouts: ["text", "exercise", "checklist", "bullets", "split", "quote", "quiz", "table", "chart"],
    cycle: ["text", "exercise", "bullets", "split", "exercise", "checklist"],
    toc: { style: "boxed", title: "What's inside" },
    chapterLabel: n => `Unit ${n}`,
    photos: 8,
    extras: { quiz: 4, table: 7, chart: 6 },
    contact: { button: "Share your progress", title: "Share your progress", description: "Tell us how the exercises went, or ask for help with the next step." },
    palettes: {
      warm: { paper: "#fffaf3", cover: "#ffe3d6", ink: "#1f2937", soft: "#5b6472", accent: "#f0643f", tint: "#ffe9e1", deep: "#7c2d12", onDeep: "#fff4ee" },
      cool: { paper: "#f7f9ff", cover: "#e2e5ff", ink: "#1e2340", soft: "#565d7a", accent: "#6366f1", tint: "#e9eaff", deep: "#312e81", onDeep: "#eef0ff" },
      mono: { paper: "#fafafa", cover: "#e8e8ea", ink: "#1f1f23", soft: "#5a5a63", accent: "#52525b", tint: "#ececee", deep: "#27272a", onDeep: "#fafafa" },
      forest: { paper: "#f6fbf5", cover: "#d6efdf", ink: "#17261d", soft: "#52665a", accent: "#2f9e6b", tint: "#dff3e6", deep: "#14532d", onDeep: "#ecfbf1" },
    },
  },
  // A visual collection: photos first, generous white space, fine type.
  lookbook: {
    id: "lookbook", display: "Cormorant Garamond", displayWeight: 400, displayItalic: true, headingScale: 0.085,
    body: "Montserrat", bodyAlign: "left", label: "Montserrat", labelSpacing: 3, radius: 0,
    layouts: ["fullbleed", "mosaic", "split", "gallery", "hero", "quote"],
    cycle: ["fullbleed", "mosaic", "split", "gallery", "fullbleed", "split", "mosaic", "quote"],
    toc: { style: "minimal", title: "Contents" },
    chapterLabel: n => `N° ${two(n)}`,
    photos: 16,
    extras: {},
    contact: { button: "Enquire", title: "Enquire about the collection", description: "Tell us what caught your eye and we'll get back to you." },
    palettes: {
      warm: { paper: "#f6f1ea", cover: "#ece4d9", ink: "#2a2622", soft: "#7a716a", accent: "#a07a55", tint: "#ece4d9", deep: "#2a2622", onDeep: "#f6f1ea" },
      cool: { paper: "#f2f4f6", cover: "#e3e7ec", ink: "#1f2630", soft: "#6c7580", accent: "#6b7a8f", tint: "#e3e7ec", deep: "#1f2630", onDeep: "#f2f4f6" },
      mono: { paper: "#f5f5f3", cover: "#e7e7e4", ink: "#1a1a1a", soft: "#707070", accent: "#1a1a1a", tint: "#e7e7e4", deep: "#1a1a1a", onDeep: "#f5f5f3" },
      forest: { paper: "#f0f2ec", cover: "#e1e6da", ink: "#1f261d", soft: "#6c7566", accent: "#5f7355", tint: "#e1e6da", deep: "#1f261d", onDeep: "#f0f2ec" },
    },
  },
};

/* -------------------------------------------------------------- variants */

type FontId = keyof typeof FONTS;
/** Font pairings. Every face here has regular, bold and italic, which the editor loads. */
const FONTS = {
  classic: { display: "Playfair Display", displayWeight: 700, body: "Lora", label: "Lora" },
  garamond: { display: "EB Garamond", displayWeight: 700, body: "EB Garamond", label: "Lato" },
  bodoni: { display: "Bodoni Moda", displayWeight: 700, body: "Inter", label: "Inter" },
  jakarta: { display: "Plus Jakarta Sans", displayWeight: 700, body: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  poppins: { display: "Poppins", displayWeight: 700, body: "Inter", label: "Poppins" },
  nunito: { display: "Nunito", displayWeight: 700, body: "Nunito", label: "Nunito" },
  cormorant: { display: "Cormorant Garamond", displayWeight: 400, displayItalic: true, body: "Montserrat", label: "Montserrat" },
  fraunces: { display: "Fraunces", displayWeight: 700, body: "Work Sans", label: "Work Sans" },
  merriweather: { display: "Merriweather", displayWeight: 700, body: "Lato", label: "Lato" },
  baskerville: { display: "Libre Baskerville", displayWeight: 700, body: "Libre Franklin", label: "Libre Franklin" },
  archivo: { display: "Archivo", displayWeight: 700, body: "Archivo", label: "Archivo" },
  dmsans: { display: "DM Sans", displayWeight: 700, body: "DM Sans", label: "DM Sans" },
  rubik: { display: "Rubik", displayWeight: 700, body: "Rubik", label: "Rubik" },
  josefin: { display: "Josefin Sans", displayWeight: 700, body: "Karla", label: "Josefin Sans" },
  sourceserif: { display: "Source Serif 4", displayWeight: 700, body: "Source Sans 3", label: "Source Sans 3" },
  figtree: { display: "Figtree", displayWeight: 700, body: "Figtree", label: "Figtree" },
  raleway: { display: "Raleway", displayWeight: 700, body: "Lato", label: "Raleway" },
  playfairSans: { display: "Playfair Display", displayWeight: 700, body: "DM Sans", label: "DM Sans" },
} satisfies Record<string, { display: string; displayWeight: number; displayItalic?: boolean; body: string; label: string }>;

/**
 * Ten designs per publication type: [look, fonts, cover, colour family, hue shift].
 * The first of each is the type's own original design. A new book avoids the
 * designs its author used most recently, and its colours move a little with
 * every book, so two books rarely look alike.
 */
const VARIANTS: Record<PublicationType, [Look, FontId | null, CoverId, Family, number][]> = {
  ebook: [
    ["ebook", null, "jacket", "orig", 0], ["ebook", "garamond", "split", "paper", 0], ["lookbook", "fraunces", "frame", "neutral", 30],
    ["summary", "jakarta", "block", "white", 200], ["ebook", "merriweather", "poster", "paper", 160], ["magazine", "baskerville", "poster", "white", 330],
    ["ebook", "sourceserif", "jacket", "paper", 200], ["guide", "figtree", "card", "white", 120], ["lookbook", "cormorant", "split", "neutral", 0],
    ["workbook", "nunito", "notebook", "pastel", 280],
  ],
  magazine: [
    ["magazine", null, "masthead", "orig", 0], ["magazine", "playfairSans", "split", "white", 200], ["lookbook", "cormorant", "frame", "neutral", 20],
    ["magazine", "archivo", "masthead", "white", 120], ["summary", "fraunces", "poster", "pastel", 300], ["ebook", "baskerville", "masthead", "paper", 0],
    ["magazine", "josefin", "poster", "white", 170], ["lookbook", "raleway", "split", "neutral", 200], ["guide", "rubik", "masthead", "white", 260],
    ["magazine", "merriweather", "block", "white", 20],
  ],
  summary: [
    ["summary", null, "block", "orig", 0], ["summary", "fraunces", "jacket", "white", 20], ["workbook", "nunito", "block", "pastel", 160],
    ["summary", "baskerville", "split", "neutral", 200], ["ebook", "classic", "jacket", "paper", 0], ["magazine", "playfairSans", "poster", "white", 330],
    ["guide", "dmsans", "card", "white", 180], ["summary", "figtree", "split", "white", 270], ["summary", "sourceserif", "block", "paper", 120],
    ["lookbook", "fraunces", "frame", "neutral", 40],
  ],
  guide: [
    ["guide", null, "card", "orig", 0], ["workbook", "nunito", "card", "pastel", 190], ["summary", "dmsans", "split", "white", 220],
    ["magazine", "playfairSans", "poster", "white", 10], ["guide", "figtree", "block", "white", 260], ["ebook", "merriweather", "jacket", "paper", 30],
    ["guide", "rubik", "split", "pastel", 330], ["summary", "archivo", "block", "white", 160], ["guide", "josefin", "poster", "white", 200],
    ["lookbook", "raleway", "frame", "neutral", 60],
  ],
  workbook: [
    ["workbook", null, "notebook", "orig", 0], ["summary", "jakarta", "block", "white", 220], ["guide", "poppins", "card", "white", 160],
    ["workbook", "rubik", "split", "pastel", 280], ["ebook", "sourceserif", "jacket", "paper", 20], ["workbook", "josefin", "poster", "pastel", 330],
    ["workbook", "figtree", "notebook", "pastel", 150], ["summary", "dmsans", "split", "pastel", 200], ["guide", "archivo", "block", "white", 30],
    ["workbook", "fraunces", "card", "pastel", 50],
  ],
  lookbook: [
    ["lookbook", null, "frame", "orig", 0], ["magazine", "bodoni", "masthead", "white", 350], ["lookbook", "josefin", "split", "neutral", 200],
    ["lookbook", "classic", "jacket", "paper", 20], ["magazine", "archivo", "poster", "white", 160], ["lookbook", "fraunces", "frame", "neutral", 120],
    ["ebook", "garamond", "split", "paper", 30], ["lookbook", "raleway", "poster", "neutral", 260], ["summary", "dmsans", "block", "pastel", 300],
    ["lookbook", "baskerville", "frame", "neutral", 0],
  ],
};
export const VARIANT_COUNT = 10;

const variantCache = new Map<string, Design>();
/** A type's design number `variant`: its content rules, drawn with that variant's look, fonts, cover and colours. */
export function designOf(style: unknown, variant: unknown = 0): Design {
  const type = (Object.hasOwn(DESIGNS, String(style)) ? style : "ebook") as PublicationType;
  const list = VARIANTS[type];
  const n = Number.isInteger(variant) && Number(variant) >= 0 && Number(variant) < list.length ? Number(variant) : 0;
  const key = `${type}:${n}`;
  const cached = variantCache.get(key);
  if (cached) return cached;
  const [look, font, cover, family, hueShift] = list[n];
  const base = DESIGNS[type], visual = DESIGNS[look];
  const design: Design = {
    ...base,
    // How it is drawn comes from the look, with the variant's own fonts.
    ...(font ? { displayItalic: undefined, ...FONTS[font] } : {
      display: visual.display, displayWeight: visual.displayWeight, displayItalic: visual.displayItalic, body: visual.body, label: visual.label,
    }),
    headingScale: visual.headingScale, bodyAlign: visual.bodyAlign, labelSpacing: visual.labelSpacing, radius: visual.radius,
    toc: { style: visual.toc.style, title: base.toc.title }, palettes: visual.palettes,
    variant: n, look, cover, family, hueShift,
  };
  variantCache.set(key, design);
  return design;
}

/** Picks a design for a new book, avoiding the ones the author used last. */
export function pickVariant(avoid: unknown): number {
  const recent = new Set(Array.isArray(avoid) ? avoid.filter(n => Number.isInteger(n)) : []);
  const open = Array.from({ length: VARIANT_COUNT }, (_, i) => i).filter(i => !recent.has(i));
  const pool = open.length ? open : Array.from({ length: VARIANT_COUNT }, (_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ----------------------------------------------------------------- colour */

const THEME_HUE: Record<ThemeId, number> = { warm: 22, cool: 225, forest: 150, mono: 220 };

function hsl(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360, sat = Math.max(0, Math.min(100, s)) / 100, light = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

/** A full palette from one hue, in the character of the colour family. */
function generated(family: Exclude<Family, "orig">, theme: ThemeId, hue: number): Palette {
  const h = hue;
  const m = theme === "mono" ? 0.12 : 1;
  // Yellows and greens read lighter: darken the accent so white text on it stays legible.
  const accentL = h % 360 > 40 && h % 360 < 170 ? 34 : 44;
  switch (family) {
    case "paper": return { paper: hsl(h, 40 * m, 96.5), cover: hsl(h, 34 * m, 88), ink: hsl(h, 30 * m, 12), soft: hsl(h, 14 * m, 38), accent: hsl(h, 52 * m, accentL - 6), tint: hsl(h, 32 * m, 91), deep: hsl(h, 30 * m, 14), onDeep: hsl(h, 40 * m, 94) };
    case "white": return { paper: "#ffffff", cover: hsl(h, 55 * m, 93), ink: hsl(h, 30 * m, 10), soft: hsl(h, 10 * m, 38), accent: hsl(h, 70 * m, accentL), tint: hsl(h, 75 * m, 95.5), deep: hsl(h, 45 * m, 15), onDeep: hsl(h, 60 * m, 96) };
    case "pastel": return { paper: hsl(h, 70 * m, 98.5), cover: hsl(h, 70 * m, 91), ink: hsl(h, 30 * m, 14), soft: hsl(h, 12 * m, 38), accent: hsl(h, 65 * m, accentL + 4), tint: hsl(h, 75 * m, 93.5), deep: hsl(h, 50 * m, 24), onDeep: hsl(h, 60 * m, 96) };
    default: return { paper: hsl(h, 20 * m, 95), cover: hsl(h, 18 * m, 89), ink: hsl(h, 12 * m, 14), soft: hsl(h, 6 * m, 44), accent: hsl(h, 26 * m, accentL), tint: hsl(h, 18 * m, 89), deep: hsl(h, 12 * m, 15), onDeep: hsl(h, 20 * m, 95) };
  }
}

function paletteOf(outline: Outline) {
  const design = designOf(outline.style, outline.variant);
  const theme = (THEME_IDS.includes(outline.theme as ThemeId) ? outline.theme : "warm") as ThemeId;
  if (design.family === "orig") return design.palettes[theme];
  const jitter = Number.isFinite(outline.hue) ? Math.max(-30, Math.min(30, Number(outline.hue))) : 0;
  return generated(design.family, theme, THEME_HUE[theme] + design.hueShift + jitter);
}

/* ------------------------------------------------------------ measuring */

type Element = { id: string; data: Record<string, unknown> };
export type Slide = { id: string; width: number; height: number; background: string; elements: Element[] };
type Frame = { x: number; y: number; width: number; height: number };
type TextOptions = {
  min: number; max: number; lineHeight?: number; color: string; weight?: number; font?: string;
  align?: string; zIndex?: number; italic?: boolean; upper?: boolean; spacing?: number;
};

const indic = (value: string) => /[ऀ-෿]/.test(value);

/** Average glyph width per em. Kept on the wide side: guessing wide only costs a size step. */
const FONT_WIDTH: Record<string, number> = {
  Georgia: 0.52, Lora: 0.52, "Playfair Display": 0.52, "Bodoni Moda": 0.52, Inter: 0.54, "Plus Jakarta Sans": 0.55,
  Poppins: 0.59, Nunito: 0.54, "Cormorant Garamond": 0.45, Montserrat: 0.6,
  "EB Garamond": 0.48, Lato: 0.53, Fraunces: 0.55, "Work Sans": 0.57, Merriweather: 0.59, "Libre Baskerville": 0.6, "Libre Franklin": 0.56,
  Archivo: 0.55, "DM Sans": 0.55, Rubik: 0.57, "Josefin Sans": 0.52, Karla: 0.53, "Source Serif 4": 0.53, "Source Sans 3": 0.51,
  Figtree: 0.55, Raleway: 0.57,
};
function glyph(value: string, size: number, options: Pick<TextOptions, "font" | "upper" | "weight">) {
  let factor = indic(value) ? 0.62 : FONT_WIDTH[options.font ?? "Georgia"] ?? 0.55;
  if (options.upper) factor += 0.14;
  if ((options.weight ?? 400) >= 700) factor += 0.03;
  if (size >= 18) factor += 0.03;
  return factor;
}

/** Estimated rendered height, wrapping words the way a browser does. */
function measure(value: string, width: number, size: number, lineHeight: number, options: Pick<TextOptions, "font" | "upper" | "weight" | "spacing"> = {}) {
  const perLine = Math.max(4, Math.floor(width / (size * glyph(value, size, options) + (options.spacing ?? 0))));
  let lines = 0;
  for (const paragraph of value.split("\n")) {
    lines += 1;
    let used = 0;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const needed = word.length + (used ? 1 : 0);
      if (used + needed > perLine && used > 0) { lines += 1; used = word.length; }
      else used += needed;
    }
  }
  // A small cushion for the gap between average and actual glyph widths.
  return Math.ceil(lines * size * lineHeight * 1.06);
}

function trimTo(value: string, width: number, size: number, lineHeight: number, height: number, options: TextOptions) {
  let text = value;
  while (text.length > 24 && measure(text, width, size, lineHeight, options) > height) {
    const cut = text.lastIndexOf(" ", text.length - 6);
    text = cut > 16 ? text.slice(0, cut) : text.slice(0, Math.max(16, text.length - 8));
  }
  return text === value ? value : text.replace(/[,;:\s]+$/, "") + "…";
}

/** Text boxes are padded by this much on every side, in the editor and the reader alike. */
const TEXT_PADDING = 6;

/** Text that fills its frame: the size shrinks until the copy fits, and only as a last resort is it trimmed. */
function fitted(value: string, box: Frame, options: TextOptions): Element {
  const lineHeight = options.lineHeight ?? 1.5;
  const room = box.height - 4;
  // Words wrap inside the padding, so that is the width to measure against.
  const frame = { ...box, width: Math.max(10, box.width - TEXT_PADDING * 2) };
  // The longest word must fit on a line too, or the browser breaks it mid-word.
  const longest = Math.max(0, ...value.split(/\s+/).map(word => word.length));
  const wordFits = (px: number) => longest * (px * (glyph(value, px, options) + 0.1) + (options.spacing ?? 0)) <= frame.width;
  let size = Math.max(options.min, options.max);
  while (size > options.min && (measure(value, frame.width, size, lineHeight, options) > room || !wordFits(size))) size -= 1;
  while (size > 7 && !wordFits(size)) size -= 1;
  const text = measure(value, frame.width, size, lineHeight, options) > room ? trimTo(value, frame.width, size, lineHeight, room, options) : value;
  return {
    id: randomUUID(),
    data: {
      type: "text", text, x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width),
      // The box is the whole frame: frames never intersect, so text can never
      // land on its neighbour even if a line wraps one step further than planned.
      height: Math.round(box.height),
      fontSize: size, fontFamily: options.font ?? "Georgia", fontWeight: options.weight ?? 400,
      color: options.color, align: options.align ?? "left", lineHeight,
      ...(options.italic ? { fontStyle: "italic" } : {}),
      ...(options.upper ? { textTransform: "uppercase" } : {}),
      ...(options.spacing ? { letterSpacing: options.spacing } : {}),
      rotation: 0, opacity: 1, zIndex: options.zIndex ?? 2,
    },
  };
}

function picture(src: string, frame: Frame, radius = 0, zIndex = 1): Element {
  return {
    id: randomUUID(),
    data: {
      type: "image", src, x: Math.round(frame.x), y: Math.round(frame.y), width: Math.round(frame.width), height: Math.round(frame.height),
      fit: "cover", objectFit: "cover", borderRadius: `${radius}px`, rotation: 0, opacity: 1, zIndex,
    },
  };
}

function panel(color: string, frame: Frame, radius = 0, zIndex = 0, opacity = 1): Element {
  const width = Math.max(1, Math.round(frame.width));
  const height = Math.max(1, Math.round(frame.height));
  return {
    id: randomUUID(),
    data: {
      type: "shape", shape: roundedRect(width, height, radius), fill: color, color, x: Math.round(frame.x), y: Math.round(frame.y),
      width, height, rotation: 0, opacity, zIndex, borderRadius: `${radius}px`,
    },
  };
}

/** The site's address: a QR code that points at the book falls back to it outside the reader. */
const SITE_URL = (process.env.BETTER_AUTH_URL || "").replace(/\/+$/, "");

/** A button that opens one of the reader's popups (quiz, question, contact form). */
function interaction(kind: "quiz" | "question" | "contact-form", frame: Frame, d: Design, p: Palette, text: string, extra: Record<string, unknown>, style: { background?: string; color?: string } = {}): Element {
  return {
    id: randomUUID(),
    data: {
      type: "interaction", interactionKind: kind, svg: "", text,
      x: Math.round(frame.x), y: Math.round(frame.y), width: Math.round(frame.width), height: Math.round(frame.height),
      rotation: 0, opacity: 1, zIndex: 4,
      fontFamily: d.label, fontSize: 13, fontWeight: 700, textColor: style.color ?? "#ffffff", backgroundColor: style.background ?? p.accent,
      borderRadius: d.radius ? Math.round(frame.height / 2) : 3, borderWidth: 0, iconPosition: "left", target: "_blank", tooltip: "",
      ...extra,
    },
  };
}

/* --------------------------------------------------------------- canvas */

/** One page being composed, with the design's measurements at hand. */
class Page {
  readonly elements: Element[] = [];
  readonly width: number; readonly height: number;
  readonly unit: number; readonly pad: number; readonly inner: number; readonly gap: number;
  /** Wider than tall: photos go beside the words rather than above them. */
  readonly wide: boolean;
  /** Landscape only: room for a photo column next to a list. */
  readonly landscape: boolean;
  readonly footerTop: number;
  readonly body: { min: number; max: number };
  readonly headingMax: number;
  background: string;

  constructor(readonly d: Design, readonly p: Palette, size: SizeId) {
    const { width, height } = PAGE_SIZES[size];
    this.width = width; this.height = height;
    this.unit = Math.min(width, height);
    this.pad = Math.round(width * (d.look === "lookbook" ? 0.085 : 0.075));
    this.inner = width - this.pad * 2;
    this.gap = Math.round(this.unit * 0.035);
    this.wide = width / height > 1.2 || size === "square";
    this.landscape = width / height > 1.3;
    this.footerTop = height - Math.round(height * 0.065);
    // Body copy stays readable: the writer is asked for little enough text that
    // it fits at these sizes, and it is never shrunk below the minimum.
    this.body = { min: Math.max(11, Math.round(this.unit * 0.027)), max: Math.max(13, Math.round(this.unit * 0.038)) };
    this.headingMax = Math.round(this.unit * d.headingScale);
    this.background = p.paper;
  }

  text(value: string, frame: Frame, options: Partial<TextOptions> & { color?: string } = {}) {
    if (!value || frame.height < 8 || frame.width < 20) return null;
    const element = fitted(value, frame, { min: this.body.min, max: this.body.max, color: this.p.ink, font: this.d.body, ...options } as TextOptions);
    this.elements.push(element);
    return element;
  }
  /** Body copy in the design's face and alignment. */
  prose(value: string | undefined, frame: Frame, options: Partial<TextOptions> = {}) {
    return value ? this.text(value, frame, { align: this.d.bodyAlign, lineHeight: 1.55, ...options }) : null;
  }
  heading(value: string, frame: Frame, options: Partial<TextOptions> = {}) {
    return this.text(value, frame, {
      min: 12, max: this.headingMax, lineHeight: 1.18, font: this.d.display, weight: this.d.displayWeight,
      italic: this.d.displayItalic, color: this.p.ink, ...options,
    });
  }
  /** Small uppercase label; returns its height. */
  label(value: string, x: number, y: number, width: number, options: Partial<TextOptions> = {}) {
    const size = Math.max(8, Math.round(this.unit * 0.022));
    const height = Math.round(size * 1.6);
    this.text(value, { x, y, width, height }, {
      min: 7, max: size, lineHeight: 1.3, font: this.d.label, weight: 700, upper: true, spacing: this.d.labelSpacing, color: this.p.accent, ...options,
    });
    return height;
  }
  /** A filled tag with a label inside; returns its box. */
  pill(value: string, x: number, y: number, fill: string, color: string, align: "left" | "right" | "center" = "left") {
    const size = Math.max(8, Math.round(this.unit * 0.021));
    const padX = Math.round(size * 0.9);
    const width = Math.min(this.inner, Math.round(value.length * (size * 0.7 + this.d.labelSpacing) + padX * 2));
    const height = Math.round(size * 2.2);
    const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    this.box(fill, { x: left, y, width, height }, this.d.radius ? height / 2 : 0, 2);
    this.text(value, { x: left + padX - TEXT_PADDING, y: y + Math.round((height - size * 1.4) / 2) - 1, width: width - padX * 2 + TEXT_PADDING * 2, height: Math.round(size * 1.6) },
      { min: 7, max: size, lineHeight: 1.3, font: this.d.label, weight: 700, upper: true, spacing: this.d.labelSpacing, color, zIndex: 3 });
    return { x: left, y, width, height };
  }
  photo(src: string, frame: Frame, radius = this.d.radius, zIndex = 1) {
    this.elements.push(picture(src, frame, radius, zIndex));
  }
  box(color: string, frame: Frame, radius = 0, zIndex = 0, opacity = 1) {
    this.elements.push(panel(color, frame, radius, zIndex, opacity));
  }
  rule(x: number, y: number, width = Math.round(this.width * 0.08), color = this.p.accent, height = 3) {
    this.box(color, { x, y, width, height }, height > 2 ? 2 : 0, 1);
  }
  /** A number centred in a circle. */
  badge(value: string, cx: number, cy: number, diameter: number, fill: string, color: string) {
    this.box(fill, { x: cx - diameter / 2, y: cy - diameter / 2, width: diameter, height: diameter }, diameter / 2, 2);
    const size = Math.round(diameter * 0.44);
    const line = Math.round(size * 1.3);
    this.text(value, { x: cx - diameter / 2 - TEXT_PADDING, y: cy - line / 2 - 1, width: diameter + TEXT_PADDING * 2, height: line + 4 },
      { min: size, max: size, lineHeight: 1.2, font: this.d.label, weight: 700, color, align: "center", zIndex: 3 });
  }
  /** An outlined square, drawn as two fills. */
  checkbox(x: number, y: number, side: number, color: string, fill: string) {
    this.box(color, { x, y, width: side, height: side }, 3, 2);
    this.box(fill, { x: x + 1.5, y: y + 1.5, width: side - 3, height: side - 3 }, 2, 3);
  }
  /** A reader button: quiz, question or contact form. */
  action(kind: "quiz" | "question" | "contact-form", frame: Frame, text: string, extra: Record<string, unknown>, style?: { background?: string; color?: string }) {
    this.elements.push(interaction(kind, frame, this.d, this.p, text, extra, style));
  }
  /** The editor's Table element, styled in the design's colours. */
  table(columns: string[], rows: string[][], frame: Frame) {
    const { d, p } = this;
    this.elements.push({
      id: randomUUID(),
      data: {
        type: "table", x: Math.round(frame.x), y: Math.round(frame.y), width: Math.round(frame.width), height: Math.round(frame.height),
        rotation: 0, opacity: 1, zIndex: 2, rows: rows.length + 1, columns: columns.length, styleId: `ai-${d.id}`,
        cells: [columns, ...rows].map(row => row.map(text => ({ text }))),
        style: {
          borderColor: p.tint, borderWidth: 1, background: p.paper, cellBackground: p.paper, padding: 8, borderRadius: d.radius ? 10 : 0,
          fontFamily: d.body, fontSize: this.width > 600 ? 13 : 12, fontWeight: 400, textColor: p.ink, lineHeight: 1.35, letterSpacing: 0,
          textAlign: "left", verticalAlign: "middle", headerRow: true, headerBackground: p.accent, headerTextColor: "#ffffff", headerFontWeight: 700,
          bandedRows: true, bandBackground: p.tint, borderStyle: "horizontal",
        },
      },
    });
  }
  /** The editor's Chart element. */
  chart(chartType: "bar" | "line" | "area", title: string, data: { label: string; value: number }[], frame: Frame) {
    const { d, p } = this;
    this.elements.push({
      id: randomUUID(),
      data: {
        type: "chart", chartType, title, data, x: Math.round(frame.x), y: Math.round(frame.y), width: Math.round(frame.width), height: Math.round(frame.height),
        rotation: 0, opacity: 1, zIndex: 2,
        style: {
          primaryColor: p.accent, secondaryColor: p.deep, background: p.paper, gridColor: p.tint, axisColor: p.soft, labelColor: p.ink, legendColor: p.soft,
          borderRadius: d.radius, padding: 12, showLegend: false, legendPosition: "bottom", showGrid: true, showLabels: true, showXAxis: true, showYAxis: true,
          fontSize: 11, fontFamily: d.body, fontWeight: 400, animation: true, animationDuration: 600,
        },
      },
    });
  }
  /** A QR code that opens the book itself when it is read online. */
  qr(frame: Frame, foreground: string) {
    this.elements.push({
      id: randomUUID(),
      data: {
        type: "qr-code", content: SITE_URL, bookLink: true, ecLevel: "M", foreground, background: "#ffffff",
        x: Math.round(frame.x), y: Math.round(frame.y), width: Math.round(frame.width), height: Math.round(frame.height), rotation: 0, opacity: 1, zIndex: 3,
      },
    });
  }
  slide(): Slide {
    return { id: randomUUID(), width: this.width, height: this.height, background: this.background, elements: this.elements };
  }
}

/* ---------------------------------------------------------------- covers */

const BRAND = "AI Book Creator";
const KIND_NAME: Record<PublicationType, string> = {
  ebook: "A book", magazine: "Issue 01", summary: "Book summary", guide: "How-to guide", workbook: "Workbook", lookbook: "Lookbook",
};

export function coverPage(outline: Outline, size: SizeId, photo?: string): Slide {
  const d = designOf(outline.style, outline.variant);
  const p = paletteOf(outline);
  const c = new Page(d, p, size);
  const { width: W, height: H, pad, inner, unit } = c;
  const title = (frame: Frame, options: Partial<TextOptions> = {}) =>
    c.heading(outline.title, frame, { min: 16, max: Math.round(unit * 0.11), lineHeight: 1.12, ...options });

  switch (d.cover) {
    case "masthead": {
      // Masthead over a full-bleed photo, cover lines at the foot.
      c.background = p.deep;
      if (photo) c.photo(photo, { x: 0, y: 0, width: W, height: H }, 0, 0);
      c.box(p.deep, { x: 0, y: 0, width: W, height: H * 0.34 }, 0, 1, photo ? 0.45 : 1);
      c.box(p.deep, { x: 0, y: H * 0.6, width: W, height: H * 0.4 }, 0, 1, photo ? 0.62 : 1);
      c.text(KIND_NAME[d.id], { x: pad, y: H * 0.045, width: inner, height: H * 0.04 }, { min: 7, max: 10, font: d.label, weight: 700, upper: true, spacing: 2, color: p.onDeep, zIndex: 3 });
      title({ x: pad, y: H * 0.09, width: inner, height: H * 0.22 }, { color: "#ffffff", max: Math.round(unit * 0.13), lineHeight: 1.02, zIndex: 3 });
      c.pill("Inside", pad, H * 0.64, p.accent, "#ffffff");
      if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: H * 0.71, width: inner * (c.wide ? 0.6 : 0.9), height: H * 0.16 },
        { min: 10, max: Math.round(unit * 0.045), font: d.display, weight: 700, lineHeight: 1.2, color: "#ffffff", zIndex: 3 });
      c.text(BRAND, { x: pad, y: H * 0.905, width: inner, height: H * 0.04 }, { min: 7, max: 9, font: d.label, upper: true, spacing: 2, color: p.onDeep, zIndex: 3 });
      break;
    }
    case "block": {
      // A solid colour block with the title, the key facts underneath.
      c.box(d.family === "orig" && d.look === "summary" ? p.cover : p.accent, { x: 0, y: 0, width: W, height: H * 0.62 }, 0, 0);
      c.label(KIND_NAME[d.id], pad, H * 0.08, inner, { color: "#ffffff" });
      title({ x: pad, y: H * 0.15, width: inner, height: H * 0.34 }, { color: "#ffffff", lineHeight: 1.1 });
      c.rule(pad, H * 0.53, Math.round(W * 0.1), "#ffffff");
      if (photo) {
        const side = Math.round(unit * 0.3);
        c.photo(photo, { x: W - pad - side, y: H * 0.62 - side / 2, width: side, height: side }, side / 2, 2);
      }
      if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: H * 0.7, width: inner * (photo ? 0.6 : 1), height: H * 0.15 },
        { min: 10, max: Math.round(unit * 0.036), color: p.ink, weight: 700 });
      c.text("Key ideas · Takeaways", { x: pad, y: H * 0.88, width: inner, height: H * 0.05 }, { min: 7, max: 10, font: d.label, weight: 700, upper: true, spacing: 1.5, color: p.soft });
      break;
    }
    case "card": {
      // Photo on a rounded card, a tag, and step dots under the title.
      c.background = p.cover;
      if (W / H > 1.3) {
        // Landscape: photo card on the right, the title block on the left.
        const half = Math.round(W * 0.5);
        if (photo) c.photo(photo, { x: half, y: pad, width: W - half - pad, height: H - pad * 2 }, c.d.radius + 6, 1);
        const colW = (photo ? half : W) - pad * 1.6;
        const tag = c.pill(KIND_NAME[d.id], pad, H * 0.2, p.accent, "#ffffff");
        title({ x: pad, y: tag.y + tag.height + c.gap * 0.6, width: colW, height: H * 0.3 }, { max: Math.round(unit * 0.1) });
        const dots = tag.y + tag.height + c.gap * 0.6 + H * 0.32;
        [0, 1, 2].forEach(i => c.box(i === 0 ? p.accent : p.soft, { x: pad + i * 14, y: dots, width: 8, height: 8 }, 4, 1, i === 0 ? 1 : 0.3));
        if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: dots + 18, width: colW, height: H * 0.86 - dots - 18 }, { min: 10, max: Math.round(unit * 0.038), color: p.soft });
        c.text(BRAND, { x: pad, y: H * 0.9, width: colW, height: H * 0.04 }, { min: 7, max: 9, font: d.label, upper: true, spacing: 1.5, color: p.soft });
        break;
      }
      const photoH = photo ? Math.round(H * 0.4) : 0;
      if (photo) c.photo(photo, { x: pad, y: pad, width: inner, height: photoH }, c.d.radius + 6, 1);
      const top = photo ? pad + photoH + c.gap : H * 0.18;
      const tag = c.pill(KIND_NAME[d.id], pad, top, p.accent, "#ffffff");
      title({ x: pad, y: tag.y + tag.height + c.gap * 0.6, width: inner, height: H * 0.18 }, { max: Math.round(unit * 0.09) });
      const dots = top + tag.height + c.gap * 0.6 + H * 0.19;
      [0, 1, 2].forEach(i => c.box(i === 0 ? p.accent : p.soft, { x: pad + i * 14, y: dots, width: 8, height: 8 }, 4, 1, i === 0 ? 1 : 0.3));
      if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: dots + 16, width: inner, height: H * 0.9 - dots - 18 }, { min: 10, max: Math.round(unit * 0.034), color: p.soft });
      c.text(BRAND, { x: pad, y: H * 0.91, width: inner, height: H * 0.04 }, { min: 7, max: 9, font: d.label, upper: true, spacing: 1.5, color: p.soft });
      break;
    }
    case "notebook": {
      // A friendly card on a pastel page, with practice lines as a motif.
      c.background = p.cover;
      c.box(p.paper, { x: pad * 0.6, y: pad * 0.6, width: W - pad * 1.2, height: H - pad * 1.2 }, 22, 0);
      const cardPad = pad * 1.3;
      const cardInner = W - cardPad * 2;
      c.pill(KIND_NAME[d.id], cardPad, H * 0.1, p.accent, "#ffffff");
      title({ x: cardPad, y: H * 0.19, width: cardInner, height: H * 0.26 }, { max: Math.round(unit * 0.095) });
      if (outline.subtitle) c.text(outline.subtitle, { x: cardPad, y: H * 0.47, width: cardInner * (photo ? 0.55 : 1), height: H * 0.14 }, { min: 10, max: Math.round(unit * 0.034), color: p.soft });
      [0, 1, 2].forEach(i => {
        c.checkbox(cardPad, H * 0.66 + i * H * 0.07, 12, p.accent, p.paper);
        c.box(p.soft, { x: cardPad + 20, y: H * 0.66 + i * H * 0.07 + 11, width: cardInner * (photo ? 0.4 : 0.7), height: 1 }, 0, 1, 0.35);
      });
      if (photo) {
        const side = Math.round(unit * 0.34);
        c.photo(photo, { x: W - cardPad - side, y: H * 0.56, width: side, height: side }, side / 2, 2);
      }
      c.text(BRAND, { x: cardPad, y: H * 0.87, width: cardInner, height: H * 0.04 }, { min: 7, max: 9, font: d.label, weight: 700, upper: true, spacing: 1.5, color: p.soft });
      break;
    }
    case "frame": {
      // A photo edge to edge inside a fine white frame; the title set small and centred.
      c.background = p.deep;
      if (photo) c.photo(photo, { x: 0, y: 0, width: W, height: H }, 0, 0);
      c.box("#000000", { x: 0, y: H * 0.55, width: W, height: H * 0.45 }, 0, 1, photo ? 0.32 : 0);
      const inset = Math.round(unit * 0.04);
      for (const frame of [
        { x: inset, y: inset, width: W - inset * 2, height: 1 }, { x: inset, y: H - inset - 1, width: W - inset * 2, height: 1 },
        { x: inset, y: inset, width: 1, height: H - inset * 2 }, { x: W - inset - 1, y: inset, width: 1, height: H - inset * 2 },
      ]) c.box("#ffffff", frame, 0, 2, 0.85);
      c.label(KIND_NAME[d.id], pad, H * 0.62, inner, { color: "#ffffff", align: "center" });
      title({ x: pad, y: H * 0.67, width: inner, height: H * 0.17 }, { color: "#ffffff", align: "center", max: Math.round(unit * 0.12), zIndex: 3 });
      if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: H * 0.845, width: inner, height: H * 0.07 }, { min: 8, max: 11, upper: true, spacing: 1.5, color: "#ffffff", align: "center", zIndex: 3 });
      break;
    }
    case "split": {
      // Photo on one half, a deep colour panel with the title on the other.
      c.background = p.deep;
      const side = W / H > 1.3;
      const photoFrame = side ? { x: W / 2, y: 0, width: W / 2, height: H } : { x: 0, y: 0, width: W, height: Math.round(H * 0.52) };
      if (photo) c.photo(photo, photoFrame, 0, 0);
      else c.box(p.accent, photoFrame, 0, 0);
      const col = side ? { x: pad, y: H * 0.2, width: W / 2 - pad * 1.6 } : { x: pad, y: H * 0.58, width: inner };
      c.label(KIND_NAME[d.id], col.x, col.y, col.width, { color: p.onDeep });
      c.rule(col.x, col.y + H * 0.05, 30, p.accent);
      title({ x: col.x, y: col.y + H * 0.075, width: col.width, height: H * (side ? 0.32 : 0.17) }, { color: p.onDeep, max: Math.round(unit * 0.095) });
      if (outline.subtitle) c.text(outline.subtitle, { x: col.x, y: col.y + H * (side ? 0.42 : 0.25), width: col.width, height: H * (side ? 0.1 : 0.075) }, { min: 9, max: Math.round(unit * 0.033), color: p.onDeep });
      c.text(BRAND, { x: col.x, y: H * 0.91, width: col.width, height: H * 0.04 }, { min: 7, max: 9, font: d.label, weight: 700, upper: true, spacing: 2, color: p.onDeep });
      break;
    }
    case "poster": {
      // The photo fills the page; a big title sits low, over a dark wash.
      c.background = p.deep;
      if (photo) c.photo(photo, { x: 0, y: 0, width: W, height: H }, 0, 0);
      c.box(p.deep, { x: 0, y: H * 0.52, width: W, height: H * 0.48 }, 0, 1, photo ? 0.7 : 1);
      c.pill(KIND_NAME[d.id], pad, H * 0.06, p.accent, "#ffffff");
      c.rule(pad, H * 0.575, 40, p.accent, 4);
      title({ x: pad, y: H * 0.6, width: c.wide ? inner * 0.8 : inner, height: H * 0.2 }, { color: "#ffffff", max: Math.round(unit * 0.11), zIndex: 3 });
      if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: H * 0.8, width: c.wide ? inner * 0.7 : inner, height: H * 0.09 }, { min: 9, max: Math.round(unit * 0.033), color: "#ececec", zIndex: 3 });
      c.text(BRAND, { x: pad, y: H * 0.91, width: inner, height: H * 0.04 }, { min: 7, max: 9, font: d.label, weight: 700, upper: true, spacing: 2, color: "#d8d8d8", zIndex: 3 });
      break;
    }
    default: {
      // A printed book jacket: title above a framed photo, ornament and imprint.
      c.background = p.cover;
      c.box(p.accent, { x: pad * 0.5, y: pad * 0.5, width: W - pad, height: H - pad }, 0, 0, 0.9);
      c.box(p.cover, { x: pad * 0.5 + 2, y: pad * 0.5 + 2, width: W - pad - 4, height: H - pad - 4 }, 0, 0);
      c.text("✦", { x: pad, y: H * 0.07, width: inner, height: H * 0.05 }, { min: 10, max: 14, color: p.accent, align: "center" });
      title({ x: pad, y: H * 0.13, width: inner, height: H * 0.24 }, { align: "center" });
      if (outline.subtitle) c.text(outline.subtitle, { x: pad, y: H * 0.38, width: inner, height: H * 0.1 }, { min: 10, max: Math.round(unit * 0.034), italic: true, color: p.soft, align: "center" });
      if (photo) c.photo(photo, { x: pad * 1.4, y: H * 0.5, width: W - pad * 2.8, height: H * 0.34 }, 0, 1);
      else c.rule(W / 2 - W * 0.06, H * 0.52, Math.round(W * 0.12));
      c.text(BRAND, { x: pad, y: H * 0.875, width: inner, height: H * 0.045 }, { min: 7, max: 10, upper: true, spacing: 2, color: p.soft, align: "center" });
    }
  }
  return c.slide();
}

/** The last page: title, blurb and the maker's mark. */
export function backCover(outline: Outline, size: SizeId, photo?: string): Slide {
  const d = designOf(outline.style, outline.variant);
  const p = paletteOf(outline);
  const c = new Page(d, p, size);
  const { width: W, height: H, pad, inner, unit } = c;
  const blurb = outline.blurb || outline.subtitle;
  const dark = d.look === "magazine" || d.look === "summary" || d.look === "lookbook";
  c.background = dark ? p.deep : p.cover;
  const ink = dark ? p.onDeep : p.ink;
  const center = d.look === "ebook" || d.look === "lookbook";
  const align = center ? "center" : "left";
  const card = d.look === "guide" || d.look === "workbook";
  let top = Math.round(H * 0.14);
  let col = { x: pad, width: inner };
  if (photo && d.look !== "summary") {
    if (W / H > 1.3) {
      // Landscape: the photo takes the right half, the words the left.
      const half = Math.round(W * 0.5);
      if (card) c.photo(photo, { x: half, y: pad, width: W - half - pad, height: H - pad * 2 }, d.radius, 0);
      else c.photo(photo, { x: half, y: 0, width: W - half, height: H }, 0, 0);
      col = { x: pad, width: half - pad * 1.6 };
      top = Math.round(H * 0.2);
    } else {
      const photoH = Math.round(H * 0.26);
      if (card) c.photo(photo, { x: pad, y: pad * 0.8, width: inner, height: photoH }, d.radius, 0);
      else c.photo(photo, { x: 0, y: 0, width: W, height: photoH }, 0, 0);
      top = (card ? Math.round(pad * 0.8) : 0) + photoH + Math.round(H * 0.05);
    }
  }
  c.label(KIND_NAME[d.id], col.x, top, col.width, { color: dark ? p.onDeep : p.accent, align });
  c.heading(outline.title, { x: col.x, y: top + H * 0.045, width: col.width, height: H * 0.12 }, { color: ink, align, max: Math.round(unit * 0.07) });
  const barY = top + H * 0.175;
  c.rule(center ? col.x + col.width / 2 - W * 0.05 : col.x, barY, Math.round(W * 0.1), dark ? p.onDeep : p.accent);
  // Above the imprint: a contact form (its answers reach the author's Leads)
  // and a QR code that opens the book online.
  const qrSide = Math.round(unit * 0.13);
  const rowTop = Math.round(H * 0.885) - qrSide - 16;
  const buttonW = Math.min(col.width - qrSide - 16, 180);
  const buttonH = 36;
  const rowX = center ? col.x + (col.width - buttonW - 16 - qrSide) / 2 : col.x;
  const qrX = rowX + buttonW + 16;
  c.action("contact-form", { x: rowX, y: rowTop + (qrSide - buttonH) / 2, width: buttonW, height: buttonH }, d.contact.button, {
    contactFormTitle: d.contact.title,
    contactFormDescription: d.contact.description,
    contactFields: [
      { id: randomUUID(), label: "Name", type: "text", placeholder: "Your name", required: true },
      { id: randomUUID(), label: "Email", type: "email", placeholder: "you@example.com", required: true },
      { id: randomUUID(), label: "Message", type: "textarea", placeholder: "Write a message (optional)", required: false },
    ],
    privacyPolicyText: "I agree to share these details with the author.",
    showMarketingOptIn: true,
    marketingOptInText: "Send me occasional updates",
  });
  c.qr({ x: qrX, y: rowTop, width: qrSide, height: qrSide }, p.deep);
  c.text("Scan to read", { x: qrX - 20, y: rowTop + qrSide + 1, width: qrSide + 40, height: 16 },
    { min: 6, max: 7, font: d.label, weight: 700, upper: true, spacing: 1, align: "center", color: dark ? p.onDeep : p.soft, lineHeight: 1.2 });
  if (blurb) c.text(blurb, { x: col.x, y: barY + H * 0.03, width: col.width, height: rowTop - 8 - barY - H * 0.03 },
    { min: 10, max: Math.round(unit * 0.036), color: dark ? p.onDeep : p.soft, align, lineHeight: 1.55 });
  c.text(BRAND, { x: col.x, y: H * 0.9, width: col.width, height: H * 0.045 }, { min: 7, max: 9, font: d.label, weight: 700, upper: true, spacing: 2, color: dark ? p.onDeep : p.soft, align });
  return c.slide();
}

/* ----------------------------------------------------------------- index */

/** The Book Index element, sized like the editor's own so both paginate alike. */
function indexData(outline: Outline, size: SizeId) {
  const { width, height } = PAGE_SIZES[size];
  const d = designOf(outline.style, outline.variant);
  const p = paletteOf(outline);
  const boxWidth = Math.round(width * 0.84);
  return {
    type: "text", bookRole: "index", text: d.toc.title, tocTitle: d.toc.title,
    tocStyle: d.toc.style, tocLeader: d.toc.style === "classic" ? "." : "", tocPageAlignment: "right", tocShowRanges: false,
    tocSpacing: 8, tocIndent: 16, tocMarginTop: 16, tocMarginBottom: 16, tocAccentColor: p.accent,
    x: Math.round((width - boxWidth) / 2), y: Math.round(height * 0.09), width: boxWidth, height: Math.round(height * 0.76),
    rotation: 0, opacity: 1, zIndex: 1,
    fontFamily: d.body, fontSize: size === "landscape" ? 14 : 13, fontWeight: 400, lineHeight: 1.4,
    textAlign: "left", letterSpacing: 0, color: p.ink,
  };
}

/** How many pages the index takes; the content page numbers start after it. */
export function indexPageCount(outline: Outline, size: SizeId) {
  const chapters = chapterMarks(outline.pages).filter(Boolean).length;
  const data = indexData(outline, size) as unknown as TextData;
  return paginateBookIndex(Array.from({ length: chapters }, () => ({}) as ChapterEntry), data).length;
}

/** Page 2 onwards: one index element, plus the continuation pages linked to it. */
export function indexPages(outline: Outline, size: SizeId): Slide[] {
  const d = designOf(outline.style, outline.variant);
  const p = paletteOf(outline);
  const data = indexData(outline, size);
  const rootId = randomUUID();
  return Array.from({ length: indexPageCount(outline, size) }, (_, page) => {
    const c = new Page(d, p, size);
    c.elements.push(page === 0 ? { id: rootId, data } : { id: randomUUID(), data: { ...data, indexRootId: rootId, indexPage: page } });
    if (d.look === "summary") c.box(p.accent, { x: 0, y: 0, width: c.width, height: 5 }, 0, 0);
    if (d.look === "magazine") c.box(p.accent, { x: c.pad, y: c.height * 0.055, width: 28, height: 4 }, 0, 0);
    footer(c, outline, page + 2, null);
    return c.slide();
  });
}

/* --------------------------------------------------------------- chrome */

/** Page number and running head, in each design's own way. `onPhoto` puts them in white. */
function footer(c: Page, outline: Outline, pageNumber: number, context: { chapterName?: string; progress?: number } | null, onPhoto = false, area?: Column) {
  const { d, p, height: H } = c;
  // Pages with a photo down one side keep the footer in the writing column.
  const pad = area?.x ?? c.pad;
  const inner = area?.width ?? c.inner;
  const top = c.footerTop + Math.round(H * 0.018);
  const color = onPhoto ? "#ffffff" : p.soft;
  const small = { min: 7, max: 9, font: d.label, color, zIndex: 5 } as const;
  const frame = { x: pad, y: top, width: inner, height: Math.round(H * 0.04) };
  switch (d.look) {
    case "ebook":
      c.text(String(pageNumber), frame, { ...small, font: d.body, align: "center" });
      break;
    case "magazine":
      c.text(two(pageNumber), { ...frame, width: 40 }, { ...small, weight: 700, color: onPhoto ? "#ffffff" : p.ink });
      c.text(outline.title, { x: pad + 44, y: top, width: inner - 44, height: frame.height }, { ...small, upper: true, spacing: 1.2, align: "right" });
      break;
    case "summary": {
      const track = Math.round(inner - 36);
      c.box(onPhoto ? "#ffffff" : p.tint, { x: pad, y: top + 5, width: track, height: 4 }, 2, 4, onPhoto ? 0.5 : 1);
      c.box(onPhoto ? "#ffffff" : p.accent, { x: pad, y: top + 5, width: Math.max(6, track * (context?.progress ?? 0)), height: 4 }, 2, 5);
      c.text(String(pageNumber), { x: pad + track, y: top, width: 36, height: frame.height }, { ...small, weight: 700, align: "right" });
      break;
    }
    case "guide":
      c.text(String(pageNumber), frame, { ...small, weight: 700, color: onPhoto ? "#ffffff" : p.accent, align: "right" });
      break;
    case "workbook":
      c.badge(String(pageNumber), pad + inner / 2, top + frame.height / 2, 20, onPhoto ? "#ffffff" : p.tint, onPhoto ? p.ink : p.accent);
      break;
    case "lookbook":
      c.text(outline.title, { ...frame, width: inner * 0.7 }, { ...small, upper: true, spacing: 2 });
      c.text(`— ${two(pageNumber)}`, { x: pad + inner * 0.7, y: top, width: inner * 0.3, height: frame.height }, { ...small, spacing: 1, align: "right" });
      break;
  }
}

/* ----------------------------------------------------------------- pages */

type Column = { x: number; width: number };
type Ctx = {
  c: Page; d: Design; p: Palette; copy: PageCopy; outline: Outline;
  index: number; pageNumber: number; chapter: ChapterMark; chapterName: string;
  photo: (n: number) => string | undefined;
  /** Top of the writing area, below any running head. */
  top: number;
  /** The heading; on a chapter's first page it is the editor's Chapter element with its label above. */
  title: (frame: Frame, options?: Partial<TextOptions> & { labelColor?: string }) => void;
  finish: (onPhoto?: boolean, area?: Column) => Slide;
};

/**
 * A content page. `index` is its place among the content pages (it varies the
 * photos and the side of split layouts); `pageNumber` is its real page in the
 * finished book; `chapter` is set when the page opens a chapter.
 */
export function contentPage(copy: PageCopy, requested: Layout, outline: Outline, size: SizeId, index: number, photos: string[], pageNumber = index, chapter: ChapterMark = null): Slide {
  const d = designOf(outline.style, outline.variant);
  const p = paletteOf(outline);
  const c = new Page(d, p, size);
  const heading = chapter ? chapter.title : copy.heading;
  const chapterName = outline.pages[index - 1]?.chapter || chapter?.title || "";
  const total = Math.max(1, outline.pages.length);

  // Each page walks the photo list from a different place, so neighbouring pages
  // do not repeat a picture.
  const photo = (n: number) => photos.length ? photos[(index * 3 + n) % photos.length] : undefined;
  let layout: Layout = LAYOUTS.includes(requested) ? requested : "text";
  if (PHOTO_LAYOUTS.has(layout) && !photo(0)) layout = d.id === "summary" ? "keyidea" : layout === "gallery" || layout === "mosaic" ? "bullets" : "text";
  if ((layout === "gallery" || layout === "mosaic") && photos.length < 2) layout = "split";
  if (chapter && layout === "quote") layout = "text";

  const top = Math.round(c.height * (d.look === "ebook" || d.look === "guide" ? 0.12 : 0.085));
  const ctx: Ctx = {
    c, d, p, copy, outline, index, pageNumber, chapter, chapterName, photo, top,
    title(frame, options = {}) {
      const { labelColor, ...rest } = options;
      const element = c.heading(heading, frame, rest);
      if (!element) return;
      if (chapter) {
        Object.assign(element.data, { bookRole: "chapter", chapterSubtitle: "", chapterAutoNumber: true });
        const size = Math.max(8, Math.round(c.unit * 0.024));
        const height = Math.round(size * 1.6);
        c.text(d.chapterLabel(chapter.number), { x: frame.x, y: frame.y - height - 3, width: frame.width, height },
          { min: 7, max: size, lineHeight: 1.3, font: d.label, weight: 700, upper: d.look !== "ebook", italic: d.look === "ebook",
            spacing: d.look === "ebook" ? 0.5 : d.labelSpacing, color: labelColor ?? p.accent, align: rest.align, zIndex: rest.zIndex });
      }
    },
    finish(onPhoto = false, area?: Column) {
      // Running heads: the book's title in a printed book, the section tab in a guide.
      if (d.look === "ebook" && !chapter && !onPhoto) {
        c.text(outline.title, { x: area?.x ?? c.pad, y: c.height * 0.045, width: area?.width ?? c.inner, height: c.height * 0.04 },
          { min: 7, max: 9, font: d.body, upper: true, spacing: 1.5, color: p.soft, align: "center" });
      }
      // A chapter's first page already carries its name as the heading.
      if (d.look === "guide" && chapterName && !chapter && !onPhoto) c.pill(chapterName.slice(0, 32), area?.x ?? c.pad, c.height * 0.04, p.tint, p.accent);
      if (d.look === "summary" && !onPhoto) c.box(p.accent, { x: 0, y: 0, width: c.width, height: 5 }, 0, 0);
      footer(c, outline, pageNumber, { chapterName, progress: index / total }, onPhoto, area);
      return c.slide();
    },
  };

  switch (layout) {
    case "hero": return hero(ctx);
    case "split": return split(ctx);
    case "gallery": return d.look === "lookbook" ? mosaic(ctx) : gallery(ctx);
    case "quote": return quote(ctx);
    case "bullets": return bullets(ctx);
    case "steps": return steps(ctx);
    case "checklist": return checklist(ctx);
    case "exercise": return exercise(ctx);
    case "keyidea": return keyIdea(ctx);
    case "feature": return feature(ctx);
    case "mosaic": return mosaic(ctx);
    case "fullbleed": return fullBleed(ctx);
    case "quiz": return copy.quiz?.length ? quiz(ctx) : bullets(ctx);
    case "table": return copy.table ? table(ctx) : bullets(ctx);
    case "chart": return copy.chart ? chart(ctx) : bullets(ctx);
    default: return text(ctx);
  }
}

/** Where the words start below a heading of the given height, after the design's divider. */
function underHeading(x: Ctx, headingBottom: number, left: number, align: "left" | "center" = "left") {
  const { c, d, p } = x;
  const y = headingBottom + Math.round(c.gap * 0.35);
  if (d.look === "lookbook") return y + Math.round(c.gap * 0.3);
  if (d.look === "ebook") {
    c.text("✦", { x: align === "center" ? c.pad : left, y, width: align === "center" ? c.inner : 32, height: 16 }, { min: 9, max: 11, color: p.accent, align });
    return y + 20;
  }
  c.rule(align === "center" ? c.width / 2 - c.width * 0.04 : left, y, Math.round(c.width * 0.08), p.accent, d.look === "summary" || d.look === "workbook" ? 4 : 3);
  return y + Math.round(c.gap * 0.8) + 3;
}

/** Splits a column between the intro and the body in proportion to their length. */
function introAndBody(x: Ctx, frame: Frame, options: { introColor?: string; bodyColor?: string; align?: string } = {}) {
  const { c, copy, p } = x;
  const share = copy.body ? Math.min(0.6, Math.max(0.3, copy.intro.length / (copy.intro.length + copy.body.length))) : 1;
  const introHeight = Math.round(frame.height * share);
  c.prose(copy.intro, { ...frame, height: introHeight }, { color: options.introColor ?? p.ink, ...(options.align ? { align: options.align } : {}) });
  const bodyTop = frame.y + introHeight + Math.round(c.gap * 0.5);
  if (copy.body) c.prose(copy.body, { ...frame, y: bodyTop, height: frame.y + frame.height - bodyTop },
    { color: options.bodyColor ?? p.soft, max: c.body.max - 1, ...(options.align ? { align: options.align } : {}) });
}

function text(x: Ctx): Slide {
  const { c, d, p, copy, chapter } = x;
  const { pad, inner, height: H, gap } = c;
  const first = x.photo(0);
  const center = (d.look === "ebook" && Boolean(chapter)) || d.look === "lookbook";
  let top = x.top;
  if (d.look === "ebook" && chapter) top = Math.round(H * 0.2);
  if (d.id === "workbook" && !chapter) { c.pill("Lesson", pad, top, p.tint, p.accent); top += Math.round(c.unit * 0.05) + Math.round(gap * 0.6); }
  const headingH = Math.round(H * 0.13);
  x.title({ x: pad, y: top, width: inner, height: headingH }, { align: center ? "center" : "left" });
  const start = underHeading(x, top + headingH, pad, center ? "center" : "left");

  // Printed books and summaries are words only; the rest close on a photo band.
  const band = first && d.look !== "ebook" && d.look !== "summary" ? Math.round(H * 0.25) : 0;
  const bottom = c.footerTop - 8 - (band ? band + gap : 0);
  if (d.look === "summary" && copy.body) {
    // The explanation, then why it matters on a tinted card.
    const introH = Math.round((bottom - start) * 0.42);
    c.prose(copy.intro, { x: pad, y: start, width: inner, height: introH }, { color: p.ink });
    const cardY = start + introH + gap * 0.5;
    c.box(p.tint, { x: pad, y: cardY, width: inner, height: bottom - cardY }, d.radius, 0);
    const labelH = c.label("Why it matters", pad + gap, cardY + gap * 0.8, inner - gap * 2);
    c.prose(copy.body, { x: pad + gap, y: cardY + gap * 0.8 + labelH + 4, width: inner - gap * 2, height: bottom - cardY - gap * 1.6 - labelH - 4 }, { color: p.ink, max: c.body.max - 1 });
  } else {
    introAndBody(x, { x: pad, y: start, width: inner, height: bottom - start }, d.look === "ebook" ? { bodyColor: p.ink } : center ? { align: "center" } : {});
  }
  if (band && first) c.photo(first, { x: pad, y: c.footerTop - 8 - band, width: inner, height: band });
  return x.finish();
}

function split(x: Ctx): Slide {
  const { c, d, p, copy, index } = x;
  const { pad, inner, width: W, height: H, gap } = c;
  const first = x.photo(0)!;
  const bleed = d.look !== "ebook";

  if (!c.wide) {
    // Portrait: the photo across the top, the words below.
    const photoH = Math.round(H * (d.look === "lookbook" ? 0.5 : 0.4));
    if (bleed && d.look !== "lookbook") c.photo(first, { x: 0, y: 0, width: W, height: photoH }, 0, 0);
    else c.photo(first, { x: pad, y: x.top, width: inner, height: photoH - x.top }, 0, 1);
    let y = photoH + gap * 0.9;
    if (d.look === "magazine" && x.chapterName) { c.pill(x.chapterName.slice(0, 28), pad, photoH - 11, p.accent, "#ffffff"); y += 6; }
    if (copy.caption && (d.look === "ebook" || d.look === "lookbook")) {
      c.text(copy.caption, { x: pad, y: photoH + 4, width: inner, height: 18 }, { min: 8, max: 10, italic: d.look === "ebook", upper: d.look === "lookbook", spacing: d.look === "lookbook" ? 1.5 : 0, color: p.soft, font: d.look === "lookbook" ? d.label : d.body });
      y += 16;
    }
    if (x.chapter) y += Math.round(c.unit * 0.04);
    const headingH = Math.round(H * 0.11);
    x.title({ x: pad, y, width: inner, height: headingH });
    const start = underHeading(x, y + headingH, pad);
    introAndBody(x, { x: pad, y: start, width: inner, height: c.footerTop - 8 - start });
    return x.finish();
  }

  // Wide and square pages: photo down one side, sides alternating by page.
  const imageLeft = index % 2 === 1;
  const imageW = Math.round(W * (d.look === "lookbook" ? 0.56 : 0.46));
  const photoFrame = bleed ? { x: imageLeft ? 0 : W - imageW, y: 0, width: imageW, height: H } : { x: imageLeft ? pad : W - pad - imageW, y: x.top, width: imageW - pad, height: c.footerTop - 8 - x.top };
  c.photo(first, photoFrame, bleed ? 0 : d.radius, 0);
  const textX = imageLeft ? photoFrame.x + photoFrame.width + gap * 1.2 : pad;
  const textW = (imageLeft ? W - pad - textX : photoFrame.x - gap * 1.2 - pad);
  let y = Math.round(H * 0.12);
  if (d.look === "lookbook") {
    c.text(two(index), { x: textX, y, width: textW, height: H * 0.12 }, { min: 20, max: Math.round(c.unit * 0.1), font: d.display, italic: true, color: p.accent });
    y += Math.round(H * 0.14);
  }
  if (d.look === "magazine" && x.chapterName) { c.pill(x.chapterName.slice(0, 24), textX, y, p.accent, "#ffffff"); y += Math.round(c.unit * 0.05) + gap * 0.5; }
  if (x.chapter) y += Math.round(c.unit * 0.04);
  const headingH = Math.round(H * 0.18);
  x.title({ x: textX, y, width: textW, height: headingH });
  const start = underHeading(x, y + headingH, textX);
  const captionH = copy.caption && d.look === "lookbook" ? 22 : 0;
  introAndBody(x, { x: textX, y: start, width: textW, height: c.footerTop - 8 - start - captionH });
  if (captionH && copy.caption) c.text(copy.caption, { x: textX, y: c.footerTop - 8 - captionH, width: textW, height: captionH }, { min: 7, max: 9, font: d.label, upper: true, spacing: 1.5, color: p.soft });
  return x.finish(false, bleed ? { x: textX, width: textW } : undefined);
}

function hero(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, width: W, height: H, gap } = c;
  const first = x.photo(0)!;
  if (d.look === "lookbook") return fullBleed(x);

  if (d.look === "guide" || d.look === "workbook" || d.look === "summary") {
    // A big rounded photo card, the words underneath.
    const photoH = Math.round(H * 0.46);
    c.photo(first, { x: pad, y: x.top + (d.look === "guide" ? 10 : 0), width: inner, height: photoH }, d.radius + 4, 1);
    let y = x.top + photoH + gap * (d.look === "guide" ? 1.3 : 1);
    if (x.chapter) y += Math.round(c.unit * 0.04);
    const headingH = Math.round(H * 0.12);
    x.title({ x: pad, y, width: inner, height: headingH });
    c.prose(copy.intro, { x: pad, y: y + headingH + gap * 0.4, width: inner, height: c.footerTop - 8 - (y + headingH + gap * 0.4) }, { color: p.soft });
    return x.finish();
  }

  // Printed book and magazine: the photo fills the page.
  c.photo(first, { x: 0, y: 0, width: W, height: H }, 0, 0);
  if (d.look === "ebook") {
    c.box("#000000", { x: 0, y: 0, width: W, height: H }, 0, 1, 0.42);
    const headingH = Math.round(H * 0.18);
    x.title({ x: pad * 1.5, y: H * 0.36, width: W - pad * 3, height: headingH }, { color: "#ffffff", align: "center", zIndex: 3, labelColor: "#f1e7d6" });
    c.text("✦", { x: pad, y: H * 0.36 + headingH + 4, width: inner, height: 16 }, { min: 9, max: 11, color: "#f1e7d6", align: "center", zIndex: 3 });
    c.prose(copy.intro, { x: pad * 1.5, y: H * 0.36 + headingH + 26, width: W - pad * 3, height: H * 0.22 }, { color: "#f6efe4", align: "center", italic: true, zIndex: 3 });
    return x.finish(true);
  }
  c.box(p.deep, { x: 0, y: H * 0.5, width: W, height: H * 0.5 }, 0, 1, 0.7);
  const tag = c.pill(x.chapterName ? x.chapterName.slice(0, 26) : "Feature", pad, H * 0.54, p.accent, "#ffffff");
  let y = tag.y + tag.height + gap * 0.6;
  if (x.chapter) y += Math.round(c.unit * 0.04);
  x.title({ x: pad, y, width: c.wide ? inner * 0.7 : inner, height: H * 0.16 }, { color: "#ffffff", zIndex: 3, labelColor: "#ffffff" });
  c.prose(copy.intro, { x: pad, y: y + H * 0.17, width: c.wide ? inner * 0.7 : inner, height: c.footerTop - 8 - (y + H * 0.17) }, { color: "#ececec", zIndex: 3 });
  return x.finish(true);
}

function gallery(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  const [first, second, third, fourth] = [x.photo(0)!, x.photo(1)!, x.photo(2), x.photo(3)];
  const y = x.top + (x.chapter ? Math.round(c.unit * 0.04) : 0);
  const headingH = Math.round(H * 0.12);
  const center = d.look === "ebook";
  x.title({ x: pad, y, width: inner, height: headingH }, { align: center ? "center" : "left" });
  const start = underHeading(x, y + headingH, pad, center ? "center" : "left");
  const gridTop = Math.round(Math.max(start + H * 0.1, H * 0.42));
  c.prose(copy.intro, { x: pad, y: start, width: inner, height: gridTop - start - 8 }, { color: p.soft, ...(center ? { align: "center" } : {}) });
  const captionH = copy.caption ? 20 : 0;
  const gridH = c.footerTop - 8 - gridTop - captionH;
  const g = Math.round(gap * (d.look === "magazine" ? 0.4 : 0.8));
  const half = Math.round((inner - g) / 2);
  const row = Math.round((gridH - g) / 2);
  if (fourth && c.wide) {
    // Wide pages: one tall photo and three beside it.
    const big = Math.round(inner * 0.46);
    const small = Math.round((inner - big - g * 2) / 2);
    c.photo(first, { x: pad, y: gridTop, width: big, height: gridH });
    c.photo(second, { x: pad + big + g, y: gridTop, width: small * 2 + g, height: row });
    c.photo(third || first, { x: pad + big + g, y: gridTop + row + g, width: small, height: row });
    c.photo(fourth, { x: pad + big + g * 2 + small, y: gridTop + row + g, width: small, height: row });
  } else {
    c.photo(first, { x: pad, y: gridTop, width: half, height: gridH });
    c.photo(second, { x: pad + half + g, y: gridTop, width: half, height: row });
    c.photo(third || first, { x: pad + half + g, y: gridTop + row + g, width: half, height: row });
  }
  if (copy.caption) c.text(copy.caption, { x: pad, y: c.footerTop - 6 - captionH, width: inner, height: captionH },
    { min: 8, max: 10, italic: d.look === "ebook" || d.look === "magazine", color: p.soft, align: center ? "center" : "left" });
  return x.finish();
}

function mosaic(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  const [first, second, third] = [x.photo(0)!, x.photo(1)!, x.photo(2) ?? x.photo(0)!];
  const g = Math.round(gap * 0.5);
  const words = copy.caption || copy.intro;
  if (c.wide) {
    // Words in a narrow column, three photos as a collage beside them.
    const textW = Math.round(inner * 0.3);
    const gridX = pad + textW + gap;
    const gridW = inner - textW - gap;
    const gridY = Math.round(H * 0.08);
    const gridH = c.footerTop - 8 - gridY;
    const big = Math.round(gridW * 0.58);
    const row = Math.round((gridH - g) / 2);
    c.photo(first, { x: gridX, y: gridY, width: big, height: gridH }, d.radius);
    c.photo(second, { x: gridX + big + g, y: gridY, width: gridW - big - g, height: row }, d.radius);
    c.photo(third, { x: gridX + big + g, y: gridY + row + g, width: gridW - big - g, height: gridH - row - g }, d.radius);
    let y = Math.round(H * 0.3);
    if (x.chapter) y += Math.round(c.unit * 0.04);
    x.title({ x: pad, y, width: textW, height: H * 0.2 }, { max: Math.round(c.headingMax * 0.9) });
    c.text(words, { x: pad, y: y + H * 0.22, width: textW, height: c.footerTop - 8 - (y + H * 0.22) }, { min: 9, max: c.body.min + 1, color: p.soft, lineHeight: 1.6 });
    return x.finish();
  }
  const y = x.top + (x.chapter ? Math.round(c.unit * 0.04) : 0);
  const headingH = Math.round(H * 0.1);
  x.title({ x: pad, y, width: inner, height: headingH }, { max: Math.round(c.headingMax * 0.9) });
  const gridY = y + headingH + gap * 0.5;
  const captionH = Math.round(H * 0.1);
  const gridH = c.footerTop - 8 - gridY - captionH - gap * 0.5;
  const big = Math.round(inner * 0.58);
  const row = Math.round((gridH - g) / 2);
  c.photo(first, { x: pad, y: gridY, width: big, height: gridH }, d.radius);
  c.photo(second, { x: pad + big + g, y: gridY, width: inner - big - g, height: row }, d.radius);
  c.photo(third, { x: pad + big + g, y: gridY + row + g, width: inner - big - g, height: gridH - row - g }, d.radius);
  c.text(words, { x: pad, y: c.footerTop - 8 - captionH, width: inner, height: captionH }, { min: 9, max: c.body.min + 1, color: p.soft, lineHeight: 1.5 });
  return x.finish();
}

function fullBleed(x: Ctx): Slide {
  const { c, d, copy, index } = x;
  const { pad, inner, width: W, height: H } = c;
  c.photo(x.photo(0)!, { x: 0, y: 0, width: W, height: H }, 0, 0);
  c.box("#000000", { x: 0, y: 0, width: W, height: H * 0.14 }, 0, 1, 0.22);
  c.box("#000000", { x: 0, y: H * 0.56, width: W, height: H * 0.44 }, 0, 1, 0.38);
  c.text(`N° ${two(index)}`, { x: pad, y: H * 0.05, width: inner, height: H * 0.05 }, { min: 7, max: 10, font: d.label, weight: 700, spacing: 2, color: "#ffffff", zIndex: 3 });
  const headingH = Math.round(H * 0.15);
  const y = Math.round(H * 0.64);
  x.title({ x: pad, y, width: c.wide ? inner * 0.65 : inner, height: headingH }, { color: "#ffffff", zIndex: 3, labelColor: "#ffffff", max: Math.round(c.unit * 0.1) });
  const words = copy.caption || copy.intro;
  c.text(words, { x: pad, y: y + headingH + 4, width: c.wide ? inner * 0.6 : inner, height: c.footerTop - 6 - (y + headingH + 4) },
    { min: 8, max: 11, font: d.label, upper: true, spacing: 1.2, lineHeight: 1.6, color: "#f2f2f2", zIndex: 3 });
  return x.finish(true);
}

function quote(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, width: W, height: H, gap } = c;
  const line = `“${copy.quote || copy.intro}”`;
  const first = x.photo(0);
  const big = Math.round(c.headingMax * 0.95);

  if (d.look === "ebook" || d.look === "lookbook") {
    // Centred on the page with room around it, like an epigraph.
    const photoH = d.look === "lookbook" && first ? Math.round(H * 0.3) : 0;
    if (photoH && first) c.photo(first, { x: W / 2 - photoH * 0.4, y: x.top, width: photoH * 0.8, height: photoH }, 0);
    const y = photoH ? x.top + photoH + gap : H * 0.24;
    c.text(line, { x: pad * 1.3, y, width: W - pad * 2.6, height: H * 0.34 }, { min: 13, max: big, font: d.display, italic: true, lineHeight: 1.3, color: p.ink, align: "center" });
    const after = y + H * 0.36;
    c.text("✦", { x: pad, y: after, width: inner, height: 16 }, { min: 9, max: 11, color: p.accent, align: "center" });
    if (copy.body) c.prose(copy.body, { x: pad * 1.5, y: after + 22, width: W - pad * 3, height: c.footerTop - 8 - after - 22 }, { color: p.soft, align: "center" });
    return x.finish();
  }
  if (d.look === "magazine") {
    // A pull quote: a huge accent mark, the line in the display face.
    const photoH = first ? Math.round(H * (c.wide ? 1 : 0.36)) : 0;
    const textX = c.wide && first ? Math.round(W * 0.45) + gap : pad;
    const textW = c.wide && first ? W - pad - textX : inner;
    if (first) c.photo(first, c.wide ? { x: 0, y: 0, width: Math.round(W * 0.45), height: H } : { x: 0, y: 0, width: W, height: photoH }, 0, 0);
    const y = c.wide || !first ? H * 0.12 : photoH + gap * 0.6;
    c.text("“", { x: textX, y, width: 60, height: Math.round(c.unit * 0.16) }, { min: 30, max: Math.round(c.unit * 0.16), font: d.display, weight: 700, lineHeight: 1, color: p.accent });
    const qy = y + c.unit * 0.12;
    c.text(copy.quote || copy.intro, { x: textX, y: qy, width: textW, height: H * 0.32 }, { min: 13, max: big, font: d.display, weight: 700, italic: true, lineHeight: 1.2, color: p.ink });
    c.rule(textX, qy + H * 0.33, 28, p.accent);
    if (copy.body) c.prose(copy.body, { x: textX, y: qy + H * 0.36, width: textW, height: c.footerTop - 8 - qy - H * 0.36 }, { color: p.soft });
    return x.finish(false, c.wide && first ? { x: textX, width: textW } : undefined);
  }
  // Summary, guide and workbook: the line on a card.
  const deep = d.look === "summary";
  const cardY = x.top;
  const cardH = Math.round(H * (first && !deep ? 0.4 : 0.48));
  c.box(deep ? p.deep : p.tint, { x: pad, y: cardY, width: inner, height: cardH }, d.radius, 0);
  const labelH = c.label(deep ? "Worth remembering" : "Remember", pad + gap, cardY + gap, inner - gap * 2, { color: deep ? p.onDeep : p.accent });
  c.text(line, { x: pad + gap, y: cardY + gap + labelH + 6, width: inner - gap * 2, height: cardH - gap * 2 - labelH - 6 },
    { min: 12, max: Math.round(big * 0.9), font: d.display, weight: 700, lineHeight: 1.3, color: deep ? p.onDeep : p.ink });
  let y = cardY + cardH + gap;
  if (first && !deep) { const strip = Math.round(H * 0.22); c.photo(first, { x: pad, y, width: inner, height: strip }); y += strip + gap; }
  if (copy.body && c.footerTop - y > 24) c.prose(copy.body, { x: pad, y, width: inner, height: c.footerTop - 8 - y }, { color: p.soft });
  return x.finish();
}

/** Lists, marked the way each design marks them. */
function bullets(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  const first = x.photo(0);
  const y = x.top + (x.chapter ? Math.round(c.unit * 0.04) : 0);
  const headingH = Math.round(H * 0.12);
  x.title({ x: pad, y, width: inner, height: headingH });
  const start = underHeading(x, y + headingH, pad);
  const introH = Math.round(H * 0.12);
  c.prose(copy.intro, { x: pad, y: start, width: inner, height: introH }, { color: p.soft });
  const items = (copy.bullets?.length ? copy.bullets : [copy.body || copy.intro]).slice(0, 5);
  let listTop = start + introH + gap * 0.5;
  const bottom = c.footerTop - 8;
  // A photo beside the list on wide pages, where there is room for both.
  const photoW = first && c.landscape && d.look !== "summary" ? Math.round(inner * 0.36) : 0;
  const listW = inner - (photoW ? photoW + gap : 0);
  if (photoW && first) c.photo(first, { x: pad + listW + gap, y: listTop, width: photoW, height: bottom - listTop });

  if (d.look === "guide" || d.look === "workbook") {
    // A tinted tips box.
    c.box(p.tint, { x: pad, y: listTop, width: listW, height: bottom - listTop }, d.radius, 0);
    const labelH = c.label(d.id === "guide" ? "Pro tips" : d.id === "workbook" ? "Try this" : "Key points", pad + gap, listTop + gap * 0.7, listW - gap * 2);
    listTop += gap * 0.7 + labelH + 4;
    const row = Math.floor((bottom - gap * 0.5 - listTop) / items.length);
    items.forEach((item, i) => {
      const ry = listTop + i * row;
      c.badge("✓", pad + gap + 8, ry + 10, 16, p.accent, "#ffffff");
      c.text(item, { x: pad + gap + 20, y: ry, width: listW - gap * 2 - 20, height: row - 4 }, { min: c.body.min - 1, max: c.body.max - 1, color: p.ink, lineHeight: 1.4 });
    });
    return x.finish();
  }
  const row = Math.floor((bottom - listTop) / items.length);
  items.forEach((item, i) => {
    const ry = listTop + i * row;
    if (d.look === "summary") {
      c.box(p.tint, { x: pad, y: ry, width: listW, height: row - 6 }, 10, 0);
      c.text(two(i + 1), { x: pad + 10, y: ry + 6, width: 30, height: 22 }, { min: 12, max: 15, font: d.display, weight: 700, color: p.accent });
      c.text(item, { x: pad + 44, y: ry + 6, width: listW - 54, height: row - 16 }, { min: c.body.min - 1, max: c.body.max - 1, color: p.ink, lineHeight: 1.35 });
    } else if (d.look === "magazine") {
      c.text(two(i + 1), { x: pad, y: ry, width: 40, height: Math.min(row, 34) }, { min: 14, max: 24, font: d.display, weight: 700, lineHeight: 1, color: p.accent });
      c.text(item, { x: pad + 44, y: ry + 2, width: listW - 44, height: row - 8 }, { min: c.body.min - 1, max: c.body.max, color: p.ink, lineHeight: 1.35 });
      if (i < items.length - 1) c.box(p.ink, { x: pad, y: ry + row - 4, width: listW, height: 1 }, 0, 1, 0.15);
    } else {
      // Printed book and lookbook: a quiet dash.
      c.text("—", { x: pad - TEXT_PADDING, y: ry, width: 30, height: 22 }, { min: 11, max: 13, color: p.accent });
      c.text(item, { x: pad + 16, y: ry, width: listW - 16, height: row - 4 }, { min: c.body.min, max: c.body.max, color: p.ink, font: d.body });
    }
  });
  return x.finish();
}

function steps(x: Ctx): Slide {
  const { c, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  const first = x.photo(0);
  const y = x.top + (x.chapter ? Math.round(c.unit * 0.04) : 0) + 10;
  const photoW = first && c.landscape ? Math.round(inner * 0.38) : 0;
  const colW = inner - (photoW ? photoW + gap : 0);
  if (photoW && first) c.photo(first, { x: pad + colW + gap, y, width: photoW, height: c.footerTop - 8 - y }, c.d.radius);
  const headingH = Math.round(H * 0.11);
  x.title({ x: pad, y, width: colW, height: headingH });
  const start = underHeading(x, y + headingH, pad);
  const introH = Math.round(H * 0.1);
  c.prose(copy.intro, { x: pad, y: start, width: colW, height: introH }, { color: p.soft });
  const items = (copy.bullets?.length ? copy.bullets : [copy.body || copy.intro]).slice(0, 4);
  const listTop = start + introH + gap * 0.4;
  const row = Math.floor((c.footerTop - 8 - listTop) / items.length);
  const dot = Math.round(Math.min(28, c.unit * 0.068));
  // The connector runs behind the numbers.
  if (items.length > 1) c.box(p.tint, { x: pad + dot / 2 - 1, y: listTop + dot / 2, width: 3, height: row * (items.length - 1) }, 0, 1);
  items.forEach((item, i) => {
    const ry = listTop + i * row;
    c.badge(String(i + 1), pad + dot / 2, ry + dot / 2, dot, p.accent, "#ffffff");
    c.label(`Step ${i + 1}`, pad + dot + 10, ry, colW - dot - 10);
    c.text(item, { x: pad + dot + 10, y: ry + 16, width: colW - dot - 10, height: row - 20 }, { min: c.body.min - 1, max: c.body.max, color: p.ink, lineHeight: 1.35 });
  });
  return x.finish();
}

function checklist(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  const y = x.top + (x.chapter ? Math.round(c.unit * 0.04) : 0) + (d.look === "guide" ? 10 : 0);
  const headingH = Math.round(H * 0.11);
  x.title({ x: pad, y, width: inner, height: headingH });
  const start = underHeading(x, y + headingH, pad);
  const introH = Math.round(H * 0.1);
  c.prose(copy.intro, { x: pad, y: start, width: inner, height: introH }, { color: p.soft });
  const items = (copy.bullets?.length ? copy.bullets : [copy.body || copy.intro]).slice(0, 6);
  const cardY = start + introH + gap * 0.4;
  const bottom = c.footerTop - 8;
  c.box(d.look === "workbook" ? p.paper : p.tint, { x: pad, y: cardY, width: inner, height: bottom - cardY }, d.radius, 0);
  if (d.look === "workbook") {
    // An outlined card on the workbook's cream page.
    c.box(p.tint, { x: pad, y: cardY, width: inner, height: bottom - cardY }, d.radius, 0);
    c.box(p.paper, { x: pad + 2, y: cardY + 2, width: inner - 4, height: bottom - cardY - 4 }, d.radius - 2, 0);
  }
  const row = Math.floor((bottom - cardY - gap) / items.length);
  const side = 14;
  items.forEach((item, i) => {
    const ry = cardY + gap * 0.5 + i * row;
    c.checkbox(pad + gap, ry + 3, side, p.accent, d.look === "workbook" ? p.paper : "#ffffff");
    c.text(item, { x: pad + gap + side + 10, y: ry, width: inner - gap * 2 - side - 10, height: row - 4 }, { min: c.body.min - 1, max: c.body.max, color: p.ink, lineHeight: 1.35 });
    if (i < items.length - 1) c.box(p.soft, { x: pad + gap, y: ry + row - 3, width: inner - gap * 2, height: 1 }, 0, 1, 0.18);
  });
  return x.finish();
}

function exercise(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  let y = x.top;
  if (!x.chapter) { c.pill("Exercise", pad, y, p.accent, "#ffffff"); y += Math.round(c.unit * 0.05) + gap * 0.6; }
  else y += Math.round(c.unit * 0.04);
  const headingH = Math.round(H * 0.1);
  x.title({ x: pad, y, width: inner, height: headingH });
  const introY = y + headingH + gap * 0.3;
  const introH = Math.round(H * 0.12);
  c.prose(copy.intro, { x: pad, y: introY, width: inner, height: introH }, { color: p.soft });
  const prompts = (copy.bullets?.length ? copy.bullets : [copy.body || "Write your answer below."]).slice(0, 2);
  const top = introY + introH + gap * 0.4;
  const bottom = c.footerTop - 8;
  const columns = c.wide && prompts.length > 1 && c.width > 600 ? 2 : 1;
  const cardW = columns === 2 ? (inner - gap) / 2 : inner;
  const cardH = columns === 2 ? bottom - top : (bottom - top - gap * (prompts.length - 1)) / prompts.length;
  prompts.forEach((prompt, i) => {
    const cx = pad + (columns === 2 ? i * (cardW + gap) : 0);
    const cy = columns === 2 ? top : top + i * (cardH + gap);
    c.box(p.tint, { x: cx, y: cy, width: cardW, height: cardH }, d.radius, 0);
    const promptH = Math.round(Math.min(cardH * 0.4, c.unit * 0.1));
    c.text(prompt, { x: cx + gap * 0.8, y: cy + gap * 0.6, width: cardW - gap * 1.6, height: promptH }, { min: c.body.min - 1, max: c.body.max - 1, weight: 700, color: p.ink, lineHeight: 1.3 });
    // Writing lines for a printed copy, and a button to answer online, which reaches the author's Leads.
    const buttonH = 28;
    const buttonY = cy + cardH - buttonH - gap * 0.5;
    for (let ly = cy + gap * 0.6 + promptH + 20; ly < buttonY - 8; ly += 22) {
      c.box(p.soft, { x: cx + gap * 0.8, y: ly, width: cardW - gap * 1.6, height: 1 }, 0, 1, 0.35);
    }
    const buttonW = Math.min(cardW - gap * 1.6, 132);
    c.action("question", { x: cx + cardW - gap * 0.8 - buttonW, y: buttonY, width: buttonW, height: buttonH }, "Answer online",
      { fontSize: 11, questionTitle: copy.heading, questionText: prompt, questionPlaceholder: "Type your answer here…" });
  });
  return x.finish();
}

function keyIdea(x: Ctx): Slide {
  const { c, d, p, copy, outline, index } = x;
  const { pad, inner, height: H, gap } = c;
  // Key ideas are numbered through the whole summary.
  const number = outline.pages.slice(0, index).filter(page => page.layout === "keyidea").length || 1;
  let y = x.top;
  const numberH = Math.round(c.unit * 0.13);
  c.text(two(number), { x: pad, y, width: numberH * 1.4, height: numberH }, { min: 24, max: Math.round(c.unit * 0.12), font: d.display, weight: 700, lineHeight: 1, color: p.accent });
  c.label("Key idea", pad + numberH * 1.35, y + numberH * 0.3, inner - numberH * 1.35, { color: p.soft });
  y += numberH + gap * 0.3 + (x.chapter ? Math.round(c.unit * 0.04) : 0);
  const headingH = Math.round(H * 0.12);
  x.title({ x: pad, y, width: inner, height: headingH });
  const start = y + headingH + gap * 0.4;
  const bottom = c.footerTop - 8;
  const cardH = copy.body ? Math.round((bottom - start) * 0.42) : 0;
  c.prose(copy.intro, { x: pad, y: start, width: inner, height: bottom - start - (cardH ? cardH + gap : 0) }, { color: p.ink });
  if (copy.body) {
    const cardY = bottom - cardH;
    c.box(p.tint, { x: pad, y: cardY, width: inner, height: cardH }, d.radius, 0);
    c.box(p.accent, { x: pad, y: cardY, width: 5, height: cardH }, 2, 1);
    const labelH = c.label("Takeaway", pad + gap, cardY + gap * 0.7, inner - gap * 2);
    c.prose(copy.body, { x: pad + gap, y: cardY + gap * 0.7 + labelH + 4, width: inner - gap * 2, height: cardH - gap * 1.4 - labelH - 4 }, { color: p.ink, weight: 700, max: c.body.max - 1 });
  }
  return x.finish();
}

function feature(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, width: W, height: H, gap } = c;
  const first = x.photo(0)!;
  const kicker = (x.chapterName || "Feature").slice(0, 26);
  if (c.landscape) {
    // Landscape: the photo takes the left half, the article the right.
    const photoW = Math.round(W * 0.5);
    c.photo(first, { x: 0, y: 0, width: photoW, height: H }, 0, 0);
    const tx = photoW + gap * 1.2;
    const tw = W - pad - tx;
    const tag = c.pill(kicker, tx, H * 0.1, p.accent, "#ffffff");
    let y = tag.y + tag.height + gap * 0.6;
    if (x.chapter) y += Math.round(c.unit * 0.04);
    x.title({ x: tx, y, width: tw, height: H * 0.2 });
    y += H * 0.21;
    c.prose(copy.intro, { x: tx, y, width: tw, height: H * 0.13 }, { italic: true, color: p.soft, font: d.display });
    y += H * 0.14;
    c.rule(tx, y, tw, p.ink, 1);
    c.prose(copy.body || copy.caption, { x: tx, y: y + 8, width: tw, height: c.footerTop - 8 - y - 8 }, { color: p.ink, max: c.body.max - 1 });
    return x.finish(false, { x: tx, width: tw });
  }
  const photoH = Math.round(H * 0.4);
  c.photo(first, { x: 0, y: 0, width: W, height: photoH }, 0, 0);
  const tag = c.pill(kicker, pad, photoH - Math.round(c.unit * 0.025), p.accent, "#ffffff");
  let y = tag.y + tag.height + gap * 0.6;
  if (x.chapter) y += Math.round(c.unit * 0.04);
  const headingH = Math.round(H * 0.12);
  x.title({ x: pad, y, width: inner, height: headingH });
  y += headingH + 2;
  const standH = Math.round(H * 0.08);
  c.prose(copy.intro, { x: pad, y, width: inner, height: standH }, { italic: true, color: p.soft, font: d.display, max: c.body.max - 1 });
  y += standH + 4;
  c.rule(pad, y, inner, p.ink, 1);
  c.prose(copy.body || copy.caption, { x: pad, y: y + 6, width: inner, height: c.footerTop - 8 - y - 6 }, { color: p.ink, max: c.body.max - 1 });
  return x.finish();
}

/** Heading, divider and intro shared by the interactive pages; returns where the rest starts. */
function lead(x: Ctx, introShare = 0.1) {
  const { c, p, copy } = x;
  const { pad, inner, height: H, gap } = c;
  const y = x.top + (x.chapter ? Math.round(c.unit * 0.04) : 0) + (x.d.look === "guide" ? 10 : 0);
  const headingH = Math.round(H * 0.11);
  x.title({ x: pad, y, width: inner, height: headingH });
  const start = underHeading(x, y + headingH, pad);
  const introH = Math.round(H * introShare);
  c.prose(copy.intro, { x: pad, y: start, width: inner, height: introH }, { color: p.soft });
  return start + introH + gap * 0.4;
}

function quiz(x: Ctx): Slide {
  const { c, d, p, copy } = x;
  const { pad, inner, gap } = c;
  const items = copy.quiz!.slice(0, 3);
  const top = lead(x);
  const buttonH = 40;
  const buttonY = c.footerTop - 10 - buttonH;
  const cardBottom = buttonY - gap * 0.8;
  c.box(p.tint, { x: pad, y: top, width: inner, height: cardBottom - top }, d.radius, 0);
  const labelH = c.label(`Quiz · ${items.length} questions`, pad + gap, top + gap * 0.7, inner - gap * 2);
  const listTop = top + gap * 0.7 + labelH + 6;
  const row = Math.floor((cardBottom - gap * 0.5 - listTop) / items.length);
  items.forEach((item, i) => {
    const ry = listTop + i * row;
    c.badge(String(i + 1), pad + gap + 10, ry + 11, 20, p.accent, "#ffffff");
    c.text(item.question, { x: pad + gap + 26, y: ry, width: inner - gap * 2 - 26, height: row - 4 }, { min: c.body.min - 1, max: c.body.max - 1, color: p.ink, lineHeight: 1.35 });
  });
  const buttonW = Math.min(inner, 210);
  c.action("quiz", { x: pad + (inner - buttonW) / 2, y: buttonY, width: buttonW, height: buttonH }, "Take the quiz", {
    quizTitle: copy.heading,
    quizQuestions: items.map(item => ({
      id: randomUUID(), question: item.question, multiple: false,
      options: item.options.map((text, index) => ({ id: randomUUID(), text, correct: index === item.answer })),
    })),
  });
  return x.finish();
}

function table(x: Ctx): Slide {
  const { c, copy } = x;
  const { pad, inner, gap } = c;
  const { columns, rows } = copy.table!;
  const top = lead(x, 0.12);
  const bottom = c.footerTop - 8;
  const rowH = Math.max(30, Math.round(c.unit * 0.085));
  const height = Math.min(bottom - top, rowH * (rows.length + 1));
  c.table(columns, rows, { x: pad, y: top + gap * 0.2, width: inner, height });
  return x.finish();
}

function chart(x: Ctx): Slide {
  const { c, d, copy } = x;
  const { pad, inner } = c;
  const { title, unit, data } = copy.chart!;
  const top = lead(x, 0.12);
  const height = c.footerTop - 10 - top;
  const name = title || copy.heading;
  c.chart(d.id === "workbook" ? "area" : "bar", unit && name.length + unit.length < 34 ? `${name} (${unit})` : name, data, { x: pad, y: top, width: inner, height });
  return x.finish();
}
