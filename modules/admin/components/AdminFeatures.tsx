"use client";
import AdminLoading from "./AdminLoading";
import { useState } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import Tiles from "./Tiles";
import { useBms } from "./useBms";

/** Features: the switches a package can turn on, each named by its condition_val. */
export default function AdminFeatures() {
  const { engine, loading, error, note, call, run } = useBms();
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!engine) return error
    ? <p className="fs-alert" role="alert">{error}</p>
    : <AdminLoading label="Loading features..." />;

  const appName = (id: number) => engine.apps.find(app => app.id === id)?.app_name ?? id;

  return <div className="fs-admin-plans" aria-busy={loading}>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}

    <Tiles items={[
      ["Total features", engine.features.length],
      ["Active", engine.features.filter(feature => feature.status === "active").length],
      ["Inactive", engine.features.filter(feature => feature.status === "inactive").length],
    ]} />

    <section className="fs-settings-card fs-wide">
      <p className="fs-muted fs-small">What a package can switch on. A key in bold is one the app itself checks for — switch those off rather than deleting them.</p>
      <table className="fs-admin-table">
        <thead><tr><th>Feature</th><th>App</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{engine.features.map(feature => <tr key={feature.id} className={feature.status === "inactive" ? "fs-row-suspended" : ""}>
          <td><strong>{feature.feature}</strong>
            <small><code className={engine.appFeatures.includes(feature.condition_val) ? "fs-key-live" : ""}>{feature.condition_val}</code>
              {" · "}{feature.area}{feature.description ? ` · ${feature.description}` : ""}</small>
          </td>
          <td>{appName(feature.app_id)}</td>
          <td><em className={feature.status === "active" ? "fs-pill-ok" : "fs-pill-bad"}>{feature.status}</em></td>
          <td className="fs-row">
            <button className="fs-btn fs-outline fs-btn-sm"
              onClick={run(() => call("/api/admin/features", "POST", { ...feature, status: feature.status === "active" ? "inactive" : "active" }), "Feature updated.")}>
              {feature.status === "active" ? "Switch off" : "Switch on"}
            </button>
            {!engine.appFeatures.includes(feature.condition_val) && <button className="fs-lib-icon" aria-label={`Delete ${feature.feature}`}
              onClick={run(async () => { if (window.confirm(`Delete ${feature.feature}?`)) await call(`/api/admin/features/${feature.id}`, "DELETE"); }, "Feature deleted.")}><Trash2 size={16} /></button>}
          </td>
        </tr>)}</tbody>
      </table>
      <div className="fs-new-row">
        {([["condition_val", "Key, e.g. team_seats"], ["feature", "Name"], ["area", "Area"]] as const).map(([key, placeholder]) =>
          <input key={key} placeholder={placeholder} value={adding[key] ?? ""}
            onChange={event => setAdding(current => ({ ...current, [key]: event.target.value }))} />)}
        <button className="fs-btn fs-outline fs-btn-sm" disabled={busy} onClick={async () => {
          setBusy(true);
          await run(async () => { await call("/api/admin/features", "POST", adding); setAdding({}); }, "Feature added.")().finally(() => setBusy(false));
        }}>{busy ? <LoaderCircle className="fs-spin" size={14} /> : <Plus size={14} />}Add feature</button>
      </div>
    </section>
  </div>;
}
