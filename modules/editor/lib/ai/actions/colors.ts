/**
 * Colour normalisation. The planner is asked for hex, but users say "dark navy"
 * and models sometimes echo that back — anything unparseable is rejected rather
 * than written into the document as an invalid CSS value.
 */

const NAMED_COLORS: Record<string, string> = {
    black: "#000000", white: "#ffffff", red: "#ef4444", crimson: "#dc2626",
    maroon: "#7f1d1d", orange: "#f97316", amber: "#f59e0b", yellow: "#facc15",
    gold: "#d4af37", lime: "#84cc16", green: "#22c55e", emerald: "#10b981",
    teal: "#14b8a6", cyan: "#06b6d4", sky: "#0ea5e9", blue: "#3b82f6",
    navy: "#0f172a", indigo: "#6366f1", violet: "#8b5cf6", purple: "#a855f7",
    magenta: "#d946ef", pink: "#ec4899", rose: "#f43f5e", brown: "#78350f",
    beige: "#f5f5dc", cream: "#fdf6ec", ivory: "#fffff0", grey: "#9ca3af",
    gray: "#9ca3af", silver: "#cbd5e1", charcoal: "#1f2937", slate: "#475569",
    transparent: "transparent",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toHex = (r: number, g: number, b: number) =>
    `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("")}`;

const mix = (hex: string, target: string, amount: number) => {
    const from = hexToRgb(hex);
    const to = hexToRgb(target);
    if (!from || !to) return hex;
    return toHex(
        from.r + (to.r - from.r) * amount,
        from.g + (to.g - from.g) * amount,
        from.b + (to.b - from.b) * amount,
    );
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return null;
    let body = match[1];
    if (body.length === 3) body = body.split("").map((c) => c + c).join("");
    return {
        r: parseInt(body.slice(0, 2), 16),
        g: parseInt(body.slice(2, 4), 16),
        b: parseInt(body.slice(4, 6), 16),
    };
};

/** Returns a CSS colour the canvas can render, or null when unparseable. */
export const normalizeColor = (input: unknown): string | null => {
    if (typeof input !== "string") return null;
    const value = input.trim().toLowerCase();
    if (!value) return null;

    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
    if (/^rgba?\(\s*[\d.\s%,/]+\)$/i.test(value)) return value;
    if (/^hsla?\(\s*[\d.\s%,/deg]+\)$/i.test(value)) return value;

    const direct = NAMED_COLORS[value];
    if (direct) return direct;

    // "dark blue", "light gray", "very dark navy"
    const modified = /^(very\s+)?(dark|light|deep|pale|bright)\s+(.+)$/.exec(value);
    if (modified) {
        const base = NAMED_COLORS[modified[3].trim()];
        if (!base || base === "transparent") return null;
        const strength = modified[1] ? 0.55 : 0.35;
        const modifier = modified[2];
        if (modifier === "dark" || modifier === "deep") return mix(base, "#000000", strength);
        return mix(base, "#ffffff", strength);
    }

    return null;
};

/** Perceived lightness (0–1); used to keep text readable on new backgrounds. */
export const luminance = (color: string): number | null => {
    const rgb = hexToRgb(color);
    if (!rgb) return null;
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
};

/** Readable foreground for a background colour. */
export const readableTextColor = (background: string): string => {
    const light = luminance(background);
    if (light === null) return "#111111";
    return light > 0.6 ? "#111111" : "#ffffff";
};

export const lighten = (color: string, amount: number) => mix(color, "#ffffff", clamp(amount, 0, 1));
export const darken = (color: string, amount: number) => mix(color, "#000000", clamp(amount, 0, 1));

/** Background shorthand the canvas already uses for image backgrounds. */
export const backgroundImageValue = (url: string) => `url(${url}) center/cover no-repeat`;
