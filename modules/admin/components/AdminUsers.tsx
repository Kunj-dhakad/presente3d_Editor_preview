"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, LoaderCircle } from "lucide-react";
import { formatBytes, PLAN_LIST } from "@shared/plans";

type Row = { id: string; name: string; email: string; emailVerified: number | boolean; createdAt: string; plan: string; suspended_at: string | null; suspend_reason: string | null; note: string | null; books: number; bytes: number; last_active: string | null };

export default function AdminUsers({ selfEmail }: { selfEmail: string }) {
  const [rows, setRows] = useState<Row[]>([]); const [total, setTotal] = useState(0); const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState(""); const [query, setQuery] = useState(""); const [filter, setFilter] = useState(""); const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/users?${new URLSearchParams({ q: query, plan: filter, page: String(page) })}`, { cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setRows(data.users); setTotal(data.total); setPageSize(data.pageSize);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load accounts."); }
    finally { setLoading(false); }
  }, [query, filter, page]);
  useEffect(() => { void load(); }, [load]);

  async function update(row: Row, body: Record<string, unknown>) {
    setBusyId(row.id); setError("");
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
    finally { setBusyId(""); }
  }

  function toggleSuspend(row: Row) {
    if (row.suspended_at) return void update(row, { suspended: false });
    const reason = window.prompt(`Suspend ${row.email}? They will be logged out and their reader links removed.\n\nReason (optional):`);
    if (reason !== null) void update(row, { suspended: true, reason });
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="fs-admin-users">
    <form className="fs-library-toolbar" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(q.trim()); }}>
      <div className="fs-search"><Search size={17} /><input aria-label="Search accounts" placeholder="Search name or email…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <select aria-label="Filter accounts" value={filter} onChange={e => { setPage(1); setFilter(e.target.value); }}>
        <option value="">All accounts</option>{PLAN_LIST.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="suspended">Suspended</option>
      </select>
      <span className="fs-muted fs-small">{total} accounts</span>
    </form>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    <div style={{ overflowX: "auto" }}>
      <table className="fs-admin-table">
        <thead><tr><th>Account</th><th>Plan</th><th>Books</th><th>Storage</th><th>Joined</th><th>Last active</th><th>Status</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={7}><LoaderCircle className="fs-spin" /></td></tr>
            : rows.length ? rows.map(row => <tr key={row.id} className={row.suspended_at ? "fs-row-suspended" : ""}>
              <td><strong>{row.name}</strong><br /><small>{row.email}{!row.emailVerified && " · unverified"}</small></td>
              <td><select aria-label={`Plan for ${row.email}`} value={row.plan} disabled={busyId === row.id} onChange={e => void update(row, { plan: e.target.value })}>{PLAN_LIST.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
              <td>{row.books}</td>
              <td>{formatBytes(Number(row.bytes))}</td>
              <td>{new Date(row.createdAt).toLocaleDateString("en-US")}</td>
              <td>{row.last_active ? new Date(row.last_active).toLocaleDateString("en-US") : "—"}</td>
              <td>{row.email.toLowerCase() === selfEmail.toLowerCase() ? <small>You</small> :
                <button className={`fs-btn fs-btn-sm ${row.suspended_at ? "fs-outline" : "fs-danger-btn"}`} disabled={busyId === row.id} title={row.suspend_reason || undefined} onClick={() => toggleSuspend(row)}>{row.suspended_at ? "Reinstate" : "Suspend"}</button>}</td>
            </tr>) : <tr><td colSpan={7} className="fs-muted">No accounts found.</td></tr>}
        </tbody>
      </table>
    </div>
    {pages > 1 && <div className="fs-pager"><button className="fs-btn fs-outline fs-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="fs-btn fs-outline fs-btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button></div>}
  </div>;
}
