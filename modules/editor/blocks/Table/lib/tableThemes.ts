/**
 * The table look-book: five colour families × three layouts, the grid the
 * Elements → Table Data panel shows as thumbnails.
 *
 * A preset only carries the *visual* half of a table's style. Typography stays
 * with the table, so restyling one from the sidebar keeps the font, size and
 * alignment the user already picked.
 */

import type { TableVisualStyle } from "./tableStyle";

export type TableThemeId = "slate" | "red" | "amber" | "blue" | "violet";
export type TableLayoutId = "grid" | "header" | "cards";

export type TablePalette = {
  id: TableThemeId;
  label: string;
  /** Line + heading colour. */
  base: string;
  /** Body fill for the detached "cards" layout. */
  tint: string;
  /** Alternating band under `tint`. */
  soft: string;
};

export const tablePalettes: TablePalette[] = [
  { id: "slate", label: "Slate", base: "#6b7280", tint: "#e5e7eb", soft: "#f3f4f6" },
  { id: "red", label: "Red", base: "#ef4444", tint: "#fecdd3", soft: "#ffe4e6" },
  { id: "amber", label: "Amber", base: "#f0b429", tint: "#fde8c0", soft: "#fef4e2" },
  { id: "blue", label: "Blue", base: "#3b6bf5", tint: "#c7d5fd", soft: "#e3eafe" },
  { id: "violet", label: "Violet", base: "#7c4dff", tint: "#d9cdff", soft: "#ece6ff" },
];

export const tableLayouts: { id: TableLayoutId; label: string; caption: string }[] = [
  { id: "grid", label: "Plain grid", caption: "Every line drawn" },
  { id: "header", label: "Header row", caption: "Coloured first row" },
  { id: "cards", label: "Card cells", caption: "Detached tinted tiles" },
];

/** The visual half of a table style — everything a preset overrides. */
export type TableLook = Pick<
  TableVisualStyle,
  | "borderColor"
  | "borderWidth"
  | "background"
  | "cellBackground"
  | "borderRadius"
  | "textColor"
  | "headerRow"
  | "headerBackground"
  | "headerTextColor"
  | "headerFontWeight"
  | "bandedRows"
  | "bandBackground"
  | "cellSpacing"
  | "cellRadius"
  | "borderStyle"
>;

const look = (palette: TablePalette, layout: TableLayoutId): TableLook => {
  const common = {
    background: "transparent",
    textColor: "#111827",
    headerTextColor: "#ffffff",
    headerFontWeight: 700 as const,
    borderRadius: 0,
  };
  if (layout === "grid")
    return {
      ...common,
      borderStyle: "all",
      borderColor: palette.base,
      borderWidth: 1.5,
      cellBackground: "#ffffff",
      headerRow: false,
      headerBackground: palette.base,
      bandedRows: false,
      bandBackground: palette.soft,
      cellSpacing: 0,
      cellRadius: 0,
    };
  if (layout === "header")
    return {
      ...common,
      borderStyle: "all",
      borderColor: palette.base,
      borderWidth: 1.5,
      cellBackground: "#ffffff",
      headerRow: true,
      headerBackground: palette.base,
      bandedRows: false,
      bandBackground: palette.soft,
      cellSpacing: 0,
      cellRadius: 0,
    };
  return {
    ...common,
    borderStyle: "none",
    borderColor: palette.base,
    borderWidth: 0,
    cellBackground: palette.tint,
    headerRow: true,
    headerBackground: palette.base,
    bandedRows: true,
    bandBackground: palette.soft,
    cellSpacing: 4,
    cellRadius: 4,
  };
};

export type TablePreset = {
  id: string;
  theme: TableThemeId;
  layout: TableLayoutId;
  label: string;
  look: TableLook;
};

export const tablePresets: TablePreset[] = tableLayouts.flatMap((layout) =>
  tablePalettes.map((palette) => ({
    id: `${palette.id}-${layout.id}`,
    theme: palette.id,
    layout: layout.id,
    label: `${palette.label} ${layout.label.toLowerCase()}`,
    look: look(palette, layout.id),
  })),
);

export const findPreset = (id?: string) =>
  tablePresets.find((preset) => preset.id === id);

export const presetFor = (theme: TableThemeId, layout: TableLayoutId) =>
  tablePresets.find((preset) => preset.theme === theme && preset.layout === layout)!;

/** Which layout a table is wearing, read back from the style it actually has —
 *  a table restyled by hand still lights up the right control. */
export const inferLayout = (style: TableVisualStyle): TableLayoutId => {
  if ((style.cellSpacing ?? 0) > 0) return "cards";
  return style.headerRow ? "header" : "grid";
};

/** The palette a table is closest to, or null once its colours are custom. */
export const inferTheme = (style: TableVisualStyle): TableThemeId | null => {
  const mark = (style.headerRow ? style.headerBackground : style.borderColor) ?? "";
  return (
    tablePalettes.find(
      (palette) => palette.base.toLowerCase() === mark.toLowerCase(),
    )?.id ?? null
  );
};

/** Typography and spacing a brand-new table starts with. */
export const defaultTableTypography = {
  padding: 8,
  fontFamily: "Arial",
  fontSize: 14,
  fontWeight: 400 as number | string,
  fontStyle: "normal" as const,
  textDecoration: "none" as const,
  lineHeight: 1.35,
  letterSpacing: 0,
  textAlign: "left" as const,
  verticalAlign: "middle" as const,
};

export const styleFromPreset = (preset: TablePreset): TableVisualStyle => ({
  ...defaultTableTypography,
  ...preset.look,
});

/** Repaints an existing table without touching its typography. */
export const applyPreset = <T extends TableVisualStyle>(
  style: T,
  preset: TablePreset,
): T => ({ ...style, ...preset.look });
