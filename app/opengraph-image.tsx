import { ImageResponse } from "next/og";
import { SITE } from "@shared/site";
import { BRAND } from "@shared/brand";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "80px", background: `linear-gradient(120deg,${BRAND.subtle},#f7f5ff)`, fontFamily: "serif" }}>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: BRAND.accent, fontFamily: "sans-serif" }}>{SITE.name}</div>
        <div style={{ fontSize: 76, color: BRAND.ink, lineHeight: 1.1, marginTop: 28 }}>Your ideas deserve their own book.</div>
        <div style={{ fontSize: 28, color: "#7a7193", marginTop: 28, fontFamily: "sans-serif" }}>AI-powered book writing, design and publishing.</div>
      </div>
      <div style={{ display: "flex", width: 250, height: 340, background: BRAND.accent, borderLeft: `12px solid ${BRAND.hover}`, borderRadius: "6px 16px 16px 6px", color: "#fff", fontSize: 40, padding: 32, transform: "rotate(-8deg)", lineHeight: 1.4 }}>YOUR NEXT CHAPTER</div>
    </div>,
    size,
  );
}
