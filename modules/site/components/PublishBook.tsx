"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import qrcode from "qrcode-generator";
import {
  ArrowLeft, CalendarDays, Check, Code2, Copy, Download, ExternalLink, Globe,
  History, Link2, LoaderCircle, Lock, Maximize2, PencilLine, X,
} from "lucide-react";
import { FaBlogger, FaFacebook, FaLinkedin, FaTelegram, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { BookCover } from "@reader/index";
import { bookPath } from "@shared/bookUrl";
import { SITE } from "@shared/site";

type Book = { id: string; uuid: string; title: string; pages: number; updatedAt: string; leadForm: boolean; cover: string | null };
type Share = { path: string; publishedAt: string } | null;

const SOCIAL = [
  { name: "Facebook", icon: FaFacebook, color: "#1877f2", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { name: "WhatsApp", icon: FaWhatsapp, color: "#25d366", href: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
  { name: "X (Twitter)", icon: FaXTwitter, color: "#000000", href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
  { name: "Telegram", icon: FaTelegram, color: "#229ed9", href: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
  { name: "Blogger", icon: FaBlogger, color: "#ff5722", href: (u: string, t: string) => `https://www.blogger.com/blog-this.g?u=${u}&n=${t}` },
  { name: "LinkedIn", icon: FaLinkedin, color: "#0a66c2", href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
];

const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function PublishBook({ book, initialShare, origin, autoPublish }: {
  book: Book; initialShare: Share; origin: string; autoPublish: boolean;
}) {
  const router = useRouter();
  const [share, setShare] = useState<Share>(initialShare);
  const [busy, setBusy] = useState(autoPublish && !initialShare);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [editVisibility, setEditVisibility] = useState(false);
  const [bigQr, setBigQr] = useState(false);
  const [leadForm, setLeadForm] = useState(book.leadForm);
  const [savingLead, setSavingLead] = useState(false);
  const arrived = useRef(false);

  const url = share ? origin + share.path : "";
  const embed = url ? `<iframe src="${url}" width="100%" height="640" style="border:0" allow="fullscreen" allowfullscreen title="${book.title.replace(/"/g, "&quot;")}"></iframe>` : "";

  async function setPublic(makePublic: boolean) {
    setBusy(true); setError(""); setEditVisibility(false);
    try {
      const res = await fetch(`/api/books/${book.id}/share`, { method: makePublic ? "POST" : "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update the book.");
      setShare(makePublic ? { path: data.path, publishedAt: new Date().toISOString() } : null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update the book."); }
    finally { setBusy(false); }
  }

  // Arriving from the editor's Publish button: publish once, then drop the flag
  // so a reload does not re-publish a book the user has since made private.
  useEffect(() => {
    if (!autoPublish || arrived.current) return;
    arrived.current = true;
    void (initialShare ? Promise.resolve() : setPublic(true))
      .then(() => router.replace(`/books/${book.id}/publish`, { scroll: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on arrival
  }, []);

  async function copy(text: string, what: string) {
    // The Clipboard API only exists on https (and localhost); on a plain-http
    // address such as a LAN IP fall back to the older copy command.
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = legacyCopy(text); }
    if (!ok) { setError("Copy failed. Select the text and copy it yourself."); return; }
    setError("");
    setCopied(what);
    setTimeout(() => setCopied(current => current === what ? "" : current), 1800);
  }

  async function toggleLeadForm() {
    const next = !leadForm;
    setLeadForm(next); setSavingLead(true); setError("");
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadForm: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not change the lead form.");
    } catch (e) { setLeadForm(!next); setError(e instanceof Error ? e.message : "Could not change the lead form."); }
    finally { setSavingLead(false); }
  }

  function makePrivate() {
    if (confirm("Make this book private? The current link, embed code and QR code will stop working.")) void setPublic(false);
  }

  return <main className="fs-content fs-dash fs-publish">
    <section className="fs-dash-head">
      <div>
        <Link href={bookPath({ id: book.uuid, short_id: book.id, title: book.title })} className="fs-back-link"><ArrowLeft size={14} /> Back to editor</Link>
        <h1>Publish Page</h1>
        <p className="fs-muted">Share your book with the world.</p>
      </div>
    </section>
    {error && <p role="alert" className="fs-alert">{error}</p>}

    <div className="fs-publish-grid">
      <section className="fs-publish-stage" aria-label="Book cover">
        <div className="fs-publish-cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-only cover served by our API */}
          {book.cover ? <img className="fs-publish-cover-image" src={book.cover} alt={`Cover of ${book.title}`} /> : <BookCover jsonUrl={`/api/books/${book.id}`} />}
        </div>
        <div className="fs-publish-caption">
          <strong>{book.title}</strong>
          <span>{book.pages} {book.pages === 1 ? "page" : "pages"} · {share ? <><Globe size={13} /> Public</> : <><Lock size={13} /> Private</>}</span>
        </div>
      </section>

      <div className="fs-publish-side">
        <Card title="Copy & Share URL">
          {share ? <>
            <div className="fs-publish-row">
              <span className="fs-publish-field"><Link2 size={16} /><input readOnly value={url} aria-label="Book link" onFocus={e => e.currentTarget.select()} /></span>
              <button className="fs-publish-icon" onClick={() => copy(url, "url")} aria-label="Copy link" title="Copy link">{copied === "url" ? <Check size={17} /> : <Copy size={17} />}</button>
              <a className="fs-publish-icon fs-publish-strong" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open book in a new tab" title="Open"><ExternalLink size={17} /></a>
            </div>
            <div className="fs-publish-social">
              {SOCIAL.map(s => <a key={s.name} href={s.href(encodeURIComponent(url), encodeURIComponent(book.title))} target="_blank" rel="noopener noreferrer">
                <s.icon size={18} color={s.color} aria-hidden="true" />{s.name}
              </a>)}
            </div>
          </> : <Private busy={busy} onPublish={() => void setPublic(true)} />}
        </Card>

        <Card title="Embed Code">
          {share ? <div className="fs-publish-row">
            <span className="fs-publish-field"><Code2 size={16} /><input readOnly value={embed} aria-label="Embed code" onFocus={e => e.currentTarget.select()} /></span>
            <button className="fs-publish-icon" onClick={() => copy(embed, "embed")} aria-label="Copy embed code" title="Copy embed code">{copied === "embed" ? <Check size={17} /> : <Copy size={17} />}</button>
          </div> : <p className="fs-publish-note">Publish the book to embed it on your website.</p>}
        </Card>

        <Card title="Book">
          <div className="fs-publish-row">
            <span className="fs-publish-field fs-publish-visibility">
              Visibility
              <b>{busy ? <LoaderCircle className="fs-spin" size={14} /> : share ? <Globe size={14} /> : <Lock size={14} />}{share ? "Public" : "Private"}</b>
            </span>
            <button className="fs-publish-icon" onClick={() => setEditVisibility(open => !open)} aria-expanded={editVisibility} aria-label="Change visibility" title="Change visibility" disabled={busy}><PencilLine size={17} /></button>
          </div>
          <div className="fs-publish-row">
            <span className="fs-publish-field fs-publish-visibility">
              <span className="fs-publish-switch-label">Lead form<small>Asks readers for their name and email once, after 15 seconds or on page 3.</small></span>
              <button type="button" role="switch" aria-checked={leadForm} aria-label="Lead form" disabled={savingLead} className={`fs-switch${leadForm ? " on" : ""}`} onClick={() => void toggleLeadForm()}><i /></button>
            </span>
          </div>
          {editVisibility && <div className="fs-publish-choice" role="group" aria-label="Visibility">
            <button className={share ? "on" : ""} onClick={() => share ? setEditVisibility(false) : void setPublic(true)}>
              <Globe size={16} /><span><strong>Public</strong><small>Anyone with the link can read it.</small></span>
            </button>
            <button className={share ? "" : "on"} onClick={() => share ? makePrivate() : setEditVisibility(false)}>
              <Lock size={16} /><span><strong>Private</strong><small>Only you can open it, in the editor.</small></span>
            </button>
          </div>}
        </Card>

        <Card title="QR Code">
          <div className="fs-publish-qr">
            <div className="fs-publish-qr-code">{share ? <Qr text={url} /> : <Lock size={28} aria-label="Private book" />}</div>
            <div className="fs-publish-dates">
              <span><CalendarDays size={18} /><span><strong>Published on</strong><small>{share ? date(share.publishedAt) : "Not published"}</small></span></span>
              <span><History size={18} /><span><strong>Last update</strong><small>{date(book.updatedAt)}</small></span></span>
            </div>
          </div>
          {share && <div className="fs-publish-qr-actions">
            <button className="fs-btn fs-primary" onClick={() => setBigQr(true)}><Maximize2 size={15} /> Scan QR</button>
            <button className="fs-publish-icon fs-publish-strong" onClick={() => downloadQr(url, book.title)} aria-label="Download QR code" title="Download QR code"><Download size={17} /></button>
          </div>}
        </Card>
      </div>
    </div>

    {bigQr && share && <div className="fs-app fs-modal-backdrop" onClick={() => setBigQr(false)}>
      <section className="fs-modal fs-publish-qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={e => e.stopPropagation()}>
        <button className="fs-modal-close" onClick={() => setBigQr(false)} aria-label="Close"><X /></button>
        <h2 id="qr-title">Scan to read</h2>
        <p className="fs-muted">Point a phone camera at the code to open “{book.title}”.</p>
        <div className="fs-publish-qr-big"><Qr text={url} /></div>
      </section>
    </div>}

    <footer className="fs-dash-footer">All rights reserved to <strong>{SITE.name}</strong></footer>
  </main>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="fs-publish-card"><h2>{title}</h2><div>{children}</div></section>;
}

function Private({ busy, onPublish }: { busy: boolean; onPublish: () => void }) {
  return <div className="fs-publish-private">
    <p className="fs-publish-note"><Lock size={15} /> This book is private. Publish it to get a link you can share.</p>
    <button className="fs-btn fs-primary" onClick={onPublish} disabled={busy}>
      {busy ? <LoaderCircle className="fs-spin" size={15} /> : <Globe size={15} />} {busy ? "Publishing…" : "Publish book"}
    </button>
  </div>;
}

function legacyCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(area);
  area.select();
  try { return document.execCommand("copy"); } catch { return false; } finally { area.remove(); }
}

function encode(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr;
}

/** A crisp vector QR with the standard four-module quiet zone. */
function Qr({ text }: { text: string }) {
  const code = useMemo(() => {
    const qr = encode(text);
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`;
    }
    return { d, size: count + 8 };
  }, [text]);
  return <svg className="fs-publish-qr-svg" viewBox={`0 0 ${code.size} ${code.size}`} shapeRendering="crispEdges" role="img" aria-label="QR code for the book link">
    <rect width="100%" height="100%" fill="#fff" /><path d={code.d} fill="#111" />
  </svg>;
}

function downloadQr(text: string, title: string) {
  const qr = encode(text);
  const count = qr.getModuleCount();
  const cell = 12;
  const size = (count + 8) * cell;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#111";
  for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
    if (qr.isDark(row, col)) ctx.fillRect((col + 4) * cell, (row + 4) * cell, cell, cell);
  }
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  const slug = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  link.download = `${slug || "book"}-qr.png`;
  link.click();
}
