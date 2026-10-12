import AdminUsers from "@admin/components/AdminUsers";

export const metadata = { title: "Users" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">MANAGE PEOPLE</span>
    <h1>Users</h1>
    <p className="fs-muted">Search accounts by plan or date, see what they hold, sell them a package, reset a password or switch an account off.</p>
    </header>
    <AdminUsers />
  </main>;
}
