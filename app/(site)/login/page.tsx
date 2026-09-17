import type { Metadata } from "next";
import AuthPage from "@site/components/AuthPage";

export const metadata: Metadata = { title: "Log in", description: "Log in to your AI Book Creator workspace.", alternates: { canonical: "/login" } };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
