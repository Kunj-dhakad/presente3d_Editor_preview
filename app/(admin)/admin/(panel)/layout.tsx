import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@shared/auth";
import { isAdminEmail } from "@shared/server/account";
import AdminShell from "@admin/components/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administration", template: "%s · BMS" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  if (!isAdminEmail(session.user.email)) redirect("/admin/login?denied=1");
  return <AdminShell user={session.user}>{children}</AdminShell>;
}
