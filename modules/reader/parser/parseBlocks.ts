import { shapeMarkup } from "@shared/shapeMarkup";
import type {
  BlockBase,
  BlockStroke,
  ButtonBlock,
  ChartBlock,
  ChartKind,
  ImageBlock,
  IndexBlock,
  MediaFilters,
  PreviewBlock,
  ShapeBlock,
  StickerBlock,
  StrokeStyle,
  TableBlock,
  TableCell,
  TextAlign,
  TextBlock,
  VideoBlock,
  WatermarkBlock,
  QrCodeBlock,
} from "../types/blocks";
import type {
  ContactField,
  ContactFieldKind,
  InteractionBlock,
  InteractionKind,
  QuizQuestion,
} from "../types/interaction";
import {
  bool,
  fallbackId,
  isRecord,
  list,
  num,
  oneOf,
  optStr,
  radius,
  str,
  strList,
  weight,
  type RawRecord,
} from "./primitives";

const ALIGNS = ["left", "center", "right", "justify"] as const;
const TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"] as const;
const STROKE_STYLES: readonly StrokeStyle[] = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "inset",
];
const CHART_KINDS: readonly ChartKind[] = [
  "bar",
  "line",
  "pie",
  "doughnut",
  "area",
  "radar",
];
const INTERACTION_KINDS: readonly InteractionKind[] = [
  "link-area",
  "link-button",
  "tag",
  "caption",
  "social",
  "quiz",
  "question",
  "contact-form",
  "embed-media",
  "spotlight",
  "video-button",
  "audio-button",
  "slideshow",
  "popup-slideshow",
  "nav-prev-page",
  "nav-next-page",
  "nav-goto-page",
  "nav-first-page",
  "nav-last-page",
  "product-card",
  "product-button",
  "price-tag",
];

const parseFilters = (data: RawRecord): MediaFilters => ({
  contrast: num(data.contrast, 100),
  brightness: num(data.brightness, 100),
  saturate: num(data.saturate, 100),
  blur: num(data.blur, 0),
  grayscale: num(data.grayscale, 0),
  sepia: num(data.sepia, 0),
  hueRotate: num(data.hueRotate, 0),
});

const parseStroke = (data: RawRecord): BlockStroke => ({
  width: num(data.strokeWidth, 0),
  style: oneOf(data.strokeStyle, STROKE_STYLES, "none"),
  color: str(data.strokeColor, "#000000"),
});

const parseBase = (
  id: string,
  kind: BlockBase["kind"],
  data: RawRecord,
): BlockBase => ({
  id,
  kind,
  x: num(data.x, 0),
  y: num(data.y, 0),
  width: num(data.width, 0),
  height: num(data.height, 0),
  rotation: num(data.rotation, 0),
  opacity: num(data.opacity, 1),
  zIndex: typeof data.zIndex === "number" ? data.zIndex : undefined,
});

const parseText = (id: string, data: RawRecord): TextBlock => ({
  ...parseBase(id, "text", data),
  kind: "text",
  role: data.bookRole === "chapter" ? "chapter" : "body",
  text: str(data.text),
  html: optStr(data.html),
  color: optStr(data.color),
  backgroundColor: optStr(data.backgroundColor),
  fontFamily: optStr(data.fontFamily),
  fontSize: num(data.fontSize, 16),
  fontWeight: weight(data.fontWeight, 400),
  fontStyle: data.fontStyle === "italic" ? "italic" : "normal",
  lineHeight: typeof data.lineHeight === "number" ? data.lineHeight : undefined,
  letterSpacing:
    typeof data.letterSpacing === "number" ? data.letterSpacing : undefined,
  // `align` is the authored value; `textAlign` is the older field name.
  align: oneOf(data.align ?? data.textAlign, ALIGNS, "left") as TextAlign,
  textTransform: oneOf(data.textTransform, TRANSFORMS, "none"),
  textDecoration: oneOf(
    data.textDecoration,
    ["underline", "line-through", "none"] as const,
    "none",
  ),
  link: optStr(data.link),
});

const parseIndex = (id: string, data: RawRecord): IndexBlock => ({
  ...parseBase(id, "index", data),
  kind: "index",
  title: str(data.tocTitle, "INDEX"),
  style: str(data.tocStyle, "classic"),
  leader: typeof data.tocLeader === "string" ? data.tocLeader : ".",
  pageAlignment: data.tocPageAlignment === "left" ? "left" : "right",
  showRanges: bool(data.tocShowRanges),
  spacing: num(data.tocSpacing, 8),
  indent: num(data.tocIndent, 16),
  marginTop: num(data.tocMarginTop, 16),
  marginBottom: num(data.tocMarginBottom, 16),
  accentColor: str(data.tocAccentColor, "") || str(data.color, "#6366f1"),
  indexPage: num(data.indexPage, 0),
  color: optStr(data.color),
  backgroundColor: optStr(data.backgroundColor),
  fontFamily: optStr(data.fontFamily),
  fontSize: num(data.fontSize, 14),
  fontWeight: weight(data.fontWeight, 400),
  lineHeight: num(data.lineHeight, 1.4),
  align: oneOf(data.align ?? data.textAlign, ALIGNS, "left") as TextAlign,
});

const parseImageLike = <K extends "image" | "sticker">(
  id: string,
  kind: K,
  data: RawRecord,
) => ({
  ...parseBase(id, kind, data),
  kind,
  src: str(data.src),
  alt: optStr(data.alt),
  // Stickers are drawn whole; photos fill their frame.
  objectFit: kind === "sticker" ? ("contain" as const) : ("cover" as const),
  borderRadius: radius(data.borderRadius),
  flipX: bool(data.flipX),
  flipY: bool(data.flipY),
  stroke: parseStroke(data),
  filters: parseFilters(data),
  link: optStr(data.link),
});

const parseVideo = (id: string, data: RawRecord): VideoBlock => ({
  ...parseBase(id, "video", data),
  kind: "video",
  src: str(data.src),
  thumbnail: optStr(data.thumbnail),
  borderRadius: radius(data.borderRadius),
  flipX: bool(data.flipX),
  flipY: bool(data.flipY),
  stroke: parseStroke(data),
  filters: parseFilters(data),
});

const parseButton = (id: string, data: RawRecord): ButtonBlock => ({
  ...parseBase(id, "button", data),
  kind: "button",
  text: str(data.text),
  icon: optStr(data.icon),
  iconPosition: data.iconPosition === "left" ? "left" : "right",
  link: optStr(data.link),
  fontFamily: optStr(data.fontFamily),
  fontSize: num(data.fontSize, 14),
  fontWeight: weight(data.fontWeight, 400),
  fontStyle: data.fontStyle === "italic" ? "italic" : "normal",
  letterSpacing:
    typeof data.letterSpacing === "number" ? data.letterSpacing : undefined,
  textAlign: oneOf(data.textAlign, ALIGNS, "center") as TextAlign,
  textColor: str(data.textColor, "#ffffff"),
  textTransform: oneOf(data.textTransform, TRANSFORMS, "none"),
  textDecorationLine: optStr(data.textDecorationLine),
  backgroundColor: optStr(data.backgroundColor),
  gradientFrom: optStr(data.gradientFrom),
  gradientTo: optStr(data.gradientTo),
  gradientDirection: oneOf(
    data.gradientDirection,
    ["horizontal", "vertical", "diagonal"] as const,
    "diagonal",
  ),
  borderColor: optStr(data.borderColor),
  borderRadius: radius(data.borderRadius),
  stroke: parseStroke(data),
  shadowPreset: oneOf(
    data.shadowPreset,
    ["none", "soft", "regular", "retro"] as const,
    "none",
  ),
});

const parseShape = (id: string, data: RawRecord): ShapeBlock => ({
  ...parseBase(id, "shape", data),
  kind: "shape",
  svg: shapeMarkup(str(data.shape)),
  color: str(data.color, "") || str(data.fill, "#000000"),
  flipX: bool(data.flipX),
  flipY: bool(data.flipY),
  stroke: parseStroke(data),
});

const parseQrCode = (id: string, data: RawRecord): QrCodeBlock => ({
  ...parseBase(id, "qrcode", data),
  kind: "qrcode",
  content: str(data.content),
  bookLink: data.bookLink === true,
  errorCorrection: oneOf(data.ecLevel, ["L", "M", "Q", "H"] as const, "M"),
  foreground: str(data.foreground, "#000000"),
  background: str(data.background, "#ffffff"),
});

const parseWatermark = (id: string, data: RawRecord): WatermarkBlock => ({
  ...parseBase(id, "watermark", data),
  kind: "watermark",
  text: str(data.text),
  color: str(data.color, "#000000"),
  fontSize: num(data.fontSize, 24),
  pattern: data.pattern === "grid" ? "grid" : "single",
  font: optStr(data.font) ?? optStr(data.fontFamily),
  letterSpacing: optStr(data.letterSpacing),
  imageSrc: optStr(data.imageSrc),
  scale: optStr(data.scale),
  // Watermarks sit above the page's other blocks by design.
  rotation: num(data.rotation, -35),
});

const parseCells = (value: unknown): TableCell[][] =>
  list(value).map((row) =>
    list(row).map((cell) => {
      const record = isRecord(cell) ? cell : {};
      return {
        text: str(record.text),
        rowSpan: typeof record.rowSpan === "number" ? record.rowSpan : undefined,
        colSpan: typeof record.colSpan === "number" ? record.colSpan : undefined,
        hidden: bool(record.hidden),
      };
    }),
  );

const parseTable = (id: string, data: RawRecord): TableBlock => {
  const style = isRecord(data.style) ? data.style : {};
  const cells = parseCells(data.cells);
  return {
    ...parseBase(id, "table", data),
    kind: "table",
    rows: num(data.rows, cells.length),
    columns: num(data.columns, cells[0]?.length ?? 0),
    cells,
    style: {
      borderColor: str(style.borderColor, "#e5e7eb"),
      borderWidth: num(style.borderWidth, 1),
      background: str(style.background, "transparent"),
      cellBackground: str(style.cellBackground, "transparent"),
      padding: num(style.padding, 8),
      borderRadius: num(style.borderRadius, 0),
      fontFamily: str(style.fontFamily, "Inter"),
      fontSize: num(style.fontSize, 13),
      fontWeight: weight(style.fontWeight, 400),
      fontStyle: style.fontStyle === "italic" ? "italic" : "normal",
      textDecoration: style.textDecoration === "underline" ? "underline" : "none",
      textColor: str(style.textColor, "#111827"),
      lineHeight: num(style.lineHeight, 1.4),
      letterSpacing: num(style.letterSpacing, 0),
      textAlign: oneOf(
        style.textAlign,
        ["left", "center", "right"] as const,
        "left",
      ),
      verticalAlign: oneOf(
        style.verticalAlign,
        ["top", "middle", "bottom"] as const,
        "middle",
      ),
      // The editor's heading row, banding and grid lines, so a styled table
      // reads the same as it was designed.
      headerRow: bool(style.headerRow),
      headerBackground: typeof style.headerBackground === "string" ? style.headerBackground : undefined,
      headerTextColor: typeof style.headerTextColor === "string" ? style.headerTextColor : undefined,
      headerFontWeight: style.headerFontWeight === undefined ? undefined : weight(style.headerFontWeight, 700),
      bandedRows: bool(style.bandedRows),
      bandBackground: typeof style.bandBackground === "string" ? style.bandBackground : undefined,
      cellSpacing: num(style.cellSpacing, 0),
      cellRadius: num(style.cellRadius, 0),
      borderStyle: oneOf(style.borderStyle, ["all", "outer", "horizontal", "none"] as const, "all"),
    },
    hidden: bool(data.hidden),
  };
};

const parseChart = (id: string, data: RawRecord): ChartBlock => {
  const style = isRecord(data.style) ? data.style : {};
  return {
    ...parseBase(id, "chart", data),
    kind: "chart",
    chartKind: oneOf(data.chartType, CHART_KINDS, "bar"),
    title: str(data.title),
    points: list(data.data).map((point) => {
      const record = isRecord(point) ? point : {};
      return { label: str(record.label), value: num(record.value, 0) };
    }),
    style: {
      primaryColor: str(style.primaryColor, "#6366f1"),
      secondaryColor: str(style.secondaryColor, "#a5b4fc"),
      background: str(style.background, "transparent"),
      gridColor: str(style.gridColor, "#e5e7eb"),
      axisColor: str(style.axisColor, "#9ca3af"),
      labelColor: str(style.labelColor, "#374151"),
      legendColor: str(style.legendColor, "#374151"),
      borderRadius: num(style.borderRadius, 0),
      padding: num(style.padding, 8),
      showLegend: bool(style.showLegend, true),
      legendPosition: oneOf(
        style.legendPosition,
        ["top", "bottom", "left", "right"] as const,
        "bottom",
      ),
      showGrid: bool(style.showGrid, true),
      showLabels: bool(style.showLabels),
      showXAxis: bool(style.showXAxis, true),
      showYAxis: bool(style.showYAxis, true),
      fontSize: num(style.fontSize, 11),
      fontFamily: str(style.fontFamily, "Inter"),
      fontWeight: weight(style.fontWeight, 400),
      animation: bool(style.animation, true),
      animationDuration: num(style.animationDuration, 600),
    },
    hidden: bool(data.hidden),
  };
};

const parseQuizQuestions = (value: unknown): QuizQuestion[] =>
  list(value).map((item, index) => {
    const record = isRecord(item) ? item : {};
    return {
      id: str(record.id) || fallbackId(`quiz-q${index}`),
      question: str(record.question),
      multiple: bool(record.multiple),
      options: list(record.options).map((option, optionIndex) => {
        const optionRecord = isRecord(option) ? option : {};
        return {
          id: str(optionRecord.id) || fallbackId(`quiz-o${optionIndex}`),
          text: str(optionRecord.text),
          correct: bool(optionRecord.correct),
        };
      }),
    };
  });

const parseContactFields = (value: unknown): ContactField[] =>
  list(value).map((item, index) => {
    const record = isRecord(item) ? item : {};
    return {
      id: str(record.id) || fallbackId(`field${index}`),
      label: str(record.label),
      kind: oneOf(
        record.type,
        ["text", "email", "tel", "textarea"] as const,
        "text",
      ) as ContactFieldKind,
      placeholder: optStr(record.placeholder),
      required: bool(record.required),
    };
  });

const parseInteraction = (id: string, data: RawRecord): InteractionBlock => ({
  ...parseBase(id, "interaction", data),
  kind: "interaction",
  interactionKind: oneOf(data.interactionKind, INTERACTION_KINDS, "link-button"),
  svg: str(data.svg),
  text: str(data.text),
  tooltip: optStr(data.tooltip),
  link: optStr(data.link),
  url: optStr(data.url),
  target: oneOf(data.target, ["_self", "_blank", "popup"] as const, "_blank"),
  expandedText: optStr(data.expandedText),
  fontFamily: optStr(data.fontFamily),
  fontSize: num(data.fontSize, 13),
  fontWeight: weight(data.fontWeight, 700),
  textAlign: oneOf(data.textAlign, ALIGNS, "center") as TextAlign,
  textColor: str(data.textColor, "#ffffff"),
  iconColor: optStr(data.iconColor),
  backgroundColor: optStr(data.backgroundColor),
  gradientFrom: optStr(data.gradientFrom),
  gradientTo: optStr(data.gradientTo),
  gradientDirection: oneOf(
    data.gradientDirection,
    ["horizontal", "vertical", "diagonal"] as const,
    "diagonal",
  ),
  borderRadius: radius(data.borderRadius),
  borderColor: optStr(data.borderColor),
  strokeWidth: num(data.strokeWidth, 0),
  strokeStyle: oneOf(data.strokeStyle, STROKE_STYLES, "none"),
  embedUrl: optStr(data.embedUrl),
  provider: optStr(data.provider),
  renderMode: oneOf(
    data.renderMode,
    ["image", "video", "iframe", "external"] as const,
    "iframe",
  ),
  thumbnail: optStr(data.thumbnail),
  autoplay: bool(data.autoplay),
  controls: bool(data.controls, true),
  allowFullscreen: bool(data.allowFullscreen, true),
  quizTitle: optStr(data.quizTitle),
  quizQuestions: parseQuizQuestions(data.quizQuestions),
  questionTitle: optStr(data.questionTitle),
  questionText: optStr(data.questionText),
  questionPlaceholder: optStr(data.questionPlaceholder),
  contactFormTitle: optStr(data.contactFormTitle),
  contactFormDescription: optStr(data.contactFormDescription),
  contactFields: parseContactFields(data.contactFields),
  privacyPolicyText: optStr(data.privacyPolicyText),
  privacyPolicyLink: optStr(data.privacyPolicyLink),
  showMarketingOptIn: bool(data.showMarketingOptIn),
  marketingOptInText: optStr(data.marketingOptInText),
  spotlightTitle: optStr(data.spotlightTitle),
  spotlightContent: optStr(data.spotlightContent),
  spotlightImageUrl: optStr(data.spotlightImageUrl),
  videoUrl: optStr(data.videoUrl),
  audioUrl: optStr(data.audioUrl),
  slideshowImages: strList(data.slideshowImages),
  slideshowInterval: num(data.slideshowInterval, 3000),
  navTargetPage: num(data.navTargetPage, 1),
  productName: optStr(data.productName),
  productPrice: optStr(data.productPrice),
  productImageUrl: optStr(data.productImageUrl),
});

/**
 * Turns one raw element entry into a preview block.
 *
 * Returns null for anything unrecognised so an unknown block type added by a
 * newer authoring tool is skipped rather than crashing an older reader.
 */
export function parseBlock(raw: unknown, index: number): PreviewBlock | null {
  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? raw.data : raw;
  const id = str(raw.id) || fallbackId(`block${index}`);

  switch (data.type) {
    case "text":
      // The TOC is authored as a text element wearing a role.
      return data.bookRole === "index"
        ? parseIndex(id, data)
        : parseText(id, data);
    case "image":
      return parseImageLike(id, "image", data) as ImageBlock;
    case "svg":
      return parseImageLike(id, "sticker", data) as StickerBlock;
    case "video":
      return parseVideo(id, data);
    case "button":
      return parseButton(id, data);
    case "shape":
      return parseShape(id, data);
    case "watermark":
      return parseWatermark(id, data);
    case "qr-code":
      return parseQrCode(id, data);
    case "table":
      return parseTable(id, data);
    case "chart":
      return parseChart(id, data);
    case "interaction":
      return parseInteraction(id, data);
    default:
      return null;
  }
}
