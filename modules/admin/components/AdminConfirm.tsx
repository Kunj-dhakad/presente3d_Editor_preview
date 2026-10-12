"use client";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle, X } from "lucide-react";

export default function AdminConfirm({ title, message, label, danger = false, onCancel, onConfirm }: {
  title: string; message: string; label: string; danger?: boolean; onCancel: () => void; onConfirm: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className={`fs-admin-confirm${danger ? " fs-admin-confirm-danger" : ""}`} aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-message" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <button className="fs-confirm-close" aria-label="Close confirmation" disabled={busy} onClick={onCancel}><X size={18} /></button>
    <span className="fs-confirm-icon" aria-hidden="true"><CircleAlert size={28} /></span>
    <h2 id="admin-confirm-title">{title}</h2>
    <p id="admin-confirm-message">{message}</p>
    {error && <p className="fs-confirm-error" role="alert">{error}</p>}
    <div className="fs-confirm-buttons">
      <button className="fs-confirm-cancel" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="fs-confirm-submit" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await onConfirm(); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
      }}>{busy && <LoaderCircle className="fs-spin" size={16} />}{busy ? "Please wait..." : label}</button>
    </div>
  </dialog>;
}
