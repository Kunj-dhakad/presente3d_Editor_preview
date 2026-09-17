"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Redo2, Eye, Download, Share2, Pencil, Check, LoaderCircle } from "lucide-react";
import { brandLogo } from "@shared/siteArt";
import useEditorStore from "@editor/store/editorStore";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import ShareModal from "@editor/layout/header/ShareModal";
import PreviewPopup from "@editor/layout/header/EditorPreview/PreviewPopup";
import ThemeToggle from "@editor/layout/header/ThemeToggle";
import { useBookSave } from "./EditorWorkspace";

export default function EditorHeader() {
  const id = useProjectInfoStore(s => s.id);
  const name = useProjectInfoStore(s => s.name);
  const setName = useProjectInfoStore(s => s.setName);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);

  const [title, setTitle] = useState(name || "");
  const [editing, setEditing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);

  const saving = useBookSave();
  useEffect(() => setTitle(name || ""), [name]);
  useEffect(() => { if (editing) titleRef.current?.select(); }, [editing]);

  async function rename() {
    setEditing(false);
    if (!title.trim() || title === name) { setTitle(name || ""); return; }
    try {
      const res = await fetch("/api/books/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName(title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed.");
      setTitle(name || "");
    }
  }

  // Save first so the reader shows the latest pages, then open the publish page,
  // which creates the public link.
  async function publish() {
    setPublishing(true); setError("");
    try {
      await saving.flush();
      router.push(`/books/${id}/publish?publish=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the book. Try again.");
      setPublishing(false);
    }
  }

  const saved = saving.status === "Saved";

  return <>
    <header className="kd-eh">
      <div className="kd-eh-left">
        <Link href="/dashboard" className="kd-eh-home" aria-label="Back to dashboard" title="Back to dashboard"><ArrowLeft size={18} /></Link>
        {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo from S3 */}
        <img className="kd-eh-logo" src={brandLogo} width={32} height={32} alt="" />
      </div>

      {/* One chip: click it (or the pencil) to rename, Enter or blur to save. */}
      <div className="kd-eh-title">
        <span className={`kd-eh-chip${editing ? " kd-eh-chip-on" : ""}`}>
          <input
            ref={titleRef} aria-label="Book title" value={title} maxLength={160} readOnly={!editing}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => void rename()}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitle(name || ""); setEditing(false); e.currentTarget.blur(); } }}
            style={{ width: `${Math.min(34, Math.max(8, title.length + 1))}ch` }}
          />
          <button type="button" aria-label={editing ? "Save title" : "Rename book"} title={editing ? "Save title" : "Rename book"}
            onClick={() => editing ? void rename() : titleRef.current?.focus()}>
            {editing ? <Check size={14} /> : <Pencil size={14} />}
          </button>
        </span>
        <span className={`kd-eh-status${saved ? "" : " kd-eh-status-busy"}`} role="status">{saving.status}</span>
      </div>

      <div className="kd-eh-right">
        <ThemeToggle />
        <button className="kd-eh-btn" onClick={() => setPreviewOpen(true)} aria-label="Preview book"><Eye size={16} /><span className="kd-eh-label">Preview</span></button>
        <span className="kd-eh-group">
          <button className="kd-eh-btn kd-eh-icon" onClick={undo} aria-label="Undo" title="Undo"><Undo2 size={16} /></button>
          <button className="kd-eh-btn kd-eh-icon" onClick={redo} aria-label="Redo" title="Redo"><Redo2 size={16} /></button>
        </span>
        <button className="kd-eh-btn" onClick={() => setExportOpen(true)} aria-label="Export book"><span className="kd-eh-label">Export</span><Download size={16} /></button>
        <button className="kd-eh-btn kd-eh-primary" onClick={() => void publish()} disabled={publishing} aria-label="Publish book">
          {publishing ? <LoaderCircle className="kd-eh-spin" size={15} /> : <Share2 size={15} />}<span className="kd-eh-label">{publishing ? "Saving…" : "Publish"}</span>
        </button>
      </div>
    </header>

    <ShareModal open={exportOpen} setOpen={setExportOpen} />
    {previewOpen && <PreviewPopup onClose={() => setPreviewOpen(false)} />}

    {error && <div className="fs-draft-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
  </>;
}
