/**
 * Grid maths for table cells: which cell owns which slot, merging and splitting
 * a rectangle of them, and inserting/removing rows and columns without tearing
 * an existing merge apart.
 *
 * The cell array always holds one entry per grid slot. A merged area keeps its
 * content in the top-left cell (the anchor, carrying rowSpan/colSpan) while the
 * slots it covers stay in the array marked `hidden` so the geometry never has
 * to be reconstructed from spans alone.
 *
 * Types are declared structurally rather than imported so this file stays free
 * of app dependencies — `TableCell` from the store matches it exactly.
 */

export type GridCell = {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
};

export type CellPosition = { row: number; column: number };

/** Inclusive rectangle of grid slots. */
export type CellRange = { top: number; left: number; bottom: number; right: number };

export const cloneCells = (cells: GridCell[][]): GridCell[][] =>
  cells.map((row) => row.map((cell) => ({ ...cell })));

const spanOf = (cell?: GridCell) => ({
  rowSpan: Math.max(1, Math.floor(cell?.rowSpan ?? 1)),
  colSpan: Math.max(1, Math.floor(cell?.colSpan ?? 1)),
});

const setSpan = (cell: GridCell, rowSpan: number, colSpan: number) => {
  cell.rowSpan = rowSpan > 1 ? rowSpan : undefined;
  cell.colSpan = colSpan > 1 ? colSpan : undefined;
};

/** Trims spans that would reach past the grid — a last line of defence so a
 *  malformed table can never render a broken `<table>`. */
export const clampSpans = (cells: GridCell[][]): GridCell[][] => {
  const rows = cells.length;
  const columns = cells[0]?.length ?? 0;
  cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.hidden) return;
      const { rowSpan, colSpan } = spanOf(cell);
      setSpan(cell, Math.min(rowSpan, rows - r), Math.min(colSpan, columns - c));
    }),
  );
  return cells;
};

/** owners[row][column] = position of the cell that actually renders that slot. */
export const buildGrid = (cells: GridCell[][]): CellPosition[][] => {
  const owners = cells.map((row, r) => row.map((_, c) => ({ row: r, column: c })));
  cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.hidden) return;
      const { rowSpan, colSpan } = spanOf(cell);
      for (let dr = 0; dr < rowSpan; dr += 1)
        for (let dc = 0; dc < colSpan; dc += 1)
          if (owners[r + dr]?.[c + dc]) owners[r + dr][c + dc] = { row: r, column: c };
    }),
  );
  return owners;
};

export const rangeOf = (a: CellPosition, b: CellPosition): CellRange => ({
  top: Math.min(a.row, b.row),
  left: Math.min(a.column, b.column),
  bottom: Math.max(a.row, b.row),
  right: Math.max(a.column, b.column),
});

export const rangeArea = (range: CellRange) =>
  (range.bottom - range.top + 1) * (range.right - range.left + 1);

export const rangeContains = (range: CellRange, row: number, column: number) =>
  row >= range.top && row <= range.bottom && column >= range.left && column <= range.right;

/** Grows a range until every merged cell it touches is fully inside it, so a
 *  merge can never cut an existing merge in half. */
export const normalizeRange = (cells: GridCell[][], range: CellRange): CellRange => {
  const rows = cells.length;
  const columns = cells[0]?.length ?? 0;
  if (!rows || !columns) return range;
  const owners = buildGrid(cells);
  const next: CellRange = {
    top: Math.max(0, Math.min(range.top, rows - 1)),
    left: Math.max(0, Math.min(range.left, columns - 1)),
    bottom: Math.max(0, Math.min(range.bottom, rows - 1)),
    right: Math.max(0, Math.min(range.right, columns - 1)),
  };
  // Each pass can pull in further merges, so repeat until it settles.
  for (let guard = 0; guard <= rows * columns; guard += 1) {
    let changed = false;
    for (let r = next.top; r <= next.bottom; r += 1)
      for (let c = next.left; c <= next.right; c += 1) {
        const owner = owners[r]?.[c];
        if (!owner) continue;
        const { rowSpan, colSpan } = spanOf(cells[owner.row]?.[owner.column]);
        if (owner.row < next.top) { next.top = owner.row; changed = true; }
        if (owner.column < next.left) { next.left = owner.column; changed = true; }
        if (owner.row + rowSpan - 1 > next.bottom) { next.bottom = owner.row + rowSpan - 1; changed = true; }
        if (owner.column + colSpan - 1 > next.right) { next.right = owner.column + colSpan - 1; changed = true; }
      }
    if (!changed) break;
  }
  return next;
};

/** Grows a range by one cell to the right or down, so a single selected cell
 *  can still be merged with its neighbour without picking a range first.
 *  Returns null when there is no room left. */
export const extendRange = (
  cells: GridCell[][],
  range: CellRange,
  direction: "right" | "down",
): CellRange | null => {
  const rows = cells.length;
  const columns = cells[0]?.length ?? 0;
  const grown =
    direction === "right"
      ? { ...range, right: range.right + 1 }
      : { ...range, bottom: range.bottom + 1 };
  if (grown.right > columns - 1 || grown.bottom > rows - 1) return null;
  return normalizeRange(cells, grown);
};

/** True when the range holds at least one merged cell that split can undo. */
export const hasMergedCell = (cells: GridCell[][], range: CellRange): boolean => {
  const area = normalizeRange(cells, range);
  for (let r = area.top; r <= area.bottom; r += 1)
    for (let c = area.left; c <= area.right; c += 1) {
      const cell = cells[r]?.[c];
      if (!cell || cell.hidden) continue;
      const { rowSpan, colSpan } = spanOf(cell);
      if (rowSpan > 1 || colSpan > 1) return true;
    }
  return false;
};

/** Merges the range into its top-left cell. Text from the other cells moves
 *  into the anchor rather than being dropped, so nothing is lost silently. */
export const mergeRange = (cells: GridCell[][], range: CellRange): GridCell[][] => {
  const area = normalizeRange(cells, range);
  if (rangeArea(area) < 2) return cells;
  const next = cloneCells(cells);
  const anchor = next[area.top]?.[area.left];
  if (!anchor) return cells;

  const texts: string[] = [];
  for (let r = area.top; r <= area.bottom; r += 1)
    for (let c = area.left; c <= area.right; c += 1) {
      const cell = next[r]?.[c];
      if (!cell) continue;
      if (cell.text.trim()) texts.push(cell.text);
      if (r === area.top && c === area.left) continue;
      cell.hidden = true;
      cell.text = "";
      setSpan(cell, 1, 1);
    }

  anchor.hidden = false;
  anchor.text = texts.join("\n");
  setSpan(anchor, area.bottom - area.top + 1, area.right - area.left + 1);
  return clampSpans(next);
};

/** Splits every merged cell inside the range back into single slots. */
export const splitRange = (cells: GridCell[][], range: CellRange): GridCell[][] => {
  const area = normalizeRange(cells, range);
  const next = cloneCells(cells);
  let changed = false;

  for (let r = area.top; r <= area.bottom; r += 1)
    for (let c = area.left; c <= area.right; c += 1) {
      const cell = next[r]?.[c];
      if (!cell || cell.hidden) continue;
      const { rowSpan, colSpan } = spanOf(cell);
      if (rowSpan === 1 && colSpan === 1) continue;
      setSpan(cell, 1, 1);
      changed = true;
      for (let dr = 0; dr < rowSpan; dr += 1)
        for (let dc = 0; dc < colSpan; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const covered = next[r + dr]?.[c + dc];
          if (!covered) continue;
          covered.hidden = false;
          setSpan(covered, 1, 1);
        }
    }

  return changed ? clampSpans(next) : cells;
};

/** Inserts an empty row before `at`; spans reaching across that seam grow. */
export const insertRow = (cells: GridCell[][], at: number): GridCell[][] => {
  const rows = cells.length;
  const columns = cells[0]?.length ?? 0;
  if (!columns) return cells;
  const index = Math.max(0, Math.min(at, rows));
  const next = cloneCells(cells);
  const owners = buildGrid(cells);
  const stretched = new Set<string>();
  const inserted: GridCell[] = Array.from({ length: columns }, (_, c) => {
    // A slot is inside a merge when the cells above and below it share an owner.
    const above = index > 0 ? owners[index - 1]?.[c] : null;
    const below = owners[index]?.[c];
    const spanning =
      !!above && !!below && above.row === below.row && above.column === below.column;
    if (!spanning || !above) return { text: "" };
    stretched.add(`${above.row}:${above.column}`);
    return { text: "", hidden: true };
  });

  stretched.forEach((key) => {
    const [row, column] = key.split(":").map(Number);
    const anchor = next[row]?.[column];
    if (!anchor) return;
    const { rowSpan, colSpan } = spanOf(anchor);
    setSpan(anchor, rowSpan + 1, colSpan);
  });

  next.splice(index, 0, inserted);
  return clampSpans(next);
};

/** Removes a row, shrinking spans that crossed it and handing a merge that
 *  started on that row down to the row below so its text survives. */
export const deleteRow = (cells: GridCell[][], at: number): GridCell[][] => {
  const rows = cells.length;
  if (rows <= 1) return cells;
  const index = Math.max(0, Math.min(at, rows - 1));
  const next = cloneCells(cells);

  next.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.hidden) return;
      const { rowSpan, colSpan } = spanOf(cell);
      if (rowSpan === 1) return;
      if (index < r || index > r + rowSpan - 1) return;
      if (index === r) {
        const heir = next[r + 1]?.[c];
        if (!heir) return;
        heir.hidden = false;
        heir.text = cell.text;
        setSpan(heir, rowSpan - 1, colSpan);
      } else {
        setSpan(cell, rowSpan - 1, colSpan);
      }
    }),
  );

  next.splice(index, 1);
  return clampSpans(next);
};

/** Removes every row in an inclusive span, bottom-up so indexes stay valid. */
export const deleteRows = (cells: GridCell[][], top: number, bottom: number): GridCell[][] => {
  let next = cells;
  for (let row = bottom; row >= top; row -= 1) {
    if (next.length <= 1) break;
    next = deleteRow(next, row);
  }
  return next;
};

/** Inserts an empty column before `at`; spans reaching across that seam grow. */
export const insertColumn = (cells: GridCell[][], at: number): GridCell[][] => {
  const columns = cells[0]?.length ?? 0;
  if (!cells.length) return cells;
  const index = Math.max(0, Math.min(at, columns));
  const next = cloneCells(cells);
  const owners = buildGrid(cells);
  const stretched = new Set<string>();

  next.forEach((row, r) => {
    const left = index > 0 ? owners[r]?.[index - 1] : null;
    const right = owners[r]?.[index];
    const spanning =
      !!left && !!right && left.row === right.row && left.column === right.column;
    if (spanning && left) stretched.add(`${left.row}:${left.column}`);
    row.splice(index, 0, spanning ? { text: "", hidden: true } : { text: "" });
  });

  stretched.forEach((key) => {
    const [row, column] = key.split(":").map(Number);
    // The anchor may have shifted right by the insert above.
    const anchorColumn = column >= index ? column + 1 : column;
    const anchor = next[row]?.[anchorColumn];
    if (!anchor) return;
    const { rowSpan, colSpan } = spanOf(anchor);
    setSpan(anchor, rowSpan, colSpan + 1);
  });

  return clampSpans(next);
};

/** Removes a column, mirroring deleteRow's span handling. */
export const deleteColumn = (cells: GridCell[][], at: number): GridCell[][] => {
  const columns = cells[0]?.length ?? 0;
  if (columns <= 1) return cells;
  const index = Math.max(0, Math.min(at, columns - 1));
  const next = cloneCells(cells);

  next.forEach((row) =>
    row.forEach((cell, c) => {
      if (cell.hidden) return;
      const { rowSpan, colSpan } = spanOf(cell);
      if (colSpan === 1) return;
      if (index < c || index > c + colSpan - 1) return;
      if (index === c) {
        const heir = row[c + 1];
        if (!heir) return;
        heir.hidden = false;
        heir.text = cell.text;
        setSpan(heir, rowSpan, colSpan - 1);
      } else {
        setSpan(cell, rowSpan, colSpan - 1);
      }
    }),
  );

  next.forEach((row) => row.splice(index, 1));
  return clampSpans(next);
};

/** Removes every column in an inclusive span, right-to-left. */
export const deleteColumns = (cells: GridCell[][], left: number, right: number): GridCell[][] => {
  let next = cells;
  for (let column = right; column >= left; column -= 1) {
    if ((next[0]?.length ?? 0) <= 1) break;
    next = deleteColumn(next, column);
  }
  return next;
};

/** Next cell in reading order that is actually rendered (merged-away slots are
 *  skipped), used for Tab / Shift+Tab. */
export const nextVisibleCell = (
  cells: GridCell[][],
  from: CellPosition,
  step: number,
): CellPosition => {
  const rows = cells.length;
  const columns = cells[0]?.length ?? 0;
  const total = rows * columns;
  if (!total) return from;
  let index = from.row * columns + from.column;
  for (let i = 0; i < total; i += 1) {
    index = (index + step + total) % total;
    const row = Math.floor(index / columns);
    const column = index % columns;
    if (!cells[row]?.[column]?.hidden) return { row, column };
  }
  return from;
};

/** The cell that renders a slot — a click on a merged area edits its anchor. */
export const ownerOf = (cells: GridCell[][], position: CellPosition): CellPosition =>
  buildGrid(cells)[position.row]?.[position.column] ?? position;
