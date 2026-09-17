"use client";
import React, {
  useEffect, useRef, useState,
} from "react";
import useEditorStore from "@editor/store/editorStore";
import TextEditSetting from "./TextEditSetting";
import { Copy, EllipsisVertical, Trash2 } from "lucide-react";
;

interface ToolbarProps {
  target?: HTMLElement | null;
}


const FloatingTextToolbar: React.FC<ToolbarProps> = ({ target }) => {

  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const [showTextSetting, setShowTextSetting] = useState(false);


  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId
  );

  useEffect(() => {
    if (!target) return;
    const updatePos = () => {

      const rect = target.getBoundingClientRect();
      const containerRect = target.closest(".kd-slide")?.getBoundingClientRect();

      if (!containerRect) return;

      const top = rect.top - containerRect.top - 60;
      const left = rect.left - containerRect.left + rect.width / 2;

      setPos({ top, left, visible: true });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [target]);



  if (!pos.visible || !element) return null;

  return (
    <div
      data-element="true"
      className="absolute z-100 kd-text-toolbar flex items-center px-2 py-1.5 gap-1"
      style={{
        top: pos.top, left: pos.left,
        transform: "translateX(-50%)"
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >

      {/* Delete */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-icon-btn-main kd-tool-btn"
          ref={moreBtnRef}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Delete")}
          onMouseLeave={() => setShowTooltip(null)}>
          <Trash2 size={16} />
          {showTooltip === "Delete" && (
            <span className="kd-tooltip-bottom">Delete</span>
          )}
        </button>
      </div>

      {/* Dublicate */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-icon-btn-main kd-tool-btn"
          ref={moreBtnRef}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setShowTooltip("Dublicate")}
          onMouseLeave={() => setShowTooltip(null)}>
          <Copy size={16} />
          {showTooltip === "Dublicate" && (
            <span className="kd-tooltip-bottom">Dublicate</span>
          )}
        </button>
      </div>


      {/* MORE */}
      <div className="kd-toolbar-section">
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
      </div>

      {showTextSetting && <TextEditSetting targetRef={moreBtnRef} />}
    </div>
  );
};

export default FloatingTextToolbar;