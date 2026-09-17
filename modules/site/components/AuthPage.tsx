import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@shared/auth";
import { mailEnabled } from "@shared/server/account";
import { safeNext } from "@shared/site";
import AuthForm, { type Mode } from "./AuthForm";

export default async function AuthPage({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (mode === "login" || mode === "signup") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) redirect(next);
  }
  return <AuthForm mode={mode} next={next} mail={mailEnabled()} token={typeof params.token === "string" ? params.token : ""} linkError={typeof params.error === "string" ? params.error : ""} />;
}
