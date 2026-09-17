"use client";

import React, { useEffect } from "react";
import { useBookPreview } from "../context/BookPreviewContext";
import FlipbookReader from "./FlipbookReader";
import HorizontalReader from "./HorizontalReader";
import PageDirectory from "./PageDirectory";
import VerticalReader from "./VerticalReader";

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/80 p-8 text-center shadow-sm">
      <h3 className="mb-2 font-sans text-lg font-bold text-slate-800">{title}</h3>
      <p className="font-sans text-sm text-slate-500">{body}</p>
    </div>
  );
}


export default function ReaderStage() {
  const { pages, parseError, loading, viewMode, nextPage, prevPage } =
    useBookPreview();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
    
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowRight") nextPage();
      if (event.key === "ArrowLeft") prevPage();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextPage, prevPage]);

  if (parseError) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/90 p-8 text-center shadow-xl">
        <h3 className="mb-2 font-sans text-xl font-bold text-rose-900">
          This book could not be opened
        </h3>
        <p className="font-sans text-sm text-rose-700">{parseError}</p>
      </div>
    );
  }

  if (loading) {
    return <EmptyState title="Loading book…" body="Fetching the book data." />;
  }

  if (pages.length === 0) {
    return (
      <EmptyState title="No pages to display" body="This book has no pages yet." />
    );
  }

  if (viewMode === "index") return <PageDirectory />;
  if (viewMode === "vertical") return <VerticalReader />;
  if (viewMode === "horizontal") return <HorizontalReader />;
  return <FlipbookReader />;
}
