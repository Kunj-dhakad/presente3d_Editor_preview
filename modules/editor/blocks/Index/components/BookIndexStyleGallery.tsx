"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { TOC_STYLE_PRESETS, TocStyleKey, hexToRgba } from "@editor/blocks/Index/lib/tocStyles";

type Props = {
  onBack: () => void;
  onSelect: (key: TocStyleKey) => void;
};

export default function BookIndexStyleGallery({ onBack, onSelect }: Props) {
  return (
    <div className="kd-text-add-panel-container">
      <div className="kd-text-add-panel-fixed">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer kd-canvasheader-button-all"
            aria-label="Back"
          >
            <FontAwesomeIcon icon={faAngleLeft} />
          </button>
          <span className="kd-toolPanel-heding-text">Index Design</span>
        </div>
        <p className="text-xs kd-fg-muted mb-3">Pick a table-of-contents style to add to your slide.</p>
        <div className="w-full kd-toolPanel-hr-devide-border mb-2" />
      </div>

      <div className="kd-text-add-panel-scroll">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {TOC_STYLE_PRESETS.map((style) => (
            <button
              key={style.key}
              type="button"
              onClick={() => onSelect(style.key)}
              title={style.description}
              className="kd-text-add-panel-card flex flex-col items-center gap-2 p-2 rounded-lg"
            >
              <TocStylePreviewThumb styleKey={style.key} accent={style.accent} />
              <span className="text-xs font-medium text-center">{style.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TocStylePreviewThumb({ styleKey, accent }: { styleKey: TocStyleKey; accent: string }) {
  const box: React.CSSProperties = {
    width: "100%",
    height: 74,
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 6,
    boxSizing: "border-box",
  };
  const lineWidths = [46, 36, 40];

  if (styleKey === "twoColumn") {
    return (
      <div style={box}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[42, 34, 38, 30].map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: w, height: 4, borderRadius: 2, background: "#94a3b8" }} />
              <span style={{ flex: 1, borderBottom: "1px dotted #cbd5e1" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const row = (w: number, i: number) => {
    switch (styleKey) {
      case "boxed":
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: hexToRgba(accent, 0.14),
              borderRadius: 4,
              padding: "3px 6px",
            }}
          >
            <span style={{ width: w, height: 4, borderRadius: 2, background: "#94a3b8" }} />
            <span style={{ width: 10, height: 8, borderRadius: 6, background: accent }} />
          </div>
        );
      case "numbered":
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: accent, flexShrink: 0 }} />
            <span style={{ width: w, height: 4, borderRadius: 2, background: "#94a3b8" }} />
            <span style={{ flex: 1, borderBottom: "1px dotted #cbd5e1" }} />
          </div>
        );
      case "colorBar":
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, borderLeft: `3px solid ${accent}`, paddingLeft: 4 }}>
            <span style={{ width: w, height: 4, borderRadius: 2, background: "#94a3b8" }} />
            <span style={{ flex: 1 }} />
            <span style={{ width: 12, height: 6, borderRadius: 3, background: hexToRgba(accent, 0.35) }} />
          </div>
        );
      case "underline":
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                width: w,
                height: 4,
                borderRadius: 2,
                background: "#94a3b8",
                borderBottom: `2px solid ${accent}`,
                paddingBottom: 2,
              }}
            />
            <span style={{ width: 8, height: 4, borderRadius: 2, background: "#94a3b8" }} />
          </div>
        );
      case "minimal":
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: 4,
            }}
          >
            <span style={{ width: w, height: 4, borderRadius: 2, background: "#94a3b8" }} />
            <span style={{ width: 8, height: 4, borderRadius: 2, background: "#94a3b8" }} />
          </div>
        );
      default:
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: w, height: 4, borderRadius: 2, background: "#94a3b8" }} />
            <span style={{ flex: 1, borderBottom: "1px dotted #cbd5e1" }} />
            <span style={{ width: 8, height: 4, borderRadius: 2, background: "#94a3b8" }} />
          </div>
        );
    }
  };

  return <div style={box}>{lineWidths.map((w, i) => row(w, i))}</div>;
}
