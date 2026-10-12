import AdminUserForm from "@admin/components/AdminUserForm";

export const metadata = { title: "Add user" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">MANAGE PEOPLE</span>
    <h1>Add new user</h1>
    <p className="fs-muted">Create an account for someone who cannot sign up themselves.</p>
    </header>
    <AdminUserForm />
  </main>;
}
