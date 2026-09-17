"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Search, Users } from "lucide-react";

type Lead = { id: string; book_title: string; created_at: string; data: { kind?: string; title?: string; answers?: Record<string, unknown> } };
const labels: Record<string, string> = { "contact-form": "Contact form", quiz: "Quiz", question: "Question" };
function answer(value: unknown): string { return typeof value === "string" ? value : JSON.stringify(value) ?? "—"; }
export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/leads", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load responses.");
      setLeads(data.leads);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load responses."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(() => leads.filter(lead => (kind === "all" || lead.data.kind === kind) && `${lead.book_title} ${JSON.stringify(lead.data)}`.toLowerCase().includes(search.toLowerCase())), [leads, kind, search]);
  return <main className="fs-content fs-dash">
    <section className="fs-dash-head"><div><h1>Leads</h1><p className="fs-muted">Reader responses from your published books. Showing the latest 500.</p></div><Link className="fs-btn fs-outline" href="/books">My books <ArrowRight size={16} /></Link></section>
    <div className="fs-library-toolbar"><div className="fs-search"><Search size={17} /><input aria-label="Search responses" placeholder="Search responses…" value={search} onChange={event => setSearch(event.target.value)} /></div><select aria-label="Response type" value={kind} onChange={event => setKind(event.target.value)}><option value="all">All responses</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {error ? <p className="fs-alert" role="alert">{error} <button className="fs-inline-button" onClick={() => window.location.reload()}>Try again</button></p> : loading ? <div className="fs-empty"><LoaderCircle className="fs-spin" /><p>Loading responses…</p></div> : filtered.length ? <div className="fs-page-panel fs-table-wrap"><table className="fs-leads-table"><thead><tr><th>Book</th><th>Type</th><th>Received</th><th>Response</th></tr></thead><tbody>{filtered.map(lead => <tr key={lead.id}><td>{lead.book_title}</td><td>{labels[lead.data.kind || ""] || "Response"}</td><td>{new Date(lead.created_at).toLocaleString()}</td><td><details><summary>{lead.data.title || "View answers"}</summary><dl>{Object.entries(lead.data.answers || {}).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{answer(value)}</dd></div>)}</dl></details></td></tr>)}</tbody></table></div> : <section className="fs-empty"><Users size={42} /><h3>{search || kind !== "all" ? "No matching responses" : "Your next connection starts with a book"}</h3><p>{search || kind !== "all" ? "Try a different search or response type." : "Add a contact form, question or quiz in the editor, then publish your book to collect responses here."}</p><Link href="/books" className="fs-btn fs-primary">Open your books <ArrowRight size={16} /></Link></section>}
  </main>;
}
