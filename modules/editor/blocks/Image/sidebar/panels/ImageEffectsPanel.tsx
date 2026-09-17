"use client";
import React from "react";
import useEditorStore, { ImageData } from "@editor/store/editorStore";
import { useThrottledCommit } from "@editor/lib/hooks/useThrottledCommit";

const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  elementId,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  elementId: string;
}) => {
  // Thumb + label follow the pointer from local state; the store write (which
  // re-renders the canvas and thumbnail) is throttled and always flushed on
  // release, so the committed value still matches what's shown.
  const { liveValue, change, release } = useThrottledCommit(
    value ?? min,
    onChange,
    elementId,
  );
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span>{label}</span>
        <span>{liveValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={liveValue}
        onChange={(e) => change(Number(e.target.value))}
        onPointerUp={release}
        onKeyUp={release}
        className="w-full h-1 appearance-none kd-bg-secondary rounded-full
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
};

const ImageEffectsPanel: React.FC = () => {
  // Atomic selector instead of subscribing to the whole `slides` array.
  const element = useEditorStore((s) =>
    s.slides[s.activeSlide]?.elements.find((el) => el.id === s.activeElementId),
  );
  const updateElement = useEditorStore((s) => s.updateElement);

  if (!element || element.data.type !== "image") return null;

  const data = element.data as ImageData;

  const update = (patch: Partial<ImageData>) => {
    updateElement(element.id, patch);
  };

  const handleReset = () => {
    update({
      brightness: 100,
      contrast:   100,
      saturate:   100,
      hueRotate:  0,
      blur:       0,
      grayscale:  0,
      sepia:      0,
    });
  };
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Header */}
      <span className="text-sm font-medium text-foreground">Image Effects</span>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-3">
        <Slider label="Brightness" value={data.brightness ?? 100} min={0}   max={200} onChange={(v) => update({ brightness: v })} elementId={element.id} />
        <Slider label="Contrast"   value={data.contrast   ?? 100} min={0}   max={200} onChange={(v) => update({ contrast: v })} elementId={element.id} />
        <Slider label="Saturation" value={data.saturate   ?? 100} min={0}   max={200} onChange={(v) => update({ saturate: v })} elementId={element.id} />
        <Slider label="Hue"        value={data.hueRotate  ?? 0}   min={0}   max={360} onChange={(v) => update({ hueRotate: v })} elementId={element.id} />
        <Slider label="Blur"       value={data.blur       ?? 0}   min={0}   max={20}  step={0.5} onChange={(v) => update({ blur: v })} elementId={element.id} />
        <Slider label="Grayscale"  value={data.grayscale  ?? 0}   min={0}   max={100} onChange={(v) => update({ grayscale: v })} elementId={element.id} />
        <Slider label="Sepia"      value={data.sepia      ?? 0}   min={0}   max={100} onChange={(v) => update({ sepia: v })} elementId={element.id} />
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="w-full kd-btn text-sm p-1 border-t border-border pt-3"
      >
        Reset
      </button>

    </div>
  );
};

export default ImageEffectsPanel;