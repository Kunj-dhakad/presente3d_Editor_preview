/**
 * One place that turns a chart's saved style into the props Recharts actually
 * receives, so the canvas renderer, the preview reader and any future thumbnail
 * can never drift apart.
 *
 * The style shape is declared structurally rather than imported, matching
 * `tableStyle.ts`, so the preview parser's own `ChartBlock["style"]` fits too.
 */

import type { CSSProperties } from "react";

export type ChartVisualStyle = {
  primaryColor: string;
  secondaryColor: string;
  background: string;
  gridColor: string;
  axisColor: string;
  labelColor: string;
  legendColor: string;
  borderRadius: number;
  padding: number;
  showLegend: boolean;
  legendPosition: "top" | "bottom" | "left" | "right";
  showGrid: boolean;
  showLabels: boolean;
  showXAxis: boolean;
  showYAxis: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  animation: boolean;
  animationDuration: number;
};

/* ------------------------------------------------------------------ colour */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toRgb = (color: string): [number, number, number] | null => {
  const match = HEX.exec(String(color).trim());
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((char) => char + char)
          .join("")
      : match[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
};

const toHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const toHsl = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness * 100];
  const delta = max - min;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === red
      ? ((green - blue) / delta + (green < blue ? 6 : 0)) * 60
      : max === green
        ? ((blue - red) / delta + 2) * 60
        : ((red - green) / delta + 4) * 60;
  return [hue, saturation * 100, lightness * 100];
};

const fromHsl = (h: number, s: number, l: number): string => {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const base = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, second, 0]
      : hue < 120
        ? [second, chroma, 0]
        : hue < 180
          ? [0, chroma, second]
          : hue < 240
            ? [0, second, chroma]
            : hue < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];
  return toHex([(r + base) * 255, (g + base) * 255, (b + base) * 255]);
};

/** Shortest distance between two hues on the wheel, in degrees. */
const hueGap = (a: number, b: number) => {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
};

/** Curated fallbacks, spaced far enough apart to stay tellable at thumb size. */
const SPARE_COLORS = [
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#0ea5e9",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#eab308",
];

/** Golden angle — every extra step lands in the widest unused gap of the wheel. */
const GOLDEN_ANGLE = 137.508;

/** Below this the colour reads as a grey, and its hue means nothing. */
const GREY_SATURATION = 12;

/**
 * A distinct swatch for every row, however many rows there are.
 *
 * The user's own primary and secondary lead, then the curated spares; anything
 * past that is spun off the primary hue so row 9 and row 20 never come back
 * wearing the same colour. Two rows only ever share a swatch when the palette
 * has genuinely run out of room, which takes hundreds of rows.
 */
export const seriesPalette = (
  style: Pick<ChartVisualStyle, "primaryColor" | "secondaryColor">,
  count: number,
): string[] => {
  const colors: string[] = [];
  const hues: number[] = [];
  const taken = new Set<string>();

  const accept = (color: string, spaceHues = true) => {
    if (colors.length >= count) return;
    const rgb = toRgb(color);
    if (!rgb) return;
    const hex = toHex(rgb);
    // Identical swatches are what makes two rows look like one, so never twice.
    if (taken.has(hex)) return;
    const [hue, saturation] = toHsl(rgb);
    const colored = saturation > GREY_SATURATION;
    if (spaceHues && colored && hues.some((used) => hueGap(used, hue) < 16))
      return;
    taken.add(hex);
    colors.push(hex);
    if (colored) hues.push(hue);
  };

  accept(style.primaryColor);
  accept(style.secondaryColor);
  SPARE_COLORS.forEach((color) => accept(color));

  const [hue, saturation, lightness] = toHsl(
    toRgb(style.primaryColor) ?? [79, 70, 229],
  );
  for (let step = 1; colors.length < count && step < 512; step += 1) {
    // Once the wheel is full the next ring reuses hues at a new lightness, and
    // hue spacing is dropped so the ring can actually be filled.
    const ring = Math.floor(step / 24);
    accept(
      fromHsl(
        hue + step * GOLDEN_ANGLE,
        clamp(saturation || 65, 45, 85),
        clamp((lightness || 55) + (ring % 2 ? 1 : -1) * 13 * Math.ceil(ring / 2), 30, 72),
      ),
      ring === 0,
    );
  }
  // Only reachable with absurd row counts; repeating beats rendering nothing.
  while (colors.length < count) colors.push(colors[colors.length % Math.max(1, colors.length)] ?? style.primaryColor);
  return colors;
};

/* -------------------------------------------------------------- typography */

/**
 * Font family and weight were previously only ever reaching the title, which is
 * why changing them looked like a dead control. Ticks, labels and the legend
 * all read from here now.
 */
export const chartFont = (style: ChartVisualStyle) => ({
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
});

/** Axis tick text. */
export const tickStyle = (style: ChartVisualStyle) => ({
  fill: style.labelColor,
  ...chartFont(style),
});

/** Value labels drawn on the marks themselves. */
export const labelStyle = (style: ChartVisualStyle) => ({
  fill: style.labelColor,
  ...chartFont(style),
});

/* ------------------------------------------------------------------ layout */

/**
 * `left: 0` leans on `YAxis width="auto"`: the old fixed 60px gutter was what
 * pushed the plot area off to the right of its box even when the numbers were
 * two digits wide. Only the axis-less case needs a hand-written gutter.
 */
export const chartMargin = (style: ChartVisualStyle) => ({
  // Top labels sit above the tallest mark and need their own headroom.
  top: style.showLabels ? Math.max(14, Number(style.fontSize) + 6) : 8,
  right: 12,
  bottom: 4,
  left: style.showYAxis ? 0 : 12,
});

/** Legend text colour: Recharts paints each item in its series colour otherwise. */
export const legendTextStyle = (style: ChartVisualStyle): CSSProperties => ({
  color: style.legendColor,
  fontFamily: style.fontFamily,
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
});

/** Tooltip surface, so hovering a preview chart matches the chart's own type. */
export const tooltipStyle = (style: ChartVisualStyle) => ({
  contentStyle: {
    borderRadius: 6,
    border: `1px solid ${style.gridColor}`,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
  } satisfies CSSProperties,
  labelStyle: { color: style.labelColor } satisfies CSSProperties,
});
