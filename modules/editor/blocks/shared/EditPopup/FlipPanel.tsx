"use client";
import React from "react";
import { useAnchoredPopup } from "./useAnchoredPopup";
import PopupShell from "./PopupShell";
import { PanelProps, patchOf } from "./types";

const POPUP_WIDTH = 248;

function FlipPanel<T extends { flipX?: boolean; flipY?: boolean }>({
  data,
  updateButton,
  targetRef,
  onClose,
}: PanelProps<T>) {
  const { pos, mounted, popupRef } = useAnchoredPopup(targetRef, onClose, {
    width: POPUP_WIDTH,
  });

  const rows = [
    {
      key: "flipX" as const,
      label: "Flip horizontal",
      on: !!data.flipX,
      path: (
        <>
          <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
          <line x1="12" y1="20" x2="12" y2="4" />
        </>
      ),
    },
    {
      key: "flipY" as const,
      label: "Flip vertical",
      on: !!data.flipY,
      path: (
        <>
          <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
          <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
          <line x1="4" y1="12" x2="20" y2="12" />
        </>
      ),
    },
  ];

  return (
    <PopupShell
      popupRef={popupRef}
      pos={pos}
      mounted={mounted}
      width={POPUP_WIDTH}
      boxClassName="p-2.5 flex flex-col gap-0.5"
    >
      {rows.map((row) => (
        <button
          key={row.key}
          data-active={row.on}
          className="kd-btn-ghost flex items-center gap-2.5 px-2 py-1.5 text-sm w-full text-left"
          onClick={() => updateButton(patchOf<T>({ [row.key]: !row.on }))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {row.path}
          </svg>
          <span className="flex-1">{row.label}</span>
          {row.on && (
            <span className="kd-note-accent text-[11px] px-2 py-0.5 rounded-md font-medium">
              On
            </span>
          )}
        </button>
      ))}
    </PopupShell>
  );
}

export default FlipPanel;
