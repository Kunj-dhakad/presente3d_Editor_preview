"use client";

import React from "react";
import useSnapGuideStore from "@editor/store/useSnapGuideStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

/**
 * The lines and spacing pills a drag leaves behind it.
 *
 * Drawn inside the slide, in slide coordinates, so it needs no arithmetic to
 * follow the page — the same trick the marquee and the group selection box use.
 * Zoom is the exception: the page is scaled, so anything that should stay one
 * pixel thick or one size regardless has to divide by it.
 */
const AlignmentGuides: React.FC<{ slideIndex: number }> = ({ slideIndex }) => {
  const activeSlideIndex = useSnapGuideStore((s) => s.slideIndex);
  const guides = useSnapGuideStore((s) => s.guides);
  const spacing = useSnapGuideStore((s) => s.spacing);
  const zoom = useEditorUIStore((s) => s.MainCanvasScale) || 1;

  if (activeSlideIndex !== slideIndex) return null;
  if (guides.length === 0 && spacing.length === 0) return null;

  const hairline = 1 / zoom;

  return (
    <div className="kd-snap-layer">
      {guides.map((guide, index) =>
        guide.axis === "x" ? (
          <div
            key={`x-${index}-${guide.at}`}
            className="kd-snap-guide"
            style={{
              left: guide.at,
              top: guide.from,
              width: hairline,
              height: guide.to - guide.from,
            }}
          />
        ) : (
          <div
            key={`y-${index}-${guide.at}`}
            className="kd-snap-guide"
            style={{
              left: guide.from,
              top: guide.at,
              width: guide.to - guide.from,
              height: hairline,
            }}
          />
        ),
      )}

      {spacing.map((hint, index) => {
        const horizontal = hint.axis === "x";
        const middle = (hint.from + hint.to) / 2;
        return (
          <React.Fragment key={`s-${index}-${hint.from}`}>
            <div
              className="kd-snap-spacing"
              style={
                horizontal
                  ? {
                      left: hint.from,
                      top: hint.at,
                      width: hint.to - hint.from,
                      height: hairline,
                    }
                  : {
                      left: hint.at,
                      top: hint.from,
                      width: hairline,
                      height: hint.to - hint.from,
                    }
              }
            />
            <div
              className="kd-snap-spacing-pill"
              style={{
                left: horizontal ? middle : hint.at,
                top: horizontal ? hint.at : middle,
                // The pill reads at its own size whatever the page is scaled to.
                transform: `translate(-50%, -50%) scale(${1 / zoom})`,
              }}
            >
              {Math.round(hint.gap)}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default AlignmentGuides;
