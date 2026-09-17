"use client";

import React, { useMemo } from "react";
import useEditorStore, { TextData } from "@editor/store/editorStore";
import { TOC_STYLE_PRESETS, TocStyleKey } from "@editor/blocks/Index/lib/tocStyles";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs kd-fg-muted">
    <span>{label}</span>
    {children}
  </label>
);

const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

export default function IndexSettingsPanel() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);

  const data = useMemo(
    () => slides[activeSlide]?.elements.find((el) => el.id === activeId)?.data as TextData | undefined,
    [activeId, activeSlide, slides],
  );

  if (!data || data.type !== "text" || data.bookRole !== "index" || !activeId) return null;

  const patch = (p: Partial<TextData>) => updateElement(activeId, p, { history: true });
  const input = "w-24 rounded border kd-bd-subtle kd-bg-surface px-2 py-1 text-xs";
  const currentStyle = (data.tocStyle as TocStyleKey) || "classic";

  return (
    <section className="pb-4">
      <div className="px-3 py-2 text-xs font-semibold kd-fg">Index title</div>
      <div className="px-3 pb-2">
        <input
          className="w-full rounded border kd-bd-subtle kd-bg-surface px-2 py-1 text-xs"
          value={data.tocTitle ?? ""}
          onChange={(e) => patch({ tocTitle: e.target.value })}
          placeholder="INDEX"
        />
      </div>

      <div className="px-3 py-2 text-xs font-semibold kd-fg">Design</div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        {TOC_STYLE_PRESETS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => patch(s.preset)}
            className={`rounded-md border px-2 py-1.5 text-[11px] text-left transition ${
              currentStyle === s.key
                ? "kd-bd-accent kd-bg-accent-subtle kd-fg-accent"
                : "kd-bd-subtle kd-fg-muted kd-hv-bg"
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1"
              style={{ background: s.accent }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-3 py-2 text-xs font-semibold kd-fg">Colors</div>
      <Field label="Text color">
        <input type="color" value={data.color ?? "#111827"} onChange={(e) => patch({ color: e.target.value })} />
      </Field>
      <Field label="Accent color">
        <input
          type="color"
          value={data.tocAccentColor ?? "#6366f1"}
          onChange={(e) => patch({ tocAccentColor: e.target.value })}
        />
      </Field>
      <Field label="Background">
        <input
          type="color"
          value={data.backgroundColor && data.backgroundColor.startsWith("#") ? data.backgroundColor : "#ffffff"}
          onChange={(e) => patch({ backgroundColor: e.target.value })}
        />
      </Field>

      <div className="px-3 py-2 text-xs font-semibold kd-fg">Layout</div>
      <Field label="Leader">
        <select className={input} value={data.tocLeader ?? "."} onChange={(e) => patch({ tocLeader: e.target.value })}>
          <option value=".">Dots</option>
          <option value="-">Dashes</option>
          <option value="_">Line</option>
          <option value=" ">None</option>
        </select>
      </Field>
      <Field label="Page numbers">
        <select
          className={input}
          value={data.tocPageAlignment ?? "right"}
          onChange={(e) => patch({ tocPageAlignment: e.target.value as TextData["tocPageAlignment"] })}
        >
          <option value="right">Right</option>
          <option value="left">Left</option>
        </select>
      </Field>
      <Field label="Show page ranges">
        <input
          type="checkbox"
          checked={!!data.tocShowRanges}
          onChange={(e) => patch({ tocShowRanges: e.target.checked })}
        />
      </Field>
      <Field label="Row spacing">
        <input
          className={input}
          type="number"
          min="0"
          value={data.tocSpacing ?? 8}
          onChange={(e) => patch({ tocSpacing: num(e.target.value, 8) })}
        />
      </Field>
      <Field label="Indent">
        <input
          className={input}
          type="number"
          min="0"
          value={data.tocIndent || 16}
          onChange={(e) => patch({ tocIndent: num(e.target.value, 16) })}
        />
      </Field>
      <Field label="Margin top">
        <input
          className={input}
          type="number"
          min="0"
          value={data.tocMarginTop || 16}
          onChange={(e) => patch({ tocMarginTop: num(e.target.value, 16) })}
        />
      </Field>
      <Field label="Margin bottom">
        <input
          className={input}
          type="number"
          min="0"
          value={data.tocMarginBottom || 16}
          onChange={(e) => patch({ tocMarginBottom: num(e.target.value, 16) })}
        />
      </Field>

      <p className="px-3 pt-2 text-[11px] kd-fg-subtle">
        Tip: double-click a chapter name inside the index on the canvas to rename it — the chapter page
        updates automatically, and vice versa.
      </p>
    </section>
  );
}
