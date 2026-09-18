"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Download, ExternalLink, Mail, Phone, Search, Star, Users } from "lucide-react";
import { LEAD_KINDS, type Lead, type LeadKind } from "@shared/leads";
import { previewPath } from "@shared/bookUrl";

const KIND_LABEL = Object.fromEntries(LEAD_KINDS.map(kind => [kind.id, kind.label])) as Record<LeadKind, string>;
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Quotes one CSV cell. */
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;

function downloadCsv(leads: Lead[]) {
  const rows = [["Book", "Type", "Title", "Name", "Email", "Phone", "Date", "Score", "Answers"]];
  for (const lead of leads) {
    rows.push([
      lead.book.title, KIND_LABEL[lead.kind], lead.title, lead.reader.name ?? "", lead.reader.email ?? "", lead.reader.phone ?? "",
      new Date(lead.created_at).toISOString(),
      lead.score ? `${lead.score.correct}/${lead.score.total}` : lead.stars ? `${lead.stars}/5` : "",
      lead.answers.map(([label, value]) => `${label}: ${value}`).join(" | "),
    ]);
  }
  const blob = new Blob(["﻿" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<LeadKind | "all">("all");
  const [book, setBook] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/leads", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load leads.");
      setLeads(data.leads);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load leads."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const books = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const lead of leads) {
      const entry = map.get(lead.book.id) ?? { ...lead.book, count: 0 };
      entry.count += 1;
      map.set(lead.book.id, entry);
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [leads]);

  const inBook = useMemo(() => leads.filter(lead => book === "all" || lead.book.id === book), [leads, book]);
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: inBook.length };
    for (const lead of inBook) result[lead.kind] = (result[lead.kind] ?? 0) + 1;
    return result;
  }, [inBook]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return inBook.filter(lead => (kind === "all" || lead.kind === kind) && (!needle || [
      lead.book.title, lead.title, lead.reader.name, lead.reader.email, lead.reader.phone, ...lead.answers.flat(),
    ].join(" ").toLowerCase().includes(needle)));
  }, [inBook, kind, search]);
  // Grouped by book, books in the order of their newest entry.
  const groups = useMemo(() => {
    const map = new Map<string, { book: Lead["book"]; leads: Lead[] }>();
    for (const lead of filtered) {
      if (!map.has(lead.book.id)) map.set(lead.book.id, { book: lead.book, leads: [] });
      map.get(lead.book.id)!.leads.push(lead);
    }
    return [...map.values()];
  }, [filtered]);
  const people = useMemo(() => new Set(leads.map(lead => lead.reader.email || lead.reader.name).filter(Boolean)).size, [leads]);

  return <main className="fs-content fs-dash fs-leads">
    <section className="fs-dash-head">
      <div><h1>Leads</h1><p className="fs-muted">Everything readers send from your published books: lead forms, contact forms, quizzes, questions and ratings.</p></div>
      <div className="fs-row">
        <button className="fs-btn fs-outline" disabled={!filtered.length} onClick={() => downloadCsv(filtered)}><Download size={16} />Export CSV</button>
        <Link className="fs-btn fs-outline" href="/books">My books <ArrowRight size={16} /></Link>
      </div>
    </section>

    {!loading && !error && leads.length > 0 && <div className="fs-leads-summary">
      <span><strong>{leads.length}</strong> responses</span>
      <span><strong>{people}</strong> named readers</span>
      <span><strong>{books.length}</strong> {books.length === 1 ? "book" : "books"}</span>
    </div>}

    <div className="fs-leads-filters">
      <div className="fs-search"><Search size={17} /><input aria-label="Search leads" placeholder="Search names, emails, answers…" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <select aria-label="Book" value={book} onChange={event => setBook(event.target.value)}>
        <option value="all">All books</option>
        {books.map(entry => <option key={entry.id} value={entry.id}>{entry.title} ({entry.count})</option>)}
      </select>
    </div>
    <div className="fs-leads-tabs" role="tablist" aria-label="Response type">
      {[{ id: "all" as const, label: "All" }, ...LEAD_KINDS].map(tab => <button key={tab.id} role="tab" aria-selected={kind === tab.id} className={kind === tab.id ? "on" : ""} onClick={() => setKind(tab.id)}>
        {tab.label}<span>{counts[tab.id] ?? 0}</span>
      </button>)}
    </div>

    {error ? <p className="fs-alert" role="alert">{error} <button className="fs-inline-button" onClick={() => window.location.reload()}>Try again</button></p>
      : loading ? <div className="fs-leads-list" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="fs-lead-card"><span className="fs-skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} /><div style={{ display: "grid", gap: 8, flex: 1 }}><span className="fs-skeleton" style={{ width: "40%", height: 14 }} /><span className="fs-skeleton" style={{ width: "70%", height: 12 }} /></div></div>)}</div>
      : groups.length ? <div className="fs-leads-groups">{groups.map(group => <section key={group.book.id} className="fs-leads-group">
        <header>
          <span className="fs-leads-book"><BookOpen size={16} />{group.book.title}</span>
          <small>{group.leads.length} {group.leads.length === 1 ? "response" : "responses"}</small>
          <a href={previewPath(group.book)} target="_blank" rel="noopener" className="fs-leads-open"><ExternalLink size={14} />Open book</a>
        </header>
        <div className="fs-leads-list">{group.leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}</div>
      </section>)}</div>
      : <div className="fs-empty"><Users size={34} /><h3>{leads.length ? "No matching responses" : "No leads yet"}</h3><p>{leads.length ? "Try another book, type or search." : "When readers fill a form, answer a quiz or rate one of your published books, it shows up here."}</p></div>}
  </main>;
}

function LeadCard({ lead }: { lead: Lead }) {
  const name = lead.reader.name || (lead.reader.email ? lead.reader.email.split("@")[0] : "");
  const rows = lead.answers;
  return <article className={`fs-lead-card kind-${lead.kind}`}>
    <span className="fs-lead-avatar" aria-hidden="true">{name ? name[0].toUpperCase() : "?"}</span>
    <div className="fs-lead-body">
      <div className="fs-lead-head">
        <strong>{name || "Anonymous reader"}</strong>
        <span className="fs-lead-kind">{KIND_LABEL[lead.kind]}</span>
        {lead.score && <span className="fs-lead-score">{lead.score.correct}/{lead.score.total} correct</span>}
        {lead.stars ? <span className="fs-lead-stars" aria-label={`${lead.stars} out of 5 stars`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} fill={n <= lead.stars! ? "currentColor" : "none"} />)}</span> : null}
        <time dateTime={lead.created_at}>{when(lead.created_at)}</time>
      </div>
      {(lead.reader.email || lead.reader.phone) && <div className="fs-lead-contact">
        {lead.reader.email && <a href={`mailto:${lead.reader.email}`}><Mail size={13} />{lead.reader.email}</a>}
        {lead.reader.phone && <a href={`tel:${lead.reader.phone}`}><Phone size={13} />{lead.reader.phone}</a>}
      </div>}
      {lead.kind !== "lead" && lead.title && lead.title !== KIND_LABEL[lead.kind] && <p className="fs-lead-title">{lead.title}</p>}
      {rows.length > 0 && lead.kind !== "lead" && <dl className="fs-lead-answers">
        {rows.map(([label, value], index) => <div key={index}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}
      </dl>}
    </div>
  </article>;
}
