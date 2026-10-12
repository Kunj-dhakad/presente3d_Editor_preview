import { currentAdmin } from "@admin/server/adminAuth";
import AdminTeam from "@admin/components/AdminTeam";

export const metadata = { title: "Administrators" };

export default async function Page() {
  const admin = await currentAdmin();
  return <main className="fs-content">
    <header className="fs-admin-page-header">
    <span className="fs-eyebrow">PANEL ACCESS</span>
    <h1>Administrators</h1>
    <p className="fs-muted">These accounts sign in to this panel only. They are separate from the site&apos;s customer accounts.</p>
    </header>
    <AdminTeam self={{ id: admin!.id, role: admin!.role }} />
  </main>;
}
