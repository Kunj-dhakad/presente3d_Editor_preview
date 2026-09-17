"use client";
import React from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import useEditorStore, { ChartType } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";



export const chartCards: { type: ChartType; title: string }[] = [
  { type: "bar", title: "Bar Chart" },
  { type: "pie", title: "Pie Chart" },
  { type: "line", title: "Line Chart" },
  { type: "area", title: "Area Chart" },
  { type: "radar", title: "Radar Chart" },
];

const style = {
  primaryColor: "#4F46E5",
  secondaryColor: "#06B6D4",
  background: "#fff",
  gridColor: "#e2e8f0",
  axisColor: "#64748b",
  labelColor: "#334155",
  legendColor: "#334155",
  borderRadius: 8,
  padding: 12,
  showLegend: true,
  legendPosition: "bottom" as const,
  showGrid: true,
  showLabels: false,
  showXAxis: true,
  showYAxis: true,
  fontSize: 11,
  fontFamily: "Arial",
  fontWeight: 400,
  animation: true,
  animationDuration: 400,
};
export default function Charts() {
  const addElement = useEditorStore((s) => s.addElement);
  // Selectors, not the whole store: this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const back = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];
  const insert = (chartType: ChartType) => {
    const width = Math.min(400, Math.max(220, (canvas?.width ?? 432) - 32));
    const height = Math.min(260, Math.max(160, (canvas?.height ?? 240) - 32));
    addElement({
      type: "chart",
      x: Math.max(16, ((canvas?.width ?? width) - width) / 2),
      y: Math.max(16, ((canvas?.height ?? height) - height) / 2),
      width,
      height,
      rotation: 0,
      chartType,
      title: "Sales",
      data: [
        { label: "A", value: 30 },
        { label: "B", value: 55 },
        { label: "C", value: 80 },
        { label: "D", value: 45 },
        { label: "E", value: 60 },
      ],
      style,
    });
    // Fresh charts open their settings once, like a newly added interaction.
    // Re-selecting the chart later never reopens them; only the top toolbar does.
    const inserted = useEditorStore
      .getState()
      .slides[activeSlide]?.elements.at(-1);
    if (inserted) useEditorStore.getState().setActiveElementId(inserted.id);
    const ui = useEditorUIStore.getState();
    if (ui.activePanelType === "main")
      ui.setLastMainPanel(useEditorStore.getState().activeRightPanel);
    useEditorStore.getState().setActiveRightPanel("ChartSettings");
    ui.setActivePanelType("edit");
    ui.setSidebarWidth("edit");
  };
  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button
          type="button"
          onClick={() => back(null)}
          aria-label="Back to elements"
          className="kd-icon-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="kd-panel-header-title">Charts</h2>
          <p className="kd-panel-subtext">Elements / Chart Library</p>
        </div>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-body kd-asset-grid kd-custom-scrollbar">
        {chartCards.map((chart) => (
          <button
            key={chart.type}
            type="button"
            onClick={() => insert(chart.type)}
            className="kd-element-card p-4 text-left cursor-pointer"
          >
            <BarChart3 className="mb-4" style={{ color: "var(--kd-accent)" }} />
            <span className="block text-sm font-semibold">{chart.title}</span>
            <span className="kd-panel-subtext">Insert instantly</span>
          </button>
        ))}
      </div>
    </div>
  );
}
