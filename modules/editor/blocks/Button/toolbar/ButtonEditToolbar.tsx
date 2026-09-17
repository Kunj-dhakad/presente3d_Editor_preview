"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  EllipsisVertical,
  Link,
  Palette,
  RectangleHorizontal,
} from "lucide-react";

import useEditorStore, { ButtonData } from "@editor/store/editorStore";
import ButtonEditSetting from "./ButtonEditSetting";
import { BRAND } from "@shared/brand";
// import LinkEditBox from "./linkEditBox";
// import ColorEditBox from "./ColorEditBox";
interface ToolbarProps {
  target: HTMLElement | null;
}


const ButtonEditToolbar: React.FC<ToolbarProps> = ({ target }) => {

  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const LinkBtnRef = useRef<HTMLButtonElement | null>(null);


  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  // const [showTextSetting, setShowTextSetting] = useState(false);
  // const [showLLinkEditBox, setShowLLinkEditBox] = useState(false);
  // const [showColorEditBox, setColorEditBox] = useState(false);
  const [activePopup, setActivePopup] = useState<
    "none" | "text" | "link" | "color"
  >("none");
  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId
  );

  const updateButton = (patch: Partial<ButtonData>) => {
    if (!element || element.data.type !== "button") return;
    updateElement(element.id, patch);
  };

  /* ===== POSITION ===== */
  useEffect(() => {
    if (!target) return;

    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      const top = rect.top > 70 ? rect.top - 70 : rect.bottom + 10;

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
  const data = element.data as ButtonData;

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

      {/* <div className="kd-toolbar-section">
        <button
          className="kd-icon-btn-main kd-tool-btn"
          onClick={() => updateButton({ fontSize: (data.fontSize || 30) - 1 })}
        >
          <FontAwesomeIcon className="text-sm" icon={faMinus} />
        </button>

        <div className="kd-toolbar-counter">
          {data.fontSize || 30}
        </div>

        <button
          className="kd-icon-btn-main kd-tool-btn"
          onClick={() => updateButton({ fontSize: (data.fontSize || 30) + 1 })}
        >
          <FontAwesomeIcon className="text-sm" icon={faPlus} />
        </button>
      </div> */}

      {/* ===== STYLE ===== */}
      <div className="kd-toolbar-section">
        <button
          className={`kd-tooltip-parent kd-tool-btn  kd-icon-btn-main ${data.backgroundColor === "transparent"
            ? ""
            : "kd-tool-btn-active"
            }`}
          onMouseEnter={() => setShowTooltip("Background")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => {
            updateButton({
              backgroundColor:
                data.backgroundColor === "transparent"
                  ? BRAND.accent
                  : "transparent",
            });
            setShowTooltip(null);
          }}
        >
          <RectangleHorizontal size={16} />
          {showTooltip === "Background" && (
            <span className="kd-tooltip-bottom">Background</span>
          )}
        </button>


        <button
          className={`kd-tooltip-parent kd-tool-btn  kd-icon-btn-main ${data.borderWidth && data.borderWidth > 0
            ? "kd-tool-btn-active"
            : ""
            }`}
          onMouseEnter={() => setShowTooltip("Border")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => {
            updateButton({
              borderWidth: data.borderWidth ? 0 : 2,
              borderColor: data.borderWidth ? "" : BRAND.accent,
            });
            setShowTooltip(null);
          }
          }
        >
          <RectangleHorizontal size={16} />
          {showTooltip === "Border" && (
            <span className="kd-tooltip-bottom">Border</span>
          )}
        </button>

      </div>
      {/* ===== COLOR ===== */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-tool-btn   kd-icon-btn-main p-1"
          onMouseEnter={() => setShowTooltip("Background Color")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => setShowTooltip(null)}
        >
          <input
            type="color"
            value={data.color || "#000000"}
            onChange={(e) => updateButton({ backgroundColor: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer"
          />
          {showTooltip === "Background Color" && (
            <span className="kd-tooltip-bottom">Background Color</span>
          )}
        </button>


        <button className="kd-tooltip-parent kd-tool-btn  kd-icon-btn-main"
          ref={LinkBtnRef}
          onMouseEnter={() => setShowTooltip("Link")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => {
            setActivePopup((prev) => (prev === "link" ? "none" : "link"));
            setShowTooltip(null);
          }}

        >
          <Link size={16} />
          {showTooltip === "Link" && (
            <span className="kd-tooltip-bottom">Link</span>
          )}
        </button>

        <button className="kd-tooltip-parent kd-tool-btn  kd-icon-btn-main"
          ref={LinkBtnRef}
          onMouseEnter={() => setShowTooltip("All Color")}
          onMouseLeave={() => setShowTooltip(null)}
          // onClick={() => setShowTextSetting((prev) => !prev)}
          onClick={() => {
            setActivePopup((prev) => (prev === "color" ? "none" : "color"));
            setShowTooltip(null);
          }}

        >

          <Palette size={16} />
          {showTooltip === "All Color" && (
            <span className="kd-tooltip-bottom">All Color</span>
          )}
        </button>

      </div>

      {/* ===== MORE ===== */}
      <div className="kd-toolbar-section">
        <button className="kd-tooltip-parent kd-tool-btn  kd-icon-btn-main"
          ref={moreBtnRef}
          onMouseEnter={() => setShowTooltip("More")}
          onMouseLeave={() => setShowTooltip(null)}
          // onClick={() => setShowTextSetting((prev) => !prev)}
          onClick={() => {
            setActivePopup((prev) => (prev === "text" ? "none" : "text"));
            setShowTooltip(null);
          }}

        >
          <EllipsisVertical size={16} />
          {showTooltip === "More" && (
            <span className="kd-tooltip-bottom">More</span>
          )}
        </button>
      </div>
      {/* {activePopup === "color" && (
        <ColorEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={updateButton}
        />
      )} */}

      {/* {activePopup === "link" && (
        <LinkEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={updateButton}
        />
      )} */}

      {activePopup === "text" && (
        <ButtonEditSetting targetRef={moreBtnRef} />
      )}
      {/* {showColorEditBox && (
        <ColorEditBox targetRef={LinkBtnRef}
          data={data}
          updateButton={updateButton} />
      )}

      {showLLinkEditBox && (
        <LinkEditBox targetRef={LinkBtnRef}
          data={data}
          updateButton={updateButton} />
      )}

      {showTextSetting && (
        <ButtonEditSetting targetRef={moreBtnRef} />
      )} */}

    </div>
  );
};

export default ButtonEditToolbar;
