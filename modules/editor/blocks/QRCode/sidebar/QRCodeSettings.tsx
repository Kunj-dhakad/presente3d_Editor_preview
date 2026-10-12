"use client";

import React, { useEffect, useState } from "react";
import useEditorStore, { QRCodeData } from "@editor/store/editorStore";
import {
  Block,
  Field,
  Hint,
  Section,
  Segmented,
  Swatch,
  fullInput,
  primaryButton,
} from "@editor/layout/EditBarPanel/SettingsControls";
import {
  DEFAULT_EC,
  DEFAULT_QR_BACKGROUND,
  DEFAULT_QR_FOREGROUND,
  encodeQR,
  hasScannableContrast,
  type ErrorCorrection,
} from "../qr";

const EC_LEVELS: { value: ErrorCorrection; label: string }[] = [
  { value: "L", label: "L" },
  { value: "M", label: "M" },
  { value: "Q", label: "Q" },
  { value: "H", label: "H" },
];

/**
 * Editing an existing QR code.
 *
 * Content is held in a draft until Apply: every keystroke would otherwise
 * re-encode the symbol and push an undo entry for half-typed text.
 */
export default function QRCodeSettings() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);

  const element = slides[activeSlide]?.elements.find(
    (el) => el.id === activeElementId,
  );
  const data =
    element && element.data.type === "qr-code"
      ? (element.data as QRCodeData)
      : null;

  const [draft, setDraft] = useState(data?.content ?? "");
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);

  // Selecting a different QR should show that code's content, not the last one.
  const elementId = element?.id;
  useEffect(() => {
    setDraft(data?.content ?? "");
    setContrastWarning(null);
    // Keyed on the element, not on its content, so typing is not overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  if (!element || !data) return null;

  const patch = (value: Partial<QRCodeData>) =>
    updateElement(element.id, value, { history: true });

  const foreground = data.foreground ?? DEFAULT_QR_FOREGROUND;
  const background = data.background ?? DEFAULT_QR_BACKGROUND;
  const trimmed = draft.trim();
  const encodable = !!encodeQR(trimmed, data.ecLevel ?? DEFAULT_EC);
  const dirty = trimmed !== data.content;

  /** Colours are only committed when the result would still scan. */
  const setColours = (next: { foreground?: string; background?: string }) => {
    const fg = next.foreground ?? foreground;
    const bg = next.background ?? background;
    if (!hasScannableContrast(fg, bg)) {
      setContrastWarning(
        "Those two colours are too close for a scanner to tell apart, so the code was left as it was.",
      );
      return;
    }
    setContrastWarning(null);
    patch(next);
  };

  return (
    <div className="pb-6">
      <Section title="Content">
        <Field label="URL or text" stacked>
          <textarea
            className={fullInput}
            rows={3}
            value={draft}
            placeholder="https://example.com"
            onChange={(event) => setDraft(event.target.value)}
          />
        </Field>
        <Block>
          <button
            type="button"
            className={`${primaryButton} w-full`}
            disabled={!encodable || !dirty}
            // The element is updated in place: editing a QR must never leave
            // the old one behind and drop a new one on top of it.
            onClick={() => patch({ content: trimmed, bookLink: false })}
          >
            Apply
          </button>
          {!encodable && trimmed && (
            <p className="kd-set-error">
              That is too long to fit in a QR code — shorten it, or link to it
              instead.
            </p>
          )}
        </Block>
        <Hint>The code is regenerated from this text every time it is drawn.</Hint>
      </Section>

      <Section title="Colours">
        <Field label="Code">
          <Swatch
            color={foreground}
            onChange={(next) => setColours({ foreground: next })}
          />
        </Field>
        <Field label="Background">
          <Swatch
            color={background}
            onChange={(next) => setColours({ background: next })}
          />
        </Field>
        {contrastWarning ? (
          <Block>
            <p className="kd-set-error">{contrastWarning}</p>
          </Block>
        ) : (
          <Hint>A dark code on a light background scans most reliably.</Hint>
        )}
      </Section>

      <Section title="Error correction">
        <Field label="Level">
          <Segmented
            options={EC_LEVELS}
            active={data.ecLevel ?? DEFAULT_EC}
            onChange={(next) => patch({ ecLevel: next })}
          />
        </Field>
        <Hint>
          Higher levels stay readable when the code is partly covered or
          printed small, at the cost of a denser pattern.
        </Hint>
      </Section>
    </div>
  );
}
