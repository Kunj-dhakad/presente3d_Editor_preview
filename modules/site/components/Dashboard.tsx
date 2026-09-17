"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Bot, Crown, FileStack, FolderOpen, Gift, Library, LoaderCircle, Plus, Settings, Sparkles, Star, Users, BriefcaseBusiness, PlayCircle, CreditCard } from "lucide-react";
import { art } from "@shared/siteArt";
import { bookPath } from "@shared/bookUrl";
import { useUsage } from "./Usage";
import { useFavorites } from "./Favorites";
import Sparkline, { type Point } from "./Sparkline";

type Book = { id: string; short_id: string | null; title: string; page_count: number; updated_at: string };
/** Books last edited on each of the past 14 days. */
function activity(books: Book[]): Point[] {
  const days: Point[] = [];
  for (let back = 13; back >= 0; back--) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - back);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    days.push({
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: books.filter(b => { const t = new Date(b.updated_at).getTime(); return t >= day.getTime() && t < next.getTime(); }).length,
    });
  }
  return days;
}

/** The wave that fills the bottom of a stat card. */
function Wave({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,18 C18,2 32,30 52,20 C72,10 88,34 120,14 L120,60 L0,60 Z" />
  </svg>;
}

// Date labels and the greeting differ between a server render and the browser,
// so the chart waits for hydration.
const subscribeNothing = () => () => {};


export default function Dashboard({ name = "" }: { name?: string }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const usage = useUsage();
  const { favorites, toggleFavorite } = useFavorites();
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/books", { signal: controller.signal }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load books.");
      setBooks(data.books);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load books."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const used = usage.data?.usage;
  const stats = [
    { tone: "violet", label: "Books", value: used?.books ?? (loading || error ? "—" : books.length), icon: Library, href: "/books" },
    { tone: "blue", label: "Pages", value: loading || error ? "—" : books.reduce((total, book) => total + book.page_count, 0), icon: FileStack, href: "/books" },
    { tone: "pink", label: "AI actions", value: used?.aiToday ?? "—", icon: Sparkles, href: "/billing" },
  ];
  // The same three ways to start a book as the "Create Book" popup.
  const starters = [
    { tone: "ai", title: "AI Book", href: "/books/ai", image: "ai-book" as const, icon: Bot },
    { tone: "blank", title: "Flip & Photo Book", href: "/books/flip", image: "flip-book" as const, icon: BookOpen },
    { tone: "templates", title: "Book Templates", href: "/books/templates", image: "templates" as const, icon: FolderOpen },
  ];
  const links = [
    { href: "/help", name: "Tutorial", icon: PlayCircle },
    { href: "/books", name: "My Books", icon: Library },
    { href: "/leads", name: "Leads", icon: Users },
    { href: "/billing", name: "Plans & Billing", icon: CreditCard },
    { href: "/agency", name: "Agency", icon: BriefcaseBusiness },
    { href: "/settings", name: "Settings", icon: Settings },
  ];
  const favoriteBooks = books.filter(book => favorites.includes(book.id));
  return <main className="fs-content fs-dash">
    <section className="fs-dash-head"><div>
      <h1>Welcome Back{name.trim() ? <>, <span className="fs-name">{name.trim().split(" ")[0]}</span></> : null}</h1>
      <p className="fs-muted">Let&apos;s create amazing books today.</p>
    </div></section>
    {(error || usage.error) && <p className="fs-alert" role="alert">{error || usage.error} <button className="fs-inline-button" onClick={() => window.location.reload()}>Try again</button></p>}
    <section className="fs-dash-band">
      <div className="fs-hero-card">
        <div className="fs-hero-copy-card"><h2>Turn Ideas into Impact</h2><p>Create, write, publish and manage<br />everything with AI.</p>
          <Link href="/billing" className="fs-btn fs-primary"><Crown size={17} />Upgrade</Link>
        </div>
        {art("hero") ? <Image className="fs-hero-art-img" src={art("hero")} alt="" width={420} height={420} unoptimized priority /> : <div className="fs-hero-book" aria-hidden="true"><Sparkles /><BookOpen /><span>YOUR NEXT CHAPTER</span></div>}
      </div>
      <div className="fs-stat-cards">{stats.map(stat => <Link href={stat.href} key={stat.label} className={"fs-stat-card fs-stat-" + stat.tone}>
        <stat.icon className="fs-stat-icon" size={30} /><small>{stat.label}</small><Wave className="fs-stat-wave" /><strong>{stat.value}</strong>
        <span>{stat.label === "AI actions" ? "today" : "in your workspace"}</span>
      </Link>)}</div>
    </section>
    <section className="fs-dash-band fs-dash-band-two">
      <div className="fs-starters">{starters.map(card => <Link key={card.href} className={"fs-starter fs-starter-" + card.tone} href={card.href}>
        {art(card.image) ? <Image src={art(card.image)} alt="" width={200} height={200} unoptimized /> : <span className="fs-starter-icon"><card.icon size={56} /></span>}
        <span className="fs-starter-foot"><strong>{card.title}</strong><i><ArrowRight size={18} /></i></span>
      </Link>)}</div>
      <div className="fs-activity-card"><div className="fs-card-head"><div><h3>Recent activity</h3><small className="fs-muted">Books last edited · past 14 days</small></div></div>
        {hydrated && !loading && !error ? <Sparkline points={activity(books)} ariaLabel="Books last edited on each of the past 14 days" /> : <div className="fs-spark-empty">{loading ? "Loading activity…" : "Activity unavailable"}</div>}
      </div>
    </section>
    <section className="fs-quick-links"><h3>Quick Links</h3><div>{links.map(link => <Link key={link.href} href={link.href}><span><link.icon size={25} /></span>{link.name}</Link>)}</div></section>
    <section className="fs-favorites"><div className="fs-section-heading"><h3>Favourite</h3><Link href="/books">View all books <ArrowRight size={14} /></Link></div>
      {loading ? <div className="fs-empty"><LoaderCircle className="fs-spin" /><p>Loading favourites…</p></div> : error ? <div className="fs-empty"><p>Your favourites will appear when your books can be loaded.</p></div> : favoriteBooks.length ? <div className="fs-book-grid">{favoriteBooks.map((book, i) => <article className="fs-book-card" key={book.id}>
        <Link className={"fs-book-cover fs-cover-" + i % 4} href={bookPath(book)}><div><span>AI BOOK CREATOR</span><h3>{book.title}</h3><BookOpen size={25} /></div></Link>
        <div className="fs-book-info"><h3>{book.title}</h3><p>{book.page_count} pages</p><div className="fs-book-actions"><Link href={bookPath(book)}>Open editor <ArrowRight size={14} /></Link><button onClick={() => toggleFavorite(book.id)} aria-label={"Remove " + book.title + " from favourites"}><Star size={17} fill="currentColor" /></button></div></div>
      </article>)}</div> : <div className="fs-favorite-empty">
        <div className="fs-favorite-art" aria-hidden="true"><Gift size={72} /><Sparkles size={25} /></div>
        <div><h3>No favourite found</h3><p>Create your first book and<br />add it to favourites.</p><Link href="/books/new" className="fs-btn fs-primary"><Plus size={17} />Create New Book</Link><small>Star books in your library to save them here on this browser.</small></div>
      </div>}
    </section>
    <footer className="fs-dash-footer">All Rights Reserved to <strong>AI Book Creator</strong></footer>
  </main>;
}
