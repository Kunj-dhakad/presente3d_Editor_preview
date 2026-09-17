"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import AssetThumb from "@editor/components/AssetThumb";
export type StickerAsset = { id: string; title: string; src: string; tags: string[] };

const fallback: StickerAsset[] = [
  { id: "sticker-star", title: "Star", src: "/api/stickers/star", tags: ["star", "favorite"] },
  { id: "sticker-heart", title: "Heart", src: "/api/stickers/heart", tags: ["heart", "love"] },
  { id: "sticker-smile", title: "Smile", src: "/api/stickers/smile", tags: ["smile", "happy"] },
  { id: "sticker-bolt", title: "Bolt", src: "/api/stickers/bolt", tags: ["bolt", "energy"] },
  { id: "sticker-flower", title: "Flower", src: "/api/stickers/flower", tags: ["flower", "nature"] },
];

export async function getStickers(query = ""): Promise<StickerAsset[]> {
  try {
    const response = await fetch(`/api/stickers?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      const assets = await response.json();
      if (Array.isArray(assets) && assets.length) return assets;
    }
  } catch {  }
  const needle = query.trim().toLowerCase();
  return needle ? fallback.filter((asset) => `${asset.title} ${asset.tags.join(" ")}`.toLowerCase().includes(needle)) : fallback;
}




export default function Stickers() {
  const [query, setQuery] = useState("");
  const [stickers, setStickers] = useState<StickerAsset[]>([]);
  const addElement = useEditorStore((s) => s.addElement);
  // Selectors, not the whole store: this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const back = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];
  useEffect(() => {
    let live = true;
    getStickers(query).then((items) => live && setStickers(items));
    return () => {
      live = false;
    };
  }, [query]);
  const insert = (sticker: StickerAsset) => {
    const size = 160;
    addElement({
      type: "image",
      assetKind: "sticker",
      src: sticker.src,
      alt: sticker.title,
      x: Math.max(16, ((canvas?.width ?? size) - size) / 2),
      y: Math.max(16, ((canvas?.height ?? size) - size) / 2),
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      fit: "contain",
      objectFit: "contain",
    });
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
          <h2 className="kd-panel-header-title">Stickers</h2>
          <p className="kd-panel-subtext">Elements / Sticker Library</p>
        </div>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-toolbar">
        <label className="kd-search-box">
          <Search size={15} className="kd-icon-text" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stickers..."
          />
        </label>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-body kd-asset-grid kd-custom-scrollbar">
        {stickers.map((sticker) => (
          <button
            key={sticker.id}
            type="button"
            title={sticker.title}
            onClick={() => insert(sticker)}
            // The same tile the Shapes and All Elements grids use: the art is
            // the label, and the name lives in the tooltip.
            className="kd-asset-tile kd-asset-tile-media"
          >
            {/* Sized, not `fill`: a fill image is positioned absolutely and
                escapes its tile the moment the wrapper is not a positioned
                box — which is how one sticker ended up covering the panel. */}
            <AssetThumb
              src={sticker.src}
              alt={sticker.title}
              width={160}
              height={160}
              unoptimized
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
