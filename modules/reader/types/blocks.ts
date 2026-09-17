/**
 * Preview's own block model.
 *
 * These types are deliberately NOT derived from the editor store. The preview
 * consumes exported JSON, which is a wire format that happens to be produced by
 * the editor today; modelling it separately is what lets the reader ship, run
 * and evolve without the editor being in the build at all.
 */

export type BlockKind =
  | "text"
  | "index"
  | "image"
  | "video"
  | "button"
  | "shape"
  | "sticker"
  | "watermark"
  | "table"
  | "chart"
  | "qrcode"
  | "interaction";

export type TextAlign = "left" | "center" | "right" | "justify";
export type StrokeStyle = "none" | "solid" | "dashed" | "dotted" | "inset";

/** Colour/geometry adjustments shared by every raster-ish block. */
export interface MediaFilters {
  contrast: number;
  brightness: number;
  saturate: number;
  blur: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
}

export interface BlockStroke {
  width: number;
  style: StrokeStyle;
  color: string;
}

/** Every block is absolutely positioned inside its page's coordinate system. */
export interface BlockBase {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex?: number;
}

export interface TextBlock extends BlockBase {
  kind: "text";
  /** "chapter" headings still render as ordinary text; the role drives the TOC. */
  role: "body" | "chapter";
  text: string;
  html?: string;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: "normal" | "italic";
  lineHeight?: number;
  letterSpacing?: number;
  align: TextAlign;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "underline" | "line-through" | "none";
  link?: string;
}

/** Table of contents. Its entries are derived from the book, not stored. */
export interface IndexBlock extends BlockBase {
  kind: "index";
  title: string;
  style: string;
  leader: string;
  pageAlignment: "left" | "right";
  showRanges: boolean;
  spacing: number;
  indent: number;
  marginTop: number;
  marginBottom: number;
  accentColor: string;
  /** Which slice of a multi-page index this block shows. */
  indexPage: number;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight: number;
  align: TextAlign;
}

export interface ImageBlock extends BlockBase {
  kind: "image";
  src: string;
  alt?: string;
  objectFit: "cover" | "contain";
  borderRadius: number;
  flipX: boolean;
  flipY: boolean;
  stroke: BlockStroke;
  filters: MediaFilters;
  link?: string;
}

export interface StickerBlock extends Omit<ImageBlock, "kind"> {
  kind: "sticker";
}

export interface VideoBlock extends BlockBase {
  kind: "video";
  src: string;
  thumbnail?: string;
  borderRadius: number;
  flipX: boolean;
  flipY: boolean;
  stroke: BlockStroke;
  filters: MediaFilters;
}

export interface ButtonBlock extends BlockBase {
  kind: "button";
  text: string;
  icon?: string;
  iconPosition: "left" | "right";
  link?: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: "normal" | "italic";
  letterSpacing?: number;
  textAlign: TextAlign;
  textColor: string;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecorationLine?: string;
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: "horizontal" | "vertical" | "diagonal";
  borderColor?: string;
  borderRadius: number;
  stroke: BlockStroke;
  shadowPreset: "none" | "soft" | "regular" | "retro";
}

export interface ShapeBlock extends BlockBase {
  kind: "shape";
  /** Raw inner SVG markup, drawn in a 0 0 100 100 viewBox. */
  svg: string;
  color: string;
  flipX: boolean;
  flipY: boolean;
  stroke: BlockStroke;
}

export interface QrCodeBlock extends BlockBase {
  kind: "qrcode";
  /** Encoded payload (usually a URL). */
  content: string;
  errorCorrection: "L" | "M" | "Q" | "H";
  foreground: string;
  background: string;
}

export interface WatermarkBlock extends BlockBase {
  kind: "watermark";
  text: string;
  color: string;
  fontSize: number;
  pattern: "single" | "grid";
  font?: string;
  letterSpacing?: string;
  imageSrc?: string;
  scale?: string;
}

export interface TableCell {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
}

export interface TableBlock extends BlockBase {
  kind: "table";
  rows: number;
  columns: number;
  cells: TableCell[][];
  style: {
    borderColor: string;
    borderWidth: number;
    background: string;
    cellBackground: string;
    padding: number;
    borderRadius: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number | string;
    fontStyle: "normal" | "italic";
    textDecoration: "none" | "underline";
    textColor: string;
    lineHeight: number;
    letterSpacing: number;
    textAlign: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
  };
  hidden: boolean;
}

export type ChartKind = "bar" | "line" | "pie" | "doughnut" | "area" | "radar";
export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartBlock extends BlockBase {
  kind: "chart";
  chartKind: ChartKind;
  title: string;
  points: ChartPoint[];
  style: {
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
  hidden: boolean;
}

export type PreviewBlock =
  | TextBlock
  | IndexBlock
  | ImageBlock
  | StickerBlock
  | VideoBlock
  | ButtonBlock
  | ShapeBlock
  | WatermarkBlock
  | TableBlock
  | ChartBlock
  | QrCodeBlock
  | import("./interaction").InteractionBlock;
