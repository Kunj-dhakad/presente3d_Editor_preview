"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import AssetThumb from "@editor/components/AssetThumb";
import { apiFetch } from "@shared/apiFetch";

export type GifAsset = {
  id: string;
  title: string;
  src: string;
  tags: string[];
};

const fallback: GifAsset[] = [
  {
    id: "gif-celebrate",
    title: "Celebrate",
    src: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif",
    tags: ["party", "celebrate"],
  },
  {
    id: "gif-hello",
    title: "Hello",
    src: "https://media.giphy.com/media/xTiIzJSKB4l7xTouE8/giphy.gif",
    tags: ["hello", "wave"],
  },
  {
    id: "gif-love",
    title: "Love",
    src: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
    tags: ["love", "heart"],
  },
  {
    id: "gif-success",
    title: "Success",
    src: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    tags: ["success", "thumbs up"],
  },
  {
    id: "gif-idea",
    title: "Idea",
    src: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
    tags: ["idea", "light bulb"],
  },
];

export async function getGifs(query = ""): Promise<GifAsset[]> {
  try {
    const response = await apiFetch(`/api/gifs?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      const assets = await response.json();
      if (Array.isArray(assets) && assets.length) return assets;
    }
  } catch {}
  const needle = query.trim().toLowerCase();
  return needle
    ? fallback.filter((asset) =>
        `${asset.title} ${asset.tags.join(" ")}`.toLowerCase().includes(needle),
      )
    : fallback;
}

export default function GIFs() {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifAsset[]>([]);
  const addElement = useEditorStore((s) => s.addElement);
  // Selectors, not the whole store: this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const back = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];
  useEffect(() => {
    let live = true;
    getGifs(query).then((items) => live && setGifs(items));
    return () => {
      live = false;
    };
  }, [query]);
  const insert = (gif: GifAsset) => {
    const size = 160;
    addElement({
      type: "image",
      assetKind: "gif",
      src: gif.src,
      alt: gif.title,
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
          <h2 className="kd-panel-header-title">GIFs</h2>
          <p className="kd-panel-subtext">Elements / GIF Library</p>
        </div>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-toolbar">
        <label className="kd-search-box">
          <Search size={15} className="kd-icon-text" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
          />
        </label>
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-body kd-asset-grid kd-custom-scrollbar">
        {gifs.map((gif) => (
          <button
            key={gif.id}
            type="button"
            title={gif.title}
            onClick={() => insert(gif)}
            // The same tile the Shapes and All Elements grids use: the art is
            // the label, and the name lives in the tooltip.
            className="kd-asset-tile kd-asset-tile-media"
          >
            {/* Sized, not `fill`: a fill image is positioned absolutely and
                escapes its tile the moment the wrapper is not a positioned
                box — which is how one sticker ended up covering the panel. */}
            <AssetThumb
              src={gif.src}
              alt={gif.title}
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
