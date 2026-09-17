"use client";
import React from "react";
import useEditorStore, {
  InteractionData,
  isInteractionData,
} from "@editor/store/editorStore";
import { parseMediaUrl } from "../components/InteractionDetailView/EmbedMedia/media";
import {
  Field,
  Hint,
  Section,
  Swatch,
  Switch,
  fullInput,
  numberInput,
  smallInput,
} from "@editor/layout/EditBarPanel/SettingsControls";

export default function EmbedMediaSettings() {
  const slides = useEditorStore((s) => s.slides),
    activeSlide = useEditorStore((s) => s.activeSlide),
    activeId = useEditorStore((s) => s.activeElementId),
    update = useEditorStore((s) => s.updateElement);
  const element = slides[activeSlide]?.elements.find(
    (item) => item.id === activeId,
  );
  if (
    !element ||
    !isInteractionData(element.data) ||
    element.data.interactionKind !== "embed-media"
  )
    return null;
  const data = element.data as InteractionData,
    patch = (value: Partial<InteractionData>) =>
      update(element.id, value, { history: true });
  const setUrl = (url: string) => {
    const media = parseMediaUrl(
      url,
      typeof window === "undefined" ? "localhost" : window.location.hostname,
    );
    patch(
      media
        ? {
            url,
            embedUrl: media.embedUrl,
            provider: media.platformName,
            renderMode: media.renderMode,
            thumbnail: media.thumbnailUrl,
          }
        : { url },
    );
  };
  const number = (
    key: "width" | "height" | "borderRadius" | "padding",
    value: string,
  ) => patch({ [key]: Math.max(0, Number(value) || 0) });

  return (
    <div className="pb-6">
      {/* The panel used to ask for the URL twice — a "Media URL" field and a
          "Replace URL" one, both writing the same key. One is enough. */}
      <Section title="Embed media">
        <Field label="Media URL" stacked>
          <input
            className={fullInput}
            value={data.url ?? ""}
            placeholder="https://..."
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <Field label="Provider">
          <span className="kd-set-readout">
            {data.provider ?? "Unsupported URL"}
          </span>
        </Field>
        {data.thumbnail && (
          <div className="kd-set-block">
            <img
              src={data.thumbnail}
              alt="Media thumbnail"
              className="kd-set-preview"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </Section>

      <Section title="Playback">
        <Field label="Autoplay in preview">
          <Switch
            on={!!data.autoplay}
            onChange={(next) => patch({ autoplay: next })}
          />
        </Field>
        <Field label="Show controls">
          <Switch
            on={data.controls !== false}
            onChange={(next) => patch({ controls: next })}
          />
        </Field>
        <Field label="Allow fullscreen">
          <Switch
            on={data.allowFullscreen !== false}
            onChange={(next) => patch({ allowFullscreen: next })}
          />
        </Field>
        <Hint>Autoplay is honoured by the reader; most browsers require it muted.</Hint>
      </Section>

      <Section title="Box">
        <Field label="Size (W × H)">
          <input
            type="number"
            className={smallInput}
            value={data.width}
            onChange={(e) => number("width", e.target.value)}
          />
          <input
            type="number"
            className={smallInput}
            value={data.height}
            onChange={(e) => number("height", e.target.value)}
          />
        </Field>
        <Field label="Corner radius">
          <input
            type="number"
            min="0"
            className={numberInput}
            value={data.borderRadius ?? 0}
            onChange={(e) => number("borderRadius", e.target.value)}
          />
        </Field>
        <Field label="Padding">
          <input
            type="number"
            min="0"
            className={numberInput}
            value={data.padding ?? 0}
            onChange={(e) => number("padding", e.target.value)}
          />
        </Field>
        <Field label="Background">
          <Swatch
            color={data.backgroundColor ?? "#f8fafc"}
            onChange={(next) => patch({ backgroundColor: next })}
          />
        </Field>
      </Section>
    </div>
  );
}
