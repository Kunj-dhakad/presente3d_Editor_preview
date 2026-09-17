"use client";

import { useCallback, useState } from "react";

export function useZoom() {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(250, prev + 10));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(30, prev - 10));
  }, []);

  return { zoomLevel, zoomIn, zoomOut, setZoomLevel };
}
