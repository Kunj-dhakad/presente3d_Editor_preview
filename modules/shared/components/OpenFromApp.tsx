/**
 * Shown when the preview is opened on its own: it shows the presentation the
 * PHP app sends it (see @shared/parentBridge), so there is nothing to show.
 */
export function OpenFromApp() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0b2638", background: "#f7f7fb" }}>
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Nothing to preview yet</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "#5d7a8c", margin: 0 }}>
          Open the preview from your dashboard, or add ?template=&lt;presentation JSON URL&gt; to this address.
        </p>
      </div>
    </main>
  );
}
