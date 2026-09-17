/**
 * Text elements are stored as sanitised HTML ("Tips &amp; Tricks"). Places that
 * print them as plain text, such as the book index, decode them first.
 */
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

export function plainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === "#") {
        const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
      }
      return ENTITIES[code.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}
