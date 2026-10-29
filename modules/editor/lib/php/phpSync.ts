import type { SlideType } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { generateImages } from "@editor/lib/outputGenerateLibrary/generateImages";
import { apiFetch, PPT_EXPORT_URL } from "@shared/apiFetch";

/**
 * Saving goes to the PHP app, the same endpoints the old editor used
 * (application/controllers/default/Presentation_Editor_Api_Controller.php).
 * Every call is a form post carrying the presentation id and access token.
 */
export type PhpProject = { apiUrl: string; id: string; token: string };

type PhpReply = { status?: number | string; message?: string };

async function post(project: PhpProject, action: string, fields: Record<string, string | Blob>, files: Record<string, [Blob, string]> = {}) {
  const form = new FormData();
  form.append("id", project.id);
  form.append("access_token", project.token);
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const [key, [blob, name]] of Object.entries(files)) form.append(key, blob, name);
  const res = await fetch(project.apiUrl + action, { method: "POST", body: form });
  let body: PhpReply | null = null;
  try { body = await res.json(); } catch { /* PHP printed HTML: an error page or a missing route */ }
  if (!res.ok || !body || Number(body.status) !== 1) {
    throw new Error(body?.message || `The server could not save this presentation (${res.status}).`);
  }
  return body;
}

const documentJson = (slides: SlideType[]) => JSON.stringify({ slides });

/** Autosave: only the slide JSON. */
export function saveDraft(project: PhpProject, slides: SlideType[]) {
  return post(project, "sl_editor_json_auto_save_upload", { json: documentJson(slides) });
}

export function renamePresentation(project: PhpProject, title: string) {
  return post(project, "sl_editor_video_title_update", { title });
}

const dataUrlToBlob = (dataUrl: string) => fetch(dataUrl).then(r => r.blob());

/**
 * Publish: everything PHP keeps beside the JSON. A PowerPoint file (built by
 * /api/generate-ppt; PHP downloads it from the returned URL), a thumbnail of
 * slide 1, and a zip of every slide as PNG, which PHP unpacks into slides_thumbs.
 */
export async function publishPresentation(project: PhpProject, slides: SlideType[]) {
  const ui = useEditorUIStore.getState();
  let images: { index: number; dataUrl: string }[];
  ui.setImageExportMode(true);
  try {
    images = await generateImages();
  } finally {
    ui.setImageExportMode(false);
  }
  if (!images.length) throw new Error("Could not render the slides. Try again.");

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const image of images) zip.file(`slide-${image.index + 1}.png`, await dataUrlToBlob(image.dataUrl));
  const slidesZip = await zip.generateAsync({ type: "blob" });
  const thumbnail = await dataUrlToBlob(images[0].dataUrl);

  const res = await apiFetch(PPT_EXPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slides }),
  });
  const ppt = await res.json().catch(() => null);
  if (!res.ok || !ppt?.url) throw new Error(ppt?.error || "The PowerPoint file could not be created.");

  return post(
    project,
    "sl_editor_json_ppt_upload",
    { json: documentJson(slides), ppt_file: ppt.url },
    { thumbnail: [thumbnail, "thumbnail.png"], slides_zip: [slidesZip, "slides.zip"] },
  );
}
