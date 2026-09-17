/**
 * Alignment snapping for the canvas.
 *
 * Kept free of React and of the store so the same rules serve every drag
 * surface — `CanvasDragDrop` for shapes, images and the rest, `TextDragAndDrop`
 * for text — instead of each growing its own idea of what "aligned" means.
 *
 * Everything here works in slide coordinates. Zoom belongs to the caller: it
 * passes a tolerance already divided by the zoom, so a snap feels the same
 * distance away at 27% as it does at 200%.
 */

export type SnapBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

/** What an element actually covers on the page, rotation included. */
export type Bounds = { left: number; top: number; right: number; bottom: number };

/** A line to draw, spanning `from`..`to` along the axis it does not sit on. */
export type GuideLine = { axis: "x" | "y"; at: number; from: number; to: number };

/** One "these two gaps match" marker: the pill's value and where to draw it. */
export type SpacingHint = {
  axis: "x" | "y";
  gap: number;
  /** Centre of the run, on the axis the gap is *not* measured along. */
  at: number;
  from: number;
  to: number;
};

export type SnapOutcome<T> = {
  rect: T;
  guides: GuideLine[];
  spacing: SpacingHint[];
};

export type PageSize = { width: number; height: number };

/** The handles that drive a resize; "drag" and "rotate" never reach here. */
export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const DEG = Math.PI / 180;

/** Coincidence test for lines that have already been snapped together. */
const TOUCHING = 0.5;

export const boundsOf = (box: SnapBox): Bounds => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (!box.rotation) {
    return {
      left: box.x,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height,
    };
  }
  // A rotated element aligns by the box it occupies, not by its own edges —
  // which is the only reading that still means something once it is at 30°.
  const cos = Math.abs(Math.cos(box.rotation * DEG));
  const sin = Math.abs(Math.sin(box.rotation * DEG));
  const width = box.width * cos + box.height * sin;
  const height = box.width * sin + box.height * cos;
  return {
    left: cx - width / 2,
    top: cy - height / 2,
    right: cx + width / 2,
    bottom: cy + height / 2,
  };
};

/** A line something can snap to, and the box that put it there. */
export type Candidate = { at: number; source: Bounds | null };

/**
 * Everything a drag needs to snap against, worked out once when it starts.
 *
 * The candidate lines cannot change while one element is being dragged, and
 * rebuilding them on every pointer move meant allocating a few hundred objects
 * a frame for an answer that was already known.
 */
export type SnapPlan = {
  targets: Bounds[];
  page: PageSize;
  x: Candidate[];
  y: Candidate[];
};

/** Element data is not always complete; a half-measured box must not poison
 *  the arithmetic, so it simply stops being something to line up against. */
const isMeasured = (b: Bounds) =>
  Number.isFinite(b.left) &&
  Number.isFinite(b.top) &&
  Number.isFinite(b.right) &&
  Number.isFinite(b.bottom);

const candidatesFor = (targets: Bounds[], page: PageSize, axis: "x" | "y") => {
  const extent = axis === "x" ? page.width : page.height;
  // The page's own edges and middle, which is what centres a title on a spread.
  const list: Candidate[] = [
    { at: 0, source: null },
    { at: extent / 2, source: null },
    { at: extent, source: null },
  ];
  for (const t of targets) {
    if (!isMeasured(t)) continue;
    const [near, far] = axis === "x" ? [t.left, t.right] : [t.top, t.bottom];
    list.push({ at: near, source: t }, { at: (near + far) / 2, source: t }, { at: far, source: t });
  }
  return list.filter((c) => Number.isFinite(c.at));
};

const linesOf = (b: Bounds, axis: "x" | "y") =>
  axis === "x"
    ? [b.left, (b.left + b.right) / 2, b.right]
    : [b.top, (b.top + b.bottom) / 2, b.bottom];

/** The shift that brings this box's nearest line onto a candidate, if any. */
const bestShift = (
  b: Bounds,
  candidates: Candidate[],
  axis: "x" | "y",
  tolerance: number,
) => {
  let best: number | null = null;
  for (const line of linesOf(b, axis)) {
    for (const candidate of candidates) {
      const delta = candidate.at - line;
      if (!Number.isFinite(delta) || Math.abs(delta) > tolerance) continue;
      if (best === null || Math.abs(delta) < Math.abs(best)) best = delta;
    }
  }
  return best ?? 0;
};

/**
 * The guides to draw once the box has been moved into place: every candidate
 * its lines now sit on. Drawn only after snapping, so a line never appears
 * where nothing actually lined up.
 */
const guidesFor = (
  b: Bounds,
  candidates: Candidate[],
  axis: "x" | "y",
  page: PageSize,
): GuideLine[] => {
  const found = new Map<number, GuideLine>();
  const pageExtent = axis === "x" ? page.height : page.width;

  for (const line of linesOf(b, axis)) {
    for (const candidate of candidates) {
      if (Math.abs(candidate.at - line) > TOUCHING) continue;
      // The line reaches across everything it relates, so it reads as a
      // relationship rather than as a stray ruler.
      const [selfFrom, selfTo] =
        axis === "x" ? [b.top, b.bottom] : [b.left, b.right];
      let from = selfFrom;
      let to = selfTo;
      if (!candidate.source) {
        from = 0;
        to = pageExtent;
      } else {
        const [otherFrom, otherTo] =
          axis === "x"
            ? [candidate.source.top, candidate.source.bottom]
            : [candidate.source.left, candidate.source.right];
        from = Math.min(from, otherFrom);
        to = Math.max(to, otherTo);
      }

      const key = Math.round(candidate.at * 100);
      const existing = found.get(key);
      if (existing) {
        existing.from = Math.min(existing.from, from);
        existing.to = Math.max(existing.to, to);
      } else {
        found.set(key, { axis, at: candidate.at, from, to });
      }
    }
  }
  return [...found.values()];
};

/** Neighbours that share the perpendicular band, i.e. are in the same run. */
const inSameRun = (b: Bounds, t: Bounds, axis: "x" | "y") =>
  axis === "x"
    ? t.bottom > b.top && t.top < b.bottom
    : t.right > b.left && t.left < b.right;

/**
 * Equal spacing: with a neighbour on either side, the box settles where the two
 * gaps match. Returns the shift needed and the pills describing both gaps.
 */
const equalSpacing = (
  b: Bounds,
  targets: Bounds[],
  axis: "x" | "y",
  tolerance: number,
): { shift: number; spacing: SpacingHint[] } | null => {
  const near = axis === "x" ? "left" : "top";
  const far = axis === "x" ? "right" : "bottom";

  let before: Bounds | null = null;
  let after: Bounds | null = null;
  for (const t of targets) {
    if (!isMeasured(t) || !inSameRun(b, t, axis)) continue;
    if (t[far] <= b[near] && (!before || t[far] > before[far])) before = t;
    if (t[near] >= b[far] && (!after || t[near] < after[near])) after = t;
  }
  if (!before || !after) return null;

  const gapBefore = b[near] - before[far];
  const gapAfter = after[near] - b[far];
  if (gapBefore < 0 || gapAfter < 0) return null;

  const shift = (gapAfter - gapBefore) / 2;
  if (Math.abs(shift) > tolerance) return null;

  const gap = (gapBefore + gapAfter) / 2;
  if (gap < 1) return null;

  // The connectors sit on the band the three boxes share.
  const [bandFrom, bandTo] =
    axis === "x"
      ? [Math.max(b.top, before.top, after.top), Math.min(b.bottom, before.bottom, after.bottom)]
      : [Math.max(b.left, before.left, after.left), Math.min(b.right, before.right, after.right)];
  const at = (bandFrom + bandTo) / 2;

  return {
    shift,
    spacing: [
      { axis, gap, at, from: before[far], to: b[near] + shift },
      { axis, gap, at, from: b[far] + shift, to: after[near] },
    ],
  };
};

export const prepareSnap = (targets: Bounds[], page: PageSize): SnapPlan => {
  const measured = targets.filter(isMeasured);
  return {
    targets: measured,
    page,
    x: candidatesFor(measured, page, "x"),
    y: candidatesFor(measured, page, "y"),
  };
};

/**
 * Snapping for a move: the box can travel on both axes, so each one takes the
 * nearest alignment it can reach — and falls back to equal spacing when there
 * is no edge or centre worth meeting.
 */
export const snapMove = <T extends SnapBox>(
  rect: T,
  plan: SnapPlan,
  tolerance: number,
): SnapOutcome<T> => {
  const start = boundsOf(rect);
  const spacing: SpacingHint[] = [];
  let dx = 0;
  let dy = 0;

  for (const axis of ["x", "y"] as const) {
    const shift = bestShift(start, plan[axis], axis, tolerance);
    if (shift !== 0) {
      if (axis === "x") dx = shift;
      else dy = shift;
      continue;
    }
    // Nothing to line up with; see whether it sits evenly between neighbours.
    const even = equalSpacing(start, plan.targets, axis, tolerance);
    if (!even) continue;
    if (axis === "x") dx = even.shift;
    else dy = even.shift;
    spacing.push(...even.spacing);
  }

  const snapped = { ...rect, x: rect.x + dx, y: rect.y + dy };
  const bounds = boundsOf(snapped);
  const guides = [
    ...guidesFor(bounds, plan.x, "x", plan.page),
    ...guidesFor(bounds, plan.y, "y", plan.page),
  ];
  return { rect: snapped, guides, spacing };
};

/**
 * Snapping for a resize: only the edges the handle is actually dragging may
 * move, and only while the element is upright — resizing a rotated box along
 * its own axes has no honest answer in page-aligned terms, so it is left alone
 * rather than nudged somewhere the author did not ask for.
 */
export const snapResize = <T extends SnapBox>(
  rect: T,
  handle: ResizeHandle,
  plan: SnapPlan,
  tolerance: number,
): SnapOutcome<T> => {
  if (rect.rotation) return { rect, guides: [], spacing: [] };

  const movesRight = handle.includes("e");
  const movesLeft = handle.includes("w");
  const movesBottom = handle.includes("s");
  const movesTop = handle.includes("n");

  let { x, y, width, height } = rect;

  const pull = (value: number, axis: "x" | "y") => {
    let best: number | null = null;
    for (const candidate of plan[axis]) {
      const delta = candidate.at - value;
      if (!Number.isFinite(delta) || Math.abs(delta) > tolerance) continue;
      if (best === null || Math.abs(delta) < Math.abs(best)) best = delta;
    }
    return best ?? 0;
  };

  if (movesRight) width += pull(x + width, "x");
  if (movesLeft) {
    const delta = pull(x, "x");
    x += delta;
    width -= delta;
  }
  if (movesBottom) height += pull(y + height, "y");
  if (movesTop) {
    const delta = pull(y, "y");
    y += delta;
    height -= delta;
  }

  // A snap must never invert or erase the element it was helping to place.
  if (width < 1 || height < 1) return { rect, guides: [], spacing: [] };

  const snapped = { ...rect, x, y, width, height };
  const bounds = boundsOf(snapped);
  const guides = [
    ...guidesFor(bounds, plan.x, "x", plan.page),
    ...guidesFor(bounds, plan.y, "y", plan.page),
  ];
  return { rect: snapped, guides, spacing: [] };
};
