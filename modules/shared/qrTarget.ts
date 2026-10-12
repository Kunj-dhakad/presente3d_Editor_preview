"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The public reader's address for the book being read, or null anywhere else. */
function readerAddress() {
  const { origin, pathname } = window.location;
  return pathname.startsWith("/read/") ? origin + pathname : null;
}

/**
 * What a QR code encodes. One marked `bookLink` (the back cover of an AI book)
 * opens the book itself: the reader's own address when the book is read
 * online, and the stored address — the site — while it is being edited.
 */
export function useQrTarget(content: string, bookLink?: boolean) {
  return useSyncExternalStore(
    subscribe,
    () => (bookLink ? readerAddress() ?? (content || window.location.origin) : content),
    () => content,
  );
}
