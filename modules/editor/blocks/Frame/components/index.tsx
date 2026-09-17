"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { LibraryEmpty } from "@editor/layout/AssetsPanel/AddSection/Elements/LibraryStates";
import { FRAME_PREVIEW_IMAGE, FRAME_SHAPES } from "../frames";

export default function Frames() {
  const [query, setQuery] = useState("");
  const addElement = useEditorStore((s) => s.addElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const setCategory = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FRAME_SHAPES.filter((shape) =>
      shape.label.toLowerCase().includes(needle),
    );
  }, [query]);

  const insert = (shapeId: string) => {
    const shape = FRAME_SHAPES.find((item) => item.id === shapeId);
    if (!shape) return;
    const { width, height } = shape.size;
    addElement({
      type: "frame",
      frameShape: shape.id,
      x: Math.max(16, ((canvas?.width ?? width) - width) / 2),
      y: Math.max(16, ((canvas?.height ?? height) - height) / 2),
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
    });
  };

  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-label="Back to elements"
          className="kd-icon-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="kd-panel-header-title">Frames</h2>
          <p className="kd-panel-subtext">Elements / Frames</p>
        </div>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-toolbar">
        <label className="kd-search-box">
          <Search size={15} className="kd-icon-text" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search frames..."
          />
        </label>
      </div>
      <div className="kd-panel-divider" />

      <div className="kd-panel-body kd-asset-grid kd-asset-grid-3 kd-custom-scrollbar">
        {visible.map((shape) => (
          <button
            key={shape.id}
            type="button"
            title={shape.label}
            onClick={() => insert(shape.id)}
            className="kd-asset-tile"
          >
           
            <span
              aria-hidden="true"
              style={{
                display: "block",
                width: 58 * Math.min(1, shape.size.width / shape.size.height),
                height: 58 * Math.min(1, shape.size.height / shape.size.width),
                clipPath: shape.clip,
                WebkitClipPath: shape.clip,
                backgroundImage: FRAME_PREVIEW_IMAGE,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "none",
              }}
            />
          </button>
        ))}

        {visible.length === 0 && (
          <LibraryEmpty message="No frames match your search" />
        )}
      </div>
    </div>
  );
}
