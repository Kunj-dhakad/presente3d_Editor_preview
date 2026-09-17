// Books are addressed in the browser by a short id plus a readable title:
//   /editor/k7m2x9qp/my-next-great-book
// The trailing title is decorative — only the short id identifies the book, so
// links keep working after a rename.
export const SHORT_ID_LENGTH = 8;
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes (l, o, 0, 1)

export function isShortId(value: string) {
  return new RegExp(`^[${ALPHABET}]{${SHORT_ID_LENGTH}}$`).test(value);
}

export function newShortId(random: (n: number) => Uint8Array, length = SHORT_ID_LENGTH) {
  return Array.from(random(length), byte => ALPHABET[byte % ALPHABET.length]).join("");
}

/**
 * Reader links carry their own code, separate from the book's editor id: the
 * code is what grants access, so revoking a link must be able to retire it.
 * Ten characters from a 32-letter alphabet is about 10^15 possibilities.
 */
export const SHARE_TOKEN_LENGTH = 10;

export function isShareToken(value: string) {
  return new RegExp(`^[${ALPHABET}]{${SHARE_TOKEN_LENGTH}}$`).test(value);
}

export function readerPath(token: string, title: string) {
  return `/read/${token}/${slugify(title)}`;
}

export function slugify(title: string) {
  // Keep letters of any script (accented titles included) — only spaces and
  // punctuation turn into dashes.
  const slug = title.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return slug || "book";
}

export function bookPath(book: { short_id?: string | null; id: string; title: string }) {
  return book.short_id ? `/editor/${book.short_id}/${slugify(book.title)}` : `/editor/${book.id}`;
}

/** The owner's full-page preview: /preview/<id>/<title>. */
export function previewPath(book: { short_id?: string | null; id: string; title: string }) {
  return `/preview/${book.short_id ?? book.id}/${slugify(book.title)}`;
}
