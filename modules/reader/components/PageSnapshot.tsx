"use client";

import React, { useEffect, useRef } from "react";
import { toBlob } from "html-to-image";
import { BookPreviewProvider, useBookPreview } from "../context/BookPreviewContext";
import PageRenderer from "../render/PageRenderer";

/**
 * Renders page 1 of a book out of sight and hands back a PNG of it — used to
 * make library covers. `onDone(null)` means the picture could not be made.
 */
export default function PageSnapshot({ json, onDone }: { json: string; onDone: (image: Blob | null) => void }) {
  return (
    <BookPreviewProvider json={json}>
      <Snapshot onDone={onDone} />
    </BookPreviewProvider>
  );
}

const TRANSPARENT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k9kAAAAASUVORK5CYII=";
const WAIT_MS = 10_000;

/** Resolves once every picture on the page has loaded or failed (or time runs out). */
function imagesSettled(root: HTMLElement) {
  const pending = Array.from(root.querySelectorAll("img")).filter(image => !image.complete);
  if (!pending.length) return Promise.resolve();
  return Promise.race([
    Promise.all(pending.map(image => new Promise(resolve => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    }))),
    new Promise(resolve => setTimeout(resolve, WAIT_MS)),
  ]);
}

/** Google Fonts stylesheets the page loads, from <link> tags and same-origin @imports. */
function fontSheets() {
  const urls = new Set<string>();
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]').forEach(link => urls.add(link.href));
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSImportRule && rule.href.includes("fonts.googleapis.com")) urls.add(rule.href);
    }
  }
  return [...urls];
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/**
 * @font-face rules (latin only) for the families used on the page, with the
 * font files inlined. html-to-image cannot read cross-origin stylesheets itself
 * and fills the console with errors trying, so the CSS is handed to it instead.
 */
async function fontEmbedCss(root: HTMLElement) {
  const families = new Set<string>();
  root.querySelectorAll<HTMLElement>("*").forEach(element => {
    const family = getComputedStyle(element).fontFamily.split(",")[0]?.replace(/["']/g, "").trim();
    if (family) families.add(family.replace(/ /g, "+"));
  });
  const sheets = fontSheets().filter(url => [...families].some(family => url.includes(`family=${family}:`) || url.includes(`family=${family}&`) || url.endsWith(`family=${family}`)));
  const blocks: string[] = [];
  for (const url of sheets) {
    try {
      const css = await (await fetch(url)).text();
      // Google labels each block with its subset: keep the latin ones.
      const latin = css.split(/(?=\/\* )/).filter(block => /^\/\* latin \*\//.test(block));
      for (const block of latin.length ? latin : [css]) {
        let inlined = block;
        for (const [, src] of block.matchAll(/url\((https:[^)]+)\)/g)) {
          const file = await fetch(src);
          if (file.ok) inlined = inlined.replace(src, await toDataUrl(await file.blob()));
        }
        blocks.push(inlined);
      }
    } catch { /* that family falls back to a system font */ }
  }
  return blocks.join("\n");
}

function Snapshot({ onDone }: { onDone: (image: Blob | null) => void }) {
  const { pages, theme, loading, parseError } = useBookPreview();
  const node = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    if (finished.current || loading) return;
    const finish = (image: Blob | null) => { if (!finished.current) { finished.current = true; done.current(image); } };
    if (parseError || !pages.length || !node.current) { finish(null); return; }
    const element = node.current;
    let cancelled = false;
    (async () => {
      try {
        await document.fonts.ready;
        await imagesSettled(element);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        if (cancelled) return;
        const fonts = await fontEmbedCss(element);
        if (cancelled) return;
        const image = await toBlob(element, { pixelRatio: 2, cacheBust: true, imagePlaceholder: TRANSPARENT, backgroundColor: "#ffffff", fontEmbedCSS: fonts });
        finish(image);
      } catch { finish(null); }
    })();
    return () => { cancelled = true; };
  }, [pages, loading, parseError]);

  if (!pages.length) return null;
  return (
    // In the viewport (so nothing lazy-loads late) but invisible and inert.
    <div aria-hidden="true" style={{ position: "fixed", left: 0, top: 0, opacity: 0, pointerEvents: "none", zIndex: -1, overflow: "hidden" }}>
      <div ref={node} style={{ width: theme.pageWidth, height: theme.pageHeight, position: "relative", overflow: "hidden", background: "#fff" }}>
        <PageRenderer page={pages[0]} pageNumber={1} thumbnail />
      </div>
    </div>
  );
}
