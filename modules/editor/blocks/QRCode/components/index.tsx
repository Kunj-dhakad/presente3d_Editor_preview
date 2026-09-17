"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, QrCode } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import {
  DEFAULT_EC,
  DEFAULT_QR_BACKGROUND,
  DEFAULT_QR_CONTENT,
  DEFAULT_QR_FOREGROUND,
  encodeQR,
  qrPath,
} from "../qr";

const SIZE = 160;


export default function QRCodeLibrary() {
  const [content, setContent] = useState(DEFAULT_QR_CONTENT);
  const addElement = useEditorStore((s) => s.addElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const setCategory = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];

  const matrix = useMemo(() => encodeQR(content, DEFAULT_EC), [content]);

  const insert = () => {
    if (!matrix) return;
    addElement({
      type: "qr-code",
      content: content.trim(),
      ecLevel: DEFAULT_EC,
      foreground: DEFAULT_QR_FOREGROUND,
      background: DEFAULT_QR_BACKGROUND,
      x: Math.max(16, ((canvas?.width ?? SIZE) - SIZE) / 2),
      y: Math.max(16, ((canvas?.height ?? SIZE) - SIZE) / 2),
      width: SIZE,
      height: SIZE,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
    });
  };

  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-label="Back to elements"
          className="kd-icon-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="kd-panel-header-title">QR Code</h2>
          <p className="kd-panel-subtext">Elements / QR Code</p>
        </div>
      </div>
      <div className="kd-panel-divider" />

      <div className="kd-panel-body kd-custom-scrollbar" style={{ display: "block" }}>
        <label
          className="kd-panel-subtext"
          style={{ display: "block", marginBottom: 6, fontWeight: 600 }}
        >
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="https://example.com or any text"
          className="kd-set-input kd-set-input-full"
          style={{ resize: "vertical", marginBottom: 12 }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 12,
            borderRadius: "var(--kd-r-sm)",
            border: "1px solid var(--kd-border-subtle)",
            background: "var(--kd-accent-soft)",
            marginBottom: 12,
          }}
        >
          {matrix ? (
            <svg
              viewBox={`0 0 ${matrix.size} ${matrix.size}`}
              width={132}
              height={132}
              role="img"
              aria-label="QR preview"
            >
              <rect width={matrix.size} height={matrix.size} fill={DEFAULT_QR_BACKGROUND} />
              <path d={qrPath(matrix)} fill={DEFAULT_QR_FOREGROUND} />
            </svg>
          ) : (
            <span className="kd-panel-subtext" style={{ padding: "44px 0" }}>
              {content.trim() ? "Content is too long for a QR code" : "Enter content to preview"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={insert}
          disabled={!matrix}
          className="kd-set-action kd-set-action-primary"
          style={{ width: "100%" }}
        >
          <QrCode size={14} /> Add to page
        </button>
      </div>
    </div>
  );
}
