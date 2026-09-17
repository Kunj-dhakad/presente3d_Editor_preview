/**
 * QR encoding.
 *
 * What is stored on the element is the *content*; the code itself is worked
 * out here at render time. That is what keeps a QR editable — change the text
 * and the modules change with it — and it is why the canvas can draw the code
 * as vector rectangles rather than as a bitmap that would blur at export size.
 *
 * React-free so the canvas, the reader, the page thumbnails and the PDF/PPT
 * routes all encode identically.
 */

import qrcode from "qrcode-generator";

export type ErrorCorrection = "L" | "M" | "Q" | "H";

/** The spec's minimum: four clear modules on every side, or scanners fail. */
export const QUIET_ZONE = 4;

export const DEFAULT_QR_CONTENT = "https://example.com";
export const DEFAULT_EC: ErrorCorrection = "M";
export const DEFAULT_QR_FOREGROUND = "#000000";
export const DEFAULT_QR_BACKGROUND = "#ffffff";

export type QRMatrix = {
  /** Modules across, excluding the quiet zone. */
  count: number;
  /** Total grid including the quiet zone on all four sides. */
  size: number;
  /** `true` where a module is dark. Indexed [row][col] of the inner grid. */
  isDark: (row: number, col: number) => boolean;
};

/**
 * Encodes content, or returns null when there is nothing to encode or the
 * content is too long for even the largest symbol. Callers show their empty
 * state rather than crashing the canvas.
 */
export const encodeQR = (
  content: string,
  ec: ErrorCorrection = DEFAULT_EC,
): QRMatrix | null => {
  const text = content ?? "";
  if (!text.trim()) return null;
  try {
    // Type 0 lets the library pick the smallest version that fits.
    const code = qrcode(0, ec);
    code.addData(text);
    code.make();
    const count = code.getModuleCount();
    return {
      count,
      size: count + QUIET_ZONE * 2,
      isDark: (row, col) => code.isDark(row, col),
    };
  } catch {
    return null;
  }
};

/**
 * All the dark modules as one path.
 *
 * One `<rect>` per module looked identical and was not: at any scale where a
 * module is not a whole number of pixels, each rectangle rounds on its own and
 * leaves hairline seams between neighbours. A person still reads the picture as
 * black; a scanner reads a broken grid and gives up. Merging them into a single
 * filled path removes every internal edge — and drops several hundred nodes per
 * code while it is at it.
 */
export const qrPath = (matrix: QRMatrix) => {
  let path = "";
  for (let row = 0; row < matrix.count; row++) {
    // Runs of adjacent dark modules become one rectangle rather than many.
    let start = -1;
    for (let col = 0; col <= matrix.count; col++) {
      const dark = col < matrix.count && matrix.isDark(row, col);
      if (dark && start === -1) start = col;
      if (!dark && start !== -1) {
        path += `M${start + QUIET_ZONE} ${row + QUIET_ZONE}h${col - start}v1h-${col - start}z`;
        start = -1;
      }
    }
  }
  return path;
};

/** Relative luminance, for the contrast check below. */
const luminance = (hex: string) => {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value.split("").map((c) => c + c).join("")
      : value.padEnd(6, "0");
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

/**
 * Whether a colour pair is safe to scan.
 *
 * Scanners threshold on brightness, so a pretty pairing that a person can read
 * may still be unscannable. 3:1 is the floor the QR literature gives; below it
 * the caller keeps the previous colours instead.
 */
export const hasScannableContrast = (foreground: string, background: string) => {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05) >= 3;
};

/**
 * The code as a standalone SVG string, for the export routes that build a
 * document server-side rather than photographing the DOM.
 */
export const qrToSvg = (
  content: string,
  {
    ec = DEFAULT_EC,
    foreground = DEFAULT_QR_FOREGROUND,
    background = DEFAULT_QR_BACKGROUND,
  }: { ec?: ErrorCorrection; foreground?: string; background?: string } = {},
): string | null => {
  const matrix = encodeQR(content, ec);
  if (!matrix) return null;
  const path = qrPath(matrix);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrix.size} ${matrix.size}">` +
    `<rect width="${matrix.size}" height="${matrix.size}" fill="${background}"/>` +
    `<path d="${path}" fill="${foreground}"/>` +
    `</svg>`
  );
};
