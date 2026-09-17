import type { Metadata } from "next";
import AuthPage from "@site/components/AuthPage";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="forgot-password" searchParams={searchParams} />;
}
