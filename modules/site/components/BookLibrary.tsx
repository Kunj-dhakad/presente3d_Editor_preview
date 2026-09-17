"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, Search, BookOpen, ArrowUpRight, Copy, Trash2, RotateCcw, Pencil, X, LoaderCircle, Sparkles, Heart,
  Eye, Users, Star, CalendarDays, Info, MoreVertical, Download, Share2, SquarePen, ExternalLink, BookOpenCheck,
} from "lucide-react";
import type { LibraryBook } from "@shared/server/books";
import { BOOK_KINDS } from "@shared/bookKinds";
import { bookPath, previewPath, readerPath } from "@shared/bookUrl";
import { art, bookTypeArt } from "@shared/siteArt";
import { useUsage } from "./Usage";
import { useFavorites } from "./Favorites";
import BookTypePicker, { BOOK_TYPES } from "./BookTypePicker";
import CoverMaker from "./CoverMaker";

type Book = LibraryBook;
const STATUS_LABEL = { active: "Active", draft: "Draft", private: "Private" } as const;

const handle = (book: Book) => book.short_id ?? book.id;
/** Drafts open in the editor; published (or once-published) books open their full-page preview in a new tab. */
const previewHref = (book: Book) => previewPath(book);
const opens = (book: Book) => book.status === "draft"
  ? { href: bookPath(book) }
  : { href: previewHref(book), target: "_blank", rel: "noopener" };
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const count = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as T;
}

export default function BookLibrary() {
  const [books, setBooks] = useState<Book[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [trash, setTrash] = useState(false);
  const [sort, setSort] = useState("recent"); const [status, setStatus] = useState("all");
  const [renaming, setRenaming] = useState<Book | null>(null); const [info, setInfo] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false); const [working, setWorking] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const usage = useUsage(); const reloadUsage = usage.reload;
  const { favorites, toggleFavorite } = useFavorites();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await send<{ books: Book[] }>("/api/books?trash=" + trash);
      setBooks(data.books); void reloadUsage();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load books."); }
    finally { setLoading(false); }
  }, [trash, reloadUsage]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => books
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()) && (status === "all" || b.status === status))
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title)
      : sort === "views" ? b.stats.views - a.stats.views
      : sort === "rating" ? b.stats.rating - a.stats.rating
      : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [books, search, sort, status]);

  // Covers are pictures of page 1, made in the background when missing or out of date.
  const coverQueue = useMemo(() => trash ? [] : books.filter(b => b.cover_stale).map(handle), [books, trash]);
  const onCover = useCallback((id: string, cover: string | null) => {
    setBooks(list => list.map(b => handle(b) === id ? { ...b, cover: cover ?? b.cover, cover_stale: false } : b));
  }, []);

  const firstRun = !loading && !error && !trash && !search && books.length === 0;

  async function action(book: Book, kind: "duplicate" | "restore" | "trash" | "purge") {
    if (kind === "purge" && !confirm(`Delete "${book.title}" forever? This cannot be undone. Its public link, readers' data and form responses are removed too.`)) return;
    if (kind === "trash" && book.status === "active" && !confirm(`Move "${book.title}" to the trash? Its public link stops working.`)) return;
    setBusy(true); setError("");
    try {
      const remove = kind === "trash" || kind === "purge";
      await send("/api/books/" + handle(book) + (kind === "purge" ? "?permanent=true" : ""), {
        method: remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: remove ? undefined : JSON.stringify({ action: kind }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }

  async function emptyTrash() {
    if (!confirm(`Delete all ${books.length} ${books.length === 1 ? "book" : "books"} in the trash forever? This cannot be undone.`)) return;
    setBusy(true); setError("");
    try { await send("/api/books?trash=true", { method: "DELETE" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not empty the trash."); }
    finally { setBusy(false); }
  }

  async function download(book: Book) {
    setWorking(book.id); setError("");
    try {
      const { document } = await send<{ document: { slides: unknown[] } }>("/api/books/" + handle(book));
      const file = await send<{ url: string }>("/api/export-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slides: document.slides }),
      });
      const link = window.document.createElement("a");
      link.href = file.url;
      link.download = `${book.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "book"}.pdf`;
      link.rel = "noopener";
      link.click();
    } catch (e) { setError(e instanceof Error ? e.message : "The PDF could not be made."); }
    finally { setWorking(null); }
  }

  async function rename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const title = String(new FormData(event.currentTarget).get("title"));
    try {
      if (!renaming) return;
      await send("/api/books/" + handle(renaming), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      setRenaming(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }

  return <>
    <main className="fs-content fs-dash">
      <section className="fs-dash-head">
        <div><h1>AI Books</h1><p className="fs-muted">Create, publish and track all your books in one place.</p></div>
        <div className="fs-row">
          <Link className="fs-btn fs-outline" href="/books/new"><Plus size={17} />New book</Link>
          <button className="fs-btn fs-primary" onClick={() => setPicker(true)}><Sparkles size={17} />Create Book</button>
        </div>
      </section>
      {firstRun ? <section className="fs-library-welcome">
        <div className="fs-welcome-intro">
          {art("empty-shelf") && <Image src={art("empty-shelf")} alt="" width={220} height={220} unoptimized priority />}
          <div>
            <span className="fs-eyebrow">YOUR SHELF IS READY</span>
            <h2>Let&apos;s create your first book</h2>
            <p>Pick how you want to begin. Every page stays editable afterwards.</p>
          </div>
        </div>
        <div className="fs-welcome-types">
          {BOOK_TYPES.map(type => <Link key={type.id} href={type.href} className="fs-welcome-type">
            <span className="fs-type-art">{bookTypeArt(type.id) && <Image src={bookTypeArt(type.id)} alt="" width={320} height={210} unoptimized />}</span>
            <strong>{type.title}</strong>
            <small>{type.text}</small>
            <span className="fs-type-chips">{type.features.map(feature => <span key={feature.label}><feature.icon size={13} />{feature.label}</span>)}</span>
          </Link>)}
        </div>
        <p className="fs-welcome-foot">Prefer a clean slate? <Link href="/books/new">Start a blank book</Link> · <button type="button" className="fs-inline-button" onClick={() => setTrash(true)}>View trash</button></p>
      </section> : <section id="books" className="fs-books-section">
        <div className="fs-library-toolbar">
          <div className="fs-tabs">
            <button className={trash ? "" : "active"} onClick={() => setTrash(false)}>All books</button>
            <button className={trash ? "active" : ""} onClick={() => setTrash(true)}>Trash</button>
          </div>
          <div className="fs-search"><Search size={17} /><input aria-label="Search books" placeholder="Search your books..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {!trash && <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
          </select>}
          <select aria-label="Sort books" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">Recently edited</option>
            <option value="title">Title A–Z</option>
            <option value="views">Most viewed</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
        {trash && !loading && books.length > 0 && <div className="fs-trash-bar">
          <p>Books in the trash can be restored, or deleted forever.</p>
          <button className="fs-btn fs-danger-btn fs-btn-sm" disabled={busy} onClick={() => void emptyTrash()}><Trash2 size={15} />Empty trash</button>
        </div>}

        {error && <p className="fs-alert" role="alert">{error}{/plan/i.test(error) && <> <Link href="/billing">See plans</Link></>}</p>}

        {loading ? <div className="fs-lib-list" aria-busy="true" aria-label="Loading your books">
          {Array.from({ length: 4 }, (_, i) => <LibrarySkeleton key={i} />)}
        </div>
          : filtered.length ? <div className="fs-lib-list">{filtered.map(book => <LibraryRow key={book.id} book={book} trash={trash}
            favourite={favorites.includes(book.id)} onFavourite={() => toggleFavorite(book.id)}
            coverPending={coverQueue.includes(handle(book))} busy={busy} downloading={working === book.id}
            onAction={kind => void action(book, kind)} onDownload={() => void download(book)}
            onRename={() => setRenaming(book)} onInfo={() => setInfo(book)} />)}</div>
          : <div className="fs-empty fs-empty-art">
            {art("empty-shelf") && <Image src={art("empty-shelf")} alt="" width={240} height={240} unoptimized />}
            <div>
              <h3>{search || status !== "all" ? "No matching books" : trash ? "Your trash is empty" : "No books yet"}</h3>
              <p>{search || status !== "all" ? "Try another title or status." : trash ? "Deleted books will appear here." : "Create your first book and it will show up here."}</p>
              {!search && !trash && status === "all" && <div className="fs-row">
                <button className="fs-btn fs-primary" onClick={() => setPicker(true)}><Sparkles size={16} />Create Book</button>
                <Link className="fs-btn fs-outline" href="/books/new"><Plus size={16} />Blank book</Link>
              </div>}
            </div>
          </div>}
      </section>}

      <footer className="fs-dash-footer">All rights reserved to <strong>AI Book Creator</strong></footer>
    </main>

    {coverQueue.length > 0 && <CoverMaker ids={coverQueue} onCover={onCover} />}
    {picker && <BookTypePicker onClose={() => setPicker(false)} />}
    {info && <BookInfo book={info} onClose={() => setInfo(null)} />}

    {renaming && <div className="fs-modal-backdrop" onClick={() => !busy && setRenaming(null)}>
      <section className="fs-modal" role="dialog" aria-modal="true" aria-labelledby="book-modal-title" onClick={e => e.stopPropagation()}>
        <button className="fs-modal-close" aria-label="Close" disabled={busy} onClick={() => setRenaming(null)}><X /></button>
        <span className="fs-eyebrow">MAKE IT YOURS</span>
        <h2 id="book-modal-title">Rename book</h2>
        <form onSubmit={rename}>
          <label>Book title<input autoFocus name="title" placeholder="My next great book" defaultValue={renaming.title} required maxLength={160} /></label>
          {error && <p role="alert" className="fs-alert">{error}</p>}
          <button className="fs-btn fs-primary" disabled={busy}>{busy ? "Saving…" : "Save title"}<ArrowUpRight size={17} /></button>
        </form>
      </section>
    </div>}
  </>;
}

/* ------------------------------------------------------------------- rows */

function Stars({ value }: { value: number }) {
  return <span className="fs-lib-stars" aria-hidden="true">
    {[1, 2, 3, 4, 5].map(n => <Star key={n} size={11} fill={value >= n - 0.25 ? "currentColor" : "none"} className={value >= n - 0.25 ? "on" : ""} />)}
  </span>;
}

function LibraryRow({ book, trash, favourite, onFavourite, coverPending, busy, downloading, onAction, onDownload, onRename, onInfo }: {
  book: Book; trash: boolean; favourite: boolean; onFavourite: () => void; coverPending: boolean; busy: boolean; downloading: boolean;
  onAction: (kind: "duplicate" | "restore" | "trash" | "purge") => void; onDownload: () => void; onRename: () => void; onInfo: () => void;
}) {
  const link = trash ? null : opens(book);
  const cover = book.cover
    // eslint-disable-next-line @next/next/no-img-element -- owner-only cover served by our API
    ? <img src={book.cover} alt="" loading="lazy" />
    : coverPending ? <span className="fs-skeleton fs-lib-cover-wait" />
    : <span className="fs-lib-cover-fallback"><small>AI BOOK CREATOR</small><strong>{book.title}</strong></span>;
  return <article className={`fs-lib-row fs-lib-${book.status}`}>
    {!trash && <span className="fs-lib-status"><i />{STATUS_LABEL[book.status]}</span>}
    <div className="fs-lib-cover-wrap">
      <div className="fs-lib-cover">
        {cover}
        {!trash && <div className="fs-lib-cover-hover">
          {book.status === "draft"
            ? <Link href={bookPath(book)} aria-label={"Edit " + book.title}><SquarePen size={13} />Edit</Link>
            : <a href={previewHref(book)} target="_blank" rel="noopener" aria-label={"Read " + book.title}><BookOpenCheck size={13} />Read</a>}
        </div>}
      </div>
      {!trash && <button className={`fs-lib-fav${favourite ? " on" : ""}`} aria-pressed={favourite} aria-label={favourite ? "Remove from favourites" : "Add to favourites"} title={favourite ? "Remove from favourites" : "Add to favourites"} onClick={onFavourite}>
        <Heart size={14} fill={favourite ? "currentColor" : "none"} />
      </button>}
    </div>
    <div className="fs-lib-main">
      {link ? <Link {...link} className="fs-lib-title">{book.title}</Link> : <span className="fs-lib-title">{book.title}</span>}
      <span className="fs-lib-kind">{BOOK_KINDS[book.kind]}</span>
      <span className="fs-lib-date"><CalendarDays size={14} />{when(book.updated_at)}</span>
    </div>
    <div className="fs-lib-stats">
      <span className="fs-lib-stat views"><b><Eye size={18} /></b><span><strong>{count(book.stats.views)}</strong><small>Views</small></span></span>
      <span className="fs-lib-stat leads"><b><Users size={18} /></b><span><strong>{count(book.stats.leads)}</strong><small>Leads</small></span></span>
      <span className="fs-lib-stat rating"><b><Star size={18} /></b><span><strong>{book.stats.ratings ? book.stats.rating.toFixed(1) : "—"} <em>({book.stats.ratings} {book.stats.ratings === 1 ? "rating" : "ratings"})</em></strong><Stars value={book.stats.rating} /></span></span>
    </div>
    <div className="fs-lib-actions">
      {trash ? <>
        <button className="fs-btn fs-outline fs-btn-sm" disabled={busy} onClick={() => onAction("restore")}><RotateCcw size={15} />Restore</button>
        <button className="fs-btn fs-btn-sm fs-lib-purge" disabled={busy} aria-label={"Delete " + book.title + " forever"} onClick={() => onAction("purge")}><Trash2 size={15} />Delete forever</button>
      </> : <>
        <button className="fs-lib-icon" aria-label={"Details for " + book.title} title="Details" onClick={onInfo}><Info size={17} /></button>
        <BookMenu book={book} busy={busy} downloading={downloading} onAction={onAction} onDownload={onDownload} onRename={onRename} />
      </>}
    </div>
  </article>;
}

function BookMenu({ book, busy, downloading, onAction, onDownload, onRename }: {
  book: Book; busy: boolean; downloading: boolean;
  onAction: (kind: "duplicate" | "trash") => void; onDownload: () => void; onRename: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  return <div className="fs-lib-menu" ref={root}>
    <button className={`fs-lib-icon${open ? " on" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label={"More actions for " + book.title} onClick={() => setOpen(v => !v)}>
      {downloading ? <LoaderCircle size={17} className="fs-spin" /> : <MoreVertical size={17} />}
    </button>
    {open && <div className="fs-lib-menu-list" role="menu">
      {book.share_token && <a role="menuitem" href={readerPath(book.share_token, book.title)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><ExternalLink size={15} />Read book</a>}
      <Link role="menuitem" href={bookPath(book)}><SquarePen size={15} />Edit</Link>
      <Link role="menuitem" href={`/books/${handle(book)}/publish`}><Share2 size={15} />Share</Link>
      <button role="menuitem" disabled={downloading} onClick={run(onDownload)}><Download size={15} />{downloading ? "Preparing PDF…" : "Download PDF"}</button>
      <button role="menuitem" disabled={busy} onClick={run(() => onAction("duplicate"))}><Copy size={15} />Duplicate</button>
      <button role="menuitem" onClick={run(onRename)}><Pencil size={15} />Rename</button>
      <hr />
      <button role="menuitem" className="danger" disabled={busy} onClick={run(() => onAction("trash"))}><Trash2 size={15} />Delete</button>
    </div>}
  </div>;
}

function LibrarySkeleton() {
  return <div className="fs-lib-row fs-lib-skeleton" aria-hidden="true">
    <div className="fs-lib-cover-wrap"><span className="fs-skeleton fs-lib-cover" /></div>
    <div className="fs-lib-main"><span className="fs-skeleton" style={{ width: "70%", height: 16 }} /><span className="fs-skeleton" style={{ width: 80, height: 22, borderRadius: 999 }} /><span className="fs-skeleton" style={{ width: "45%", height: 12 }} /></div>
    <div className="fs-lib-stats">{[0, 1, 2].map(i => <span key={i} className="fs-skeleton fs-lib-stat" />)}</div>
    <div className="fs-lib-actions"><span className="fs-skeleton fs-lib-icon" /><span className="fs-skeleton fs-lib-icon" /></div>
  </div>;
}

/* ------------------------------------------------------------------- info */

function BookInfo({ book, onClose }: { book: Book; onClose: () => void }) {
  const s = book.stats;
  const rows: [string, React.ReactNode][] = [
    ["Type", BOOK_KINDS[book.kind]],
    ["Status", STATUS_LABEL[book.status]],
    ["Pages", book.page_count],
    ["Created", when(book.created_at)],
    ["Last edited", when(book.updated_at)],
    ["Published", book.published_at ? when(book.published_at) : "Not yet"],
  ];
  const numbers: [string, React.ReactNode][] = [
    ["Views", s.views],
    ["Unique readers", s.readers],
    ["Avg. pages read", s.views ? `${s.avg_pages} of ${book.page_count}` : "—"],
    ["Read to the end", s.views ? `${s.completion}%` : "—"],
    ["Leads", s.leads],
    ["Rating", s.ratings ? `${s.rating.toFixed(1)} / 5 (${s.ratings})` : "No ratings yet"],
  ];
  return <div className="fs-modal-backdrop" onClick={onClose}>
    <section className="fs-modal fs-lib-info" role="dialog" aria-modal="true" aria-labelledby="book-info-title" onClick={e => e.stopPropagation()}>
      <button className="fs-modal-close" aria-label="Close" onClick={onClose}><X /></button>
      <span className="fs-eyebrow">BOOK DETAILS</span>
      <h2 id="book-info-title">{book.title}</h2>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <h3>Readers</h3>
      <dl className="fs-lib-info-numbers">{numbers.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="fs-row">
        <Link className="fs-btn fs-primary" {...opens(book)}><BookOpen size={16} />{book.status === "draft" ? "Open editor" : "Preview book"}</Link>
        {s.leads > 0 && <Link className="fs-btn fs-outline" href="/leads"><Users size={16} />View leads</Link>}
      </div>
    </section>
  </div>;
}
