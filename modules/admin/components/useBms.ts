"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * What every plan screen needs: the whole engine in one read, and one way to
 * change it. A save reloads the engine, so each screen shows what the others
 * did without a refresh.
 */

export type PackagePlan = {
  id: number; title: string; slug: string; blurb: string | null; app_ids: number[];
  fields: Record<string, string>; overages: Record<string, string>;
  plan_type: string; plan_level: string; price: number; currency: string; period: string;
  sell_type: string | null; feature_plan: number | null; feature_keys: string[]; highlights: string[];
  jvz_product_id: string | null; wp_product_id: string | null; cb_product_id: string | null;
  public: boolean; highlight: boolean; sort: number; status: string; held: number;
};
export type Feature = { id: number; app_id: number; feature: string; condition_val: string; area: string; description: string | null; sort: number; status: string };
export type FeaturePlan = { id: number; plan_name: string; feature_ids: number[]; status: string };
export type PackageField = {
  id: number; field_name: string; condition_val: string; app_id: number; overages: string;
  input_type: string; input_val: string; field_type: string; unit: string; period: string; sort: number; status: string;
};
export type App = { id: number; app_name: string; status: string };

export type Engine = {
  packages: PackagePlan[]; features: Feature[]; featurePlans: FeaturePlan[]; fields: PackageField[]; apps: App[];
  appFeatures: string[]; appFields: string[];
};

export function useBms() {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  // A busy database can drop a connection; one read is worth a second try
  // before the screen tells anyone something went wrong.
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          const res = await fetch("/api/admin/bms", { cache: "no-store" });
          const data = await res.json(); if (!res.ok) throw new Error(data.error);
          setEngine(data);
          return;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise(resolve => setTimeout(resolve, 900));
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the plans."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const call = useCallback(async (url: string, method: string, body?: unknown) => {
    setError(""); setNote("");
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "That did not work.");
    await load();
    return data;
  }, [load]);

  const run = useCallback((fn: () => Promise<unknown>, done: string) => async () => {
    try { await fn(); setNote(done); } catch (e) { setError(e instanceof Error ? e.message : "That did not work."); }
  }, []);

  return { engine, loading, error, note, setError, setNote, load, call, run };
}
