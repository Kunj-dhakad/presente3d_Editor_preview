"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CloudUpload, FileText, ImageIcon, Info, LoaderCircle, X } from "lucide-react";
import { bookPath } from "@shared/bookUrl";
import { BOOK_PAGE_LIMIT, PDF_SIZE_LIMIT } from "@shared/aiBook";

type Kind = "pdf" | "images";
const PHOTO_LIMIT = 15 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function FlipBookCreator() {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("pdf");
  const [pdf, setPdf] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "building">("idle");
  const [progress, setProgress] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const busy = stage !== "idle";
  const ready = title.trim().length > 0 && (kind === "pdf" ? Boolean(pdf) : photos.length > 0);

  function take(files: FileList | File[]) {
    setError("");
    const list = Array.from(files);
    if (kind === "pdf") {
      const file = list[0];
      if (!file) return;
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setError("Choose a PDF file."); return; }
      if (file.size > PDF_SIZE_LIMIT) { setError("Choose a PDF smaller than 10 MB."); return; }
      setPdf(file);
      if (!title) setTitle(file.name.replace(/\.pdf$/i, "").slice(0, 160));
      return;
    }
    const valid = list.filter(file => PHOTO_TYPES.includes(file.type));
    if (valid.length < list.length) setError("Only JPG, PNG and WebP photos can be added.");
    const tooBig = valid.find(file => file.size > PHOTO_LIMIT);
    if (tooBig) { setError(`${tooBig.name} is larger than 15 MB.`); return; }
    setPhotos(current => {
      const next = [...current, ...valid].slice(0, BOOK_PAGE_LIMIT);
      if (current.length + valid.length > BOOK_PAGE_LIMIT) setError(`A book can hold up to ${BOOK_PAGE_LIMIT} photos.`);
      return next;
    });
  }

  function save() {
    if (!ready || busy) {
      if (!title.trim()) setError("Give your book a name.");
      else if (!ready) setError(kind === "pdf" ? "Choose a PDF to upload." : "Add at least one photo.");
      return;
    }
    const form = new FormData();
    form.set("title", title.trim());
    form.set("kind", kind);
    if (kind === "pdf" && pdf) form.set("file", pdf);
    else photos.forEach(photo => form.append("files", photo));

    // XHR rather than fetch: it reports upload progress.
    const request = new XMLHttpRequest();
    request.open("POST", "/api/books/flip");
    request.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100)); };
    request.upload.onload = () => setStage("building");
    request.onload = () => {
      let data: { error?: string; id?: string; short_id?: string | null; title?: string } = {};
      try { data = JSON.parse(request.responseText); } catch { /* handled below */ }
      if (request.status >= 200 && request.status < 300 && data.id) {
        window.location.assign(bookPath({ id: data.id, short_id: data.short_id ?? null, title: data.title || title }));
        return;
      }
      setError(data.error || "Your book could not be created. Please try again.");
      setStage("idle");
    };
    request.onerror = () => { setError("The upload was interrupted. Check your connection and try again."); setStage("idle"); };
    setError(""); setProgress(0); setStage("uploading");
    request.send(form);
  }

  const files = kind === "pdf" ? (pdf ? [pdf] : []) : photos;

  return <main className="fs-content fs-dash fs-flip">
    <section className="fs-dash-head">
      <div>
        <Link href="/books" className="fs-back-link"><ArrowLeft size={15} /> AI Books</Link>
        <h1>Create Flip and Photo Book</h1>
        <p className="fs-muted">Turn a PDF or your photos into an interactive flip book.</p>
      </div>
      <button className="fs-btn fs-primary" onClick={save} disabled={busy}>
        {busy && <LoaderCircle size={17} className="fs-spin" />}
        {stage === "uploading" ? `Uploading ${progress}%` : stage === "building" ? "Building pages…" : "Save & Next"}
      </button>
    </section>

    {error && <p className="fs-alert" role="alert">{error}</p>}

    <section className="fs-flip-card">
      <label htmlFor="flip-title" className="fs-flip-label">Book Name <span title="Shown on your dashboard and in the reader"><Info size={14} /></span></label>
      <input id="flip-title" placeholder="Enter book name here" maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} />
    </section>

    <section className="fs-flip-card">
      <div className="fs-flip-tabs" role="tablist" aria-label="Upload type">
        <button role="tab" aria-selected={kind === "pdf"} className={kind === "pdf" ? "on" : ""} disabled={busy} onClick={() => { setKind("pdf"); setError(""); }}><FileText size={16} />PDF</button>
        <button role="tab" aria-selected={kind === "images"} className={kind === "images" ? "on" : ""} disabled={busy} onClick={() => { setKind("images"); setError(""); }}><ImageIcon size={16} />Image</button>
      </div>

      <div
        className={`fs-flip-drop${dragging ? " dragging" : ""}`}
        role="button" tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !busy) { event.preventDefault(); input.current?.click(); } }}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) take(event.dataTransfer.files); }}
      >
        <input
          ref={input} type="file" hidden disabled={busy}
          accept={kind === "pdf" ? ".pdf,application/pdf" : "image/jpeg,image/png,image/webp"}
          multiple={kind === "images"}
          onChange={event => { if (event.target.files) take(event.target.files); event.target.value = ""; }}
        />
        <span className="fs-flip-icon"><CloudUpload size={46} /></span>
        <div>
          <strong>Upload <em>{kind === "pdf" ? "your PDF" : "your photos"}</em> or drag &amp; drop here</strong>
          <ul>
            {kind === "pdf" ? <>
              <li>Maximum file size: 10 MB · up to {BOOK_PAGE_LIMIT} pages</li>
              <li>Supported format: PDF</li>
              <li>Every PDF page becomes a book page</li>
            </> : <>
              <li>Up to {BOOK_PAGE_LIMIT} photos · 15 MB each</li>
              <li>Supported formats: JPG, PNG, WebP</li>
              <li>Each photo becomes a page, in the order you add them</li>
            </>}
          </ul>
        </div>
      </div>

      {files.length > 0 && <ul className="fs-flip-files">
        {files.map((file, index) => <li key={`${file.name}-${index}`}>
          {kind === "pdf" ? <FileText size={18} /> : <ImageIcon size={18} />}
          <span><strong>{file.name}</strong><small>{mb(file.size)}{kind === "images" ? ` · page ${index + 1}` : ""}</small></span>
          <button type="button" aria-label={`Remove ${file.name}`} disabled={busy}
            onClick={() => kind === "pdf" ? setPdf(null) : setPhotos(current => current.filter((_, i) => i !== index))}><X size={16} /></button>
        </li>)}
      </ul>}

      {stage !== "idle" && <div className="fs-flip-progress">
        <progress value={stage === "building" ? undefined : progress} max={100} aria-label="Upload progress" />
        <small>{stage === "uploading" ? "Uploading your files…" : kind === "pdf" ? "Turning each PDF page into a book page…" : "Placing your photos on pages…"} Keep this tab open.</small>
      </div>}
    </section>

    <footer className="fs-dash-footer">All rights reserved to <strong>AI Book Creator</strong></footer>
  </main>;
}
