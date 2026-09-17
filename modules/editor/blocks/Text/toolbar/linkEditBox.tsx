"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { TextData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { finalizePendingLink, cancelPendingLink } from "./TextFormattingToolbar";
import { samePosition, trackAnchor } from "@editor/lib/ui/anchorTracking";

interface ToolbarProps {
  targetRef: React.RefObject<HTMLElement | null>;
  data: TextData;
  updateButton: (patch: Partial<TextData>) => void;
  onClose: () => void;
}

const LinkEditBox: React.FC<ToolbarProps> = ({ targetRef, data, updateButton, onClose }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const [link, setLink] = useState(() => {
    const textEl = useEditorUIStore.getState().activeTextRef;
    const pending = textEl?.querySelector('a[data-pending-link="true"]') as HTMLAnchorElement | null;
    const existingHref = pending?.getAttribute("href");
    return existingHref || data.link || "";
  }); const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      setPos((prev) =>
        samePosition(prev, rect.bottom + 8, rect.left + rect.width / 2 - 144)
          ? prev
          : { top: rect.bottom + 8, left: rect.left + rect.width / 2 - 144, visible: true },
      );
    };
    updatePos();
    // Event-driven, not a 60fps loop: see trackAnchor.
    return trackAnchor(target, updatePos);
  }, [targetRef]);

  // Done dabane ke baad text element pe wapas focus laao
  const refocusText = useCallback(() => {
    requestAnimationFrame(() => {
      const textEl = useEditorUIStore.getState().activeTextRef;
      textEl?.focus();
    });
  }, []);

  const closeAndCleanup = useCallback(() => {
    const textEl = useEditorUIStore.getState().activeTextRef;
    if (textEl && textEl.querySelector('a[data-pending-link="true"]')) {
      cancelPendingLink(textEl);
      updateButton({ html: textEl.innerHTML, text: textEl.innerText });
    }
    onClose();
    refocusText();
  }, [onClose, updateButton, refocusText]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !targetRef.current?.contains(e.target as Node)
      ) closeAndCleanup();
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [targetRef, closeAndCleanup]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);





  const handleCopy = () => {
    if (!link.trim()) { showToast("Nothing to copy"); return; }
    navigator.clipboard.writeText(link).then(() => showToast("Link copied!"));
  };

  const handleDelete = () => {
    setLink("");
    showToast("Link cleared");
    const textEl = useEditorUIStore.getState().activeTextRef;
    const hasPending = textEl?.querySelector('a[data-pending-link="true"]');

    if (textEl && hasPending) {
      cancelPendingLink(textEl);
      updateButton({ html: textEl.innerHTML, text: textEl.innerText });
    } else {
      updateButton({ link: "" });
    }

    onClose();
    refocusText();
  };

  const handleDone = () => {
    if (!link.trim()) { showToast("Please enter a link"); return; }
    const textEl = useEditorUIStore.getState().activeTextRef;
    const hasPending = textEl?.querySelector('a[data-pending-link="true"]');

    if (textEl && hasPending) {
      // particular selected text par link
      finalizePendingLink(textEl, link);
      updateButton({ html: textEl.innerHTML, text: textEl.innerText });
    } else {
      // koi selection nahi tha -> pure text/element par link (fallback)
      updateButton({ link });
    }

    onClose();
    refocusText();
  };

  if (!pos.visible) return null;

  return (
    <div
      ref={popupRef}
      data-element="true"
      className="fixed z-9999"
      style={{
        top: pos.top,
        left: pos.left,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0px)" : "translateY(-6px)",
        transition: "opacity 0.15s ease, transform 0.15s ease",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="kd-bg-surface border kd-bd-subtle rounded-xl p-3 w-72 shadow-lg flex flex-col gap-2.5">
        <span className="text-xs font-medium kd-fg-muted tracking-wide">Display mode</span>

        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleDone();
            if (e.key === "Escape") closeAndCleanup();
          }}
          placeholder="Paste a link"
          className="w-full px-2.5 py-2 text-sm kd-bg-app border kd-bd-subtle rounded-lg outline-none kd-fc-bd kd-fc-bg-surface transition kd-ph-subtle"
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={handleCopy}
              title="Copy link"
              className="w-8 h-8 flex items-center justify-center rounded-lg border kd-bd-subtle kd-fg-muted kd-hv-bg-sunken kd-hv-fg transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              title="Delete"
              className="w-8 h-8 flex items-center justify-center rounded-lg border kd-bd-subtle kd-fg-muted kd-hv-bg-danger-soft kd-hv-bd-danger kd-hv-fg-danger transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleDone}
            className="px-4 py-1.5 rounded-lg kd-bg-accent kd-hv-bg-accent active:scale-95 kd-fg-on-accent text-sm font-medium transition"
          >
            Done
          </button>
        </div>
      </div>

      {toast && (
        <p className="mt-2 text-xs text-center kd-fg-muted">{toast}</p>
      )}
    </div>
  );
};

export default LinkEditBox;