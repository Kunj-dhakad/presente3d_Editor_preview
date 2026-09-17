import AdminUsers from "@admin/components/AdminUsers";
import { currentUser } from "@shared/server/api";

export const metadata = { title: "Accounts" };

export default async function Page() {
  const user = await currentUser();
  return <main className="fs-content">
    <span className="fs-eyebrow">MANAGE PEOPLE</span>
    <h1>Accounts</h1>
    <p className="fs-muted">Search accounts, change plans and suspend access.</p>
    <section className="fs-settings-card fs-wide"><AdminUsers selfEmail={user.email} /></section>
  </main>;
}
