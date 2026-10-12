/** Options shared by the creator and its API validation. */
export const BOOK_FORMATS = [
  { id: "portrait", name: "Portrait", ratio: "350 × 434", description: "Guides, stories & workbooks", tag: "Most popular" },
  { id: "landscape", name: "Landscape", ratio: "690 × 434", description: "Presentations & visual stories", tag: "Think wide" },
  { id: "square", name: "Square", ratio: "434 × 434", description: "Lookbooks, portfolios & more", tag: "Perfectly balanced" },
] as const;
export type BookFormat = typeof BOOK_FORMATS[number]["id"];
export const PUBLICATION_TYPES = [
  { id: "ebook", name: "Book", description: "Stories & in-depth reading", prompt: "Create a complete, coherent book with a clear opening, logical chapters and a satisfying conclusion. Develop ideas progressively.", example: "A beginner's book about building better daily habits, with practical examples and small actions readers can try." },
  { id: "magazine", name: "Magazine", description: "Articles & visual features", prompt: "Create an editorial magazine issue. Organize chapters as departments or features, with distinct short articles, punchy headlines, captions and editorial variety. Favor hero, split and gallery layouts. Do not invent interviews, quotations or statistics.", example: "A modern lifestyle magazine about slow living: thoughtful spaces, weekend rituals, mindful travel and creative people." },
  { id: "summary", name: "Book Summary", description: "Key ideas & takeaways", prompt: "Summarize ONLY the supplied book text, excerpts or reading notes. Identify central ideas, explain key arguments and close with actionable takeaways. Clearly limit coverage to the supplied material; do not imply you read missing chapters. Do not invent facts, quotes or events. Paraphrase in original language and favor text and bullets layouts.", example: "Reading notes: The central idea is to make habits easier by changing your environment. Start with a small action you can repeat, connect it to an existing routine, and track consistency rather than perfection. Setbacks are part of the process; resume the routine instead of abandoning it." },
  { id: "guide", name: "How-to Guide", description: "Clear steps & practical tips", prompt: "Create an actionable how-to guide. Start with the goal and prerequisites, explain the steps in order, include practical examples and common mistakes, and finish with a checklist. Favor split, text and bullets layouts.", example: "A step-by-step guide to starting a balcony garden: choose containers, prepare soil, pick herbs, water correctly and solve common problems." },
  { id: "workbook", name: "Workbook", description: "Exercises & learning activities", prompt: "Create a learning workbook. Each section must include a short explanation followed by a concrete exercise, reflection question or checklist. Use short instructions and favor text and bullets layouts. Include recap and next-step activities.", example: "A photography workbook for beginners with short lessons on composition and lighting, followed by a practice task and reflection prompts." },
  { id: "lookbook", name: "Lookbook", description: "Collections & visual stories", prompt: "Create a visually led lookbook. Organize a cohesive collection with short introductions, descriptive captions and concise visual storytelling. Favor gallery, hero and split layouts. Do not invent product specifications or prices.", example: "An interior design lookbook for warm, minimal homes: natural materials, calming colors, cozy corners and small-space inspiration." },
] as const;
export type PublicationType = typeof PUBLICATION_TYPES[number]["id"];
/** Every book is written in US English. */
export const BOOK_LANGUAGE = "English";
export const BOOK_CATEGORIES = ["Business", "Corporate", "Education", "Fiction & Stories", "Lifestyle", "Travel", "Food & Cooking", "Fashion", "Fitness & Wellness", "Health & Wellness", "IT & Technology", "Marketing", "Personal Development", "Art & Design"];
export const BOOK_TONES = ["Professional", "Friendly", "Inspiring", "Educational", "Conversational"];
export const SOURCE_TEXT_LIMIT = 24_000;
export const PDF_SIZE_LIMIT = 10 * 1024 * 1024;
export const PDF_PAGE_LIMIT = 100;
export const BOOK_PAGE_LIMIT = 50;
export type BookWritingOptions = { publicationType: PublicationType; category: string; tone: string; audience: string; sourceText: string };
export type ImportedBookSource = { title: string; text: string; characters: number; truncated: boolean; pages?: number };
