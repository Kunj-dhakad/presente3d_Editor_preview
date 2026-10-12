import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentAdmin } from "@admin/server/adminAuth";
import AdminLogin from "@admin/components/AdminLogin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration sign in", robots: { index: false, follow: false } };

export default async function Page() {
  if (await currentAdmin()) redirect("/admin");
  return <AdminLogin />;
}
