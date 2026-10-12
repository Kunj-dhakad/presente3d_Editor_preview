import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { Users, Activity, CreditCard, BookOpen, Receipt, HardDrive, ArrowUpRight } from "lucide-react";
import { utcDayBucket } from "@shared/server/account";
import { db } from "@shared/server/db";
import { formatBytes, PLAN_LIST } from "@shared/plans";

export const metadata = { title: "Overview" };

const money = (price: number) => `$${price.toFixed(2)}`;

export default async function Page() {
  const [[stats]] = await db.query<RowDataPacket[]>(`SELECT
    (SELECT COUNT(*) FROM \`user\`) AS users,
    (SELECT COUNT(*) FROM \`user\` WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS users7,
    (SELECT COUNT(*) FROM \`user\` WHERE createdAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY) AS users30,
    (SELECT COUNT(DISTINCT userId) FROM session WHERE updatedAt >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS active7,
    (SELECT COUNT(*) FROM books WHERE deleted_at IS NULL) AS books,
    (SELECT COUNT(*) FROM book_shares) AS shares,
    (SELECT COALESCE(SUM(bytes),0) FROM assets) AS bytes,
    (SELECT COALESCE(SUM(hits),0) FROM usage_limits WHERE bucket_key LIKE ?) AS aiToday,
    (SELECT COUNT(*) FROM contact_messages WHERE status='open') AS openMessages,
    (SELECT COALESCE(SUM(CASE WHEN payment_status='complete' THEN price ELSE 0 END),0) FROM tbl_package_order) AS paid,
    (SELECT COUNT(*) FROM tbl_package_order WHERE payment_status='pending') AS pendingOrders`, [`%:ai-daily:${utcDayBucket()}`]);
  const [plans] = await db.query<RowDataPacket[]>("SELECT COALESCE(p.plan,'free') AS plan, COUNT(*) AS n FROM `user` u LEFT JOIN user_plans p ON p.user_id=u.id GROUP BY COALESCE(p.plan,'free')");
  const planCount = (id: string) => Number(plans.find(p => p.plan === id)?.n || 0);

  const tiles = [
    { icon: Users, label: "Customers", value: stats.users, hint: `+${stats.users7} this week · +${stats.users30} in 30 days` },
    { icon: Activity, label: "Active this week", value: stats.active7, hint: "Accounts used in the last 7 days" },
    { icon: CreditCard, label: "Paying plans", value: planCount("pro") + planCount("business"), hint: PLAN_LIST.map(p => `${p.name} ${planCount(p.id)}`).join(" · ") },
    { icon: Receipt, label: "Paid orders", value: money(Number(stats.paid)), hint: `${stats.pendingOrders} pending` },
    { icon: BookOpen, label: "Books", value: stats.books, hint: `${stats.shares} published reader links` },
    { icon: HardDrive, label: "File storage", value: formatBytes(Number(stats.bytes)), hint: `${stats.aiToday} AI actions today` },
  ];

  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">SITE OVERVIEW</span>
    <h1>Dashboard</h1>
    <p className="fs-muted">How {String(stats.users)} accounts are using AI Book Creator right now.</p>
    </header>
    <section className="fs-admin-stats">{tiles.map(t => <div key={t.label}><small><t.icon size={14} /> {t.label}</small><strong>{String(t.value)}</strong><span>{t.hint}</span></div>)}</section>
    <section className="fs-bms-links">
      <Link href="/admin/users" className="fs-settings-card"><h2>Users <ArrowUpRight size={18} /></h2><p>Search people, sell them a package or suspend access.</p></Link>
      <Link href="/admin/orders" className="fs-settings-card"><h2>Orders <ArrowUpRight size={18} /></h2><p>{Number(stats.pendingOrders) ? `${stats.pendingOrders} order${Number(stats.pendingOrders) === 1 ? "" : "s"} waiting for payment.` : "Record a payment and activate a plan."}</p></Link>
      <Link href="/admin/packages" className="fs-settings-card"><h2>Packages <ArrowUpRight size={18} /></h2><p>What customers buy: features, fields and prices.</p></Link>
      <Link href="/admin/emails" className="fs-settings-card"><h2>Email templates <ArrowUpRight size={18} /></h2><p>Edit what customers receive: verification, resets, orders and more.</p></Link>
      <Link href="/admin/messages" className="fs-settings-card"><h2>Messages <ArrowUpRight size={18} /></h2><p>{Number(stats.openMessages) ? `${stats.openMessages} open message${Number(stats.openMessages) === 1 ? "" : "s"} waiting for a reply.` : "No open messages right now."}</p></Link>
      <Link href="/admin/sales-page-builder" className="fs-settings-card"><h2>Sales Page Builder <ArrowUpRight size={18} /></h2><p>Your workspace for sales pages.</p></Link>
    </section>
  </main>;
}
