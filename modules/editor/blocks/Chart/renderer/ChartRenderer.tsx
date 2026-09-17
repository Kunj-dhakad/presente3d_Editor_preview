"use client";

import React, { memo } from "react";
import { ChartData } from "@editor/store/editorStore";
import ChartFigure from "./ChartFigure";

const ChartRenderer = memo(({ data }: { data: ChartData }) => {
  const { style } = data;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        // The canvas element owns selection and dragging, so the chart itself
        // stays inert — which is also why it renders without a tooltip.
        pointerEvents: "none",
        position: "relative",
        background: style.background,
        borderRadius: style.borderRadius,
        padding: style.padding,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <ChartFigure
        chartType={data.chartType}
        title={data.title}
        points={data.data}
        style={style}
        interactive={false}
      />
    </div>
  );
});

ChartRenderer.displayName = "ChartRenderer";
export default ChartRenderer;
