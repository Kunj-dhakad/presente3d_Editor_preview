import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "./db";
import { ApiError } from "./api";
import { FIELD_CATALOGUE, UNLIMITED, cleanFields, mergeFields, type FieldValues } from "@shared/bms";

/**
 * Reading and writing the Business Management System.
 *
 * The shape follows the reference: packages hand out a feature plan and a value
 * per package field; buying one writes a copy of it into tbl_package_purchase;
 * and what a customer may do is every active purchase read together
 * (checkForPackage), which is also kept on the account as user_package.
 */

export type App = { id: number; app_name: string; status: string };
export type Feature = { id: number; app_id: number; feature: string; condition_val: string; area: string; description: string | null; sort: number; status: string };
export type FeaturePlan = { id: number; plan_name: string; feature_ids: number[]; status: string; add_time: number };
export type PackageField = {
  id: number; field_name: string; condition_val: string; app_id: number; overages: string;
  input_type: string; input_val: string; field_type: string; unit: string; period: string; sort: number; status: string;
};
export type PackagePlan = {
  id: number; title: string; slug: string; blurb: string | null; app_ids: number[];
  /** The value of every field this package hands out, by the field's condition_val. */
  fields: FieldValues; overages: FieldValues;
  plan_type: string; plan_level: string; price: number; currency: string; period: string;
  sell_type: string | null; feature_plan: number | null; feature_keys: string[];
  highlights: string[]; jvz_product_id: string | null; wp_product_id: string | null; cb_product_id: string | null;
  public: boolean; highlight: boolean; sort: number; status: string; add_time: number;
};
export type Purchase = {
  id: number; user_id: string; package_id: number; order_id: number | null; transaction_id: number | null;
  title: string; fields: FieldValues; plan_type: string; plan_level: string; price: number;
  sell_type: string | null; feature_plan: number | null; source: string; note: string | null;
  status: string; add_time: number; expire_time: number | null;
};

/** What checkForPackage() works out: the same keys the reference writes. */
export type UserPackage = {
  user_id: string;
  title: string | null;
  package_id: number | null;
  slug: string | null;
  plan_type: string | null;
  plan_level: string | null;
  price: number;
  /** How the newest package is billed, for the words the site shows. */
  period: string;
  currency: string;
  sell_type: string | null;
  /** Every field the app enforces, by condition_val, with the merged value. */
  fields: Record<string, { field_name: string; condition_val: string; unit: string; period: string; field_type: string; value: string | null; type_value: string | null }>;
  features: string[];
  add_time: number;
  paid_user: "yes" | "no";
  purchases: Purchase[];
};

export const now = () => Math.floor(Date.now() / 1000);

/**
 * Features, feature plans and package fields change only when an administrator
 * edits them, but every request that asks what an account may do needs all
 * three. They are held for half a minute, and Administration clears them the
 * moment it changes one — another server picks the change up when its own half
 * minute is over.
 */
const CATALOGUE_TTL = 30_000;
type Catalogue = { features: Feature[]; plans: FeaturePlan[]; fields: PackageField[]; keys: Map<number, string[]> };
const held = globalThis as unknown as { bmsCatalogue?: { at: number; value: Promise<Catalogue> } };

export function forgetCatalogue() { held.bmsCatalogue = undefined; }

async function readCatalogue(): Promise<Catalogue> {
  const [features, plans, fields] = await Promise.all([getFeatureList(), getFeaturePlanList(), readPackageFields()]);
  const byId = new Map(features.filter(feature => feature.status === "active").map(feature => [feature.id, feature.condition_val]));
  return {
    features, plans, fields,
    keys: new Map(plans.map(plan => [plan.id, plan.feature_ids.map(id => byId.get(id)).filter((key): key is string => Boolean(key))])),
  };
}

function catalogue(): Promise<Catalogue> {
  if (!held.bmsCatalogue || Date.now() - held.bmsCatalogue.at > CATALOGUE_TTL) {
    held.bmsCatalogue = { at: Date.now(), value: readCatalogue().catch(error => { forgetCatalogue(); throw error; }) };
  }
  return held.bmsCatalogue.value;
}

const json = <T,>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
};

/* --------------------------------------------------------------- the app */

/** This installation sells one product; its row is made by the seed. */
export async function appId(): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>("SELECT id FROM tbl_apps ORDER BY id LIMIT 1");
  return rows.length ? Number(rows[0].id) : 1;
}

export async function getAppList(): Promise<App[]> {
  const [rows] = await db.query<RowDataPacket[]>("SELECT * FROM tbl_apps ORDER BY id");
  return rows.map(row => ({ id: Number(row.id), app_name: String(row.app_name), status: String(row.status) }));
}

/* ------------------------------------------------------- features and sets */

async function getFeatureList(activeOnly = false): Promise<Feature[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM tbl_features ${activeOnly ? "WHERE status='active'" : ""} ORDER BY area, sort, feature`);
  return rows.map(row => ({
    id: Number(row.id), app_id: Number(row.app_id), feature: String(row.feature), condition_val: String(row.condition_val),
    area: String(row.area), description: row.description ?? null, sort: Number(row.sort), status: String(row.status),
  }));
}

async function getFeaturePlanList(activeOnly = false): Promise<FeaturePlan[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM tbl_feature_plans ${activeOnly ? "WHERE status='active'" : ""} ORDER BY plan_name`);
  return rows.map(row => ({
    id: Number(row.id), plan_name: String(row.plan_name), feature_ids: json<(string | number)[]>(row.feature_ids, []).map(Number),
    status: String(row.status), add_time: Number(row.add_time),
  }));
}

/** The condition_val of every feature a feature plan switches on. */
const featurePlanKeys = async () => (await catalogue()).keys;
export const listFeatures = async () => (await catalogue()).features;
export const listFeaturePlans = async () => (await catalogue()).plans;

/* --------------------------------------------------------- package fields */

async function readPackageFields(appIds?: number[]): Promise<PackageField[]> {
  const [rows] = appIds?.length
    ? await db.query<RowDataPacket[]>("SELECT * FROM tbl_package_fields WHERE app_id IN (?) ORDER BY sort, field_name", [appIds])
    : await db.query<RowDataPacket[]>("SELECT * FROM tbl_package_fields ORDER BY sort, field_name");
  return rows.map(row => ({
    id: Number(row.id), field_name: String(row.field_name), condition_val: String(row.condition_val), app_id: Number(row.app_id),
    overages: String(row.overages), input_type: String(row.input_type), input_val: String(row.input_val ?? ""),
    field_type: String(row.field_type), unit: String(row.unit), period: String(row.period),
    sort: Number(row.sort), status: String(row.status),
  }));
}

/** Every package field, from the half-minute catalogue. */
export const getPackageFields = async (appIds?: number[]) => appIds?.length
  ? (await catalogue()).fields.filter(field => appIds.includes(field.app_id))
  : (await catalogue()).fields;

/**
 * The reference stores a package's values as app id → field id → [value]. These
 * two turn that into the condition_val keys the app reads, and back again.
 */
export function fieldsByCondition(raw: unknown, fields: PackageField[]): FieldValues {
  const byId = new Map(fields.map(field => [String(field.id), field.condition_val]));
  const values: FieldValues = {};
  const stored = json<Record<string, Record<string, unknown>>>(raw, {});
  for (const perApp of Object.values(stored)) {
    if (!perApp || typeof perApp !== "object") continue;
    for (const [fieldId, value] of Object.entries(perApp)) {
      const key = byId.get(String(fieldId));
      if (!key) continue;
      values[key] = String(Array.isArray(value) ? value[0] : value);
    }
  }
  return values;
}

export function fieldsForStorage(values: FieldValues, fields: PackageField[], app: number) {
  const byKey = new Map(fields.map(field => [field.condition_val, field.id]));
  const perApp: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(values)) {
    const id = byKey.get(key);
    if (id) perApp[String(id)] = [value];
  }
  return { [String(app)]: perApp };
}

/* ------------------------------------------------------------- packages */

function toPackage(row: RowDataPacket, fields: PackageField[], keys: Map<number, string[]>): PackagePlan {
  return {
    id: Number(row.id), title: String(row.title), slug: String(row.slug), blurb: row.blurb ?? null,
    app_ids: json<(string | number)[]>(row.app_ids, []).map(Number),
    fields: fieldsByCondition(row.fields, fields), overages: fieldsByCondition(row.overages, fields),
    plan_type: String(row.plan_type), plan_level: String(row.plan_level), price: Number(row.price),
    currency: String(row.currency), period: String(row.period), sell_type: row.sell_type ?? null,
    feature_plan: row.feature_plan === null ? null : Number(row.feature_plan),
    feature_keys: keys.get(Number(row.feature_plan)) ?? [],
    highlights: json<string[]>(row.highlights, []),
    jvz_product_id: row.jvz_product_id ?? null, wp_product_id: row.wp_product_id ?? null, cb_product_id: row.cb_product_id ?? null,
    public: Boolean(row.public), highlight: Boolean(row.highlight), sort: Number(row.sort),
    status: String(row.status), add_time: Number(row.add_time),
  };
}

export async function getPackageList(options: { publicOnly?: boolean } = {}): Promise<PackagePlan[]> {
  const [fields, keys] = await Promise.all([getPackageFields(), featurePlanKeys()]);
  const where = options.publicOnly ? "WHERE status='active' AND `public`=1" : "";
  const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM tbl_package_plans ${where} ORDER BY sort, price`);
  return rows.map(row => toPackage(row, fields, keys));
}

/** By id, or by the address the pricing page uses. */
export async function getPackageDetailByid(id: string | number): Promise<PackagePlan | null> {
  const [fields, keys] = await Promise.all([getPackageFields(), featurePlanKeys()]);
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT * FROM tbl_package_plans WHERE id=? OR slug=? LIMIT 1", [Number(id) || 0, String(id)]);
  return rows.length ? toPackage(rows[0], fields, keys) : null;
}

/* ------------------------------------------------------------ purchases */

function toPurchase(row: RowDataPacket, fields: PackageField[]): Purchase {
  return {
    id: Number(row.id), user_id: String(row.user_id), package_id: Number(row.package_id),
    order_id: row.order_id === null ? null : Number(row.order_id),
    transaction_id: row.transaction_id === null ? null : Number(row.transaction_id),
    title: String(row.title), fields: fieldsByCondition(row.fields, fields),
    plan_type: String(row.plan_type), plan_level: String(row.plan_level), price: Number(row.price),
    sell_type: row.sell_type ?? null, feature_plan: row.feature_plan === null ? null : Number(row.feature_plan),
    source: String(row.source), note: row.note ?? null, status: String(row.status),
    add_time: Number(row.add_time), expire_time: row.expire_time === null ? null : Number(row.expire_time),
  };
}

/** Everything a customer holds right now, newest first. */
export async function getPurchaseData(userId: string): Promise<Purchase[]> {
  const fields = await getPackageFields();
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT * FROM tbl_package_purchase
     WHERE user_id=? AND status='active' AND (expire_time IS NULL OR expire_time > ?)
     ORDER BY id DESC`, [userId, now()]);
  return rows.map(row => toPurchase(row, fields));
}

/**
 * What this account may do: every active purchase read together. Unlimited
 * beats any number and otherwise the larger wins, so an upsell adds to what the
 * customer already holds. The newest purchase names the plan.
 */
export async function checkForPackage(userId: string): Promise<UserPackage> {
  const [purchases, fields, keys] = await Promise.all([getPurchaseData(userId), getPackageFields(), featurePlanKeys()]);
  const empty: UserPackage = {
    user_id: userId, title: null, package_id: null, slug: null, plan_type: null, plan_level: null,
    price: 0, period: "month", currency: "USD", sell_type: null, fields: {}, features: [],
    add_time: 0, paid_user: "no", purchases: [],
  };
  if (!purchases.length) return empty;

  let values: FieldValues = {};
  const features = new Set<string>();
  for (const purchase of purchases) {
    values = mergeFields(values, purchase.fields);
    for (const key of keys.get(Number(purchase.feature_plan)) ?? []) features.add(key);
  }

  const newest = purchases[0];
  const [sold] = await db.execute<RowDataPacket[]>(
    "SELECT slug, period, currency FROM tbl_package_plans WHERE id=?", [newest.package_id]);
  return {
    user_id: userId, title: newest.title, package_id: newest.package_id,
    slug: sold.length ? String(sold[0].slug) : null,
    plan_type: newest.plan_type, plan_level: newest.plan_level, price: newest.price,
    period: sold.length ? String(sold[0].period) : "month", currency: sold.length ? String(sold[0].currency) : "USD",
    sell_type: newest.sell_type,
    fields: Object.fromEntries(fields.map(field => [field.condition_val, {
      field_name: field.field_name, condition_val: field.condition_val, unit: field.unit, period: field.period,
      field_type: field.field_type, value: values[field.condition_val] ?? null, type_value: null,
    }])),
    features: [...features],
    add_time: newest.add_time,
    paid_user: purchases.some(purchase => purchase.price > 0) ? "yes" : "no",
    purchases,
  };
}

/** One field's allowance: a number, "unlimited", or null when nothing grants it. */
export const fieldValue = (account: UserPackage, condition_val: string) => account.fields[condition_val]?.value ?? null;
export const allows = (account: UserPackage, condition_val: string) => account.features.includes(condition_val);

/**
 * Works the account's entitlements out again and keeps them on the account, the
 * way the reference does after every purchase. The old plan column is kept in
 * step so Administration can still sort and filter by plan.
 */
export async function updateUserPackage(userId: string): Promise<UserPackage> {
  const account = await checkForPackage(userId);
  await db.execute(
    `INSERT INTO user_plans (user_id, plan, user_package) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE plan=VALUES(plan), user_package=VALUES(user_package)`,
    [userId, account.slug ?? "free", JSON.stringify(account)]);
  return account;
}

/** Sells a package to a customer: a copy of it as it is today. */
export async function addPackagePurchase(
  userId: string, transactionId: number | null, packageId: string | number,
  options: { orderId?: number | null; source?: string; months?: number; note?: string; adminId?: string; fields?: FieldValues } = {},
) {
  const found = await getPackageDetailByid(packageId);
  if (!found) throw new ApiError(404, "That package no longer exists.");
  const allFields = await getPackageFields();
  const app = found.app_ids[0] ?? await appId();
  const values = options.fields ? cleanFields(options.fields) : found.fields;
  const months = Number(options.months);
  const expire = Number.isFinite(months) && months > 0 ? now() + Math.round(months * 30.4375 * 86400) : null;
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO tbl_package_purchase
      (user_id, transaction_id, package_id, order_id, title, app_ids, fields, overages, plan_type, plan_level,
       price, sell_type, feature_plan, source, note, created_by, status, add_time, expire_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [userId, transactionId, found.id, options.orderId ?? null, found.title, JSON.stringify(found.app_ids),
      JSON.stringify(fieldsForStorage(values, allFields, app)), JSON.stringify(fieldsForStorage(found.overages, allFields, app)),
      found.plan_type, found.plan_level, found.price, found.sell_type, found.feature_plan,
      options.source ?? "admin", options.note ?? null, options.adminId ?? null, now(), expire]);
  await updateUserPackage(userId);
  return { id: Number(result.insertId), package: found };
}

/** Ends a purchase — a refund, or one an administrator gave by mistake. */
export async function changePackageStatus(purchaseId: number | string, status: "active" | "inactive" = "inactive") {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT user_id FROM tbl_package_purchase WHERE id=?", [purchaseId]);
  if (!rows.length) throw new ApiError(404, "That purchase is not there.");
  await db.execute("UPDATE tbl_package_purchase SET status=? WHERE id=?", [status, purchaseId]);
  await updateUserPackage(String(rows[0].user_id));
}

/** Ends every purchase an order paid for (the order was refunded). */
export async function revokeOrderPurchases(orderId: number, userId: string) {
  await db.execute("UPDATE tbl_package_purchase SET status='inactive' WHERE order_id=? AND status='active'", [orderId]);
  await updateUserPackage(userId);
}

/** A new account starts on the free package, exactly as the reference does. */
export async function setFreePlan(userId: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id FROM tbl_package_plans WHERE status='active' AND plan_type='free' ORDER BY sort LIMIT 1");
  if (!rows.length) return null;
  const [held] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM tbl_package_purchase WHERE user_id=? AND package_id=? LIMIT 1", [userId, rows[0].id]);
  if (held.length) return null;
  return addPackagePurchase(userId, null, Number(rows[0].id), { source: "signup" });
}

/* --------------------------------------------------------- the price list */

export type PublicPlan = {
  id: string; slug: string; name: string; blurb: string; price: string; period: string; priceCents: number;
  highlights: string[]; highlight: boolean; level: string;
};

const priceText = (price: number, currency: string) =>
  price === 0 ? "$0" : `${currency === "USD" ? "$" : ""}${price.toFixed(price % 1 ? 2 : 0)}${currency === "USD" ? "" : " " + currency}`;

/**
 * The plans a visitor is offered. A site whose packages have not been seeded
 * yet still shows the ones the app ships with.
 */
export async function publicPlans(): Promise<PublicPlan[]> {
  try {
    const packages = await getPackageList({ publicOnly: true });
    if (packages.length) {
      return packages.map(item => ({
        id: item.slug, slug: item.slug, name: item.title, blurb: item.blurb ?? "",
        price: priceText(item.price, item.currency),
        period: item.period === "once" ? "one time" : `per ${item.period}`,
        priceCents: Math.round(item.price * 100), highlights: item.highlights, highlight: item.highlight, level: item.plan_level,
      }));
    }
  } catch (error) {
    console.warn("Packages could not be read:", error instanceof Error ? error.message : error);
  }
  const { STARTER_PACKAGES } = await import("@shared/bms");
  return STARTER_PACKAGES.map(item => ({
    id: item.slug, slug: item.slug, name: item.title, blurb: item.blurb,
    price: priceText(item.price, "USD"), period: `per ${item.period}`, priceCents: Math.round(item.price * 100),
    highlights: item.highlights, highlight: item.highlight, level: item.plan_level,
  }));
}

/** Used by the screens that show a field's meaning without a database read. */
export const fieldMeaning = (condition_val: string) => FIELD_CATALOGUE.find(field => field.condition_val === condition_val);
export { UNLIMITED };
