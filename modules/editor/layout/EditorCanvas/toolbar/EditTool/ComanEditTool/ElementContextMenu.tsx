"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import useEditorStore from "@editor/store/editorStore";
import { beginStylePaste } from "@editor/lib/stylePasteMode";
import { KdPaintRollerIcon } from "@editor/lib/icon/icons";
import { ClipboardPaste, Copy, CopyPlus, Trash2 } from "lucide-react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ElementContextMenuProps {
  position: ContextMenuPosition | null;
  elementId: string;
  onClose: () => void;
}

const MENU_WIDTH = 200;
const MENU_HEIGHT = 216;
const VIEWPORT_MARGIN = 8;

const ElementContextMenu: React.FC<ElementContextMenuProps> = ({
  position,
  elementId,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Atomic selector: immer keeps untouched elements referentially stable, so
  // this only re-renders when *this* element changes — not on every store write.
  const element = useEditorStore((s) =>
    s.slides[s.activeSlide]?.elements.find((el) => el.id === elementId),
  );
  const deleteElement = useEditorStore((s) => s.deleteElement);
  const duplicateElement = useEditorStore((s) => s.duplicateElement);
  const copySelectedElements = useEditorStore((s) => s.copySelectedElements);
  const pasteElements = useEditorStore((s) => s.pasteElements);
  const hasClipboard = useEditorStore((s) =>
    Boolean(s.elementClipboard?.elements.length),
  );

 
  useEffect(() => {
    if (!position) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [position, onClose]);

  if (!position || !element) return null;

  
  const x = Math.min(position.x, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);
  const y = Math.min(position.y, window.innerHeight - MENU_HEIGHT - VIEWPORT_MARGIN);

  const items = [
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      icon: <Copy size={15} />,
      onClick: () => copySelectedElements(),
    },
    {
      label: "Copy style",
      shortcut: "Ctrl+Alt+C",
      icon: <KdPaintRollerIcon />,
      onClick: () => beginStylePaste(element.data),
    },
    {
      label: "Paste",
      shortcut: "Ctrl+V",
      icon: <ClipboardPaste size={15} />,
      onClick: () => pasteElements(),
      disabled: !hasClipboard,
    },
    {
      label: "Duplicate",
      shortcut: "Ctrl+D",
      icon: <CopyPlus size={15} />,
      onClick: () => duplicateElement(elementId),
    },
    {
      label: "Delete",
      shortcut: "Delete",
      icon: <Trash2 size={15} />,
      onClick: () => deleteElement(elementId),
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      data-element="true"
      className="kd-context-menu"
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 10000,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          disabled={item.disabled}
          className={`kd-context-menu-item${item.disabled ? " kd-context-menu-item-disabled" : ""}`}
          onClick={() => {
            if (item.disabled) return;
            item.onClick();
            onClose();
          }}
        >
          <span className="kd-context-menu-icon">{item.icon}</span>
          <span className="kd-context-menu-label">{item.label}</span>
          <span className="kd-context-menu-shortcut">{item.shortcut}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
};

export default ElementContextMenu;