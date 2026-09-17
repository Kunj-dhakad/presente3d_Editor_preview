import type { ShapeData, ShapeEffect, ShapeEffectType } from "@editor/store/editorStore";

/**
 * Shape effects — the Drop / Glow / Echo / Glitch treatments and the named
 * presets built on top of them.
 *
 * Everything here is a pure function of the stored data. That is the whole
 * point: the editor canvas, the preview reader and the PNG export all render
 * shapes through the same `RenderShape`, so as long as the filter is derived
 * from JSON and nothing else, all three agree by construction. There is no
 * second implementation to keep in sync.
 *
 * The effects are built from stacked `drop-shadow()` rather than `box-shadow`
 * because `drop-shadow` follows the alpha channel of what it is applied to. A
 * star gets a star-shaped glow; `box-shadow` would give it a rectangular one.
 */

/**
 * How far past its own box an effect is allowed to bleed. Every extra pixel is
 * compositing area on a filtered layer, and a large glow on a full-page shape
 * turns into a very expensive one, so the reach is capped even if the numbers
 * ask for more.
 */
const MAX_BLEED_PX = 150;

/** Cyan half of the glitch split. The stored colour drives the other half. */
const GLITCH_COMPLEMENT = "#00e5ff";

const DEFAULT_COLOR = "#000000";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Colour + alpha as one CSS value.
 *
 * Only hex is expanded by hand; anything else (a named colour, an existing
 * `rgb()`) is handed to `color-mix`, which every browser that can run this
 * editor supports and which handles the cases a regex would get wrong.
 */
const withAlpha = (color: string, alpha: number) => {
  const a = clamp(alpha, 0, 1);
  if (a >= 1) return color;

  const hex = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);

  if (short) {
    const [, r, g, b] = short;
    return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}, ${a})`;
  }
  if (long) {
    const [, r, g, b] = long;
    return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${a})`;
  }
  return `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`;
};

/**
 * Where the shadow goes, as a screen-space offset.
 *
 * The angle runs anticlockwise from "east" the way a protractor does, which is
 * why the y component is negated — CSS y grows downwards. -45° therefore puts
 * the shadow to the bottom right, which is what the panel's default looks like.
 */
const vectorFor = (direction: number, distance: number) => {
  const rad = (direction * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * distance,
    dy: -Math.sin(rad) * distance,
  };
};

/**
 * Effect sizes are stored as 0..100 and resolved against the shape's shorter
 * side, so the same effect reads the same on a 40px dot and a 600px banner. A
 * stored pixel count would be a hairline on one and a smear on the other.
 */
const scaleOf = (width: number, height: number) =>
  Math.max(1, Math.min(Math.abs(width) || 1, Math.abs(height) || 1));

const round = (n: number) => Math.round(n * 100) / 100;

export type ShapeFilter = {
  /** Ready for `style.filter`, or undefined when there is nothing to apply. */
  filter?: string;
  /** How far the effect reaches past the shape's box, in px. */
  bleed: number;
};

const NO_FILTER: ShapeFilter = { filter: undefined, bleed: 0 };

/**
 * Turns a stored effect into a CSS filter, plus the room it needs around the
 * shape.
 *
 * The bleed is returned alongside rather than guessed at the call site because
 * only this function knows how far each effect actually throws — an echo
 * reaches twice its offset, a glow reaches its full radius in every direction.
 * Get it wrong and the container clips the effect halfway.
 */
export const buildShapeFilter = (
  effect: ShapeEffect | undefined,
  width: number,
  height: number,
): ShapeFilter => {
  if (!effect || effect.type === "none") return NO_FILTER;

  const scale = scaleOf(width, height);
  const color = effect.color || DEFAULT_COLOR;

  switch (effect.type) {
    case "drop": {
      const distance = (clamp(effect.offset ?? 20, 0, 100) / 100) * scale * 0.5;
      const blur = (clamp(effect.blur ?? 10, 0, 100) / 100) * scale * 0.5;
      const alpha = 1 - clamp(effect.transparency ?? 30, 0, 100) / 100;
      if (alpha <= 0) return NO_FILTER;

      const { dx, dy } = vectorFor(effect.direction ?? -45, distance);
      return {
        filter: `drop-shadow(${round(dx)}px ${round(dy)}px ${round(blur)}px ${withAlpha(color, alpha)})`,
        bleed: Math.min(MAX_BLEED_PX, Math.ceil(distance + blur * 1.5 + 2)),
      };
    }

    case "glow": {
      const radius = (clamp(effect.intensity ?? 40, 0, 100) / 100) * scale * 0.35;
      if (radius <= 0) return NO_FILTER;

      // Three passes rather than one. A single drop-shadow at this radius
      // fades out almost immediately; stacking a wide, a medium and a tight
      // one builds up the dense core Canva's glow has.
      const filter = [
        `drop-shadow(0 0 ${round(radius)}px ${withAlpha(color, 0.55)})`,
        `drop-shadow(0 0 ${round(radius * 0.6)}px ${withAlpha(color, 0.7)})`,
        `drop-shadow(0 0 ${round(radius * 0.3)}px ${color})`,
      ].join(" ");

      return { filter, bleed: Math.min(MAX_BLEED_PX, Math.ceil(radius * 1.6 + 2)) };
    }

    case "echo": {
      const distance = (clamp(effect.offset ?? 13, 0, 100) / 100) * scale * 0.5;
      if (distance <= 0) return NO_FILTER;

      const { dx, dy } = vectorFor(effect.direction ?? -52, distance);
      // Two hard copies, no blur — the second at half the first's strength and
      // twice its distance, which is what makes it read as an echo trailing off
      // rather than as two shadows.
      const filter = [
        `drop-shadow(${round(dx)}px ${round(dy)}px 0 ${withAlpha(color, 0.45)})`,
        `drop-shadow(${round(dx * 2)}px ${round(dy * 2)}px 0 ${withAlpha(color, 0.22)})`,
      ].join(" ");

      return { filter, bleed: Math.min(MAX_BLEED_PX, Math.ceil(distance * 2 + 2)) };
    }

    case "glitch": {
      const distance = (clamp(effect.offset ?? 12, 0, 100) / 100) * scale * 0.25;
      if (distance <= 0) return NO_FILTER;

      const { dx, dy } = vectorFor(effect.direction ?? 0, distance);
      // The chromatic split: the stored colour goes one way, its cyan
      // counterpart the other, both unblurred so the fringes stay crisp.
      const filter = [
        `drop-shadow(${round(-dx)}px ${round(-dy)}px 0 ${withAlpha(GLITCH_COMPLEMENT, 0.85)})`,
        `drop-shadow(${round(dx)}px ${round(dy)}px 0 ${withAlpha(color, 0.85)})`,
      ].join(" ");

      return { filter, bleed: Math.min(MAX_BLEED_PX, Math.ceil(distance + 2)) };
    }

    default:
      return NO_FILTER;
  }
};

/**
 * What a shape is painted with when nothing has set its colour.
 *
 * The library inserts shapes with no colour at all and they have always come
 * out black. Saying so explicitly beats leaving it to `currentColor`, which
 * resolves against whatever text colour happens to be inherited — and so came
 * out differently on the canvas than in the thumbnail rail.
 */
export const SHAPE_DEFAULT_COLOR = "#000000";

/**
 * Strips the fills that stop an outside paint from landing.
 *
 * The library's shapes arrive as a whole `<svg>` whose paths carry
 * `fill="currentColor"`. A presentation attribute on the path beats any `fill`
 * inherited from an ancestor, so a colour or gradient applied from outside is
 * ignored outright until that attribute is gone.
 *
 * `fill="none"` is deliberately left alone. It is a real instruction — it is
 * what keeps a ring a ring — and removing it turns outline shapes into solid
 * blobs.
 */
export const stripPaintableFills = (shape: string) =>
  shape
    .replace(/\sfill="currentcolor"/gi, "")
    .replace(/\sfill='currentcolor'/gi, "")
    .replace(/fill:\s*currentcolor\s*;?/gi, "");

/**
 * The SVG paint for a shape — a gradient reference or its flat colour.
 *
 * Both renderers call this so they cannot drift apart on the fallback, which
 * is exactly how the canvas and the thumbnail came to disagree.
 */
export const resolveShapePaint = (data: ShapeData, gradientId: string) =>
  hasGradientFill(data)
    ? `url(#${gradientId})`
    : data.color || data.fill || SHAPE_DEFAULT_COLOR;

/**
 * The shape's paint as a CSS value, for previews that paint a plain box rather
 * than an SVG.
 *
 * A gradient needs both ends; with either missing the shape falls back to its
 * flat colour rather than rendering a gradient to nowhere.
 */
export const buildShapeFill = (data: ShapeData) => {
  const { gradientFrom, gradientTo } = data;
  if (!gradientFrom || !gradientTo) return data.color || data.fill || SHAPE_DEFAULT_COLOR;

  const angle =
    data.gradientDirection === "vertical"
      ? "to bottom"
      : data.gradientDirection === "horizontal"
        ? "to right"
        : "135deg";

  return `linear-gradient(${angle}, ${gradientFrom}, ${gradientTo})`;
};

/** Whether this shape paints with a gradient rather than a flat colour. */
export const hasGradientFill = (data: ShapeData) =>
  Boolean(data.gradientFrom && data.gradientTo);

/**
 * The gradient's two stops in SVG terms.
 *
 * SVG gradients take coordinates, not CSS keywords, so the direction has to be
 * restated here. Diagonal matches the 135deg CSS default: top-left to
 * bottom-right.
 */
export const svgGradientVector = (direction: ShapeData["gradientDirection"]) => {
  if (direction === "vertical") return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
  if (direction === "horizontal") return { x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
  return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
};

/* ==================== PRESETS ==================== */

export type ShapeEffectPreset = {
  /** Stable key, stored in `effect.preset` so the panel can highlight it. */
  id: string;
  label: string;
  effect: ShapeEffect;
};

/** The four bare effects, the ones with sliders behind them. */
export const BASE_EFFECTS: { id: ShapeEffectType; label: string }[] = [
  { id: "drop", label: "Drop" },
  { id: "glow", label: "Glow" },
  { id: "echo", label: "Echo" },
  { id: "glitch", label: "Glitch" },
];

/** What a base effect starts at when it is first picked. */
export const BASE_EFFECT_DEFAULTS: Record<Exclude<ShapeEffectType, "none">, ShapeEffect> = {
  drop: { type: "drop", direction: -45, offset: 20, blur: 10, transparency: 30, color: "#000000" },
  glow: { type: "glow", intensity: 40, color: "#000000" },
  echo: { type: "echo", direction: -52, offset: 13, color: "#000000" },
  glitch: { type: "glitch", direction: 0, offset: 12, color: "#ff00c8" },
};

/**
 * The named presets: a base effect with its numbers already dialled in.
 *
 * They differ from each other by colour and shape of the shadow, never by the
 * shape's own fill — so applying one is always reversible by picking a
 * different preset, and never disturbs the colour you chose.
 */
export const SHAPE_EFFECT_PRESETS: ShapeEffectPreset[] = [
  {
    id: "radioactive",
    label: "Radioactive",
    effect: { type: "glow", preset: "radioactive", intensity: 70, color: "#4dff00" },
  },
  {
    id: "retro",
    label: "Retro",
    effect: { type: "drop", preset: "retro", direction: -45, offset: 16, blur: 0, transparency: 0, color: "#ff6d00" },
  },
  {
    id: "midnight",
    label: "Midnight",
    effect: { type: "glow", preset: "midnight", intensity: 55, color: "#6b46ff" },
  },
  {
    id: "malibu",
    label: "Malibu",
    effect: { type: "glow", preset: "malibu", intensity: 50, color: "#ff8fc7" },
  },
  {
    id: "chroma",
    label: "Chroma",
    effect: { type: "glitch", preset: "chroma", direction: 0, offset: 14, color: "#ff00c8" },
  },
  {
    id: "digital",
    label: "Digital",
    effect: { type: "glow", preset: "digital", intensity: 45, color: "#6b6bff" },
  },
  {
    id: "aura",
    label: "Aura",
    effect: { type: "glow", preset: "aura", intensity: 75, color: "#7fc4ff" },
  },
  {
    id: "vhs",
    label: "VHS",
    effect: { type: "glitch", preset: "vhs", direction: 20, offset: 18, color: "#ff2ec4" },
  },
  {
    id: "sunset",
    label: "Sunset",
    effect: { type: "glow", preset: "sunset", intensity: 40, color: "#ff8a3d" },
  },
  {
    id: "metallic",
    label: "Metallic",
    effect: { type: "drop", preset: "metallic", direction: -45, offset: 8, blur: 14, transparency: 40, color: "#7a5c12" },
  },
  {
    id: "laser",
    label: "Laser",
    effect: { type: "glow", preset: "laser", intensity: 65, color: "#ff1a1a" },
  },
];

/**
 * The patch that applying a preset writes.
 *
 * The effect only. A preset must never repaint the shape — the colour is set
 * from the Shape Background panel, and having two places quietly writing the
 * same field is what made picking a colour look broken.
 */
export const patchForPreset = (preset: ShapeEffectPreset): Partial<ShapeData> => ({
  effect: { ...preset.effect },
});

/**
 * The patch for painting a shape one flat colour.
 *
 * Clearing the gradient is the whole point. `resolveShapePaint` prefers a
 * gradient whenever both ends are set, so a preset like Sunset leaves one
 * behind and writing `color` on its own then looks like the colour picker is
 * broken — the gradient just keeps winning.
 *
 * The effect survives; only its preset label is dropped, because the fill that
 * came with that preset is exactly what is being replaced and leaving the tile
 * highlighted would claim otherwise.
 */
export const patchForSolidFill = (
  color: string,
  effect?: ShapeEffect,
): Partial<ShapeData> => ({
  color,
  gradientFrom: undefined,
  gradientTo: undefined,
  gradientDirection: undefined,
  ...(effect?.preset ? { effect: { ...effect, preset: undefined } } : {}),
});
