"use client";
import AdminLoading from "./AdminLoading";
import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Mail, RotateCcw, Send } from "lucide-react";

type Template = {
  id: string; name: string; description: string; when: string; variables: string[];
  subject: string; heading: string; body: string; actionLabel: string | null; footer: string | null;
  enabled: boolean; edited?: boolean; updated_at?: string | null;
};
type LogRow = { id: string; template: string; recipient: string; subject: string; status: string; error: string | null; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminEmails() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/emails", { cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setTemplates(data.templates); setLog(data.log); setConfigured(data.configured);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load emails."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // A save reloads the list; the first load takes the screen, later ones do not.
  if (loading && !templates.length) return error
    ? <p className="fs-alert" role="alert">{error}</p>
    : <AdminLoading label="Loading emails..." />;

  return <div className="fs-admin-emails" aria-busy={loading}>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {!configured && <p className="fs-alert">Email sending is not configured on this server (SMTP_HOST and MAIL_FROM). You can still edit the wording here.</p>}
    <div className="fs-email-list">
      {templates.map(template => <EmailCard key={template.id} template={template} open={openId === template.id}
        onToggle={() => setOpenId(id => id === template.id ? "" : template.id)} onSaved={load} />)}
    </div>

    <section className="fs-settings-card fs-wide">
      <h2><Mail size={18} /> Recently sent</h2>
      {log.length ? <table className="fs-admin-table">
        <thead><tr><th>Email</th><th>To</th><th>Status</th><th>When</th></tr></thead>
        <tbody>{log.map(row => <tr key={row.id}>
          <td>{templates.find(t => t.id === row.template)?.name ?? row.template}<br /><small>{row.subject}</small></td>
          <td>{row.recipient}</td>
          <td>{row.status === "sent" ? <span className="fs-pill-ok">Sent</span> : <span className="fs-pill-bad" title={row.error || undefined}>Failed</span>}</td>
          <td>{when(row.created_at)}</td>
        </tr>)}</tbody>
      </table> : <p className="fs-muted">Nothing has been sent yet.</p>}
    </section>
  </div>;
}

function EmailCard({ template, open, onToggle, onSaved }: { template: Template; open: boolean; onToggle: () => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(template);
  const [busy, setBusy] = useState(""); const [note, setNote] = useState(""); const [error, setError] = useState("");
  useEffect(() => { setDraft(template); }, [template]);

  const set = (field: keyof Template) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft(current => ({ ...current, [field]: event.target.value }));

  async function call(action: "save" | "reset" | "test") {
    setBusy(action); setError(""); setNote("");
    try {
      const request = action === "save"
        ? fetch(`/api/admin/emails/${template.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
        : action === "reset"
          ? fetch(`/api/admin/emails/${template.id}`, { method: "DELETE" })
          : fetch("/api/admin/emails/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: template.id }) });
      const res = await request;
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      if (action === "test") setNote(`Test email sent to ${data.to}.`);
      else { setNote(action === "save" ? "Saved. Customers receive this wording from now on." : "Back to the original wording."); await onSaved(); }
    } catch (e) { setError(e instanceof Error ? e.message : "That did not work."); }
    finally { setBusy(""); }
  }

  return <section className={`fs-email-card${open ? " open" : ""}`}>
    <button type="button" className="fs-email-head" aria-expanded={open} onClick={onToggle}>
      <span>
        <strong>{template.name}</strong>
        <small>{template.description} · {template.when}</small>
      </span>
      <span className="fs-email-tags">
        {!template.enabled && <em className="fs-pill-bad">Off</em>}
        {template.edited && <em className="fs-pill-ok">Edited</em>}
      </span>
    </button>
    {open && <div className="fs-email-body">
      <label>Subject<input value={draft.subject} maxLength={200} onChange={set("subject")} /></label>
      <label>Heading<input value={draft.heading} maxLength={200} onChange={set("heading")} /></label>
      <label>Message<textarea rows={6} value={draft.body} maxLength={4000} onChange={set("body")} /></label>
      <div className="fs-field-row">
        <label>Button label<input value={draft.actionLabel ?? ""} maxLength={80} placeholder="No button" onChange={set("actionLabel")} /></label>
        <label>Small print<input value={draft.footer ?? ""} maxLength={300} onChange={set("footer")} /></label>
      </div>
      <label className="fs-checkline"><input type="checkbox" checked={draft.enabled} onChange={e => setDraft(c => ({ ...c, enabled: e.target.checked }))} />Send this email</label>
      <p className="fs-muted fs-small">Placeholders: {template.variables.map(v => `{{${v}}}`).join(" · ")}</p>
      {error && <p className="fs-alert" role="alert">{error}</p>}
      {note && <p className="fs-note"><Check size={15} />{note}</p>}
      <div className="fs-row">
        <button className="fs-btn fs-primary fs-btn-sm" disabled={Boolean(busy)} onClick={() => void call("save")}>{busy === "save" && <LoaderCircle className="fs-spin" size={15} />}Save</button>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={Boolean(busy)} onClick={() => void call("test")}>{busy === "test" ? <LoaderCircle className="fs-spin" size={15} /> : <Send size={15} />}Send me a test</button>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={Boolean(busy) || !template.edited} onClick={() => void call("reset")}><RotateCcw size={15} />Reset wording</button>
      </div>
    </div>}
  </section>;
}
