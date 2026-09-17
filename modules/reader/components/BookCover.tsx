"use client";

import React, { useEffect, useRef, useState } from "react";
import { BookPreviewProvider, useBookPreview } from "../context/BookPreviewContext";
import PageRenderer from "../render/PageRenderer";

/**
 * The first page of a book, scaled to fit its box. Used outside the reader
 * (the publish page) where only the cover is wanted, not the full viewer.
 * `jsonUrl` may return the document itself or `{ document }` (the owner API).
 */
export default function BookCover({ jsonUrl }: { jsonUrl: string }) {
  const [json, setJson] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(jsonUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const document = data && typeof data === "object" && "document" in data ? data.document : data;
        if (active) setJson(document ? JSON.stringify(document) : "");
      })
      .catch(() => active && setJson(""));
    return () => {
      active = false;
    };
  }, [jsonUrl]);

  if (json === null) return <Placeholder />;
  return (
    <BookPreviewProvider json={json}>
      <Cover />
    </BookPreviewProvider>
  );
}

function Placeholder() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="fs-skeleton aspect-350/434 h-[78%] rounded-xl" aria-label="Loading cover" />
    </div>
  );
}

function Cover() {
  const { pages, theme } = useBookPreview();
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setRoom({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(room.width / theme.pageWidth, room.height / theme.pageHeight) || 0;
  const ready = pages.length > 0 && scale > 0;

  return (
    <div ref={box} className="relative flex h-full w-full items-center justify-center">
      {ready ? (
        <div
          className="relative overflow-hidden rounded-xl bg-white shadow-[0_18px_40px_rgba(30,26,58,0.18)]"
          style={{ width: theme.pageWidth * scale, height: theme.pageHeight * scale }}
        >
          <div
            className="pointer-events-none absolute left-0 top-0 origin-top-left"
            style={{ transform: `scale(${scale})`, width: theme.pageWidth, height: theme.pageHeight }}
          >
            <PageRenderer page={pages[0]} pageNumber={1} thumbnail />
          </div>
        </div>
      ) : (
        <div className="fs-skeleton aspect-350/434 h-[78%] rounded-xl" aria-label="Loading cover" />
      )}
    </div>
  );
}
