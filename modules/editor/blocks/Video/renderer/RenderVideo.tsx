import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, { ElementData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { styleClipboard } from "@editor/lib/styleClipboard";
import Image from "next/image";
// import FloatingToolBar from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/FloatingToolBar";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import { IoIosPause, IoIosPlay } from "react-icons/io";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";

const getYoutubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp =
    /(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const isYoutubeShorts = (url: string) => /youtube\.com\/shorts\//i.test(url);

const YouTubeEmbed: React.FC<{
  src: string;
  youtubeId: string;
  isSelected: boolean;
  isTransforming: boolean;
  isResizing: boolean;
  onDeselect: () => void;
}> = ({ src, youtubeId, isSelected, isTransforming, isResizing }) => {
  const isShorts = isYoutubeShorts(src);
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;

  const showBlockingOverlay = !isSelected || isTransforming || isResizing;

  if (isShorts) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
          padding: 16,
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Image
          height={200}
          width={200}
          unoptimized
          src={thumbnailUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.18,
            filter: "blur(10px)",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span style={{ fontSize: 26, position: "relative", zIndex: 1 }}>
          ðŸ”’
        </span>
        <span
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            position: "relative",
            zIndex: 1,
          }}
        >
          YouTube Shorts cannot be embedded
        </span>
        <span
          style={{
            color: "#999",
            fontSize: 11,
            position: "relative",
            zIndex: 1,
            lineHeight: 1.6,
          }}
        >
          Use a regular youtube.com/watch?v= link instead.
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            zIndex: 1,
            background: "#ff0000",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 4,
            fontSize: 12,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Watch on YouTube
        </a>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <iframe
        src={embedUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background: "transparent",
          pointerEvents: showBlockingOverlay ? "all" : "none",
          cursor: !isSelected ? "move" : "default",
        }}
      />
    </div>
  );
};

const RenderVideo: React.FC<{
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}> = memo(
  ({ id, data, slideIndex, clipBounds }) => {
    const {
      updateElement,
      activeElementId: selectedId,
      selectedElementIds,
      setActiveElementId,
      setActiveSlide,
      toggleSelectedElementId,
    } = useEditorStore(
      useShallow((s) => ({
        updateElement: s.updateElement,
        activeElementId: s.activeElementId,
        selectedElementIds: s.selectedElementIds,
        setActiveElementId: s.setActiveElementId,
        setActiveSlide: s.setActiveSlide,
        toggleSelectedElementId: s.toggleSelectedElementId,
      })),
    );
    const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
    const editingRef = useRef<HTMLVideoElement | null>(null);
    // const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const { contextMenuPos, handleContextMenu, closeContextMenu } =
      useElementContextMenu(id, slideIndex);

    useEffect(() => {
      if (selectedId !== id) return;
      const handleOutsideClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-element='true']")) {
          setActiveElementId(null);
        }
      };

      document.addEventListener("mousedown", handleOutsideClick);
      return () =>
        document.removeEventListener("mousedown", handleOutsideClick);
    }, [selectedId, id, setActiveElementId]);

    // const handleContextMenu = useCallback((e: React.MouseEvent) => {
    //     e.preventDefault();
    //     setActiveSlide(slideIndex);
    //     setActiveElementId(id);
    // }, [slideIndex, id, setActiveSlide, setActiveElementId]);

    const handleSelect = useCallback(
      (e: React.PointerEvent) => {
        // Handle Copy Style Mode
        const isCopyStyleMode = useEditorUIStore.getState().isCopyStyleMode;
        if (isCopyStyleMode) {
          const copiedStyle = styleClipboard.getClipboardContent();
          if (copiedStyle) {
            const { applyCopiedStyle } = useEditorStore.getState();
            applyCopiedStyle([id], copiedStyle);

            // Exit Copy Style Mode
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
      },
      [
        slideIndex,
        id,
        setActiveSlide,
        setActiveElementId,
        toggleSelectedElementId,
      ],
    );

    const togglePlay = () => {
      if (!editingRef.current) return;

      if (isPlaying) {
        editingRef.current.pause();
      } else {
        editingRef.current.play();
      }

      setIsPlaying(!isPlaying);
    };

    return (
      <>
        <CanvasDragDrop
          id={id}
          rect={{
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            rotation: data.rotation ?? 0,
          }}
          isSelected={selectedElementIds.includes(id)}
          imageExportMode={imageExportMode}
          clipBounds={clipBounds}
          onSelect={handleSelect}
          //   onContainerChange={setTargetEl}
          onContextMenu={handleContextMenu}
          onChange={(r) =>
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
            )
          }
        >
          {data.type === "video" && (
            <>
              {getYoutubeId(data.src) ? (
                <YouTubeEmbed
                  src={data.src}
                  youtubeId={getYoutubeId(data.src)!}
                  isSelected={selectedElementIds.includes(id)}
                  isTransforming={false}
                  isResizing={false}
                  onDeselect={() => setActiveElementId(null)}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  }}
                >
                  <video
                    ref={selectedId === id ? editingRef : null}
                    src={data.src}
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      userSelect: "none",
                      transform: `
                                        scaleX(${data.flipX ? -1 : 1})
                                        scaleY(${data.flipY ? -1 : 1})
                                    `,
                      border: data.strokeWidth
                        ? `${data.strokeWidth}px ${data.strokeStyle ?? "none"} ${data.strokeColor ?? "#000"}`
                        : undefined,
                      opacity: data.opacity ?? 100 / 100,
                      borderRadius: data.borderRadius || 0,
                      filter: `
                                            contrast(${data.contrast ?? 100}%)
                                            brightness(${data.brightness ?? 100}%)
                                            saturate(${data.saturate ?? 100}%)
                                            blur(${data.blur ?? 0}px)
                                            grayscale(${data.grayscale ?? 0}%)
                                            sepia(${data.sepia ?? 0}%)
                                            hue-rotate(${data.hueRotate ?? 0}deg)
                                            `,
                    }}
                  />

                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={togglePlay}
                    className="flex items-center justify-center absolute h-[30px] w-[30px]"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      color: "white",
                      fontSize: "22px",
                      borderRadius: "50%",
                      cursor: "pointer",
                    }}
                  >
                    {isPlaying ? <IoIosPause /> : <IoIosPlay />}
                  </button>
                </div>
              )}
            </>
          )}
        </CanvasDragDrop>
        {/* {selectedId === id && selectedElementIds.length <= 1 && !imageExportMode && targetEl && (
                <FloatingToolBar target={targetEl} />
            )} */}

        {selectedElementIds.includes(id) && contextMenuPos && (
          <ElementContextMenu
            position={contextMenuPos}
            elementId={id}
            onClose={closeContextMenu}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.slideIndex === nextProps.slideIndex &&
      prevProps.clipBounds?.width === nextProps.clipBounds?.width &&
      prevProps.clipBounds?.height === nextProps.clipBounds?.height &&
      JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
    );
  },
);

RenderVideo.displayName = "RenderVideo";

export default RenderVideo;
