"use client";
import React, { useState } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from "lucide-react";
import {
  KdbuttonEditSettingArrowUpLeftIcon,
  KdbuttonEditSettingArrowUpRightIcon,
  KdbuttonEditSettingVerticalIcon,
  KdbuttonEditSettingArrowDownLeftIcon,
  KdbuttonEditSettingArrowDownRightIcon,
} from "@editor/lib/icon/icons";

import useEditorStore, { ButtonData } from "@editor/store/editorStore";
import {
  Block,
  ColorInput,
  Dropdown,
  Field,
  IconSegmented,
  Section,
  Segmented,
  Switch,
  numberInput,
} from "@editor/layout/EditBarPanel/SettingsControls";

const FONT_FAMILIES = ["Geist", "Inter", "Poppins", "Roboto", "Montserrat", "Playfair Display", "Lato", "Nunito", "Raleway", "Oswald"];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 30, 36, 48];
const FONT_WEIGHTS = [
  { label: "Thin", value: 100 },
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "SemiBold", value: 600 },
  { label: "Bold", value: 700 },
  { label: "Extra Bold", value: 800 },
  { label: "Black", value: 900 },
];
const LINE_STYLES = [
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
  { label: "Double", value: "double" },
];
const SHADOW_PRESETS: { label: string; value: "none" | "soft" | "regular" | "retro"; shadow: string }[] = [
  { label: "None", value: "none", shadow: "none" },
  { label: "Soft", value: "soft", shadow: "0 2px 8px rgba(0,0,0,0.15)" },
  { label: "Regular", value: "regular", shadow: "0 4px 12px rgba(0,0,0,0.25)" },
  { label: "Retro", value: "retro", shadow: "3px 3px 0 rgba(0,0,0,0.8)" },
];
const ALIGN_OPTIONS = [
  { value: "left", title: "Align left", Icon: AlignLeft },
  { value: "center", title: "Align center", Icon: AlignCenter },
  { value: "right", title: "Align right", Icon: AlignRight },
] as const;
const VALIGN_OPTIONS = [
  { value: "top", title: "Align top", Icon: AlignVerticalJustifyStart },
  { value: "middle", title: "Align middle", Icon: AlignVerticalJustifyCenter },
  { value: "bottom", title: "Align bottom", Icon: AlignVerticalJustifyEnd },
] as const;
const CASE_OPTIONS = [
  { value: "none", title: "As typed", label: "—" },
  { value: "capitalize", title: "Capitalise", label: "Ag" },
  { value: "lowercase", title: "Lower case", label: "ag" },
  { value: "uppercase", title: "Upper case", label: "AG" },
] as const;

const DIRECTION_OPTIONS = [
  { value: "diagonal-up-left", title: "To top left", Icon: KdbuttonEditSettingArrowUpLeftIcon },
  { value: "diagonal-up-right", title: "To top right", Icon: KdbuttonEditSettingArrowUpRightIcon },
  { value: "vertical", title: "Downwards", Icon: KdbuttonEditSettingVerticalIcon },
  { value: "diagonal-down-left", title: "To bottom left", Icon: KdbuttonEditSettingArrowDownLeftIcon },
  { value: "diagonal-down-right", title: "To bottom right", Icon: KdbuttonEditSettingArrowDownRightIcon },
] as const;

const BORDER_RADIUS_OPTIONS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 999];
const LETTER_SPACING_OPTIONS = [-5, -2, -1, 0, 1, 2, 3, 5, 10, 15, 20];

interface ExtendedButtonData extends Omit<ButtonData, "gradientDirection"> {
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  borderStyle?: "dashed" | "dotted" | "double" | "none" | "solid";
  shadowPreset?: "none" | "soft" | "regular" | "retro";
  opacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: "diagonal-up-left" | "diagonal-up-right" | "vertical" | "diagonal-down-left" | "diagonal-down-right";
}

export default function BtnMoreSetting() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);

  const slide = slides[activeSlide];
  const activeElement = slide?.elements.find((el) => el.id === activeElementId);
  const data = activeElement?.data as ExtendedButtonData | undefined;

  const hasGradient = !!(data?.gradientFrom && data?.gradientTo);
  const [fillMode, setFillMode] = useState<"solid" | "gradient">(hasGradient ? "gradient" : "solid");
  const [borderEnabled, setBorderEnabled] = useState(!!(data?.borderWidth && data.borderWidth > 0));

  const patch = (p: Partial<ExtendedButtonData>) => {
    if (!activeElementId) return;
    updateElement(activeElementId, p as Partial<ButtonData>, { history: true });
  };
  if (!data) return null;

  const bgColor = data.backgroundColor ?? "#6d28d9";
  const gradientFrom = data.gradientFrom ?? bgColor;
  const gradientTo = data.gradientTo ?? "#a855f7";
  const gradientDirection = data.gradientDirection ?? "vertical";
  const textColor = data.textColor ?? "#000000";
  const borderColor = data.borderColor ?? "#000000";
  const borderWidth = data.borderWidth ?? 2;
  const borderRadius = data.borderRadius ?? 8;
  const borderStyle = data.borderStyle ?? "solid";
  const fontSize = data.fontSize ?? 16;
  const fontFamily = data.fontFamily ?? "Geist";
  const fontWeight = (data.fontWeight as number) ?? 400;
  const letterSpacing = data.letterSpacing ?? 0;
  const textTransform = data.textTransform ?? "none";
  const textAlign = data.textAlign ?? "left";
  const verticalAlign = data.verticalAlign ?? "top";
  const opacityVal = (data.opacity ?? 1) * 100;
  const shadowPreset = data.shadowPreset ?? "none";
  const fillPreview =
    fillMode === "gradient"
      ? `linear-gradient(${gradientDirection === "vertical"
        ? "to bottom"
        : gradientDirection === "diagonal-up-left"
          ? "to top left"
          : gradientDirection === "diagonal-up-right"
            ? "to top right"
            : gradientDirection === "diagonal-down-left"
              ? "to bottom left"
              : "to bottom right"
      }, ${gradientFrom}, ${gradientTo})`
      : bgColor;

  return (
    <div className="pb-6">
      <Section title="Text">
        <Field label="Font" stacked>
          <Dropdown
            value={fontFamily}
            options={FONT_FAMILIES.map((f) => ({ label: f, value: f }))}
            onChange={(v) => patch({ fontFamily: v })}
          />
        </Field>
        <Field label="Size & weight" stacked>
          <div className="flex gap-1.5">
            <Dropdown
              value={fontSize}
              options={FONT_SIZES.map((s) => ({ label: `${s}px`, value: s }))}
              onChange={(v) => patch({ fontSize: parseInt(v) })}
              className="flex-1"
            />
            <Dropdown
              value={fontWeight}
              options={FONT_WEIGHTS}
              onChange={(v) => patch({ fontWeight: parseInt(v) })}
              className="flex-1"
            />
          </div>
        </Field>
        <Field label="Align">
          <IconSegmented
            options={[...ALIGN_OPTIONS]}
            active={textAlign as (typeof ALIGN_OPTIONS)[number]["value"]}
            onChange={(v) => patch({ textAlign: v })}
          />
        </Field>
        <Field label="Vertical">
          <IconSegmented
            options={[...VALIGN_OPTIONS]}
            active={verticalAlign as (typeof VALIGN_OPTIONS)[number]["value"]}
            onChange={(v) => patch({ verticalAlign: v })}
          />
        </Field>
        <Field label="Case">
          <IconSegmented
            options={[...CASE_OPTIONS]}
            active={textTransform as (typeof CASE_OPTIONS)[number]["value"]}
            onChange={(v) => patch({ textTransform: v })}
          />
        </Field>
        <Field label="Letter spacing">
          <Dropdown
            value={letterSpacing}
            options={LETTER_SPACING_OPTIONS.map((v) => ({ label: `${v}%`, value: v }))}
            onChange={(v) => patch({ letterSpacing: parseFloat(v) })}
          />
        </Field>
        <Field label="Color" stacked>
          <ColorInput color={textColor} onChange={(next) => patch({ textColor: next })} />
        </Field>
      </Section>

      <Section title="Fill">
        <Field label="Type">
          <Segmented
            options={[
              { value: "solid", label: "Solid" },
              { value: "gradient", label: "Gradient" },
            ]}
            active={fillMode}
            onChange={setFillMode}
          />
        </Field>
        {fillMode === "solid" ? (
          <Field label="Background" stacked>
            <ColorInput
              color={bgColor}
              onChange={(next) => patch({ backgroundColor: next })}
            />
          </Field>
        ) : (
          <>
            <Field label="From" stacked>
              <ColorInput
                color={gradientFrom}
                onChange={(next) => patch({ gradientFrom: next })}
              />
            </Field>
            <Field label="To" stacked>
              <ColorInput
                color={gradientTo}
                onChange={(next) => patch({ gradientTo: next })}
              />
            </Field>
            <Field label="Direction">
              <IconSegmented
                options={[...DIRECTION_OPTIONS]}
                active={gradientDirection}
                onChange={(v) => patch({ gradientDirection: v })}
              />
            </Field>
            <Block>
              <span className="kd-set-bar" style={{ background: fillPreview }} />
            </Block>
          </>
        )}
      </Section>

      <Section title="Border">
        <Field label="Border">
          <Switch
            on={borderEnabled}
            onChange={(next) => {
              setBorderEnabled(next);
              patch({ borderWidth: next ? borderWidth || 2 : 0 });
            }}
          />
        </Field>
        {borderEnabled && (
          <>
            <Field label="Color" stacked>
              <ColorInput
                color={borderColor}
                onChange={(next) => patch({ borderColor: next })}
              />
            </Field>
            <Field label="Width">
              <input
                type="number"
                min="0"
                className={numberInput}
                value={borderWidth}
                onChange={(e) => patch({ borderWidth: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Line style">
              <Dropdown
                value={borderStyle}
                options={LINE_STYLES}
                onChange={(v) =>
                  patch({
                    borderStyle: v as ExtendedButtonData["borderStyle"],
                    strokeStyle: v as ButtonData["strokeStyle"],
                  })
                }
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Box">
        <Field label="Opacity (%)">
          <input
            type="number"
            min={0}
            max={100}
            className={numberInput}
            value={Math.round(opacityVal)}
            onChange={(e) => patch({ opacity: parseInt(e.target.value) / 100 })}
          />
        </Field>
        <Field label="Corner rounded">
          <Dropdown
            value={borderRadius}
            options={BORDER_RADIUS_OPTIONS.map((r) => ({
              label: r === 999 ? "Full" : `${r}px`,
              value: r,
            }))}
            onChange={(v) => patch({ borderRadius: parseInt(v) })}
          />
        </Field>
      </Section>

      <Section title="Shadow">
        <Block className="grid grid-cols-4 gap-1.5">
          {SHADOW_PRESETS.map(({ label, value, shadow }) => (
            <button
              key={label}
              type="button"
              onClick={() => patch({ shadowPreset: value })}
              className={`kd-set-tile ${shadowPreset === value ? "kd-set-tile-active" : ""}`}
            >
              <span className="kd-set-sample" style={{ boxShadow: shadow }} />
              {label}
            </button>
          ))}
        </Block>
      </Section>
    </div>
  );
}
