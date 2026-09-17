"use client";
import React from "react";
import { Crop, Loader2 } from "lucide-react";
import useEditorStore, { ImageData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { cropperControls } from "@editor/blocks/Image/editor/cropperControls";
import {
  CROP_RATIOS,
  DEFAULT_CROP_RATIO,
} from "@editor/blocks/Image/editor/cropRatios";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { closeEditPanel } from "@editor/lib/ui/editPanel";
import {
  Block,
  Hint,
  Section,
  actionButton,
  primaryButton,
} from "@editor/layout/EditBarPanel/SettingsControls";

const SHAPE_DIMS: Record<string, { w: number; h: number }> = {
  full: { w: 28, h: 20 },
  square: { w: 20, h: 20 },
  wide: { w: 28, h: 16 },
  tall: { w: 16, h: 26 },
};

/** Drawn in `currentColor` so the tile's own active state carries the accent. */
const RatioIcon: React.FC<{ shape: string }> = ({ shape }) => {
  const { w, h } = SHAPE_DIMS[shape] ?? { w: 20, h: 20 };
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect
        x={(32 - w) / 2}
        y={(32 - h) / 2}
        width={w}
        height={h}
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
};

/**
 * The element's new box after a crop: the crop's shape, fitted inside the box
 * it already occupied and left on the same centre. Only the source used to be
 * replaced, so a 16:9 crop landed back in a square frame and `object-fit:
 * cover` cropped it a second time — the saved result never matched what the
 * author had framed.
 */
const boxForCrop = (
  box: { x: number; y: number; width: number; height: number },
  aspect: number,
) => {
  if (!Number.isFinite(aspect) || aspect <= 0) return null;
  const current = box.width / box.height;
  const width = aspect > current ? box.width : box.height * aspect;
  const height = aspect > current ? box.width / aspect : box.height;
  return {
    width,
    height,
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
  };
};

const extensionFor = (mime: string) => (mime === "image/png" ? "png" : "jpg");

// ─────────────────────────────────────────────────────────────────────────────
const ImageCropePanel: React.FC = () => {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setCropElementId = useEditorUIStore((s) => s.setCropElementId);
  const cropElementId = useEditorUIStore((s) => s.cropElementId);

  const token = useProjectInfoStore((s) => s.token);
  const api_url = useProjectInfoStore((s) => s.api_url);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const uploadRef = React.useRef<AbortController | null>(null);

  // Selecting another element while the cropper was open took the Done and
  // Cancel buttons away and left the overlay running with no way out, so the
  // panel follows whatever is being cropped in preference to the selection.
  const targetId = cropElementId ?? activeElementId;
  const element = slides[activeSlide]?.elements.find((el) => el.id === targetId);

  // An upload that outlives the panel must not write its result back.
  React.useEffect(() => () => uploadRef.current?.abort(), []);

  if (!element || element.data.type !== "image") return null;

  const data = element.data as ImageData;
  const activeVal = (data.cropRatio as string) ?? DEFAULT_CROP_RATIO;
  const isCropping = cropElementId === element.id;

  // ── Ratio select ──────────────────────────────────────────────────────────
  const handleRatioClick = (preset: (typeof CROP_RATIOS)[number]) => {
    updateElement(
      element.id,
      { cropRatio: preset.value } as Partial<ImageData>,
      { history: true },
    );
    if (isCropping) cropperControls.applyPreset(preset.value);
  };

  // ── Save crop ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);

    const controller = new AbortController();
    uploadRef.current?.abort();
    uploadRef.current = controller;

    try {
      const cropped = await cropperControls.getCroppedBlob();
      if (!cropped)
        throw new Error(
          "Couldn't read the crop from this image. Try an uploaded copy of it.",
        );

      const formData = new FormData();
      formData.append(
        "image_url",
        cropped.blob,
        `crop.${extensionFor(cropped.blob.type)}`,
      );
      formData.append("access_token", token || "");

      const res = await fetch(`${api_url}sl_editor_crop_image`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status}).`);

      const payload = await res.json();
      if (payload?.status !== 1 || !payload?.url)
        throw new Error(payload?.message || "The server rejected this crop.");

      if (controller.signal.aborted) return;
      updateElement(
        element.id,
        {
          src: payload.url,
          ...(boxForCrop(data, cropped.width / cropped.height) ?? {}),
        },
        { history: true },
      );
      // The panel has done what it was opened for; leaving it up would only
      // invite a second crop of the crop.
      closeEditPanel();
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Crop upload failed:", err);
      setError(err instanceof Error ? err.message : "Crop failed.");
    } finally {
      if (uploadRef.current === controller) {
        uploadRef.current = null;
        setSaving(false);
      }
    }
  };

  // ── Cancel ───
  const handleCancel = () => {
    uploadRef.current?.abort();
    uploadRef.current = null;
    setSaving(false);
    setError(null);
    setCropElementId(null);
  };

  // ── Start crop ───
  const handleStartCrop = () => {
    setError(null);
    setCropElementId(element.id);
  };

  return (
    <div className="pb-6">
      <Section title="Crop">
        <Hint>
          {isCropping
            ? "Drag the box on the page to frame the picture, then press Done."
            : "Start cropping to frame this picture on the page."}
        </Hint>
      </Section>

      <Section title="Aspect ratio">
        <Block className="grid grid-cols-3 gap-1.5">
          {CROP_RATIOS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleRatioClick(preset)}
              className={`kd-set-tile ${
                activeVal === preset.value ? "kd-set-tile-active" : ""
              }`}
            >
              <RatioIcon shape={preset.shape} />
              <span>{preset.label}</span>
            </button>
          ))}
        </Block>
      </Section>

      <div className="px-3 pt-3">
        {isCropping ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCancel}
              className={`${actionButton} flex-1`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`${primaryButton} flex-1`}
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Cropping…
                </>
              ) : (
                "Done"
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartCrop}
            className={`${primaryButton} w-full`}
          >
            <Crop size={13} /> Start crop
          </button>
        )}
        {error && <p className="kd-set-error">{error}</p>}
      </div>
    </div>
  );
};

export default ImageCropePanel;
