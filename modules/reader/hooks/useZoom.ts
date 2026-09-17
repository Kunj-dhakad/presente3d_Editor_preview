"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
} from "../constants/reader";

export function useZoom() {
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);

  const zoomIn = useCallback(
    () => setZoomLevel((level) => Math.min(MAX_ZOOM, level + ZOOM_STEP)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoomLevel((level) => Math.max(MIN_ZOOM, level - ZOOM_STEP)),
    [],
  );
  const resetZoom = useCallback(() => setZoomLevel(DEFAULT_ZOOM), []);

  return { zoomLevel, zoomIn, zoomOut, setZoomLevel, resetZoom };
}
