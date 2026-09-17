/**
 * Gradients that run across an open two-page spread.
 *
 * A page only ever paints its own background, so "one gradient over both
 * pages" is really two gradients: each page gets the half of the ramp that
 * lands on it. Cutting at the exact midpoint colour is what makes the seam
 * invisible — the spread reads as one continuous sheet in the reader, while
 * each page stays an ordinary background string that thumbnails and exports
 * already know how to draw.
 *
 * Only horizontal ramps split this way, so every gradient here is `90deg`.
 */

export type SpreadHalves = { left: string; right: string };

type Stop = { color: string; pos: number };

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const parseHex = (hex: string): [number, number, number] | null => {
    if (!HEX.test(hex)) return null;
    const body = hex.length === 4
        ? hex.slice(1).split("").map((c) => c + c).join("")
        : hex.slice(1);
    return [
        parseInt(body.slice(0, 2), 16),
        parseInt(body.slice(2, 4), 16),
        parseInt(body.slice(4, 6), 16),
    ];
};

const toHex = (rgb: number[]) =>
    "#" + rgb
        .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
        .join("");

/**
 * Reads `linear-gradient(<angle>, #hex <n>%, …)`. Hex-only on purpose: it keeps
 * the stop list splittable on commas, and anything else falls back to being
 * used whole rather than mis-parsed.
 */
const parseGradient = (gradient: string): { angle: string; stops: Stop[] } | null => {
    const match = /^linear-gradient\(([^)]*)\)$/i.exec(gradient.trim());
    if (!match) return null;

    const parts = match[1].split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) return null;

    const stops: Stop[] = [];
    for (const part of parts.slice(1)) {
        const [color, pos] = part.split(/\s+/);
        const value = Number.parseFloat(pos ?? "");
        if (!parseHex(color) || !Number.isFinite(value)) return null;
        stops.push({ color, pos: value });
    }

    stops.sort((a, b) => a.pos - b.pos);
    return { angle: parts[0], stops };
};

/** The colour the browser would paint at `pos`% — plain sRGB interpolation, same as the gradient itself. */
const colorAt = (stops: Stop[], pos: number): string => {
    const last = stops[stops.length - 1];
    if (pos <= stops[0].pos) return stops[0].color;
    if (pos >= last.pos) return last.color;

    for (let i = 1; i < stops.length; i++) {
        const from = stops[i - 1];
        const to = stops[i];
        if (pos > to.pos) continue;

        const span = to.pos - from.pos;
        const t = span === 0 ? 0 : (pos - from.pos) / span;
        const a = parseHex(from.color)!;
        const b = parseHex(to.color)!;
        return toHex([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t));
    }
    return last.color;
};

const format = (angle: string, stops: Stop[]) =>
    `linear-gradient(${angle}, ${stops
        .map((s) => `${s.color} ${Math.round(s.pos * 100) / 100}%`)
        .join(", ")})`;

/**
 * Splits one spread-wide gradient into the two page backgrounds that rebuild
 * it. Each half is stretched back to 0–100% of its own page, so laid side by
 * side they reproduce the original ramp exactly.
 *
 * A gradient this cannot parse comes back unchanged on both sides, which still
 * paints something sensible instead of nothing.
 */
export const splitSpreadGradient = (gradient: string): SpreadHalves => {
    const parsed = parseGradient(gradient);
    if (!parsed) return { left: gradient, right: gradient };

    const { angle, stops } = parsed;
    const mid = colorAt(stops, 50);

    const left: Stop[] = [
        { color: colorAt(stops, 0), pos: 0 },
        ...stops.filter((s) => s.pos > 0 && s.pos < 50).map((s) => ({ color: s.color, pos: s.pos * 2 })),
        { color: mid, pos: 100 },
    ];
    const right: Stop[] = [
        { color: mid, pos: 0 },
        ...stops.filter((s) => s.pos > 50 && s.pos < 100).map((s) => ({ color: s.color, pos: (s.pos - 50) * 2 })),
        { color: colorAt(stops, 100), pos: 100 },
    ];

    return { left: format(angle, left), right: format(angle, right) };
};

/** Ready-made spread gradients. Horizontal by definition — see the note up top. */
export const SPREAD_GRADIENTS = [
    "linear-gradient(90deg, #5F9AFC 0%, #1B46D6 100%)",
    "linear-gradient(90deg, #667EEA 0%, #764BA2 100%)",
    "linear-gradient(90deg, #FA709A 0%, #FEE140 100%)",
    "linear-gradient(90deg, #43E97B 0%, #38F9D7 100%)",
    "linear-gradient(90deg, #30CFD0 0%, #330867 100%)",
    "linear-gradient(90deg, #FF9966 0%, #FF5E62 100%)",
    "linear-gradient(90deg, #8E2DE2 0%, #4A00E0 100%)",
    "linear-gradient(90deg, #F7971E 0%, #FFD200 100%)",
    "linear-gradient(90deg, #3A1C71 0%, #D76D77 50%, #FFAF7B 100%)",
    "linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)",
    "linear-gradient(90deg, #141E30 0%, #243B55 100%)",
    "linear-gradient(90deg, #FF512F 0%, #DD2476 100%)",
    "linear-gradient(90deg, #11998E 0%, #38EF7D 100%)",
    "linear-gradient(90deg, #FFB75E 0%, #ED8F03 100%)",
    "linear-gradient(90deg, #2193B0 0%, #6DD5ED 100%)",
    "linear-gradient(90deg, #C33764 0%, #1D2671 100%)",
    "linear-gradient(90deg, #F9F9F9 0%, #D7DDE8 100%)",
    "linear-gradient(90deg, #FFF1EB 0%, #ACE0F9 100%)",
    "linear-gradient(90deg, #FDFBFB 0%, #EBEDEE 100%)",
    "linear-gradient(90deg, #FFECD2 0%, #FCB69F 100%)",
    "linear-gradient(90deg, #A18CD1 0%, #FBC2EB 100%)",
    "linear-gradient(90deg, #84FAB0 0%, #8FD3F4 100%)",
    "linear-gradient(90deg, #E0C3FC 0%, #8EC5FC 100%)",
    "linear-gradient(90deg, #4E54C8 0%, #8F94FB 100%)",
    "linear-gradient(90deg, #654EA3 0%, #EAAFC8 100%)",
    "linear-gradient(90deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
    "linear-gradient(90deg, #DA22FF 0%, #9733EE 100%)",
    "linear-gradient(90deg, #F83600 0%, #F9D423 100%)",
    "linear-gradient(90deg, #00B4DB 0%, #0083B0 100%)",
    "linear-gradient(90deg, #56AB2F 0%, #A8E063 100%)",
    "linear-gradient(90deg, #614385 0%, #516395 100%)",
    "linear-gradient(90deg, #B24592 0%, #F15F79 100%)",
] as const;
