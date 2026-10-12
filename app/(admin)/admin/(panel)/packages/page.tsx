import AdminPackages from "@admin/components/AdminPackages";

export const metadata = { title: "Packages" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">WHAT CUSTOMERS BUY</span>
    <h1>Packages</h1>
    <p className="fs-muted">A package carries a feature plan and a value for every package field. A customer can hold several at once — an upsell adds to what they already have.</p>
    </header>
    <AdminPackages />
  </main>;
}
