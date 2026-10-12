"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";

/** Add an account by hand, or change the name on one. */
export default function AdminUserForm({ user }: { user?: { id: string; name: string; email: string; note: string | null } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNote("");
    const form = new FormData(event.currentTarget);
    try {
      const res = user
        ? await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.get("name"), note: form.get("note") }),
        })
        : await fetch("/api/admin/users", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"), email: form.get("email"),
            password: form.get("password"), confirm_password: form.get("confirm_password"),
          }),
        });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      if (user) setNote("Account updated.");
      else { router.push("/admin/users"); router.refresh(); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }

  return <section className="fs-settings-card fs-wide fs-admin-form">
    <div className="fs-library-toolbar">
      <p className="fs-muted fs-small">{user
        ? "The email address and password belong to the customer; reset the password from the list if they are locked out."
        : "The account starts on the free package, exactly as it would if they had signed up themselves."}</p>
      <Link href="/admin/users" className="fs-btn fs-outline fs-btn-sm"><ArrowLeft size={15} />Go back</Link>
    </div>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {note && <p className="fs-note"><Check size={15} />{note}</p>}
    <form onSubmit={submit}>
      <label>Name<input name="name" defaultValue={user?.name} maxLength={100} required /></label>
      {user
        ? <label>Email<input value={user.email} readOnly disabled /></label>
        : <>
          <label>Email<input name="email" type="email" required placeholder="customer@example.com" /></label>
          <div className="fs-field-row">
            <label>Password<input name="password" type="password" required autoComplete="new-password" /></label>
            <label>Confirm password<input name="confirm_password" type="password" required autoComplete="new-password" /></label>
          </div>
        </>}
      <label>Note for the panel<textarea name="note" rows={2} maxLength={255} defaultValue={user?.note ?? ""} placeholder="Anything the team should know about this account." /></label>
      <div className="fs-row">
        <button className="fs-btn fs-primary" disabled={busy}>{busy && <LoaderCircle className="fs-spin" size={16} />}Submit</button>
      </div>
    </form>
  </section>;
}
