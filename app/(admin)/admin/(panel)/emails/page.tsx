import AdminEmails from "@admin/components/AdminEmails";

export const metadata = { title: "Emails" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">WHAT CUSTOMERS RECEIVE</span>
    <h1>Emails</h1>
    <p className="fs-muted">Every email the site sends. Edit the wording here and it goes out that way — no deploy needed.</p>
    </header>
    <AdminEmails />
  </main>;
}
