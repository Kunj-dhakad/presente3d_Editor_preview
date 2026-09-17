"use client";
import React, { useEffect, useState } from "react";
import useEditorStore, { TextData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import {
  KdGradBgIcon,
  KdTextColorIcon,
  KdTextBoldIcon,
  KdTextItalicIcon,
  KdTextEditMinus,
  KdTextEditPlus,
} from "@editor/lib/icon/icons";

const isBold = (weight: TextData["fontWeight"]) => weight === 700 || weight === "700" || weight === "bold";

const IndexFormattingToolbar: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  const pendingTextColor = useEditorUIStore((s) => s.pendingTextColor);
  const setPendingTextColor = useEditorUIStore((s) => s.setPendingTextColor);

  const element = slides[activeSlide]?.elements.find((el) => el.id === activeElementId);

  // TextColorPanel writes into the shared pendingTextColor slot; for the
  // index (no contentEditable target) it just becomes a direct data patch.
  useEffect(() => {
    if (!pendingTextColor || !activeElementId) return;
    updateElement(activeElementId, { color: pendingTextColor });
    setPendingTextColor(null);
  }, [pendingTextColor, activeElementId, updateElement, setPendingTextColor]);

  if (!element || element.data.type !== "text" || element.data.bookRole !== "index") return null;
  const data = element.data as TextData;

  const openPanel = (panel: string) => {
    const currentActive = useEditorStore.getState().activeRightPanel;
    const currentType = useEditorUIStore.getState().activePanelType;
    if (currentType === "main" && currentActive) useEditorUIStore.getState().setLastMainPanel(currentActive);
    setActiveRightPanel(panel);
    useEditorUIStore.getState().setActivePanelType("edit");
    if (useEditorUIStore.getState().sidebarWidth === "closed") {
      useEditorUIStore.getState().setSidebarWidth("edit");
    }
  };

  const patch = (p: Partial<TextData>) => {
    if (!activeElementId) return;
    updateElement(activeElementId, p, { history: true });
  };

  const iconBtn = "h-7.5 w-7.5 flex items-center justify-center rounded-md transition-all duration-150";

  return (
    <div data-copy-style-toolbar="true" className="kd-canvasheader-container h-10 mt-4 flex items-center justify-between px-1 py-1 rounded-lg">
      <div className="flex items-center gap-1">
        {/* Font Family */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            openPanel("FontFamilyPanel");
          }}
          title={data.fontFamily || "Plus Jakarta Sans"}
          className="kd-canvasheader-fontfamily-button rounded-md cursor-pointer transition-all duration-200"
        >
          <span className="kd-canvasheader-fontfamily-label">
            {data.fontFamily || "Plus Jakarta Sans"}
          </span>
        </button>

        {/* Font Size */}
        <button type="button" className="kd-canvasheader-fontsize-button p-0.5 flex items-center justify-between rounded-md text-sm">
          <span
            className="cursor-pointer px-2 h-full flex items-center"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => patch({ fontSize: Math.max(6, (Number(data.fontSize) || 14) - 1) })}
          >
            <KdTextEditMinus />
          </span>
          {/* Fixed box: a 3-digit size must not widen the button and shove the
              rest of the toolbar sideways. */}
          <span className="kd-text-fontsize-value w-10 shrink-0 min-w-0 overflow-hidden tabular-nums flex items-center justify-center text-center">
            {data.fontSize || 14}
          </span>
          <span
            className="cursor-pointer px-2 h-full flex items-center"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => patch({ fontSize: (Number(data.fontSize) || 14) + 1 })}
          >
            <KdTextEditPlus />
          </span>
        </button>

        {/* Background */}
        <button
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onMouseEnter={() => setShowTooltip("bg")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            openPanel("TextBgColorPanel");
          }}
        >
          <KdGradBgIcon />
          {showTooltip === "bg" && <span className="kd-tooltip-bottom">Background</span>}
        </button>

        {/* Text Color */}
        <button
          className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all`}
          onMouseEnter={() => setShowTooltip("color")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            openPanel("TextColorPanel");
          }}
        >
          <KdTextColorIcon />
          {showTooltip === "color" && <span className="kd-tooltip-bottom">Text color</span>}
        </button>

        {/* Bold */}
        <button
          type="button"
          className={`${iconBtn} cursor-pointer kd-canvasheader-button-all kd-tooltip-parent ${isBold(data.fontWeight) ? "kd-icon-btn-main-active" : ""}`}
          onMouseEnter={() => setShowTooltip("bold")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            patch({ fontWeight: isBold(data.fontWeight) ? 400 : 700 });
            setShowTooltip(null);
          }}
        >
          <KdTextBoldIcon />
          {showTooltip === "bold" && <span className="kd-tooltip-bottom">Bold</span>}
        </button>

        {/* Italic */}
        <button
          type="button"
          className={`${iconBtn} cursor-pointer kd-canvasheader-button-all kd-tooltip-parent ${data.fontStyle === "italic" ? "kd-icon-btn-main-active" : ""}`}
          onMouseEnter={() => setShowTooltip("italic")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            patch({ fontStyle: data.fontStyle === "italic" ? "normal" : "italic" });
            setShowTooltip(null);
          }}
        >
          <KdTextItalicIcon />
          {showTooltip === "italic" && <span className="kd-tooltip-bottom">Italic</span>}
        </button>

        {/* Position */}
        <button
          type="button"
          className="kd-tooltip-parent kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          onMouseEnter={() => setShowTooltip("position")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            openPanel("ItemPositionPanel");
          }}
        >
          <span>Position</span>
          {showTooltip === "position" && <span className="kd-tooltip-bottom">Position</span>}
        </button>

        {/* Index Design & Settings */}
        <button
          type="button"
          className="kd-tooltip-parent kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          onMouseEnter={() => setShowTooltip("indexDesign")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(e) => {
            e.preventDefault();
            openPanel("IndexSettingsPanel");
          }}
        >
          <span>Index Design</span>
          {showTooltip === "indexDesign" && <span className="kd-tooltip-bottom">Index Design & Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default IndexFormattingToolbar;
