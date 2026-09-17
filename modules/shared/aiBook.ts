/** Options shared by the creator and its API validation. */
export const BOOK_FORMATS = [
  { id: "portrait", name: "Portrait", ratio: "350 × 434", description: "Guides, stories & workbooks", tag: "Most popular" },
  { id: "landscape", name: "Landscape", ratio: "690 × 434", description: "Presentations & visual stories", tag: "Think wide" },
  { id: "square", name: "Square", ratio: "434 × 434", description: "Lookbooks, portfolios & more", tag: "Perfectly balanced" },
] as const;
export type BookFormat = typeof BOOK_FORMATS[number]["id"];
/** Every book is written in US English. */
export const BOOK_LANGUAGE = "English";
export const BOOK_CATEGORIES = ["Business", "Corporate", "Education", "Fiction & Stories", "Lifestyle", "Travel", "Food & Cooking", "Fashion", "Fitness & Wellness", "Health & Wellness", "IT & Technology", "Marketing", "Personal Development", "Art & Design"];
export const BOOK_TONES = ["Professional", "Friendly", "Inspiring", "Educational", "Conversational"];
export const SOURCE_TEXT_LIMIT = 24_000;
export const PDF_SIZE_LIMIT = 10 * 1024 * 1024;
export const PDF_PAGE_LIMIT = 100;
export const BOOK_PAGE_LIMIT = 50;
export type BookWritingOptions = { category: string; tone: string; audience: string; sourceText: string };
export type ImportedBookSource = { title: string; text: string; characters: number; truncated: boolean; pages?: number };
