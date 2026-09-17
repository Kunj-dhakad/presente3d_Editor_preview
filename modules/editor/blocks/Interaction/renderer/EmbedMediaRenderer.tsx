"use client";

import React, { useCallback } from "react";
import { Clapperboard } from "lucide-react";
import useEditorStore, { InteractionData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import type { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import { MediaPreview } from "../components/InteractionDetailView/EmbedMedia/media";

export default function EmbedMediaRenderer({
  id,
  interaction,
  slideIndex,
  clipBounds,
}: {
  id: string;
  interaction: InteractionData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const setActiveElementId = useEditorStore((s) => s.setActiveElementId);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const toggleSelectedElementId = useEditorStore(
    (s) => s.toggleSelectedElementId,
  );
  const selected = useEditorStore(
    useCallback((s) => s.selectedElementIds.includes(id), [id]),
  );
  const preview = useEditorUIStore((s) => s.imageExportMode);
  const select = (event: React.PointerEvent) => {
    setActiveSlide(slideIndex);
    if (event.ctrlKey || event.metaKey || event.shiftKey)
      toggleSelectedElementId(id);
    else if (!selected) setActiveElementId(id);
  };
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: interaction.borderRadius ?? 8,
    padding: interaction.padding ?? 0,
    boxSizing: "border-box",
    background: interaction.backgroundColor ?? "transparent",
    opacity: interaction.opacity ?? 1,
  };
  return (
    <CanvasDragDrop
      id={id}
      rect={{
        x: interaction.x,
        y: interaction.y,
        width: interaction.width,
        height: interaction.height,
        rotation: interaction.rotation ?? 0,
      }}
      isSelected={selected}
      imageExportMode={preview}
      clipBounds={clipBounds}
      onSelect={select}
      onChange={(rect) => updateElement(id, { ...rect }, { history: true })}
    >
      <div style={style}>
        {preview && interaction.embedUrl ? (
          <MediaPreview
            media={{
              originalUrl: interaction.url ?? "",
              embedUrl: interaction.embedUrl,
              renderMode: interaction.renderMode ?? "external",
            }}
            autoplay={!!interaction.autoplay}
            controls={interaction.controls !== false}
            allowFullscreen={interaction.allowFullscreen !== false}
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden kd-bg-sunken pointer-events-none">
            {interaction.thumbnail && (
              <img
                src={interaction.thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-55"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="relative flex items-center gap-2 rounded-full kd-bg-inverse px-3 py-1.5 text-xs font-semibold kd-fg-inverse">
              <Clapperboard size={15} />
              {interaction.provider || "Embed media"}
            </div>
          </div>
        )}
      </div>
    </CanvasDragDrop>
  );
}
