import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";

/** The numbers on the panel's first screen. */
export async function adminStats() {
  const [[users]] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS total, SUM(createdAt > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 30 DAY)) AS recent FROM `user`");
  const [[books]] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS total, SUM(deleted_at IS NULL) AS active FROM books");
  const [[messages]] = await db.query<RowDataPacket[]>("SELECT SUM(status='open') AS open, COUNT(*) AS total FROM contact_messages");
  const [[orders]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total, SUM(payment_status='pending') AS pending,
            COALESCE(SUM(CASE WHEN payment_status='complete' THEN price ELSE 0 END),0) AS paid FROM tbl_package_order`);
  const [plans] = await db.query<RowDataPacket[]>("SELECT COALESCE(plan,'free') AS plan, COUNT(*) AS n FROM user_plans GROUP BY plan");
  const [signups] = await db.query<RowDataPacket[]>(
    "SELECT DATE(createdAt) AS day, COUNT(*) AS n FROM `user` WHERE createdAt > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 14 DAY) GROUP BY day ORDER BY day");
  return {
    users: { total: Number(users.total), recent: Number(users.recent || 0) },
    books: { total: Number(books.total), active: Number(books.active || 0) },
    messages: { open: Number(messages.open || 0), total: Number(messages.total || 0) },
    orders: { total: Number(orders.total), pending: Number(orders.pending || 0), paidCents: Math.round(Number(orders.paid) * 100) },
    plans: Object.fromEntries(plans.map(row => [String(row.plan), Number(row.n)])),
    signups: signups.map(row => ({ day: new Date(row.day).toISOString().slice(0, 10), count: Number(row.n) })),
  };
}
