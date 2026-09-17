/**
 * A link put on a button or an image points either somewhere on the web or
 * somewhere else in the book. The editor stores it as one free-text field, so
 * the destination is worked out here — once — rather than in each renderer.
 */

export interface LinkNavigator {
  goToLinkedPage: (value: string) => void;
}

const ABSOLUTE_URL = /^(https?:|mailto:|tel:)/i;
/** "example.com/page", "www.example.com" — a host, not a page name. */
const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/;

export function isExternalLink(link: string): boolean {
  const value = link.trim();
  return ABSOLUTE_URL.test(value) || BARE_DOMAIN.test(value);
}

/**
 * Follows the link. Returns false when there was nothing to follow, so the
 * caller can fall back to its normal click behaviour.
 */
export function openElementLink(
  link: string | undefined,
  book: LinkNavigator | null,
): boolean {
  const value = (link ?? "").trim();
  if (!value) return false;

  if (isExternalLink(value)) {
    const href = ABSOLUTE_URL.test(value) ? value : `https://${value}`;
    // noopener/noreferrer: the reader must not hand the opened tab a handle
    // back to the book.
    window.open(href, "_blank", "noopener,noreferrer");
    return true;
  }

  // Anything else is a page: an id, or a page number.
  if (book) {
    book.goToLinkedPage(value);
    return true;
  }
  return false;
}
