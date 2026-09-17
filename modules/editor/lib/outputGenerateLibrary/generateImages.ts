import { getFontEmbedCSS, toPng } from "html-to-image";
import { getSlideRefs } from "./slideRefRegistry";

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k9kAAAAASUVORK5CYII=";

function patchBrokenImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  const patched: { img: HTMLImageElement; src: string }[] = [];

  imgs.forEach((img) => {
    if (!img.complete || img.naturalWidth === 0) {
      patched.push({ img, src: img.src });
      img.src = TRANSPARENT_PIXEL;
    }
  });

  return () => {
    patched.forEach(({ img, src }) => {
      img.src = src;
    });
  };
}

// Slides outside the active window aren't mounted (see the virtualization in
// main.tsx). The caller flips imageExportMode to force them all to mount, but
// that mount + commit + paint happens asynchronously in React, so wait two
// animation frames — the standard way to be sure the DOM reflects the state
// change — before reading anything off the slide refs.
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function generateImages() {
  await waitForPaint();

  const refs = getSlideRefs();
  const images: { index: number; dataUrl: string }[] = [];

  await document.fonts.ready;

  for (let i = 0; i < refs.length; i++) {
    const node = refs[i];
    if (!node) continue;

    const prevBorder = node.style.border;
    node.style.border = "none";

    // 🔥 KEY FIX
    const restoreImages = patchBrokenImages(node);
// new function add 
    async function getSafeFontCSS(el: HTMLElement): Promise<string> {
      try {
        return await getFontEmbedCSS(el);
      } catch (err) {
        console.warn("Skipping invalid fonts:", err);
        return "";
      }
    }


    try {
      const fontCSS = await getSafeFontCSS(node);

      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: getComputedStyle(node).backgroundColor,
        // skipFonts: true,
        // new add
        fontEmbedCSS: fontCSS,
      });

      images.push({ index: i, dataUrl });
    } catch (err) {
      console.error(`Slide ${i + 1} export failed`, err);

      // ❗ LAST RESORT — blank slide still export
      const fallback = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: getComputedStyle(node).backgroundColor,
      });

      images.push({ index: i, dataUrl: fallback });
    } finally {
      restoreImages(); // 🔁 restore real images
      node.style.border = prevBorder;
    }
  }

  return images;
}
