// import { toPng } from "html-to-image";

// export async function getFirstSlideImage(
//   slideEl: HTMLDivElement
// ): Promise<string> {
//   await document.fonts.ready;

//   const dataUrl = await toPng(slideEl, {
//     pixelRatio: 3,
//     cacheBust: true,
//     backgroundColor: getComputedStyle(slideEl).backgroundColor,
//   });

//   return dataUrl; // 👈 base64 image
// }


import { toPng, getFontEmbedCSS } from "html-to-image";

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k9kAAAAASUVORK5CYII=";

async function getSafeFontCSS(el: HTMLElement): Promise<string> {
  try {
    return await getFontEmbedCSS(el);
  } catch (err) {
    console.warn("Skipping invalid fonts:", err);
    return "";
  }
}

export async function getFirstSlideImage(
  slideEl: HTMLDivElement
): Promise<string> {
  try {
    // wait fonts
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);

    const fontCSS = await getSafeFontCSS(slideEl);

    const dataUrl = await toPng(slideEl, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: getComputedStyle(slideEl).backgroundColor,
      fontEmbedCSS: fontCSS,
    });

    // ✅ safety check (agar empty ya invalid aaye)
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      return TRANSPARENT_PIXEL;
    }

    return dataUrl;
  } catch (error) {
    console.warn("Image generation failed, using fallback image:", error);

    // ✅ fallback image — no error throw
    return TRANSPARENT_PIXEL;
  }
}