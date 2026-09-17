import type { Metadata } from "next";
import AuthPage from "@site/components/AuthPage";

export const metadata: Metadata = { title: "Create your free account", description: "Sign up free and start writing and designing your first book.", alternates: { canonical: "/signup" } };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="signup" searchParams={searchParams} />;
}
