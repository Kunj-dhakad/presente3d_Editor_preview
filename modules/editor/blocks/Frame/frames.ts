/**
 * The frame shapes.
 *
 * Every mask is a CSS `clip-path` written in percentages, which buys three
 * things a fixed SVG path could not: it scales with the element for free, it
 * needs no `url(#id)` reference that a cloned DOM might fail to resolve during
 * export, and it rotates with the element like any other CSS on the box.
 *
 * Adding a shape means adding a row here — nothing else in the frame code
 * knows the list.
 */

import type { CSSProperties } from "react";

export type FrameShape = {
  id: string;
  label: string;
  /** CSS clip-path for the image area. */
  clip: string;
  /** Sensible starting size on the canvas. */
  size: { width: number; height: number };
  /**
   * A card drawn behind the image, for frames that are a physical object
   * rather than a bare cut-out. Insets are percentages of the frame box.
   */
  card?: {
    background: string;
    inset: { top: number; right: number; bottom: number; left: number };
  };
};

/* ==================== SHAPE BUILDERS ====================

   Percent-space generators, so a new mask is a one-line call rather than a
   hand-counted list of coordinates. Everything in the library below is built
   from these — which is what keeps "add more frames later" a matter of adding
   rows rather than touching any of the frame code. */

const pt = (x: number, y: number) => `${x.toFixed(2)}% ${y.toFixed(2)}%`;
const poly = (points: string[]) => `polygon(${points.join(", ")})`;

/** A regular n-gon inscribed in the box, turned `turn` degrees from the top. */
const ngon = (sides: number, turn = 0) =>
  poly(
    Array.from({ length: sides }, (_, i) => {
      const a = (Math.PI * 2 * i) / sides - Math.PI / 2 + (turn * Math.PI) / 180;
      return pt(50 + Math.cos(a) * 50, 50 + Math.sin(a) * 50);
    }),
  );

/** An n-pointed star; `inner` is the waist radius as a fraction of the outer. */
const star = (points: number, inner: number) =>
  poly(
    Array.from({ length: points * 2 }, (_, i) => {
      const r = i % 2 === 0 ? 50 : 50 * inner;
      const a = (Math.PI * i) / points - Math.PI / 2;
      return pt(50 + Math.cos(a) * r, 50 + Math.sin(a) * r);
    }),
  );

/** A rectangle whose bottom edge ripples: `lobes` full waves across the width. */
const wavyBottom = (lobes: number, depth: number) => {
  const steps = lobes * 14;
  const points = [pt(0, 0), pt(100, 0)];
  for (let i = 0; i <= steps; i++) {
    const x = 100 - (i / steps) * 100;
    points.push(pt(x, 100 - depth + Math.sin((i / steps) * Math.PI * 2 * lobes) * depth));
  }
  return poly(points);
};

/** A rectangle with a torn, saw-toothed bottom edge. */
const zigzagBottom = (teeth: number, depth: number) => {
  const points = [pt(0, 0), pt(100, 0)];
  for (let i = 0; i <= teeth * 2; i++) {
    points.push(pt(100 - (i / (teeth * 2)) * 100, i % 2 === 0 ? 100 : 100 - depth));
  }
  return poly(points);
};

/**
 * A closed curve sampled from a polar radius — the organic shapes.
 *
 * The sampling is generous because these are read at two very different sizes:
 * a 58px tile in the picker and a frame filling half a page. Too few samples
 * and the petals of a flower show as flat facets in the large one. The strings
 * are built once when this module loads, so the extra points cost nothing at
 * render time.
 */
const polar = (radius: (angle: number) => number, steps = 144) =>
  poly(
    Array.from({ length: steps }, (_, i) => {
      const t = (Math.PI * 2 * i) / steps;
      const r = radius(t);
      return pt(50 + Math.cos(t) * r, 50 + Math.sin(t) * r);
    }),
  );

/**
 * The heart is sampled from its own parametric curve rather than a polar one:
 * the dimple at the top is exactly the part a radius function loses.
 */
const HEART = poly(
  Array.from({ length: 60 }, (_, i) => {
    const t = (i / 59) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    // Maths coordinates: centre it, and flip y because CSS grows downwards.
    return pt(50 + (x / 17) * 50, 50 - (y / 17) * 46);
  }),
);

/* ==================== THE LIBRARY ====================

   Grouped for reading; the picker lists them in this order and its search box
   matches on the label. */

const SQ = { width: 200, height: 200 };
const WIDE = { width: 240, height: 170 };
const TALL = { width: 170, height: 240 };
const CARD = { background: "#ffffff", inset: { top: 0, right: 0, bottom: 0, left: 0 } };

export const FRAME_SHAPES: FrameShape[] = [
  /* — rectangles and rounds — */
  { id: "circle", label: "Circle", clip: "circle(50% at 50% 50%)", size: SQ },
  { id: "rounded", label: "Rounded", clip: "inset(0 round 10%)", size: WIDE },
  { id: "rectangle", label: "Rectangle", clip: "inset(0)", size: WIDE },
  { id: "oval", label: "Oval", clip: "ellipse(50% 50% at 50% 50%)", size: WIDE },
  { id: "square", label: "Square", clip: "inset(0)", size: SQ },
  { id: "portrait", label: "Portrait", clip: "inset(0)", size: TALL },
  { id: "rounded-soft", label: "Soft corners", clip: "inset(0 round 22%)", size: SQ },
  { id: "squircle", label: "Squircle", clip: "inset(0 round 32%)", size: SQ },
  { id: "pill", label: "Pill", clip: "inset(0 round 9999px)", size: WIDE },
  { id: "capsule", label: "Capsule", clip: "inset(0 round 9999px)", size: TALL },
  { id: "oval-tall", label: "Oval tall", clip: "ellipse(50% 50% at 50% 50%)", size: TALL },

  /* — arches and leaves — */
  { id: "arch", label: "Arch", clip: "inset(0 round 50% 50% 0 0)", size: TALL },
  { id: "arch-soft", label: "Arch soft", clip: "inset(0 round 30% 30% 0 0)", size: TALL },
  { id: "arch-down", label: "Arch down", clip: "inset(0 round 0 0 50% 50%)", size: TALL },
  { id: "leaf", label: "Leaf", clip: "inset(0 round 50% 0 50% 0)", size: SQ },
  { id: "leaf-alt", label: "Leaf alt", clip: "inset(0 round 0 50% 0 50%)", size: SQ },
  { id: "drop", label: "Drop", clip: "inset(0 round 50% 50% 50% 0)", size: SQ },
  { id: "egg", label: "Egg", clip: "inset(0 round 50% 50% 42% 42%)", size: TALL },
  { id: "ticket", label: "Ticket", clip: "inset(0 round 6% / 9%)", size: WIDE },

  /* — polygons — */
  { id: "triangle", label: "Triangle", clip: poly([pt(50, 0), pt(100, 100), pt(0, 100)]), size: SQ },
  { id: "triangle-down", label: "Triangle down", clip: poly([pt(0, 0), pt(100, 0), pt(50, 100)]), size: SQ },
  { id: "diamond", label: "Diamond", clip: ngon(4), size: SQ },
  { id: "pentagon", label: "Pentagon", clip: ngon(5), size: SQ },
  { id: "hexagon", label: "Hexagon", clip: ngon(6), size: SQ },
  { id: "hexagon-flat", label: "Hexagon flat", clip: ngon(6, 90), size: WIDE },
  { id: "heptagon", label: "Heptagon", clip: ngon(7), size: SQ },
  { id: "octagon", label: "Octagon", clip: ngon(8, 22.5), size: SQ },
  { id: "decagon", label: "Decagon", clip: ngon(10), size: SQ },
  { id: "trapezoid", label: "Trapezoid", clip: poly([pt(18, 0), pt(82, 0), pt(100, 100), pt(0, 100)]), size: WIDE },
  { id: "trapezoid-up", label: "Trapezoid up", clip: poly([pt(0, 0), pt(100, 0), pt(82, 100), pt(18, 100)]), size: WIDE },
  { id: "parallelogram", label: "Parallelogram", clip: poly([pt(20, 0), pt(100, 0), pt(80, 100), pt(0, 100)]), size: WIDE },
  { id: "rhombus", label: "Rhombus", clip: poly([pt(30, 0), pt(100, 0), pt(70, 100), pt(0, 100)]), size: WIDE },

  /* — stars and bursts — */
  { id: "star", label: "Star", clip: star(5, 0.4), size: SQ },
  { id: "star-4", label: "Star 4", clip: star(4, 0.32), size: SQ },
  { id: "star-6", label: "Star 6", clip: star(6, 0.5), size: SQ },
  { id: "star-8", label: "Star 8", clip: star(8, 0.58), size: SQ },
  { id: "sunburst", label: "Sunburst", clip: star(16, 0.66), size: SQ },
  { id: "burst", label: "Burst", clip: star(12, 0.72), size: SQ },
  { id: "seal", label: "Seal", clip: star(20, 0.86), size: SQ },

  /* — arrows, tags and signs — */
  { id: "heart", label: "Heart", clip: HEART, size: SQ },
  { id: "arrow-right", label: "Arrow right", clip: poly([pt(0, 22), pt(62, 22), pt(62, 0), pt(100, 50), pt(62, 100), pt(62, 78), pt(0, 78)]), size: WIDE },
  { id: "arrow-left", label: "Arrow left", clip: poly([pt(100, 22), pt(38, 22), pt(38, 0), pt(0, 50), pt(38, 100), pt(38, 78), pt(100, 78)]), size: WIDE },
  { id: "chevron", label: "Chevron", clip: poly([pt(0, 0), pt(75, 0), pt(100, 50), pt(75, 100), pt(0, 100), pt(25, 50)]), size: WIDE },
  { id: "tag", label: "Tag", clip: poly([pt(0, 0), pt(80, 0), pt(100, 50), pt(80, 100), pt(0, 100)]), size: WIDE },
  { id: "bookmark", label: "Bookmark", clip: poly([pt(0, 0), pt(100, 0), pt(100, 100), pt(50, 78), pt(0, 100)]), size: TALL },
  { id: "shield", label: "Shield", clip: poly([pt(0, 0), pt(100, 0), pt(100, 62), pt(50, 100), pt(0, 62)]), size: TALL },
  { id: "house", label: "House", clip: poly([pt(50, 0), pt(100, 40), pt(100, 100), pt(0, 100), pt(0, 40)]), size: SQ },
  { id: "cross", label: "Cross", clip: poly([pt(33, 0), pt(67, 0), pt(67, 33), pt(100, 33), pt(100, 67), pt(67, 67), pt(67, 100), pt(33, 100), pt(33, 67), pt(0, 67), pt(0, 33), pt(33, 33)]), size: SQ },
  { id: "notched", label: "Notched", clip: poly([pt(0, 12), pt(12, 0), pt(88, 0), pt(100, 12), pt(100, 88), pt(88, 100), pt(12, 100), pt(0, 88)]), size: SQ },

  /* — torn and rippled edges — */
  { id: "wave", label: "Wave", clip: wavyBottom(3, 8), size: WIDE },
  { id: "wave-soft", label: "Wave soft", clip: wavyBottom(2, 6), size: WIDE },
  { id: "torn", label: "Torn", clip: zigzagBottom(9, 7), size: WIDE },
  { id: "flower", label: "Flower", clip: polar((t) => 38 + 12 * Math.cos(6 * t)), size: SQ },
  { id: "blob", label: "Blob", clip: polar((t) => 42 + 6 * Math.sin(3 * t) + 4 * Math.cos(5 * t)), size: SQ },
  { id: "scalloped", label: "Scalloped", clip: polar((t) => 44 + 6 * Math.cos(14 * t), 196), size: SQ },

  /* — cards, which draw something of their own behind the picture — */
  { id: "polaroid", label: "Polaroid", clip: "inset(6% 6% 20% 6%)", size: { width: 200, height: 230 }, card: CARD },
  { id: "polaroid-wide", label: "Polaroid wide", clip: "inset(7% 5% 22% 5%)", size: { width: 250, height: 200 }, card: CARD },
  { id: "matted", label: "Matted", clip: "inset(10%)", size: { width: 220, height: 220 }, card: CARD },
];


const PREVIEW_SCENE = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'>
<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
<stop offset='0' stop-color='#cbe7fb'/><stop offset='1' stop-color='#edf7ff'/>
</linearGradient></defs>
<rect width='100' height='100' fill='url(#sky)'/>
<g fill='#ffffff'>
<ellipse cx='63' cy='25' rx='14' ry='9'/><ellipse cx='51' cy='29' rx='9' ry='7'/><ellipse cx='74' cy='30' rx='9' ry='6'/>
</g>
<path d='M0 70 Q20 58 40 68 T78 64 Q90 61 100 67 L100 100 L0 100 Z' fill='#b6dd6b'/>
<path d='M0 81 Q25 71 48 79 T100 77 L100 100 L0 100 Z' fill='#7cba3d'/>
</svg>`;

/** Ready to drop straight into a `background-image`. */
export const FRAME_PREVIEW_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(
  PREVIEW_SCENE,
)}")`;

export const DEFAULT_FRAME_SHAPE = "circle";

export const frameShape = (id: string | undefined): FrameShape =>
  FRAME_SHAPES.find((shape) => shape.id === id) ??
  FRAME_SHAPES.find((shape) => shape.id === DEFAULT_FRAME_SHAPE)!;

/** Pan is stored as a fraction of the overflow, so it survives a resize. */
export const clampOffset = (value: number | undefined) =>
  Math.min(1, Math.max(-1, value ?? 0));

/** Below 1 the image would not cover the frame and the mask would show gaps. */
export const clampScale = (value: number | undefined) =>
  Math.min(5, Math.max(1, value ?? 1));

/** The picture's own pixel dimensions, once the browser has loaded it. */
export type NaturalSize = { width: number; height: number };


export const frameImageRoom = (
  data: { imageScale?: number },
  frame: { width: number; height: number },
  natural: NaturalSize | null,
) => {
  const scale = clampScale(data.imageScale);
  if (!natural || !natural.width || !natural.height) {
    // Nothing loaded yet: only the zoom's own overflow is known to exist.
    const room = ((scale - 1) / 2);
    return { x: frame.width * room, y: frame.height * room, width: 0, height: 0 };
  }
  const cover = Math.max(frame.width / natural.width, frame.height / natural.height);
  const width = natural.width * cover * scale;
  const height = natural.height * cover * scale;
  return {
    x: Math.max(0, (width - frame.width) / 2),
    y: Math.max(0, (height - frame.height) / 2),
    width,
    height,
  };
};

/**
 * How the image sits inside the frame.
 *
 * Laid out explicitly rather than left to `object-fit`, so the same numbers
 * that place it also say how far it may be dragged — and so an offset of ±1 is
 * exactly the edge of the available travel, never past it.
 */
export const frameImageStyle = (
  data: {
    imageScale?: number;
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageRotation?: number;
  },
  frame: { width: number; height: number },
  natural: NaturalSize | null,
): CSSProperties => {
  const room = frameImageRoom(data, frame, natural);
  const rotation = data.imageRotation
    ? `rotate(${data.imageRotation}deg)`
    : undefined;

  if (!room.width || !room.height) {
    // Until the picture reports its size, cover it centred: the right thing to
    // look at while loading, and the right thing if it never loads.
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      transform: [`scale(${clampScale(data.imageScale)})`, rotation]
        .filter(Boolean)
        .join(" "),
      transformOrigin: "center center",
    };
  }

  return {
    position: "absolute",
    width: room.width,
    height: room.height,
    left: (frame.width - room.width) / 2 + clampOffset(data.imageOffsetX) * room.x,
    top: (frame.height - room.height) / 2 + clampOffset(data.imageOffsetY) * room.y,
    maxWidth: "none",
    transform: rotation,
    transformOrigin: "center center",
  };
};
