import AdminPurchases from "@admin/components/AdminPurchases";

export const metadata = { title: "Purchases" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">WHAT CUSTOMERS HOLD</span>
    <h1>Purchases</h1>
    <p className="fs-muted">Every package sold, as it was on the day it was sold. Switching one off takes it away from the customer at once.</p>
    </header>
    <AdminPurchases />
  </main>;
}
