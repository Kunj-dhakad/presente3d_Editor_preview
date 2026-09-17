"use client";
import React, { useEffect, useRef, useState } from "react";
import { MdBlurOn } from "react-icons/md";
import ImageTransformPanel from "@editor/blocks/shared/EditPopup/TransformPanel";
import ImageStrokePanel from "@editor/blocks/shared/EditPopup/StrokePanel";;
import useEditorStore, { ImageData } from "@editor/store/editorStore";
import LinkEditBox from "@editor/blocks/shared/EditPopup/LinkEditBox";
import ImageEditSetting from "./ImageEditSetting";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import FlipPanel from "@editor/blocks/shared/EditPopup/FlipPanel";
import OpacityPanel from "@editor/blocks/shared/EditPopup/OpacityPanel";
import BorderRadiusPanel from "@editor/blocks/shared/EditPopup/BorderRadiusPanel";
import { KdCropIcon, KdFlipIcon, KdGradBgIcon, KdLinkAddIcon, KdMagicWandIcon, KdRadiusIcon, KdReloadIcon, KdStrokeIcon, KdUndoIcon } from "@editor/lib/icon/icons";
import CopyStyleTopAction from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/CopyStyleTopAction";

interface ToolbarProps {
  target?: HTMLElement | null;
}
const ImageEditPanel: React.FC<ToolbarProps> = ({ target }) => {
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const { setBgRemovingElementId } = useEditorUIStore();
  // â”€â”€ Refs for every button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const flipBtnRef = useRef<HTMLButtonElement | null>(null);
  const LinkBtnRef = useRef<HTMLButtonElement | null>(null);
  const ImageEffectRef = useRef<HTMLButtonElement | null>(null);
  const transformBtnRef = useRef<HTMLButtonElement | null>(null);
  const strokeBtnRef = useRef<HTMLButtonElement | null>(null);
  const cropBtnRef = useRef<HTMLButtonElement | null>(null);
  const alignBtnRef = useRef<HTMLButtonElement | null>(null);
  const opacityBtnRef = useRef<HTMLButtonElement | null>(null);
  const borderRadiusBtnRef = useRef<HTMLButtonElement | null>(null);
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  // const activePanel = useEditorStore((s) => s.activeRightPanel);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const bgRemovingElementId = useEditorUIStore((s) => s.bgRemovingElementId);
  const isBgRemoving = bgRemovingElementId !== null;
  const [activePopup, setActivePopup] = useState<
    | "none"
    | "Editsetting"
    | "link"
    | "ImageEffect"
    | "transform"
    | "stroke"
    | "crop"
    | "alignment"
    | "Opacity"
    | "Flip"
    | "StrokeColor"
    | "borderRadius"
  >("none");

  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId
  );

  const Imageupdate = (patch: Partial<ImageData>) => {
    if (!element || element.data.type !== "image") return;
    updateElement(element.id, patch);
  };

  /* ===== POSITION ===== */
  useEffect(() => {
    if (!target) return;
    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      const top = rect.top > 70 ? rect.top - 60 : rect.bottom + 10;
      setPos({ top, left: rect.left + rect.width / 2, visible: true });
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
  const data = element.data as ImageData;

 
  const pollResult = async (fetchUrl: string): Promise<string> => {
    const res = await fetch('/api/ImageBgRemovefetch-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fetchUrl }),
    });
    const result = await res.json();

    if (result.status === 'success' && result.output?.[0]) {
      return result.output[0];
    }

    if (result.status === 'processing') {
      await new Promise(r => setTimeout(r, 3000));
      return pollResult(fetchUrl);
    }

    throw new Error('BG removal failed');
  };

  const ImageBgRemove = async () => {
    try {

      setBgRemovingElementId(element.id);
      const res = await fetch('/api/imageBgRemove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSrc: data.src }),
      });

      const result = await res.json();

      let finalUrl: string;

      if (result.status === 'success' && result.output?.[0]) {
        finalUrl = result.output[0];
      } else if (result.status === 'processing') {
        finalUrl = await pollResult(result.fetch_result);
      } else {
        throw new Error('Unexpected response');
      }

      Imageupdate({ src: finalUrl });

    } catch (err) {
      console.error('BG Remove error:', err);
    } finally {
      setBgRemovingElementId(null);
    }
  };


  const iconBtn = "h-7.5 w-7.5 flex items-center justify-center rounded-md transition-all duration-150";
  return (
    <div
      data-element="true"
      data-copy-style-toolbar="true"
      className="kd-canvasheader-container h-10 mt-4 flex items-center justify-between px-1 py-1 rounded-lg"
    >
      <div className="flex items-center gap-1">

        {/* ===== REPLACE ===== */}
        <button
          // className=" kd-tool-btn kd-icon-btn-main"
          className={` kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Replace")}
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
            setActiveRightPanel("imageReplacePanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}

        >
          <KdReloadIcon />
          {showTooltip === "Replace" && <span className="kd-tooltip-bottom">Replace</span>}
        </button>
        {/* Background Remover*/}
        <button
          className="kd-tooltip-parent kd-canvasheader-button-all px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          disabled={isBgRemoving}
          onClick={() => { ImageBgRemove() }}
          style={{
            opacity: isBgRemoving ? 0.5 : 1,
            cursor: isBgRemoving ? "not-allowed" : "pointer"
          }}
        >
          BG Remover
        </button>
        {/* Image Effect */}
        <button
          ref={ImageEffectRef}
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
            setActiveRightPanel("ImageEffectsPanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}



          onMouseEnter={() => setShowTooltip("Image Effect")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdMagicWandIcon />
          {showTooltip === "Image Effect" && <span className="kd-tooltip-bottom">Image Effect</span>}
        </button>
        {/*Stroke border color */}
        <button
          ref={alignBtnRef}
          // className="kd-tooltip-parent kd-icon-btn-main"
          disabled={!data.strokeWidth}
          className={`kd-tooltip-parent ${iconBtn} kd-canvasheader-button-all ${data.strokeWidth ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
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
            setActiveRightPanel("ImageStrokeColorPanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
          onMouseEnter={() => setShowTooltip("StrokeColor")}
          onMouseLeave={() => setShowTooltip(null)}

        >

          <KdGradBgIcon />
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

        {/* Border Radius */}
        <button
          ref={borderRadiusBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "borderRadius" ? "none" : "borderRadius")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("BorderRadius")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {showTooltip === "BorderRadius" && <span className="kd-tooltip-bottom">Border Radius</span>}

          <KdRadiusIcon />

        </button>

        {/* Transform */}
        <button
          ref={transformBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "transform" ? "none" : "transform")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Transform")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdUndoIcon />
          {showTooltip === "Transform" && <span className="kd-tooltip-bottom">Transform</span>}
        </button>

        {/* Flip */}
        <button
          ref={flipBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "Flip" ? "none" : "Flip")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Flip")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdFlipIcon />
          {showTooltip === "Flip" && <span className="kd-tooltip-bottom">Flip</span>}
        </button>

        {/* Opacity */}
        <button
          ref={opacityBtnRef}
          // className="kd-tooltip-parent kd-tool-btn kd-icon-btn-main"
          className={` kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "Opacity" ? "none" : "Opacity")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Opacity")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <MdBlurOn />
          {showTooltip === "Opacity" && <span className="kd-tooltip-bottom">Opacity</span>}
        </button>

        {/* Link */}
        <button
          ref={LinkBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "link" ? "none" : "link")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Link")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdLinkAddIcon />
          {showTooltip === "Link" && <span className="kd-tooltip-bottom">Link</span>}
        </button>

        {/* Crop */}
        <button
          ref={cropBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
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
            setActiveRightPanel("ImageCrop");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
            useEditorUIStore.getState().setCropElementId(activeElementId);
          }}

          onMouseEnter={() => setShowTooltip("Crop")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdCropIcon />
          {showTooltip === "Crop" && <span className="kd-tooltip-bottom">Crop Ratio</span>}
        </button>

        {/* Alignment */}
        <button
          ref={alignBtnRef}
          // className=" kd-icon-btn-main"
          className="kd-tooltip-parent kd-canvasheader-button-all px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
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


          onMouseEnter={() => setShowTooltip("Align")}
          onMouseLeave={() => setShowTooltip(null)}

        >
          {/* <AlignLeft size={16} /> */}
          position
          {showTooltip === "Align" && <span className="kd-tooltip-bottom">Alignment</span>}
        </button>

        <CopyStyleTopAction />
      </div>
      {activePopup === "link" && (
        <LinkEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={Imageupdate}
          onClose={() => setActivePopup("none")}
        />
      )}

      {activePopup === "Editsetting" && (
        <ImageEditSetting targetRef={moreBtnRef} />
      )}

      {activePopup === "transform" && (
        <ImageTransformPanel targetRef={transformBtnRef} onClose={() => setActivePopup("none")} data={data} updateButton={Imageupdate} />
      )}

      {activePopup === "Flip" && (
        <FlipPanel targetRef={flipBtnRef} onClose={() => setActivePopup("none")} data={data} updateButton={Imageupdate} />
      )}


      {activePopup === "stroke" && (
        <ImageStrokePanel targetRef={strokeBtnRef} onClose={() => setActivePopup("none")} data={data} updateButton={Imageupdate} />
      )}


      {activePopup === "Opacity" && (
        <OpacityPanel targetRef={opacityBtnRef} onClose={() => setActivePopup("none")} data={data} updateButton={Imageupdate} />
      )}
      {activePopup === "borderRadius" && (
        <BorderRadiusPanel targetRef={borderRadiusBtnRef} onClose={() => setActivePopup("none")} data={data} updateButton={Imageupdate} />
      )}

    </div>
  );
};

export default ImageEditPanel;
