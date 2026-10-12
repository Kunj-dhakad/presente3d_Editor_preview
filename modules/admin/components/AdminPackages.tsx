"use client";
import AdminLoading from "./AdminLoading";
import { useState } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { UNLIMITED } from "@shared/bms";
import Tiles from "./Tiles";
import { useBms, type Engine, type PackagePlan } from "./useBms";

/** Packages: what a customer buys. Each one carries a feature plan and a value per field. */

const money = (price: number, currency = "USD") =>
  `${currency === "USD" ? "$" : ""}${price.toFixed(price % 1 ? 2 : 0)}${currency === "USD" ? "" : " " + currency}`;

export default function AdminPackages() {
  const { engine, loading, error, note, setNote, call, run } = useBms();
  const [editing, setEditing] = useState<PackagePlan | "new" | null>(null);

  if (!engine) return error
    ? <p className="fs-alert" role="alert">{error}</p>
    : <AdminLoading label="Loading packages..." />;

  const appNames = (ids: number[]) => ids.map(id => engine.apps.find(app => app.id === id)?.app_name ?? id).join(", ");
  const planName = (id: number | null) => engine.featurePlans.find(set => set.id === id)?.plan_name ?? "—";

  return <div className="fs-admin-plans fs-admin-packages" aria-busy={loading}>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}

    <Tiles items={[
      ["Total packages", engine.packages.length],
      ["Active", engine.packages.filter(item => item.status === "active").length],
      ["Inactive", engine.packages.filter(item => item.status === "inactive").length],
    ]} />

    <section className="fs-settings-card fs-wide">
      <div className="fs-package-toolbar">
        <div><h2>Package catalog</h2><p className="fs-muted fs-small">A customer can hold several packages at once; the most generous value wins.</p></div>
        <button className="fs-btn fs-primary fs-btn-sm" onClick={() => setEditing("new")}><Plus size={15} />New package</button>
      </div>
      <div className="fs-package-table-scroll" tabIndex={0} role="region" aria-label="Package catalog">
      <table className="fs-admin-table">
        <thead><tr><th>Title</th><th>Apps</th><th>Price</th><th>Sell type</th><th>Features</th><th>JVZoo id</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {engine.packages.map(item => <tr key={item.id} className={item.status === "inactive" ? "fs-row-suspended" : ""}>
            <td>
              <strong>{item.title}</strong>{item.highlight && <em className="fs-pill-ok"> Popular</em>}
              <small>/{item.slug} · {item.plan_level === "free" ? "Free plan" : item.plan_level === "upsell" ? "Upsell" : "Main plan"}{item.public ? "" : " · hidden"} · {item.held} customer{item.held === 1 ? "" : "s"}</small>
            </td>
            <td>{appNames(item.app_ids)}</td>
            <td>{item.plan_type === "paid" ? money(item.price, item.currency) : "free"}<small>{item.period === "once" ? "one time" : `per ${item.period}`}</small></td>
            <td>{item.sell_type ?? "—"}</td>
            <td>{planName(item.feature_plan)}<small>{item.feature_keys.length} feature{item.feature_keys.length === 1 ? "" : "s"}</small></td>
            <td>{item.jvz_product_id ?? "N/A"}</td>
            <td><em className={item.status === "active" ? "fs-pill-ok" : "fs-pill-bad"}>{item.status}</em></td>
            <td><div className="fs-package-actions">
              <button className="fs-btn fs-outline fs-btn-sm" onClick={() => setEditing(item)}>Edit</button>
              <button className="fs-btn fs-outline fs-btn-sm" onClick={run(() => call(`/api/admin/packages/${item.id}`, "PATCH", { status: item.status === "active" ? "inactive" : "active" }), "Package updated.")}>
                {item.status === "active" ? "Switch off" : "Switch on"}
              </button>
              <button className="fs-lib-icon" aria-label={`Delete ${item.title}`} title="Delete" onClick={run(async () => { if (window.confirm(`Delete ${item.title}?`)) await call(`/api/admin/packages/${item.id}`, "DELETE"); }, "Package deleted.")}><Trash2 size={16} /></button>
            </div></td>
          </tr>)}
        </tbody>
      </table>
      </div>
    </section>

    {editing && <PackageForm engine={engine} value={editing === "new" ? null : editing} onClose={() => setEditing(null)}
      onSave={async value => {
        if (editing === "new") await call("/api/admin/packages", "POST", value);
        else await call(`/api/admin/packages/${editing.id}`, "PATCH", value);
        setEditing(null); setNote("Package saved.");
      }} />}
  </div>;
}

function PackageForm({ engine, value, onClose, onSave }: { engine: Engine; value: PackagePlan | null; onClose: () => void; onSave: (value: Record<string, unknown>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(engine.fields.map(field => [field.condition_val, value?.fields[field.condition_val] ?? ""])));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await onSave({
        title: form.get("title"), slug: form.get("slug"), blurb: form.get("blurb"),
        plan_type: form.get("plan_type"), plan_level: form.get("plan_level"),
        price: Number(form.get("price")) || 0, period: form.get("period"), sell_type: form.get("sell_type"),
        feature_plan: form.get("feature_plan") || null,
        fields: Object.fromEntries(Object.entries(fields).filter(([, entry]) => entry !== "")),
        highlights: String(form.get("highlights") || "").split("\n").map(line => line.trim()).filter(Boolean),
        public: form.get("public") === "on", highlight: form.get("highlight") === "on", sort: Number(form.get("sort")) || 0,
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }

  return <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Package">
    <form className="fs-modal fs-admin-modal" onSubmit={submit}>
      <h2>{value ? `Edit ${value.title}` : "New package"}</h2>
      <div className="fs-field-row">
        <label>Name<input name="title" defaultValue={value?.title} maxLength={120} required /></label>
        <label>Address<input name="slug" defaultValue={value?.slug} maxLength={60} placeholder="pro" /></label>
      </div>
      <label>One line about it<input name="blurb" defaultValue={value?.blurb ?? ""} maxLength={255} /></label>
      <div className="fs-field-row">
        <label>Price (USD)<input name="price" type="number" step="0.01" min={0} defaultValue={value ? value.price : 0} /></label>
        <label>Billed<select name="period" defaultValue={value?.period ?? "month"}><option value="month">per month</option><option value="year">per year</option><option value="once">one time</option></select></label>
      </div>
      <div className="fs-field-row">
        <label>Plan type<select name="plan_type" defaultValue={value?.plan_type ?? "paid"}><option value="paid">Paid</option><option value="free">Free</option></select></label>
        <label>Plan level<select name="plan_level" defaultValue={value?.plan_level ?? "fe"}><option value="free">Free plan</option><option value="fe">Main plan</option><option value="upsell">Upsell</option></select></label>
      </div>
      <div className="fs-field-row">
        <label>Feature plan<select name="feature_plan" defaultValue={value?.feature_plan ?? ""}>
          <option value="">No features</option>
          {engine.featurePlans.map(set => <option key={set.id} value={set.id}>{set.plan_name}</option>)}
        </select></label>
        <label>Sell type<input name="sell_type" defaultValue={value?.sell_type ?? ""} maxLength={40} placeholder="fe-1" /></label>
      </div>
      <fieldset className="fs-limit-fields">
        <legend>Package fields — leave empty for none, or write &quot;{UNLIMITED}&quot;</legend>
        {engine.fields.map(field => <label key={field.condition_val}>{field.field_name}{field.unit === "bytes" && " (bytes)"}
          <input value={fields[field.condition_val] ?? ""} placeholder="none"
            onChange={event => setFields(current => ({ ...current, [field.condition_val]: event.target.value.trim() }))} />
        </label>)}
      </fieldset>
      <label>Selling points, one per line<textarea name="highlights" rows={4} defaultValue={(value?.highlights ?? []).join("\n")} /></label>
      <div className="fs-field-row">
        <label className="fs-checkline"><input type="checkbox" name="public" defaultChecked={value ? value.public : true} />Show on the pricing page</label>
        <label className="fs-checkline"><input type="checkbox" name="highlight" defaultChecked={value?.highlight ?? false} />Mark as most popular</label>
      </div>
      <label>Order<input name="sort" type="number" defaultValue={value?.sort ?? 0} /></label>
      {error && <p className="fs-alert" role="alert">{error}</p>}
      <div className="fs-row">
        <button type="button" className="fs-btn fs-outline" onClick={onClose}>Cancel</button>
        <button className="fs-btn fs-primary" disabled={busy}>{busy && <LoaderCircle className="fs-spin" size={16} />}Save package</button>
      </div>
    </form>
  </div>;
}
