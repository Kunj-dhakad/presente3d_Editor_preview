"use client";
import AdminLoading from "./AdminLoading";
import { useState } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import Tiles from "./Tiles";
import { useBms } from "./useBms";

/** Package fields: the countable allowances a package hands out. */
export default function AdminPackageFields() {
  const { engine, loading, error, note, call, run } = useBms();
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!engine) return error
    ? <p className="fs-alert" role="alert">{error}</p>
    : <AdminLoading label="Loading package fields..." />;

  const appName = (id: number) => engine.apps.find(app => app.id === id)?.app_name ?? id;

  return <div className="fs-admin-plans" aria-busy={loading}>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}

    <Tiles items={[
      ["Total package fields", engine.fields.length],
      ["Active", engine.fields.filter(field => field.status === "active").length],
      ["Inactive", engine.fields.filter(field => field.status === "inactive").length],
    ]} />

    <section className="fs-settings-card fs-wide">
      <p className="fs-muted fs-small">What a package hands out, and how much. A key in bold is one the app enforces; a package sets a value for each.</p>
      <table className="fs-admin-table">
        <thead><tr><th>Field name</th><th>App</th><th>Overages</th><th>Input type</th><th>Input value</th><th>Field type</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{engine.fields.map(field => <tr key={field.id} className={field.status === "inactive" ? "fs-row-suspended" : ""}>
          <td><strong>{field.field_name}</strong>
            <small><code className={engine.appFields.includes(field.condition_val) ? "fs-key-live" : ""}>{field.condition_val}</code>
              {" · "}{field.unit === "bytes" ? "storage" : "a number"}
              {field.period === "day" ? " · every day" : field.period === "month" ? " · every month" : ""}</small>
          </td>
          <td>{appName(field.app_id)}</td>
          <td>{field.overages === "yes" ? "Yes" : "No"}</td>
          <td>{field.input_type}</td>
          <td>{field.input_val || "—"}</td>
          <td>{field.field_type}</td>
          <td><em className={field.status === "active" ? "fs-pill-ok" : "fs-pill-bad"}>{field.status}</em></td>
          <td className="fs-row">
            <button className="fs-btn fs-outline fs-btn-sm"
              onClick={run(() => call("/api/admin/package-fields", "POST", { ...field, status: field.status === "active" ? "inactive" : "active" }), "Field updated.")}>
              {field.status === "active" ? "Switch off" : "Switch on"}
            </button>
            {!engine.appFields.includes(field.condition_val) && <button className="fs-lib-icon" aria-label={`Delete ${field.field_name}`}
              onClick={run(async () => { if (window.confirm(`Delete ${field.field_name}?`)) await call(`/api/admin/package-fields/${field.id}`, "DELETE"); }, "Field deleted.")}><Trash2 size={16} /></button>}
          </td>
        </tr>)}</tbody>
      </table>
      <div className="fs-new-row">
        {([["condition_val", "Key, e.g. team_seats"], ["field_name", "Name"]] as const).map(([key, placeholder]) =>
          <input key={key} placeholder={placeholder} value={adding[key] ?? ""}
            onChange={event => setAdding(current => ({ ...current, [key]: event.target.value }))} />)}
        <select aria-label="What it counts" value={adding.unit ?? "count"} onChange={event => setAdding(current => ({ ...current, unit: event.target.value }))}>
          <option value="count">A number</option><option value="bytes">Storage</option>
        </select>
        <select aria-label="When it refills" value={adding.period ?? "total"} onChange={event => setAdding(current => ({ ...current, period: event.target.value }))}>
          <option value="total">Never refills</option><option value="day">Every day</option><option value="month">Every month</option>
        </select>
        <select aria-label="Overages" value={adding.overages ?? "no"} onChange={event => setAdding(current => ({ ...current, overages: event.target.value }))}>
          <option value="no">No overages</option><option value="yes">Overages allowed</option>
        </select>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={busy} onClick={async () => {
          setBusy(true);
          await run(async () => { await call("/api/admin/package-fields", "POST", adding); setAdding({}); }, "Field added.")().finally(() => setBusy(false));
        }}>{busy ? <LoaderCircle className="fs-spin" size={14} /> : <Plus size={14} />}Add field</button>
      </div>
    </section>
  </div>;
}
