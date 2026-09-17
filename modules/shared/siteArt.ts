/**
 * Site artwork. The files are generated once by scripts/site-images.cjs and
 * stored in S3 under FS_BookEditor_data/site/<folder>, so pages load them by URL
 * instead of drawing anything at request time.
 */
const BASE = (process.env.NEXT_PUBLIC_SITE_ART || "").replace(/\/$/, "");
// The art base points at the dashboard folder; its siblings live one level up.
const ROOT = BASE.replace(/\/dashboard$/, "");

export type ArtName = "hero" | "ai-book" | "templates" | "blank-book" | "empty-shelf" | "flip-book";
export type BookTypeArt = "ai-book" | "flip-book" | "templates";

export const art = (name: ArtName) => BASE ? `${BASE}/${name}.png` : "";
/** The logo tile; app/icon.png is the same image for when S3 art is not configured. */
export const brandLogo = ROOT ? `${ROOT}/brand/logo-mark.png` : "/icon.png";
export const bookTypeArt = (name: BookTypeArt) => ROOT ? `${ROOT}/book-types/${name}.png` : "";
