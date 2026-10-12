"use client";

import React, { memo, useMemo } from "react";
import qrcode from "qrcode-generator";
import type { QrCodeBlock } from "../types/blocks";
import { useQrTarget } from "@shared/qrTarget";
import { blockFrame } from "../utils/blockStyles";

interface Props {
  block: QrCodeBlock;
}

/** Quiet zone around the code, in modules (the spec asks for 4; 2 reads fine on screen). */
const QUIET_ZONE = 2;

/**
 * Draws the QR code as one SVG path built from the module matrix, so the
 * author's foreground/background colours apply and it stays crisp at any
 * zoom. Content that doesn't fit a QR code renders an empty frame.
 */
const QrCodeRenderer = memo(function QrCodeRenderer({ block }: Props) {
  const content = useQrTarget(block.content, block.bookLink);
  const matrix = useMemo(() => {
    if (!content) return null;
    try {
      const qr = qrcode(0, block.errorCorrection);
      qr.addData(content);
      qr.make();
      const count = qr.getModuleCount();
      let path = "";
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
          }
        }
      }
      return { size: count + QUIET_ZONE * 2, path };
    } catch {
      return null; // payload too long for any QR version
    }
  }, [content, block.errorCorrection]);

  return (
    <div
      data-block-id={block.id}
      style={blockFrame(block, {
        opacity: block.opacity,
        background: block.background,
      })}
    >
      {matrix && (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${matrix.size} ${matrix.size}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={`QR code: ${content}`}
        >
          <rect width={matrix.size} height={matrix.size} fill={block.background} />
          <path d={matrix.path} fill={block.foreground} />
        </svg>
      )}
    </div>
  );
});

export default QrCodeRenderer;
