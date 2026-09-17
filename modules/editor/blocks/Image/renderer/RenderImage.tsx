import React, { useCallback, useRef, memo } from "react";
import dynamic from "next/dynamic";
import { useShallow } from "zustand/shallow";
import useEditorStore, {
  ElementData,
  ImageData,
} from "@editor/store/editorStore";
import Image from "next/image";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useBookOptional } from "@editor/layout/header/EditorPreview/context/BookStateContext";
import { openElementLink } from "@editor/lib/reader/elementLink";
import { styleClipboard } from "@editor/lib/styleClipboard";
import { useImageFallback } from "@editor/lib/ui/imageFallback";
import { dropImageIntoFrame } from "@editor/blocks/Frame/dropIntoFrame";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";

const ImageCropOverlay = dynamic(
  () => import("@editor/blocks/Image/editor/ImageCropOverlay"),
  { ssr: false, loading: () => null },
);
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";

const RenderImage: React.FC<{
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}> = memo(
  ({ id, data, slideIndex, clipBounds }) => {
    const {
      updateElement,
      setActiveElementId,
      setActiveSlide,
      toggleSelectedElementId,
    } = useEditorStore(
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
    const activeRightPanel = useEditorStore((s) => s.activeRightPanel);
    const book = useBookOptional();
    const lastLinkRef = useRef(0);
    const cropElementId = useEditorUIStore((s) => s.cropElementId);
    const bgRemovingElementId = useEditorUIStore((s) => s.bgRemovingElementId);
    const isBgRemoving = bgRemovingElementId === id;
    const { contextMenuPos, handleContextMenu, closeContextMenu } =
      useElementContextMenu(id, slideIndex);
    const fallback = useImageFallback(
      data.type === "image" ? (data as ImageData).src : "",
    );

    if (data.type !== "image") return null;
    const imgData = data as ImageData;
    const hasLink = !!imgData.link?.trim();

    // The reader and the PNG export both draw these same elements. Without the
    // export check a half-finished crop put the cropper's own chrome into the
    // exported page — and in the reader, where the overlay looks the element up
    // on the *editor's* active slide, it found nothing and left a blank gap.
    // Tied to the panel as well as the flag: the cropper has no controls of its
    // own any more, so it must never outlive the panel that drives it.
    const isCropping =
      cropElementId === id &&
      !imageExportMode &&
      activeRightPanel === "ImageCrop";
    if (isCropping) {
      return (
        <div
          style={{
            position: "absolute",
            left: imgData.x,
            top: imgData.y,
            width: imgData.width,
            height: imgData.height,
            transform: `rotate(${imgData.rotation ?? 0}deg)`,
            transformOrigin: "center center",
            zIndex: 1000,
          }}
        >
          <ImageCropOverlay />
        </div>
      );
    }
    return (
      <>
        <CanvasDragDrop
          id={id}
          rect={{
            x: imgData.x,
            y: imgData.y,
            width: imgData.width,
            height: imgData.height,
            rotation: imgData.rotation ?? 0,
          }}
          isSelected={isSelected}
          imageExportMode={imageExportMode}
          clipBounds={clipBounds}
          onContextMenu={handleContextMenu}
          onSelect={(e) => {
            const isCopyStyleMode = useEditorUIStore.getState().isCopyStyleMode;
            if (isCopyStyleMode) {
              const copiedStyle = styleClipboard.getClipboardContent();
              if (copiedStyle) {
                const { applyCopiedStyle } = useEditorStore.getState();
                applyCopiedStyle([id], copiedStyle);
                const { setIsCopyStyleMode, setCopiedStyleSourceType } =
                  useEditorUIStore.getState();
                setIsCopyStyleMode(false);
                setCopiedStyleSourceType(null);
              }
              return;
            }

            setActiveSlide(slideIndex);
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              toggleSelectedElementId(id);
            } else {
              setActiveElementId(id);
            }
          }}
          onChange={(r) => {
            // Letting a picture go over a frame is how one gets *into* a
            // frame. Only a plain move counts: resizing or rotating over the
            // top of one is not an attempt to fill it.
            const moved =
              r.width === imgData.width &&
              r.height === imgData.height &&
              r.rotation === (imgData.rotation ?? 0);
            if (
              moved &&
              !imageExportMode &&
              dropImageIntoFrame({ elementId: id, src: imgData.src, rect: r })
            )
              return;
            updateElement(
              id,
              {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                rotation: r.rotation,
              },
              { history: true },
            );
          }}
        >
          <div
            // Following the image's link belongs to the reader; in the editor a
            // click still selects it. The capture phase is what gets in ahead
            // of the flipbook's own page-turn listener.
            onMouseDownCapture={(event) => {
              if (imageExportMode && hasLink) event.stopPropagation();
            }}
            onClickCapture={(event) => {
              if (imageExportMode && hasLink) event.stopPropagation();
            }}
            onClick={() => {
              if (!imageExportMode) return;
              // The drag layer and the element can both report one click.
              const now = Date.now();
              if (now - lastLinkRef.current < 400) return;
              lastLinkRef.current = now;
              openElementLink(imgData.link, book);
            }}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              borderRadius: imgData.borderRadius || 0,
              overflow: "hidden",
              cursor: imageExportMode && hasLink ? "pointer" : undefined,
            }}
          >
            {isBgRemoving ? ( 
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  // Gradient background-image hai — shorthand `background`
                  // likhne se neeche wala backgroundSize reset ho jaata hai.
                  backgroundImage:
                    "linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

                {/* Magic wand icon */}
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 4V2M15 16V14M8 9H6M22 9H20M17.8 6.2L16.4 7.6M17.8 11.8L16.4 10.4M12.2 6.2L13.6 7.6M12.2 11.8L13.6 10.4M3 21L15 9"
                    stroke="#9ca3af"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                <span
                  style={{ color: "#6b7280", fontSize: 13, fontWeight: 600 }}
                >
                  Removing Background...
                </span>
              </div>
            ) : (
              <Image
                src={fallback.src}
                fill
                alt={imgData.alt || "slide image"}
                draggable={false}
                unoptimized
                loading="eager"
                onError={fallback.onError}
                style={{
                  objectFit: "cover",
                  objectPosition: "center",
                  userSelect: "none",
                  pointerEvents: "none",
                  aspectRatio: "9/9",
                  transform: `
                scaleX(${imgData.flipX ? -1 : 1})
                scaleY(${imgData.flipY ? -1 : 1})
              `,
                  border: imgData.strokeWidth
                    ? `${imgData.strokeWidth}px ${imgData.strokeStyle ?? "none"} ${imgData.strokeColor ?? "#000"}`
                    : undefined,
                  opacity: imgData.opacity ?? 100 / 100,
                  borderRadius: imgData.borderRadius || 0,
                  filter: `
              contrast(${imgData.contrast ?? 100}%)
              brightness(${imgData.brightness ?? 100}%)
              saturate(${imgData.saturate ?? 100}%)
              blur(${imgData.blur ?? 0}px)
              grayscale(${imgData.grayscale ?? 0}%)
              sepia(${imgData.sepia ?? 0}%)
              hue-rotate(${imgData.hueRotate ?? 0}deg)
            `,
                }}
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
  (p, n) => {
    const a = p.data as ImageData,
      b = n.data as ImageData;
    return (
      p.id === n.id &&
      p.slideIndex === n.slideIndex &&
      p.clipBounds?.width === n.clipBounds?.width &&
      p.clipBounds?.height === n.clipBounds?.height &&
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height &&
      a.rotation === b.rotation &&
      a.src === b.src &&
      a.opacity === b.opacity &&
      a.flipX === b.flipX &&
      a.flipY === b.flipY &&
      a.contrast === b.contrast &&
      a.brightness === b.brightness &&
      a.saturate === b.saturate &&
      a.blur === b.blur &&
      a.grayscale === b.grayscale &&
      a.sepia === b.sepia &&
      a.hueRotate === b.hueRotate &&
      a.borderRadius === b.borderRadius &&
      a.strokeWidth === b.strokeWidth &&
      a.strokeStyle === b.strokeStyle &&
      a.strokeColor === b.strokeColor &&
      a.alt === b.alt
    );
  },
);

RenderImage.displayName = "RenderImage";
export default RenderImage;
