"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, Loader2, Search, Sparkles, Upload } from "lucide-react";
import { createClient } from "@editor/lib/pexels-client";
import useProjectInfoStore from "@editor/store/projectInfoStore";

const pexels = createClient();

export type PickerTab = "upload" | "stock" | "ai";
type Tab = PickerTab;
type Asset = { id: string; image_url: string };
type StockPhoto = { id: number; preview: string; full: string };

const TABS: [Tab, React.ComponentType<{ size?: number }>, string][] = [
  ["upload", Upload, "Upload"],
  ["stock", Search, "Stock"],
  ["ai", Sparkles, "AI"],
];

const MAX_PROMPT_LENGTH = 1000;

/**
 * Rendered by the host so it can sit outside the scroll container — a sticky
 * bar inside the scroller is at the mercy of whatever wrapper the host uses.
 */
export function SlideshowPickerTabs({
  tab,
  onChange,
}: {
  tab: PickerTab;
  onChange: (tab: PickerTab) => void;
}) {
  return (
    <div className="kd-pick-tabs">
      {TABS.map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`kd-pick-tab ${tab === value ? "kd-pick-tab-on" : ""}`}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

type GridItem = { key: string | number; preview: string; full: string };

/** `items === null` means the list is still loading. */
function PickerGrid({
  items,
  selected,
  onPick,
}: {
  items: GridItem[] | null;
  selected: string[];
  onPick: (src: string) => void;
}) {
  if (items === null)
    return (
      <div className="kd-pick-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="kd-skeleton kd-pick-tile" aria-hidden />
        ))}
      </div>
    );

  if (!items.length) return <p className="kd-pick-note">Nothing here yet.</p>;

  return (
    <div className="kd-pick-grid">
      {items.map((item) => {
        const isPicked = selected.includes(item.full);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onPick(item.full)}
            className={`kd-pick-tile ${isPicked ? "kd-pick-tile-on" : ""}`}
          >
            <Image src={item.preview} alt="" width={160} height={160} unoptimized />
            {isPicked && (
              <span className="kd-pick-tile-check">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Image picker for the slideshow builder. Deliberately renders as plain flow
 * content with no scroll container of its own — the host panel owns the one
 * scrollbar, so nothing ever nests.
 */
export default function SlideshowImagePicker({
  selected,
  onPick,
  tab: controlledTab,
  onTabChange,
}: {
  selected: string[];
  onPick: (src: string) => void;
  /** Pass with `onTabChange` to render the tab bar yourself. */
  tab?: PickerTab;
  onTabChange?: (tab: PickerTab) => void;
}) {
  const [ownTab, setOwnTab] = useState<Tab>("upload");
  const controlled = controlledTab !== undefined && onTabChange !== undefined;
  const tab = controlled ? controlledTab : ownTab;

  const token = useProjectInfoStore((s) => s.token);
  const apiUrl = useProjectInfoStore((s) => s.api_url);

  /* ---------------- uploads ---------------- */
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Asset[] | null>(null);
  const [uploadsVersion, setUploadsVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    let live = true;
    const body = new FormData();
    body.append("access_token", token || "");
    fetch(`${apiUrl}sl_editor_listing`, { method: "POST", body })
      .then((res) => res.json())
      .then((data) => live && setUploads(data?.result || []))
      .catch(() => live && setUploads([]));
    return () => {
      live = false;
    };
  }, [apiUrl, token, uploadsVersion]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("access_token", token || "");
      await fetch(`${apiUrl}sl_editor_image_upload`, { method: "POST", body });
      setUploads(null);
      setUploadsVersion((n) => n + 1);
    } catch {
      /* the list simply stays as it was */
    }
    setUploading(false);
  };

  const addFromUrl = () => {
    const value = url.trim();
    if (!value) return;
    setUrlError("");
    const probe = new window.Image();
    probe.onload = () => {
      onPick(value);
      setUrl("");
    };
    probe.onerror = () => setUrlError("This image URL could not be loaded.");
    probe.src = value;
  };

  /* ---------------- stock ---------------- */
  const [query, setQuery] = useState("nature");
  const [stock, setStock] = useState<StockPhoto[] | null>(null);
  const [stockVersion, setStockVersion] = useState(0);

  useEffect(() => {
    let live = true;
    pexels.photos
      .search({ query: query.trim() || "nature", per_page: 18, orientation: "landscape" })
      .then((res) => {
        if (!live || !("photos" in res)) return;
        setStock(
          res.photos.map((photo) => ({
            id: photo.id,
            preview: photo.src.medium,
            full: photo.src.original,
          })),
        );
      })
      .catch(() => live && setStock([]));
    return () => {
      live = false;
    };
    // `query` is applied on submit, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockVersion]);

  /* ---------------- ai ---------------- */
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiImages, setAiImages] = useState<Asset[] | null>(null);
  const [aiVersion, setAiVersion] = useState(0);

  useEffect(() => {
    let live = true;
    const body = new FormData();
    body.append("access_token", token || "");
    fetch(`${apiUrl}sl_editor_Ai_generate_image_list`, { method: "POST", body })
      .then((res) => res.json())
      .then((data) => live && setAiImages(data?.result || []))
      .catch(() => live && setAiImages([]));
    return () => {
      live = false;
    };
  }, [apiUrl, token, aiVersion]);

  const generate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const body = new FormData();
      body.append("access_token", token || "");
      body.append("prompt", prompt);
      const res = await fetch(`${apiUrl}sl_editor_Ai_generate_image`, { method: "POST", body });
      const data = await res.json();
      if (data?.image_url) onPick(data.image_url);
      setPrompt("");
      setAiImages(null);
      setAiVersion((n) => n + 1);
    } catch {
      /* keep the prompt so it can be retried */
    }
    setGenerating(false);
  };

  return (
    <div className="kd-pick">
      {!controlled && <SlideshowPickerTabs tab={tab} onChange={setOwnTab} />}

      {tab === "upload" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void uploadFile(file);
            }}
            className={`kd-pick-drop ${dragOver ? "kd-pick-drop-over" : ""}`}
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            <span>{uploading ? "Uploading…" : "Drop an image or browse"}</span>
            <small>JPG, PNG, WebP up to 10MB</small>
          </button>

          <div className="kd-pick-row">
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (urlError) setUrlError("");
              }}
              onKeyDown={(event) => event.key === "Enter" && addFromUrl()}
              placeholder="Paste image URL"
              className="kd-pick-input"
            />
            <button
              type="button"
              onClick={addFromUrl}
              disabled={!url.trim()}
              className="kd-pick-btn"
            >
              Add
            </button>
          </div>
          {urlError && <p className="kd-pick-error">{urlError}</p>}

          <PickerGrid
            selected={selected}
            onPick={onPick}
            items={
              uploads?.map((asset) => ({
                key: asset.id,
                preview: asset.image_url,
                full: asset.image_url,
              })) ?? null
            }
          />
        </>
      )}

      {tab === "stock" && (
        <>
          <div className="kd-pick-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setStock(null);
                  setStockVersion((n) => n + 1);
                }
              }}
              placeholder="Search stock images"
              className="kd-pick-input"
            />
            <button
              type="button"
              onClick={() => {
                setStock(null);
                setStockVersion((n) => n + 1);
              }}
              className="kd-pick-btn"
              aria-label="Search"
            >
              <Search size={13} />
            </button>
          </div>

          <PickerGrid
            selected={selected}
            onPick={onPick}
            items={
              stock?.map((photo) => ({
                key: photo.id,
                preview: photo.preview,
                full: photo.full,
              })) ?? null
            }
          />
        </>
      )}

      {tab === "ai" && (
        <>
          <div className="kd-pick-prompt-head">
            <span>Describe the image</span>
            <small>
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </small>
          </div>
          <textarea
            value={prompt}
            maxLength={MAX_PROMPT_LENGTH}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder="e.g. modern office, sunset view"
            className="kd-pick-textarea"
          />
          <button
            type="button"
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className="kd-pick-btn kd-pick-btn-primary"
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {generating ? "Generating…" : "Generate image"}
          </button>

          <PickerGrid
            selected={selected}
            onPick={onPick}
            items={
              aiImages?.map((asset) => ({
                key: asset.id,
                preview: asset.image_url,
                full: asset.image_url,
              })) ?? null
            }
          />
        </>
      )}
    </div>
  );
}
