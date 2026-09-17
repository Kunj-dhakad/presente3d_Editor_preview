"use client";

import type { SlideType } from "@editor/store/editorStore";
import { BookStateProvider } from "./context/BookStateContext";
import PreviewHeader from "./components/PreviewHeader";
import BookReader from "./components/BookReader";
import NavButton from "./components/NavButton";
import BottomToolbar from "./components/BottomToolbar";

export interface PreviewBookProps {
  document?: SlideType[];
  jsonUrl?: string;
  mode?: "page" | "modal";
  onClose?: () => void;
}

export default function PreviewBook({
  document,
  jsonUrl,
  mode = "page",
  onClose,
}: PreviewBookProps) {
  return (
    <BookStateProvider document={document} jsonUrl={jsonUrl}>
      {/* In "page" mode this owns the viewport (h-dvh), unchanged. In "modal"
          mode it fills whatever box the dialog gives it instead. */}
      <div
        className={`relative ${
          mode === "modal" ? "h-full" : "h-dvh"
        } w-full flex flex-col kd-bg-app kd-fg overflow-hidden font-sans select-none antialiased kd-selection`}
      >
        <div className="kd-glow-accent absolute inset-0 pointer-events-none" />
        <PreviewHeader
          onBack={mode === "modal" ? onClose : undefined}
          backLabel={mode === "modal" ? "Close" : "Back"}
        />
        <main className="flex-1 min-h-0 w-full flex items-center justify-center relative kd-bg-hover border-b kd-bd-subtle overflow-hidden z-10 select-none">
          <BookReader />
          <NavButton />
        </main>
        <BottomToolbar />
      </div>
    </BookStateProvider>
  );
}
