"use client";
import AdminLoading from "./AdminLoading";
import AdminConfirm from "./AdminConfirm";
import AdminSelect from "./AdminSelect";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, LoaderCircle, Plus, Package as PackageIcon, KeyRound, Ban, Check, LogIn, Folder, Pencil, Trash2 } from "lucide-react";
import { formatBytes } from "@shared/plans";
import Tiles from "./Tiles";

/**
 * Users: the people who use the site. Search them by package and date, see what
 * they hold, sell them a package, reset a password, switch an account off, sign
 * in as them, or remove them — the sections the reference panel has.
 */

type Row = {
  id: string; name: string; email: string; emailVerified: number | boolean; created: number;
  status: "active" | "inactive"; suspend_reason: string | null; note: string | null;
  plans: string; books: number; bytes: number; last_active: string | null;
};
type Totals = { total: number; active: number; inactive: number };
type Package = { id: number; title: string; price: number; plan_type: string };

const when = (seconds: number) => seconds
  ? new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "—";

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ total: 0, active: 0, inactive: 0 });
  const [total, setTotal] = useState(0); const [pageSize, setPageSize] = useState(10); const [page, setPage] = useState(1);
  const [packages, setPackages] = useState<Package[]>([]);
  const [filters, setFilters] = useState({ keyword: "", package_id: "", start_date: "", end_date: "" });
  const [asked, setAsked] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [note, setNote] = useState(""); const [busyId, setBusyId] = useState("");
  const [open, setOpen] = useState<{ kind: "view" | "plans" | "password"; row: Row } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "status" | "delete" | "login"; row: Row } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(page) });
      for (const [key, value] of Object.entries(asked)) if (value) query.set(key, value);
      const res = await fetch(`/api/admin/users?${query}`, { cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setRows(data.users); setTotal(data.total); setPageSize(data.pageSize); setTotals(data.totals);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load accounts."); }
    finally { setLoading(false); }
  }, [asked, page]);
  useEffect(() => { void load(); }, [load]);

  // The packages the filter offers, read once.
  useEffect(() => {
    void fetch("/api/admin/packages", { cache: "no-store" })
      .then(res => res.json())
      .then(data => setPackages(data.packages ?? []))
      .catch(() => {});
  }, []);

  async function act(row: Row, url: string, method: string, body?: unknown, done = "Saved.") {
    setBusyId(row.id); setError(""); setNote("");
    try {
      const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setNote(done); await load();
    } catch (e) { throw new Error(e instanceof Error ? e.message : "That did not work."); }
    finally { setBusyId(""); }
  }

  async function loginAs(row: Row) {
    setBusyId(row.id); setError("");
    try {
      const res = await fetch("/api/auth/admin-login-as", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: row.id }),
      });
      const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || data.error || "That did not work.");
      window.open("/dashboard", "_blank", "noopener");
      setNote(`Signed in as ${row.email} in a new tab.`);
    } catch (e) { throw new Error(e instanceof Error ? e.message : "Could not sign in as this account."); }
    finally { setBusyId(""); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="fs-admin-users">
    <Tiles items={[["Total users", totals.total], ["Active", totals.active], ["Inactive", totals.inactive]]} />

    <form className="fs-user-filters" onSubmit={event => { event.preventDefault(); setPage(1); setAsked(filters); }}>
      <AdminSelect value={filters.package_id} options={[{ value: "", label: "All packages" }, ...packages.map(item => ({ value: String(item.id), label: item.title }))]} onChange={value => setFilters({ ...filters, package_id: value })} />
      <label>Search users<div className="fs-search"><Search size={17} />
        <input aria-label="Keyword" placeholder="Name or email" value={filters.keyword} onChange={event => setFilters({ ...filters, keyword: event.target.value })} />
      </div></label>
      <label>From
      <input aria-label="Start date" type="date" value={filters.start_date} onChange={event => setFilters({ ...filters, start_date: event.target.value })} />
      </label><label>To
      <input aria-label="End date" type="date" value={filters.end_date} onChange={event => setFilters({ ...filters, end_date: event.target.value })} />
      </label>
      <button className="fs-btn fs-outline fs-btn-sm"><Search size={15} />Search</button>
      <Link href="/admin/users/new" className="fs-btn fs-primary fs-btn-sm"><Plus size={15} />Add user</Link>
    </form>

    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}

    <section className="fs-settings-card fs-wide fs-user-catalog">
      <div className="fs-user-catalog-head"><h2>User directory</h2><span>{total} account{total === 1 ? "" : "s"}</span></div>
      <div className="fs-user-table-scroll" tabIndex={0} role="region" aria-label="User directory">
      <table className="fs-admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Purchased plans</th><th>Status</th><th>Add date</th><th>Action</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6}><AdminLoading label="Loading users..." compact /></td></tr>
            : rows.length ? rows.map(row => <tr key={row.id} className={row.status === "inactive" ? "fs-row-suspended" : ""}>
              <td><strong>{row.name}</strong><small>{row.books} book{row.books === 1 ? "" : "s"} · {formatBytes(row.bytes)}</small></td>
              <td>{row.email}<small>{row.emailVerified ? "verified" : "unverified"}</small></td>
              <td>{row.plans || "No plan"}</td>
              <td><em className={row.status === "active" ? "fs-pill-ok" : "fs-pill-bad"}>{row.status}</em></td>
              <td>{when(row.created)}<small>{row.last_active ? `seen ${new Date(row.last_active).toLocaleDateString("en-US")}` : "never signed in"}</small></td>
              <td><div className="fs-user-actions" role="group" aria-label={`Actions for ${row.name}`}>
                <button className="fs-lib-icon" title="Add plan" aria-label={`Add a plan for ${row.email}`} disabled={busyId === row.id} onClick={() => setOpen({ kind: "plans", row })}><PackageIcon size={16} /></button>
                <button className="fs-lib-icon" title="Reset password" aria-label={`Reset the password for ${row.email}`} disabled={busyId === row.id} onClick={() => setOpen({ kind: "password", row })}><KeyRound size={16} /></button>
                <button className="fs-lib-icon" title={row.status === "active" ? "Set inactive" : "Set active"} aria-label={`Switch ${row.email} ${row.status === "active" ? "off" : "on"}`} disabled={busyId === row.id}
                  onClick={() => setConfirm({ kind: "status", row })}>{row.status === "active" ? <Ban size={16} /> : <Check size={16} />}</button>
                <button className="fs-lib-icon" title="Login as this user" aria-label={`Sign in as ${row.email}`} disabled={busyId === row.id} onClick={() => setConfirm({ kind: "login", row })}><LogIn size={16} /></button>
                <button className="fs-lib-icon" title="View" aria-label={`View ${row.email}`} disabled={busyId === row.id} onClick={() => setOpen({ kind: "view", row })}><Folder size={16} /></button>
                <Link className="fs-lib-icon" title="Edit" aria-label={`Edit ${row.email}`} href={`/admin/users/${row.id}/edit`}><Pencil size={16} /></Link>
                <button className="fs-lib-icon fs-user-delete" title="Delete" aria-label={`Delete ${row.email}`} disabled={busyId === row.id}
                  onClick={() => setConfirm({ kind: "delete", row })}><Trash2 size={16} /></button>
              </div></td>
            </tr>)
              : <tr><td colSpan={6} className="fs-muted">No accounts match that search.</td></tr>}
        </tbody>
      </table>
      </div>
      {pages > 1 && <div className="fs-pager">
        <button className="fs-btn fs-outline fs-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}
    </section>

    {confirm && <AdminConfirm
      title={confirm.kind === "delete" ? "Delete this account?" : confirm.kind === "login" ? "Sign in as this user?" : confirm.row.status === "active" ? "Deactivate this account?" : "Activate this account?"}
      message={confirm.kind === "delete" ? `Permanently delete ${confirm.row.email} and their books, files and purchases. This cannot be undone.` : confirm.kind === "login" ? `You will open the site as ${confirm.row.email} in a new tab.` : confirm.row.status === "active" ? `${confirm.row.email} will lose account access until you activate them again.` : `Restore account access for ${confirm.row.email}.`}
      label={confirm.kind === "delete" ? "Delete account" : confirm.kind === "login" ? "Sign in as user" : confirm.row.status === "active" ? "Deactivate" : "Activate"}
      danger={confirm.kind === "delete"}
      onCancel={() => setConfirm(null)}
      onConfirm={async () => {
        if (confirm.kind === "login") await loginAs(confirm.row);
        else if (confirm.kind === "delete") await act(confirm.row, `/api/admin/users/${confirm.row.id}`, "DELETE", undefined, "Account deleted.");
        else await act(confirm.row, `/api/admin/users/${confirm.row.id}`, "PATCH", { status: confirm.row.status === "active" ? "inactive" : "active" }, "Account updated.");
        setConfirm(null);
      }} />}
    {open?.kind === "view" && <ViewUser row={open.row} onClose={() => setOpen(null)} />}
    {open?.kind === "plans" && <PlanWindow row={open.row} onClose={() => setOpen(null)}
      onSaved={async () => { setOpen(null); setNote("Plans updated."); await load(); }} />}
    {open?.kind === "password" && <PasswordWindow row={open.row} onClose={() => setOpen(null)}
      onSaved={() => { setOpen(null); setNote("Password updated."); }} />}
  </div>;
}

/* ------------------------------------------------------------ the windows */

type Detail = {
  detail: { id: string; name: string; email: string; emailVerified: boolean; created: number; status: string; suspend_reason: string | null; note: string | null; books: number; bytes: number; last_active: string | null };
  purchases: { id: number; title: string; price: number; status: string; add_time: number; expire_time: number | null; source: string }[];
  orders: { id: number; number: string; price: number; payment_status: string; order_time: number }[];
};

function ViewUser({ row, onClose }: { row: Row; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/admin/users/${row.id}`, { cache: "no-store" })
      .then(res => res.json())
      .then(body => body.error ? setError(body.error) : setData(body))
      .catch(() => setError("Could not read this account."));
  }, [row.id]);

  return <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Account">
    <div className="fs-modal fs-admin-modal">
      <h2>{row.name}&apos;s detail</h2>
      {error && <p className="fs-alert" role="alert">{error}</p>}
      {!data ? <p className="fs-muted"><LoaderCircle className="fs-spin" size={16} /> Loading…</p> : <>
        <table className="fs-admin-table fs-detail-table">
          <tbody>
            <tr><th>Name</th><td>{data.detail.name}</td></tr>
            <tr><th>Email</th><td>{data.detail.email} · {data.detail.emailVerified ? "verified" : "unverified"}</td></tr>
            <tr><th>Status</th><td>{data.detail.status}{data.detail.suspend_reason ? ` · ${data.detail.suspend_reason}` : ""}</td></tr>
            <tr><th>Joined</th><td>{when(data.detail.created)}</td></tr>
            <tr><th>Last seen</th><td>{data.detail.last_active ? new Date(data.detail.last_active).toLocaleString("en-US") : "never"}</td></tr>
            <tr><th>Books</th><td>{data.detail.books}</td></tr>
            <tr><th>Storage</th><td>{formatBytes(data.detail.bytes)}</td></tr>
            {data.detail.note && <tr><th>Note</th><td>{data.detail.note}</td></tr>}
          </tbody>
        </table>
        <h3 className="fs-modal-heading">Purchases</h3>
        <table className="fs-admin-table">
          <thead><tr><th>Package</th><th>Price</th><th>Status</th><th>Add time</th></tr></thead>
          <tbody>{data.purchases.length ? data.purchases.map(purchase => <tr key={purchase.id}>
            <td>{purchase.title}<small>{purchase.source}</small></td>
            <td>${Number(purchase.price).toFixed(2)}</td>
            <td>{purchase.status}</td>
            <td>{when(purchase.add_time)}</td>
          </tr>) : <tr><td colSpan={4} className="fs-muted">No packages yet.</td></tr>}</tbody>
        </table>
        {data.orders.length > 0 && <>
          <h3 className="fs-modal-heading">Orders</h3>
          <table className="fs-admin-table">
            <thead><tr><th>Order</th><th>Price</th><th>Payment status</th><th>Order time</th></tr></thead>
            <tbody>{data.orders.map(order => <tr key={order.id}>
              <td>{order.number}</td><td>${Number(order.price).toFixed(2)}</td>
              <td>{order.payment_status}</td><td>{when(order.order_time)}</td>
            </tr>)}</tbody>
          </table>
        </>}
      </>}
      <div className="fs-row"><button className="fs-btn fs-outline" onClick={onClose}>Close</button></div>
    </div>
  </div>;
}

function PlanWindow({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [held, setHeld] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void fetch(`/api/admin/users/${row.id}/plans`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setPackages(data.packages ?? []); setHeld(data.held ?? []); setReady(true); })
      .catch(() => setError("Could not read this account's plans."));
  }, [row.id]);

  const toggle = (id: number) => setHeld(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  return <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Plans">
    <form className="fs-modal fs-admin-modal" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const res = await fetch(`/api/admin/users/${row.id}/plans`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: held }),
        });
        const data = await res.json(); if (!res.ok) throw new Error(data.error);
        onSaved();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
      finally { setBusy(false); }
    }}>
      <h2>{row.name}&apos;s plan management</h2>
      <p className="fs-muted fs-small">Tick a package to sell it to this account; untick one to take it away. What they hold adds up — the most generous value wins.</p>
      {!ready ? <p className="fs-muted"><LoaderCircle className="fs-spin" size={16} /> Loading…</p>
        : <fieldset className="fs-limit-fields fs-feature-picker">
          <legend>Choose plan</legend>
          {packages.map(item => <label key={item.id} className="fs-checkline">
            <input type="checkbox" checked={held.includes(item.id)} onChange={() => toggle(item.id)} />
            {item.title} · ${item.price.toFixed(0)}
          </label>)}
        </fieldset>}
      {error && <p className="fs-alert" role="alert">{error}</p>}
      <div className="fs-row">
        <button type="button" className="fs-btn fs-outline" onClick={onClose}>Close</button>
        <button className="fs-btn fs-primary" disabled={busy || !ready}>{busy && <LoaderCircle className="fs-spin" size={16} />}Submit</button>
      </div>
    </form>
  </div>;
}

function PasswordWindow({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Reset password">
    <form className="fs-modal fs-admin-modal" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      const form = new FormData(event.currentTarget);
      try {
        const res = await fetch(`/api/admin/users/${row.id}/password`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: form.get("new_password"), confirm_password: form.get("confirm_password") }),
        });
        const data = await res.json(); if (!res.ok) throw new Error(data.error);
        onSaved();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
      finally { setBusy(false); }
    }}>
      <h2>Reset {row.name}&apos;s password</h2>
      <p className="fs-muted fs-small">They are signed out everywhere, and will need the new password to get back in.</p>
      <label>New password<input name="new_password" type="password" required autoComplete="new-password" /></label>
      <label>Confirm password<input name="confirm_password" type="password" required autoComplete="new-password" /></label>
      {error && <p className="fs-alert" role="alert">{error}</p>}
      <div className="fs-row">
        <button type="button" className="fs-btn fs-outline" onClick={onClose}>Close</button>
        <button className="fs-btn fs-primary" disabled={busy}>{busy && <LoaderCircle className="fs-spin" size={16} />}Submit</button>
      </div>
    </form>
  </div>;
}
