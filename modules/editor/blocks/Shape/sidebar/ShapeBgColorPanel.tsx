"use client";

import useEditorStore, { ShapeData } from "@editor/store/editorStore";
import SolidColorPalette from "@editor/blocks/shared/SolidColorPalette";
import { patchForSolidFill, SHAPE_DEFAULT_COLOR } from "@editor/lib/canvas/shapeEffects";

export default function ShapeBgColorPanel() {
  const activeElementId = useEditorStore((state) => state.activeElementId);
  const updateElement = useEditorStore((state) => state.updateElement);
  const element = useEditorStore((state) => state.slides[state.activeSlide]?.elements.find((item) => item.id === state.activeElementId));
  const shape = element?.data.type === "shape" ? (element.data as ShapeData) : null;
  const value = shape?.color || SHAPE_DEFAULT_COLOR;

  return <SolidColorPalette value={value} onChange={(color) => {
    // Not just `{ color }`: an effect preset may have left a gradient behind,
    // and a gradient outranks the flat colour — so writing the colour alone
    // would appear to do nothing at all. See patchForSolidFill.
    if (activeElementId) updateElement(activeElementId, patchForSolidFill(color, shape?.effect));
  }} />;
}
