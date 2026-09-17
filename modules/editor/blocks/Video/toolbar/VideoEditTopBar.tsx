// "use client";
// import React, { useEffect, useRef, useState } from "react";
// import {
//   EllipsisVertical,
//   Link,
//   Repeat,
// } from "lucide-react";

// import useEditorStore, { ImageData } from "@editor/store/editorStore";
// import LinkEditBox from "@editor/blocks/shared/EditPopup/LinkEditBox";
// import ImageEditSetting from "./VideoEditSetting";
// interface ToolbarProps {
//   target: HTMLElement | null;
// }


// const VideoEditTopBar: React.FC<ToolbarProps> = ({ target }) => {
//   const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
//   const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
//   const moreBtnRef = useRef<HTMLButtonElement | null>(null);
//   const LinkBtnRef = useRef<HTMLButtonElement | null>(null);
//   const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
//   const activePanel = useEditorStore((s) => s.activeRightPanel);
//   const activeElementId = useEditorStore((s) => s.activeElementId);
//   const updateElement = useEditorStore((s) => s.updateElement);
//   const slides = useEditorStore((s) => s.slides);
//   const activeSlide = useEditorStore((s) => s.activeSlide);
//   const [activePopup, setActivePopup] = useState<
//     "none" | "Editsetting" | "link" | "ImageEffect"
//   >("none");
//   const element = slides[activeSlide]?.elements.find(
//     (el) => el.id === activeElementId
//   );

//   const Imageupdate = (patch: Partial<ImageData>) => {
//     if (!element || element.data.type !== "image") return;
//     updateElement(element.id, patch);
//   };

//   /* ===== POSITION ===== */
//   useEffect(() => {
//     if (!target) return;

//     const updatePos = () => {
//       const rect = target.getBoundingClientRect();
//       const top = rect.top > 70 ? rect.top - 60 : rect.bottom + 10;

//       setPos({
//         top,
//         left: rect.left + rect.width / 2,
//         visible: true,
//       });
//     };

//     updatePos();
//     window.addEventListener("scroll", updatePos, true);
//     window.addEventListener("resize", updatePos);

//     return () => {
//       window.removeEventListener("scroll", updatePos, true);
//       window.removeEventListener("resize", updatePos);
//     };
//   }, [target]);

//   if (!pos.visible || !element) return null;
//   const data = element.data as ImageData;

//   const handleReplace = () => {
//     setActiveRightPanel(
//       activePanel === "VideoReplacePanel" ? null : "VideoReplacePanel"
//     );
//   };
//   return (
//     <div
//       data-element="true"
//       className="
//         fixed z-100
//         kd-text-toolbar
//         flex items-center
//         px-2 py-1.5
//         gap-1
//       "
//     //   style={{
//     //     top: pos.top,
//     //     left: pos.left,
//     //     transform: "translateX(-50%)",
//     //   }}
//     >



//       {/* ===== STYLE ===== */}
//       <div className="kd-toolbar-section">
//         <button
//           className={`kd-tooltip-parent kd-tool-btn kd-icon-btn-main`}
//           onClick={() => {
//             handleReplace();
//             setShowTooltip(null);
//           }}

//           onMouseEnter={() => setShowTooltip("Replace")}
//           onMouseLeave={() => setShowTooltip(null)}
//         >
//           <Repeat size={16} />

//           {showTooltip === "Replace" && (
//             <span className="kd-tooltip-bottom">Replace</span>
//           )}
//         </button>

//       </div>
//       {/* ===== COLOR ===== */}
//       <div className="kd-toolbar-section">


//         <button className="kd-tooltip-parent kd-tool-btn kd-icon-btn-main"
//           ref={LinkBtnRef}
//           onClick={() => {
//             setActivePopup((prev) => (prev === "link" ? "none" : "link"));
//             setShowTooltip(null);
//           }}
//           onMouseEnter={() => setShowTooltip("Link")}
//           onMouseLeave={() => setShowTooltip(null)}
//         >
//           <Link size={16} />
//           {showTooltip === "Link" && (
//             <span className="kd-tooltip-bottom">Link</span>
//           )}

//         </button>
//       </div>

//       {/* ===== MORE ===== */}
//       <div className="kd-toolbar-section">
//         <button className="kd-tooltip-parent kd-tool-btn kd-icon-btn-main"
//           ref={moreBtnRef}
//           onClick={() => {
//             setActivePopup((prev) => (prev === "Editsetting" ? "none" : "Editsetting"));
//             setShowTooltip(null);
//           }}
//           onMouseEnter={() => setShowTooltip("More")}
//           onMouseLeave={() => setShowTooltip(null)}

//         >
//           <EllipsisVertical size={16} />
//           {showTooltip === "More" && (
//             <span className="kd-tooltip-bottom">More</span>
//           )}
//         </button>
//       </div>



//       {activePopup === "link" && (
//         <LinkEditBox
//           targetRef={LinkBtnRef}
//           data={data}
//           updateButton={Imageupdate}
//         />
//       )}
//       {activePopup === "Editsetting" && (
//         <ImageEditSetting
//           // target={target}
//           targetRef={moreBtnRef}
//         />


//       )}
//     </div>
//   );
// };

// export default VideoEditTopBar;







"use client";
import React, { useEffect, useRef, useState } from "react";
import { MdBlurOn } from "react-icons/md";
import useEditorStore, { VideoData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import LinkEditBox from "@editor/blocks/shared/EditPopup/LinkEditBox";
import VideoEditSetting from "./VideoEditSetting";
import ImageTransformPanel from "@editor/blocks/shared/EditPopup/TransformPanel";
import ImageStrokePanel from "@editor/blocks/shared/EditPopup/StrokePanel";
import FlipPanel from "@editor/blocks/shared/EditPopup/FlipPanel";
import OpacityPanel from "@editor/blocks/shared/EditPopup/OpacityPanel";
import BorderRadiusPanel from "@editor/blocks/shared/EditPopup/BorderRadiusPanel";
import {
  KdFlipIcon,
  KdGradBgIcon,
  KdLinkAddIcon,
  KdRadiusIcon,
  KdReloadIcon,
  KdStrokeIcon,
} from "@editor/lib/icon/icons";

interface ToolbarProps {
  target?: HTMLElement | null;
}

const VideoEditTopBar: React.FC<ToolbarProps> = ({ target }) => {
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const LinkBtnRef = useRef<HTMLButtonElement | null>(null);
  const flipBtnRef = useRef<HTMLButtonElement | null>(null);
  const transformBtnRef = useRef<HTMLButtonElement | null>(null);
  const strokeBtnRef = useRef<HTMLButtonElement | null>(null);
  const opacityBtnRef = useRef<HTMLButtonElement | null>(null);
  const borderRadiusBtnRef = useRef<HTMLButtonElement | null>(null);
  const alignBtnRef = useRef<HTMLButtonElement | null>(null);
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  // const activePanel = useEditorStore((s) => s.activeRightPanel);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const [activePopup, setActivePopup] = useState<
    | "none"
    | "Editsetting"
    | "link"
    | "transform"
    | "stroke"
    | "Flip"
    | "Opacity"
    | "borderRadius"
  >("none");
  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId
  );
  const Videoupdate = (patch: Partial<VideoData>) => {
    if (!element || element.data.type !== "video") return;
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
  const data = element.data as VideoData;

  // const handleReplace = () => {
  //   setActiveRightPanel(
  //     activePanel === "VideoReplacePanel" ? null : "VideoReplacePanel"
  //   );
  // };

  const iconBtn =
    "h-7.5 w-7.5 flex items-center justify-center rounded-md transition-all duration-150";

  return (
    <div
      data-element="true"
      data-copy-style-toolbar="true"
      className="kd-canvasheader-container h-10 mt-4 flex items-center justify-between px-1 py-1 rounded-lg"
    >
      <div className="flex items-center gap-1">

        {/* ===== REPLACE ===== */}
        <button
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => {setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Replace")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive)
              useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("VideoReplacePanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
        >
          <KdReloadIcon />
          {showTooltip === "Replace" && <span className="kd-tooltip-bottom">Replace</span>}
        </button>

        {/* ===== VIDEO EFFECT ===== */}
        {/* <button
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onMouseDown={(e) => {
            e.preventDefault();
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType   = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive)
              useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("VideoEffectsPanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            useEditorUIStore.getState().setSiteBarCollapsed(false);
          }}
          onMouseEnter={() => setShowTooltip("VideoEffect")}
          onMouseLeave={() => setShowTooltip(null)}
        >
        
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2m0 14v-2M8 9H2m14 0h-2M5.6 5.6l1.4 1.4M16.4 16.4l1.4 1.4M5.6 18.4l1.4-1.4M16.4 7.6l1.4-1.4"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          {showTooltip === "VideoEffect" && <span className="kd-tooltip-bottom">Video Effect</span>}
        </button> */}

        {/* ===== STROKE COLOR (right panel) ===== */}
        <button
          ref={alignBtnRef}
          disabled={!data.strokeWidth}
          className={`kd-tooltip-parent ${iconBtn} kd-canvasheader-button-all ${data.strokeWidth ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
          onMouseDown={(e) => {
            e.preventDefault();
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive)
              useEditorUIStore.getState().setLastMainPanel(currentActive);
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

        {/* ===== STROKE (popup) ===== */}
        <button
          ref={strokeBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "stroke" ? "none" : "stroke")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Stroke")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdStrokeIcon />
          {showTooltip === "Stroke" && <span className="kd-tooltip-bottom">Stroke & Border</span>}
        </button>

        {/* ===== BORDER RADIUS ===== */}
        <button
          ref={borderRadiusBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "borderRadius" ? "none" : "borderRadius")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("BorderRadius")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <KdRadiusIcon />
          {showTooltip === "BorderRadius" && <span className="kd-tooltip-bottom">Border Radius</span>}
        </button>

        {/* ===== FLIP ===== */}
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

        {/* ===== OPACITY ===== */}
        <button
          ref={opacityBtnRef}
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onClick={() => { setActivePopup((p) => (p === "Opacity" ? "none" : "Opacity")); setShowTooltip(null); }}
          onMouseEnter={() => setShowTooltip("Opacity")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <MdBlurOn />
          {showTooltip === "Opacity" && <span className="kd-tooltip-bottom">Opacity</span>}
        </button>

        {/* ===== LINK ===== */}
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

        {/* ===== POSITION (right panel) ===== */}
        <button
          ref={alignBtnRef}
          className="kd-tooltip-parent kd-canvasheader-button-all px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          onMouseDown={(e) => {
            e.preventDefault();
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive)
              useEditorUIStore.getState().setLastMainPanel(currentActive);
            setActiveRightPanel("ItemPositionPanel");
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
          onMouseEnter={() => setShowTooltip("Align")}
          onMouseLeave={() => setShowTooltip(null)}
        >
          position
          {showTooltip === "Align" && <span className="kd-tooltip-bottom">Alignment</span>}
        </button>


      </div>

      {/* ===== POPUPS ===== */}
      {activePopup === "link" && (
        <LinkEditBox
          targetRef={LinkBtnRef}
          data={data}
          updateButton={Videoupdate}
          onClose={() => setActivePopup("none")}
        />
      )}

      {activePopup === "Editsetting" && (
        <VideoEditSetting targetRef={moreBtnRef} />
      )}

      {activePopup === "transform" && (
        <ImageTransformPanel
          targetRef={transformBtnRef}
          onClose={() => setActivePopup("none")}
          data={data}
          updateButton={Videoupdate}
        />
      )}

      {activePopup === "Flip" && (
        <FlipPanel
          targetRef={flipBtnRef}
          onClose={() => setActivePopup("none")}
          data={data}
          updateButton={Videoupdate}
        />
      )}

      {activePopup === "stroke" && (
        <ImageStrokePanel
          targetRef={strokeBtnRef}
          onClose={() => setActivePopup("none")}
          data={data}
          updateButton={Videoupdate}
          midStyle={{ id: "semi-dashed", label: "Semi-dashed" }}
        />
      )}

      {activePopup === "Opacity" && (
        <OpacityPanel
          targetRef={opacityBtnRef}
          onClose={() => setActivePopup("none")}
          data={data}
          updateButton={Videoupdate}
        />
      )}

      {activePopup === "borderRadius" && (
        <BorderRadiusPanel
          targetRef={borderRadiusBtnRef}
          onClose={() => setActivePopup("none")}
          data={data}
          updateButton={Videoupdate}
        />
      )}
    </div>
  );
};

export default VideoEditTopBar;
