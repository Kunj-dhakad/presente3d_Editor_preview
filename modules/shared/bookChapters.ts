/**
 * How an AI book's pages group into chapters. Shared by the server, which marks
 * the chapter headings and sizes the index, and the outline review screen,
 * which shows the same grouping before the pages are written.
 */

export type ChapterBrief = { heading?: string; chapter?: string };
/** Set on the page that opens a chapter. */
export type ChapterMark = { number: number; title: string } | null;

export const MAX_CHAPTER_PAGES = 4;
/** Short enough that "Chapter 12: <title>" keeps to one line of the index. */
export const CHAPTER_TITLE_LENGTH = 26;

const clean = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const CONNECTORS = new Set(["a", "an", "and", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with", "&", "&amp;"]);

/** At most five words and CHAPTER_TITLE_LENGTH characters, cut at a word and never on "and" / "of". */
function short(value: string) {
  let words = value.split(" ").slice(0, 5);
  while (words.length > 1 && words.join(" ").length > CHAPTER_TITLE_LENGTH) words = words.slice(0, -1);
  if (words.join(" ") !== value) while (words.length > 1 && CONNECTORS.has(words[words.length - 1].toLowerCase().replace(/[,;:-]+$/, ""))) words = words.slice(0, -1);
  return words.join(" ").slice(0, CHAPTER_TITLE_LENGTH).replace(/[,;:\s-]+$/, "");
}

/**
 * Neighbouring pages with the same chapter name form one chapter; a chapter
 * never runs past MAX_CHAPTER_PAGES (the next page opens a new one under its own
 * heading), and page 1 always opens the first. When the outline carries no
 * names (an older client), chapters are two pages long.
 */
export function chapterMarks(pages: ChapterBrief[]): ChapterMark[] {
  const names = pages.map(page => clean(page?.chapter).slice(0, 80));
  const longest = names.some(Boolean) ? MAX_CHAPTER_PAGES : 2;
  let number = 0;
  let run = 0;
  let current = "";
  return pages.map((page, i) => {
    const name = names[i];
    const opens = i === 0 || run >= longest || (Boolean(name) && name !== names[i - 1]);
    if (!opens) { run += 1; return null; }
    run = 1;
    number += 1;
    const title = name && name !== current ? name : clean(page?.heading) || `Chapter ${number}`;
    current = name;
    return { number, title: short(title) || `Chapter ${number}` };
  });
}
