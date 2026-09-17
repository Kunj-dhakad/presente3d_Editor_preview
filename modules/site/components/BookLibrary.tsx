"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, Search, BookOpen, ArrowUpRight, Copy, Trash2, RotateCcw, Pencil, X, LoaderCircle, Sparkles, Star,
} from "lucide-react";
import { bookPath } from "@shared/bookUrl";
import { art } from "@shared/siteArt";
import { useUsage } from "./Usage";
import { useFavorites } from "./Favorites";
import BookTypePicker, { BOOK_TYPES } from "./BookTypePicker";
import { bookTypeArt } from "@shared/siteArt";

type Book = { id: string; short_id: string | null; title: string; page_count: number; updated_at: string };

export default function BookLibrary() {
  const [books, setBooks] = useState<Book[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [trash, setTrash] = useState(false);
  const [sort, setSort] = useState("recent"); const [modal, setModal] = useState<Book | null>(null); const [busy, setBusy] = useState(false);
  const usage = useUsage(); const reloadUsage = usage.reload;
  const { favorites, toggleFavorite } = useFavorites();
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/books?trash=" + trash);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooks(data.books); void reloadUsage();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load books."); }
    finally { setLoading(false); }
  }, [trash, reloadUsage]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => books
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [books, search, sort]);

  // No books at all (and not searching or in the trash): show the welcome page.
  const firstRun = !loading && !error && !trash && !search && books.length === 0;

  async function action(book: Book, kind: "duplicate" | "restore" | "trash") {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/books/" + book.id, {
        method: kind === "trash" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: kind === "trash" ? undefined : JSON.stringify({ action: kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const title = String(new FormData(event.currentTarget).get("title"));
    try {
      if (!modal) return;
      const res = await fetch("/api/books/" + modal.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModal(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }

  return <>
    <main className="fs-content fs-dash">
      <section className="fs-dash-head">
        <div><h1>AI Books</h1><p className="fs-muted">Create and manage all your books in one place.</p></div>
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
          <select aria-label="Sort books" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">Recently edited</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>

        {error && <p className="fs-alert" role="alert">{error}{/plan/i.test(error) && <> <Link href="/billing">See plans</Link></>}</p>}

        {loading ? <div className="fs-empty"><LoaderCircle className="fs-spin" /><p>Loading your bookshelf…</p></div>
          : filtered.length ? <div className="fs-book-grid">{filtered.map((book, i) => <article className="fs-book-card" key={book.id}>
            <Link href={trash ? "#" : bookPath(book)} aria-label={"Open " + book.title} className={"fs-book-cover fs-cover-" + i % 4}>
              <div><span>AI BOOK CREATOR</span><h3>{book.title}</h3><BookOpen size={25} /></div>
            </Link>
            <div className="fs-book-info">
              <h3>{book.title}</h3>
              <p>{book.page_count} {book.page_count === 1 ? "page" : "pages"} · {new Date(book.updated_at).toLocaleDateString("en-US")}</p>
              <div className="fs-book-actions">
                {trash ? <button disabled={busy} onClick={() => action(book, "restore")}><RotateCcw size={15} />Restore</button> : <>
                  <Link href={bookPath(book)}>Open editor <ArrowUpRight size={14} /></Link>
                  <button title={favorites.includes(book.id) ? "Remove from favourites" : "Add to favourites"} aria-label={"Favourite " + book.title} aria-pressed={favorites.includes(book.id)} onClick={() => toggleFavorite(book.id)}><Star size={15} fill={favorites.includes(book.id) ? "currentColor" : "none"} /></button>
                  <button title="Rename" aria-label={"Rename " + book.title} disabled={busy} onClick={() => setModal(book)}><Pencil size={15} /></button>
                  <button title="Duplicate" aria-label={"Duplicate " + book.title} disabled={busy} onClick={() => action(book, "duplicate")}><Copy size={15} /></button>
                  <button title="Move to trash" aria-label={"Move " + book.title + " to trash"} disabled={busy} onClick={() => action(book, "trash")}><Trash2 size={15} /></button>
                </>}
              </div>
            </div>
          </article>)}</div>
          : <div className="fs-empty fs-empty-art">
            {art("empty-shelf") && <Image src={art("empty-shelf")} alt="" width={240} height={240} unoptimized />}
            <div>
              <h3>{search ? "No matching books" : trash ? "Your trash is empty" : "No books yet"}</h3>
              <p>{search ? "Try another title." : trash ? "Deleted books will appear here." : "Create your first book and it will show up here."}</p>
              {!search && !trash && <div className="fs-row">
                <button className="fs-btn fs-primary" onClick={() => setPicker(true)}><Sparkles size={16} />Create Book</button>
                <Link className="fs-btn fs-outline" href="/books/new"><Plus size={16} />Blank book</Link>
              </div>}
            </div>
          </div>}
      </section>}

      <footer className="fs-dash-footer">All rights reserved to <strong>AI Book Creator</strong></footer>
    </main>


    {picker && <BookTypePicker onClose={() => setPicker(false)} />}

    {modal && <div className="fs-modal-backdrop" onClick={() => !busy && setModal(null)}>
      <section className="fs-modal" role="dialog" aria-modal="true" aria-labelledby="book-modal-title" onClick={e => e.stopPropagation()}>
        <button className="fs-modal-close" aria-label="Close" disabled={busy} onClick={() => setModal(null)}><X /></button>
        <span className="fs-eyebrow">MAKE IT YOURS</span>
        <h2 id="book-modal-title">Rename book</h2>
        <form onSubmit={save}>
          <label>Book title<input autoFocus name="title" placeholder="My next great book" defaultValue={modal.title} required maxLength={160} /></label>
          {error && <p role="alert" className="fs-alert">{error}{/plan/i.test(error) && <> <Link href="/billing">See plans</Link></>}</p>}
          <button className="fs-btn fs-primary" disabled={busy}>{busy ? "Saving…" : "Save title"}<ArrowUpRight size={17} /></button>
        </form>
      </section>
    </div>}
  </>;
}
