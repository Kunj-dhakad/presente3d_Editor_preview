import type { ElementData } from "@editor/store/editorStore";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { styleClipboard } from "@editor/lib/styleClipboard";

export const beginStylePaste = (element: ElementData) => {
  styleClipboard.copyFromElement(element);
  const ui = useEditorUIStore.getState();
  ui.setCopiedStyleSourceType(element.type);
  ui.setStylePasteSourceSlide(useEditorStore.getState().activeSlide);
  ui.setIsCopyStyleMode(true);
};

export const cancelStylePaste = () => {
  const ui = useEditorUIStore.getState();
  ui.setIsCopyStyleMode(false);
  ui.setCopiedStyleSourceType(null);
  ui.setStylePasteSourceSlide(null);
};
