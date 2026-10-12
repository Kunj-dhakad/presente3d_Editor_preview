import AdminFeatures from "@admin/components/AdminFeatures";

export const metadata = { title: "Features" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">WHAT THE APP CHECKS FOR</span>
    <h1>Features</h1>
    <p className="fs-muted">Every switch a package can turn on. The app asks for a feature by its condition_val.</p>
    </header>
    <AdminFeatures />
  </main>;
}
