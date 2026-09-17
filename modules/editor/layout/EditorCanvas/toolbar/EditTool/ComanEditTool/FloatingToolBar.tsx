"use client";
import React, {
  useEffect, useRef, useState,
  // useCallback
} from "react";
import { createPortal } from "react-dom";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { beginStylePaste } from "@editor/lib/stylePasteMode";
import { KdPaintRollerIcon } from "@editor/lib/icon/icons";

import { ClipboardPaste, Copy, CopyPlus,
    Trash2 } from "lucide-react";

interface ToolbarProps {
  target?: HTMLElement | null;
}

const FloatingToolBar: React.FC<ToolbarProps> = ({ target }) => {
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId
  );
  const selectedId = useEditorStore((s) => s.activeElementId);
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const duplicateElement = useEditorStore((s) => s.duplicateElement);
  const copySelectedElements = useEditorStore((s) => s.copySelectedElements);
  const pasteElements = useEditorStore((s) => s.pasteElements);
  const hasClipboard = useEditorStore((s) => Boolean(s.elementClipboard?.elements.length));
  const isCopyStyleMode = useEditorUIStore((s) => s.isCopyStyleMode);

  useEffect(() => {
    if (!target) return;
    let frame = 0;
    let lastTop = Number.NaN;
    let lastLeft = Number.NaN;
    const updatePos = () => {

      const rect = target.getBoundingClientRect();
      const top = rect.top - 60;
      const left = rect.left + rect.width / 2;

      if (top !== lastTop || left !== lastLeft) {
        lastTop = top;
        lastLeft = left;
        setPos({ top, left, visible: true });
      }
    };
    const tick = () => {
      updatePos();
      frame = requestAnimationFrame(tick);
    };
    updatePos();
    frame = requestAnimationFrame(tick);
    window.addEventListener("resize", updatePos);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePos);
    };
  }, [target]);



  if (!pos.visible || !element) return null;

  return createPortal(
    <div
      data-element="true"
      className="kd-text-toolbar flex items-center px-2 py-1.5 gap-1"
      style={{
        position: "fixed",
        zIndex: 10000,
        top: pos.top, left: pos.left,
        transform: "translateX(-50%)"
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >

      {/* Duplicate */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-icon-btn-main kd-tool-btn"
          ref={moreBtnRef}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Duplicate")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => selectedId && duplicateElement(selectedId)}
          >
          <CopyPlus size={16} />
          {showTooltip === "Duplicate" && (
            <span className="kd-tooltip-bottom">Duplicate</span>
          )}
        </button>
      </div>

      {/* Copy */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-icon-btn-main kd-tool-btn"
          ref={moreBtnRef}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Copy")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={copySelectedElements}
          >
          <Copy size={16} />
          {showTooltip === "Copy" && (
            <span className="kd-tooltip-bottom">Copy</span>
          )}
        </button>
      </div>

      {/* Paste */}
      <div className="kd-toolbar-section">
        <button
          disabled={!hasClipboard}
          className={`kd-tooltip-parent kd-icon-btn-main kd-tool-btn ${!hasClipboard ? "cursor-not-allowed opacity-40" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Paste")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={pasteElements}
          >
          <ClipboardPaste size={16} />
          {showTooltip === "Paste" && (
            <span className="kd-tooltip-bottom">Paste</span>
          )}
        </button>
      </div>

      {/* Copy Style */}
      <div className="kd-toolbar-section">
        <button
          className={`kd-tooltip-parent kd-icon-btn-main kd-tool-btn ${isCopyStyleMode ? "kd-icon-btn-main-active" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Copy Style")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => element && beginStylePaste(element.data)}
        >
          <KdPaintRollerIcon />
          {showTooltip === "Copy Style" && (
            <span className="kd-tooltip-bottom">Copy Style</span>
          )}
        </button>
      </div>

      {/* Delete */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-icon-btn-main kd-tool-btn"
          ref={moreBtnRef}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Delete")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => selectedId && deleteElement(selectedId)}
          >
          <Trash2 size={16} />
          {showTooltip === "Delete" && (
            <span className="kd-tooltip-bottom">Delete</span>
          )}
        </button>
      </div>


      {/* MORE */}
      {/* <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-icon-btn-main kd-tool-btn"
          ref={moreBtnRef}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("more")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => {
            setShowTextSetting((p) => !p);
            setShowTooltip(null);
          }}>
          <EllipsisVertical size={16} />
          {showTooltip === "more" && (
            <span className="kd-tooltip-bottom">More</span>
          )}
        </button>
      </div> */}

    {/* {showTextSetting && <TextEditSetting targetRef={moreBtnRef} />} */}
    </div>,
    document.body
  );
};

export default FloatingToolBar;
