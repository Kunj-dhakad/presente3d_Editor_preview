import type { Metadata } from "next";
import AuthPage from "@site/components/AuthPage";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="reset-password" searchParams={searchParams} />;
}
