"use client";

import React, { memo } from "react";
import type { WatermarkBlock } from "../types/blocks";

interface Props {
  block: WatermarkBlock;
  pageWidth: number;
  pageHeight: number;
}

/** Authoring stores letter spacing as a percentage string. */
const letterSpacingToEm = (value?: string): string => {
  if (!value) return "0.15em";
  const percent = parseFloat(value);
  return Number.isNaN(percent) ? "0.15em" : `${(percent / 100).toFixed(3)}em`;
};

function Stamp({
  block,
  x,
  y,
}: {
  block: WatermarkBlock;
  x: number;
  y: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${block.rotation}deg)`,
        transformOrigin: "center center",
        color: block.color,
        opacity: block.opacity,
        fontSize: block.fontSize,
        fontWeight: 800,
        fontFamily: block.font
          ? `'${block.font}', sans-serif`
          : "'Plus Jakarta Sans', sans-serif",
        letterSpacing: letterSpacingToEm(block.letterSpacing),
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        userSelect: "none",
        pointerEvents: "none",
        lineHeight: 1,
      }}
    >
      {block.text}
    </div>
  );
}

/**
 * Watermarks cover the whole page rather than sitting in a box, so this is the
 * one renderer that reads page geometry instead of the block's own rect.
 */
const WatermarkRenderer = memo(function WatermarkRenderer({
  block,
  pageWidth,
  pageHeight,
}: Props) {
  const layer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: pageWidth,
    height: pageHeight,
    overflow: "hidden",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: block.zIndex ?? 9999,
  };

  if (block.imageSrc) {
    const width = !block.scale || block.scale === "Auto" ? "60%" : block.scale;
    return (
      <div style={layer} aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.imageSrc}
            alt=""
            draggable={false}
            style={{
              width,
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              opacity: block.opacity,
              transform: `rotate(${block.rotation}deg)`,
              transformOrigin: "center center",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    );
  }

  const stamps: React.ReactNode[] = [];
  const approxWidth = block.text.length * block.fontSize * 0.6;
  const approxHeight = block.fontSize * 1.2;

  if (block.pattern === "grid") {
    // Tile against the text's *rotated* bounding box, otherwise stamps overlap
    // at steep angles.
    const radians = Math.abs((block.rotation * Math.PI) / 180);
    const boxWidth =
      approxWidth * Math.abs(Math.cos(radians)) +
      approxHeight * Math.abs(Math.sin(radians));
    const boxHeight =
      approxWidth * Math.abs(Math.sin(radians)) +
      approxHeight * Math.abs(Math.cos(radians));
    const gapX = boxWidth * 1.4;
    const gapY = boxHeight * 1.9;
    const columns = Math.ceil(pageWidth / gapX) + 2;
    const rows = Math.ceil(pageHeight / gapY) + 2;

    for (let row = -1; row < rows; row += 1) {
      for (let column = -1; column < columns; column += 1) {
        const stagger = row % 2 === 0 ? 0 : gapX / 2;
        stamps.push(
          <Stamp
            key={`${row}-${column}`}
            block={block}
            x={column * gapX + stagger - approxWidth / 2}
            y={row * gapY - approxHeight / 2}
          />,
        );
      }
    }
  } else {
    stamps.push(
      <Stamp key="single" block={block} x={pageWidth / 2} y={pageHeight / 2} />,
    );
  }

  return (
    <div style={layer} aria-hidden="true">
      {stamps}
    </div>
  );
});

export default WatermarkRenderer;
