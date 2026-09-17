"use client";

import useEditorStore, { type ElementData } from "@editor/store/editorStore";

type TextTemplateElement = {
  id: string;
  data: ElementData & { color?: string; html?: string };
};

/**
 * Drops a text template's elements onto the active page, centred on a point.
 *
 * The panel (click) and the canvas (drag) both need this, and only the centre
 * point differs between them — the panel uses the middle of the page, a drag
 * uses wherever it was released. Keeping one copy is what lets the two entry
 * points stay in step.
 */
export const addTextTemplateAtPoint = async (
  jsonUrl: string,
  centerX: number,
  centerY: number,
): Promise<boolean> => {
  try {
    const response = await fetch(jsonUrl);
    const data = await response.json();
    const templateSlide = data?.slides?.[0];
    const elements: TextTemplateElement[] = templateSlide?.elements ?? [];
    if (!elements.length) return false;

    // The template's own centre, so its internal layout is preserved and only
    // the group as a whole moves to the drop point.
    const templateCenterX = (templateSlide?.width ?? 350) / 2;
    const templateCenterY = (templateSlide?.height ?? 434) / 2;

    const { addElement } = useEditorStore.getState();

    elements.forEach((el) => {
      const d = el.data;
      const offsetX = d.x + d.width / 2 - templateCenterX;
      const offsetY = d.y + d.height / 2 - templateCenterY;

      addElement({
        ...d,
        x: centerX + offsetX - d.width / 2,
        y: centerY + offsetY - d.height / 2,
      } as ElementData);
    });

    return true;
  } catch (error) {
    console.error("Error loading template:", error);
    return false;
  }
};
