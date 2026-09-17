"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import type { InteractionBlock } from "../types/interaction";
import {
  ENGAGEMENT_FALLBACK_LABEL,
  NAV_INTERACTION_KINDS,
  POPUP_INTERACTION_KINDS,
} from "../constants/reader";
import { blockFrame, gradientCss } from "../utils/blockStyles";
import { useBookPreview } from "../context/BookPreviewContext";
import SlideshowCarousel from "../components/SlideshowCarousel";
import ContactFormPopup from "../popup/ContactFormPopup";
import QuestionPopup from "../popup/QuestionPopup";
import QuizPopup from "../popup/QuizPopup";
import SlideshowPopup from "../popup/SlideshowPopup";
import SpotlightPopup from "../popup/SpotlightPopup";
import VideoPopup from "../popup/VideoPopup";

interface Props {
  block: InteractionBlock;
  /**
   * False for pages far from the reader or in thumbnails: embedded players
   * render as a placeholder and slideshows stop auto-advancing.
   */
  mediaActive?: boolean;
}

/** Embedded media arrives pre-resolved, so this is a straight render. */
function EmbeddedMedia({ block }: Props) {
  const source = block.embedUrl || block.url || block.link || "";
  if (!source) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
        No media
      </div>
    );
  }
  if (block.renderMode === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt=""
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (block.renderMode === "video") {
    return (
      <video
        src={source}
        className="h-full w-full object-cover"
        controls={block.controls}
        autoPlay={block.autoplay}
        playsInline
      />
    );
  }
  if (block.renderMode === "external") {
    return (
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className="flex h-full items-center justify-center bg-slate-100 text-sm text-(--kd-accent)"
      >
        Open media
      </a>
    );
  }
  return (
    <iframe
      src={source}
      title="Embedded media"
      className="h-full w-full border-0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen={block.allowFullscreen}
    />
  );
}

const InteractionRenderer = memo(function InteractionRenderer({
  block,
  mediaActive = true,
}: Props) {
  const {
    goToPage,
    goToLinkedPage,
    nextPage,
    prevPage,
    totalPages,
    setBlockMouseFlip,
  } = useBookPreview();

  const [popupOpen, setPopupOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const flipReleaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (flipReleaseRef.current) clearTimeout(flipReleaseRef.current);
    },
    [],
  );

  const opensPopup = POPUP_INTERACTION_KINDS.includes(block.interactionKind);

  const holdFlip = () => {
    setBlockMouseFlip(true);
    if (flipReleaseRef.current) clearTimeout(flipReleaseRef.current);
    flipReleaseRef.current = setTimeout(() => setBlockMouseFlip(false), 600);
  };

  const toggleAudio = () => {
    if (!block.audioUrl) return;
    if (!audioRef.current) {
      const audio = new Audio(block.audioUrl);
      audio.onplay = () => setAudioPlaying(true);
      audio.onpause = () => setAudioPlaying(false);
      audio.onended = () => setAudioPlaying(false);
      audioRef.current = audio;
    }
    if (audioRef.current.paused) void audioRef.current.play();
    else audioRef.current.pause();
  };

  const activate = () => {
    if (block.interactionKind === "quiz") {
      setPopupOpen(true);
      return;
    }
    if (block.interactionKind === "video-button") {
      setPopupOpen(true);
      return;
    }
    if (block.interactionKind === "question") {
      setPopupOpen(true);
      return;
    }
    if (block.interactionKind === "contact-form") {
      setPopupOpen(true);
      return;
    }
    if (block.interactionKind === "spotlight") {
      setPopupOpen(true);
      return;
    }
    if (block.interactionKind === "popup-slideshow") {
      setPopupOpen(true);
      return;
    }

    if (block.interactionKind === "audio-button") return toggleAudio();
    if (opensPopup) return setPopupOpen(true);
    if (block.interactionKind === "caption")
      return setCaptionExpanded((value) => !value);

    if (NAV_INTERACTION_KINDS.includes(block.interactionKind)) {
      switch (block.interactionKind) {
        case "nav-prev-page":
          return prevPage();
        case "nav-next-page":
          return nextPage();
        case "nav-first-page":
          return goToPage(1);
        case "nav-last-page":
          return goToPage(totalPages);
        case "nav-goto-page":
          return goToPage(block.navTargetPage);
        default:
          return;
      }
    }

    const url = block.url || block.link;
    if (!url) return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) return goToLinkedPage(url);
    /*
     * noopener: the opened page must not get `window.opener`, or it could
     * navigate this tab elsewhere (reverse tabnabbing).
     */
    window.open(
      url,
      block.target === "popup" ? "interaction-popup" : (block.target ?? "_blank"),
      block.target === "popup"
        ? "popup=yes,width=800,height=600,noopener,noreferrer"
        : "noopener,noreferrer",
    );
  };

  if (block.interactionKind === "slideshow") {
    return (
      <div
        data-block-id={block.id}
        style={blockFrame(block, {
          borderRadius: block.borderRadius || 8,
          overflow: "hidden",
          opacity: block.opacity,
          background: block.backgroundColor ?? "#f8fafc",
        })}
        onPointerDownCapture={(e) => {
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
        }}
      >
        <SlideshowCarousel
          images={block.slideshowImages}
          interval={block.slideshowInterval}
          autoplay={mediaActive}
          showArrows
          showDots
          borderRadius={block.borderRadius || 8}
        />
      </div>
    );
  }

  if (block.interactionKind === "embed-media") {
    return (
      <div
        data-block-id={block.id}
        style={blockFrame(block, {
          borderRadius: block.borderRadius,
          overflow: "hidden",
          opacity: block.opacity,
        })}
        onPointerDownCapture={(e) => {
          e.stopPropagation();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
        }}
      >
        {mediaActive || block.renderMode === "image" ? (
          <EmbeddedMedia block={block} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900/90 text-xs font-medium text-white/70">
            Media
          </div>
        )}
      </div>
    );
  }

  const iconSize =
    block.interactionKind === "link-area" ||
    block.interactionKind === "product-card"
      ? 26
      : 18;

  const showsLabel =
    opensPopup &&
    block.interactionKind !== "video-button" &&
    block.interactionKind !== "audio-button" &&
    block.interactionKind !== "popup-slideshow";

  const handleActivate = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    (event.nativeEvent as Event).stopImmediatePropagation?.();
    activate();
    holdFlip();
  };

  const stopOnly = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    (event.nativeEvent as Event).stopImmediatePropagation?.();
  };

  return (
    <>
      <button
        type="button"
        data-block-id={block.id}
        data-interaction-kind={block.interactionKind}
        title={block.tooltip}
        onClick={handleActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            activate();
            holdFlip();
          }
        }}
        onPointerDownCapture={stopOnly}
        onMouseDown={stopOnly}
        onTouchStart={stopOnly}
        style={blockFrame(block, {
          display: "flex",
          alignItems: "center",
          justifyContent:
            block.textAlign === "left"
              ? "flex-start"
              : block.textAlign === "right"
                ? "flex-end"
                : "center",
          gap: 6,
          padding: "0 14px",
          boxSizing: "border-box",
          background:
            gradientCss(
              block.gradientFrom,
              block.gradientTo,
              block.gradientDirection,
            ) ??
            block.backgroundColor ??
            "transparent",
          border: block.strokeWidth
            ? `${block.strokeWidth}px ${block.strokeStyle} ${block.borderColor ?? "#000"}`
            : undefined,
          borderRadius: block.borderRadius,
          opacity: block.opacity,
          cursor: "pointer",
          pointerEvents: "auto",
          zIndex: (block.zIndex ?? 1) + 20,
          margin: 0,
          font: "inherit",
          appearance: "none",
          WebkitAppearance: "none",
        })}
      >
        {block.svg && (
          <span
            aria-hidden="true"
            style={{
              color: block.iconColor ?? block.textColor,
              width: iconSize,
              height: iconSize,
              flexShrink: 0,
              display: "inline-flex",
              opacity: audioPlaying ? 0.65 : 1,
            }}
            dangerouslySetInnerHTML={{ __html: block.svg }}
          />
        )}

        {showsLabel && (
          <span
            style={{
              color: block.textColor,
              fontSize: block.fontSize,
              fontWeight: block.fontWeight,
              fontFamily: block.fontFamily ?? "Inter",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {block.text || ENGAGEMENT_FALLBACK_LABEL[block.interactionKind] || ""}
          </span>
        )}

        {block.interactionKind === "caption" && captionExpanded && (
          <span
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: "100%",
              padding: 10,
              borderRadius: block.borderRadius || 8,
              background: block.backgroundColor ?? "#4f46e5",
              color: block.textColor,
              whiteSpace: "normal",
              zIndex: 20,
            }}
          >
            {block.expandedText || block.text}
          </span>
        )}
      </button>

      {popupOpen && block.interactionKind === "quiz" && (
        <QuizPopup block={block} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && block.interactionKind === "question" && (
        <QuestionPopup block={block} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && block.interactionKind === "contact-form" && (
        <ContactFormPopup block={block} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && block.interactionKind === "spotlight" && (
        <SpotlightPopup block={block} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && block.interactionKind === "video-button" && (
        <VideoPopup block={block} onClose={() => setPopupOpen(false)} />
      )}
      {popupOpen && block.interactionKind === "popup-slideshow" && (
        <SlideshowPopup block={block} onClose={() => setPopupOpen(false)} />
      )}
    </>
  );
});

export default InteractionRenderer;