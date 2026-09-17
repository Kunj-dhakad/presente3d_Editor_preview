"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import useEditorStore, { ElementData, FrameData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useShallow } from "zustand/shallow";
import { applyCopiedStyleIfActive } from "@editor/lib/styleClipboard";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import { DRAG_MIME } from "@editor/layout/EditorCanvas/utils/dragPayloads";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";
import { useBookOptional } from "@editor/layout/header/EditorPreview/context/BookStateContext";
import { openElementLink } from "@editor/lib/reader/elementLink";
import { useImageFallback } from "@editor/lib/ui/imageFallback";
import {
  FRAME_PREVIEW_IMAGE,
  clampOffset,
  clampScale,
  frameImageStyle,
  frameShape,
} from "../frames";
import { useNaturalSize } from "../useNaturalSize";
import FrameImageEditor from "../editor/FrameImageEditor";


const RenderFrame: React.FC<{
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}> = memo(
  ({ id, data, slideIndex, clipBounds }) => {
    const { updateElement, setActiveElementId, setActiveSlide, toggleSelectedElementId } =
      useEditorStore(
        useShallow((s) => ({
          updateElement: s.updateElement,
          setActiveElementId: s.setActiveElementId,
          setActiveSlide: s.setActiveSlide,
          toggleSelectedElementId: s.toggleSelectedElementId,
        })),
      );
    const isSelected = useEditorStore(
      useCallback((s) => s.selectedElementIds.includes(id), [id]),
    );
    const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
    const frameEditElementId = useEditorUIStore((s) => s.frameEditElementId);
    const setFrameEditElementId = useEditorUIStore((s) => s.setFrameEditElementId);
    const book = useBookOptional();
    const lastLinkRef = useRef(0);
    const { contextMenuPos, handleContextMenu, closeContextMenu } =
      useElementContextMenu(id, slideIndex);
    const [dropActive, setDropActive] = useState(false);

    const frame = data.type === "frame" ? (data as FrameData) : null;
    const fallback = useImageFallback(frame?.imageSrc ?? "");
    const natural = useNaturalSize(frame?.imageSrc);

    if (!frame) return null;

    const shape = frameShape(frame.frameShape);
    const editing = frameEditElementId === id && !imageExportMode;
    const hasImage = !!frame.imageSrc;
    const hasLink = !!frame.link?.trim();
    // Measured against the pill's own width, not a guess about frame sizes.
    const roomForWords = frame.width >= 170 && frame.height >= 60;

    const acceptDrop = (event: React.DragEvent) => {
      const src = event.dataTransfer.getData(DRAG_MIME.imageSrc);
      if (!src) return false;
      
      event.preventDefault();
      event.stopPropagation();
      updateElement(
        id,
        {
          imageSrc: src,
          imageScale: 1,
          imageOffsetX: 0,
          imageOffsetY: 0,
        } as Partial<FrameData>,
        { history: true },
      );
      return true;
    };

    const card = shape.card;

    return (
      <>
        <CanvasDragDrop
          id={id}
          rect={{
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
            rotation: frame.rotation ?? 0,
          }}
          isSelected={isSelected}
          imageExportMode={imageExportMode}
          clipBounds={clipBounds}
          onContextMenu={handleContextMenu}
         
          dragDisabled={editing}
          onSelect={(e) => {
            if (useEditorUIStore.getState().isCopyStyleMode) {
              applyCopiedStyleIfActive(id);
              return;
            }
            setActiveSlide(slideIndex);
            if (e.ctrlKey || e.metaKey || e.shiftKey) toggleSelectedElementId(id);
            else setActiveElementId(id);
          }}
          onElementClick={() => {
            if (!imageExportMode || !hasLink) return;
            const now = Date.now();
            if (now - lastLinkRef.current < 400) return;
            lastLinkRef.current = now;
            openElementLink(frame.link, book);
          }}
          onDoubleClick={() => {
            if (!hasImage) return;
            setActiveSlide(slideIndex);
            setActiveElementId(id);
            setFrameEditElementId(id);
          }}
          onChange={(rect) =>
            updateElement(
              id,
              { x: rect.x, y: rect.y, width: rect.width, height: rect.height, rotation: rect.rotation },
              { history: true },
            )
          }
        >
          <div
            onDragOver={(event) => {
              if (imageExportMode) return;
              if (!event.dataTransfer.types.includes(DRAG_MIME.imageSrc)) return;
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(event) => {
              setDropActive(false);
              acceptDrop(event);
            }}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              opacity: frame.opacity ?? 1,
              cursor: imageExportMode && hasLink ? "pointer" : undefined,
              background: card?.background ?? "transparent",
              boxShadow: card
                ? "0 1px 3px rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.10)"
                : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: shape.clip,
                WebkitClipPath: shape.clip,
              
                backgroundColor: hasImage
                  ? "transparent"
                  : (frame.backgroundColor ?? "var(--kd-bg-hover)"),
               
                backgroundImage:
                  !hasImage && !imageExportMode ? FRAME_PREVIEW_IMAGE : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                overflow: "hidden",
              }}
            >
              {hasImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fallback.src}
                  onError={fallback.onError}
                  alt={shape.label}
                  draggable={false}
                  style={{
                    ...frameImageStyle(frame, frame, natural),
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>

         
            {!hasImage && !imageExportMode && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  clipPath: shape.clip,
                  WebkitClipPath: shape.clip,
                  pointerEvents: "none",
                  border: dropActive
                    ? "2px dashed var(--kd-accent)"
                    : undefined,
                }}
              >
                
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: roomForWords ? "5px 10px" : 6,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.88)",
                    color: "var(--kd-text)",
                    fontFamily: "var(--kd-font)",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  }}
                >
                  <ImagePlus size={13} />
                  {roomForWords && "Drag an image here"}
                </span>
              </div>
            )}

          
            {dropActive && hasImage && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: shape.clip,
                  WebkitClipPath: shape.clip,
                  background: "rgba(112,105,232,0.35)",
                  pointerEvents: "none",
                }}
              />
            )}

            {editing && (
              <FrameImageEditor
                id={id}
                frame={frame}
                natural={natural}
                onChange={(patch, history) =>
                  updateElement(
                    id,
                    {
                      imageScale: clampScale(patch.imageScale ?? frame.imageScale),
                      imageOffsetX: clampOffset(patch.imageOffsetX ?? frame.imageOffsetX),
                      imageOffsetY: clampOffset(patch.imageOffsetY ?? frame.imageOffsetY),
                    } as Partial<FrameData>,
                    history ? { history: true } : undefined,
                  )
                }
              />
            )}
          </div>
        </CanvasDragDrop>
        {isSelected && contextMenuPos && (
          <ElementContextMenu
            position={contextMenuPos}
            elementId={id}
            onClose={closeContextMenu}
          />
        )}
      </>
    );
  },
  (prev, next) => {
    const a = prev.data as FrameData;
    const b = next.data as FrameData;
    return (
      prev.id === next.id &&
      prev.slideIndex === next.slideIndex &&
      prev.clipBounds === next.clipBounds &&
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height &&
      a.rotation === b.rotation &&
      a.opacity === b.opacity &&
      a.frameShape === b.frameShape &&
      a.imageSrc === b.imageSrc &&
      a.imageScale === b.imageScale &&
      a.imageOffsetX === b.imageOffsetX &&
      a.imageOffsetY === b.imageOffsetY &&
      a.backgroundColor === b.backgroundColor &&
      a.link === b.link
    );
  },
);

RenderFrame.displayName = "RenderFrame";
export default RenderFrame;
