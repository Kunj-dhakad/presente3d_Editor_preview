"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { BrandMark } from "@shared/components/BrandMark";

/** Administration sign-in. It has nothing to do with the site's customer login. */
export default function AdminLogin() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email")).trim(), password: String(form.get("password")) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Please try again.");
      window.location.assign("/admin");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }

  return <main className="fs-app fs-bms-login">
    <section>
      <span className="fs-bms-logo"><BrandMark size={52} /></span>
      <h1>Administration</h1>
      <p className="fs-muted">Sign in with an administrator account to manage customers, orders and emails.</p>
      <form onSubmit={submit} method="post" action="#">
        <label>Email address<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
        {error && <p className="fs-alert" role="alert">{error}</p>}
        <button className="fs-btn fs-primary" disabled={busy}>{busy && <LoaderCircle className="fs-spin" size={18} />}Sign in <ArrowRight size={17} /></button>
      </form>
      <Link className="fs-text-link fs-center" href="/">Back to the main site</Link>
    </section>
  </main>;
}
