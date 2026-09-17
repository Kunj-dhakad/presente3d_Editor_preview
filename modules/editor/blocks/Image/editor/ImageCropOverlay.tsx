"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
// Bundled rather than pulled from a CDN: on a blocked or offline network the
// stylesheet used to silently fail and the cropper rendered as a bare image
// with no handles, no grid and no visible crop box.
import "cropperjs/dist/cropper.css";
import useEditorStore, { ImageData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { aspectFor, DEFAULT_CROP_RATIO } from "./cropRatios";

// The binding lives in its own module so panels that only *drive* the cropper
// (ImageCropePanel) can reach it without importing react-cropper.
import { cropperControls, resetCropperControls } from "./cropperControls";
export { cropperControls };

/**
 * How large the exported crop is allowed to be.
 *
 * Exporting a 4000px photo for an element drawn 350px wide costs a slow encode
 * and then uploads roughly a hundred times the pixels anyone will ever see, so
 * the ceiling follows the element: enough headroom to enlarge it or print it,
 * and no more. The absolute cap also keeps the canvas under the per-browser
 * pixel ceiling — Safari quietly hands back a blank one past roughly 16M.
 */
const EXPORT_SCALE = 3;
const MIN_CROP_SIDE = 1600;
const MAX_CROP_SIDE = 4096;

const exportSideFor = (width: number, height: number) => {
  const wanted = Math.max(width, height) * EXPORT_SCALE;
  return Math.round(Math.min(MAX_CROP_SIDE, Math.max(MIN_CROP_SIDE, wanted)));
};

/** JPEG quality. Above this the file grows far faster than the picture improves. */
const EXPORT_QUALITY = 0.85;

/** How long to wait for the image before calling it a failure. */
const LOAD_TIMEOUT_MS = 15000;

/** How long the cropper may take before a second request is worth making. */
const PROBE_DELAY_MS = 2500;

/**
 * A canvas is only tainted — and `toBlob` only fails — when the pixels came
 * from another origin without permission. Asking for CORS on same-origin,
 * `data:` and `blob:` sources buys nothing and, on a host that answers without
 * the header, stops the image from loading at all.
 */
const needsCrossOrigin = (src: string) => {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return false;
  try {
    return new URL(src, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
};

/**
 * PNG only where transparency is actually on the table. A photograph
 * re-encoded as PNG is routinely ten times the size of the JPEG it came from,
 * for an upload that looks identical.
 */
const LOSSLESS_SOURCE = /\.(png|webp|gif|svg)(\?|#|$)/i;
const exportTypeFor = (src: string) =>
  LOSSLESS_SOURCE.test(src) || /^data:image\/(png|webp|gif|svg)/i.test(src)
    ? "image/png"
    : "image/jpeg";

const ImageCropOverlay: React.FC = () => {
  const cropElementId = useEditorUIStore((s) => s.cropElementId);
  const setCropElementId = useEditorUIStore((s) => s.setCropElementId);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  const cropperRef = useRef<ReactCropperElement>(null);
  const readyRef = useRef(false);
  // Both states are stored against the source they describe, so a different
  // image simply reads as "not loaded yet" instead of needing an effect to
  // clear the previous one behind it.
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] =
    useState<{ src: string; message: string } | null>(null);

  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === cropElementId,
  );
  const imgData = element?.data as ImageData | undefined;
  const src = imgData?.src ?? "";
  const crossOrigin = useMemo(() => needsCrossOrigin(src), [src]);

  const isReady = !!src && readySrc === src;
  const loadError =
    !isReady && failedSrc?.src === src ? failedSrc.message : null;

  // Deleting the element, or moving to another slide, used to leave crop mode
  // switched on with nothing to crop.
  useEffect(() => {
    if (cropElementId && !imgData) setCropElementId(null);
  }, [cropElementId, imgData, setCropElementId]);

  // The overlay is the only thing that can honour these; a stale cropper left
  // behind here would answer for an image the author has already closed.
  useEffect(() => () => resetCropperControls(), []);

  // cropperjs reports success through `ready` and failure through nothing at
  // all, so a source that cannot load left the spinner turning for good. This
  // loads the same URL under the same terms to find out which it is.
  useEffect(() => {
    if (!src) return;
    readyRef.current = false;

    let cancelled = false;
    let probe: HTMLImageElement | null = null;
    const fail = (message: string) => {
      if (!cancelled && !readyRef.current) setFailedSrc({ src, message });
    };

    // Held back until the cropper has visibly stalled. Fetching alongside it
    // would double the download on every ordinary crop just to learn something
    // that only matters when the image never arrives.
    const probeTimer = window.setTimeout(() => {
      if (cancelled || readyRef.current) return;
      probe = new window.Image();
      if (crossOrigin) probe.crossOrigin = "anonymous";
      probe.onerror = () =>
        fail(
          crossOrigin
            ? "This image's host doesn't allow cropping. Replace it with an uploaded copy and try again."
            : "This image couldn't be loaded, so there's nothing to crop.",
        );
      probe.src = src;
    }, PROBE_DELAY_MS);

    // A backstop for everything the probe cannot see, so the spinner always
    // resolves into either a cropper or an explanation.
    const timer = window.setTimeout(
      () => fail("This image took too long to load."),
      LOAD_TIMEOUT_MS,
    );

    return () => {
      cancelled = true;
      if (probe) probe.onerror = null;
      window.clearTimeout(probeTimer);
      window.clearTimeout(timer);
    };
  }, [src, crossOrigin]);

  if (!imgData) return null;

  const handleReady = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const naturalAspect = () => {
      const image = cropper.getImageData();
      return image.naturalWidth / image.naturalHeight;
    };

    cropperControls.applyPreset = (value: string) => {
      if (value === "full") {
        // "Full" means the whole picture back, not merely an unlocked shape.
        cropper.setAspectRatio(NaN);
        cropper.reset();
        return;
      }
      cropper.setAspectRatio(aspectFor(value, naturalAspect()));
    };

    cropperControls.getCroppedBlob = () =>
      new Promise((resolve) => {
        try {
          const side = exportSideFor(imgData.width, imgData.height);
          const canvas = cropper.getCroppedCanvas({
            maxWidth: side,
            maxHeight: side,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "high",
          });
          if (!canvas) return resolve(null);
          const { width, height } = canvas;
          canvas.toBlob(
            (blob: Blob | null) =>
              resolve(blob ? { blob, width, height } : null),
            exportTypeFor(src),
            EXPORT_QUALITY,
          );
        } catch (error) {
          // A tainted canvas throws here rather than returning empty-handed.
          console.error("Crop export failed:", error);
          resolve(null);
        }
      });

    // Whatever ratio the author picked before opening the cropper.
    cropperControls.applyPreset(imgData.cropRatio ?? DEFAULT_CROP_RATIO);

    readyRef.current = true;
    setFailedSrc(null);
    setReadySrc(src);
  };

  const showOverlayMessage = !isReady || !!loadError;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        zIndex: 1000,
      }}
    >
      {showOverlayMessage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--kd-scrim)",
            borderRadius: 4,
            gap: 10,
            padding: 16,
            pointerEvents: "none",
          }}
        >
          {loadError ? (
            <span
              style={{
                color: "var(--kd-text-inverse)",
                fontSize: 12,
                lineHeight: 1.5,
                textAlign: "center",
                maxWidth: 260,
              }}
            >
              {loadError}
            </span>
          ) : (
            <>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "3px solid var(--kd-border-inverse)",
                  borderTopColor: "var(--kd-bg-surface)",
                  borderRadius: "50%",
                  animation: "kd-spin 0.7s linear infinite",
                }}
              />
              <span style={{ color: "var(--kd-text-inverse)", fontSize: 12, opacity: 0.85 }}>
                Loading crop...
              </span>
              <style>{`
            @keyframes kd-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
            </>
          )}
        </div>
      )}

      <Cropper
        key={cropElementId ?? "crop"}
        ref={cropperRef}
        src={src}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
        dragMode="move"
        autoCrop
        autoCropArea={1}
        background={false}
        responsive
        restore={false}
        cropBoxMovable
        cropBoxResizable
        toggleDragModeOnDblclick={false}
        viewMode={1}
        crossOrigin={crossOrigin ? "anonymous" : undefined}
        ready={handleReady}
      />
    </div>
  );
};

export default ImageCropOverlay;
