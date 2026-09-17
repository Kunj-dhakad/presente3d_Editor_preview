"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Icon, MiniStamp, Dropdown,
  STYLE_PRESETS, FONT_OPTIONS, SIZE_OPTIONS, OPACITY_OPTIONS, LETTER_SPACING_OPTIONS, SCALE_OPTIONS,
  ROTATION_OPTIONS,
} from "./Shared";
import { loadGoogleFont } from "@shared/fonts/useFontLoader";
import type { FormState, OpacityPct } from "./Shared";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import Image from 'next/image'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { KdMediaUpladIcon } from "@editor/lib/icon/icons";
export const TextEditor: React.FC<{
  initial: FormState;
  mode: "create" | "edit";
  onSave: (f: FormState) => void;
  onCancel: () => void;
}> = ({ initial, mode, onSave, onCancel }) => {
  const [f, setF] = useState<FormState>(initial);
  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }));

  // The picker offers Google families the app never loads on its own —
  // Montserrat (the default) and Inter among them — so picking one changed
  // nothing on screen. The loader batches these into a single request.
  useEffect(() => {
    FONT_OPTIONS.forEach((family) => void loadGoogleFont(family));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl p-2.5 kd-wm-quickadd-card">
        {STYLE_PRESETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => set({ stylePreset: s.id })}
            className={`kd-wm-style-card ${f.stylePreset === s.id ? "kd-wm-style-card-active" : ""}
              aspect-square flex items-center justify-center rounded-lg border-2 overflow-hidden transition-colors`}
          >
            <MiniStamp text={"WATERMARK"} color="#7069e8" opacity={70} rotation={s.rotation} size={10} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="kd-wm-label font-semibold">Text</label>
        <input
          className="kd-wm-input w-full rounded-lg border px-3 py-2 outline-none transition-colors"
          value={f.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Confidential"
          maxLength={30}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="kd-wm-label font-semibold">Font</label>
        <Dropdown value={f.font} options={FONT_OPTIONS} onChange={(v) => set({ font: v })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="kd-wm-label font-semibold">Size</label>
        <Dropdown
          value={`${f.fontSize}px`}
          options={SIZE_OPTIONS.map((s) => `${s}px`)}
          onChange={(v) => set({ fontSize: parseInt(v, 10) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="kd-wm-label font-semibold">Color</label>

          <div className="kdwmtextedit-input flex py-1.5 items-center justify-between px-2.5 text-[10px]">
            <input
              type="text"
              value={f.color}
              onChange={(e) => set({ color: e.target.value })}
              className="kdwmtextedit-color-text w-[58px] bg-transparent text-[10px] outline-none"
            />

            <label className="relative cursor-pointer">
              <div
                className="h-2 w-9 rounded-full"
                style={{ backgroundColor: f.color }}
              />
              <input
                type="color"
                value={f.color}
                onChange={(e) => set({ color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="kd-wm-label font-semibold">Opacity</label>
          <Dropdown
            value={`${f.opacityPct}%`}
            options={OPACITY_OPTIONS.map((o) => `${o}%`)}
            onChange={(v) => set({ opacityPct: parseInt(v, 10) as OpacityPct })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="kd-wm-label font-semibold">Rotation</label>
          <Dropdown
            value={`${f.rotation}\u00b0`}
            options={["-90\u00b0", "-45\u00b0", "-35\u00b0", "0\u00b0", "35\u00b0", "45\u00b0", "90\u00b0"]}
            onChange={(v) => set({ rotation: parseInt(v, 10) })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="kd-wm-label font-semibold">Letter Spacing</label>
          <Dropdown value={f.letterSpacing} options={LETTER_SPACING_OPTIONS} onChange={(v) => set({ letterSpacing: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set({ pattern: "single" })}
          className={`kd-wm-pattern-btn ${f.pattern === "single" ? "kd-wm-pattern-btn-active" : ""}
            py-1.5   transition-colors`}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => set({ pattern: "grid" })}
          className={`kd-wm-pattern-btn ${f.pattern === "grid" ? "kd-wm-pattern-btn-active" : ""}
            py-1.5transition-colors`}
        >
          Grid
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="kd-wm-cancel-btn flex-1 py-1.5 rounded-lg border font-semibold transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { if (f.text.trim()) onSave(f); }}
          disabled={!f.text.trim()}
          className="kd-wm-save-btn flex-1 py-1.5 rounded-lg font-bold transition-all"
        >
          {mode === "create" ? "Add" : "Save"}
        </button>
      </div>

    </div>
  );
};


export const ImageEditor: React.FC<{
  initialSrc?: string | null;
  initialScale?: string;
  initialRotation?: number;
  initialOpacityPct?: OpacityPct;
  onSave: (
    src: string,
    scale: string,
    rotation: number,
    opacityPct: OpacityPct,
  ) => void;
  onCancel: () => void;
}> = ({
  initialSrc,
  initialScale,
  initialRotation,
  initialOpacityPct,
  onSave,
  onCancel,
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(initialSrc ?? null);
  // Seeded from the saved watermark: reopening the editor used to reset the
  // scale to Auto and silently resize the watermark on save.
  const [scale, setScale] = useState<string>(initialScale ?? "Auto");
  const [rotation, setRotation] = useState<number>(initialRotation ?? 0);
  const [opacityPct, setOpacityPct] = useState<OpacityPct>(
    initialOpacityPct ?? 60,
  );
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const token = useProjectInfoStore((s) => s.token);
  const api_url = useProjectInfoStore((s) => s.api_url);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image_url", file, file.name);
      formData.append("access_token", token || "");

      const res = await fetch(`${api_url}sl_editor_crop_image`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.status === 1 && data.url) {
        setImgSrc(data.url);
      } else {
        console.error("Upload failed:", data);
      }
    } catch (err) {
      console.error("Watermark image upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!imgSrc ? (
        // <div
        //   className={`kd-wm-dropzone ${dragOver ? "kd-wm-dropzone-dragover" : ""}
        //     flex flex-col items-center justify-center gap-2.5 text-center px-4 py-7 rounded-xl border border-dashed cursor-pointer transition-colors`}
        //   onClick={() => !uploading && inputRef.current?.click()}
        //   onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        //   onDragLeave={() => setDragOver(false)}
        //   onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        // >
        //   <span className="kd-wm-dropzone-icon-circle w-11 h-11 rounded-full border-2 flex items-center justify-center">
        //     {Icon.cloudUpload}
        //   </span>
        //   <div>
        //     <p className="kd-wm-dropzone-title font-semibold">
        //       {uploading ? "Uploading..." : "Upload image here"}
        //     </p>
        //     <p className="kd-wm-dropzone-subtitle mt-1 leading-snug">
        //       Supports: JPG, PNG, WEBP<br />Max size: 10MB
        //     </p>
        //   </div>
        //   <input
        //     ref={inputRef}
        //     type="file"
        //     accept="image/jpeg,image/png,image/webp"
        //     className="hidden"
        //     disabled={uploading}
        //     onChange={(e) => handleFiles(e.target.files)}
        //   />
        // </div>

        <div
          className={`kd-media-upload-dropbox min-h-40 ${dragOver ? "kd-media-upload-dragover" : ""
            }`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >

          <div className="kd-media-upload-main-icon">
            {uploading ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              KdMediaUpladIcon(30, 30)
            )}
          </div>

          <p className="kd-media-upload-drop-text">
            {uploading ? "Uploading..." : "Upload image here"}
          </p>

          <p className="kd-media-upload-file-info text-center">
            Supports: JPG, PNG, WEBP <br />
            Max size: 10MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>




      ) : (
        <div className="kd-wm-image-preview relative flex items-center justify-center min-h-40 rounded-xl border overflow-hidden">
          <Image
            src={imgSrc}
            alt="Watermark"
            height={100}
            width={100}
            unoptimized
            className="max-w-full max-h-40 object-contain"
          />
          <button
            type="button"
            className="kd-wm-image-remove-btn absolute top-2 right-2 w-6 h-6 rounded-md border flex items-center justify-center transition-colors"
            onClick={() => setImgSrc(null)}
            title="Remove image"
          >
            {Icon.close}
          </button>
        </div>
      )}

      {imgSrc && (
        <>
      <div className="flex items-center gap-2">
        {/* Label art, not a control — it used to be a button with no click
            handler, so pressing it did nothing. */}
        <span
          aria-hidden
          className="kd-wm-icon-btn-square w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center"
        >
          {Icon.expand}
        </span>
        <span className="kd-wm-label font-semibold shrink-0">Scale</span>
        <div className="flex-1">
          <Dropdown value={scale} options={SCALE_OPTIONS} onChange={setScale} />
        </div>
      </div>

      {/* The renderer has always honoured rotation and opacity on an image
          watermark; only the text editor ever exposed them. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="kd-wm-label font-semibold">Rotation</label>
          <Dropdown
            value={`${rotation}°`}
            options={[...ROTATION_OPTIONS]}
            onChange={(v) => setRotation(parseInt(v, 10))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="kd-wm-label font-semibold">Opacity</label>
          <Dropdown
            value={`${opacityPct}%`}
            options={OPACITY_OPTIONS.map((o) => `${o}%`)}
            onChange={(v) => setOpacityPct(parseInt(v, 10) as OpacityPct)}
          />
        </div>
      </div>


      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="kd-wm-cancel-btn flex-1 py-1.5 rounded-lg border font-semibold transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (imgSrc) onSave(imgSrc, scale, rotation, opacityPct);
          }}
          className="kd-wm-save-btn flex-1 py-1.5 rounded-lg font-bold transition-all"
        >
          Save
        </button>
      </div>
        </>
      )}


    </div>
  );
};
