"use client";

import React, { memo } from "react";
import type { ImageBlock, StickerBlock } from "../types/blocks";
import {
  MISSING_IMAGE_SRC,
  blockFrame,
  filterCss,
  flipCss,
  strokeCss,
} from "../utils/blockStyles";

interface Props {
  block: ImageBlock | StickerBlock;
  /**
   * Load now instead of lazily. Flipbook keeps upcoming pages display:none,
   * where lazy images never start loading — so without this they downloaded
   * and decoded mid-flip and the turn stuttered.
   */
  eager?: boolean;
}

/**
 * Photos and stickers differ only in how they fill their frame, so they share
 * a renderer. A plain <img> is used rather than next/image: exported books
 * carry absolute, already-sized URLs and often blob/data sources.
 */
const ImageRenderer = memo(function ImageRenderer({ block, eager = false }: Props) {
  const clickable = Boolean(block.link);

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={block.src}
      alt={block.alt ?? ""}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={(event) => {
        const target = event.currentTarget;
        target.onerror = null;
        target.src = MISSING_IMAGE_SRC;
      }}
      style={{
        width: "100%",
        height: "100%",
        objectFit: block.objectFit,
        objectPosition: "center",
        userSelect: "none",
        transform: flipCss(block.flipX, block.flipY),
        border: strokeCss(block.stroke),
        borderRadius: block.borderRadius,
        filter: filterCss(block.filters),
      }}
    />
  );

  return (
    <div
      data-block-id={block.id}
      style={blockFrame(block, {
        opacity: block.opacity,
        borderRadius: block.borderRadius,
        overflow: "hidden",
      })}
    >
      {clickable ? (
        <a
          href={block.link}
          target="_blank"
          rel="noreferrer"
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
});

export default ImageRenderer;
