import { notFound } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import AdminUserForm from "@admin/components/AdminUserForm";

export const metadata = { title: "Edit user" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT u.id, u.name, u.email, p.note FROM `user` u LEFT JOIN user_plans p ON p.user_id=u.id WHERE u.id=?", [id]);
  if (!rows.length) notFound();
  const user = { id: String(rows[0].id), name: String(rows[0].name), email: String(rows[0].email), note: rows[0].note ?? null };

  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">MANAGE PEOPLE</span>
    <h1>Edit user</h1>
    <p className="fs-muted">{user.email}</p>
    </header>
    <AdminUserForm user={user} />
  </main>;
}
