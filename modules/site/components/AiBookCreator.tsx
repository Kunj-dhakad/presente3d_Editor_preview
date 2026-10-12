"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, FileText, FileUp, Globe2, Library, Link2, LoaderCircle, Minus, Plus, RotateCcw, Sparkles, WandSparkles, X, Newspaper, BookText, ListChecks, GraduationCap, Images, Eye, Pause, Play } from "lucide-react";
import { BOOK_CATEGORIES, BOOK_FORMATS, BOOK_PAGE_LIMIT, BOOK_TONES, PDF_SIZE_LIMIT, PUBLICATION_TYPES, type PublicationType, type BookFormat, type ImportedBookSource } from "@shared/aiBook";
import type { Outline } from "@shared/server/ai-book";
import { bookPath } from "@shared/bookUrl";
import { useUsage } from "./Usage";
import { assembleBook, type BookExtras } from "@site/lib/generateAiBook";
import { recentDesigns, rememberDesign } from "@site/lib/designHistory";
import CreatorSelect from "./CreatorSelect";

type Source = "description" | "pdf" | "url";
type Phase = "setup" | "planning" | "writing" | "saving" | "failed";
type Slide = { id: string; width: number; height: number; background: string; elements: unknown[] };
type Plan = { outline: Outline; photos: string[]; topic: string };
const TYPE_ICONS = { ebook: BookOpen, magazine: Newspaper, summary: BookText, guide: ListChecks, workbook: GraduationCap, lookbook: Images };
const TONE_HINTS: Record<string, string> = { Professional: "Clear, polished and confident", Friendly: "Warm, approachable and simple", Inspiring: "Motivating and encouraging", Educational: "Informative and easy to follow", Conversational: "Relaxed, like a conversation" };
async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data;
  try { data = await response.json(); } catch { throw new Error("The server could not finish this step. Please try again."); }
  if (!response.ok) throw new Error(data.error || data.message || "Please try again.");
  return data as T;
}

export default function AiBookCreator() {
  const [format, setFormat] = useState<BookFormat>("portrait");
  const [publicationType, setPublicationType] = useState<PublicationType>("ebook");
  const [source, setSource] = useState<Source>("description");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [url, setUrl] = useState("");
  const [pdfSource, setPdfSource] = useState<ImportedBookSource | null>(null);
  const [urlSource, setUrlSource] = useState<ImportedBookSource | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewsPaused, setPreviewsPaused] = useState(false);
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
  const slides = useRef<Map<number, Slide>>(new Map());
  const extras = useRef<{ index: Slide[]; back: Slide } | null>(null);
  const operation = useRef(false);
  const opening = useRef(false);
  const usage = useUsage();
  const imported = source === "pdf" ? pdfSource : source === "url" ? urlSource : null;
  const selectedFormat = BOOK_FORMATS.find(item => item.id === format)!;
  const selectedType = PUBLICATION_TYPES.find(item => item.id === publicationType)!;
  const summary = publicationType === "summary";
  const count = Number(pages);
  const validCount = Number.isInteger(count) && count >= 1 && count <= BOOK_PAGE_LIMIT;
  const busy = ["planning", "writing", "saving"].includes(phase);
  const generating = ["planning", "writing", "saving", "failed"].includes(phase);
  const total = (plan?.outline.pages.length ?? (validCount ? count : 0)) + 1;
  const remaining = usage.data ? Math.max(0, usage.data.plan.limits.aiDaily - usage.data.usage.aiToday) : null;
  const sourceReady = source === "description" ? description.trim().length >= (summary ? 80 : 3) : Boolean(imported);
  const ready = validCount && sourceReady && !importing;

  useEffect(() => () => importRequest.current?.abort(), []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!busy) return;
    // Warn before losing a book in progress, but not when we are opening the finished one.
    const warn = (event: BeforeUnloadEvent) => { if (!opening.current) event.preventDefault(); };
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
    return { publicationType, category, tone, audience, sourceText: imported?.text || (summary && source === "description" ? description : "") };
  }
  // One click: plan the pages, write them, save the book and open the editor.
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (operation.current || !ready) return;
    operation.current = true; setError(""); setPhase("planning"); setPlan(null); slides.current.clear(); extras.current = null; setDone(0);
    let result: Plan;
    try {
      const prompt = source === "description" ? (summary ? "Create a concise book summary from the supplied reading notes or book excerpts." : description) : `Create a ${selectedType.name.toLowerCase()} based on the imported source: ${imported!.title}. ${instructions}`;
      result = await post<Plan>("/api/ai/outline", { prompt, pages: count, size: format, avoid: recentDesigns(publicationType), ...writingOptions() });
      rememberDesign(publicationType, result.outline.variant);
      setPlan(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not plan your book."); setPhase("setup");
      operation.current = false; void usage.reload();
      return;
    }
    operation.current = false;
    await generate(result);
  }
  /** Writes the missing pages of `plan` and saves the book; a retry passes the same plan again. */
  async function generate(plan: Plan | null) {
    if (!plan || operation.current) return;
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
      if (slides.current.size !== plan.outline.pages.length + 1 || !extras.current) throw new Error("Some pages are missing. Retry to finish your book.");
      setPhase("saving");
      const book = await post<{ id: string; short_id: string | null; title: string }>("/api/books", { title: plan.outline.title, kind: "ai", document: { slides: assembleBook(slides.current, plan.outline.pages.length, extras.current) } });
      opening.current = true;
      window.location.assign(bookPath(book));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not finish your book."); setPhase("failed"); }
    finally { operation.current = false; void usage.reload(); }
  }

  return <main className="fs-content fs-creator">
    <header className="fs-creator-heading"><div><span className="fs-creator-kicker"><Sparkles size={14} /> AI CREATION STUDIO</span><h1>What will you create today?</h1><p>Choose a type, add your content, and make it your own.</p></div><Link href="/books" className="fs-btn fs-outline"><Library size={16} />My Books <ArrowRight size={15} /></Link></header>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className="fs-alert fs-creator-alert">{error}{/plan|allowance|AI actions/i.test(error) && <> <Link href="/billing">View your plan</Link></>}</div>}
    {generating ? <section className="fs-creator-generating" aria-live="polite">
      <div className="fs-generating-symbol"><BookOpen size={46} /><Sparkles size={23} /></div><span className="fs-creator-kicker">{phase === "failed" ? "YOUR PROGRESS IS KEPT ON THIS PAGE" : `CREATING YOUR ${selectedType.name.toUpperCase()}`}</span>
      <h2>{phase === "failed" ? "Let’s finish your creation" : phase === "saving" ? "Saving your new creation" : phase === "planning" ? "Planning your pages" : "Your pages are taking shape"}</h2><p>{plan?.outline.title}</p>
      <progress value={done} max={total} aria-label={`${done} of ${total} writing tasks ready`} /><div className="fs-generation-status"><span>{done} of {total} writing tasks ready</span><span>{selectedType.name} · {selectedFormat.name}</span></div>
      <ol><li>{phase === "planning" ? <LoaderCircle className="fs-spin" size={18} /> : <CheckCheck size={18} />}Planning sections and pages</li><li>{done < total ? <LoaderCircle className={phase !== "failed" ? "fs-spin" : ""} size={18} /> : <CheckCheck size={18} />}Writing and designing content</li><li>{phase === "saving" ? <LoaderCircle className="fs-spin" size={18} /> : <BookOpen size={18} />}Save and open the editor</li></ol>
      {phase === "failed" ? <><button className="fs-btn fs-primary" onClick={() => void generate(plan)}><RotateCcw size={16} />{done === total ? "Retry saving" : "Finish remaining pages"}</button><small>Completed batches stay here. Retrying a failed AI request may use additional actions.</small></> : <small>Keep this page open. You can edit every page once it is ready.</small>}
    </section> : <form onSubmit={create} className="fs-creator-form">
      <fieldset disabled={busy} className="fs-publication-fieldset"><legend><span className="fs-publication-title"><span className="fs-step-dot">1</span>Choose what to create</span><button type="button" className="fs-publication-motion" aria-pressed={previewsPaused} onClick={() => setPreviewsPaused(value => !value)}>{previewsPaused ? <Play size={12} /> : <Pause size={12} />}{previewsPaused ? "Play previews" : "Pause previews"}</button></legend>
        <div className="fs-publication-grid">{PUBLICATION_TYPES.map(item => {
          const Icon = TYPE_ICONS[item.id];
          const selected = publicationType === item.id;
          return <label key={item.id} className={`fs-publication-card fs-publication-${item.id}${selected ? " selected" : ""}`}>
            <input type="radio" name="publication-type" value={item.id} checked={selected} onChange={() => setPublicationType(item.id)} />
            <span className="fs-publication-art" aria-hidden="true">
              <span className="fs-publication-icon"><Icon size={17} /></span>
              <picture><source media="(prefers-reduced-motion: reduce)" srcSet={`/images/book-types/${item.id}.webp`} /><Image src={`/images/book-types/${item.id}.${previewsPaused ? "webp" : "gif"}`} alt="" width={400} height={250} unoptimized /></picture>
              <span className="fs-publication-check">{selected && <Check size={12} />}</span>
            </span>
            <span className="fs-publication-text"><strong>{item.name}<ArrowRight size={14} aria-hidden="true" /></strong><small>{item.description}</small></span>
          </label>;
        })}</div>
      </fieldset>
      <div className="fs-creator-workbench">
        <section className="fs-creator-panel fs-content-panel"><div className="fs-creator-panel-head"><div><h2><span className="fs-step-dot">2</span>{summary ? "Add the book you want to summarize" : "Add your content"}</h2><p>{summary ? "Use book excerpts, reading notes or a source document." : `Tell us about your ${selectedType.name.toLowerCase()}, or start with something you already have.`}</p></div><span className="fs-section-chip">{selectedType.name}</span></div>
          <fieldset className="fs-source-tabs" disabled={busy || importing}><legend className="fs-visually-hidden">Book source</legend>{([{ id: "description", label: summary ? "Paste text" : "Describe an idea", icon: FileText }, { id: "pdf", label: "Upload PDF", icon: FileUp }, { id: "url", label: "Paste a URL", icon: Link2 }] as const).map(tab => <label key={tab.id} className={source === tab.id ? "selected" : ""}><input type="radio" name="book-source" value={tab.id} checked={source === tab.id} onChange={() => changeSource(tab.id)} /><tab.icon size={16} />{tab.label}</label>)}</fieldset>
          {source === "description" ? <div className="fs-description-input"><label htmlFor="book-description">{summary ? "Book text or reading notes" : `What is your ${selectedType.name.toLowerCase()} about?`}</label><textarea id="book-description" required minLength={summary ? 80 : 3} maxLength={2000} rows={7} placeholder={summary ? "Paste an excerpt or your reading notes here. Include the book title and author if available. We'll turn the supplied material into key ideas and takeaways…" : selectedType.example} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} /><div className="fs-input-hint"><span>{summary ? "At least 80 characters. Summaries use only the material you provide." : "Include your topic, key ideas and who you are writing for."}</span><span>{description.length.toLocaleString()}/2,000</span></div>
            <div className="fs-prompt-examples"><Sparkles size={14} /><span>Need a starting point?</span><button type="button" disabled={busy} onClick={() => setDescription(selectedType.example)}>Use a {summary ? "sample excerpt" : `${selectedType.name.toLowerCase()} example`} <ArrowRight size={13} /></button></div>
          </div> : <>
            {source === "pdf" ? <div className={`fs-pdf-drop${dragging ? " dragging" : ""}`} onDragOver={event => { event.preventDefault(); if (!busy && !importing) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy && !importing && event.dataTransfer.files[0]) void importSource(event.dataTransfer.files[0]); }}>
              <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="fs-visually-hidden" aria-label="Choose a PDF" disabled={busy || importing} onChange={event => { const file = event.target.files?.[0]; if (file) void importSource(file); event.target.value = ""; }} />
              <span className="fs-upload-icon">{importing ? <LoaderCircle size={27} className="fs-spin" /> : <FileUp size={27} />}</span><strong>{importing ? "Reading your PDF…" : pdfSource ? "Your PDF is ready" : "Drag your PDF here"}</strong><p>{summary ? "Extract the key ideas from your book or document." : `Turn your document into a ${selectedType.name.toLowerCase()}.`}</p><button type="button" className="fs-btn fs-outline" disabled={busy || importing} onClick={() => fileInput.current?.click()}>{pdfSource ? "Replace PDF" : "Choose a file"}</button><small>Text-based PDF · Up to 10 MB · Maximum 100 pages</small>
            </div> : <div className="fs-url-input"><label htmlFor="book-url">Website or document URL</label><div><Globe2 size={18} /><input id="book-url" type="url" placeholder="https://example.com/your-article" value={url} disabled={busy || importing} onChange={event => { setUrl(event.target.value); setUrlSource(null); }} /><button type="button" className="fs-btn fs-primary" disabled={busy || importing || !url.trim()} onClick={() => void importSource()}>{importing ? <LoaderCircle className="fs-spin" size={15} /> : <ArrowDown size={15} />}{importing ? "Importing…" : "Import"}</button></div><small>Public articles, webpages and PDF links are supported.</small><div className="fs-url-explanation"><Link2 size={26} /><strong>Give your content a new chapter</strong><p>Import a page, check the extracted text, then turn it into your {selectedType.name.toLowerCase()}.</p></div></div>}
            {imported && <div className="fs-source-result"><div><CheckCheck size={19} /><span><strong>{imported.title}</strong><small>{imported.pages ? `${imported.pages} source pages · ` : ""}{imported.text.length.toLocaleString()} characters ready</small></span><button type="button" aria-label="Remove imported source" disabled={busy} onClick={() => source === "pdf" ? setPdfSource(null) : setUrlSource(null)}><X size={16} /></button></div>{imported.truncated && <p>Using the first {imported.text.length.toLocaleString()} of {imported.characters.toLocaleString()} characters.</p>}<details><summary>Preview imported text</summary><pre>{imported.text}</pre></details></div>}
            <label className="fs-source-instructions">Anything to focus on? <span>Optional</span><textarea rows={2} maxLength={1500} disabled={busy} placeholder="Key takeaways, a particular chapter, a specific audience…" value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
          </>}
          <div className="fs-audience-area"><button className="fs-advanced-toggle" type="button" aria-expanded={advanced} aria-controls="book-audience" disabled={busy} onClick={() => setAdvanced(value => !value)}><span className="fs-audience-label">Who is this for?</span><span>{audience || "Optional"}</span><ChevronDown size={15} className={advanced ? "expanded" : ""} /></button>{advanced && <label id="book-audience">Target audience<input maxLength={160} placeholder="e.g. First-time founders, students, curious readers" value={audience} onChange={event => setAudience(event.target.value)} /><small>Helps AI choose the right vocabulary and level of detail.</small></label>}</div>
          <div className="fs-content-reassurance"><CheckCheck size={16} />Fully editable. Make every page your own after generation.</div>
        </section>
        <aside className="fs-creator-panel fs-design-panel" aria-label="Design and writing options"><div className="fs-creator-panel-head"><h2><span className="fs-step-dot">3</span>Make it yours</h2></div>
          <fieldset disabled={busy} className="fs-format-fieldset"><legend>Page layout</legend><div className="fs-format-grid">{BOOK_FORMATS.map(item => <label key={item.id} className={`fs-format-card${format === item.id ? " selected" : ""}`}><input type="radio" name="book-format" value={item.id} checked={format === item.id} onChange={() => setFormat(item.id)} /><span className={`fs-format-shape fs-shape-${item.id}`} aria-hidden="true" /><strong>{item.name}</strong>{format === item.id && <Check size={12} />}</label>)}</div></fieldset>
          <button type="button" className="fs-preview-toggle" aria-expanded={showPreview} aria-controls="layout-preview" onClick={() => setShowPreview(value => !value)}><Eye size={14} />{showPreview ? "Hide layout preview" : "Preview this layout"}<ChevronDown size={13} className={showPreview ? "expanded" : ""} /></button>
          {showPreview && <div id="layout-preview" className="fs-format-preview"><picture><source media="(prefers-reduced-motion: reduce)" srcSet={`/images/book-layouts/${format}.webp`} /><Image src={`/images/book-layouts/${format}.gif`} alt={`${selectedFormat.name} layout example`} width={500} height={300} unoptimized /></picture><small>Layout example · Your content will be different</small></div>}
          <div className="fs-settings-divider" />
          <CreatorSelect label="Category" value={category} options={BOOK_CATEGORIES.map(value => ({ value, label: value }))} onChange={setCategory} disabled={busy} />
          <CreatorSelect label="Writing tone" value={tone} options={BOOK_TONES.map(value => ({ value, label: value, description: TONE_HINTS[value] }))} onChange={setTone} disabled={busy} />
          <div className="fs-length-control"><div className="fs-length-label"><label htmlFor="book-page-count">Content pages</label><span>1–50 pages</span></div><div className="fs-length-row"><span className="fs-creator-page-count"><button type="button" aria-label="Fewer pages" disabled={!validCount || count <= 1} onClick={() => setPages(String(count - 1))}><Minus size={15} /></button><input id="book-page-count" type="number" aria-label="Number of content pages" required min={1} max={BOOK_PAGE_LIMIT} value={pages} onChange={event => setPages(event.target.value)} /><button type="button" aria-label="More pages" disabled={!validCount || count >= BOOK_PAGE_LIMIT} onClick={() => setPages(String(count + 1))}><Plus size={15} /></button></span><div className="fs-page-presets">{[5, 10, 20].map(value => <button type="button" key={value} aria-pressed={count === value} onClick={() => setPages(String(value))}>{value}</button>)}</div></div><small>Plus a front cover, contents and back cover.</small></div>
          <div className="fs-design-note"><Sparkles size={16} /><span>{remaining === null ? "AI usage is checked when you create." : <><strong>{remaining.toLocaleString()}</strong> AI actions available today</>}</span></div>
        </aside>
      </div>
      <div className="fs-creator-submit"><div className="fs-submit-overview"><span className="fs-submit-icon"><BookOpen size={20} /></span><div><strong>{selectedType.name} <span>· {selectedFormat.name} · {validCount ? count : "—"} content pages</span></strong><small>{!ready ? (!validCount ? "Choose 1–50 content pages." : importing ? "Reading your source…" : source === "description" ? (summary ? "Paste at least 80 characters of book text or notes to continue." : "Add your idea above to get started.") : "Import a source above to get started.") : `${count + 1} AI actions · Opens in your editor when ready`}</small></div></div><button type="submit" className="fs-btn fs-primary" disabled={!ready || busy}><WandSparkles size={18} />Create {selectedType.name.toLowerCase()}<ArrowRight size={17} /></button></div>
    </form>}
  </main>;
}
