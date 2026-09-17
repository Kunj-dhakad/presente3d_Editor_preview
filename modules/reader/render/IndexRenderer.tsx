"use client";

import React, { memo, useMemo } from "react";
import type { ChapterEntry } from "../types/book";
import type { IndexBlock } from "../types/blocks";
import { hexToRgba } from "../utils/color";
import { paginateIndex } from "../utils/toc";

interface Props {
  block: IndexBlock;
  chapters: ChapterEntry[];
  onOpenPage: (pageNumber: number) => void;
}

/**
 * The reader's table of contents. Unlike the editor's, entries are always
 * clickable and never editable — that is the whole difference between
 * authoring a TOC and reading one.
 */
const IndexRenderer = memo(function IndexRenderer({
  block,
  chapters,
  onOpenPage,
}: Props) {
  const slice = useMemo(() => {
    const slices = paginateIndex(chapters, block);
    return slices[block.indexPage] ?? { page: block.indexPage, entries: [] };
  }, [block, chapters]);

  const accent = block.accentColor;
  const leader = block.leader;
  const spacing = block.spacing;
  const rightAligned = block.pageAlignment !== "left";

  const pageLabel = (chapter: ChapterEntry) =>
    block.showRanges
      ? `${chapter.startPage}–${chapter.endPage}`
      : chapter.startPage;

  const rowBase: React.CSSProperties = {
    cursor: "pointer",
    color: "inherit",
    font: "inherit",
    width: "100%",
    textAlign: "left",
  };

  const entryProps = (chapter: ChapterEntry) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      onOpenPage(chapter.startPage);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpenPage(chapter.startPage);
      }
    },
  });

  const dots = (repeat: number, opacity: number) => (
    <span
      aria-hidden
      style={{
        flex: 1,
        overflow: "hidden",
        whiteSpace: "nowrap",
        margin: "0 .35em",
        opacity,
      }}
    >
      {leader.repeat(repeat)}
    </span>
  );

  let entries: React.ReactNode;

  if (block.style === "boxed") {
    entries = (
      <div style={{ display: "flex", flexDirection: "column", gap: spacing }}>
        {slice.entries.map((chapter) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{
              ...rowBase,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 8,
              background: hexToRgba(accent, 0.1),
            }}
          >
            <span>{chapter.displayTitle}</span>
            <span
              style={{
                background: accent,
                color: "#fff",
                borderRadius: 999,
                padding: "1px 8px",
                fontSize: "0.85em",
                minWidth: "2ch",
                textAlign: "center",
                marginLeft: 8,
              }}
            >
              {pageLabel(chapter)}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (block.style === "numbered") {
    entries = (
      <div style={{ display: "flex", flexDirection: "column", gap: spacing }}>
        {slice.entries.map((chapter, index) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{ ...rowBase, display: "flex", alignItems: "center" }}
          >
            <span
              style={{
                flexShrink: 0,
                width: "1.6em",
                height: "1.6em",
                borderRadius: "50%",
                background: accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75em",
                marginRight: 8,
              }}
            >
              {index + 1}
            </span>
            <span>{chapter.displayTitle}</span>
            {dots(80, 0.5)}
            <span style={{ minWidth: "2ch", textAlign: rightAligned ? "right" : "left" }}>
              {pageLabel(chapter)}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (block.style === "colorBar") {
    entries = (
      <div style={{ display: "flex", flexDirection: "column", gap: spacing }}>
        {slice.entries.map((chapter) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{
              ...rowBase,
              display: "flex",
              alignItems: "center",
              borderLeft: `4px solid ${accent}`,
              paddingLeft: 10,
            }}
          >
            <span>{chapter.displayTitle}</span>
            <span style={{ flex: 1 }} />
            <span
              style={{
                background: hexToRgba(accent, 0.15),
                color: accent,
                fontWeight: 600,
                borderRadius: 6,
                padding: "1px 8px",
                minWidth: "2ch",
                textAlign: "center",
              }}
            >
              {pageLabel(chapter)}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (block.style === "underline") {
    entries = (
      <div style={{ display: "flex", flexDirection: "column", gap: spacing * 1.4 }}>
        {slice.entries.map((chapter) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{
              ...rowBase,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span style={{ borderBottom: `2px solid ${accent}`, paddingBottom: 2 }}>
              {chapter.displayTitle}
            </span>
            <span style={{ fontWeight: 600, marginLeft: 8 }}>
              {pageLabel(chapter)}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (block.style === "minimal") {
    entries = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slice.entries.map((chapter) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{
              ...rowBase,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `${spacing / 2}px 0`,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <span>{chapter.displayTitle}</span>
            <span style={{ opacity: 0.7, marginLeft: 8 }}>{pageLabel(chapter)}</span>
          </div>
        ))}
      </div>
    );
  } else if (block.style === "twoColumn") {
    entries = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 16,
          rowGap: spacing,
        }}
      >
        {slice.entries.map((chapter) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{ ...rowBase, display: "flex", alignItems: "baseline" }}
          >
            <span>{chapter.displayTitle}</span>
            {dots(40, 0.6)}
            <span style={{ minWidth: "2ch", textAlign: "right" }}>
              {pageLabel(chapter)}
            </span>
          </div>
        ))}
      </div>
    );
  } else {
    entries = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {slice.entries.map((chapter) => (
          <div
            key={chapter.blockId}
            {...entryProps(chapter)}
            style={{
              ...rowBase,
              display: "flex",
              alignItems: "baseline",
              marginBottom: spacing,
            }}
          >
            <span>{chapter.displayTitle}</span>
            {dots(80, 0.7)}
            <span style={{ minWidth: "2ch", textAlign: rightAligned ? "right" : "left" }}>
              {pageLabel(chapter)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      data-block-id={block.id}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
        transformOrigin: "center center",
        zIndex: block.zIndex,
        boxSizing: "border-box",
        overflow: "hidden",
        opacity: block.opacity,
        background: block.backgroundColor || "transparent",
        color: block.color ?? "#111827",
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        fontWeight: block.fontWeight,
        lineHeight: block.lineHeight,
        padding: `${block.marginTop}px ${block.indent}px ${block.marginBottom}px`,
      }}
    >
      <div
        style={{
          fontSize: "1.25em",
          fontWeight: 700,
          marginBottom: spacing * 1.5,
          textAlign: block.align,
        }}
      >
        {block.indexPage ? `${block.title} (continued)` : block.title}
      </div>
      {chapters.length === 0 && (
        <div style={{ opacity: 0.55 }}>No chapters available.</div>
      )}
      {entries}
    </section>
  );
});

export default IndexRenderer;
