"use client";
import React, { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useElementLibrary } from "@editor/layout/AssetsPanel/AddSection/Elements/useElementLibrary";
import {
  AssetTileSkeletons,
  LibraryEmpty,
  LibraryError,
} from "@editor/layout/AssetsPanel/AddSection/Elements/LibraryStates";
import AssetThumb from "@editor/components/AssetThumb";

export default function Shapes() {
  const [query, setQuery] = useState("");

  // Everything here is already one category, so this panel has no filter row —
  // the old "All / Shapes" pills filtered the list down to itself.
  const { items, status, retry } = useElementLibrary("Shapes");

  const addElement = useEditorStore((s) => s.addElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const setCategory = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, query]);

  const insert = (shape: string) => {
    const size = 150;
    addElement({
      type: "shape",
      shape,
      x: Math.max(16, ((canvas?.width ?? size) - size) / 2),
      y: Math.max(16, ((canvas?.height ?? size) - size) / 2),
      width: size,
      height: size,
      opacity: 1,
      rotation: 0,
      zIndex: 1,
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
          <h2 className="kd-panel-header-title">Shapes</h2>
          <p className="kd-panel-subtext">Elements / Shapes Library</p>
        </div>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-toolbar">
        <label className="kd-search-box">
          <Search size={15} className="kd-icon-text" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shapes..."
          />
        </label>
      </div>
      <div className="kd-panel-divider" />

      <div className="kd-panel-body kd-asset-grid kd-asset-grid-3 kd-custom-scrollbar">
        {status === "loading" && <AssetTileSkeletons />}

        {status === "error" && <LibraryError onRetry={retry} />}

        {status === "ready" &&
          visible.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.name}
              onClick={() => insert(item.svg_code)}
              className="kd-asset-tile"
            >
              <AssetThumb
                src={item.svg_url}
                alt={item.name}
                width={56}
                height={56}
                unoptimized
                loading="lazy"
              />
            </button>
          ))}

        {status === "ready" && visible.length === 0 && (
          <LibraryEmpty
            message={query.trim() ? "No shapes match your search" : "No shapes yet"}
          />
        )}
      </div>
    </div>
  );
}
