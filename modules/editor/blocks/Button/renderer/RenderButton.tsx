import React, { useState, memo, useCallback, useRef } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, { ButtonData, ElementData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useBookOptional } from "@editor/layout/header/EditorPreview/context/BookStateContext";
import { openElementLink } from "@editor/lib/reader/elementLink";
import { styleClipboard } from "@editor/lib/styleClipboard";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  soft: "0 2px 8px rgba(0,0,0,0.15)",
  regular: "0 4px 12px rgba(0,0,0,0.25)",
  retro: "3px 3px 0 rgba(0,0,0,0.8)",
};

const RenderButton: React.FC<{
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
}> = memo(({ id, data, slideIndex, clipBounds }) => {
  const btnData = data as ButtonData;

  const { updateElement, setActiveElementId, setActiveSlide, toggleSelectedElementId } = useEditorStore(
    useShallow((s) => ({
      updateElement: s.updateElement,
      setActiveElementId: s.setActiveElementId,
      setActiveSlide: s.setActiveSlide,
      toggleSelectedElementId: s.toggleSelectedElementId,
    }))
  );

  const isSelected = useEditorStore(
    useCallback((s) => s.selectedElementIds.includes(id), [id])
  );

  const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
  const book = useBookOptional();
  const lastLinkRef = useRef(0);
  // const [targetEl, setTargetEl] = useState<HTMLDivElement | null>(null);
  const editingRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const wasSelectedAtDownRef = useRef(false);
  const { contextMenuPos, handleContextMenu, closeContextMenu } =
    useElementContextMenu(id, slideIndex);

  const syncWidthToText = useCallback(() => {
    const el = editingRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      const currentText = el.innerText || btnData.text;
      const span = document.createElement("span");
      span.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-size: ${btnData.fontSize}px;
        font-family: ${btnData.fontFamily};
        font-weight: ${btnData.fontWeight};
      `;
      span.innerText = currentText;
      document.body.appendChild(span);
      const textWidth = span.offsetWidth;
      document.body.removeChild(span);

      const borderWidth = (btnData.borderWidth || 2) * 2;
      const padding = 32;
      const newWidth = Math.max(textWidth + padding + borderWidth, 80);

      updateElement(id, { width: newWidth });
    });
  }, [id, updateElement, btnData.fontSize, btnData.fontFamily, btnData.fontWeight, btnData.borderWidth, btnData.text]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      updateElement(
        id,
        {
          text: e.currentTarget.innerText,
          height: e.currentTarget.scrollHeight + 4,
        },
        { history: true }
      );
      setEditing(false);
    },
    [id, updateElement]
  );

  const handleSelect = useCallback((e: React.PointerEvent) => {
    // Handle Copy Style Mode
    const isCopyStyleMode = useEditorUIStore.getState().isCopyStyleMode;
    if (isCopyStyleMode) {
      const copiedStyle = styleClipboard.getClipboardContent();
      if (copiedStyle) {
        const { applyCopiedStyle } = useEditorStore.getState();
        applyCopiedStyle([id], copiedStyle);
        
        // Exit Copy Style Mode
        const { setIsCopyStyleMode, setCopiedStyleSourceType } = useEditorUIStore.getState();
        setIsCopyStyleMode(false);
        setCopiedStyleSourceType(null);
      }
      return;
    }
    
    wasSelectedAtDownRef.current = isSelected;
    setActiveSlide(slideIndex);
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      toggleSelectedElementId(id);
      setEditing(false);
      return;
    }
    if (!isSelected) {
      setActiveElementId(id);
      setEditing(false);
    }
  }, [id, isSelected, setActiveElementId, setActiveSlide, slideIndex, toggleSelectedElementId]);

  const handleBodyClick = useCallback(() => {
    if (wasSelectedAtDownRef.current) {
      setEditing(true);
      requestAnimationFrame(() => editingRef.current?.focus());
    }
  }, []);

  /**
   * Following the button's link belongs to the reader — in the editor a click
   * still selects and edits the button.
   */
  const followLink = useCallback(() => {
    if (!imageExportMode) return;
    // The drag layer and the element can both report the same click; without
    // this guard a link opened twice.
    const now = Date.now();
    if (now - lastLinkRef.current < 400) return;
    lastLinkRef.current = now;
    openElementLink((data as ButtonData).link, book);
  }, [imageExportMode, data, book]);

  if (data.type !== "button") return null;

  const hasLink = !!btnData.link?.trim();

  const getButtonStyles = (): React.CSSProperties => {
    const hasGradient = !!(btnData.gradientFrom && btnData.gradientTo);
    const gradDir =
      btnData.gradientDirection === "vertical"
        ? "to bottom"
        : btnData.gradientDirection === "horizontal"
          ? "to right"
          : "135deg";

    const shadowVal = SHADOW_MAP[btnData.shadowPreset ?? "none"];

    return {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent:
        btnData.textAlign === "left"
          ? "flex-start"
          : btnData.textAlign === "right"
            ? "flex-end"
            : "center",
      gap: 6,
      padding: "0 16px",
      boxSizing: "border-box",
      overflow: "hidden",
      whiteSpace: "nowrap",
      background: hasGradient
        ? `linear-gradient(${gradDir}, ${btnData.gradientFrom}, ${btnData.gradientTo})`
        : (btnData.backgroundColor ?? "transparent"),
      border: (btnData.borderWidth ?? btnData.strokeWidth)
        ? `${btnData.borderWidth ?? btnData.strokeWidth}px ${btnData.strokeStyle ?? "solid"} ${btnData.borderColor ?? "#000"}`
        : undefined,
      borderRadius: btnData.borderRadius ?? 0,
      outline: "none",
      boxShadow: shadowVal,
      opacity: btnData.opacity ?? 1,
      fontSize: btnData.fontSize ?? 14,
      fontFamily: btnData.fontFamily ?? "Inter",
      fontWeight: btnData.fontWeight ?? 400,
      color: btnData.textColor ?? "#ffffff",
      fontStyle: btnData.fontStyle ?? "normal",
      textDecoration: btnData.textDecorationLine ?? "none",
      textTransform: btnData.textTransform ?? "none",
      letterSpacing: btnData.letterSpacing ? `${btnData.letterSpacing}px` : undefined,
      cursor: editing ? "text" : "move",
      transition: "all 0.2s ease",
    };
  };

  return (
    <>
    <CanvasDragDrop
      id={id}
      rect={{
        x: btnData.x,
        y: btnData.y,
        width: btnData.width,
        height: btnData.height,
        rotation: btnData.rotation ?? 0,
      }}
      isSelected={isSelected}
      imageExportMode={imageExportMode}
      clipBounds={clipBounds}
      // onContainerChange={setTargetEl}
      onContextMenu={handleContextMenu}
      onSelect={handleSelect}
      onElementClick={handleBodyClick}
      onChange={(r) =>
        updateElement(
          id,
          {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            rotation: r.rotation,
          },
          { history: true }
        )
      }
    >
      <div
        style={{ width: "100%", height: "100%" }}
        // In the reader the flipbook turns the page on mousedown, before a
        // bubble-phase handler here would ever run — so the gesture has to be
        // claimed in the capture phase.
        onMouseDownCapture={(event) => {
          if (imageExportMode && hasLink) event.stopPropagation();
        }}
        onClickCapture={(event) => {
          if (imageExportMode && hasLink) event.stopPropagation();
        }}
        onClick={followLink}
      >
        <div
          ref={editingRef}
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onInput={syncWidthToText}
          style={{
            ...getButtonStyles(),
            cursor: imageExportMode && hasLink ? "pointer" : undefined,
          }}
        >
          {!editing && btnData.icon && btnData.iconPosition === "left" && (
            <span style={{ pointerEvents: "none" }}>{btnData.icon}</span>
          )}
          <span>{btnData.text}</span>
          {!editing && btnData.icon && btnData.iconPosition !== "left" && (
            <span style={{ pointerEvents: "none" }}>{btnData.icon}</span>
          )}
        </div>
      </div>
    </CanvasDragDrop>
    {isSelected && contextMenuPos && (
      <ElementContextMenu
        position={contextMenuPos}
        elementId={id}
        onClose={closeContextMenu}
      />
    )}
    </>
  );
}, (p, n) => {
  const a = p.data as ButtonData, b = n.data as ButtonData;
  return (
    p.id === n.id &&
    p.slideIndex === n.slideIndex &&
    p.clipBounds?.width === n.clipBounds?.width &&
    p.clipBounds?.height === n.clipBounds?.height &&
    a.x === b.x && a.y === b.y &&
    a.width === b.width && a.height === b.height &&
    a.rotation === b.rotation &&
    a.text === b.text &&
    a.fontSize === b.fontSize &&
    a.fontFamily === b.fontFamily &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.textColor === b.textColor &&
    a.backgroundColor === b.backgroundColor &&
    a.gradientFrom === b.gradientFrom &&
    a.gradientTo === b.gradientTo &&
    a.gradientDirection === b.gradientDirection &&
    a.borderRadius === b.borderRadius &&
    a.strokeWidth === b.strokeWidth &&
    a.strokeStyle === b.strokeStyle &&
    a.borderColor === b.borderColor &&
    a.shadowPreset === b.shadowPreset &&
    a.opacity === b.opacity &&
    a.link === b.link &&
    a.textAlign === b.textAlign &&
    a.textDecorationLine === b.textDecorationLine &&
    a.textTransform === b.textTransform &&
    a.letterSpacing === b.letterSpacing &&
    a.icon === b.icon &&
    a.iconPosition === b.iconPosition
  );
});

RenderButton.displayName = "RenderButton";
export default RenderButton;
