"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, LoaderCircle } from "lucide-react";
import { bookPath } from "@shared/bookUrl";

export default function CreateBook({ initialTemplate = "blank" }: { initialTemplate?: string }) {
  const [template, setTemplate] = useState(initialTemplate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") || "").trim();
    if (!title) { setError("Enter a title for your book."); return; }
    setBusy(true); setError("");
    try {
      let document;
      if (template !== "blank") {
        const response = await fetch("/api/library/starter/" + template);
        if (!response.ok) throw new Error("Could not load the template. Please try again.");
        document = await response.json();
      }
      const response = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, document }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create your book.");
      window.location.assign(bookPath(data));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create your book."); setBusy(false); }
  }
  return <section className="fs-page-panel">
    <h2><BookOpen size={22} /> A new chapter starts here</h2>
    <p>Give your book a title. You can change every detail in the editor.</p>
    <form onSubmit={create}>
      <label>Book title<input name="title" required maxLength={160} placeholder="My next great book" disabled={busy} /></label>
      <label>Start with<select value={template} onChange={e => setTemplate(e.target.value)} disabled={busy}>
        <option value="blank">Blank book</option><option value="guide">Practical guide</option><option value="story">Short story</option><option value="workbook">Learning workbook</option>
      </select></label>
      {error && <p className="fs-alert" role="alert">{error}{/plan/i.test(error) && <> <Link href="/billing">See plans</Link></>}</p>}
      <div className="fs-row"><button className="fs-btn fs-primary" disabled={busy}>{busy ? <LoaderCircle size={17} className="fs-spin" /> : <ArrowRight size={17} />}{busy ? "Creating…" : "Create book"}</button><Link className="fs-btn fs-outline" href="/books">Back to books</Link></div>
    </form>
  </section>;
}
