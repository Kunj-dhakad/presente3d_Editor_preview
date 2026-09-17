"use client";
import React, { useState } from "react";
import { useAnchoredPopup } from "./useAnchoredPopup";
import PopupShell from "./PopupShell";
import { PanelProps, patchOf } from "./types";

const POPUP_WIDTH = 288;

function LinkEditBox<T extends { link?: string }>({
  targetRef,
  data,
  updateButton,
  onClose,
}: PanelProps<T>) {
  const { pos, mounted, popupRef } = useAnchoredPopup(targetRef, onClose, {
    width: POPUP_WIDTH,
  });

  const [link, setLink] = useState(data.link || "");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const handleCopy = () => {
    if (!link.trim()) {
      showToast("Nothing to copy");
      return;
    }
    navigator.clipboard.writeText(link).then(() => showToast("Link copied!"));
  };

  const handleDone = () => {
    if (!link.trim()) {
      showToast("Please enter a link");
      return;
    }
    updateButton(patchOf<T>({ link }));
    onClose();
  };

  return (
    <PopupShell
      popupRef={popupRef}
      pos={pos}
      mounted={mounted}
      boxClassName="p-3 w-72 flex flex-col gap-2.5"
      toast={toast}
    >
      <span className="kd-field-label text-xs">Display mode</span>

      <input
        autoFocus
        type="text"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleDone();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Paste a link"
        className="kd-input w-full px-2.5 py-2 text-sm"
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            title="Copy link"
            className="kd-btn-outline w-8 h-8 flex items-center justify-center"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            onClick={() => {
              setLink("");
              showToast("Link cleared");
            }}
            title="Delete"
            className="kd-btn-outline kd-btn-outline-danger w-8 h-8 flex items-center justify-center"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        <button
          onClick={handleDone}
          className="kd-btn-primary px-4 py-1.5 text-sm font-medium active:scale-95"
        >
          Done
        </button>
      </div>
    </PopupShell>
  );
}

export default LinkEditBox;
