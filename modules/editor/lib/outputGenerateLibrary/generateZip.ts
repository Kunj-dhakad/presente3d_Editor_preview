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
    const form = new FormData();
    form.append("file", zipBlob, "book.zip");
    const upload = await fetch("/api/exports", {method:"POST",body:form});
    if (!upload.ok) throw new Error("Could not save the exported file.");
    saveAs(zipBlob, "slides.zip");
    setImageExportMode(false);

  } catch (err) {
    setImageExportMode(false);
    console.error("ZIP EXPORT FAILED ❌", err);
    throw err;
  }
}
