import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generateImages } from "./generateImages";
import useEditorUIStore from "@editor/store/useEditorUIStore";

export async function generateSlidesZip() {
    const { setImageExportMode } = useEditorUIStore.getState();

  try {
    setImageExportMode(true);
    const images = await generateImages();

    const zip = new JSZip();

    for (const img of images) {
      const blob = await fetch(img.dataUrl).then((r) => r.blob());
      zip.file(`slide-${img.index + 1}.png`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });

    // 🔽 DOWNLOAD TRIGGER
    saveAs(zipBlob, "slides.zip");
    setImageExportMode(false);

  } catch (err) {
    setImageExportMode(false);
    console.error("ZIP EXPORT FAILED ❌", err);
    throw err;
  }
}
