import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@shared/auth";
import { isAdminEmail } from "@shared/server/account";
import AdminLogin from "@admin/components/AdminLogin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration sign in", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session && isAdminEmail(session.user.email)) redirect("/admin");
  return <>
    {denied && <p className="fs-bms-denied" role="alert">That account does not have administrator access.</p>}
    <AdminLogin />
  </>;
}
