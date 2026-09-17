"use client";

import React from "react";
import useEditorStore, { FrameData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

/**
 * The frame's canvas toolbar, built like every other block's: it opens the
 * panels that already exist rather than duplicating their controls up here.
 */
const FrameEditTopBar: React.FC = () => {
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const setFrameEditElementId = useEditorUIStore((s) => s.setFrameEditElementId);

  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId,
  );
  const data =
    element && element.data.type === "frame" ? (element.data as FrameData) : null;

  const open = (panel: "ItemPositionPanel" | "FrameSettings") => {
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
          open("FrameSettings");
        }}
      >
        Frame
      </button>
      {data?.imageSrc && element && (
        <button
          type="button"
          className="kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm"
          // Only a way in. Leaving is clicking off the frame — the same gesture
          // that finishes every other in-place edit here — so a Done button
          // would be a second answer to a question already answered.
          onMouseDown={(event) => {
            event.preventDefault();
            setFrameEditElementId(element.id);
          }}
        >
          Adjust image
        </button>
      )}
    </div>
  );
};

export default FrameEditTopBar;
