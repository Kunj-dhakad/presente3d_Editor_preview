"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  EllipsisVertical,
  Link,
  Repeat,
} from "lucide-react";

import useEditorStore from "@editor/store/editorStore";
// import LinkEditBox from "./linkEditBox";
import ImageEditSetting from "./VideoEditSetting";
interface ToolbarProps {
  target: HTMLElement | null;
}


const VideoEditToolbar: React.FC<ToolbarProps> = ({ target }) => {
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const LinkBtnRef = useRef<HTMLButtonElement | null>(null);
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  const activePanel = useEditorStore((s) => s.activeRightPanel);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  // const updateElement = useEditorStore((s) => s.updateElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const [activePopup, setActivePopup] = useState<
    "none" | "Editsetting" | "link" | "ImageEffect"
  >("none");
  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId
  );

  // const Imageupdate = (patch: Partial<ImageData>) => {
  //   if (!element || element.data.type !== "image") return;
  //   updateElement(element.id, patch);
  // };

  /* ===== POSITION ===== */
  useEffect(() => {
    if (!target) return;

    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      const top = rect.top > 70 ? rect.top - 60 : rect.bottom + 10;

      setPos({
        top,
        left: rect.left + rect.width / 2,
        visible: true,
      });
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
  // const data = element.data as ImageData;

  const handleReplace = () => {
    setActiveRightPanel(
      activePanel === "VideoReplacePanel" ? null : "VideoReplacePanel"
    );
  };
  return (
    <div
      data-element="true"
      className="
        fixed z-100
        kd-text-toolbar
        flex items-center
        px-2 py-1.5
        gap-1
      "
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
      }}
    >



      {/* ===== STYLE ===== */}
      <div className="kd-toolbar-section">
        <button
          className={`kd-tooltip-parent kd-tool-btn kd-icon-btn-main`}
          onClick={() => {
            handleReplace();
            setShowTooltip(null);
          }}

          onMouseEnter={() => setShowTooltip("Replace")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <Repeat size={16} />

          {showTooltip === "Replace" && (
            <span className="kd-tooltip-bottom">Replace</span>
          )}
        </button>

      </div>
      {/* ===== COLOR ===== */}
      <div className="kd-toolbar-section">


        <button className="kd-tooltip-parent kd-tool-btn kd-icon-btn-main"
          ref={LinkBtnRef}
          onClick={() => {
            setActivePopup((prev) => (prev === "link" ? "none" : "link"));
            setShowTooltip(null);
          }}
          onMouseEnter={() => setShowTooltip("Link")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <Link size={16} />
          {showTooltip === "Link" && (
            <span className="kd-tooltip-bottom">Link</span>
          )}

        </button>
      </div>

      {/* ===== MORE ===== */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-tool-btn kd-icon-btn-main"
          ref={moreBtnRef}
          onClick={() => {
            setActivePopup((prev) => (prev === "Editsetting" ? "none" : "Editsetting"));
            setShowTooltip(null);
          }}
          onMouseEnter={() => setShowTooltip("More")}
          onMouseLeave={() => setShowTooltip(null)}

        >
          <EllipsisVertical size={16} />
          {showTooltip === "More" && (
            <span className="kd-tooltip-bottom">More</span>
          )}
        </button>
      </div>



      {/* {activePopup === "link" && (
        <LinkEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={Imageupdate}
        />
      )} */}
      {activePopup === "Editsetting" && (
        <ImageEditSetting
          // target={target}
          targetRef={moreBtnRef}
        />


      )}
    </div>
  );
};

export default VideoEditToolbar;
