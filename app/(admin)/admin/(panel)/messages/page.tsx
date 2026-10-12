import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import AdminMessages from "@admin/components/AdminMessages";

export const metadata = { title: "Messages" };

export default async function Page() {
  const [rows] = await db.query<RowDataPacket[]>("SELECT id,name,email,topic,message,status,created_at FROM contact_messages ORDER BY status='open' DESC, created_at DESC LIMIT 200");
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">FROM YOUR CUSTOMERS</span>
    <h1>Messages</h1>
    <p className="fs-muted">Contact form messages, plan requests and support questions.</p>
    </header>
    <section className="fs-settings-card fs-wide">
      <AdminMessages initial={rows.map(m => ({ id: String(m.id), name: String(m.name), email: String(m.email), topic: String(m.topic), message: String(m.message), status: String(m.status), created_at: new Date(m.created_at).toISOString() }))} />
    </section>
  </main>;
}
