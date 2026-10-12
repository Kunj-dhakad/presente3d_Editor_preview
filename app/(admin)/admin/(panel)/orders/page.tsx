import AdminOrders from "@admin/components/AdminOrders";

export const metadata = { title: "Orders" };

export default function Page() {
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">PAYMENTS</span>
    <h1>Orders</h1>
    <p className="fs-muted">Record what a customer paid. Setting an order to complete sells them the package there and then.</p>
    </header>
    <AdminOrders />
  </main>;
}
