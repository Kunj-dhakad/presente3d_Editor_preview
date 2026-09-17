"use client";
import React, { useEffect, useRef, useState } from "react";
import useEditorStore, { ButtonData } from "@editor/store/editorStore";
import ButtonEditSetting from "./ButtonEditSetting";
import LinkEditBox from "@editor/blocks/shared/EditPopup/LinkEditBox";
import ColorEditBox from "./ColorEditBox";
import { KdEditToolBorderIcon, KdGradBgIcon, KdLinkAddIcon, KdStrokeIcon, KdTextEditMinus, KdTextEditPlus } from "@editor/lib/icon/icons";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import ImageStrokePanel from "@editor/blocks/shared/EditPopup/StrokePanel";
interface ToolbarProps {
  target: HTMLElement | null;
}
const ButtonEditTopBar: React.FC<ToolbarProps> = ({ target }) => {
  const alignBtnRef = useRef<HTMLButtonElement | null>(null);
  const strokeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const LinkBtnRef = useRef<HTMLButtonElement | null>(null);
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const [activePopup, setActivePopup] = useState<
    "none" | "text" | "link" | "color" | "StrokeColor"
    | "borderRadius" | "stroke"
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
  const iconBtn = "h-7.5 w-7.5 flex items-center justify-center rounded-md transition-all duration-150";
  return (
    <div
      data-element="true"
      data-copy-style-toolbar="true"
      className="kd-canvasheader-container h-10 mt-4 flex items-center justify-between px-1 py-1 rounded-lg"
    >
      <div className="flex items-center gap-1">
        <button
          type="button" className="kd-canvasheader-fontsize-button w-24 flex items-center gap-2 px-3 py-1 rounded-md text-sm"
        >
          <span className="cursor-pointer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateButton({ fontSize: (data.fontSize || 30) - 1 })}
          >
            <KdTextEditMinus />
          </span>

          <span className="px-2 w-10 kd-text-fontsize-value"> {data.fontSize || 30}</span>
          <span className="cursor-pointer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateButton({ fontSize: (data.fontSize || 30) + 1 })}>
            <KdTextEditPlus />
          </span>
        </button>

        <button
          ref={alignBtnRef}
          disabled={(data.borderWidth ?? data.strokeWidth ?? 0) <= 0}
          className={`kd-tooltip-parent ${iconBtn} kd-canvasheader-button-all ${(data.borderWidth ?? data.strokeWidth ?? 0) > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.toString().length > 0 && target && target.contains(sel.anchorNode)) {
              useEditorUIStore.getState().setSavedTextRange(sel.getRangeAt(0).cloneRange());
            } else {
              useEditorUIStore.getState().setSavedTextRange(null);
            }
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive) useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("BtnBorderColor");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
          onMouseEnter={() => setShowTooltip("StrokeColor")}
          onMouseLeave={() => setShowTooltip(null)}

        >
          <KdEditToolBorderIcon />
          {showTooltip === "StrokeColor" && <span className="kd-tooltip-bottom">Stroke Color</span>}
        </button>

        {/* Stroke */}
        <button
          ref={strokeBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "stroke" ? "none" : "stroke")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Stroke")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {showTooltip === "Stroke" && <span className="kd-tooltip-bottom">Stroke & Border</span>}

          <KdStrokeIcon />
        </button>
        {/* ===== COLOR ===== */}

        <button
          className={` kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onMouseEnter={() => setShowTooltip("Background Color")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.toString().length > 0 && target && target.contains(sel.anchorNode)) {
              useEditorUIStore.getState().setSavedTextRange(sel.getRangeAt(0).cloneRange());
            } else {
              useEditorUIStore.getState().setSavedTextRange(null);
            }
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive) useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("ButtonEditBGColor");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
        >
          <KdGradBgIcon />
          {showTooltip === "Background Color" && (
            <span className="kd-tooltip-bottom">Background Color</span>
          )}
        </button>


        <button
          className={` kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          ref={LinkBtnRef}
          onMouseEnter={() => setShowTooltip("Link")}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => {
            setActivePopup((prev) => (prev === "link" ? "none" : "link"));
            setShowTooltip(null);
          }}

        >
          <KdLinkAddIcon />
          {showTooltip === "Link" && (
            <span className="kd-tooltip-bottom">Link</span>
          )}
        </button>

        {/* Position */}
        <button
          type="button"
          className="kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.toString().length > 0 && target && target.contains(sel.anchorNode)) {
              useEditorUIStore.getState().setSavedTextRange(sel.getRangeAt(0).cloneRange());
            } else {
              useEditorUIStore.getState().setSavedTextRange(null);
            }
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive) useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("ItemPositionPanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}

        >
          <span>Position</span>
        </button>


        {/* Position */}
        <button
          type="button"
          className={` kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onMouseDown={(e) => {
            e.preventDefault();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.toString().length > 0 && target && target.contains(sel.anchorNode)) {
              useEditorUIStore.getState().setSavedTextRange(sel.getRangeAt(0).cloneRange());
            } else {
              useEditorUIStore.getState().setSavedTextRange(null);
            }
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive) useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("BtnMoreSetting");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}

        >
          <HiOutlineDotsHorizontal />
        </button>

      </div>

      {activePopup === "color" && (
        <ColorEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={updateButton}
          onClose={() => setActivePopup("none")}
        />
      )}

      {activePopup === "link" && (
        <LinkEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={updateButton}
          onClose={() => setActivePopup("none")}
        />
      )}
      {activePopup === "stroke" && (
        <ImageStrokePanel targetRef={strokeBtnRef}
          onClose={() => setActivePopup("none")} data={data}
          updateButton={updateButton} widthKey="borderWidth" />
      )}

      {activePopup === "text" && (
        <ButtonEditSetting targetRef={moreBtnRef} />
      )}

    </div>
  );
};

export default ButtonEditTopBar;
