"use client";

import { useBookPreviewOptional } from "../context/BookPreviewContext";
import type { SearchMatch } from "../hooks/useFindSearch";

/** Stable empty list so memo/effect deps don't change every render. */
const NO_MATCHES: SearchMatch[] = [];
import React, { memo, useMemo } from "react";
import type { ButtonBlock } from "../types/blocks";
import {
  BUTTON_SHADOWS,
  blockFrame,
  gradientCss,
  strokeCss,
} from "../utils/blockStyles";

interface Props {
  block: ButtonBlock;

  /** Links to another page in this book rather than out to the web. */
  onInternalLink?: (link: string) => void;
}

const isExternal = (link: string) =>
  /^(https?:|mailto:|tel:)/i.test(link);

const ButtonRenderer = memo(function ButtonRenderer({
  block,
  onInternalLink,
}: Props) {
  const background =
    gradientCss(
      block.gradientFrom,
      block.gradientTo,
      block.gradientDirection,
    ) ??
    block.backgroundColor ??
    "transparent";

  const preview = useBookPreviewOptional();

  const setBlockMouseFlip =
    preview?.setBlockMouseFlip;

  const searchQuery =
    preview?.searchQuery ?? "";

  const searchMatches =
    preview?.searchMatches ?? NO_MATCHES;

  const searchActiveMatch =
    preview?.searchActiveMatch ?? null;

  const buttonMatches = useMemo(
    () =>
      searchMatches.filter(
        (match) =>
          match.blockId === block.id,
      ),
    [searchMatches, block.id],
  );

  const handleClick = (
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const link = block.link;

    if (!link) return;

    if (isExternal(link)) {
      window.open(
        link,
        "_blank",
        "noopener,noreferrer",
      );

      return;
    }

    onInternalLink?.(link);
  };

  /*
   * Build button text with Find highlights.
   *
   * Only the visible label is highlighted.
   * Button behavior and styling remain unchanged.
   */
  const renderedButtonText = useMemo(() => {
    const text = block.text || "";

    if (
      !searchQuery.trim() ||
      buttonMatches.length === 0
    ) {
      return text;
    }

    const parts: React.ReactNode[] = [];

    let cursor = 0;

    for (
      let index = 0;
      index < buttonMatches.length;
      index++
    ) {
      const match = buttonMatches[index];

      const start = Math.max(
        0,
        Math.min(match.start, text.length),
      );

      const end = Math.max(
        start,
        Math.min(match.end, text.length),
      );

      if (start > cursor) {
        parts.push(
          <React.Fragment
            key={`text-${index}`}
          >
            {text.slice(cursor, start)}
          </React.Fragment>,
        );
      }

      if (end > start) {
        const isActive =
          searchActiveMatch?.blockId ===
            match.blockId &&
          searchActiveMatch.start ===
            match.start &&
          searchActiveMatch.end ===
            match.end;

        parts.push(
          <mark
            key={`match-${index}`}
            style={{
              backgroundColor: isActive
                ? "rgba(255, 165, 0, 0.95)"
                : "rgba(255, 235, 59, 0.75)",
              color: "#111111",
              borderRadius: 2,
              padding: "0 1px",
              boxShadow: isActive
                ? "0 0 4px rgba(255, 165, 0, 0.55)"
                : undefined,
            }}
          >
            {text.slice(start, end)}
          </mark>,
        );
      }

      cursor = end;
    }

    if (cursor < text.length) {
      parts.push(
        <React.Fragment key="text-final">
          {text.slice(cursor)}
        </React.Fragment>,
      );
    }

    return parts;
  }, [
    block.text,
    buttonMatches,
    searchActiveMatch,
    searchQuery,
  ]);

  return (
    <div
      data-block-id={block.id}
      style={blockFrame(block)}
      onMouseDown={(e) => {
        e.stopPropagation();
        setBlockMouseFlip?.(true);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        setBlockMouseFlip?.(true);
      }}
      onMouseUp={() => {
        window.setTimeout(
          () => setBlockMouseFlip?.(false),
          300,
        );
      }}
      onTouchEnd={() => {
        window.setTimeout(
          () => setBlockMouseFlip?.(false),
          300,
        );
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={!block.link}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent:
            block.textAlign === "left"
              ? "flex-start"
              : block.textAlign === "right"
                ? "flex-end"
                : "center",
          gap: 6,
          padding: "0 16px",
          boxSizing: "border-box",
          overflow: "hidden",
          whiteSpace: "nowrap",
          background,
          border: strokeCss({
            ...block.stroke,
            color:
              block.borderColor ??
              block.stroke.color,
          }),
          borderRadius:
            block.borderRadius,
          boxShadow:
            BUTTON_SHADOWS[
              block.shadowPreset
            ] ?? "none",
          opacity: block.opacity,
          fontSize: block.fontSize,
          fontFamily:
            block.fontFamily ?? "Inter",
          fontWeight: block.fontWeight,
          fontStyle: block.fontStyle,
          color: block.textColor,
          textDecoration:
            block.textDecorationLine ??
            "none",
          textTransform:
            block.textTransform,
          letterSpacing:
            block.letterSpacing
              ? `${block.letterSpacing}px`
              : undefined,
          cursor: block.link
            ? "pointer"
            : "default",
        }}
      >
        {block.icon &&
          block.iconPosition === "left" && (
            <span>{block.icon}</span>
          )}

        <span>
          {renderedButtonText}
        </span>

        {block.icon &&
          block.iconPosition !== "left" && (
            <span>{block.icon}</span>
          )}
      </button>
    </div>
  );
});

export default ButtonRenderer;