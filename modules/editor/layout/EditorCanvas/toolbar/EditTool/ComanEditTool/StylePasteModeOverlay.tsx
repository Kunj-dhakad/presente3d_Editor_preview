"use client";

import { useEffect } from "react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { cancelStylePaste } from "@editor/lib/stylePasteMode";
import { KdPaintRollerIcon } from "@editor/lib/icon/icons";

const StylePasteModeOverlay = () => {
  const isActive = useEditorUIStore((s) => s.isCopyStyleMode);
  const sourceSlide = useEditorUIStore((s) => s.stylePasteSourceSlide);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  useEffect(() => {
    if (!isActive) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "copy";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelStylePaste();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-element-id], [data-group-selection='true']")) {
        cancelStylePaste();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.body.style.cursor = previousCursor;
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [isActive]);

  useEffect(() => {
    if (isActive && sourceSlide !== null && sourceSlide !== activeSlide) cancelStylePaste();
  }, [activeSlide, isActive, sourceSlide]);

  if (!isActive) return null;
  return (
    <div className="fixed left-1/2 top-4 z-[10001] -translate-x-1/2 kd-text-toolbar flex items-center gap-2 px-3 py-2 text-xs pointer-events-none">
      <KdPaintRollerIcon />
      <span>Click another element to apply copied style</span>
      <span className="kd-text-muted">Esc to cancel</span>
    </div>
  );
};

export default StylePasteModeOverlay;
