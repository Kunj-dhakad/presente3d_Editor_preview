"use client";

import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TextBlock } from "../types/blocks";
import { TEXT_BOX_PADDING } from "../constants/reader";
import { loadGoogleFont } from "@shared/fonts/useFontLoader";
import { useBookPreviewOptional } from "../context/BookPreviewContext";
import type { SearchMatch } from "../hooks/useFindSearch";

/** Stable empty list so memo/effect deps don't change every render. */
const NO_MATCHES: SearchMatch[] = [];
import { hexToRgba } from "../utils/color";

interface Props {
  block: TextBlock;

  /** True while this text block is being narrated. */
  narrating?: boolean;

  /** Zero-based word index currently being spoken. */
  narratingWordIndex?: number | null;
}

/**
 * Remove only Find/search <mark> elements that were created by this renderer.
 * Existing HTML formatting is preserved.
 */
function unwrapSearchMarks(root: HTMLElement) {
  const marks = root.querySelectorAll(
    'mark[data-search-match="true"]',
  );

  marks.forEach((mark) => {
    const parent = mark.parentNode;

    if (!parent) return;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
  });
}

/**
 * Apply search highlighting to text nodes only.
 *
 * This deliberately does NOT modify HTML strings.
 * Therefore <strong>, <em>, <a>, etc. remain intact.
 */
function applySearchMarks(
  root: HTMLElement,
  matches: Array<{
    start: number;
    end: number;
    active: boolean;
  }>,
  highlightColor: string,
) {
  if (matches.length === 0) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );

  const textNodes: Text[] = [];

  let currentNode: Node | null;

  while ((currentNode = walker.nextNode())) {
    const textNode = currentNode as Text;

    if (!textNode.nodeValue) continue;

    if (
      textNode.parentElement?.closest(
        'mark[data-search-match="true"]',
      )
    ) {
      continue;
    }

    textNodes.push(textNode);
  }

  let globalOffset = 0;

  for (const textNode of textNodes) {
    const value = textNode.nodeValue || "";
    const nodeStart = globalOffset;
    const nodeEnd = globalOffset + value.length;

    globalOffset = nodeEnd;

    const overlappingMatches = matches.filter(
      (match) =>
        match.start < nodeEnd &&
        match.end > nodeStart,
    );

    if (overlappingMatches.length === 0) continue;

    const fragment = document.createDocumentFragment();

    let localCursor = 0;

    for (const match of overlappingMatches) {
      const localStart = Math.max(
        0,
        match.start - nodeStart,
      );

      const localEnd = Math.min(
        value.length,
        match.end - nodeStart,
      );

      if (localStart > localCursor) {
        fragment.appendChild(
          document.createTextNode(
            value.slice(localCursor, localStart),
          ),
        );
      }

      if (localEnd > localStart) {
        const mark = document.createElement("mark");

        mark.dataset.searchMatch = "true";

        mark.style.backgroundColor = hexToRgba(
          highlightColor,
          match.active ? 0.95 : 0.75,
        );

        mark.style.color = "#111111";
        mark.style.borderRadius = "2px";
        mark.style.padding = "0 1px";

        if (match.active) {
          mark.style.boxShadow =
            `0 0 4px ${hexToRgba(highlightColor, 0.55)}`;
        }

        mark.textContent = value.slice(
          localStart,
          localEnd,
        );

        fragment.appendChild(mark);
      }

      localCursor = localEnd;
    }

    if (localCursor < value.length) {
      fragment.appendChild(
        document.createTextNode(
          value.slice(localCursor),
        ),
      );
    }

    textNode.parentNode?.replaceChild(
      fragment,
      textNode,
    );
  }
}

const TextRenderer = memo(function TextRenderer({
  block,
  narrating = false,
  narratingWordIndex = null,
}: Props) {
  const [loadedFamily, setLoadedFamily] =
    useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const preview = useBookPreviewOptional();

  const searchQuery = preview?.searchQuery ?? "";

  const searchMatches = preview?.searchMatches ?? NO_MATCHES;

  const searchActiveMatch =
    preview?.searchActiveMatch ?? null;

  const narrationHighlightColor =
    preview?.narrationHighlightColor ?? "#ffe600";

  const textBackgroundColor =
    preview?.textBackgroundColor ?? "#ffe600";

  const searchHighlightColor =
    preview?.searchHighlightColor ?? "#ffeb3b";

  const fontReady =
    !block.fontFamily ||
    loadedFamily === block.fontFamily;

  useEffect(() => {
    const family = block.fontFamily;

    if (!family) {
      return;
    }

    let cancelled = false;

    loadGoogleFont(family).finally(() => {
      if (!cancelled) {
        setLoadedFamily(family);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [block.fontFamily]);

  const textStr = block.text || "";

  /*
   * Split once per block render.
   *
   * Keeping whitespace chunks means the original text spacing
   * is preserved exactly during narration.
   */
  const textChunks = useMemo(
    () => textStr.split(/(\s+)/),
    [textStr],
  );

  const useWordHighlight =
    narrating &&
    narratingWordIndex !== null &&
    narratingWordIndex !== undefined &&
    textStr.length > 0;

  /*
   * Find/search is disabled while narration highlighting
   * is active so narration remains the priority visual state.
   */
  /*
   * Render the original HTML exactly as before.
   *
   * Search marks are applied afterwards to DOM text nodes.
   * This preserves existing HTML formatting.
   */
  const renderedText = useMemo(() => {
    if (!useWordHighlight) {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html:
              block.html || block.text,
          }}
        />
      );
    }

    let wordCounter = 0;

    return textChunks.map(
      (chunk, chunkIndex) => {
        const isSpacing =
          /\s+/.test(chunk);

        if (isSpacing) {
          return (
            <React.Fragment key={chunkIndex}>
              {chunk}
            </React.Fragment>
          );
        }

        const currentWordIndex =
          wordCounter;

        wordCounter += 1;

        const isCurrentWord =
          currentWordIndex ===
          narratingWordIndex;

        if (!isCurrentWord) {
          return (
            <React.Fragment key={chunkIndex}>
              {chunk}
            </React.Fragment>
          );
        }

        return (
          <span
            key={chunkIndex}
            style={{
              backgroundColor:
                hexToRgba(narrationHighlightColor, 0.95),
              color: "#111111",
              borderRadius: 2,
              padding: "0 2px",
              margin: "0 -2px",
              boxShadow:
                `0 0 4px ${hexToRgba(narrationHighlightColor, 0.6)}`,
            }}
          >
            {chunk}
          </span>
        );
      },
    );
  }, [
    block.html,
    block.text,
    narrationHighlightColor,
    narratingWordIndex,
    textChunks,
    useWordHighlight,
  ]);

  /*
   * Apply/remove Find marks after the original HTML has
   * been rendered into the DOM.
   *
   * JSON is never modified.
   */
  useEffect(() => {
    const root = containerRef.current;

    if (!root) return;

    /*
     * Always remove our previous search marks first.
     * This restores the original HTML structure.
     */
    unwrapSearchMarks(root);

    /*
     * Narration takes priority.
     */
    if (useWordHighlight) return;

    /*
     * No active search → leave original HTML untouched.
     */
    if (!searchQuery.trim()) return;

    const blockMatches = searchMatches
      .filter(
        (match) =>
          match.blockId === block.id,
      )
      .map((match) => ({
        start: match.start,
        end: match.end,
        active:
          searchActiveMatch?.blockId ===
            match.blockId &&
          searchActiveMatch.start ===
            match.start &&
          searchActiveMatch.end ===
            match.end,
      }));

    if (blockMatches.length === 0) return;

    /*
     * Small delay is intentionally avoided.
     * The DOM already contains the original HTML
     * after React has committed the render.
     */
    applySearchMarks(
      root,
      blockMatches,
      searchHighlightColor,
    );
  }, [
    block.id,
    block.html,
    block.text,
    searchQuery,
    searchMatches,
    searchActiveMatch,
    searchHighlightColor,
    textBackgroundColor,
    useWordHighlight,
  ]);

  return (
    <div
      ref={containerRef}
      data-block-id={block.id}
      style={{
        position: "absolute",

        left:
          block.x -
          TEXT_BOX_PADDING,

        top:
          block.y -
          TEXT_BOX_PADDING,

        width:
          block.width +
          TEXT_BOX_PADDING * 2,

        transform: block.rotation
          ? `rotate(${block.rotation}deg)`
          : undefined,

        transformOrigin:
          "center center",

        zIndex: block.zIndex,

        padding: TEXT_BOX_PADDING,

        boxSizing: "border-box",

        background: narrating
          ? hexToRgba(textBackgroundColor, 0.35)
          : block.backgroundColor ||
            "transparent",

        color: block.color,

        opacity: block.opacity,

        minHeight:
          block.height +
          TEXT_BOX_PADDING * 2,

        whiteSpace: "pre-wrap",

        wordBreak: "break-word",

        fontSize: block.fontSize,

        fontFamily:
          block.fontFamily,

        fontWeight:
          block.fontWeight,

        fontStyle:
          block.fontStyle,

        lineHeight:
          block.lineHeight,

        letterSpacing:
          block.letterSpacing,

        textAlign: block.align,

        textTransform:
          block.textTransform,

        textDecoration:
          block.textDecoration,

        visibility: fontReady
          ? "visible"
          : "hidden",

        borderRadius: narrating
          ? 4
          : undefined,
      }}
    >
      {renderedText}
    </div>
  );
});

export default TextRenderer;