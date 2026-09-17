"use client";
import { useEffect, useState } from "react";
import { PageSnapshot } from "@reader/index";

/**
 * Makes missing or out-of-date covers one book at a time: loads the book,
 * pictures page 1 in the browser and stores it. Books that fail are not
 * retried until the page is opened again.
 */
const failed = new Set<string>();

export default function CoverMaker({ ids, onCover }: { ids: string[]; onCover: (id: string, cover: string | null) => void }) {
  const next = ids.find(id => !failed.has(id));
  const [job, setJob] = useState<{ id: string; json: string } | null>(null);

  useEffect(() => {
    if (!next || job) return;
    let active = true;
    fetch(`/api/books/${next}`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error("load")))
      .then(data => { if (active) setJob({ id: next, json: JSON.stringify(data.document) }); })
      .catch(() => { failed.add(next); if (active) onCover(next, null); });
    return () => { active = false; };
  }, [next, job, onCover]);

  if (!job) return null;
  return <PageSnapshot key={job.id} json={job.json} onDone={async image => {
    let cover: string | null = null;
    if (image) {
      try {
        const response = await fetch(`/api/books/${job.id}/cover`, { method: "PUT", headers: { "Content-Type": image.type || "image/png" }, body: image });
        if (response.ok) cover = (await response.json()).cover;
      } catch { /* shown with the fallback cover */ }
    }
    if (!cover) failed.add(job.id);
    onCover(job.id, cover);
    setJob(null);
  }} />;
}
