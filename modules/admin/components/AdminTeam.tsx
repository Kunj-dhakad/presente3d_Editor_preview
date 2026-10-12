"use client";
import AdminLoading from "./AdminLoading";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, Plus, Trash2 } from "lucide-react";

type Admin = { id: string; email: string; name: string; role: "owner" | "manager"; disabled_at: string | null; last_login_at: string | null; created_at: string };

const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";

export default function AdminTeam({ self }: { self: { id: string; role: string } }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busyId, setBusyId] = useState("");
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const owner = self.role === "owner";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/admins", { cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setAdmins(data.admins);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load administrators."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function patch(admin: Admin, body: Record<string, unknown>) {
    setBusyId(admin.id); setError("");
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
    finally { setBusyId(""); }
  }

  async function remove(admin: Admin) {
    if (!window.confirm(`Remove ${admin.email}? They lose access to this panel immediately.`)) return;
    setBusyId(admin.id); setError("");
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove them."); }
    finally { setBusyId(""); }
  }

  function password(admin: Admin) {
    const value = window.prompt(`New password for ${admin.email} (a letter, a number and a symbol):`);
    if (value) void patch(admin, { password: value });
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), name: form.get("name"), password: form.get("password"), role: form.get("role") }),
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setOpen(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add them."); }
    finally { setSaving(false); }
  }

  return <section className="fs-settings-card fs-wide fs-admin-team">
    <div className="fs-team-toolbar">
      <p className="fs-muted fs-small">{admins.length} administrator{admins.length === 1 ? "" : "s"}. Owners can add, disable and remove the others.</p>
      {owner && <button className="fs-btn fs-primary fs-btn-sm" onClick={() => setOpen(true)}><Plus size={15} />Add administrator</button>}
    </div>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    <div className="fs-team-table-scroll" role="region" aria-label="Administrators" tabIndex={0}>
    <table className="fs-admin-table">
      <thead><tr><th>Administrator</th><th>Role</th><th>Last sign-in</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        {loading ? <tr><td colSpan={5}><AdminLoading label="Loading team..." compact /></td></tr>
          : admins.map(admin => <tr key={admin.id} className={admin.disabled_at ? "fs-row-suspended" : ""}>
            <td><div className="fs-team-identity"><span className="fs-team-avatar" aria-hidden="true">{admin.name.slice(0, 1).toUpperCase()}</span><div><div className="fs-team-name"><strong>{admin.name}</strong>{admin.id === self.id && <span className="fs-team-you">You</span>}</div><small>{admin.email}</small></div></div></td>
            <td>{owner && admin.id !== self.id
              ? <select aria-label={`Role for ${admin.email}`} value={admin.role} disabled={busyId === admin.id} onChange={e => void patch(admin, { role: e.target.value })}>
                <option value="manager">Manager</option><option value="owner">Owner</option>
              </select>
              : admin.role === "owner" ? "Owner" : "Manager"}</td>
            <td>{when(admin.last_login_at)}</td>
            <td><span className={admin.disabled_at ? "fs-pill-bad" : "fs-pill-ok"}>{admin.disabled_at ? "Disabled" : "Active"}</span></td>
            <td><div className="fs-team-actions">
              {(owner || admin.id === self.id) && <button className="fs-lib-icon" title="Set password" aria-label={`Set password for ${admin.email}`} disabled={busyId === admin.id} onClick={() => password(admin)}><KeyRound size={16} /></button>}
              {owner && admin.id !== self.id && <>
                <button className="fs-btn fs-outline fs-btn-sm" disabled={busyId === admin.id} onClick={() => void patch(admin, { disabled: !admin.disabled_at })}>{admin.disabled_at ? "Enable" : "Disable"}</button>
                <button className="fs-lib-icon" title="Remove" aria-label={`Remove ${admin.email}`} disabled={busyId === admin.id} onClick={() => void remove(admin)}><Trash2 size={16} /></button>
              </>}
            </div></td>
          </tr>)}
      </tbody>
    </table>
    </div>

    {open && <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add administrator">
      <form className="fs-modal fs-admin-modal" onSubmit={create}>
        <h2>Add an administrator</h2>
        <p className="fs-muted fs-small">This account signs in at /admin only. It is not a customer account.</p>
        <label>Name<input name="name" maxLength={100} required /></label>
        <label>Email<input name="email" type="email" maxLength={254} required /></label>
        <label>Password<input name="password" type="password" minLength={6} maxLength={128} required placeholder="Letter, number and symbol" /></label>
        <label>Role<select name="role" defaultValue="manager"><option value="manager">Manager</option><option value="owner">Owner</option></select></label>
        {error && <p className="fs-alert" role="alert">{error}</p>}
        <div className="fs-row">
          <button type="button" className="fs-btn fs-outline" onClick={() => setOpen(false)}>Cancel</button>
          <button className="fs-btn fs-primary" disabled={saving}>{saving && <LoaderCircle className="fs-spin" size={16} />}Add</button>
        </div>
      </form>
    </div>}
  </section>;
}
