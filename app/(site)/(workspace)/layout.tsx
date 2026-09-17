import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@shared/auth";
import AppShell from "@site/components/AppShell";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function WorkspaceLayout({children}:{children:React.ReactNode}) {
  const session = await auth.api.getSession({headers:await headers()});
  if (!session) redirect("/login");
  return <AppShell user={session.user}>{children}</AppShell>;
}
