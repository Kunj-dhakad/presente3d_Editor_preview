"use client";

import React from "react";
import { GalleryHorizontal } from "lucide-react";
import { InteractionData } from "@editor/store/editorStore";
import InteractionPopupShell from "./InteractionPopupShell";
import SlideshowCarousel from "../renderer/SlideshowCarousel";

interface SlideshowPopupProps {
  data: InteractionData;
  onClose: () => void;
}

const SlideshowPopup: React.FC<SlideshowPopupProps> = ({ data, onClose }) => {
  const images = data.slideshowImages ?? [];

  return (
    <InteractionPopupShell onClose={onClose} maxWidth={640}>
      {images.length > 0 ? (
        <div
          className="w-full min-w-0 overflow-hidden rounded-[10px]"
          style={{
            // Responsive height: wide screens 16:10, narrow a bit taller
            aspectRatio: "16 / 10",
            maxHeight: "min(70vh, 480px)",
            width: "100%",
          }}
        >
          <SlideshowCarousel
            images={images}
            interval={data.slideshowInterval ?? 3000}
            autoplay
            showArrows
            showDots
            borderRadius={10}
          />
        </div>
      ) : (
        <div className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-2 rounded-lg kd-bg-sunken px-4 py-8 text-center text-sm kd-fg-muted sm:min-h-40 sm:px-6">
          <GalleryHorizontal size={24} className="kd-fg-subtle" />
          <span className="max-w-[20rem] text-xs leading-5 sm:text-sm">
            Add images from the sidebar to show a slideshow here.
          </span>
        </div>
      )}
    </InteractionPopupShell>
  );
};

export default SlideshowPopup;
