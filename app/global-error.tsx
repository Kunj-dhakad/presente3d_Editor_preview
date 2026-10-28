"use client";
import { BRAND } from "@shared/brand";

// Replaces the root layout when it fails, so it ships its own minimal styling.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif", background: "#f8f9fc", color: "#202432" }}>
    <div style={{ textAlign: "center", padding: 24 }}>
      <h1 style={{ fontSize: 24 }}>Present 3D is temporarily unavailable</h1>
      <p style={{ color: "#777d8c" }}>Please try again in a moment.</p>
      <button onClick={reset} style={{ marginTop: 16, padding: "11px 19px", borderRadius: 9, border: 0, background: BRAND.accent, color: "#fff", fontSize: 14, cursor: "pointer" }}>Try again</button>
    </div>
  </body></html>;
}
