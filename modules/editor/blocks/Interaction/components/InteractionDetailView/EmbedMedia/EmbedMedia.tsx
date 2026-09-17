"use client";
import React, { useMemo, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Film, Link2, Sparkles, Video } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import { parseMediaUrl } from "./media";
import { useAddInteraction } from "../../useAddInteraction";

/** What the parser actually understands — worth saying out loud in the panel. */
const SOURCES = [
  "YouTube",
  "Vimeo",
  "Loom",
  "Twitch",
  "DailyMotion",
  "Streamable",
  "Wistia",
  "Figma",
  "Canva",
  "Adobe Express",
  "Instagram",
  "Pinterest",
  "Giphy",
  "Imgur",
  "Direct image",
  "Direct video",
];

const TYPE_ICON = {
  image: ImageIcon,
  video: Film,
  embed: Sparkles,
} as const;

export default function EmbedMedia({ onBack }: { onBack: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const { addInteraction } = useAddInteraction();

  // Parsing is cheap and synchronous, so the panel can show what it detected
  // while the URL is still being typed.
  const media = useMemo(
    () =>
      parseMediaUrl(
        url,
        typeof window === "undefined" ? "localhost" : window.location.hostname,
      ),
    [url],
  );

  const add = () => {
    if (!media) return setError("Use a supported media URL.");
    addInteraction("embed-media");
    const store = useEditorStore.getState();
    const element = store.slides[store.activeSlide]?.elements.at(-1);
    if (element)
      store.updateElement(
        element.id,
        {
          url: media.originalUrl,
          embedUrl: media.embedUrl,
          provider: media.platformName,
          renderMode: media.renderMode,
          thumbnail: media.thumbnailUrl,
        },
        { history: true },
      );
    onBack();
  };

  const TypeIcon = media ? TYPE_ICON[media.type] : Sparkles;

  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button type="button" onClick={onBack} className="kd-icon-btn" aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="kd-panel-header-title">Embed Media</h2>
          <p className="kd-panel-subtext">Drop in a video, design or image link</p>
        </div>
      </div>

      <div className="kd-panel-divider" />

      <div className="kd-panel-body kd-custom-scrollbar">
        <div className="kd-embed">
          <label className="kd-embed-input-wrap">
            <Link2 size={15} className="kd-embed-input-icon" />
            <input
              autoFocus
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Paste a link — YouTube, Figma, image…"
              className="kd-embed-input"
            />
          </label>

          {error && <p className="kd-pick-error">{error}</p>}

          {media ? (
            <div className="kd-embed-preview">
              <div className="kd-embed-preview-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.thumbnailUrl} alt="" referrerPolicy="no-referrer" />
              </div>
              <div className="kd-embed-preview-meta">
                <span className="kd-embed-preview-name">
                  <TypeIcon size={13} />
                  {media.platformName}
                </span>
                <span className="kd-embed-badge">{media.type}</span>
                <span className="kd-embed-preview-url">{media.originalUrl}</span>
              </div>
            </div>
          ) : (
            <div className="kd-embed-placeholder">
              <Video size={22} />
              <span>Nothing detected yet</span>
              <small>Paste a link above and the preview shows up here.</small>
            </div>
          )}

          <div className="kd-embed-sources">
            <p className="kd-panel-section-title">Works with</p>
            <div className="kd-embed-chips">
              {SOURCES.map((name) => (
                <span key={name} className="kd-embed-chip">
                  {name}
                </span>
              ))}
            </div>
            <p className="kd-panel-subtext">
              Anything else opens as a plain link instead of an inline player.
            </p>
          </div>
        </div>
      </div>

      <div className="kd-panel-footer">
        <button
          type="button"
          onClick={add}
          disabled={!media}
          className="kd-set-action kd-set-action-primary w-full"
        >
          <Video size={14} /> Embed media
        </button>
      </div>
    </div>
  );
}
