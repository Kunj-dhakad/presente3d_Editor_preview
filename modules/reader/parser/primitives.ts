/**
 * Coercion helpers for untrusted JSON.
 *
 * Exported books come from a file, an API or a postMessage, so every field is
 * `unknown` until proven otherwise. Each helper returns the caller's fallback
 * rather than throwing, which is what lets one malformed block degrade instead
 * of taking the whole book down.
 */

export type RawRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const num = (value: unknown, fallback: number): number => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
};

export const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

/** Undefined-preserving string read, for genuinely optional fields. */
export const optStr = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

export const oneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

/** Font weights are stored as either 700 or "bold", so both stay valid. */
export const weight = (
  value: unknown,
  fallback: number | string,
): number | string =>
  typeof value === "number" || typeof value === "string" ? value : fallback;

export const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export const strList = (value: unknown): string[] =>
  list(value).filter((item): item is string => typeof item === "string");

/**
 * Border radius is authored as a number or a CSS string ("12", "12px"); the
 * renderers only ever want a number of pixels.
 */
export const radius = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

let idCounter = 0;
export const fallbackId = (prefix: string): string =>
  `${prefix}-${(idCounter += 1)}`;
