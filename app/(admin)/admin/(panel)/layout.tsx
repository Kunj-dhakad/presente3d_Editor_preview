import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAdmin } from "@admin/server/adminAuth";
import AdminShell from "@admin/components/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration" }, robots: { index: false, follow: false } };

/** The panel has its own sign-in; a site account never reaches it. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminShell admin={{ name: admin.name, email: admin.email, role: admin.role }}>{children}</AdminShell>;
}
