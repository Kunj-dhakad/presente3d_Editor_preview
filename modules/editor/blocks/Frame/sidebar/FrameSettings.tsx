"use client";

import React from "react";
import { Crop, ImageOff, RotateCcw } from "lucide-react";
import useEditorStore, { FrameData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import {
  Block,
  Field,
  Hint,
  Section,
  Swatch,
  actionButton,
  fullInput,
  primaryButton,
} from "@editor/layout/EditBarPanel/SettingsControls";
import {
  FRAME_PREVIEW_IMAGE,
  FRAME_SHAPES,
  clampScale,
  frameShape,
} from "../frames";

/**
 * The frame's own panel: which shape it cuts, and what the picture inside is
 * doing. Everything that belongs to the frame *as an element* — position,
 * size, rotation, layering — is left to the panels that already do that job.
 */
export default function FrameSettings() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setFrameEditElementId = useEditorUIStore((s) => s.setFrameEditElementId);

  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId,
  );
  const data =
    element && element.data.type === "frame" ? (element.data as FrameData) : null;

  if (!element || !data) return null;

  const patch = (value: Partial<FrameData>) =>
    updateElement(element.id, value, { history: true });

  const hasImage = !!data.imageSrc;
  const scale = clampScale(data.imageScale);
  const active = frameShape(data.frameShape);

  return (
    <div className="pb-6">
      <Section title="Shape">
        <Block className="grid grid-cols-4 gap-1.5">
          {FRAME_SHAPES.map((shape) => (
            <button
              key={shape.id}
              type="button"
              title={shape.label}
              // Only the mask changes; the picture and the frame's own box are
              // left alone, so trying shapes on is non-destructive.
              onClick={() => patch({ frameShape: shape.id })}
              className={`kd-set-tile ${active.id === shape.id ? "kd-set-tile-active" : ""}`}
            >
              {/* Same stand-in picture as the library, so a shape looks the
                  same wherever it is chosen from. */}
              <span
                aria-hidden="true"
                style={{
                  display: "block",
                  width: 30 * Math.min(1, shape.size.width / shape.size.height),
                  height: 30 * Math.min(1, shape.size.height / shape.size.width),
                  clipPath: shape.clip,
                  WebkitClipPath: shape.clip,
                  backgroundImage: FRAME_PREVIEW_IMAGE,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            </button>
          ))}
        </Block>
      </Section>

      <Section title="Image">
        {hasImage ? (
          <>
            <Field label="Zoom">
              <input
                type="range"
                min={1}
                max={5}
                step={0.01}
                value={scale}
                // Live while dragging, one history entry when let go.
                onChange={(event) =>
                  updateElement(element.id, {
                    imageScale: clampScale(Number(event.target.value)),
                  } as Partial<FrameData>)
                }
                onPointerUp={() => patch({ imageScale: scale })}
                style={{ width: 120 }}
              />
            </Field>
            <Block className="space-y-1.5">
              <button
                type="button"
                className={`${primaryButton} w-full`}
                onClick={() => setFrameEditElementId(element.id)}
              >
                <Crop size={13} /> Adjust image
              </button>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className={`${actionButton} flex-1`}
                  onClick={() =>
                    patch({ imageScale: 1, imageOffsetX: 0, imageOffsetY: 0 })
                  }
                >
                  <RotateCcw size={12} /> Reset
                </button>
                <button
                  type="button"
                  className={`${actionButton} flex-1`}
                  // The frame survives: shape, box and rotation are untouched,
                  // so it is immediately ready for another picture.
                  onClick={() => {
                    setFrameEditElementId(null);
                    patch({
                      imageSrc: "",
                      imageScale: 1,
                      imageOffsetX: 0,
                      imageOffsetY: 0,
                    });
                  }}
                >
                  <ImageOff size={12} /> Remove
                </button>
              </div>
            </Block>
            <Hint>
              Drag inside the frame to move the picture and scroll to zoom.
              The frame stays put; click anywhere else when you are happy.
            </Hint>
          </>
        ) : (
          <Hint>
            Drag an image from Images or from the page onto this frame and it
            will be masked to the shape.
          </Hint>
        )}

        <Field label={hasImage ? "Replace with URL" : "Image URL"} stacked>
          <input
            className={fullInput}
            value={data.imageSrc ?? ""}
            placeholder="https://example.com/photo.jpg"
            // Replacing changes only the source — shape, box, rotation and the
            // frame's styling are deliberately not touched.
            onChange={(event) => patch({ imageSrc: event.target.value })}
          />
        </Field>
      </Section>

      <Section title="Empty state">
        <Field label="Fill colour">
          <Swatch
            color={data.backgroundColor ?? "#e9e9ef"}
            onChange={(next) => patch({ backgroundColor: next })}
          />
        </Field>
        <Hint>Shown only while the frame is waiting for an image.</Hint>
      </Section>
    </div>
  );
}
