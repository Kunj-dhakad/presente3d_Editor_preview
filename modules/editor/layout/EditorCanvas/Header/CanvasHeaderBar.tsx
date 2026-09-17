"use client";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { KdGradBgIcon } from "@editor/lib/icon/icons";
import { Sparkles } from "lucide-react";
const CanvasHeaderBar: React.FC = () => {
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);

  return (
    <div>
      <div
        data-copy-style-toolbar="true"
        className="kd-canvasheader-container h-10 mt-4 flex items-center justify-between px-1 py-1 rounded-lg"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive) {
              useEditorUIStore.getState().setLastMainPanel(currentActive);
            }
            setActiveRightPanel("AskAiPanel");
            // Opened from the header (not from an on-canvas element), so the
            // panel should reserve its own space and push the canvas over —
            // same as the left Navbar panels — instead of floating on top of
            // it. Without this, editOpenedFromHidden stayed true (its default),
            // the panel rendered as an absolute overlay that reserves no flex
            // width, and the canvas centered across the whole editor area
            // instead of the space actually left free next to the panel.
            useEditorUIStore.getState().setSiteBarCollapsed(false);
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full kd-hv-bg-sunken cursor-pointer transition-all"
        >
          <Sparkles size={16} className="kd-fg-accent" />
          <span className="text-sm font-medium kd-fg">Ask AI</span>
        </div>

        <div className="w-px h-5 kd-bg-hover mx-1" />

        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const currentActive = useEditorStore.getState().activeRightPanel;
            const currentType = useEditorUIStore.getState().activePanelType;
            if (currentType === "main" && currentActive) {
              useEditorUIStore.getState().setLastMainPanel(currentActive);
            }
            setActiveRightPanel("CanvasBgBar");
            useEditorUIStore.getState().setSiteBarCollapsed(false);
            useEditorUIStore.getState().setActivePanelType("edit");
            if (useEditorUIStore.getState().sidebarWidth === "closed") {
              useEditorUIStore.getState().setSidebarWidth("edit");
            }
          }}
          className="flex items-center px-3 py-1.5 rounded-full kd-hv-bg-sunken cursor-pointer"
        >
          <KdGradBgIcon />
        </div>
      </div>
    </div>
  );
};

export default CanvasHeaderBar;
