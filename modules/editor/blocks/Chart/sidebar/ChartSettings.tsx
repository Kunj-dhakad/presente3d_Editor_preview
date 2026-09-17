"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  BarChart3,
  ChartPie,
  Donut,
  LineChart,
  Plus,
  Radar,
  Trash2,
} from "lucide-react";
import useEditorStore, {
  ChartData,
  ChartPoint,
  ChartType,
} from "@editor/store/editorStore";
import { seriesPalette } from "@editor/blocks/Chart/lib/chartStyle";
import {
  Block,
  Field,
  Hint,
  IconButton,
  Section,
  Segmented,
  Swatch,
  Switch,
  Toggle,
  actionButton,
  input,
  numberInput,
  numeric,
  smallInput,
  textInput,
} from "@editor/layout/EditBarPanel/SettingsControls";

const CHART_TYPES: { value: ChartType; label: string; Icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Bar", Icon: BarChart3 },
  { value: "line", label: "Line", Icon: LineChart },
  { value: "area", label: "Area", Icon: AreaChart },
  { value: "pie", label: "Pie", Icon: ChartPie },
  { value: "doughnut", label: "Donut", Icon: Donut },
  { value: "radar", label: "Radar", Icon: Radar },
];

export default function ChartSettings() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const chart = useMemo(
    () =>
      slides[activeSlide]?.elements.find((item) => item.id === activeId)?.data as
        | ChartData
        | undefined,
    [activeId, activeSlide, slides],
  );
  // The canvas paints rows from this same palette, so the panel can show each
  // row the colour it will actually get instead of leaving it a surprise.
  const palette = useMemo(
    () => (chart ? seriesPalette(chart.style, chart.data.length) : []),
    [chart],
  );
  if (!chart || chart.type !== "chart" || !activeId) return null;

  const patch = (next: Partial<ChartData>) =>
    updateElement(activeId, next, { history: true });
  const patchStyle = (next: Partial<ChartData["style"]>) =>
    patch({ style: { ...chart.style, ...next } });
  const patchPoint = (index: number, next: Partial<ChartPoint>) =>
    patch({
      data: chart.data.map((point, i) => (i === index ? { ...point, ...next } : point)),
    });

  const style = chart.style;
  const isRound = chart.chartType === "pie" || chart.chartType === "doughnut";
  const isRadar = chart.chartType === "radar";
  const hasCartesianAxes = !isRound && !isRadar;

  return (
    <div className="pb-6">
      <Section title="Type">
        <Block className="grid grid-cols-3 gap-1.5">
          {CHART_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => patch({ chartType: value })}
              className={`kd-set-tile ${
                chart.chartType === value ? "kd-set-tile-active" : ""
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </Block>
      </Section>

      <Section title="Chart">
        <Field label="Title">
          <input
            className={textInput}
            value={chart.title}
            placeholder="Untitled"
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>
        <Field label="Size (W × H)">
          <input
            className={smallInput}
            type="number"
            min="80"
            value={Math.round(chart.width)}
            onChange={(e) => patch({ width: numeric(e.target.value, chart.width) })}
          />
          <input
            className={smallInput}
            type="number"
            min="80"
            value={Math.round(chart.height)}
            onChange={(e) => patch({ height: numeric(e.target.value, chart.height) })}
          />
        </Field>
        <Field label="Padding">
          <input
            className={numberInput}
            type="number"
            min="0"
            value={style.padding}
            onChange={(e) => patchStyle({ padding: numeric(e.target.value, style.padding) })}
          />
        </Field>
        <Field label="Corner radius">
          <input
            className={numberInput}
            type="number"
            min="0"
            value={style.borderRadius}
            onChange={(e) =>
              patchStyle({ borderRadius: numeric(e.target.value, style.borderRadius) })
            }
          />
        </Field>
      </Section>

      <Section title="Data">
        <Block className="space-y-1.5">
          {chart.data.map((point, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span
                title="Row colour"
                className="kd-set-row-dot"
                style={{ background: palette[index] }}
              />
              <input
                aria-label={`Row ${index + 1} label`}
                className={`${input} min-w-0 flex-1`}
                value={point.label}
                onChange={(e) => patchPoint(index, { label: e.target.value })}
              />
              <input
                aria-label={`Row ${index + 1} value`}
                className={smallInput}
                type="number"
                value={point.value}
                onChange={(e) =>
                  patchPoint(index, { value: numeric(e.target.value, point.value) })
                }
              />
              <IconButton
                title="Delete row"
                disabled={chart.data.length <= 1}
                onClick={() => patch({ data: chart.data.filter((_, i) => i !== index) })}
              >
                <Trash2 size={12} />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            className={`${actionButton} w-full`}
            onClick={() =>
              patch({
                data: [...chart.data, { label: `Item ${chart.data.length + 1}`, value: 0 }],
              })
            }
          >
            <Plus size={12} /> Add row
          </button>
        </Block>
      </Section>

      <Section title="Legend & axes">
        <Field label="Legend">
          <Switch on={style.showLegend} onChange={(next) => patchStyle({ showLegend: next })} />
        </Field>
        {style.showLegend && (
          <Field label="Position">
            <Segmented
              options={[
                { value: "top", label: "Top" },
                { value: "bottom", label: "Bottom" },
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              active={style.legendPosition}
              onChange={(next) => patchStyle({ legendPosition: next })}
            />
          </Field>
        )}
        <Field label="Value labels">
          <Switch on={style.showLabels} onChange={(next) => patchStyle({ showLabels: next })} />
        </Field>
        {/* Pie and doughnut have no grid or axes to switch, so the rows that
            would do nothing for them are simply not offered. */}
        {!isRound && (
          <Field label="Grid">
            <Switch on={style.showGrid} onChange={(next) => patchStyle({ showGrid: next })} />
          </Field>
        )}
        {hasCartesianAxes && (
          <Field label="X axis">
            <Switch on={style.showXAxis} onChange={(next) => patchStyle({ showXAxis: next })} />
          </Field>
        )}
        {hasCartesianAxes && (
          <Field label="Y axis">
            <Switch on={style.showYAxis} onChange={(next) => patchStyle({ showYAxis: next })} />
          </Field>
        )}
        {isRadar && (
          <Field label="Point labels">
            <Switch on={style.showXAxis} onChange={(next) => patchStyle({ showXAxis: next })} />
          </Field>
        )}
      </Section>

      <Section title="Colors">
        <Field label="Row 1">
          <Swatch
            color={style.primaryColor}
            onChange={(next) => patchStyle({ primaryColor: next })}
          />
        </Field>
        <Field label="Row 2">
          <Swatch
            color={style.secondaryColor}
            onChange={(next) => patchStyle({ secondaryColor: next })}
          />
        </Field>
        <Hint>Later rows pick their own colours, each one different from the last.</Hint>
        <Field label="Chart fill">
          <Swatch
            color={style.background}
            onChange={(next) => patchStyle({ background: next })}
          />
        </Field>
        <Field label="Grid color">
          <Swatch color={style.gridColor} onChange={(next) => patchStyle({ gridColor: next })} />
        </Field>
        <Field label="Axis color">
          <Swatch color={style.axisColor} onChange={(next) => patchStyle({ axisColor: next })} />
        </Field>
      </Section>

      <Section title="Text">
        <Field label="Font">
          <input
            className={textInput}
            value={style.fontFamily}
            onChange={(e) => patchStyle({ fontFamily: e.target.value })}
          />
        </Field>
        <Field label="Font size">
          <input
            className={numberInput}
            type="number"
            min="8"
            value={style.fontSize}
            onChange={(e) => patchStyle({ fontSize: numeric(e.target.value, style.fontSize) })}
          />
        </Field>
        <Field label="Color">
          <Swatch
            color={style.labelColor}
            onChange={(next) => patchStyle({ labelColor: next, legendColor: next })}
          />
        </Field>
        <Field label="Format">
          <Toggle
            active={Number(style.fontWeight) >= 700}
            label="B"
            title="Bold"
            style={{ fontWeight: 700 }}
            onClick={() =>
              patchStyle({ fontWeight: Number(style.fontWeight) >= 700 ? 400 : 700 })
            }
          />
        </Field>
      </Section>

      <Section title="Motion">
        <Field label="Animate">
          <Switch on={style.animation} onChange={(next) => patchStyle({ animation: next })} />
        </Field>
        {style.animation && (
          <Field label="Duration (ms)">
            <input
              className={numberInput}
              type="number"
              min="0"
              step="100"
              value={style.animationDuration}
              onChange={(e) =>
                patchStyle({
                  animationDuration: numeric(e.target.value, style.animationDuration),
                })
              }
            />
          </Field>
        )}
      </Section>
    </div>
  );
}
