import { revalidatePath } from "next/cache";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@shared/server/db";
import { ApiError } from "@shared/server/api";
import { FEATURE_KEYS, FIELD_KEYS, cleanFields } from "@shared/bms";
import {
  appId, forgetCatalogue, getAppList, listFeatures, listFeaturePlans, getPackageFields, getPackageList,
  getPackageDetailByid, fieldsForStorage, now,
} from "@shared/server/bms";

/**
 * Editing the Business Management System from Administration: the apps, the
 * features a package can switch on, the sets those features are grouped into,
 * the fields a package hands out, and the packages themselves. Customers are
 * never edited here — they are sold packages, which writes a purchase.
 */

const text = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const slugOf = (value: unknown) => text(value, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const key = (value: unknown) => slugOf(value).replace(/-/g, "_");
const list = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? (() => { try { return JSON.parse(value); } catch { return []; } })() : [];
  return Array.isArray(raw) ? raw.map(item => String(item)) : [];
};

/** The pages that show the plans, rebuilt as soon as a package changes. */
function refreshPricing() {
  forgetCatalogue();
  for (const path of ["/", "/pricing"]) revalidatePath(path);
}

/** Everything the Administration screens need in one read. */
export async function planEngine() {
  const [packages, features, featurePlans, fields, apps] = await Promise.all([
    getPackageList(), listFeatures(), listFeaturePlans(), getPackageFields(), getAppList(),
  ]);
  const [counts] = await db.query<RowDataPacket[]>(
    "SELECT package_id, COUNT(*) AS held FROM tbl_package_purchase WHERE status='active' GROUP BY package_id");
  const held = new Map(counts.map(row => [Number(row.package_id), Number(row.held)]));
  return {
    packages: packages.map(item => ({ ...item, held: held.get(item.id) ?? 0 })),
    features, featurePlans, fields, apps,
    appFeatures: FEATURE_KEYS, appFields: FIELD_KEYS,
  };
}

/* ---------------------------------------------------------------- packages */

export async function addPackage(input: Record<string, unknown>, adminId: string) {
  const title = text(input.title, 120);
  if (!title) throw new ApiError(400, "Give the package a name.");
  const slug = slugOf(input.slug || title);
  const [existing] = await db.execute<RowDataPacket[]>("SELECT id FROM tbl_package_plans WHERE slug=?", [slug]);
  if (existing.length) throw new ApiError(409, "A package with that address already exists.");
  const app = await appId();
  const allFields = await getPackageFields();
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO tbl_package_plans
      (title, slug, blurb, app_ids, fields, overages, plan_type, plan_level, price, currency, period, sell_type,
       feature_plan, highlights, jvz_product_id, wp_product_id, cb_product_id, \`public\`, highlight, sort, status, updated_by, add_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, slug, text(input.blurb, 255) || null, JSON.stringify([app]),
      JSON.stringify(fieldsForStorage(cleanFields(input.fields), allFields, app)),
      JSON.stringify(fieldsForStorage(cleanFields(input.overages), allFields, app)),
      input.plan_type === "free" ? "free" : "paid",
      ["free", "fe", "upsell"].includes(String(input.plan_level)) ? input.plan_level : "fe",
      Math.max(0, Number(input.price) || 0), text(input.currency, 3).toUpperCase() || "USD",
      ["month", "year", "once"].includes(String(input.period)) ? input.period : "month",
      text(input.sell_type, 40) || null,
      input.feature_plan ? Number(input.feature_plan) : null,
      JSON.stringify(list(input.highlights).map(item => item.slice(0, 120)).slice(0, 12)),
      text(input.jvz_product_id, 255) || null, text(input.wp_product_id, 255) || null, text(input.cb_product_id, 255) || null,
      input.public === false ? 0 : 1, input.highlight ? 1 : 0, Math.round(Number(input.sort) || 0),
      input.status === "inactive" ? "inactive" : "active", adminId, now()]);
  refreshPricing();
  return getPackageDetailByid(Number(result.insertId));
}

export async function updatePackage(id: string | number, input: Record<string, unknown>, adminId: string) {
  const found = await getPackageDetailByid(id);
  if (!found) throw new ApiError(404, "Package not found.");
  const columns: string[] = []; const args: unknown[] = [];
  const set = (column: string, value: unknown) => { columns.push(`${column}=?`); args.push(value); };
  if (input.title !== undefined) set("title", text(input.title, 120) || found.title);
  if (input.slug !== undefined) set("slug", slugOf(input.slug) || found.slug);
  if (input.blurb !== undefined) set("blurb", text(input.blurb, 255) || null);
  if (input.plan_type !== undefined) set("plan_type", input.plan_type === "free" ? "free" : "paid");
  if (input.plan_level !== undefined && ["free", "fe", "upsell"].includes(String(input.plan_level))) set("plan_level", input.plan_level);
  if (input.price !== undefined) set("price", Math.max(0, Number(input.price) || 0));
  if (input.period !== undefined && ["month", "year", "once"].includes(String(input.period))) set("period", input.period);
  if (input.sell_type !== undefined) set("sell_type", text(input.sell_type, 40) || null);
  if (input.feature_plan !== undefined) set("feature_plan", input.feature_plan ? Number(input.feature_plan) : null);
  if (input.highlights !== undefined) set("highlights", JSON.stringify(list(input.highlights).map(item => item.slice(0, 120)).slice(0, 12)));
  if (input.jvz_product_id !== undefined) set("jvz_product_id", text(input.jvz_product_id, 255) || null);
  if (input.wp_product_id !== undefined) set("wp_product_id", text(input.wp_product_id, 255) || null);
  if (input.cb_product_id !== undefined) set("cb_product_id", text(input.cb_product_id, 255) || null);
  if (input.public !== undefined) set("`public`", input.public ? 1 : 0);
  if (input.highlight !== undefined) set("highlight", input.highlight ? 1 : 0);
  if (input.sort !== undefined) set("sort", Math.round(Number(input.sort) || 0));
  if (input.status !== undefined) set("status", input.status === "inactive" ? "inactive" : "active");
  if (input.fields !== undefined || input.overages !== undefined) {
    const allFields = await getPackageFields();
    const app = found.app_ids[0] ?? await appId();
    if (input.fields !== undefined) set("fields", JSON.stringify(fieldsForStorage(cleanFields(input.fields), allFields, app)));
    if (input.overages !== undefined) set("overages", JSON.stringify(fieldsForStorage(cleanFields(input.overages), allFields, app)));
  }
  if (!columns.length) return found;
  set("updated_by", adminId);
  await db.query(`UPDATE tbl_package_plans SET ${columns.join(", ")} WHERE id=?`, [...args, found.id]);
  refreshPricing();
  return getPackageDetailByid(found.id);
}

export async function deletePackage(id: string | number) {
  const [held] = await db.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM tbl_package_purchase WHERE package_id=? AND status='active'", [id]);
  if (Number(held[0].n)) throw new ApiError(400, "Customers still hold this package. Switch it off instead of deleting it.");
  await db.execute("DELETE FROM tbl_package_plans WHERE id=?", [id]);
  refreshPricing();
}

/* ------------------------------------------------------- features and sets */

export async function saveFeature(input: Record<string, unknown>) {
  const condition = key(input.condition_val);
  const feature = text(input.feature, 120);
  if (!condition || !feature) throw new ApiError(400, "A feature needs a key and a name.");
  const app = await appId();
  if (input.id) {
    await db.execute(
      "UPDATE tbl_features SET feature=?, area=?, description=?, sort=?, status=? WHERE id=?",
      [feature, text(input.area, 40) || "app", text(input.description, 255) || null,
        Math.round(Number(input.sort) || 0), input.status === "inactive" ? "inactive" : "active", Number(input.id)]);
    refreshPricing();
    return { id: Number(input.id), condition_val: condition };
  }
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO tbl_features (app_id, feature, condition_val, area, description, sort, status, add_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE feature=VALUES(feature), area=VALUES(area), description=VALUES(description),
       sort=VALUES(sort), status=VALUES(status)`,
    [app, feature, condition, text(input.area, 40) || "app", text(input.description, 255) || null,
      Math.round(Number(input.sort) || 0), input.status === "inactive" ? "inactive" : "active", now()]);
  refreshPricing();
  return { id: Number(result.insertId), condition_val: condition };
}

export async function deleteFeature(id: string | number) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT condition_val FROM tbl_features WHERE id=?", [id]);
  if (!rows.length) return;
  // A feature the app itself checks for cannot be removed; switch it off instead.
  if (FEATURE_KEYS.includes(String(rows[0].condition_val))) throw new ApiError(400, "The app checks for this feature. Switch it off instead of deleting it.");
  await db.execute("DELETE FROM tbl_features WHERE id=?", [id]);
  refreshPricing();
}

export async function saveFeaturePlan(input: Record<string, unknown>, adminId: string) {
  const name = text(input.plan_name, 120);
  if (!name) throw new ApiError(400, "Give the set a name.");
  const ids = list(input.feature_ids).map(Number).filter(Number.isFinite);
  if (input.id) {
    await db.execute(
      "UPDATE tbl_feature_plans SET plan_name=?, feature_ids=?, status=?, updated_by=? WHERE id=?",
      [name, JSON.stringify(ids), input.status === "inactive" ? "inactive" : "active", adminId, Number(input.id)]);
    refreshPricing();
    return { id: Number(input.id) };
  }
  const [result] = await db.query<ResultSetHeader>(
    "INSERT INTO tbl_feature_plans (plan_name, feature_ids, status, updated_by, add_time) VALUES (?, ?, ?, ?, ?)",
    [name, JSON.stringify(ids), input.status === "inactive" ? "inactive" : "active", adminId, now()]);
  refreshPricing();
  return { id: Number(result.insertId) };
}

export async function deleteFeaturePlan(id: string | number) {
  const [used] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM tbl_package_plans WHERE feature_plan=?", [id]);
  if (Number(used[0].n)) throw new ApiError(400, "Packages still use this set.");
  await db.execute("DELETE FROM tbl_feature_plans WHERE id=?", [id]);
  forgetCatalogue();
}

/* ----------------------------------------------------------- package fields */

export async function savePackageField(input: Record<string, unknown>) {
  const condition = key(input.condition_val);
  const name = text(input.field_name, 120);
  if (!condition || !name) throw new ApiError(400, "A field needs a key and a name.");
  const app = await appId();
  const shared = [
    name, ["yes", "no"].includes(String(input.overages)) ? input.overages : "no",
    ["text", "select"].includes(String(input.input_type)) ? input.input_type : "text",
    text(input.input_val, 500),
    ["data", "validity", "none"].includes(String(input.field_type)) ? input.field_type : "data",
    ["count", "bytes"].includes(String(input.unit)) ? input.unit : "count",
    ["day", "month", "total"].includes(String(input.period)) ? input.period : "total",
    Math.round(Number(input.sort) || 0), input.status === "inactive" ? "inactive" : "active",
  ];
  if (input.id) {
    await db.query(
      `UPDATE tbl_package_fields SET field_name=?, overages=?, input_type=?, input_val=?, field_type=?, unit=?, period=?, sort=?, status=?
       WHERE id=?`, [...shared, Number(input.id)]);
    forgetCatalogue();
    return { id: Number(input.id), condition_val: condition };
  }
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO tbl_package_fields (field_name, overages, input_type, input_val, field_type, unit, period, sort, status, condition_val, app_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE field_name=VALUES(field_name), overages=VALUES(overages), input_type=VALUES(input_type),
       input_val=VALUES(input_val), field_type=VALUES(field_type), unit=VALUES(unit), period=VALUES(period),
       sort=VALUES(sort), status=VALUES(status)`,
    [...shared, condition, app]);
  forgetCatalogue();
  return { id: Number(result.insertId), condition_val: condition };
}

export async function deletePackageField(id: string | number) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT condition_val FROM tbl_package_fields WHERE id=?", [id]);
  if (!rows.length) return;
  if (FIELD_KEYS.includes(String(rows[0].condition_val))) throw new ApiError(400, "The app enforces this field. Switch it off instead of deleting it.");
  await db.execute("DELETE FROM tbl_package_fields WHERE id=?", [id]);
  forgetCatalogue();
}

/* ---------------------------------------------------------------- purchases */

/** Every purchase, for the ledger in Administration. */
export async function getPurchaseList(options: { search?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const pageSize = Math.min(100, Math.max(5, options.pageSize ?? 25));
  const page = Math.max(1, options.page ?? 1);
  const where: string[] = []; const args: unknown[] = [];
  if (options.search) { where.push("(p.title LIKE ? OR u.email LIKE ?)"); args.push(`%${options.search}%`, `%${options.search}%`); }
  if (options.status === "active" || options.status === "inactive") { where.push("p.status=?"); args.push(options.status); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [[count]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM tbl_package_purchase p LEFT JOIN \`user\` u ON u.id=p.user_id ${clause}`, args);
  const [[totals]] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, SUM(status='active') AS active, SUM(status='inactive') AS inactive FROM tbl_package_purchase");
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.user_id, p.package_id, p.order_id, p.title, p.plan_type, p.plan_level, p.price, p.sell_type,
            p.source, p.status, p.add_time, p.expire_time, u.email, u.name
     FROM tbl_package_purchase p LEFT JOIN \`user\` u ON u.id=p.user_id ${clause}
     ORDER BY p.id DESC LIMIT ? OFFSET ?`, [...args, pageSize, (page - 1) * pageSize]);
  return {
    purchases: rows, total: Number(count.n), page, pageSize,
    totals: { total: Number(totals.total), active: Number(totals.active || 0), inactive: Number(totals.inactive || 0) },
  };
}
