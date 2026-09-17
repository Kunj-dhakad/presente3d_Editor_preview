"use client";

import React, { memo } from "react";
import type { ShapeBlock } from "../types/blocks";
import { blockFrame, flipCss, strokeCss } from "../utils/blockStyles";

interface Props {
  block: ShapeBlock;
}

/** Shapes are authored as inner SVG markup on a fixed 100x100 viewBox. */
const ShapeRenderer = memo(function ShapeRenderer({ block }: Props) {
  return (
    <div
      data-block-id={block.id}
      style={blockFrame(block, {
        color: block.color,
        opacity: block.opacity,
        pointerEvents: "none",
      })}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill={block.color}
        style={{
          transform: flipCss(block.flipX, block.flipY),
          border: strokeCss(block.stroke),
        }}
        dangerouslySetInnerHTML={{ __html: block.svg }}
      />
    </div>
  );
});

export default ShapeRenderer;
