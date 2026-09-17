"use client";

import { useEffect, useState } from "react";
import type { NaturalSize } from "./frames";

/**
 * The pixel size of a picture, once the browser knows it.
 *
 * A frame needs this to work out how far its picture may be dragged: cover
 * sizing crops whatever does not fit, and that crop is exactly the travel
 * available. Shared by the canvas and the page thumbnails so both place a
 * masked picture the same way — reading it in only one of them is how the two
 * would drift apart.
 *
 * The image is almost always in the browser's cache by the time this runs, so
 * the extra request is a cache hit rather than a second download.
 */
export const useNaturalSize = (src: string | undefined) => {
  // Stored against the source it describes, so a new picture simply reads as
  // "not measured yet" instead of needing an effect to clear the old answer.
  const [entry, setEntry] = useState<{ src: string; size: NaturalSize | null } | null>(
    null,
  );

  useEffect(() => {
    if (!src || entry?.src === src) return;

    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (cancelled) return;
      setEntry({
        src,
        size: { width: probe.naturalWidth, height: probe.naturalHeight },
      });
    };
    // A source that will not load has no size to report; the frame falls back
    // to plain cover sizing rather than waiting forever.
    probe.onerror = () => {
      if (!cancelled) setEntry({ src, size: null });
    };
    probe.src = src;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [src, entry]);

  return entry && entry.src === src ? entry.size : null;
};
