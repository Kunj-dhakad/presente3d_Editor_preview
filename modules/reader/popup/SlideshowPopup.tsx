"use client";

import React from "react";
import { GalleryHorizontal } from "lucide-react";
import type { InteractionBlock } from "../types/interaction";
import SlideshowCarousel from "../components/SlideshowCarousel";
import PopupShell from "./PopupShell";

interface Props {
  block: InteractionBlock;
  onClose: () => void;
}

export default function SlideshowPopup({ block, onClose }: Props) {
  const images = block.slideshowImages;

  return (
    <PopupShell onClose={onClose} maxWidth={660} label="Slideshow">
      {images.length > 0 ? (
        <div
          className="w-full min-w-0 overflow-hidden rounded-[10px]"
          style={{ aspectRatio: "16 / 10", maxHeight: "min(70vh, 480px)" }}
        >
          <SlideshowCarousel
            images={images}
            interval={block.slideshowInterval}
            autoplay
            showArrows
            showDots
            borderRadius={10}
          />
        </div>
      ) : (
        <div className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 px-6 py-8 text-center text-sm text-slate-500">
          <GalleryHorizontal size={24} className="text-slate-400" />
          <span className="text-xs leading-5">
            This slideshow has no images.
          </span>
        </div>
      )}
    </PopupShell>
  );
}
