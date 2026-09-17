"use client";
import React, { useEffect, useRef, useState } from "react";
import { samePosition, trackAnchor } from "@editor/lib/ui/anchorTracking";

interface Options {
  /** Popup ki width — anchor ke neeche center karne ke liye chahiye. */
  width: number;
  /** Screen ke left edge se itna gap chhodo (0 = clamp mat karo). */
  minLeft?: number;
}

/**
 * Anchor ke neeche center-aligned popup: position tracking, mount
 * animation aur outside-click close — teeno ek jagah. Har EditPopup
 * panel me ye teen useEffect copy-paste hote the.
 */
export function useAnchoredPopup(
  targetRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  { width, minLeft = 0 }: Options,
) {
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const [mounted, setMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      const top = rect.bottom + 8;
      const raw = rect.left + rect.width / 2 - width / 2;
      const left = minLeft ? Math.max(minLeft, raw) : raw;
      setPos((prev) =>
        samePosition(prev, top, left) ? prev : { top, left, visible: true },
      );
    };
    updatePos();
    // Event-driven, not a 60fps loop: see trackAnchor.
    return trackAnchor(target, updatePos);
  }, [targetRef, width, minLeft]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !targetRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose, targetRef]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return { pos, mounted, popupRef };
}
