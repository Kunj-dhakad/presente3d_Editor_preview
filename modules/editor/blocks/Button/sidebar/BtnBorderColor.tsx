"use client";

import useEditorStore from "@editor/store/editorStore";
import SolidColorPalette from "@editor/blocks/shared/SolidColorPalette";

export default function BtnBorderColor() {
  const activeElementId = useEditorStore((state) => state.activeElementId);
  const updateElement = useEditorStore((state) => state.updateElement);
  const element = useEditorStore((state) => state.slides[state.activeSlide]?.elements.find((item) => item.id === state.activeElementId));
  const value = element?.data.type === "button" ? element.data.borderColor ?? "#000000" : "#000000";

  return <SolidColorPalette value={value} onChange={(borderColor) => {
    if (activeElementId) updateElement(activeElementId, { borderColor });
  }} onRemove={() => {
    if (activeElementId) updateElement(activeElementId, { borderColor: undefined });
  }} />;
}
