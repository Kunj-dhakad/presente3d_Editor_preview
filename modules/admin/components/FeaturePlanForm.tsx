"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, CheckCheck, Layers, LoaderCircle, Save, Search, X } from "lucide-react";
import type { Feature, FeaturePlan } from "./useBms";

export default function FeaturePlanForm({ features, value, onClose, onSave }: { features: Feature[]; value: FeaturePlan | null; onClose: () => void; onSave: (value: Record<string, unknown>) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const [name, setName] = useState(value?.plan_name ?? "");
  const [ids, setIds] = useState<number[]>(value?.feature_ids ?? []);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = features.filter(feature => feature.feature.toLowerCase().includes(query.trim().toLowerCase()));
  const count = features.filter(feature => ids.includes(feature.id)).length;
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    nameInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  return <dialog ref={dialog} className="fs-plan-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form className="fs-plan-form" aria-busy={busy} onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setError("");
      try { await onSave({ id: value?.id, plan_name: name.trim(), feature_ids: ids, status: value?.status ?? "active" }); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
      finally { setBusy(false); }
    }}>
      <header className="fs-plan-dialog-header">
        <span className="fs-plan-dialog-icon" aria-hidden="true"><Layers size={23} /></span>
        <div><span className="fs-plan-dialog-eyebrow">FEATURE PLAN</span><h2 id={`${id}-title`}>{value ? "Edit feature plan" : "Create feature plan"}</h2><p id={`${id}-description`}>Choose what your packages unlock for customers.</p></div>
        <button type="button" className="fs-plan-close" disabled={busy} aria-label="Close feature plan" onClick={onClose}><X size={19} /></button>
      </header>
      <div className="fs-plan-dialog-body">
        <label className="fs-plan-name" htmlFor={`${id}-name`}>Plan name<input ref={nameInput} id={`${id}-name`} name="plan_name" value={name} placeholder="e.g. Business features" maxLength={120} required disabled={busy} onChange={event => setName(event.target.value)} /></label>
        <fieldset className="fs-plan-features" disabled={busy}>
          <legend>Included features <span>{count} / {features.length} selected</span></legend>
          <div className="fs-plan-picker-toolbar">
            <div className="fs-plan-search"><Search size={16} aria-hidden="true" /><input aria-label="Search features" placeholder="Search features..." value={query} onChange={event => setQuery(event.target.value)} /></div>
            <div className="fs-plan-bulk"><button type="button" disabled={busy || !features.length || count === features.length} onClick={() => setIds(current => [...new Set([...current, ...features.map(feature => feature.id)])])}><CheckCheck size={14} />Select all</button><button type="button" disabled={busy || !ids.length} onClick={() => setIds([])}>Clear</button></div>
          </div>
          <div className="fs-plan-feature-grid">
            {visible.map(feature => <label key={feature.id} className={`fs-plan-feature${ids.includes(feature.id) ? " selected" : ""}`}><input type="checkbox" checked={ids.includes(feature.id)} onChange={() => setIds(current => current.includes(feature.id) ? current.filter(item => item !== feature.id) : [...current, feature.id])} /><span className="fs-plan-checkbox" aria-hidden="true"><Check size={12} /></span><span>{feature.feature}</span></label>)}
            {!visible.length && <p className="fs-plan-no-results">{features.length ? "No features match your search." : "No features available yet."}</p>}
          </div>
        </fieldset>
        {error && <p className="fs-alert" role="alert">{error}</p>}
      </div>
      <footer className="fs-plan-dialog-footer"><span className="fs-plan-selection-summary"><Layers size={14} />{count} feature{count === 1 ? "" : "s"} selected</span><div><button type="button" className="fs-btn fs-outline" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="fs-btn fs-primary" disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="fs-spin" size={16} /> : <Save size={16} />}{busy ? "Saving..." : value ? "Save changes" : "Create plan"}</button></div></footer>
    </form>
  </dialog>;
}
