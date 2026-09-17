"use client";

/**
 * The chart drawing itself — every Recharts decision lives here so the canvas
 * and the preview reader render the same picture from the same style object.
 * Callers own only the outer frame (position, selection, export mode).
 */

import React, { memo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartVisualStyle,
  chartMargin,
  labelStyle,
  legendTextStyle,
  seriesPalette,
  tickStyle,
  tooltipStyle,
} from "../lib/chartStyle";

export type ChartFigureKind =
  | "bar"
  | "line"
  | "pie"
  | "doughnut"
  | "area"
  | "radar";

type Props = {
  chartType: ChartFigureKind;
  title: string;
  points: ReadonlyArray<{ label: string; value: number }>;
  style: ChartVisualStyle;
  /** Canvas charts are inert: the element behind them owns every pointer. */
  interactive?: boolean;
};

const ChartFigure = memo(function ChartFigure({
  chartType,
  title,
  points,
  style,
  interactive = true,
}: Props) {
  const data = points as { label: string; value: number }[];
  const palette = seriesPalette(style, data.length);
  const seriesName = title || "Value";
  const duration = style.animation ? style.animationDuration : 0;
  const common = { data, margin: chartMargin(style) };

  const axes = (
    <>
      {style.showGrid && (
        <CartesianGrid stroke={style.gridColor} strokeDasharray="3 3" />
      )}
      {style.showXAxis && (
        <XAxis dataKey="label" stroke={style.axisColor} tick={tickStyle(style)} />
      )}
      {style.showYAxis && (
        // `auto` keeps the left gutter to the width of the numbers actually
        // printed; the 60px default was leaving the plot visibly off-centre.
        <YAxis
          stroke={style.axisColor}
          tick={tickStyle(style)}
          width="auto"
          fontSize={style.fontSize}
        />
      )}
    </>
  );

  const legend = style.showLegend ? (
    <Legend
      // `position` (Recharts 3.10) is what actually moves the legend to the
      // side and flips it vertical; `align` alone left it stuck at the bottom.
      position={style.legendPosition}
      formatter={(value) => <span style={legendTextStyle(style)}>{value}</span>}
      wrapperStyle={legendTextStyle(style)}
    />
  ) : null;

  const valueLabels = style.showLabels ? (
    <LabelList dataKey="value" position="top" {...labelStyle(style)} />
  ) : null;

  const tooltip = interactive ? (
    <Tooltip {...tooltipStyle(style)} />
  ) : null;

  /** One dot per row, in that row's own colour. */
  const coloredDot = ({
    cx,
    cy,
    index,
  }: {
    cx?: number;
    cy?: number;
    index: number;
  }) => (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={3.5}
      fill={palette[index] ?? style.primaryColor}
      stroke={style.background === "transparent" ? "none" : style.background}
      strokeWidth={1}
    />
  );

  let chart: React.ReactNode;
  if (chartType === "pie" || chartType === "doughnut") {
    chart = (
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          innerRadius={chartType === "doughnut" ? "45%" : 0}
          isAnimationActive={style.animation}
          animationDuration={duration}
          label={style.showLabels ? labelStyle(style) : false}
        >
          {data.map((point, index) => (
            <Cell key={`${point.label}-${index}`} fill={palette[index]} />
          ))}
        </Pie>
        {legend}
        {tooltip}
      </PieChart>
    );
  } else if (chartType === "radar") {
    chart = (
      <RadarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        {/* Radar used to ignore the grid, axis and label switches entirely. */}
        {style.showGrid && <PolarGrid stroke={style.gridColor} />}
        {style.showXAxis && (
          <PolarAngleAxis dataKey="label" tick={tickStyle(style)} />
        )}
        <Radar
          name={seriesName}
          dataKey="value"
          stroke={style.primaryColor}
          fill={style.primaryColor}
          fillOpacity={0.45}
          dot={coloredDot}
          isAnimationActive={style.animation}
          animationDuration={duration}
        >
          {valueLabels}
        </Radar>
        {legend}
        {tooltip}
      </RadarChart>
    );
  } else if (chartType === "line") {
    chart = (
      <LineChart {...common}>
        {axes}
        <Line
          name={seriesName}
          type="monotone"
          dataKey="value"
          stroke={style.primaryColor}
          strokeWidth={2.5}
          dot={coloredDot}
          isAnimationActive={style.animation}
          animationDuration={duration}
        >
          {valueLabels}
        </Line>
        {legend}
        {tooltip}
      </LineChart>
    );
  } else if (chartType === "area") {
    chart = (
      <AreaChart {...common}>
        {axes}
        <Area
          name={seriesName}
          type="monotone"
          dataKey="value"
          stroke={style.primaryColor}
          fill={style.primaryColor}
          fillOpacity={0.35}
          dot={coloredDot}
          isAnimationActive={style.animation}
          animationDuration={duration}
        >
          {valueLabels}
        </Area>
        {legend}
        {tooltip}
      </AreaChart>
    );
  } else {
    chart = (
      <BarChart {...common}>
        {axes}
        <Bar
          name={seriesName}
          dataKey="value"
          // Cells paint the bars; this is what the legend swatch reads, and
          // without it the swatch falls back to black.
          fill={style.primaryColor}
          radius={[4, 4, 0, 0]}
          isAnimationActive={style.animation}
          animationDuration={duration}
        >
          {data.map((point, index) => (
            <Cell key={`${point.label}-${index}`} fill={palette[index]} />
          ))}
          {valueLabels}
        </Bar>
        {legend}
        {tooltip}
      </BarChart>
    );
  }

  return (
    // A flex column, not an absolute title over a full-height plot: reserving
    // the heading as a real row is what lets pie and radar sit centred in what
    // is left instead of drifting under their own title.
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
      }}
    >
      {title && (
        <div
          style={{
            flex: "0 0 auto",
            paddingBottom: 4,
            color: style.labelColor,
            fontFamily: style.fontFamily,
            fontSize: Math.max(Number(style.fontSize) + 2, 12),
            fontWeight: style.fontWeight,
            lineHeight: 1.3,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default ChartFigure;
