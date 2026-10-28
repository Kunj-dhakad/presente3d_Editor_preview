"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import useEditorStore from "@editor/store/editorStore";
import AddTextPanel from "@editor/blocks/Text/components/AddTextPanel";
import AddImagePanel from "@editor/blocks/Image/components/AddImagePanel";
import AddButtonPanel from "@editor/blocks/Button/components/AddButtonPanel";
import AddElementPanel from "./AddSection/Elements";
import AddVideoPanel from "@editor/blocks/Video/components/AddVideoPanel";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useIsNarrow } from "@editor/lib/ui/useBreakpoint";
import TemplateAddPanel from "./Template/TemplateAddPanel";
import WatermarkPanel from "@editor/blocks/Watermark/components";
import InteractionPanel from "@editor/blocks/Interaction/components";


const MAIN_PANEL_KEYS = [
  "text",
  "image",
  "AddButtonPanel",
  "AddElementPanel",
  "AddVideoPanel",
  "TemplateAddPanel",
  "WatermarkPanel",
  "AddInteractionsPanel",
];

const ToolPanel: React.FC<{ panel?: string | null }> = ({ panel }) => {
  const storeActive = useEditorStore((s) => s.activeRightPanel);
  const active = panel ?? storeActive;
  const setSiteBarCollapsed = useEditorUIStore((s) => s.setSiteBarCollapsed);
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  const setActivePanelType = useEditorUIStore((s) => s.setActivePanelType);
  const setLastMainPanel = useEditorUIStore((s) => s.setLastMainPanel);
  const isMainPanel = active && MAIN_PANEL_KEYS.includes(active);
  const setSidebarWidth = useEditorUIStore((s) => s.setSidebarWidth);

  const isNarrow = useIsNarrow();

  if (!isMainPanel) return null;
  return (
    <div className="kd-Assets-Panel-wrapper relative h-full flex flex-col">
      {!isNarrow && (
      <button
        type="button"
        onClick={() => {
          setSiteBarCollapsed(true);
          setSidebarWidth("closed");  
          setActiveRightPanel("");
          setActivePanelType(null);
          setLastMainPanel(null);
        }}
        style={{
          position: "absolute",
          top: "50%",
          right: "-20px",
          transform: "translateY(-50%)",
          zIndex: 50,
          width: "20px",
          height: "56px",
          borderRadius: "0 10px 10px 0",
          background: "var(--kd-bg-surface)",
          border: "1px solid var(--kd-border-subtle)",
          borderLeftWidth: 0,
          boxShadow: "3px 0 8px var(--kd-shadow-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--kd-text-muted)",
          fontSize: "12px",
          padding: 0,
        }}
      >
        <FontAwesomeIcon icon={faAngleLeft} />
      </button>
      )}

      <div className="flex-1 h-full">
        {active === "text" && <AddTextPanel />}
        {active === "image" && <AddImagePanel />}
        {active === "AddButtonPanel" && <AddButtonPanel />}
        {active === "AddElementPanel" && <AddElementPanel />}
        {active === "AddVideoPanel" && <AddVideoPanel />}
        {active === "TemplateAddPanel" && <TemplateAddPanel />}
        {active === "WatermarkPanel" && <WatermarkPanel />}
        {active === "AddInteractionsPanel" && <InteractionPanel />}
      </div>
    </div>
  );
};

export default ToolPanel;
