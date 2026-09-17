/**
 * One place that turns a table's saved style into the CSS the `<table>` and its
 * `<td>`s actually use, so the canvas, the preview reader and the library
 * thumbnails can never drift apart.
 *
 * The style shape is declared structurally rather than imported, matching
 * `cellGrid.ts`, so the preview parser's own `TableBlock["style"]` fits too.
 */

import type React from "react";

export type TableVisualStyle = {
  borderColor: string;
  borderWidth: number;
  background: string;
  cellBackground: string;
  padding: number;
  borderRadius?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textColor: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  headerRow?: boolean;
  headerBackground?: string;
  headerTextColor?: string;
  headerFontWeight?: number | string;
  bandedRows?: boolean;
  bandBackground?: string;
  cellSpacing?: number;
  cellRadius?: number;
  borderStyle?: "all" | "outer" | "horizontal" | "none";
};

export type CellStyleContext = {
  row: number;
  column: number;
  rowCount: number;
  columnCount: number;
  /** Rendered width of the cell in slots, so a merged cell still closes the grid. */
  colSpan?: number;
  /** Scales padding/spacing for the small library thumbnails. */
  scale?: number;
};

const lines = (style: TableVisualStyle) => style.borderStyle ?? "all";
const spacing = (style: TableVisualStyle) => Math.max(0, style.cellSpacing ?? 0);

/** True when the row is the painted heading. */
export const isHeaderRow = (style: TableVisualStyle, row: number) =>
  Boolean(style.headerRow) && row === 0;

/** Body rows alternate, ignoring the heading so banding starts under it. */
const isBandedRow = (style: TableVisualStyle, row: number) => {
  if (!style.bandedRows) return false;
  const body = row - (style.headerRow ? 1 : 0);
  return body >= 0 && body % 2 === 1;
};

export const cellFill = (style: TableVisualStyle, row: number) => {
  if (isHeaderRow(style, row)) return style.headerBackground ?? style.cellBackground;
  if (isBandedRow(style, row)) return style.bandBackground ?? style.cellBackground;
  return style.cellBackground;
};

/** CSS for the `<table>` element itself. */
export const tableFrameStyle = (
  style: TableVisualStyle,
  scale = 1,
): React.CSSProperties => {
  const gap = spacing(style) * scale;
  const separate = gap > 0;
  const width = style.borderWidth * scale;
  return {
    width: "100%",
    height: "100%",
    tableLayout: "fixed",
    borderCollapse: separate ? "separate" : "collapse",
    borderSpacing: separate ? gap : 0,
    background: style.background,
    // An outline-only table draws its single frame here; every other mode
    // leaves the drawing to the cells.
    border:
      lines(style) === "outer" && !separate
        ? `${width}px solid ${style.borderColor}`
        : undefined,
    borderRadius: (style.borderRadius ?? 0) * scale,
    overflow: "hidden",
    fontFamily: style.fontFamily,
    fontSize: style.fontSize * scale,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle ?? "normal",
    textDecoration: style.textDecoration ?? "none",
    color: style.textColor,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing * scale,
  };
};

/** CSS for one `<td>`, including the heading / banding / grid-line rules. */
export const tableCellStyle = (
  style: TableVisualStyle,
  context: CellStyleContext,
): React.CSSProperties => {
  const scale = context.scale ?? 1;
  const width = style.borderWidth * scale;
  const line = `${width}px solid ${style.borderColor}`;
  const mode = lines(style);
  const separate = spacing(style) > 0;
  const header = isHeaderRow(style, context.row);
  const lastRow = context.row === context.rowCount - 1;
  const lastColumn =
    context.column + Math.max(1, context.colSpan ?? 1) >= context.columnCount;

  // Detached tiles always carry their own outline, otherwise "outer" would
  // paint a box around each tile instead of around the table.
  const border = (): React.CSSProperties => {
    if (mode === "none" || width <= 0) return { border: "none" };
    if (mode === "horizontal")
      return {
        border: "none",
        borderTop: context.row === 0 ? line : "none",
        borderBottom: line,
      };
    if (mode === "outer")
      return separate
        ? { border: line }
        : {
            border: "none",
            borderTop: context.row === 0 ? line : "none",
            borderLeft: context.column === 0 ? line : "none",
            borderRight: lastColumn ? line : "none",
            borderBottom: lastRow ? line : "none",
          };
    return { border: line };
  };

  return {
    ...border(),
    background: cellFill(style, context.row),
    color: header ? style.headerTextColor ?? style.textColor : style.textColor,
    fontWeight: header
      ? style.headerFontWeight ?? 700
      : style.fontWeight,
    borderRadius: separate ? (style.cellRadius ?? 0) * scale : undefined,
    padding: style.padding * scale,
    boxSizing: "border-box",
    textAlign: style.textAlign,
    verticalAlign: style.verticalAlign,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    overflow: "hidden",
  };
};
