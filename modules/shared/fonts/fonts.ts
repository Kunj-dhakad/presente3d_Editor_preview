export type FontItem = { family: string; category?: string };

/**
 * Fonts the editor ships with. Shared by the Font Family panel and the AI
 * copilot, so the AI can only ever set a font the editor can actually load.
 */
export const CURATED_FONTS: FontItem[] = [
  { family: "Inter" }, { family: "Roboto" }, { family: "Open Sans" },
  { family: "Montserrat" }, { family: "Lato" }, { family: "Poppins" },
  { family: "Raleway" }, { family: "Oswald" }, { family: "Nunito" },
  { family: "Playfair Display" }, { family: "Merriweather" }, { family: "PT Sans" },
  { family: "Source Sans 3" }, { family: "Ubuntu" }, { family: "Noto Sans" },
  { family: "Josefin Sans" }, { family: "Mulish" }, { family: "Quicksand" },
  { family: "DM Sans" }, { family: "Karla" }, { family: "Cabin" },
  { family: "Barlow" }, { family: "Jost" }, { family: "Outfit" },
  { family: "Be Vietnam Pro" }, { family: "Plus Jakarta Sans" }, { family: "Figtree" },
  { family: "Manrope" }, { family: "Sora" }, { family: "Space Grotesk" },
  { family: "Work Sans" }, { family: "Libre Franklin" }, { family: "Rubik" },
  { family: "IBM Plex Sans" }, { family: "Fira Sans" }, { family: "Noto Serif" },
  { family: "EB Garamond" }, { family: "Lora" }, { family: "Libre Baskerville" },
  { family: "Crimson Text" }, { family: "Cormorant Garamond" }, { family: "Spectral" },
  { family: "Roboto Slab" }, { family: "Zilla Slab" }, { family: "Bitter" },
  { family: "Cardo" }, { family: "Arvo" }, { family: "Gelasio" },
  { family: "Roboto Mono" }, { family: "Fira Code" }, { family: "JetBrains Mono" },
  { family: "Source Code Pro" }, { family: "IBM Plex Mono" }, { family: "Space Mono" },
  { family: "Courier Prime" }, { family: "Inconsolata" }, { family: "Pacifico" },
  { family: "Dancing Script" }, { family: "Lobster" }, { family: "Caveat" },
  { family: "Satisfy" }, { family: "Sacramento" }, { family: "Great Vibes" },
  { family: "Kaushan Script" }, { family: "Yellowtail" }, { family: "Parisienne" },
  { family: "Bebas Neue" }, { family: "Anton" }, { family: "Black Han Sans" },
  { family: "Permanent Marker" }, { family: "Titan One" }, { family: "Righteous" },
  { family: "Lilita One" }, { family: "Boogaloo" }, { family: "Fredoka One" },
  { family: "Fugaz One" }, { family: "Bowlby One SC" }, { family: "Press Start 2P" },
  { family: "Abril Fatface" }, { family: "Ultra" }, { family: "Alfa Slab One" },
];

/** Families a request can name that the editor ships under another name. */
const FONT_ALIASES: Record<string, string> = {
  "helvetica": "Inter",
  "helvetica neue": "Inter",
  "arial": "Inter",
  "sans serif": "Inter",
  "sans-serif": "Inter",
  "modern sans-serif": "Inter",
  "modern sans serif": "Inter",
  "system": "Inter",
  "times": "Merriweather",
  "times new roman": "Merriweather",
  "serif": "Merriweather",
  "georgia": "Lora",
  "garamond": "EB Garamond",
  "courier": "Courier Prime",
  "monospace": "Roboto Mono",
  "mono": "Roboto Mono",
  "script": "Dancing Script",
  "handwriting": "Caveat",
  "display": "Bebas Neue",
  "source sans pro": "Source Sans 3",
  "source sans": "Source Sans 3",
  "noto": "Noto Sans",
  "ibm plex": "IBM Plex Sans",
  "plex sans": "IBM Plex Sans",
  "jakarta": "Plus Jakarta Sans",
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Maps a requested font name to a family the editor can load, or null when
 * there is no safe match — callers report that back instead of setting a font
 * that would silently fall back to the browser default.
 */
export const resolveFontFamily = (requested: string): string | null => {
  const wanted = normalize(requested || "");
  if (!wanted) return null;

  const exact = CURATED_FONTS.find((font) => normalize(font.family) === wanted);
  if (exact) return exact.family;

  const alias = FONT_ALIASES[wanted];
  if (alias) return alias;

  // "poppins bold", "inter font" → the family the user actually named.
  const partial = CURATED_FONTS.find((font) => {
    const family = normalize(font.family);
    return wanted.startsWith(`${family} `) || wanted.endsWith(` ${family}`) || wanted.includes(family);
  });
  return partial?.family ?? null;
};
