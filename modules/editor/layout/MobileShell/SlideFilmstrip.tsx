"use client";

import React from "react";
import { Plus } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import MiniSlidePreview from "@editor/layout/Preview/MiniSlidePreview";
import { FILMSTRIP_H } from "@editor/lib/ui/shellMetrics";

/** Thumbnails are laid on their side, so they get their own smaller scale. */
const STRIP_SCALE = 0.11;

/**
 * The slide rail, turned on its side for a narrow screen.
 *
 * It draws pages with the same `MiniSlidePreview` the vertical rail uses, so a
 * block that renders in one renders in the other — the thumbnail renderer is
 * already a separate path from the canvas and a third copy would be one too
 * many.
 */
const SlideFilmstrip: React.FC<{ onJumpToSlide: (index: number) => void }> = ({
  onJumpToSlide,
}) => {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const addSlideToEnd = useEditorStore((s) => s.addSlideToEnd);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Keep the current page in view when it changes from the canvas.
  React.useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-strip-index="${activeSlide}"]`,
    );
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeSlide]);

  return (
    <div
      ref={listRef}
      className="shrink-0 flex items-center gap-2 px-2 overflow-x-auto overflow-y-hidden kd-mobile-filmstrip kd-custom-scrollbar"
      style={{ height: FILMSTRIP_H }}
    >
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          type="button"
          data-strip-index={index}
          onClick={() => onJumpToSlide(index)}
          aria-label={`Slide ${index + 1}`}
          aria-current={index === activeSlide}
          className={`relative shrink-0 rounded overflow-hidden kd-slide-preview ${
            index === activeSlide ? "kd-slide-preview-active" : ""
          }`}
        >
          <MiniSlidePreview slide={slide} scale={STRIP_SCALE} eagerImages />
          <span className="kd-mobile-filmstrip-num">{index + 1}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={addSlideToEnd}
        aria-label="Add page"
        className="shrink-0 flex items-center justify-center rounded kd-mobile-filmstrip-add"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

export default SlideFilmstrip;
