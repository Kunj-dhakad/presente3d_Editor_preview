"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, {
  ElementData,
  InteractionData,
  isInteractionData,
} from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import type { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";
import { useBookOptional } from "@editor/layout/header/EditorPreview/context/BookStateContext";
import QuizPopup from "@editor/blocks/Interaction/popups/QuizPopup";
import QuestionPopup from "@editor/blocks/Interaction/popups/QuestionPopup";
import ContactFormPopup from "@editor/blocks/Interaction/popups/ContactFormPopup";
import SpotlightPopup from "@editor/blocks/Interaction/popups/SpotlightPopup";
import VideoPopup from "@editor/blocks/Interaction/popups/VideoPopup";
import SlideshowPopup from "@editor/blocks/Interaction/popups/SlideshowPopup";
import EmbedMediaRenderer from "./EmbedMediaRenderer";
import SlideshowCarousel from "./SlideshowCarousel";
import InteractionFace from "./InteractionFace";
import { NAV_KINDS } from "../components/constants";

const ENGAGEMENT_HINT: Record<string, string> = {
  quiz: "Click to complete quiz",
  question: "Click to answer",
  "contact-form": "Click to fill form",
  spotlight: "Click to view spotlight",
  "video-button": "Click to watch video",
  "audio-button": "Click to play audio",
  "popup-slideshow": "Click to view slideshow",
};

const RenderInteraction: React.FC<{
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}> = memo(({ id, data, slideIndex, clipBounds }) => {
  const interaction = data as InteractionData;
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
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { contextMenuPos, handleContextMenu, closeContextMenu } =
    useElementContextMenu(id, slideIndex);
  const book = useBookOptional();
  const lastActivateRef = useRef(0);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  if (!isInteractionData(data)) return null;

  if (interaction.interactionKind === "embed-media") {
    return (
      <EmbedMediaRenderer
        id={id}
        interaction={interaction}
        slideIndex={slideIndex}
        clipBounds={clipBounds}
      />
    );
  }

  /* ===== Inline slideshow on canvas (editor + preview) ===== */
  if (interaction.interactionKind === "slideshow") {
    const selectSlideshow = (event: React.PointerEvent) => {
      setActiveSlide(slideIndex);
      if (event.ctrlKey || event.metaKey || event.shiftKey)
        return toggleSelectedElementId(id);
      if (!isSelected) setActiveElementId(id);
    };

    return (
      <>
        <CanvasDragDrop
          id={id}
          rect={{
            x: interaction.x,
            y: interaction.y,
            width: interaction.width,
            height: interaction.height,
            rotation: interaction.rotation ?? 0,
          }}
          isSelected={isSelected}
          imageExportMode={imageExportMode}
          clipBounds={clipBounds}
          onContextMenu={handleContextMenu}
          onSelect={selectSlideshow}
          onChange={(rect) =>
            updateElement(
              id,
              {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                rotation: rect.rotation,
              },
              { history: true },
            )
          }
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              borderRadius: interaction.borderRadius ?? 8,
              overflow: "hidden",
              opacity: interaction.opacity ?? 1,
              background: interaction.backgroundColor ?? "#f8fafc",
              boxSizing: "border-box",
            }}
          >
            <SlideshowCarousel
              images={interaction.slideshowImages ?? []}
              interval={interaction.slideshowInterval ?? 3000}
              autoplay={!!imageExportMode || isSelected}
              showArrows
              showDots
              borderRadius={interaction.borderRadius ?? 8}
            />
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
  }

  const isEngagement =
    interaction.interactionKind === "quiz" ||
    interaction.interactionKind === "question" ||
    interaction.interactionKind === "contact-form" ||
    interaction.interactionKind === "spotlight" ||
    interaction.interactionKind === "video-button" ||
    interaction.interactionKind === "audio-button" ||
    interaction.interactionKind === "popup-slideshow";

  const select = (event: React.PointerEvent) => {
    setActiveSlide(slideIndex);
    if (event.ctrlKey || event.metaKey || event.shiftKey)
      return toggleSelectedElementId(id);
    if (!isSelected) setActiveElementId(id);
  };

  /**
   * A press inside an interaction must not become a page flip. The flipbook
   * listens for `mousedown` on an element between this one and React's root,
   * so only a capture-phase stop gets there first — a bubble-phase handler
   * runs after the page turn has already started.
   *
   * Deliberately mousedown-only: `CanvasDragDrop` drives selection and
   * activation off the pointer events, and stopping those swallowed the click
   * that opens a popup.
   */
  const keepGesture = (event: React.SyntheticEvent) => {
    if (imageExportMode) event.stopPropagation();
  };

  const activate = () => {
    // Two paths can report the same click (the drag layer's pointer-up and the
    // element's own click handler); without this a link would open twice.
    const now = Date.now();
    if (now - lastActivateRef.current < 400) return;
    lastActivateRef.current = now;

    // While editing, a click selects the element — popups and links belong to
    // the reader. Double-click still opens the popup so the author can test it.
    if (!imageExportMode) return;

    if (interaction.interactionKind === "audio-button") {
      if (!interaction.audioUrl) return;
      if (!audioRef.current) {
        const audio = new Audio(interaction.audioUrl);
        audio.onplay = () => setAudioPlaying(true);
        audio.onpause = () => setAudioPlaying(false);
        audio.onended = () => setAudioPlaying(false);
        audioRef.current = audio;
      }
      if (audioRef.current.paused) void audioRef.current.play();
      else audioRef.current.pause();
      return;
    }
    if (isEngagement) {
      setPopupOpen(true);
      return;
    }

    if (NAV_KINDS.includes(interaction.interactionKind)) {
      if (!book) return;
      switch (interaction.interactionKind) {
        case "nav-prev-page":
          book.prevPage();
          break;
        case "nav-next-page":
          book.nextPage();
          break;
        case "nav-first-page":
          book.goToPage(1);
          break;
        case "nav-last-page":
          book.goToPage(book.totalPages);
          break;
        case "nav-goto-page":
          book.goToPage(interaction.navTargetPage || 1);
          break;
        default:
          break;
      }
      return;
    }

    if (interaction.interactionKind === "caption")
      return setCaptionExpanded((value) => !value);
    const url = interaction.url || interaction.link;
    if (url)
      window.open(
        url,
        interaction.target === "popup"
          ? "interaction-popup"
          : (interaction.target ?? "_blank"),
        interaction.target === "popup"
          ? "popup=yes,width=800,height=600"
          : undefined,
      );
  };

  const dragDropSelected = isSelected && !popupOpen;

  return (
    <>
      <CanvasDragDrop
        id={id}
        rect={{
          x: interaction.x,
          y: interaction.y,
          width: interaction.width,
          height: interaction.height,
          rotation: interaction.rotation ?? 0,
        }}
        isSelected={dragDropSelected}
        imageExportMode={imageExportMode}
        clipBounds={clipBounds}
        onContextMenu={handleContextMenu}
        onSelect={select}
        onElementClick={activate}
        onChange={(rect) =>
          updateElement(
            id,
            {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              rotation: rect.rotation,
            },
            { history: true },
          )
        }
      >
        <div
          title={interaction.tooltip}
          onMouseEnter={() =>
            !imageExportMode && isEngagement && setShowHint(true)
          }
          onMouseLeave={() => setShowHint(false)}
          // In the reader the flipbook turns the page on mousedown, which used
          // to swallow the press before the element could act on it. Keeping the
          // gesture to ourselves lets the click reach `activate` instead.
          onMouseDownCapture={keepGesture}
          onClickCapture={(event) => {
            if (imageExportMode) event.stopPropagation();
          }}
          onClick={() => {
            if (imageExportMode) activate();
          }}
          // Authors can still try a quiz/form out without leaving the editor.
          onDoubleClick={() => {
            if (!imageExportMode && isEngagement) setPopupOpen(true);
          }}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              interaction.textAlign === "left"
                ? "flex-start"
                : interaction.textAlign === "right"
                  ? "flex-end"
                  : "center",
            gap: 6,
            padding: "0 14px",
            boxSizing: "border-box",
            background: interaction.backgroundColor ?? "transparent",
            borderRadius: interaction.borderRadius ?? 0,
            opacity: interaction.opacity ?? 1,
            cursor: imageExportMode || isEngagement ? "pointer" : "move",
          }}
        >
          {/* Icon + label + shop details, shared with the reader and the page
              thumbnails so an interaction looks the same everywhere. */}
          <InteractionFace data={interaction} audioPlaying={audioPlaying} />

          {interaction.interactionKind === "caption" && captionExpanded && (
            <span
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: "100%",
                padding: 10,
                borderRadius: interaction.borderRadius ?? 8,
                background: interaction.backgroundColor ?? "#4f46e5",
                color: interaction.textColor ?? "#fff",
                whiteSpace: "normal",
                zIndex: 20,
              }}
            >
              {interaction.expandedText || interaction.text}
            </span>
          )}

          {isEngagement && showHint && !imageExportMode && !popupOpen && (
            <span
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#111827",
                color: "#fff",
                fontSize: 11,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 6,
                whiteSpace: "nowrap",
                zIndex: 30,
                pointerEvents: "none",
              }}
            >
              {`${ENGAGEMENT_HINT[interaction.interactionKind]} — double-click to test`}
            </span>
          )}
        </div>
      </CanvasDragDrop>

      {popupOpen && interaction.interactionKind === "quiz" && (
        <QuizPopup data={interaction} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && interaction.interactionKind === "question" && (
        <QuestionPopup data={interaction} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && interaction.interactionKind === "contact-form" && (
        <ContactFormPopup
          data={interaction}
          onClose={() => setPopupOpen(false)}
        />
      )}
      {popupOpen && interaction.interactionKind === "spotlight" && (
        <SpotlightPopup data={interaction} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && interaction.interactionKind === "video-button" && (
        <VideoPopup data={interaction} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && interaction.interactionKind === "popup-slideshow" && (
        <SlideshowPopup data={interaction} onClose={() => setPopupOpen(false)} />
      )}

      {dragDropSelected && contextMenuPos && (
        <ElementContextMenu
          position={contextMenuPos}
          elementId={id}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
});

RenderInteraction.displayName = "RenderInteraction";
export default RenderInteraction;
