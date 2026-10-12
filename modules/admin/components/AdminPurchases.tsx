"use client";
import AdminLoading from "./AdminLoading";
import { useCallback, useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import Tiles from "./Tiles";

/** The ledger: every package sold, and who holds it. */

type Purchase = {
  id: number; user_id: string; package_id: number; order_id: number | null; title: string;
  plan_type: string; plan_level: string; price: number; sell_type: string | null; source: string;
  status: string; add_time: number; expire_time: number | null; email: string | null; name: string | null;
};

const when = (seconds: number) => seconds
  ? new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "—";

export default function AdminPurchases() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ total: 0, active: 0, inactive: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(page) });
      if (search) query.set("q", search);
      if (status) query.set("status", status);
      const res = await fetch(`/api/admin/purchases?${query}`, { cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setRows(data.purchases); setTotal(data.total); setTotals(data.totals);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the purchases."); }
    finally { setLoading(false); }
  }, [page, search, status]);
  useEffect(() => { void load(); }, [load]);

  async function switchOff(purchase: Purchase) {
    if (!window.confirm(`Take ${purchase.title} away from ${purchase.email ?? "this customer"}?`)) return;
    setError(""); setNote("");
    const res = await fetch(`/api/admin/purchases/${purchase.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "inactive" }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "That did not work."); return; }
    setNote("Purchase switched off."); await load();
  }

  return <div className="fs-admin-purchases" aria-busy={loading}>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}
    <Tiles items={[["Total purchases", totals.total], ["Active", totals.active], ["Inactive", totals.inactive]]} />
    <form className="fs-library-toolbar" onSubmit={event => { event.preventDefault(); setPage(1); void load(); }}>
      <span className="fs-search"><Search size={15} />
        <input placeholder="Search by package or email" value={search} onChange={event => setSearch(event.target.value)} />
      </span>
      <select aria-label="Filter purchases" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}>
        <option value="">All purchases</option><option value="active">Active</option><option value="inactive">Switched off</option>
      </select>
      <span className="fs-muted fs-small">{total} purchase{total === 1 ? "" : "s"}</span>
    </form>
    <section className="fs-settings-card fs-wide">
      <table className="fs-admin-table">
        <thead><tr><th>Package</th><th>User</th><th>Price</th><th>Status</th><th>Add time</th><th>Action</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={6}><AdminLoading label="Loading purchases..." compact /></td></tr>
            : rows.length ? rows.map(row => <tr key={row.id} className={row.status === "inactive" ? "fs-row-suspended" : ""}>
              <td><strong>{row.title}</strong>
                <small>{row.plan_level === "upsell" ? "Upsell" : row.plan_type === "free" ? "Free plan" : "Main plan"}{row.sell_type ? ` · ${row.sell_type}` : ""}
                  {" · "}{row.order_id ? `order #${row.order_id}` : row.source}</small></td>
              <td>{row.name ?? "—"}<small>{row.email ?? row.user_id}</small></td>
              <td>${row.price.toFixed(2)}</td>
              <td><em className={row.status === "active" ? "fs-pill-ok" : "fs-pill-bad"}>{row.status}</em></td>
              <td>{when(row.add_time)}<small>{row.expire_time ? `ends ${when(row.expire_time)}` : "no end"}</small></td>
              <td className="fs-row">{row.status === "active" &&
                <button className="fs-btn fs-outline fs-btn-sm" onClick={() => switchOff(row)}>Switch off</button>}</td>
            </tr>)
              : <tr><td colSpan={6} className="fs-muted">Nothing sold yet.</td></tr>}
        </tbody>
      </table>
      {total > rows.length && <div className="fs-pager">
        <button className="fs-btn fs-outline fs-btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Back</button>
        <span>Page {page}</span>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</button>
      </div>}
    </section>
  </div>;
}
