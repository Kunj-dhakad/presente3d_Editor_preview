import AdminPackageFields from "@admin/components/AdminPackageFields";

export const metadata = { title: "Package fields" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">HOW MUCH A PACKAGE GIVES</span>
    <h1>Package fields</h1>
    <p className="fs-muted">The countable allowances — books, AI actions a day, storage. Every package sets a value for each, and &quot;unlimited&quot; is a value.</p>
    </header>
    <AdminPackageFields />
  </main>;
}
