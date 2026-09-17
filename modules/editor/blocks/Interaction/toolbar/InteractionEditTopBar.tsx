"use client";

import React from "react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

const InteractionEditTopBar: React.FC = () => {
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  const open = (panel: "ItemPositionPanel" | "InteractionSettings") => {
    setActiveRightPanel(panel);
    useEditorUIStore.getState().setActivePanelType("edit");
    if (useEditorUIStore.getState().sidebarWidth === "closed")
      useEditorUIStore.getState().setSidebarWidth("edit");
  };
  return (
    <div
      data-element="true"
      className="kd-canvasheader-container h-10 mt-4 flex items-center gap-1 px-1 py-1 rounded-lg"
    >
      <button
        type="button"
        className="kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm"
        onMouseDown={(event) => {
          event.preventDefault();
          open("ItemPositionPanel");
        }}
      >
        Position
      </button>
      <button
        type="button"
        className="kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm"
        onMouseDown={(event) => {
          event.preventDefault();
          open("InteractionSettings");
        }}
      >
        Interaction settings
      </button>
    </div>
  );
};

export default InteractionEditTopBar;
