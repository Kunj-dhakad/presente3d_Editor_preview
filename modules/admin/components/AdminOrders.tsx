"use client";
import AdminLoading from "./AdminLoading";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import Tiles from "./Tiles";

/** Package orders: what a customer paid, and whether it has been handed over. */

type Order = {
  id: number; number: string; package_id: number | null; purchase_id: number | null; user_id: string;
  user_email: string; name: string | null; title: string | null; price: number; currency: string; months: number;
  payment_mode: string | null; payment_status: string; reference: string | null; message: string | null;
  order_time: number; paid_time: number | null;
};
type Totals = { paid: number; orders: number; pending: number; process: number; complete: number };
type Package = { id: number; title: string; price: number; plan_type: string; status: string };

const STATUSES = ["pending", "new", "process", "complete", "free", "refunded", "cancelled"];
const money = (price: number, currency = "USD") => `${currency === "USD" ? "$" : ""}${price.toFixed(2)}${currency === "USD" ? "" : " " + currency}`;
const when = (seconds: number) => seconds ? new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const label = (status: string) => status[0].toUpperCase() + status.slice(1);

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [totals, setTotals] = useState<Totals>({ paid: 0, orders: 0, pending: 0, process: 0, complete: 0 });
  const [total, setTotal] = useState(0); const [pageSize, setPageSize] = useState(25); const [page, setPage] = useState(1);
  const [q, setQ] = useState(""); const [query, setQuery] = useState(""); const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busyId, setBusyId] = useState(0);
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/orders?${new URLSearchParams({ q: query, status, page: String(page) })}`, { cache: "no-store" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setOrders(data.orders); setTotal(data.total); setPageSize(data.pageSize); setTotals(data.totals);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load orders."); }
    finally { setLoading(false); }
  }, [query, status, page]);
  useEffect(() => { void load(); }, [load]);

  // The packages an order can be for, read once when the form is first opened.
  useEffect(() => {
    if (!open || packages.length) return;
    void fetch("/api/admin/packages", { cache: "no-store" })
      .then(res => res.json())
      .then(data => setPackages((data.packages ?? []).filter((item: Package) => item.status === "active")))
      .catch(() => setError("Could not load the packages."));
  }, [open, packages.length]);

  async function update(order: Order, body: Record<string, unknown>) {
    setBusyId(order.id); setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
    finally { setBusyId(0); }
  }

  async function remove(order: Order) {
    if (!window.confirm(`Delete order ${order.number}? The package already sold stays as it is.`)) return;
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete the order."); }
    finally { setBusyId(0); }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const price = Number(form.get("price"));
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"), package_id: form.get("package_id"), months: Number(form.get("months")) || 1,
          price: Number.isFinite(price) && form.get("price") !== "" ? price : undefined,
          payment_status: form.get("payment_status"), payment_mode: form.get("payment_mode"),
          reference: form.get("reference"), message: form.get("message"), notify: form.get("notify") === "on",
        }),
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setOpen(false); setPage(1); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the order."); }
    finally { setSaving(false); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="fs-admin-orders">
    <Tiles items={[
      ["Total orders", totals.orders],
      ["Process", totals.process],
      ["Complete", totals.complete],
      ["Pending", totals.pending],
    ]} />

    <div className="fs-settings-card fs-wide">
      <form className="fs-library-toolbar" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(q.trim()); }}>
        <div className="fs-search"><Search size={17} /><input aria-label="Search orders" placeholder="Email, order number or reference…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select aria-label="Filter orders" value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <button type="button" className="fs-btn fs-primary fs-btn-sm" onClick={() => setOpen(true)}><Plus size={15} />New order</button>
      </form>
      {error && <p className="fs-alert" role="alert">{error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table className="fs-admin-table">
          <thead><tr><th>Package</th><th>User detail</th><th>Price</th><th>Payment mode</th><th>Payment status</th><th>Order time</th><th /></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><AdminLoading label="Loading orders..." compact /></td></tr>
              : orders.length ? orders.map(order => <tr key={order.id}>
                <td><strong>{order.title ?? "—"}</strong>
                  <small>{order.number} · {order.months} month{order.months === 1 ? "" : "s"}{order.reference ? ` · ref ${order.reference}` : ""}</small></td>
                <td>{order.name || "—"}<small>{order.user_email}</small></td>
                <td>{money(order.price, order.currency)}</td>
                <td>{order.payment_mode || "—"}</td>
                <td><select aria-label={`Payment status of ${order.number}`} value={order.payment_status} disabled={busyId === order.id}
                  onChange={e => void update(order, { payment_status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                </select></td>
                <td>{when(order.order_time)}{order.paid_time ? <small>paid {when(order.paid_time)}</small> : null}</td>
                <td><button className="fs-lib-icon" aria-label={`Delete ${order.number}`} title="Delete" disabled={busyId === order.id} onClick={() => void remove(order)}><Trash2 size={16} /></button></td>
              </tr>) : <tr><td colSpan={7} className="fs-muted">No orders yet. Record one when a customer pays.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && <div className="fs-pager">
        <button className="fs-btn fs-outline fs-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}
    </div>

    {open && <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="New order">
      <form className="fs-modal fs-admin-modal" onSubmit={create}>
        <h2>Record an order</h2>
        <p className="fs-muted fs-small">The customer must already have an account. Completing the order sells them the package straight away.</p>
        <label>Customer email<input name="email" type="email" required placeholder="customer@example.com" /></label>
        <div className="fs-field-row">
          <label>Package<select name="package_id" required>
            {packages.filter(item => item.plan_type !== "free").map(item => <option key={item.id} value={item.id}>{item.title} · ${item.price.toFixed(0)}</option>)}
          </select></label>
          <label>Months<input name="months" type="number" min={1} max={36} defaultValue={1} /></label>
        </div>
        <div className="fs-field-row">
          <label>Price (USD)<input name="price" type="number" step="0.01" min={0} placeholder="Package price" /></label>
          <label>Payment status<select name="payment_status" defaultValue="pending">{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        </div>
        <div className="fs-field-row">
          <label>Payment mode<input name="payment_mode" maxLength={32} placeholder="Bank transfer, PayPal…" /></label>
          <label>Reference<input name="reference" maxLength={80} placeholder="Transaction id" /></label>
        </div>
        <label>Note for the customer<textarea name="message" rows={2} maxLength={500} placeholder="Payment details or anything they should know." /></label>
        <label className="fs-checkline"><input type="checkbox" name="notify" defaultChecked />Email the customer about this order</label>
        {error && <p className="fs-alert" role="alert">{error}</p>}
        <div className="fs-row">
          <button type="button" className="fs-btn fs-outline" onClick={() => setOpen(false)}>Cancel</button>
          <button className="fs-btn fs-primary" disabled={saving}>{saving && <LoaderCircle className="fs-spin" size={16} />}Save order</button>
        </div>
      </form>
    </div>}
  </div>;
}
