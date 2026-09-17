"use client";

import React from "react";
import { X } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import ToolPanel from "@editor/layout/AssetsPanel/ToolPanel";
import EditToolPanel from "@editor/layout/EditBarPanel/EditToolPanel";
import { closeMainPanel } from "@editor/lib/ui/mainPanel";
import { closeEditPanel } from "@editor/lib/ui/editPanel";
import { TABBAR_H } from "@editor/lib/ui/shellMetrics";

/** Sheet heights as a share of the viewport, smallest first. */
const SNAPS = [0.42, 0.72, 0.86] as const;
type Snap = 0 | 1 | 2;

/** Room the tab bar occupies at the bottom, including the device inset. */
const BAR_SPACE = `calc(${TABBAR_H}px + env(safe-area-inset-bottom, 0px))`;

/**
 * The asset and edit panels as a sheet that rises over the canvas.
 *
 * On a narrow screen a permanent side column would leave the page a sliver, so
 * the panel becomes something you pull up, use, and dismiss. It renders the
 * very same `ToolPanel` and `EditToolPanel` the wide shell does — only their
 * container changes, so a panel added for desktop appears here with no extra
 * work.
 */
const PanelSheet: React.FC = () => {
  const activePanelType = useEditorUIStore((s) => s.activePanelType);
  const activeRightPanel = useEditorStore((s) => s.activeRightPanel);
  const [snap, setSnap] = React.useState<Snap>(1);
  const dragRef = React.useRef<{ y: number; snap: Snap } | null>(null);

  const open = activePanelType === "main" || activePanelType === "edit";

  // A newly opened panel always starts at the middle stop rather than wherever
  // the last one was left.
  React.useEffect(() => {
    if (open) setSnap(1);
  }, [open, activeRightPanel, activePanelType]);

  const dismiss = React.useCallback(() => {
    if (useEditorUIStore.getState().activePanelType === "edit") {
      // Edit panels have their own exit: it also clears crop mode and puts the
      // main sidebar back where the author left it.
      closeEditPanel();
      return;
    }
    closeMainPanel();
  }, []);

  const onHandleDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, snap };
  };

  const onHandleMove = (e: React.PointerEvent) => {
    const start = dragRef.current;
    if (!start) return;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) < 44) return;
    // Dragging down lowers the sheet a stop, up raises it.
    const next = start.snap + (dy > 0 ? -1 : 1);
    if (next < 0) {
      dragRef.current = null;
      dismiss();
      return;
    }
    setSnap(Math.min(SNAPS.length - 1, next) as Snap);
    dragRef.current = { y: e.clientY, snap: Math.min(SNAPS.length - 1, next) as Snap };
  };

  const endDrag = () => { dragRef.current = null; };

  if (!open) return null;

  return (
    <>
      {/* Both stop above the tab bar. Covering it meant a panel could only be
          swapped by closing the one that was open first. */}
      <div
        className="fixed left-0 right-0 top-0 z-[80] kd-mobile-sheet-scrim"
        style={{ bottom: BAR_SPACE }}
        onClick={dismiss}
        aria-hidden="true"
      />
      <section
        className="fixed left-0 right-0 z-[81] flex flex-col kd-mobile-sheet"
        style={{ bottom: BAR_SPACE, height: `${SNAPS[snap] * 100}dvh` }}
        role="dialog"
        aria-modal="true"
        aria-label="Editor panel"
      >
        <div
          className="shrink-0 flex items-center justify-between pl-3 pr-2 pt-2 pb-1 touch-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="kd-mobile-sheet-grip" aria-hidden="true" />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close panel"
            className="kd-mobile-sheet-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {activePanelType === "main" && <ToolPanel />}
          {activePanelType === "edit" && <EditToolPanel key={activeRightPanel} />}
        </div>
      </section>
    </>
  );
};

export default PanelSheet;
