"use client";

import React from "react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { NAV_ITEMS } from "@editor/layout/NavigationPanel/Navbar";
import { toggleMainPanel } from "@editor/lib/ui/mainPanel";
import { TABBAR_H } from "@editor/lib/ui/shellMetrics";

/**
 * The narrow shell's replacement for the left icon rail.
 *
 * All nine panels live on one scrolling row rather than four plus a "More"
 * menu. The overflow menu hid five of them behind a second tap, and it also
 * could not be opened while a panel was up — a scrolling row keeps every panel
 * one swipe away, and the last tile is deliberately cut off at the right edge
 * so it reads as scrollable.
 *
 * It sits at the bottom because that is where a thumb reaches, and it stays
 * above the panel sheet so switching panels never needs a close first.
 */
const BottomTabBar: React.FC = () => {
  const active = useEditorStore((s) => s.activeRightPanel);
  const activePanelType = useEditorUIStore((s) => s.activePanelType);
  const listRef = React.useRef<HTMLElement>(null);

  const isOpen = (panel: string) => active === panel && activePanelType === "main";

  // Opening a panel from somewhere else — the canvas, a keyboard shortcut —
  // should bring its tab into view rather than leave it off screen.
  React.useEffect(() => {
    if (activePanelType !== "main" || !active) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-tab="${active}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [active, activePanelType]);

  return (
    <nav
      ref={listRef}
      className="shrink-0 flex items-stretch overflow-x-auto overflow-y-hidden kd-mobile-tabbar"
      style={{
        height: TABBAR_H,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxSizing: "content-box",
      }}
      aria-label="Add to page"
    >
      {NAV_ITEMS.map(({ panel, icon, label }) => (
        <button
          key={panel}
          type="button"
          data-tab={panel}
          onClick={() => toggleMainPanel(panel)}
          aria-pressed={isOpen(panel)}
          className={`kd-mobile-tab ${isOpen(panel) ? "kd-mobile-tab-active" : ""}`}
        >
          <span className="kd-mobile-tab-icon">{icon}</span>
          <span className="kd-mobile-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomTabBar;
