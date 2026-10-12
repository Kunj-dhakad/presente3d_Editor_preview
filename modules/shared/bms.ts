/**
 * The Business Management System, in the words the reference uses.
 *
 * An app owns features and package fields. A feature is a switch, named by its
 * `condition_val` — the string the app checks for. A package field is a
 * countable allowance, also named by its `condition_val`. A package hands out a
 * feature plan (a set of features) and one value per field; "unlimited" is a
 * value like any other. A customer holds purchases, and purchases stack:
 * unlimited wins, otherwise the larger number does.
 *
 * This file holds the words and the arithmetic, so both the server and the
 * screens can use them. Reading and writing lives in server/bms.ts.
 */

export const UNLIMITED = "unlimited";
export const APP_NAME = "AI Book Creator";

export type FeatureArea = "creation" | "publishing" | "media" | "support";

/** The features the app itself checks for. Administration may add more. */
export const FEATURE_CATALOGUE: { condition_val: string; feature: string; area: FeatureArea; description: string }[] = [
  { condition_val: "ai_books", feature: "AI book creator", area: "creation", description: "Write a whole book from a description." },
  { condition_val: "book_agent", feature: "Book Agent", area: "creation", description: "Create a book through a chat." },
  { condition_val: "import_pdf", feature: "PDF and URL import", area: "creation", description: "Turn a document or page into a book." },
  { condition_val: "flipbook", feature: "Flipbook upload", area: "creation", description: "Upload a finished PDF and publish it as a flipbook." },
  { condition_val: "ai_images", feature: "AI images", area: "media", description: "Generate artwork inside the editor." },
  { condition_val: "ai_video", feature: "AI video", area: "media", description: "Generate video for a page." },
  { condition_val: "narration", feature: "Narration", area: "media", description: "Read a book aloud with AI voices." },
  { condition_val: "publish", feature: "Public reader links", area: "publishing", description: "Share a book with a link." },
  { condition_val: "embed", feature: "Website embed", area: "publishing", description: "Embed a book on another site." },
  { condition_val: "leads", feature: "Reader leads", area: "publishing", description: "Collect names, emails and answers from readers." },
  { condition_val: "export_pdf", feature: "PDF export", area: "publishing", description: "Download a book as a PDF." },
  { condition_val: "export_office", feature: "PowerPoint and image export", area: "publishing", description: "Download slides and page images." },
  { condition_val: "remove_branding", feature: "Remove our branding", area: "publishing", description: "Publish without the AI Book Creator mark." },
  { condition_val: "priority_support", feature: "Priority support", area: "support", description: "Answers ahead of the queue." },
  { condition_val: "onboarding", feature: "Onboarding help", area: "support", description: "A guided setup call." },
];

/** `period` is how often the allowance refills; `total` means it never does. */
export const FIELD_CATALOGUE: {
  condition_val: string; field_name: string; unit: "count" | "bytes"; period: "day" | "month" | "total";
  field_type: "data" | "validity" | "none";
}[] = [
  { condition_val: "books", field_name: "Books", unit: "count", period: "total", field_type: "data" },
  { condition_val: "ai_daily", field_name: "AI actions per day", unit: "count", period: "day", field_type: "data" },
  { condition_val: "video_daily", field_name: "AI videos per day", unit: "count", period: "day", field_type: "data" },
  { condition_val: "storage_bytes", field_name: "Media storage", unit: "bytes", period: "total", field_type: "data" },
];

export const FEATURE_KEYS = FEATURE_CATALOGUE.map(feature => feature.condition_val);
export const FIELD_KEYS = FIELD_CATALOGUE.map(field => field.condition_val);

/** What one package hands out: a value per field's condition_val. */
export type FieldValues = Record<string, string>;

/**
 * Two purchases held at once. "unlimited" beats every number, and otherwise the
 * larger number wins — so an upsell adds to what the customer already has
 * instead of replacing it.
 */
export function mergeFields(a: FieldValues, b: FieldValues): FieldValues {
  const merged: FieldValues = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (!(key in merged)) { merged[key] = value; continue; }
    const held = merged[key];
    if (held === UNLIMITED || value === UNLIMITED) { merged[key] = UNLIMITED; continue; }
    merged[key] = Number(value) > Number(held) ? value : held;
  }
  return merged;
}

/** Only fields the app enforces, and only values a field can hold. */
export function cleanFields(input: unknown): FieldValues {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const fields: FieldValues = {};
  for (const key of FIELD_KEYS) {
    if (!(key in source)) continue;
    const value = source[key];
    if (value === null || value === UNLIMITED || value === "") { fields[key] = UNLIMITED; continue; }
    const number = Math.floor(Number(value));
    if (Number.isFinite(number) && number >= 0) fields[key] = String(number);
  }
  return fields;
}

const GB = 1024 ** 3;

export function formatFieldValue(condition_val: string, value: string | null | undefined) {
  if (value === undefined || value === null || value === "") return "None";
  if (value === UNLIMITED) return "Unlimited";
  const field = FIELD_CATALOGUE.find(entry => entry.condition_val === condition_val);
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (field?.unit === "bytes") return number >= GB ? `${+(number / GB).toFixed(1)} GB` : `${Math.round(number / 1024 ** 2)} MB`;
  return number.toLocaleString("en-US");
}

/**
 * The packages an installation starts with. The seed writes them once;
 * Administration owns them after that.
 */
export const STARTER_PACKAGES = [
  {
    slug: "free", title: "Free", blurb: "Try the editor and publish your first book.",
    plan_type: "free" as const, plan_level: "free" as const, sell_type: "fe-0",
    price: 0, period: "month" as const, sort: 1, highlight: false,
    features: ["ai_books", "book_agent", "import_pdf", "flipbook", "publish", "embed", "leads", "export_pdf", "export_office", "narration"],
    fields: { books: "3", ai_daily: "60", video_daily: "1", storage_bytes: String(Math.round(0.5 * GB)) },
    highlights: ["3 books", "60 AI actions per day", "500 MB media storage", "PDF, PowerPoint and image export", "Public reader links"],
  },
  {
    slug: "pro", title: "Pro", blurb: "For authors and creators publishing regularly.",
    plan_type: "paid" as const, plan_level: "fe" as const, sell_type: "fe-1",
    price: 9, period: "month" as const, sort: 2, highlight: true,
    features: ["ai_books", "book_agent", "import_pdf", "flipbook", "publish", "embed", "leads", "export_pdf", "export_office", "narration", "ai_images", "ai_video", "priority_support"],
    fields: { books: "50", ai_daily: "600", video_daily: "10", storage_bytes: String(10 * GB) },
    highlights: ["50 books", "600 AI actions per day", "10 GB media storage", "AI images and video", "Priority email support"],
  },
  {
    slug: "business", title: "Business", blurb: "For teams, schools and publishers.",
    plan_type: "paid" as const, plan_level: "fe" as const, sell_type: "fe-2",
    price: 29, period: "month" as const, sort: 3, highlight: false,
    features: ["ai_books", "book_agent", "import_pdf", "flipbook", "publish", "embed", "leads", "export_pdf", "export_office", "narration", "ai_images", "ai_video", "remove_branding", "priority_support", "onboarding"],
    fields: { books: "1000", ai_daily: "3000", video_daily: "30", storage_bytes: String(50 * GB) },
    highlights: ["1,000 books", "3,000 AI actions per day", "50 GB media storage", "Everything in Pro", "Onboarding help"],
  },
];
