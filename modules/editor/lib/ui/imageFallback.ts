/**
 * The stand-in an image shows when its source fails to load, kept in one module
 * so the canvas, the reader and the page thumbnails all draw the same thing.
 * Each renderer used to carry its own copy — the canvas a grey "Image Not
 * Found" card, the thumbnails a plain dark block — so one broken image looked
 * like two different problems depending on where you were looking at it.
 *
 * Only the source is shared. How it is fitted stays with the element, so the
 * placeholder sits in the box exactly the way the real image would have.
 */

import { useState } from "react";

const PLACEHOLDER_SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'>` +
  `<rect width='100%' height='100%' fill='#f3f4f6'/>` +
  `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' ` +
  `font-size='20' font-family='Arial' fill='#6b7280'>Image Not Found</text>` +
  `</svg>`;

/** Grey card reading "Image Not Found". */
export const IMAGE_FALLBACK_SRC =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(PLACEHOLDER_SVG)
    : Buffer.from(PLACEHOLDER_SVG, "utf-8").toString("base64"));

/** Swaps a broken source for the placeholder. */
export const useImageFallback = (src: string) => {
  // Remembering *which* source failed, rather than a bare flag, is what lets a
  // newly picked image have its own chance to load without an effect to clear
  // the flag behind it.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = !!src && brokenSrc === src;

  return {
    broken,
    src: broken ? IMAGE_FALLBACK_SRC : src,
    onError: () => setBrokenSrc(src),
  };
};
