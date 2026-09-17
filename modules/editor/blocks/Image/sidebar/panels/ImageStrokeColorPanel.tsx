"use client";

import useEditorStore from "@editor/store/editorStore";
import SolidColorPalette from "@editor/blocks/shared/SolidColorPalette";

export default function ImageStrokeColorPanel() {
  const activeElementId = useEditorStore((state) => state.activeElementId);
  const updateElement = useEditorStore((state) => state.updateElement);
  const element = useEditorStore((state) => state.slides[state.activeSlide]?.elements.find((item) => item.id === state.activeElementId));
  const value = element?.data.type === "shape" || element?.data.type === "image" || element?.data.type === "video" || element?.data.type === "svg" ? element.data.strokeColor ?? "#000000" : "#000000";

  return <SolidColorPalette value={value} onChange={(strokeColor) => {
    if (activeElementId) updateElement(activeElementId, { strokeColor });
  }} onRemove={() => {
    if (activeElementId) updateElement(activeElementId, { strokeColor: undefined });
  }} />;
}
