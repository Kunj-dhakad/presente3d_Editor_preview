"use client";

import React, { useEffect } from "react";
import { BookPreviewProvider, useBookPreview } from "../context/BookPreviewContext";
import type { PreviewMode } from "../types/view";
import BottomToolbar from "./BottomToolbar";
import NavButton from "./NavButton";
import PreviewHeader from "./PreviewHeader";
import ReaderStage from "./ReaderStage";
import PagesThumbnailPanel from "./PagesThumbnailPanel";
import ReaderEngagement from "./ReaderEngagement";

export interface BookPreviewProps {
  
  json?: string;
 
  jsonUrl?: string;
  
  mode?: PreviewMode;
  onClose?: () => void;
  /** Share code of a published book: turns on view tracking, the lead form and ratings. */
  engagementToken?: string;
}

function AutoplayInteractionGuard() {
  const { isAutoplaying, stopAutoplay } = useBookPreview();

  useEffect(() => {
    if (!isAutoplaying) return;

    const onUserIntent = (event: Event) => {
      const target = event.target;
      if (target instanceof Element) {
       
        if (target.closest('[data-autoplay-toggle="true"]')) return;
      }
      stopAutoplay();
    };

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener("pointerdown", onUserIntent, opts);
    document.addEventListener("wheel", onUserIntent, opts);
    document.addEventListener("touchstart", onUserIntent, opts);
    document.addEventListener("keydown", onUserIntent, opts);

    return () => {
      document.removeEventListener("pointerdown", onUserIntent, opts);
      document.removeEventListener("wheel", onUserIntent, opts);
      document.removeEventListener("touchstart", onUserIntent, opts);
      document.removeEventListener("keydown", onUserIntent, opts);
    };
  }, [isAutoplaying, stopAutoplay]);

  return null;
}

export default function BookPreview({
  json,
  jsonUrl,
  mode = "page",
  onClose,
  engagementToken,
}: BookPreviewProps) {
  return (
    <BookPreviewProvider json={json} jsonUrl={jsonUrl}>
      <div
        className={`relative flex ${
          mode === "modal" ? "h-full" : "h-dvh"
        } w-full select-none flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased selection:bg-(--kd-accent)/20 selection:text-(--kd-brand-900)`}
      >
        <AutoplayInteractionGuard />
        {engagementToken && <ReaderEngagement token={engagementToken} />}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.03),transparent_55%)]" />

        <PreviewHeader
          onBack={mode === "modal" ? onClose : undefined}
          backLabel={mode === "modal" ? "Close" : "Back"}
        />

        <main className="relative z-10 flex w-full min-h-0 flex-1 select-none items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-200">
          <ReaderStage />
          <NavButton />
          <PagesThumbnailPanel />
        </main>

        <BottomToolbar />
      </div>
    </BookPreviewProvider>
  );
}