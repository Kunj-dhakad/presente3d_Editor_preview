"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, CheckCheck, ChevronDown, FileText, FileUp, Globe2, Library, Link2, LoaderCircle, Minus, Pause, Play, Plus, RotateCcw, Settings2, Sparkles, WandSparkles, X } from "lucide-react";
import { BOOK_CATEGORIES, BOOK_FORMATS, BOOK_PAGE_LIMIT, BOOK_TONES, PDF_SIZE_LIMIT, type BookFormat, type ImportedBookSource } from "@shared/aiBook";
import type { Brief, Outline } from "@shared/server/ai-book";
import { bookPath } from "@shared/bookUrl";
import { useUsage } from "./Usage";
import { assembleBook, type BookExtras } from "@site/lib/generateAiBook";
import { chapterMarks, CHAPTER_TITLE_LENGTH } from "@shared/bookChapters";

type Source = "description" | "pdf" | "url";
type Phase = "setup" | "planning" | "review" | "writing" | "saving" | "failed";
type Slide = { id: string; width: number; height: number; background: string; elements: unknown[] };
type Plan = { outline: Outline; photos: string[]; topic: string };
const EXAMPLES = [
  { label: "Business guide", text: "Create a practical guide to starting a small business. Cover finding an idea, understanding customers, pricing, marketing and a simple launch checklist.", category: "Business" },
  { label: "Travel lookbook", text: "A visual travel guide to Japan for first-time visitors. Explore Tokyo, Kyoto, local food, cultural etiquette and a thoughtful seven-day itinerary.", category: "Travel" },
  { label: "Learning workbook", text: "Create an approachable photography workbook for beginners. Explain composition, lighting and camera settings with hands-on exercises for each chapter.", category: "Education" },
];
async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data;
  try { data = await response.json(); } catch { throw new Error("The server could not finish this step. Please try again."); }
  if (!response.ok) throw new Error(data.error || data.message || "Please try again.");
  return data as T;
}

export default function AiBookCreator() {
  const [format, setFormat] = useState<BookFormat>("portrait");
  const [source, setSource] = useState<Source>("description");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [url, setUrl] = useState("");
  const [pdfSource, setPdfSource] = useState<ImportedBookSource | null>(null);
  const [urlSource, setUrlSource] = useState<ImportedBookSource | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [category, setCategory] = useState("Business");
  const [tone, setTone] = useState("Professional");
  const [audience, setAudience] = useState("");
  const [pages, setPages] = useState("5");
  const [advanced, setAdvanced] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");
  const importRequest = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const slides = useRef<Map<number, Slide>>(new Map());
  const extras = useRef<{ index: Slide[]; back: Slide } | null>(null);
  const operation = useRef(false);
  const usage = useUsage();
  const imported = source === "pdf" ? pdfSource : source === "url" ? urlSource : null;
  const selectedFormat = BOOK_FORMATS.find(item => item.id === format)!;
  const count = Number(pages);
  const validCount = Number.isInteger(count) && count >= 1 && count <= BOOK_PAGE_LIMIT;
  const busy = ["planning", "writing", "saving"].includes(phase);
  const generating = ["writing", "saving", "failed"].includes(phase);
  const total = (plan?.outline.pages.length ?? (validCount ? count : 0)) + 1;
  // The same grouping the server will use, shown while the outline is reviewed.
  const marks = plan ? chapterMarks(plan.outline.pages) : [];
  const remaining = usage.data ? Math.max(0, usage.data.plan.limits.aiDaily - usage.data.usage.aiToday) : null;
  const sourceReady = source === "description" ? description.trim().length >= 3 : Boolean(imported);
  const ready = validCount && sourceReady && !importing;

  useEffect(() => () => importRequest.current?.abort(), []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (phase === "review") titleRef.current?.focus(); }, [phase]);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function changeSource(next: Source) {
    importRequest.current?.abort(); setImporting(false); setError(""); setSource(next);
  }
  async function importSource(file?: File) {
    importRequest.current?.abort();
    setError("");
    if (file && (!/\.pdf$/i.test(file.name) || file.size > PDF_SIZE_LIMIT || !file.size)) {
      setPdfSource(null); setError("Choose a PDF file between 1 byte and 10 MB."); return;
    }
    if (!file) {
      try { const parsed = new URL(url); if (parsed.protocol !== "https:") throw new Error(); }
      catch { setError("Enter a complete HTTPS URL, such as https://example.com/article."); return; }
    }
    const controller = new AbortController(); importRequest.current = controller;
    setImporting(true);
    if (file) setPdfSource(null); else setUrlSource(null);
    try {
      const response = await fetch("/api/ai/source", {
        method: "POST", signal: controller.signal,
        headers: file ? { "Content-Type": "application/pdf", "X-File-Name": encodeURIComponent(file.name) } : { "Content-Type": "application/json" },
        body: file || JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not import this source.");
      if (!controller.signal.aborted) { if (file) setPdfSource(data); else setUrlSource(data); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not import this source."); }
    finally { if (!controller.signal.aborted) setImporting(false); }
  }
  function writingOptions() {
    return { category, tone, audience, sourceText: imported?.text || "" };
  }
  async function review(event: React.FormEvent) {
    event.preventDefault();
    if (operation.current || !ready) return;
    operation.current = true; setError(""); setPhase("planning"); slides.current.clear(); extras.current = null; setDone(0);
    try {
      const prompt = source === "description" ? description : `Create a book based on the imported source: ${imported!.title}. ${instructions}`;
      const result = await post<Plan>("/api/ai/outline", { prompt, pages: count, size: format, ...writingOptions() });
      setPlan(result); setPhase("review"); void usage.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not plan your book."); setPhase("setup"); }
    finally { operation.current = false; }
  }
  function editBrief(index: number, update: Partial<Brief>) {
    setPlan(current => current && ({ ...current, outline: { ...current.outline, pages: current.outline.pages.map((brief, i) => i === index ? { ...brief, ...update } : brief) } }));
  }
  function moveBrief(index: number, direction: number) {
    setPlan(current => {
      if (!current) return current;
      const next = [...current.outline.pages];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return { ...current, outline: { ...current.outline, pages: next } };
    });
  }
  async function generate(event?: React.FormEvent) {
    event?.preventDefault();
    if (!plan || operation.current) return;
    if (!plan.outline.title.trim() || plan.outline.pages.some(brief => !brief.heading.trim() || !brief.summary.trim())) {
      setError("Give your book a title and complete each page's heading and brief."); return;
    }
    operation.current = true; setError(""); setPhase("writing");
    try {
      const items = [{ index: 0, brief: { heading: plan.outline.title, summary: plan.outline.subtitle, layout: "text" } }, ...plan.outline.pages.map((brief, index) => ({ index: index + 1, brief }))].filter(item => !slides.current.has(item.index));
      // All batches run at once — that is what keeps a long book fast. Finished
      // batches are kept on failure, so a retry writes only the missing pages.
      const batches: typeof items[] = [];
      for (let offset = 0; offset < items.length; offset += 8) batches.push(items.slice(offset, offset + 8));
      const results = await Promise.allSettled(batches.map(async batch => {
        const result = await post<{ pages: { index: number; page: Slide }[]; extras?: BookExtras }>("/api/ai/pages", { outline: plan.outline, size: format, topic: plan.topic, photos: plan.photos, items: batch, ...writingOptions() });
        for (const entry of result.pages) if (batch.some(item => item.index === entry.index) && entry.page?.id) slides.current.set(entry.index, entry.page);
        if (result.extras) extras.current = result.extras as { index: Slide[]; back: Slide };
        setDone(slides.current.size);
      }));
      const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failed) throw failed.reason instanceof Error ? failed.reason : new Error("Some pages could not be completed. Retry to finish the missing pages.");
      if (slides.current.size !== total || !extras.current) throw new Error("Some pages are missing. Retry to finish your book.");
      setPhase("saving");
      const book = await post<{ id: string; short_id: string | null; title: string }>("/api/books", { title: plan.outline.title, document: { slides: assembleBook(slides.current, plan.outline.pages.length, extras.current) } });
      window.location.assign(bookPath(book));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not finish your book."); setPhase("failed"); }
    finally { operation.current = false; void usage.reload(); }
  }

  return <main className="fs-content fs-creator">
    <header className="fs-creator-heading"><div><span className="fs-creator-kicker"><Sparkles size={14} /> YOUR IDEAS. BEAUTIFULLY BOUND.</span><h1>AI Book <span>Creator</span></h1><p>One idea. Endless possibilities. Let&apos;s make something worth reading.</p></div><Link href="/books" className="fs-btn fs-outline"><Library size={16} />My Books <ArrowRight size={15} /></Link></header>
    <ol className="fs-creator-steps" aria-label="Creation progress">{["Set up your book", "Make it yours", "Bring it to life"].map((label, index) => {
      const current = generating ? 2 : phase === "review" ? 1 : 0;
      return <li key={label} className={index === current ? "current" : index < current ? "complete" : ""} aria-current={index === current ? "step" : undefined}><span>{index < current ? <Check size={13} /> : index + 1}</span>{label}</li>;
    })}</ol>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className="fs-alert fs-creator-alert">{error}{/plan|allowance|AI actions/i.test(error) && <> <Link href="/billing">View your plan</Link></>}</div>}

    {generating ? <section className="fs-creator-generating" aria-live="polite">
      <div className="fs-generating-symbol"><BookOpen size={46} /><Sparkles size={23} /></div><span className="fs-creator-kicker">{phase === "failed" ? "YOUR PROGRESS IS KEPT ON THIS PAGE" : "A LITTLE MAGIC IN THE MAKING"}</span>
      <h2>{phase === "failed" ? "Let’s finish your book" : phase === "saving" ? "Saving your new book" : "Your story is taking shape"}</h2><p>{plan?.outline.title}</p>
      <progress value={done} max={total} aria-label={`${done} of ${total} pages ready`} /><div className="fs-generation-status"><span>{done} of {total} pages ready</span><span>{selectedFormat.name}</span></div>
      <ol><li><CheckCheck size={18} />Outline approved</li><li>{done < total ? <LoaderCircle className={phase !== "failed" ? "fs-spin" : ""} size={18} /> : <CheckCheck size={18} />}Writing and designing pages</li><li>{phase === "saving" ? <LoaderCircle className="fs-spin" size={18} /> : <BookOpen size={18} />}Save and open the editor</li></ol>
      {phase === "failed" ? <><button className="fs-btn fs-primary" onClick={() => void generate()}><RotateCcw size={16} />{done === total ? "Retry saving" : "Finish remaining pages"}</button><small>Completed batches stay here. Retrying a failed AI request may use additional actions.</small></> : <small>Keep this page open. You can edit every page once your book is ready.</small>}
    </section> : phase === "review" && plan ? <form className="fs-outline-review" onSubmit={generate}>
      <section className="fs-creator-panel"><div className="fs-creator-panel-head"><div><span className="fs-creator-kicker">THE FIRST DRAFT OF YOUR IDEA</span><h2>Shape your story</h2><p>Edit the title, refine each page and put things in your preferred order.</p></div><button type="button" className="fs-btn fs-outline" onClick={() => { setPhase("setup"); setError(""); }}><ArrowLeft size={15} />Back to setup</button></div>
        <div className="fs-outline-title"><label>Book title<input ref={titleRef} required maxLength={120} value={plan.outline.title} onChange={event => setPlan({ ...plan, outline: { ...plan.outline, title: event.target.value } })} /></label><label>Subtitle<input maxLength={160} value={plan.outline.subtitle} onChange={event => setPlan({ ...plan, outline: { ...plan.outline, subtitle: event.target.value } })} /></label></div>
        <ol className="fs-outline-pages">{plan.outline.pages.map((brief, index) => <li key={index}><span className="fs-outline-number">{String(index + 1).padStart(2, "0")}</span><div>{marks[index] && <span className="fs-outline-chapter">Chapter {marks[index]!.number} · {marks[index]!.title}</span>}<input className="fs-outline-chapter-input" aria-label={`Page ${index + 1} chapter`} placeholder="Chapter name" value={brief.chapter ?? ""} maxLength={CHAPTER_TITLE_LENGTH} onChange={event => editBrief(index, { chapter: event.target.value })} /><input aria-label={`Page ${index + 1} heading`} value={brief.heading} required maxLength={90} onChange={event => editBrief(index, { heading: event.target.value })} /><textarea aria-label={`Page ${index + 1} brief`} value={brief.summary} required maxLength={300} rows={2} onChange={event => editBrief(index, { summary: event.target.value })} /></div><div className="fs-outline-reorder"><button type="button" disabled={index === 0} aria-label={`Move page ${index + 1} up`} onClick={() => moveBrief(index, -1)}><ArrowUp size={16} /></button><button type="button" disabled={index === plan.outline.pages.length - 1} aria-label={`Move page ${index + 1} down`} onClick={() => moveBrief(index, 1)}><ArrowDown size={16} /></button></div></li>)}</ol>
      </section><div className="fs-creator-submit"><div><strong>{selectedFormat.name} · {total} pages including cover</strong><small>Generating uses {plan.outline.pages.length} more AI actions. Your outline used 1 action.</small></div><button className="fs-btn fs-primary"><WandSparkles size={18} />Generate my book <ArrowRight size={17} /></button></div>
    </form> : <form onSubmit={review} className="fs-creator-form">
      <fieldset disabled={busy} className="fs-format-fieldset"><legend>Choose your canvas <span>Start with a shape that fits your story.</span></legend><button type="button" className="fs-preview-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? "Play previews" : "Pause previews"}</button>
        <div className="fs-format-grid">{BOOK_FORMATS.map(item => <label key={item.id} className={`fs-format-card${format === item.id ? " selected" : ""}`}><input type="radio" name="book-format" value={item.id} checked={format === item.id} onChange={() => setFormat(item.id)} /><div className="fs-format-top"><strong>{item.name}</strong><span className="fs-format-check">{format === item.id && <Check size={13} />}</span></div>
          <div className="fs-format-preview"><picture><source media="(prefers-reduced-motion: reduce)" srcSet={`/images/book-layouts/${item.id}.webp`} /><Image src={`/images/book-layouts/${item.id}.${paused ? "webp" : "gif"}`} alt={`${item.name} book layout preview`} width={500} height={300} unoptimized /></picture></div>
          <div className="fs-format-bottom"><span>{item.description}</span><small>{item.tag}</small></div>
        </label>)}</div>
      </fieldset>
      <div className="fs-creator-workbench"><div className="fs-creator-inputs">
        <section className="fs-creator-panel"><div className="fs-creator-panel-head"><div><h2><span className="fs-step-dot">01</span>Where should we start?</h2><p>Give AI a little inspiration. We&apos;ll take it from there.</p></div></div>
          <fieldset className="fs-source-tabs" disabled={busy || importing}><legend className="fs-visually-hidden">Book source</legend>{([{ id: "description", label: "Description", icon: FileText }, { id: "pdf", label: "Upload PDF", icon: FileUp }, { id: "url", label: "Website URL", icon: Link2 }] as const).map(tab => <label key={tab.id} className={source === tab.id ? "selected" : ""}><input type="radio" name="book-source" value={tab.id} checked={source === tab.id} onChange={() => changeSource(tab.id)} /><tab.icon size={16} />{tab.label}</label>)}</fieldset>
          {source === "description" ? <div className="fs-description-input"><label htmlFor="book-description">What&apos;s your book about?</label><textarea id="book-description" required minLength={3} maxLength={2000} rows={6} placeholder="A beginner’s guide to urban gardening, with practical tips for growing herbs and vegetables in small spaces…" value={description} disabled={busy} onChange={event => setDescription(event.target.value)} /><div className="fs-input-hint"><span>A topic, an audience and a few details go a long way.</span><span>{description.length.toLocaleString()}/2,000</span></div><div className="fs-prompt-examples"><span>Try an idea</span>{EXAMPLES.map(example => <button type="button" key={example.label} disabled={busy} onClick={() => { setDescription(example.text); setCategory(example.category); }}><Sparkles size={12} />{example.label}</button>)}</div></div> : <>
            {source === "pdf" ? <div className={`fs-pdf-drop${dragging ? " dragging" : ""}`} onDragOver={event => { event.preventDefault(); if (!busy && !importing) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy && !importing && event.dataTransfer.files[0]) void importSource(event.dataTransfer.files[0]); }}>
              <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="fs-visually-hidden" aria-label="Choose a PDF" disabled={busy || importing} onChange={event => { const file = event.target.files?.[0]; if (file) void importSource(file); event.target.value = ""; }} />
              {importing ? <LoaderCircle size={30} className="fs-spin" /> : <FileUp size={32} />}<strong>{importing ? "Reading your PDF…" : pdfSource ? "Your PDF is ready" : "Drop your PDF here"}</strong><p>Turn existing knowledge into a whole new book.</p><button type="button" className="fs-btn fs-outline" disabled={busy || importing} onClick={() => fileInput.current?.click()}>{pdfSource ? "Replace PDF" : "Browse files"}</button><small>Text-based PDF · Up to 10 MB · Maximum 100 pages</small>
            </div> : <div className="fs-url-input"><label htmlFor="book-url">Link to your inspiration</label><div><Globe2 size={18} /><input id="book-url" type="url" placeholder="https://example.com/your-article" value={url} disabled={busy || importing} onChange={event => { setUrl(event.target.value); setUrlSource(null); }} /><button type="button" className="fs-btn fs-primary" disabled={busy || importing || !url.trim()} onClick={() => void importSource()}>{importing ? <LoaderCircle className="fs-spin" size={15} /> : <ArrowDown size={15} />}{importing ? "Importing…" : "Import page"}</button></div><small>Use a public article, webpage or PDF link. Login-only pages cannot be imported.</small></div>}
            {imported && <div className="fs-source-result"><div><CheckCheck size={19} /><span><strong>{imported.title}</strong><small>{imported.pages ? `${imported.pages} source pages · ` : ""}{imported.text.length.toLocaleString()} characters ready</small></span><button type="button" aria-label="Remove imported source" disabled={busy} onClick={() => source === "pdf" ? setPdfSource(null) : setUrlSource(null)}><X size={16} /></button></div>{imported.truncated && <p>Using the first {imported.text.length.toLocaleString()} of {imported.characters.toLocaleString()} characters.</p>}<details><summary>Preview imported text</summary><pre>{imported.text}</pre></details></div>}
            <label className="fs-source-instructions">Anything to focus on? <span>Optional</span><textarea rows={2} maxLength={1500} disabled={busy} placeholder="Focus on key takeaways, make it beginner-friendly, or highlight a particular chapter…" value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
          </>}
        </section>
        <section className="fs-creator-panel fs-book-options"><div className="fs-creator-panel-head"><div><h2><span className="fs-step-dot">02</span>Add your personal touch</h2><p>A few small choices that make it yours.</p></div><Settings2 size={19} /></div>
          <fieldset disabled={busy} className="fs-creator-option-grid"><label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{BOOK_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label><label>Content pages<span className="fs-creator-page-count"><button type="button" aria-label="Fewer pages" disabled={!validCount || count <= 1} onClick={() => setPages(String(count - 1))}><Minus size={16} /></button><input type="number" aria-label="Number of content pages" required min={1} max={BOOK_PAGE_LIMIT} value={pages} onChange={event => setPages(event.target.value)} /><button type="button" aria-label="More pages" disabled={!validCount || count >= BOOK_PAGE_LIMIT} onClick={() => setPages(String(count + 1))}><Plus size={16} /></button></span></label></fieldset>
          <button className="fs-advanced-toggle" type="button" aria-expanded={advanced} aria-controls="book-advanced-options" disabled={busy} onClick={() => setAdvanced(value => !value)}>Fine-tune your writing <span>Tone & audience</span><ChevronDown size={15} className={advanced ? "expanded" : ""} /></button>
          {advanced && <fieldset id="book-advanced-options" disabled={busy} className="fs-creator-advanced"><label>Writing tone<select value={tone} onChange={event => setTone(event.target.value)}>{BOOK_TONES.map(value => <option key={value}>{value}</option>)}</select></label><label>Who is it for?<input maxLength={160} placeholder="e.g. Small business owners, beginners…" value={audience} onChange={event => setAudience(event.target.value)} /></label></fieldset>}
        </section>
      </div><aside className="fs-creator-summary"><div className="fs-summary-art" aria-hidden="true"><BookOpen size={50} /><Sparkles size={20} /></div><span className="fs-creator-kicker">YOUR NEXT GREAT BOOK</span><h2>A little idea.<br />A beautiful beginning.</h2><p>You bring the inspiration.<br />We&apos;ll help shape the pages.</p><dl><div><dt>Format</dt><dd>{selectedFormat.name}</dd></div><div><dt>Source</dt><dd>{source === "description" ? "Your idea" : source === "pdf" ? "PDF document" : "Website"}</dd></div><div><dt>Book length</dt><dd>{validCount ? `${count} pages + cover` : "Choose pages"}</dd></div></dl><div className="fs-summary-note"><CheckCheck size={17} /><span>Review your outline first.<br />Every page stays editable.</span></div><div className="fs-creator-allowance"><Sparkles size={14} />{remaining === null ? "Usage is checked when you create" : `${remaining.toLocaleString()} AI actions available today`}</div></aside></div>
      <div className="fs-creator-submit"><div><strong>{phase === "planning" ? "Planning something wonderful…" : "Ready to turn the page?"}</strong><small>{phase === "planning" ? "We’re organizing your ideas into an editable outline. Keep this page open." : `Outline: 1 AI action · Book: ${validCount ? count : "—"} more actions · Cover included`}</small>{!ready && !busy && <small>{!validCount ? "Choose 1–50 content pages." : importing ? "Your source is being imported." : source === "description" ? "Add a description to get started." : "Import your source to get started."}</small>}</div><button type="submit" className="fs-btn fs-primary" disabled={!ready || busy}>{phase === "planning" ? <LoaderCircle className="fs-spin" size={18} /> : <WandSparkles size={18} />}{phase === "planning" ? "Creating outline…" : "Create my outline"}<ArrowRight size={17} /></button></div>
    </form>}
    <footer className="fs-creator-footer"><BookOpen size={14} /> Made for your next chapter.<span>AI Book Creator</span></footer>
  </main>;
}
