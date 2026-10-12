"use client";

import React, { memo, useCallback, useMemo, useRef } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, { ElementData, QRCodeData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { applyCopiedStyleIfActive } from "@editor/lib/styleClipboard";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";
import { useBookOptional } from "@editor/layout/header/EditorPreview/context/BookStateContext";
import { openElementLink } from "@editor/lib/reader/elementLink";
import { useQrTarget } from "@shared/qrTarget";
import {
  DEFAULT_EC,
  DEFAULT_QR_BACKGROUND,
  DEFAULT_QR_FOREGROUND,
  encodeQR,
  qrPath,
} from "../qr";

/**
 * A QR code drawn as vector modules.
 *
 * Every dark module is one `<rect>` in a viewBox one unit per module, so the
 * code is resolution-independent: it is exactly as crisp in a 4000px export as
 * on a 60px thumbnail, and `shapeRendering="crispEdges"` keeps the module
 * boundaries from being anti-aliased into grey at small sizes — which is what
 * makes a scaled-down QR stop scanning.
 */
const RenderQRCode: React.FC<{
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}> = memo(
  ({ id, data, slideIndex, clipBounds }) => {
    const { updateElement, setActiveElementId, setActiveSlide, toggleSelectedElementId } =
      useEditorStore(
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
    const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
    const book = useBookOptional();
    const lastLinkRef = useRef(0);
    const { contextMenuPos, handleContextMenu, closeContextMenu } =
      useElementContextMenu(id, slideIndex);

    const qr = data.type === "qr-code" ? (data as QRCodeData) : null;
    const target = useQrTarget(qr?.content ?? "", qr?.bookLink);
    const matrix = useMemo(
      () => (qr ? encodeQR(target, qr.ecLevel ?? DEFAULT_EC) : null),
      [qr, target],
    );

    if (!qr) return null;

    const foreground = qr.foreground ?? DEFAULT_QR_FOREGROUND;
    const background = qr.background ?? DEFAULT_QR_BACKGROUND;
    const hasLink = !!(qr.link ?? target)?.trim();

    return (
      <>
        <CanvasDragDrop
          id={id}
          rect={{
            x: qr.x,
            y: qr.y,
            width: qr.width,
            height: qr.height,
            rotation: qr.rotation ?? 0,
          }}
          isSelected={isSelected}
          imageExportMode={imageExportMode}
          clipBounds={clipBounds}
          onContextMenu={handleContextMenu}
          onSelect={(e) => {
            if (useEditorUIStore.getState().isCopyStyleMode) {
              applyCopiedStyleIfActive(id);
              return;
            }
            setActiveSlide(slideIndex);
            if (e.ctrlKey || e.metaKey || e.shiftKey) toggleSelectedElementId(id);
            else setActiveElementId(id);
          }}
          onElementClick={() => {
            if (!imageExportMode) {
              return;
            }
            if (!hasLink) return;
            const now = Date.now();
            if (now - lastLinkRef.current < 400) return;
            lastLinkRef.current = now;
            openElementLink(qr.link || target, book);
          }}
          onDoubleClick={() => {
            setActiveSlide(slideIndex);
            setActiveElementId(id);
            setActiveRightPanel("QRCodeSettings");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed")
              useEditorUIStore.getState().setSidebarWidth("edit");
          }}
          onChange={(rect) =>
            updateElement(
              id,
              { x: rect.x, y: rect.y, width: rect.width, height: rect.height, rotation: rect.rotation },
              { history: true },
            )
          }
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              opacity: qr.opacity ?? 1,
              cursor: imageExportMode && hasLink ? "pointer" : undefined,
            }}
          >
            {matrix ? (
              <svg
                viewBox={`0 0 ${matrix.size} ${matrix.size}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`QR code for ${target}`}
              >
                {/* The quiet zone is part of the code, not padding around it —
                    without it scanners cannot find the symbol at all. */}
                <rect width={matrix.size} height={matrix.size} fill={background} />
                <path d={qrPath(matrix)} fill={foreground} />
              </svg>
            ) : (
              !imageExportMode && (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    textAlign: "center",
                    background: background,
                    color: "var(--kd-text-muted, #6b7280)",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "1px dashed var(--kd-border)",
                  }}
                >
                  Add QR content
                </div>
              )
            )}
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
  },
  (prev, next) => {
    const a = prev.data as QRCodeData;
    const b = next.data as QRCodeData;
    return (
      prev.id === next.id &&
      prev.slideIndex === next.slideIndex &&
      prev.clipBounds === next.clipBounds &&
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height &&
      a.rotation === b.rotation &&
      a.opacity === b.opacity &&
      a.content === b.content &&
      a.foreground === b.foreground &&
      a.background === b.background &&
      a.ecLevel === b.ecLevel &&
      a.link === b.link
    );
  },
);

RenderQRCode.displayName = "RenderQRCode";
export default RenderQRCode;
