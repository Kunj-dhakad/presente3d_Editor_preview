"use client";
import React from "react";
import useEditorStore, { ShapeData, ShapeEffect, ShapeEffectType } from "@editor/store/editorStore";
import { useThrottledCommit } from "@editor/lib/hooks/useThrottledCommit";
import {
  BASE_EFFECTS,
  BASE_EFFECT_DEFAULTS,
  SHAPE_EFFECT_PRESETS,
  buildShapeFilter,
  buildShapeFill,
  patchForPreset,
  type ShapeEffectPreset,
} from "@editor/lib/canvas/shapeEffects";

/**
 * The swatch inside a tile. The filter is built at this exact size, so a tile
 * previews the real effect rather than a picture of one.
 */
const SWATCH_PX = 46;

/** One labelled slider with a number box, both driving the same value. */
const Slider = ({
  label,
  value,
  min,
  max,
  identity,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  identity: string;
  onCommit: (next: number) => void;
}) => {
  // Dragging writes to the store on every pixel otherwise, and each write
  // re-renders the canvas — the same reason the opacity panel throttles.
  const { liveValue, change, release } = useThrottledCommit(value, onCommit, identity);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="kd-field-label text-[11px]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={liveValue}
          onChange={(e) => change(Number(e.target.value))}
          onPointerUp={release}
          onKeyUp={release}
          className="kd-range flex-1 h-1.5 cursor-pointer"
        />
        <input
          type="text"
          inputMode="numeric"
          value={liveValue}
          onChange={(e) => {
            const next = Number(e.target.value.replace(/[^0-9-]/g, ""));
            if (Number.isFinite(next)) change(Math.min(max, Math.max(min, next)));
          }}
          className="kd-input w-12 px-1.5 py-1 text-xs text-center font-medium"
        />
      </div>
    </div>
  );
};

/** A preview swatch plus its name, used for both the base effects and presets. */
const EffectTile = ({
  label,
  active,
  background,
  filter,
  onClick,
}: {
  label: string;
  active: boolean;
  background: string;
  filter?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    data-active={active}
    className="kd-chip flex flex-col items-center gap-1.5 px-1 py-2 cursor-pointer"
  >
    {/* The padded box is the effect's room to bleed — without it the tile's own
        bounds would crop the very glow it is advertising. */}
    <span
      className="flex items-center justify-center"
      style={{ width: SWATCH_PX + 16, height: SWATCH_PX + 16 }}
    >
      <span
        style={{
          width: SWATCH_PX,
          height: SWATCH_PX,
          borderRadius: 10,
          background,
          filter,
          display: "block",
        }}
      />
    </span>
    <span className="text-[10px] leading-none font-medium">{label}</span>
  </button>
);

/**
 * Shape effects, as a right-hand panel.
 *
 * It takes no props and reads the active element itself, the way every other
 * sidebar panel does — the surrounding chrome (title, close button, scroll
 * area) belongs to EditToolPanel, not here.
 */
export default function ShapeEffectsPanel() {
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const element = useEditorStore((s) =>
    s.slides[s.activeSlide]?.elements.find((item) => item.id === s.activeElementId),
  );

  if (!activeElementId || element?.data.type !== "shape") return null;
  const data = element.data as ShapeData;

  const update = (patch: Partial<ShapeData>) => updateElement(activeElementId, patch);

  const effect = data.effect;
  const activeType: ShapeEffectType = effect?.type ?? "none";
  const activePreset = effect?.preset;

  /** The shape's own paint, so the base tiles preview the actual shape. */
  const currentFill = buildShapeFill(data) || "var(--kd-accent)";

  /**
   * Picking a base effect keeps whatever numbers are already set for that same
   * type, so flicking between Drop and Glow and back does not throw away the
   * values that were just dialled in.
   */
  const selectBase = (type: ShapeEffectType) => {
    if (type === "none") {
      update({ effect: { type: "none" } });
      return;
    }
    const next: ShapeEffect =
      effect?.type === type
        ? { ...effect, preset: undefined }
        : { ...BASE_EFFECT_DEFAULTS[type as Exclude<ShapeEffectType, "none">] };
    update({ effect: next });
  };

  /** Sliders only ever touch one field of the effect that is already active. */
  const patchEffect = (patch: Partial<ShapeEffect>) => {
    if (!effect || effect.type === "none") return;
    // The preset label is dropped: once a number is changed by hand this is no
    // longer that preset, and leaving the tile highlighted would lie.
    update({ effect: { ...effect, ...patch, preset: undefined } });
  };

  const applyPreset = (preset: ShapeEffectPreset) => update(patchForPreset(preset));

  const hasDirection =
    effect?.type === "drop" || effect?.type === "echo" || effect?.type === "glitch";

  return (
    <div className="p-3 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="kd-field-label text-xs font-semibold tracking-wide uppercase">
          Style
        </span>
        <div className="grid grid-cols-3 gap-2">
          <EffectTile
            label="None"
            active={activeType === "none"}
            background={currentFill}
            onClick={() => selectBase("none")}
          />
          {BASE_EFFECTS.map(({ id, label }) => (
            <EffectTile
              key={id}
              label={label}
              active={activeType === id && !activePreset}
              background={currentFill}
              filter={
                buildShapeFilter(
                  BASE_EFFECT_DEFAULTS[id as Exclude<ShapeEffectType, "none">],
                  SWATCH_PX,
                  SWATCH_PX,
                ).filter
              }
              onClick={() => selectBase(id)}
            />
          ))}
        </div>
      </div>

      {effect && effect.type !== "none" && (
        <div className="flex flex-col gap-3">
          {hasDirection && (
            <Slider
              label="Direction"
              value={effect.direction ?? 0}
              min={-180}
              max={180}
              identity={`${activeElementId}-${effect.type}-direction`}
              onCommit={(v) => patchEffect({ direction: v })}
            />
          )}
          {hasDirection && (
            <Slider
              label="Offset"
              value={effect.offset ?? 0}
              min={0}
              max={100}
              identity={`${activeElementId}-${effect.type}-offset`}
              onCommit={(v) => patchEffect({ offset: v })}
            />
          )}
          {effect.type === "drop" && (
            <Slider
              label="Blur"
              value={effect.blur ?? 0}
              min={0}
              max={100}
              identity={`${activeElementId}-drop-blur`}
              onCommit={(v) => patchEffect({ blur: v })}
            />
          )}
          {effect.type === "drop" && (
            <Slider
              label="Transparency"
              value={effect.transparency ?? 0}
              min={0}
              max={100}
              identity={`${activeElementId}-drop-transparency`}
              onCommit={(v) => patchEffect({ transparency: v })}
            />
          )}
          {effect.type === "glow" && (
            <Slider
              label="Intensity"
              value={effect.intensity ?? 0}
              min={0}
              max={100}
              identity={`${activeElementId}-glow-intensity`}
              onCommit={(v) => patchEffect({ intensity: v })}
            />
          )}

          <div className="flex items-center justify-between">
            <span className="kd-field-label text-[11px]">Colour</span>
            <label className="relative w-7 h-7 rounded-full border kd-bd-subtle cursor-pointer overflow-hidden">
              <span
                className="block w-full h-full"
                style={{ background: effect.color ?? "#000000" }}
              />
              <input
                type="color"
                value={effect.color ?? "#000000"}
                onChange={(e) => patchEffect({ color: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      <div className="kd-toolPanel-hr-devide-border" />

      <div className="flex flex-col gap-2">
        <span className="kd-field-label text-xs font-semibold tracking-wide uppercase">
          Advanced
        </span>
        {/* Previewed on the shape's own fill, not a colour of the preset's
            own: a preset changes the effect and nothing else, so this is
            literally what clicking it will look like. */}
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_EFFECT_PRESETS.map((preset) => (
            <EffectTile
              key={preset.id}
              label={preset.label}
              active={activePreset === preset.id}
              background={currentFill}
              filter={buildShapeFilter(preset.effect, SWATCH_PX, SWATCH_PX).filter}
              onClick={() => applyPreset(preset)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
