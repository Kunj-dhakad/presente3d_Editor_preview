"use client";

import { useState } from "react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { beginStylePaste } from "@editor/lib/stylePasteMode";
import { KdPaintRollerIcon } from "@editor/lib/icon/icons";

const CopyStyleTopAction = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const isCopyStyleMode = useEditorUIStore((s) => s.isCopyStyleMode);

  const element = slides[activeSlide]?.elements.find((item) => item.id === activeElementId);
  const isDisabled = !element;

  const handleCopyStyle = () => {
    if (!element) return;
    beginStylePaste(element.data);
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-label="Copy Style"
      className={`kd-tooltip-parent h-7.5 w-7.5 flex items-center justify-center rounded-md transition-all duration-150 kd-canvasheader-button-all ${
        isCopyStyleMode ? "kd-icon-btn-main-active" : ""
      } ${isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={handleCopyStyle}
    >
      <KdPaintRollerIcon />
      {showTooltip && (
        <span className="kd-tooltip-bottom">
          Copy Style{isCopyStyleMode ? " (Active)" : ""}
        </span>
      )}
    </button>
  );
};

export default CopyStyleTopAction;
