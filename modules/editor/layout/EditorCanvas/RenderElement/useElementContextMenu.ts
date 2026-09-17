"use client";
import { useCallback, useState } from "react";
import useEditorStore from "@editor/store/editorStore";
import type { ContextMenuPosition } from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";

export function useElementContextMenu(id: string, slideIndex: number) {
  const [contextMenuPos, setContextMenuPos] =
    useState<ContextMenuPosition | null>(null);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const setActiveElementId = useEditorStore((s) => s.setActiveElementId);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveSlide(slideIndex);
      const currentActiveId = useEditorStore.getState().activeElementId;
      if (currentActiveId !== id) {
        setActiveElementId(id);
      }
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    },
    [id, slideIndex, setActiveSlide, setActiveElementId],
  );

  const closeContextMenu = useCallback(() => setContextMenuPos(null), []);

  return { contextMenuPos, handleContextMenu, closeContextMenu };
}