/** How a book was started. Shown as a badge in the library. */
export const BOOK_KINDS = {
  ai: "AI Book",
  agent: "Agent Book",
  flip: "Flip Book",
  template: "Template",
  blank: "Blank Book",
} as const;
export type BookKind = keyof typeof BOOK_KINDS;

export const isBookKind = (value: unknown): value is BookKind =>
  typeof value === "string" && Object.hasOwn(BOOK_KINDS, value);

/**
 * Draft: never published. Active: has a public link. Private: was published,
 * then its link was turned off.
 */
export type BookStatus = "draft" | "active" | "private";
