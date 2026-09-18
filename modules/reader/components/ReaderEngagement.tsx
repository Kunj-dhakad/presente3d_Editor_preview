"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail, Phone, Sparkles, Star, User } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import { pagesInView } from "../utils/spread";
import PopupShell from "../popup/PopupShell";
import { readerId, rememberReader, useReaderSubmit } from "../context/ReaderSubmit";

/**
 * Reader-side engagement for a published book:
 * - reports the view and the furthest page reached,
 * - offers the lead form once (15 s in, or on page 3 — whichever comes first),
 * - asks for a rating once, when the last page is reached.
 * Each popup is shown to a browser only once per book, and both can be closed.
 */

const LEAD_DELAY_MS = 15_000;
const LEAD_PAGE = 3;
const REPORT_DELAY_MS = 1_500;

const storage = {
  get(key: string) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch { /* private mode */ } },
};

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Please try again.");
  return data as Record<string, unknown>;
}

export default function ReaderEngagement({ token }: { token: string }) {
  const { currentPage, totalPages, viewMode, loading } = useBookPreview();
  const base = `/api/read/${encodeURIComponent(token)}`;
  const leadKey = `abc-lead:${token}`;
  const ratingKey = `abc-rating:${token}`;

  const visitor = useRef("");
  const furthest = useRef(0);
  const reported = useRef(0);
  const [leadForm, setLeadForm] = useState(false);
  const [leadTimeUp, setLeadTimeUp] = useState(false);
  const [leadDone, setLeadDone] = useState(() => Boolean(storage.get(leadKey)));
  const [ratingReady, setRatingReady] = useState(false);
  const [ratingDone, setRatingDone] = useState(() => Boolean(storage.get(ratingKey)));

  const inView = totalPages ? pagesInView(currentPage, totalPages, viewMode) : [];
  // Latched while rendering, so turning back a page does not undo them.
  const [reachedLeadPage, setReachedLeadPage] = useState(false);
  if (!reachedLeadPage && inView.length && Math.max(...inView) >= Math.min(LEAD_PAGE, totalPages)) setReachedLeadPage(true);
  const [reachedEnd, setReachedEnd] = useState(false);
  if (!reachedEnd && inView.includes(totalPages)) setReachedEnd(true);

  const report = useCallback((beacon = false) => {
    if (!visitor.current || !totalPages || furthest.current <= reported.current) return;
    const body = { visitor: visitor.current, page: furthest.current, total: totalPages };
    reported.current = furthest.current;
    if (beacon && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(`${base}/views`, new Blob([JSON.stringify(body)], { type: "application/json" }));
      return;
    }
    void post(`${base}/views`, body).catch(() => { reported.current = 0; });
  }, [base, totalPages]);

  // Open: count the view and learn whether this book collects leads.
  useEffect(() => {
    if (loading || !totalPages || visitor.current) return;
    visitor.current = readerId();
    furthest.current = Math.max(...pagesInView(currentPage, totalPages, viewMode), 1);
    reported.current = furthest.current;
    post(`${base}/views`, { visitor: visitor.current, page: furthest.current, total: totalPages })
      .then(data => setLeadForm(data.leadForm === true))
      .catch(() => { /* reading works without tracking */ });
  }, [loading, totalPages, currentPage, viewMode, base]);

  // Page turns: remember the furthest page, report it shortly after.
  useEffect(() => {
    if (!visitor.current || !totalPages) return;
    const seen = Math.max(...pagesInView(currentPage, totalPages, viewMode), 1);
    if (seen <= furthest.current) return;
    furthest.current = seen;
    const timer = window.setTimeout(() => report(), REPORT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentPage, totalPages, viewMode, report]);

  // Leaving the page: send what is left.
  useEffect(() => {
    const flush = () => { if (document.visibilityState === "hidden") report(true); };
    const leave = () => report(true);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", leave);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", leave); };
  }, [report]);

  // Lead form: after 15 seconds, or on page 3, whichever comes first.
  useEffect(() => {
    if (!leadForm || leadDone) return;
    const timer = window.setTimeout(() => setLeadTimeUp(true), LEAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [leadForm, leadDone]);

  // Rating: a moment after the last page comes into view.
  useEffect(() => {
    if (!reachedEnd || ratingDone) return;
    const timer = window.setTimeout(() => setRatingReady(true), 1_200);
    return () => window.clearTimeout(timer);
  }, [reachedEnd, ratingDone]);

  const showLead = leadForm && !leadDone && (leadTimeUp || reachedLeadPage);
  // The rating waits until the lead form is out of the way.
  const showRating = !showLead && ratingReady && !ratingDone;

  if (showLead) return <LeadPopup onDone={outcome => { storage.set(leadKey, outcome); setLeadDone(true); }} />;
  if (showRating) return <RatingPopup base={base} onDone={outcome => { storage.set(ratingKey, outcome); setRatingDone(true); }} />;
  return null;
}

/* ---------------------------------------------------------------- lead form */

function Field({ icon: Icon, label, optional, ...input }: { icon: typeof User; label: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
        {label}{optional && <span className="font-normal text-slate-400">Optional</span>}
      </span>
      <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-(--kd-accent) focus-within:ring-4 focus-within:ring-(--kd-accent)/10">
        <Icon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input {...input} className="h-11 w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
      </span>
    </label>
  );
}

function LeadPopup({ onDone }: { onDone: (outcome: string) => void }) {
  const send = useReaderSubmit();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      rememberReader({ name, email, phone });
      if (send) await send({ kind: "lead", title: "Lead form", answers: { Name: name, Email: email, Phone: phone } });
      setSent(true);
      window.setTimeout(() => onDone("sent"), 1_800);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send your details."); }
    finally { setBusy(false); }
  }

  return (
    <PopupShell onClose={() => onDone(sent ? "sent" : "dismissed")} maxWidth={400} label="Stay in touch">
      {sent ? (
        <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
          <CheckCircle2 size={48} className="text-(--kd-accent)" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Thanks, {name.split(" ")[0]}!</h2>
          <p className="text-sm text-slate-500">We&apos;ll keep you posted. Enjoy the rest of the book.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="-mx-4 -mt-5 mb-1 bg-(image:--kd-gradient-brand) px-5 pb-5 pt-6 text-white">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20"><Sparkles size={22} aria-hidden="true" /></span>
            <h2 className="text-xl font-bold leading-tight">Enjoying the read?</h2>
            <p className="mt-1 text-sm text-white/85">Leave your details to get updates and new books from the author.</p>
          </div>
          <Field icon={User} label="Name" required autoComplete="name" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          <Field icon={Mail} label="Email" required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <Field icon={Phone} label="Phone" optional type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="submit" disabled={busy} className="h-11 rounded-xl bg-(--kd-accent) text-sm font-semibold text-white shadow-lg shadow-(--kd-accent)/25 transition hover:bg-(--kd-accent-hover) disabled:opacity-60">
            {busy ? "Sending…" : "Keep me updated"}
          </button>
          <button type="button" onClick={() => onDone("dismissed")} className="-mt-1 text-xs font-medium text-slate-500 hover:text-slate-700">
            No thanks, keep reading
          </button>
          <p className="text-center text-[11px] leading-snug text-slate-400">Your details go only to the author of this book.</p>
        </form>
      )}
    </PopupShell>
  );
}

/* ------------------------------------------------------------------- rating */

const MOODS = ["Poor", "Fair", "Good", "Great", "Loved it"];

function RatingPopup({ base, onDone }: { base: string; onDone: (outcome: string) => void }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const shown = hover || stars;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stars) return;
    setBusy(true); setError("");
    try {
      await post(`${base}/rating`, { visitor: readerId(), stars, comment });
      setSent(true);
      window.setTimeout(() => onDone("rated"), 1_800);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send your rating."); }
    finally { setBusy(false); }
  }

  return (
    <PopupShell onClose={() => onDone(sent ? "rated" : "skipped")} maxWidth={400} label="Rate this book">
      {sent ? (
        <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
          <CheckCircle2 size={48} className="text-(--kd-accent)" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Thank you!</h2>
          <p className="text-sm text-slate-500">Your rating helps the author make better books.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-(--kd-brand-100) text-(--kd-accent)"><Star size={28} fill="currentColor" aria-hidden="true" /></span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">You reached the end!</h2>
            <p className="mt-1 text-sm text-slate-500">How would you rate this book?</p>
          </div>
          <div role="radiogroup" aria-label="Rating" className="flex gap-1.5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(value => (
              <button key={value} type="button" role="radio" aria-checked={stars === value} aria-label={`${value} star${value > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(value)} onFocus={() => setHover(value)} onBlur={() => setHover(0)} onClick={() => setStars(value)}
                className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-(--kd-accent)">
                <Star size={34} className={value <= shown ? "text-amber-400" : "text-slate-200"} fill="currentColor" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="h-4 text-xs font-semibold text-amber-600" aria-live="polite">{shown ? MOODS[shown - 1] : ""}</p>
          {stars > 0 && (
            <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={500} rows={3}
              placeholder="Tell the author what you liked (optional)" aria-label="Comment (optional)"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-(--kd-accent) focus:ring-4 focus:ring-(--kd-accent)/10" />
          )}
          {error && <p role="alert" className="w-full rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button type="submit" disabled={!stars || busy} className="h-11 w-full rounded-xl bg-(--kd-accent) text-sm font-semibold text-white shadow-lg shadow-(--kd-accent)/25 transition hover:bg-(--kd-accent-hover) disabled:opacity-50">
            {busy ? "Sending…" : "Submit rating"}
          </button>
          <button type="button" onClick={() => onDone("skipped")} className="-mt-1 text-xs font-medium text-slate-500 hover:text-slate-700">Maybe later</button>
        </form>
      )}
    </PopupShell>
  );
}
