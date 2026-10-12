import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@shared/server/db";
import { ApiError } from "@shared/server/api";
import { sendEmail } from "@shared/server/mail";
import { addPackagePurchase, getPackageDetailByid, now, revokeOrderPurchases, updateUserPackage } from "@shared/server/bms";

/**
 * Package orders. Nothing on the site creates one: Administration writes down
 * what was paid, and completing an order is what sells the customer the
 * package — which is what carries the features and the allowances.
 */

export type PaymentStatus = "new" | "process" | "complete" | "pending" | "free" | "refunded" | "cancelled";
export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "new", "process", "complete", "free", "refunded", "cancelled"];
/** The two that hand the package over. */
const PAID: PaymentStatus[] = ["complete", "free"];

export type PackageOrder = {
  id: number; number: string; package_id: number | null; trans_id: number | null; purchase_id: number | null;
  user_id: string; user_email: string; name?: string | null; title?: string | null;
  price: number; currency: string; months: number; payment_mode: string | null; payment_status: PaymentStatus;
  reference: string | null; message: string | null; order_time: number; paid_time: number | null;
};

const money = (price: number, currency: string) => `${currency === "USD" ? "$" : ""}${price.toFixed(2)}${currency === "USD" ? "" : " " + currency}`;

/** ABC-20260921-4831: readable, sortable and unique enough to quote in an email. */
function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ABC-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function getOrderList(options: { search?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const pageSize = Math.min(100, Math.max(5, options.pageSize ?? 25));
  const page = Math.max(1, options.page ?? 1);
  const where: string[] = []; const args: unknown[] = [];
  if (options.search) { where.push("(o.user_email LIKE ? OR o.number LIKE ? OR o.reference LIKE ?)"); args.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`); }
  if (options.status && PAYMENT_STATUSES.includes(options.status as PaymentStatus)) { where.push("o.payment_status=?"); args.push(options.status); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [[count]] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM tbl_package_order o ${clause}`, args);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT o.*, u.name, p.title FROM tbl_package_order o
     LEFT JOIN \`user\` u ON u.id = o.user_id
     LEFT JOIN tbl_package_plans p ON p.id = o.package_id ${clause}
     ORDER BY o.order_time DESC, o.id DESC LIMIT ? OFFSET ?`, [...args, pageSize, (page - 1) * pageSize]);
  const [[totals]] = await db.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(CASE WHEN payment_status='complete' THEN price ELSE 0 END),0) AS paid,
            COUNT(*) AS orders, SUM(payment_status='pending') AS pending,
            SUM(payment_status='process') AS process, SUM(payment_status='complete') AS complete
     FROM tbl_package_order`);
  return {
    orders: rows as PackageOrder[], total: Number(count.n), page, pageSize,
    totals: {
      paid: Number(totals.paid), orders: Number(totals.orders), pending: Number(totals.pending || 0),
      process: Number(totals.process || 0), complete: Number(totals.complete || 0),
    },
  };
}

/** Finds the customer by email or id, so an order always belongs to a real account. */
async function findUser(input: { userId?: unknown; email?: unknown }) {
  const email = String(input.email ?? "").trim().toLowerCase();
  const id = String(input.userId ?? "").trim();
  const [rows] = id
    ? await db.execute<RowDataPacket[]>("SELECT id, email, name FROM `user` WHERE id=?", [id])
    : await db.execute<RowDataPacket[]>("SELECT id, email, name FROM `user` WHERE LOWER(email)=?", [email]);
  if (!rows.length) throw new ApiError(404, "No account with that email. The customer has to sign up first.");
  return rows[0] as { id: string; email: string; name: string };
}

export async function addPackageOrder(input: Record<string, unknown>, adminId: string) {
  const user = await findUser({ userId: input.userId, email: input.email });
  const found = await getPackageDetailByid(String(input.package_id ?? input.plan ?? ""));
  if (!found) throw new ApiError(400, "Choose a package.");
  const months = Math.min(36, Math.max(1, Math.round(Number(input.months) || 1)));
  const asked = Number(input.price);
  const price = Number.isFinite(asked) && asked >= 0 ? asked : found.price * months;
  const status = PAYMENT_STATUSES.includes(input.payment_status as PaymentStatus) ? input.payment_status as PaymentStatus : "pending";
  const number = orderNumber();
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO tbl_package_order
      (number, package_id, user_id, user_email, price, currency, months, payment_mode, payment_status, reference, message, created_by, order_time, paid_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [number, found.id, user.id, user.email, price, String(input.currency || found.currency).toUpperCase().slice(0, 3), months,
      String(input.payment_mode || "").slice(0, 32) || null, status,
      String(input.reference || "").slice(0, 80) || null, String(input.message || "").slice(0, 500) || null,
      adminId, now(), PAID.includes(status) ? now() : null]);
  const id = Number(result.insertId);
  if (PAID.includes(status)) await completeOrder(id, user.id, found.id, months, adminId);
  if (input.notify !== false) {
    await notify({ user_email: user.email, title: found.title, price, currency: "USD", number, message: String(input.message || "") || null },
      user.name, PAID.includes(status) ? "plan-active" : "order-created", adminId);
  }
  return { id, number, package_id: found.id, user_id: user.id, user_email: user.email, price, months, payment_status: status };
}

export async function updatePackageOrder(id: string | number, input: Record<string, unknown>, adminId: string) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT * FROM tbl_package_order WHERE id=?", [id]);
  const order = rows[0] as PackageOrder | undefined;
  if (!order) throw new ApiError(404, "Order not found.");
  const columns: string[] = []; const args: unknown[] = [];
  if (input.message !== undefined) { columns.push("message=?"); args.push(String(input.message || "").slice(0, 500) || null); }
  if (input.reference !== undefined) { columns.push("reference=?"); args.push(String(input.reference || "").slice(0, 80) || null); }
  if (input.payment_mode !== undefined) { columns.push("payment_mode=?"); args.push(String(input.payment_mode || "").slice(0, 32) || null); }
  let becamePaid = false;
  if (input.payment_status !== undefined) {
    const status = String(input.payment_status) as PaymentStatus;
    if (!PAYMENT_STATUSES.includes(status)) throw new ApiError(400, "Unknown status.");
    becamePaid = PAID.includes(status) && !PAID.includes(order.payment_status);
    columns.push("payment_status=?"); args.push(status);
    if (becamePaid) { columns.push("paid_time=?"); args.push(now()); }
    // Refunding or cancelling a paid order takes back what it paid for.
    if (PAID.includes(order.payment_status) && (status === "refunded" || status === "cancelled")) {
      await revokeOrderPurchases(Number(order.id), order.user_id);
    }
  }
  if (columns.length) await db.query(`UPDATE tbl_package_order SET ${columns.join(", ")} WHERE id=?`, [...args, order.id]);
  if (becamePaid && order.package_id) {
    await completeOrder(Number(order.id), order.user_id, order.package_id, order.months, adminId);
    const found = await getPackageDetailByid(order.package_id);
    if (input.notify !== false) {
      await notify({ user_email: order.user_email, title: found?.title ?? "", price: order.price, currency: order.currency, number: order.number, message: order.message },
        null, "plan-active", adminId);
    }
  }
  return { ...order, ...(input as Partial<PackageOrder>) };
}

export async function deletePackageOrder(id: string | number) {
  const [rows] = await db.execute<RowDataPacket[]>("SELECT user_id FROM tbl_package_order WHERE id=?", [id]);
  await db.execute("DELETE FROM tbl_package_order WHERE id=?", [id]);
  if (rows.length) await updateUserPackage(String(rows[0].user_id));
}

/** Sells the package the order was for, and writes the purchase back onto it. */
async function completeOrder(orderId: number, userId: string, packageId: number, months: number, adminId: string) {
  const purchase = await addPackagePurchase(userId, null, packageId, { orderId, months, source: "order", adminId });
  await db.execute("UPDATE tbl_package_order SET purchase_id=? WHERE id=?", [purchase.id, orderId]);
  return purchase;
}

async function notify(
  order: { user_email: string; title: string; price: number; currency: string; number: string; message: string | null },
  name: string | null, template: "order-created" | "plan-active", adminId: string,
) {
  await sendEmail(order.user_email, template, {
    name: name ?? undefined, plan: order.title, amount: money(order.price, order.currency),
    number: order.number, note: order.message ?? undefined, url: `${process.env.BETTER_AUTH_URL || ""}/billing`,
  }, { adminId });
}
