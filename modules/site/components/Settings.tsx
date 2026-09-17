"use client";
import { useCallback, useEffect, useState } from "react";
import { Monitor, Smartphone, LoaderCircle, TriangleAlert } from "lucide-react";
import { authClient } from "@shared/auth-client";
import { PASSWORD_HINT, PASSWORD_MAX, PASSWORD_MIN, passwordError } from "@shared/password";

type Session = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; updatedAt: Date | string };

function describeAgent(agent?: string | null) {
  if (!agent) return { name: "Unknown device", mobile: false };
  const browser = /Edg\//.test(agent) ? "Edge" : /OPR\//.test(agent) ? "Opera" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const os = /Windows/.test(agent) ? "Windows" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Mac OS X/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "";
  return { name: os ? `${browser} on ${os}` : browser, mobile: /Mobile|Android|iPhone/.test(agent) };
}

export default function Settings() {
  const { data } = authClient.useSession();
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadSessions = useCallback(async () => {
    const result = await authClient.listSessions();
    setSessions(result.data ? [...result.data].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : []);
  }, []);
  useEffect(() => { void loadSessions(); }, [loadSessions]);

  async function run(task: () => Promise<{ error: { message?: string } | null }>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await task();
      if (result.error) throw new Error(result.error.message || "Please try again.");
      setMessage(success); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); return false; }
    finally { setBusy(false); }
  }

  return <main className="fs-content">
    <span className="fs-eyebrow">YOUR WORKSPACE, YOUR WAY</span><h1>Account settings</h1>
    <p className="fs-muted">Manage your profile and keep your account secure.</p>
    {message && <p role="status" className="fs-success">{message}</p>}{error && <p role="alert" className="fs-alert">{error}</p>}

    <section className="fs-settings-card"><h2>Profile</h2>
      <form onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name")).trim(); void run(() => authClient.updateUser({ name }), "Profile updated."); }}>
        <label>Full name<input key={data?.user.name} name="name" defaultValue={data?.user.name} required maxLength={100} /></label>
        <label>Email<input value={data?.user.email || ""} disabled /></label>
        <button className="fs-btn fs-primary" disabled={busy}>Save changes</button>
      </form>
    </section>

    <section className="fs-settings-card"><h2>Change password</h2>
      <form onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); if (await run(() => authClient.changePassword({ currentPassword: String(f.get("current")), newPassword: String(f.get("password")), revokeOtherSessions: true }), "Password changed. Other sessions have been signed out.")) { form.reset(); void loadSessions(); } }}>
        <label>Current password<input type="password" name="current" autoComplete="current-password" required /></label>
        <label>New password<input type="password" name="password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" required onChange={e => e.target.setCustomValidity(passwordError(e.target.value) || "")} /><small className="fs-muted">{PASSWORD_HINT}</small></label>
        <button className="fs-btn fs-primary" disabled={busy}>Update password</button>
      </form>
    </section>

    <section className="fs-settings-card"><h2>Where you are logged in</h2>
      <p>These devices are currently logged in to your account. Log out any you do not recognise.</p>
      {!sessions ? <LoaderCircle className="fs-spin" /> : <ul className="fs-sessions">
        {sessions.map(s => {
          const current = s.token === data?.session.token; const device = describeAgent(s.userAgent);
          return <li key={s.id}>{device.mobile ? <Smartphone size={20} /> : <Monitor size={20} />}
            <span><strong>{device.name}{current && <em> · This device</em>}</strong><small>{s.ipAddress || "Unknown location"} · Active {new Date(s.updatedAt).toLocaleString()}</small></span>
            {!current && <button className="fs-btn fs-outline fs-btn-sm" disabled={busy} onClick={async () => { if (await run(() => authClient.revokeSession({ token: s.token }), "Device logged out.")) void loadSessions(); }}>Log out</button>}
          </li>;
        })}
      </ul>}
      {sessions && sessions.length > 1 && <button className="fs-btn fs-outline" disabled={busy} onClick={async () => { if (await run(() => authClient.revokeOtherSessions(), "All other devices have been logged out.")) void loadSessions(); }}>Log out all other devices</button>}
    </section>

    <section className="fs-settings-card fs-danger"><h2><TriangleAlert size={18} /> Delete account</h2>
      <p>Permanently delete your account, all books, uploads and reader links. This cannot be undone — export anything you want to keep first.</p>
      {!confirmDelete ? <button className="fs-btn fs-danger-btn" onClick={() => setConfirmDelete(true)}>Delete my account</button> :
        <form onSubmit={async e => { e.preventDefault(); const password = String(new FormData(e.currentTarget).get("password")); if (await run(() => authClient.deleteUser({ password }), "Your account has been deleted.")) { sessionStorage.clear(); window.location.assign("/"); } }}>
          <label>Enter your password to confirm<input type="password" name="password" autoComplete="current-password" required /></label>
          <label className="fs-check"><input type="checkbox" required />I understand my books and files will be permanently deleted.</label>
          <div className="fs-row"><button className="fs-btn fs-danger-btn" disabled={busy}>{busy && <LoaderCircle className="fs-spin" size={16} />}Permanently delete</button><button type="button" className="fs-btn fs-outline" onClick={() => setConfirmDelete(false)}>Cancel</button></div>
        </form>}
    </section>
  </main>;
}
