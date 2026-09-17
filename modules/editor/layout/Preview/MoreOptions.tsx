"use client";
import React, { useEffect, useState, useRef } from "react";
import useEditorStore from "@editor/store/editorStore";
import { BadgePlus, Copy, Trash2 } from "lucide-react";

interface MoreOptionsProps {
  targetRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  slideId: string;
}

const MoreOptions: React.FC<MoreOptionsProps> = ({ targetRef, onClose, slideId }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const menuRef = useRef<HTMLDivElement>(null);

  const addSlide = useEditorStore((s) => s.addSlide);
  const deleteSlide = useEditorStore((s) => s.deleteSlide);
  const duplicateSlide = useEditorStore((s) => s.duplicateSlide);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      const menuWidth = 150;
      const menuHeight = menuRef.current?.offsetHeight || 120;
      const padding = 20;

      let left = rect.right + padding;
      let top = rect.top - 10;

      if (left + menuWidth > window.innerWidth) {
        left = rect.left - menuWidth - padding;
      }

      if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight - padding;
      }

      if (top < padding) {
        top = padding;
      }

      setPos({
        top,
        left,
        visible: true,
      });
    };

    updatePos();

    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);

    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [targetRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        targetRef.current?.contains(e.target as Node)
      ) return;
      onClose();
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose, targetRef]);
  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);
  if (!pos.visible) return null;

  return (
    <div
      ref={menuRef}
      // This menu is portaled to <body>, but in the React tree it still sits
      // inside the thumbnail card — and React events bubble through the React
      // tree. Without this, every click in here also ran the card's
      // onMouseDown and changed which page is active.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-9999 w-[123px] p-1 kd-popup-main-container"
      style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
    >
      <button
        onClick={() => {
          addSlide(slideId);
          onClose();
        }}
        className="kd-slide-options-menu w-full gap-1 text-sm "
      >
        <BadgePlus size={16} />
        New Slide
      </button>

      <button
        onClick={() => {
          duplicateSlide(slideId);
          onClose();
        }}
        className="kd-slide-options-menu w-full gap-1 text-sm "
      >
        <Copy size={16} />
        Duplicate
      </button>

      <button
        onClick={() => {
          deleteSlide(slideId);
          onClose();
        }}
        className="kd-slide-options-menu w-full gap-1 text-sm kd-context-item-danger"
      >
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  );
};

export default MoreOptions;
