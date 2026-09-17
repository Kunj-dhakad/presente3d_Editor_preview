import type { TextData } from "@editor/store/editorStore";

export type TocStyleKey =
  | "classic"
  | "minimal"
  | "boxed"
  | "numbered"
  | "colorBar"
  | "underline"
  | "twoColumn";

export type TocStylePreset = {
  key: TocStyleKey;
  label: string;
  description: string;
  accent: string;
  preset: Partial<TextData>;
};

export function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || "").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int) || full.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const TOC_STYLE_PRESETS: TocStylePreset[] = [
  {
    key: "classic",
    label: "Classic Dotted",
    description: "Traditional dotted leader lines with right-aligned page numbers.",
    accent: "#6366f1",
    preset: {
      tocStyle: "classic",
      tocLeader: ".",
      tocSpacing: 8,
      tocAccentColor: "#6366f1",
      color: "#111827",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: 400,
      fontSize: 14,
      lineHeight: 1.4,
      tocPageAlignment: "right",
    },
  },
  {
    key: "minimal",
    label: "Minimal Clean",
    description: "No leader dots, just soft dividers between chapters.",
    accent: "#334155",
    preset: {
      tocStyle: "minimal",
      tocLeader: " ",
      tocSpacing: 10,
      tocAccentColor: "#334155",
      color: "#1f2937",
      fontFamily: "Inter",
      fontWeight: 400,
      fontSize: 14,
      lineHeight: 1.5,
      tocPageAlignment: "right",
    },
  },
  {
    key: "boxed",
    label: "Boxed Cards",
    description: "Each chapter in a soft rounded card with a pill page number.",
    accent: "#7c3aed",
    preset: {
      tocStyle: "boxed",
      tocLeader: ".",
      tocSpacing: 8,
      tocAccentColor: "#7c3aed",
      color: "#1e1b2e",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: 500,
      fontSize: 13,
      lineHeight: 1.4,
      tocPageAlignment: "right",
    },
  },
  {
    key: "numbered",
    label: "Numbered Badges",
    description: "Circular chapter numbers with a light dotted leader.",
    accent: "#0ea5e9",
    preset: {
      tocStyle: "numbered",
      tocLeader: ".",
      tocSpacing: 10,
      tocAccentColor: "#0ea5e9",
      color: "#0f172a",
      fontFamily: "Poppins",
      fontWeight: 500,
      fontSize: 13,
      lineHeight: 1.4,
      tocPageAlignment: "right",
    },
  },
  {
    key: "colorBar",
    label: "Color Bar",
    description: "Accent bar on the left with a colored page-number pill.",
    accent: "#ef4444",
    preset: {
      tocStyle: "colorBar",
      tocLeader: "",
      tocSpacing: 10,
      tocAccentColor: "#ef4444",
      color: "#111827",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: 500,
      fontSize: 14,
      lineHeight: 1.4,
      tocPageAlignment: "right",
    },
  },
  {
    key: "underline",
    label: "Elegant Underline",
    description: "Serif titles with an accent underline and generous spacing.",
    accent: "#b45309",
    preset: {
      tocStyle: "underline",
      tocLeader: "",
      tocSpacing: 12,
      tocAccentColor: "#b45309",
      color: "#292524",
      fontFamily: "Playfair Display",
      fontWeight: 500,
      fontSize: 15,
      lineHeight: 1.5,
      tocPageAlignment: "right",
    },
  },
  {
    key: "twoColumn",
    label: "Two Column Grid",
    description: "Compact two-column layout for long chapter lists.",
    accent: "#059669",
    preset: {
      tocStyle: "twoColumn",
      tocLeader: ".",
      tocSpacing: 8,
      tocAccentColor: "#059669",
      color: "#0f172a",
      fontFamily: "Plus Jakarta Sans",
      fontWeight: 400,
      fontSize: 12,
      lineHeight: 1.4,
      tocPageAlignment: "right",
    },
  },
];

export const getTocStylePreset = (key?: string): TocStylePreset =>
  TOC_STYLE_PRESETS.find((s) => s.key === key) ?? TOC_STYLE_PRESETS[0];
