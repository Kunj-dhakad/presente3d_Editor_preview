"use client";
import AdminLoading from "./AdminLoading";
import FeaturePlanForm from "./FeaturePlanForm";
import { useState } from "react";
import { Check, Layers, Plus, Trash2 } from "lucide-react";
import Tiles from "./Tiles";
import { useBms, type FeaturePlan } from "./useBms";

/** Feature plans: the named sets of features a package points at. */
export default function AdminFeaturePlans() {
  const { engine, loading, error, note, setNote, call, run } = useBms();
  const [editing, setEditing] = useState<FeaturePlan | "new" | null>(null);

  if (!engine) return error
    ? <p className="fs-alert" role="alert">{error}</p>
    : <AdminLoading label="Loading feature plans..." />;

  const names = (ids: number[]) => ids
    .map(id => engine.features.find(feature => feature.id === id)?.feature)
    .filter(Boolean);

  return <div className="fs-admin-plans fs-admin-feature-plans" aria-busy={loading}>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}

    <Tiles items={[
      ["Total feature plans", engine.featurePlans.length],
      ["Active", engine.featurePlans.filter(set => set.status === "active").length],
      ["Inactive", engine.featurePlans.filter(set => set.status === "inactive").length],
    ]} />

    <section className="fs-settings-card fs-wide fs-feature-plan-catalog">
      <div className="fs-feature-plan-toolbar">
        <div><h2>Feature plan catalog</h2><p className="fs-muted">Group features into reusable plans for your packages.</p></div>
        <button className="fs-btn fs-primary fs-btn-sm" onClick={() => setEditing("new")}><Plus size={15} />New feature plan</button>
      </div>
      <div className="fs-feature-plan-table-scroll" role="region" aria-label="Feature plans" tabIndex={0}>
      <table className="fs-admin-table">
        <thead><tr><th>Plan name</th><th>Included features</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {engine.featurePlans.length ? engine.featurePlans.map(set => {
            const features = names(set.feature_ids);
            const packages = engine.packages.filter(item => item.feature_plan === set.id).length;
            return <tr key={set.id} className={set.status === "inactive" ? "fs-row-suspended" : ""}>
            <td><div className="fs-feature-plan-identity"><span className="fs-feature-plan-icon" aria-hidden="true"><Layers size={19} /></span><div><strong>{set.plan_name}</strong>
              <small>{packages} package{packages === 1 ? "" : "s"} using this plan</small>
            </div></div></td>
            <td className="fs-chips"><small className="fs-feature-plan-count">{features.length} feature{features.length === 1 ? "" : "s"} included</small><div className="fs-feature-plan-chips">{features.map(name => <span key={name} className="fs-limit-chip">{name}</span>)}</div></td>
            <td><em className={set.status === "active" ? "fs-pill-ok" : "fs-pill-bad"}>{set.status}</em></td>
            <td><div className="fs-feature-plan-actions">
              <button className="fs-btn fs-outline fs-btn-sm" onClick={() => setEditing(set)}>Edit</button>
              <button className="fs-btn fs-outline fs-btn-sm"
                onClick={run(() => call("/api/admin/feature-plans", "POST", { id: set.id, plan_name: set.plan_name, feature_ids: set.feature_ids, status: set.status === "active" ? "inactive" : "active" }), "Feature plan updated.")}>
                {set.status === "active" ? "Switch off" : "Switch on"}
              </button>
              <button className="fs-lib-icon fs-feature-plan-delete" title={`Delete ${set.plan_name}`} aria-label={`Delete ${set.plan_name}`}
                onClick={run(async () => { if (window.confirm(`Delete ${set.plan_name}?`)) await call(`/api/admin/feature-plans/${set.id}`, "DELETE"); }, "Feature plan deleted.")}><Trash2 size={16} /></button>
            </div></td>
          </tr>;
          }) : <tr><td colSpan={4}><div className="fs-feature-plan-empty"><Layers size={28} aria-hidden="true" /><strong>No feature plans yet</strong><p>Create a feature plan to group features for your packages.</p></div></td></tr>}
        </tbody>
      </table>
      </div>
    </section>

    {editing && <FeaturePlanForm features={engine.features} value={editing === "new" ? null : editing} onClose={() => setEditing(null)}
      onSave={async value => { await call("/api/admin/feature-plans", "POST", value); setEditing(null); setNote("Feature plan saved."); }} />}
  </div>;
}

