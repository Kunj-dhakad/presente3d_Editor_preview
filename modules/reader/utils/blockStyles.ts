import type { CSSProperties } from "react";
import type { BlockBase, BlockStroke, MediaFilters } from "../types/blocks";

/**
 * Every block is positioned the same way: an absolute box in page coordinates,
 * rotated about its own centre. Sharing it here is what keeps the eleven
 * renderers down to just their own visual concerns.
 */
export function blockFrame(
  block: BlockBase,
  extra?: CSSProperties,
): CSSProperties {
  return {
    position: "absolute",
    left: block.x,
    top: block.y,
    width: block.width,
    height: block.height,
    transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
    transformOrigin: "center center",
    zIndex: block.zIndex,
    ...extra,
  };
}

export const filterCss = (filters: MediaFilters): string =>
  [
    `contrast(${filters.contrast}%)`,
    `brightness(${filters.brightness}%)`,
    `saturate(${filters.saturate}%)`,
    `blur(${filters.blur}px)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `hue-rotate(${filters.hueRotate}deg)`,
  ].join(" ");

export const strokeCss = (stroke: BlockStroke): string | undefined =>
  stroke.width ? `${stroke.width}px ${stroke.style} ${stroke.color}` : undefined;

export const flipCss = (flipX: boolean, flipY: boolean): string | undefined =>
  flipX || flipY ? `scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})` : undefined;

export const gradientCss = (
  from: string | undefined,
  to: string | undefined,
  direction: "horizontal" | "vertical" | "diagonal" | undefined,
): string | undefined => {
  if (!from || !to) return undefined;
  const angle =
    direction === "vertical"
      ? "to bottom"
      : direction === "horizontal"
        ? "to right"
        : "135deg";
  return `linear-gradient(${angle}, ${from}, ${to})`;
};

export const BUTTON_SHADOWS: Record<string, string> = {
  none: "none",
  soft: "0 2px 8px rgba(0,0,0,0.15)",
  regular: "0 4px 12px rgba(0,0,0,0.25)",
  retro: "3px 3px 0 rgba(0,0,0,0.8)",
};

/** Shown in place of an image whose src 404s, so a page never renders a gap. */
export const MISSING_IMAGE_SRC =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'>` +
      `<rect width='100%' height='100%' fill='#f3f4f6'/>` +
      `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' ` +
      `font-size='16' font-family='Arial' fill='#9ca3af'>Image not found</text>` +
      `</svg>`,
  );
