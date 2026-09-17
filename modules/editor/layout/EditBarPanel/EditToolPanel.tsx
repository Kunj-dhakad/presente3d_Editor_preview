// "use client";
// import React, { useCallback, useEffect } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faXmark } from "@fortawesome/free-solid-svg-icons";
// import useEditorStore from "@editor/store/editorStore";
// import useEditorUIStore from "@editor/store/useEditorUIStore";
// import CanvasBgBar from "./EditToolBar/CanvasSetting/CanvasBgBar";
// import FontFamilyPanel from "@editor/blocks/Text/sidebar/FontFamilyPanel";
// import ItemPostionPanel from "./EditToolBar/Coman/ItemPostionPanel";
// import TextBgColorPanel from "@editor/blocks/Text/sidebar/TextBgColorPanel";
// import ImageCrop from "@editor/blocks/Image/sidebar/panels/ImageCropePanel";
// import ImageEffectsPanel from "@editor/blocks/Image/sidebar/panels/ImageEffectsPanel";
// import ImageStrokeColorPanel from "@editor/blocks/Image/sidebar/panels/ImageStrokeColorPanel";
// import AskAiPanel from "./EditToolBar/CanvasSetting/AskAiPanel";
// import ShapeBgColorPanel from "@editor/blocks/Shape/sidebar/ShapeBgColorPanel";
// import BtnBorderColor from "@editor/blocks/Button/sidebar/BtnBorderColor";
// import BtnMoreSetting from "@editor/blocks/Button/sidebar/BtnMoreSetting";
// import ButtonEditBGColor from "@editor/blocks/Button/sidebar/ButtonEditBGColor";
// import VideoReplacePanel from "@editor/blocks/Video/sidebar/VideoReplacePanel";
// import ImageReplacePanel from "@editor/blocks/Image/sidebar/ImageReplacePanel";
// import TextColorPanel from "@editor/blocks/Text/sidebar/TextColorPanel";
// import TableSettings from "@editor/blocks/Table/sidebar/TableSettings";
// import ChartSettings from "@editor/blocks/Chart/sidebar/ChartSettings";

// // EDIT PANEL KEYS
// const EDIT_PANEL_KEYS = [
//   "TextColorPanel", "CanvasBgBar", "FontFamilyPanel", "ItemPositionPanel", "TextBgColorPanel", "ImageCrop", "ImageEffectsPanel"
//   , "ImageStrokeColorPanel", "AskAiPanel", "BtnMoreSetting",
//   "ShapeBkgColorPanel", "BtnBorderColor", "ButtonEditBGColor", "VideoReplacePanel", "imageReplacePanel", "TableSettings", "ChartSettings"];
// const EDIT_PANEL_TITLES: Record<string, string> = {
//   TextColorPanel: "Text Color",
//   TextBgColorPanel: "Text Background",
//   CanvasBgBar: "Canvas Background",
//   FontFamilyPanel: "Font Family",
//   ItemPositionPanel: "Position",

//   ImageCrop: "Crop Image",
//   ImageEffectsPanel: "Image Effects",
//   ImageStrokeColorPanel: "Stroke Color",
//   AskAiPanel: "Ask AI",

//   // Button
//   BtnMoreSetting: "Button Settings",
//   BtnBorderColor: "Button Border Color",
//   ButtonEditBGColor: "Button Background",

//   // Shape
//   ShapeBkgColorPanel: "Shape Background",

//   // Media
//   VideoReplacePanel: "Replace Video",
//   imageReplacePanel: "Replace Image",
//   TableSettings: "Table Settings",
//   ChartSettings: "Chart Settings",
// };

// const PANEL_TYPES: Record<string, string[]> = {
//   TextColorPanel: ["text"],
//   TextBgColorPanel: ["text"],
//   FontFamilyPanel: ["text"],
//   ImageCrop: ["image"],
//   ImageEffectsPanel: ["image", "video"],
//   ImageStrokeColorPanel: ["image", "shape", "svg", "video"],
//   imageReplacePanel: ["image"],
//   VideoReplacePanel: ["video"],
//   BtnMoreSetting: ["button"],
//   BtnBorderColor: ["button"],
//   ButtonEditBGColor: ["button"],
//   ShapeBkgColorPanel: ["shape"],
//   ItemPositionPanel: ["text", "image", "shape", "svg", "button", "video", "watermark", "table"],
//   TableSettings: ["table"],
//   ChartSettings: ["chart"],
// };

// const CANVAS_LEVEL_PANELS = ["CanvasBgBar", "AskAiPanel"];
// const EditToolPanel: React.FC = () => {
//   const active = useEditorStore((s) => s.activeRightPanel);
//   const slides = useEditorStore((s) => s.slides);
//   const activeSlide = useEditorStore((s) => s.activeSlide);
//   const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
//   const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
//   const setActivePanelType = useEditorUIStore((s) => s.setActivePanelType);
//   const isEditPanel = active && EDIT_PANEL_KEYS.includes(active);
//   const selectedElements = (slides[activeSlide]?.elements ?? []).filter((el) => selectedElementIds.includes(el.id));
//   const selectedTypes = Array.from(new Set(selectedElements.map((el) => el.data.type)));
//   const isMixedSelection = selectedElementIds.length > 1 && selectedTypes.length > 1;
//   const sameType = selectedTypes[0];
//   const panelTypes = active ? PANEL_TYPES[active] : undefined;
//   const isPanelAllowedForSelection =
//     selectedElementIds.length <= 1 ||
//     (!isMixedSelection && sameType && (!panelTypes || panelTypes.includes(sameType)));
//   const setSidebarWidth = useEditorUIStore((s) => s.setSidebarWidth);
//   const closeEditPanel = useCallback(() => {
//     const mainPanel = useEditorUIStore.getState().lastMainPanel;
//     const restoredPanel = mainPanel || "text";
//     setActiveRightPanel(restoredPanel);
//     setActivePanelType("main");
//     setSidebarWidth("main");
//   }, [setActiveRightPanel, setActivePanelType, setSidebarWidth]);
//   useEffect(() => {
//     const requiresElementSelection = active && !CANVAS_LEVEL_PANELS.includes(active);
//     if (isEditPanel && requiresElementSelection && selectedElementIds.length === 0) {
//       closeEditPanel();
//     }
//   }, [active, closeEditPanel, isEditPanel, selectedElementIds.length]);

//   if (!isEditPanel) return null;

//   if (isMixedSelection || !isPanelAllowedForSelection) return null;

//   return (
//     <div
//       className="relative kd-toolPanel-container h-full flex flex-col"
//     >

//       <div className=" flex items-center justify-between px-4 py-2">
//         <h2 className="kd-toolPanel-heding-text">
//           {EDIT_PANEL_TITLES[active] ?? ""}
//         </h2>
//         <button
//           type="button"
//           onClick={closeEditPanel}
//           className="kd-fg-subtle kd-hv-fg-muted transition-colors"
//         >
//           <FontAwesomeIcon icon={faXmark} />
//         </button>
//       </div>
//       <div className="kd-toolPanel-hr-devide-border mb-1 mx-2" />

//       {/* Content */}
//       <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain kd-custom-scrollbar">
//         {active === "CanvasBgBar" && <CanvasBgBar />}
//         {active === "FontFamilyPanel" && <FontFamilyPanel />}
//         {active === "ItemPositionPanel" && <ItemPostionPanel />}
//         {active === "ImageCrop" && <ImageCrop />}
//         {active === "ImageEffectsPanel" && <ImageEffectsPanel />}
//         {active === "ImageStrokeColorPanel" && <ImageStrokeColorPanel />}
//         {active === "AskAiPanel" && <AskAiPanel />}
//         {active === "BtnMoreSetting" && <BtnMoreSetting />}
//         {active === "ShapeBkgColorPanel" && <ShapeBgColorPanel />}
//         {active === "VideoReplacePanel" && <VideoReplacePanel />}
//         {active === "imageReplacePanel" && <ImageReplacePanel />}
//         {active === "BtnBorderColor" && <BtnBorderColor />}
//         {active === "ButtonEditBGColor" && <ButtonEditBGColor />}
//         {active === "TextColorPanel" && <TextColorPanel />}
//         {active === "TextBgColorPanel" && <TextBgColorPanel />}
//         {active === "TableSettings" && <TableSettings />}
//         {active === "ChartSettings" && <ChartSettings />}
//       </div>
//     </div> 
//   );
// };

// export default EditToolPanel;
"use client";
import React, { useCallback, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import useEditorStore from "@editor/store/editorStore";
import CanvasBgBar from "./EditToolBar/CanvasSetting/CanvasBgBar";
import FontFamilyPanel from "@editor/blocks/Text/sidebar/FontFamilyPanel";
import ItemPostionPanel from "./EditToolBar/Coman/ItemPostionPanel";
import TextBgColorPanel from "@editor/blocks/Text/sidebar/TextBgColorPanel";
import ImageCrop from "@editor/blocks/Image/sidebar/panels/ImageCropePanel";
import { closeEditPanel as closeEditPanelAction } from "@editor/lib/ui/editPanel";
import ImageEffectsPanel from "@editor/blocks/Image/sidebar/panels/ImageEffectsPanel";
import ImageStrokeColorPanel from "@editor/blocks/Image/sidebar/panels/ImageStrokeColorPanel";
import AskAiPanel from "./EditToolBar/CanvasSetting/AskAiPanel";
import ShapeBgColorPanel from "@editor/blocks/Shape/sidebar/ShapeBgColorPanel";
import ShapeEffectsPanel from "@editor/blocks/Shape/sidebar/ShapeEffectsPanel";
import BtnBorderColor from "@editor/blocks/Button/sidebar/BtnBorderColor";
import BtnMoreSetting from "@editor/blocks/Button/sidebar/BtnMoreSetting";
import InteractionSettings from "@editor/blocks/Interaction/sidebar/InteractionSettings";
import ButtonEditBGColor from "@editor/blocks/Button/sidebar/ButtonEditBGColor";
import VideoReplacePanel from "@editor/blocks/Video/sidebar/VideoReplacePanel";
import ImageReplacePanel from "@editor/blocks/Image/sidebar/ImageReplacePanel";
import TextColorPanel from "@editor/blocks/Text/sidebar/TextColorPanel";
import TableSettings from "@editor/blocks/Table/sidebar/TableSettings";
import ChartSettings from "@editor/blocks/Chart/sidebar/ChartSettings";
import IndexSettingsPanel from "@editor/blocks/Index/sidebar/IndexSettingsPanel";
import FrameSettings from "@editor/blocks/Frame/sidebar/FrameSettings";
import QRCodeSettings from "@editor/blocks/QRCode/sidebar/QRCodeSettings";

// EDIT PANEL KEYS
const EDIT_PANEL_KEYS = [
  "TextColorPanel", "CanvasBgBar", "FontFamilyPanel", "ItemPositionPanel", "TextBgColorPanel", "ImageCrop", "ImageEffectsPanel"
  , "ImageStrokeColorPanel", "AskAiPanel", "BtnMoreSetting", "InteractionSettings",
  "ShapeBkgColorPanel", "ShapeEffectsPanel", "BtnBorderColor", "ButtonEditBGColor", "VideoReplacePanel", "imageReplacePanel", "TableSettings", "ChartSettings", "IndexSettingsPanel", "FrameSettings", "QRCodeSettings"];
const EDIT_PANEL_TITLES: Record<string, string> = {
  TextColorPanel: "Text Color",
  TextBgColorPanel: "Text Background",
  CanvasBgBar: "Canvas Background",
  FontFamilyPanel: "Font Family",
  ItemPositionPanel: "Position",
  IndexSettingsPanel: "Index Design & Settings",

  ImageCrop: "Crop Image",
  ImageEffectsPanel: "Image Effects",
  ImageStrokeColorPanel: "Stroke Color",
  AskAiPanel: "Ask AI",

  // Button
  BtnMoreSetting: "Button Settings",
  InteractionSettings: "Interaction Settings",
  BtnBorderColor: "Button Border Color",
  ButtonEditBGColor: "Button Background",

  // Shape
  ShapeBkgColorPanel: "Shape Background",
  ShapeEffectsPanel: "Shape Effects",

  // Media
  VideoReplacePanel: "Replace Video",
  imageReplacePanel: "Replace Image",
  TableSettings: "Table Settings",
  ChartSettings: "Chart Settings",
  FrameSettings: "Frame",
  QRCodeSettings: "QR Code",
};

const PANEL_TYPES: Record<string, string[]> = {
  TextColorPanel: ["text"],
  TextBgColorPanel: ["text"],
  FontFamilyPanel: ["text"],
  ImageCrop: ["image"],
  ImageEffectsPanel: ["image", "video"],
  ImageStrokeColorPanel: ["image", "shape", "svg", "video"],
  imageReplacePanel: ["image"],
  VideoReplacePanel: ["video"],
  BtnMoreSetting: ["button"],
  InteractionSettings: ["interaction"],
  BtnBorderColor: ["button"],
  ButtonEditBGColor: ["button"],
  ShapeBkgColorPanel: ["shape"],
  ShapeEffectsPanel: ["shape"],
  ItemPositionPanel: ["text", "image", "shape", "svg", "button", "interaction", "video", "watermark", "table", "frame", "qr-code"],
  TableSettings: ["table"],
  ChartSettings: ["chart"],
  IndexSettingsPanel: ["text"],
  FrameSettings: ["frame"],
  QRCodeSettings: ["qr-code"],
};

const CANVAS_LEVEL_PANELS = ["CanvasBgBar", "AskAiPanel"];
const EditToolPanel: React.FC = () => {
  const active = useEditorStore((s) => s.activeRightPanel);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const isEditPanel = active && EDIT_PANEL_KEYS.includes(active);
  const selectedElements = (slides[activeSlide]?.elements ?? []).filter((el) => selectedElementIds.includes(el.id));
  const selectedTypes = Array.from(new Set(selectedElements.map((el) => el.data.type)));
  const isMixedSelection = selectedElementIds.length > 1 && selectedTypes.length > 1;
  const sameType = selectedTypes[0];
  const panelTypes = active ? PANEL_TYPES[active] : undefined;
  // An edit panel is tied to a specific element type. Previously this check
  // only ran for multi-selection, leaving (for example) Table Settings open
  // after selecting a text element. TableSettings correctly returned `null`
  // for that text element, but its shell remained as an empty panel.
  const isPanelAllowedForSelection =
    !panelTypes ||
    (!isMixedSelection && Boolean(sameType) && panelTypes.includes(sameType));
  const closeEditPanel = useCallback(() => closeEditPanelAction(), []);
  useEffect(() => {
    const requiresElementSelection = active && !CANVAS_LEVEL_PANELS.includes(active);
    if (
      isEditPanel &&
      requiresElementSelection &&
      (selectedElementIds.length === 0 || !isPanelAllowedForSelection)
    ) {
      closeEditPanel();
    }
  }, [
    active,
    closeEditPanel,
    isEditPanel,
    isPanelAllowedForSelection,
    selectedElementIds.length,
  ]);

  if (!isEditPanel) return null;

  if (isMixedSelection || !isPanelAllowedForSelection) return null;

  return (
    <div
      className="relative kd-toolPanel-container h-full flex flex-col"
    >

      <div className=" flex items-center justify-between px-4 py-2">
        <h2 className="kd-toolPanel-heding-text">
          {EDIT_PANEL_TITLES[active] ?? ""}
        </h2>
        <button
          type="button"
          onClick={closeEditPanel}
          className="kd-fg-subtle kd-hv-fg-muted transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <div className="kd-toolPanel-hr-devide-border mb-1 mx-2" />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain kd-custom-scrollbar">
        {active === "CanvasBgBar" && <CanvasBgBar />}
        {active === "FontFamilyPanel" && <FontFamilyPanel />}
        {active === "ItemPositionPanel" && <ItemPostionPanel />}
        {active === "ImageCrop" && <ImageCrop />}
        {active === "ImageEffectsPanel" && <ImageEffectsPanel />}
        {active === "ImageStrokeColorPanel" && <ImageStrokeColorPanel />}
        {active === "AskAiPanel" && <AskAiPanel />}
        {active === "BtnMoreSetting" && <BtnMoreSetting />}
        {active === "InteractionSettings" && <InteractionSettings />}
        {active === "ShapeBkgColorPanel" && <ShapeBgColorPanel />}
        {active === "ShapeEffectsPanel" && <ShapeEffectsPanel />}
        {active === "VideoReplacePanel" && <VideoReplacePanel />}
        {active === "imageReplacePanel" && <ImageReplacePanel />}
        {active === "BtnBorderColor" && <BtnBorderColor />}
        {active === "ButtonEditBGColor" && <ButtonEditBGColor />}
        {active === "TextColorPanel" && <TextColorPanel />}
        {active === "TextBgColorPanel" && <TextBgColorPanel />}
        {active === "TableSettings" && <TableSettings />}
        {active === "ChartSettings" && <ChartSettings />}
        {active === "FrameSettings" && <FrameSettings />}
        {active === "QRCodeSettings" && <QRCodeSettings />}
        {active === "IndexSettingsPanel" && <IndexSettingsPanel />}
      </div>
    </div> 
  );
};

export default EditToolPanel;
