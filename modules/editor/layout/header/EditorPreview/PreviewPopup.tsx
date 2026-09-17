"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useEditorStore from "@editor/store/editorStore";
import dynamic from "next/dynamic";


const PreviewBook = dynamic(() => import("./PreviewBook"), {
  ssr: false,
  loading: () => null,
});

export interface PreviewPopupProps {
  onClose: () => void;
}


export default function PreviewPopup({ onClose }: PreviewPopupProps) {
  const liveSlides = useEditorStore((s) => s.slides);

  // Snapshot the document once, when the dialog opens.
  //
  // The reader mounts the editor's own element renderers, and several of them
  // measure themselves and write a corrected size back to the store (text
  // height, table height). Reading the store live meant each of those writes
  // produced a brand new slides array, which the reader read as "a different
  // book" and reset itself for — the more pages a book had, the more certain it
  // was to blank out. Nothing can edit the document behind a modal anyway, so a
  // snapshot is both correct and stable.
  const [slides] = useState(liveSlides);


  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);


  useEffect(() => {
    const guard = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      e.stopPropagation();
    };

    window.addEventListener("keydown", guard, true);
    return () => window.removeEventListener("keydown", guard, true);
  }, [onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center kd-bg-inverse p-0 sm:p-4 md:p-6"
      onMouseDown={(e) => {
        // Backdrop click closes; clicks inside the dialog must not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Book preview"
        className="relative h-dvh w-full overflow-hidden shadow-2xl sm:h-[min(86vh,760px)] sm:w-[min(1120px,94vw)] sm:rounded-xl"
      >
        <PreviewBook document={slides} mode="modal" onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
