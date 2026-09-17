"use client";
import React, { memo, useEffect } from "react";
import useEditorStore from "@editor/store/editorStore";
import type { WatermarkData } from "@editor/store/editorStore";
import { loadGoogleFont } from "@shared/fonts/useFontLoader";
import Image from 'next/image'

export type { WatermarkData };


const letterSpacingToEm = (value?: string): string => {
  if (!value) return "0.15em";
  const pct = parseFloat(value);
  if (Number.isNaN(pct)) return "0.15em";
  return `${(pct / 100).toFixed(3)}em`;
};

const Stamp: React.FC<{
  text: string; color: string; opacity: number;
  fontSize: number; rotation: number; x: number; y: number;
  font?: string; letterSpacing?: string;
}> = ({ text, color, opacity, fontSize, rotation, x, y, font, letterSpacing }) => (
  <div style={{
    position: "absolute", left: x, top: y,
    // transform: `rotate(${rotation}deg)`, transformOrigin: "center center",
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    color, opacity, fontSize, fontWeight: 800,
    fontFamily: font ? `'${font}', sans-serif` : "'Plus Jakarta Sans', sans-serif",
    letterSpacing: letterSpacingToEm(letterSpacing), textTransform: "uppercase",
    whiteSpace: "nowrap", userSelect: "none", pointerEvents: "none", lineHeight: 1,
  }}>
    {text}
  </div>
);

const ImageStamp: React.FC<{
  src: string; opacity: number; rotation: number;
  scale?: string; canvasWidth: number; canvasHeight: number;
}> = ({ src, opacity, rotation, scale, canvasWidth, canvasHeight }) => {
  const widthStyle = !scale || scale === "Auto" ? "60%" : scale;

  return (
    <div style={{
      position: "absolute", left: 0, top: 0,
      width: canvasWidth, height: canvasHeight,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Image
        src={src}
        alt=""
        height={100}
        width={100}
        unoptimized
        style={{
          width: widthStyle,
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          opacity,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
          userSelect: "none",
          pointerEvents: "none",
        }}
        draggable={false}
      />
    </div>
  );
};

interface Props {
  id: string;
  data: WatermarkData;
  slideIndex: number;
}

const RenderWatermark: React.FC<Props> = memo(({ data, slideIndex }) => {
  const slide = useEditorStore((s) => s.slides[slideIndex]);
  const canvasWidth = slide?.width ?? 350;
  const canvasHeight = slide?.height ?? 434;

  const { text, color, opacity = 1, fontSize, rotation = -35, pattern, font, letterSpacing, imageSrc, scale } = data;

  // The picker offers families the app never imports (Montserrat is the
  // default, Inter is on the list), so without this the watermark rendered in
  // whatever the browser fell back to and changing the font did nothing.
  useEffect(() => {
    if (!imageSrc && font) void loadGoogleFont(font);
  }, [font, imageSrc]);

  if (imageSrc) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        width: canvasWidth, height: canvasHeight,
        overflow: "hidden", pointerEvents: "none",
        userSelect: "none", zIndex: data.zIndex ?? 9999,
      }} aria-hidden="true">
        <ImageStamp
          src={imageSrc}
          opacity={opacity}
          rotation={rotation}
          scale={scale}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      </div>
    );
  }

  const approxW = text.length * fontSize * 0.6;
  const approxH = fontSize * 1.2;
  const stamps: React.ReactNode[] = [];

  if (pattern === "grid") {
    const rad = Math.abs((rotation * Math.PI) / 180);
    const bboxW = approxW * Math.abs(Math.cos(rad)) + approxH * Math.abs(Math.sin(rad));
    const bboxH = approxW * Math.abs(Math.sin(rad)) + approxH * Math.abs(Math.cos(rad));
    const gapX = bboxW * 1.4;
    const gapY = bboxH * 1.9;
    const cols = Math.ceil(canvasWidth / gapX) + 2;
    const rows = Math.ceil(canvasHeight / gapY) + 2;

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const staggerX = r % 2 === 0 ? 0 : gapX / 2;
        stamps.push(
          <Stamp key={`${r}-${c}`} text={text} color={color} opacity={opacity}
            fontSize={fontSize} rotation={rotation}
            x={c * gapX + staggerX - approxW / 2}
            y={r * gapY - approxH / 2}

            font={font} letterSpacing={letterSpacing}
          />
        );
      }
    }
  } else {
    stamps.push(
      <Stamp key="single" text={text} color={color} opacity={opacity}
        fontSize={fontSize} rotation={rotation}
        x={canvasWidth / 2}
        y={canvasHeight / 2}
        font={font} letterSpacing={letterSpacing}
      />
    );
  }

  return (
    <div style={{
      position: "absolute", inset: 0,
      width: canvasWidth, height: canvasHeight,
      overflow: "hidden", pointerEvents: "none",
      userSelect: "none", zIndex: data.zIndex ?? 9999,
    }} aria-hidden="true">
      {stamps}
    </div>
  );
});

RenderWatermark.displayName = "RenderWatermark";
export default RenderWatermark;