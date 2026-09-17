"use client";

import React, { memo, useEffect, useRef, useState } from "react";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartBlock } from "../types/blocks";
import { blockFrame } from "../utils/blockStyles";

interface Props {
  block: ChartBlock;
  /**
   * True when this chart's Flipbook page is in the active resting spread
   * (left page, right page of a spread, or single cover).
   * Used only to detect inactive → active transitions after the page was
   * kept mounted several turns away.
   */
  isPageActive?: boolean;
}

/**
 * Root cause of "works nearby, blank after 4–5 pages away then back":
 *
 * react-pageflip keeps page DOM mounted while the user navigates away.
 * Title/legend are HTML and keep painting. The Recharts SVG tree is left in a
 * stale state under the page's backface-visibility + 3D transforms and does
 * not reliably repaint when that page becomes current again after several
 * turns.
 *
 * Nearby flips still work because the page never left the active stack long
 * enough for the SVG to go stale.
 *
 * Fix: when isPageActive goes false → true (page revisited), remount ONLY the
 * Recharts tree once (paintKey). Geometry stays fixed from blockFrame metrics.
 * No observers, no size changes, no global remount, no Flipbook transform changes.
 */
const ChartRenderer = memo(function ChartRenderer({
  block,
  isPageActive = true,
}: Props) {
  const [paintKey, setPaintKey] = useState(0);
  const wasActiveRef = useRef(isPageActive);

  useEffect(() => {
    if (isPageActive && !wasActiveRef.current) {
      // Page became active again after being away — one controlled chart refresh.
      // Remounting the Recharts tree once is the point here; see the note above.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaintKey((k) => k + 1);
    }
    wasActiveRef.current = isPageActive;
  }, [isPageActive]);

  if (block.hidden) return null;

  const { style, points } = block;

  const padding =
    typeof style.padding === "number" && Number.isFinite(style.padding)
      ? style.padding
      : 0;

  const chartWidth = Math.max(1, Math.round(block.width - padding * 2));
  const chartHeight = Math.max(1, Math.round(block.height - padding * 2));

  const pieMinSide = Math.min(chartWidth, chartHeight);
  const pieOuterRadius = pieMinSide * 0.375;
  const pieInnerRadius =
    block.chartKind === "doughnut" ? pieMinSide * 0.225 : 0;
  const pieCx = chartWidth / 2;
  const pieCy = chartHeight / 2;

  const palette = [
    style.primaryColor,
    style.secondaryColor,
    "#22c55e",
    "#f59e0b",
    "#ec4899",
  ];

  const animationDuration = style.animation ? style.animationDuration : 0;
  const animate = Boolean(style.animation);

  const common = {
    data: points,
    width: chartWidth,
    height: chartHeight,
    margin: { top: block.title ? 26 : 8, right: 12, bottom: 8, left: 4 },
  };

  const axes = (
    <>
      {style.showGrid && (
        <CartesianGrid stroke={style.gridColor} strokeDasharray="3 3" />
      )}
      {style.showXAxis && (
        <XAxis
          dataKey="label"
          stroke={style.axisColor}
          tick={{ fill: style.labelColor, fontSize: style.fontSize }}
        />
      )}
      {style.showYAxis && (
        <YAxis
          stroke={style.axisColor}
          tick={{ fill: style.labelColor, fontSize: style.fontSize }}
        />
      )}
    </>
  );

  const legend = style.showLegend ? (
    <Legend
      verticalAlign={
        style.legendPosition === "top" || style.legendPosition === "bottom"
          ? style.legendPosition
          : "bottom"
      }
      align={
        style.legendPosition === "left"
          ? "left"
          : style.legendPosition === "right"
            ? "right"
            : "center"
      }
      wrapperStyle={{ color: style.legendColor, fontSize: style.fontSize }}
    />
  ) : null;

  const valueLabels = style.showLabels ? (
    <LabelList
      dataKey="value"
      position="top"
      fill={style.labelColor}
      fontSize={style.fontSize}
    />
  ) : null;

  let chart: React.ReactNode;
  if (block.chartKind === "pie" || block.chartKind === "doughnut") {
    chart = (
      <PieChart width={chartWidth} height={chartHeight}>
        <Pie
          data={points}
          dataKey="value"
          nameKey="label"
          cx={pieCx}
          cy={pieCy}
          outerRadius={pieOuterRadius}
          innerRadius={pieInnerRadius}
          isAnimationActive={animate}
          animationDuration={animationDuration}
          label={style.showLabels}
        >
          {points.map((point, index) => (
            <Cell
              key={`${point.label}-${index}`}
              fill={palette[index % palette.length]}
            />
          ))}
        </Pie>
        {legend}
        <Tooltip />
      </PieChart>
    );
  } else if (block.chartKind === "radar") {
    chart = (
      <RadarChart width={chartWidth} height={chartHeight} data={points}>
        <PolarGrid stroke={style.gridColor} />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fill: style.labelColor, fontSize: style.fontSize }}
        />
        <Radar
          dataKey="value"
          stroke={style.primaryColor}
          fill={style.primaryColor}
          fillOpacity={0.45}
          isAnimationActive={animate}
          animationDuration={animationDuration}
        />
        {legend}
        <Tooltip />
      </RadarChart>
    );
  } else if (block.chartKind === "line") {
    chart = (
      <LineChart {...common}>
        {axes}
        <Line
          type="monotone"
          dataKey="value"
          stroke={style.primaryColor}
          strokeWidth={2.5}
          dot={{ fill: style.primaryColor }}
          isAnimationActive={animate}
          animationDuration={animationDuration}
        >
          {valueLabels}
        </Line>
        {legend}
        <Tooltip />
      </LineChart>
    );
  } else if (block.chartKind === "area") {
    chart = (
      <AreaChart {...common}>
        {axes}
        <Area
          type="monotone"
          dataKey="value"
          stroke={style.primaryColor}
          fill={style.primaryColor}
          fillOpacity={0.35}
          isAnimationActive={animate}
          animationDuration={animationDuration}
        >
          {valueLabels}
        </Area>
        {legend}
        <Tooltip />
      </AreaChart>
    );
  } else {
    chart = (
      <BarChart {...common}>
        {axes}
        <Bar
          dataKey="value"
          fill={style.primaryColor}
          radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
          animationDuration={animationDuration}
        >
          {valueLabels}
        </Bar>
        {legend}
        <Tooltip />
      </BarChart>
    );
  }

  return (
    <div
      data-block-id={block.id}
      style={blockFrame(block, {
        opacity: block.opacity,
        background: style.background,
        borderRadius: style.borderRadius,
        padding: style.padding,
        boxSizing: "border-box",
        overflow: "hidden",
      })}
    >
      {block.title && (
        <div
          style={{
            position: "absolute",
            top: style.padding,
            left: style.padding,
            right: style.padding,
            zIndex: 2,
            color: style.labelColor,
            fontFamily: style.fontFamily,
            fontSize: Math.max(style.fontSize + 2, 12),
            fontWeight: style.fontWeight,
            textAlign: "center",
          }}
        >
          {block.title}
        </div>
      )}
      <div
        data-chart-svg-host="true"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "visible",
          zIndex: 1,
          isolation: "isolate",
          transform: "translate3d(0, 0, 0)",
          WebkitTransform: "translate3d(0, 0, 0)",
          backfaceVisibility: "visible",
          WebkitBackfaceVisibility: "visible",
        }}
      >
        {/* paintKey changes only on inactive → active; same geometry every time. */}
        <React.Fragment key={paintKey}>{chart}</React.Fragment>
      </div>
    </div>
  );
});

export default ChartRenderer;