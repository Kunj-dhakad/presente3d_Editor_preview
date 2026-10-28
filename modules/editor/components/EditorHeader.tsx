"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Undo2, Redo2, Eye, Download, Share2, Pencil, Check, LoaderCircle } from "lucide-react";
import { brandLogo } from "@shared/siteArt";
import useEditorStore from "@editor/store/editorStore";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { renamePresentation } from "@editor/lib/php/phpSync";
import ShareModal from "@editor/layout/header/ShareModal";
import PreviewPopup from "@editor/layout/header/EditorPreview/PreviewPopup";
import ThemeToggle from "@editor/layout/header/ThemeToggle";
import { inIframe, notifyParent } from "@shared/parentBridge";
import { usePresentationSave } from "./EditorWorkspace";

export default function EditorHeader() {
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
  const titleRef = useRef<HTMLInputElement>(null);

  const saving = usePresentationSave();
  useEffect(() => setTitle(name || ""), [name]);
  useEffect(() => { if (editing) titleRef.current?.select(); }, [editing]);

  async function rename() {
    setEditing(false);
    const next = title.trim();
    if (!next || next === name) { setTitle(name || ""); return; }
    // Opened on its own there is no presentation in PHP to rename.
    if (!saving.project) { setName(next); return; }
    try {
      await renamePresentation(saving.project, next.slice(0, 250));
      setName(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed.");
      setTitle(name || "");
    }
  }

  async function publish() {
    setPublishing(true); setError("");
    try {
      await saving.publish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish the presentation. Try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function back() {
    // Leave only once the latest slides are stored; say so if they cannot be.
    try {
      await saving.flush();
      notifyParent("EDITOR_BACK");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the presentation.");
    }
  }

  const saved = saving.status === "Saved";

  return <>
    <header className="kd-eh">
      <div className="kd-eh-left">
        {/* Only the PHP page has somewhere to go back to. The header renders after load, on the client. */}
        {inIframe() && <button type="button" className="kd-eh-home" onClick={() => void back()} aria-label="Back to presentations" title="Back to presentations"><ArrowLeft size={18} /></button>}
        {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo from S3 */}
        <img className="kd-eh-logo" src={brandLogo} width={32} height={32} alt="" />
      </div>

      {/* One chip: click it (or the pencil) to rename, Enter or blur to save. */}
      <div className="kd-eh-title">
        <span className={`kd-eh-chip${editing ? " kd-eh-chip-on" : ""}`}>
          <input
            ref={titleRef} aria-label="Presentation title" value={title} maxLength={250} readOnly={!editing}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => void rename()}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitle(name || ""); setEditing(false); e.currentTarget.blur(); } }}
            style={{ width: `${Math.min(34, Math.max(8, title.length + 1))}ch` }}
          />
          <button type="button" aria-label={editing ? "Save title" : "Rename presentation"} title={editing ? "Save title" : "Rename presentation"}
            onClick={() => editing ? void rename() : titleRef.current?.focus()}>
            {editing ? <Check size={14} /> : <Pencil size={14} />}
          </button>
        </span>
        <span className={`kd-eh-status${saved ? "" : " kd-eh-status-busy"}`} role="status">{saving.status}</span>
      </div>

      <div className="kd-eh-right">
        <ThemeToggle />
        <button className="kd-eh-btn" onClick={() => setPreviewOpen(true)} aria-label="Preview presentation"><Eye size={16} /><span className="kd-eh-label">Preview</span></button>
        <span className="kd-eh-group">
          <button className="kd-eh-btn kd-eh-icon" onClick={undo} aria-label="Undo" title="Undo"><Undo2 size={16} /></button>
          <button className="kd-eh-btn kd-eh-icon" onClick={redo} aria-label="Redo" title="Redo"><Redo2 size={16} /></button>
        </span>
        <button className="kd-eh-btn" onClick={() => setExportOpen(true)} aria-label="Export presentation"><span className="kd-eh-label">Export</span><Download size={16} /></button>
        <button className="kd-eh-btn kd-eh-primary" onClick={() => void publish()} disabled={publishing} aria-label="Publish presentation">
          {publishing ? <LoaderCircle className="kd-eh-spin" size={15} /> : <Share2 size={15} />}<span className="kd-eh-label">{publishing ? "Publishing…" : "Publish"}</span>
        </button>
      </div>
    </header>

    <ShareModal open={exportOpen} setOpen={setExportOpen} />
    {previewOpen && <PreviewPopup onClose={() => setPreviewOpen(false)} />}

    {error && <div className="fs-draft-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
  </>;
}
