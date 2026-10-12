import AdminFeaturePlans from "@admin/components/AdminFeaturePlans";

export const metadata = { title: "Feature plans" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">WHAT A PACKAGE SWITCHES ON</span>
    <h1>Feature plans</h1>
    <p className="fs-muted">A feature plan is a named list of features. Packages point at one, so several packages can share the same list.</p>
    </header>
    <AdminFeaturePlans />
  </main>;
}
