"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, ExternalLink, Eye, EyeOff, Globe, ImagePlus, Layers, LoaderCircle, Maximize2, Monitor, Palette, PanelTop, Plus, Redo2, Save, Settings2, SlidersHorizontal, Smartphone, Tablet, Trash2, Undo2, X } from "lucide-react";
import { defaultSalesPage, newSalesItem, parseSalesPage, salesPageId, SALES_SECTION_LABELS, type SalesItem, type SalesPage, type SalesPageSnapshot, type SalesSection, type SalesSectionType } from "@shared/salesPage";
import SalesPageView from "@site/components/SalesPageView";
import AdminLoading from "./AdminLoading";
import AdminConfirm from "./AdminConfirm";
import SalesSectionLibrary from "./SalesSectionLibrary";
import SalesEditorCanvas from "./SalesEditorCanvas";
import { applySalesDrop, applySalesText, type SalesDrag, type SalesDropTarget, type SalesEditTarget, type SalesViewEditor } from "@shared/salesPageEditing";

type History = { past: SalesPage[]; current: SalesPage; future: SalesPage[] };
type HistoryAction = { type: "edit" | "reset"; page: SalesPage } | { type: "undo" | "redo" };
function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === "reset") return { past: [], current: action.page, future: [] };
  if (action.type === "edit") return { past: [...state.past.slice(-49), state.current], current: action.page, future: [] };
  if (action.type === "undo" && state.past.length) return { past: state.past.slice(0, -1), current: state.past[state.past.length - 1], future: [state.current, ...state.future] };
  if (action.type === "redo" && state.future.length) return { past: [...state.past, state.current], current: state.future[0], future: state.future.slice(1) };
  return state;
}
const itemTypes: SalesSectionType[] = ["video", "benefits", "features", "pricing", "testimonials", "faq", "footer"];
const buttonTypes: SalesSectionType[] = ["offer", "hero", "cta", "button"];
const previewDocument = '<!doctype html><html><head><title>Sales page preview</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/sales-page.css"><style>html,body{margin:0;padding:0}body{overflow-x:hidden}</style></head><body><div id="preview-root"></div></body></html>';

function FullPreview({ page, onClose }: { page: SalesPage; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    const document = target?.ownerDocument;
    if (!document) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    const openLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (link && !link.getAttribute("href")?.startsWith("#")) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("click", openLink, true);
    return () => { document.removeEventListener("keydown", escape); document.removeEventListener("click", openLink, true); };
  }, [target, onClose]);
  return <dialog ref={dialog} className="spb-full-preview" aria-label="Full sales page preview" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="spb-full-preview-header"><button type="button" className="fs-btn fs-outline" onClick={onClose}><ArrowLeft size={16} />Back to editor</button><div><strong>Full preview</strong><span>Current draft · Links open in a new tab</span></div><button type="button" className="spb-icon-btn" aria-label="Close full preview" onClick={onClose}><X size={18} /></button></header>
    <iframe title="Sales page full preview" srcDoc={previewDocument} onLoad={event => setTarget(event.currentTarget.contentDocument?.getElementById("preview-root") || null)} />
    {target && createPortal(<SalesPageView page={page} />, target)}
  </dialog>;
}

export default function SalesPageBuilder() {
  const router = useRouter();
  const [history, dispatch] = useReducer(historyReducer, { past: [], current: defaultSalesPage(), future: [] });
  const page = history.current;
  const [snapshot, setSnapshot] = useState<SalesPageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const busy = saving || uploads > 0;
  const uploadPending = (pending: boolean) => setUploads(count => Math.max(0, count + (pending ? 1 : -1)));
  const [selected, setSelected] = useState("hero");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [panel, setPanel] = useState<"outline" | "inspector" | "add" | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const lastSection = useRef("hero");
  const [reveal, setReveal] = useState<{ id: string; nonce: number } | null>(null);
  const [fullPreview, setFullPreview] = useState(false);
  const [drag, setDrag] = useState<SalesDrag | null>(null);
  const [dragReady, setDragReady] = useState(false);
  const dragCurrent = useRef<SalesDrag | null>(null);
  const dragGhost = useRef<HTMLElement | null>(null);
  const [mediaFocus, setMediaFocus] = useState<SalesEditTarget | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "unpublish" | "delete" | "reload" | "back" | null>(null);
  const active = page.sections.find(section => section.id === selected);
  const dirty = snapshot !== null && JSON.stringify(snapshot.draft) !== JSON.stringify(page);
  const changed = dirty || snapshot?.publishedRevision !== snapshot?.revision;
  const sectionId = active?.id || page.sections.find(section => section.id === lastSection.current)?.id || page.sections[0]?.id;
  const closePanel = useCallback((restoreFocus = false) => {
    if (restoreFocus && panel) {
      const tool = panel === "inspector" ? selected === "page" ? "brand" : "inspector" : panel;
      workspace.current?.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`)?.focus({ preventScroll: true });
    }
    setPanel(null);
  }, [panel, selected]);
  function chooseSection(id: string) {
    setSelected(id);
    lastSection.current = id;
    setReveal(previous => ({ id, nonce: (previous?.nonce || 0) + 1 }));
    closePanel(true);
  }
  useEffect(() => { if (selected !== "page") lastSection.current = selected; }, [selected]);
  useEffect(() => {
    if (!panel) return;
    workspace.current?.querySelector<HTMLElement>(".spb-floating-panel:not([hidden])")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest(".spb-floating-panel, .spb-tool-rail button, dialog[open]")) setPanel(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) { event.preventDefault(); closePanel(true); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [panel, closePanel]);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/sales-page", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the sales page.");
      const draft = parseSalesPage(data.draft);
      setSnapshot({ ...data, draft }); dispatch({ type: "reset", page: draft }); setSelected(draft.sections.find((section: SalesSection) => section.type === "hero")?.id || "page");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the sales page."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = bodyOverflow; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const edit = (next: SalesPage) => { dispatch({ type: "edit", page: next }); setNote(""); };
  const editSection = (fields: Partial<SalesSection>) => { if (active) edit({ ...page, sections: page.sections.map(section => section.id === active.id ? { ...section, ...fields } : section) }); };
  function endDrag() { dragCurrent.current = null; dragGhost.current?.remove(); dragGhost.current = null; setDrag(null); setDragReady(false); }
  function startDrag(payload: SalesDrag, event: DragEvent) {
    if (busy || !event.dataTransfer) { event.preventDefault(); return; }
    event.stopPropagation();
    event.dataTransfer.setData("application/x-sales-page-block", "editor");
    event.dataTransfer.effectAllowed = payload.kind === "insert" ? "copy" : "move";
    const owner = (event.target as Element).ownerDocument;
    const ghost = owner.createElement("div");
    ghost.textContent = payload.kind === "insert" ? SALES_SECTION_LABELS[payload.section.type] : payload.kind === "item" ? "Move item" : "Move section";
    ghost.style.cssText = "position:fixed;left:-9999px;top:0;padding:12px 20px;background:#352a53;color:white;border:1px solid #a68ac7;border-radius:8px;font:14px Arial;width:220px";
    dragGhost.current?.remove(); dragGhost.current = ghost; owner.body.append(ghost); event.dataTransfer.setDragImage(ghost, 20, 20);
    dragCurrent.current = payload; setDragReady(false); setDrag(payload);
  }
  function dropAt(target: SalesDropTarget) {
    const payload = dragCurrent.current;
    if (!payload || busy) return;
    const next = applySalesDrop(page, payload, target);
    if (next !== page) {
      try { edit(parseSalesPage(next)); setError(""); } catch (error) { setError(error instanceof Error ? error.message : "Could not place this block."); endDrag(); return; }
      const id = payload.kind === "insert" ? payload.section.id : payload.kind === "section" ? payload.id : payload.sectionId;
      setSelected(id); setReveal(previous => ({ id, nonce: (previous?.nonce || 0) + 1 }));
    }
    setPanel(null); endDrag();
  }
  function duplicateSection(id: string) {
    const section = page.sections.find(section => section.id === id);
    if (!section || busy || page.sections.length >= 60) return;
    const copy = { ...section, id: salesPageId(), items: section.items.map(item => ({ ...item, id: salesPageId() })) };
    const next = applySalesDrop(page, { kind: "insert", section: copy }, { sectionId: id, after: true });
    edit(next); setSelected(copy.id);
  }
  const viewEditor: SalesViewEditor = {
    disabled: busy,
    onText: (target, value) => { const next = applySalesText(page, target, value); if (next !== page) edit(next); },
    onMedia: target => { if (!busy) { setSelected(target.sectionId); setMediaFocus({ ...target }); setPanel("inspector"); } },
    onSettings: id => { setSelected(id); setPanel("inspector"); },
    onMove: move, onDuplicate: duplicateSection,
    onDelete: id => { setSelected(id); setConfirm("delete"); }, onDrag: startDrag, onDragEnd: endDrag, onDragReady: () => setDragReady(true),
  };
  useEffect(() => {
    if (!mediaFocus || panel !== "inspector") return;
    const details = [...(workspace.current?.querySelectorAll<HTMLDetailsElement>("[data-sales-item]") || [])].find(element => element.dataset.salesItem === mediaFocus.itemId);
    if (details) details.open = true;
    const key = mediaFocus.itemId ? `${mediaFocus.field}:${mediaFocus.itemId}` : mediaFocus.field;
    const field = [...(workspace.current?.querySelectorAll<HTMLElement>("[data-media-field]") || [])].find(element => element.dataset.mediaField === key);
    field?.scrollIntoView({ block: "nearest" }); field?.querySelector<HTMLInputElement>("input:not([type=file])")?.focus({ preventScroll: true });
  }, [mediaFocus, panel, selected]);
  useEffect(() => {
    if (!drag) return;
    // Wait for movement of a captured native drag before fading its source panel.
    const ready = () => setDragReady(true);
    const cancel = () => { dragCurrent.current = null; dragGhost.current?.remove(); dragGhost.current = null; setDrag(null); setDragReady(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    document.addEventListener("dragend", cancel); document.addEventListener("keydown", escape);
    document.addEventListener("dragover", ready);
    return () => { dragGhost.current?.remove(); document.removeEventListener("dragend", cancel); document.removeEventListener("keydown", escape); document.removeEventListener("dragover", ready); };
  }, [drag]);
  function move(id: string, direction: number) {
    const section = page.sections.find(section => section.id === id);
    if (!section) return;
    const rank = (section: SalesSection) => section.type === "offer" ? 0 : section.type === "footer" ? 2 : 1;
    const bucket = page.sections.filter(current => rank(current) === rank(section));
    const target = bucket[bucket.findIndex(current => current.id === id) + direction];
    if (!target) return;
    const next = applySalesDrop(page, { kind: "section", id }, { sectionId: target.id, after: direction > 0 });
    if (next !== page) edit(next);
  }
  async function save(action: "save" | "publish" | "unpublish") {
    if (!snapshot) throw new Error("Load the saved page before continuing.");
    setBusy(true); setError(""); setNote("");
    try {
      const document = action === "unpublish" ? null : parseSalesPage(page);
      const response = await fetch("/api/admin/sales-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, revision: snapshot.revision, document }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the page.");
      setSnapshot(data);
      if (action !== "unpublish") dispatch({ type: "reset", page: data.draft });
      setNote(action === "publish" ? "Published. Your sales page is now live on the homepage." : action === "unpublish" ? "Unpublished. The original landing page is live again." : "Draft saved. The live homepage has not changed.");
    } finally { setBusy(false); }
  }
  const controlsDisabled = busy || loading || !snapshot;
  return <div className={`spb spb-expanded${drag ? " spb-dragging" : ""}${drag && dragReady ? " spb-drag-ready" : ""}`}>
    <div className="spb-toolbar">
      <div className="spb-toolbar-heading"><button className="fs-btn fs-outline spb-back" disabled={busy} onClick={() => dirty ? setConfirm("back") : router.push("/admin")}><ArrowLeft size={17} />Back to Admin</button><div className="spb-editor-title"><h1>Sales Page Builder</h1><div className="spb-status"><span className={snapshot?.publishedAt ? "live" : ""} />{loading ? "Loading editor..." : !snapshot ? "Unable to load" : snapshot.publishedAt ? "Live homepage" : "Draft"}<small>{dirty ? "Unsaved changes" : snapshot?.publishedAt && changed ? "Draft has unpublished changes" : snapshot?.updatedAt ? `Saved ${new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : snapshot ? "Starter template" : ""}</small></div></div></div>
      <div className="spb-toolbar-actions"><button className="spb-icon-btn" aria-label="Undo" title="Undo" disabled={controlsDisabled || !history.past.length} onClick={() => dispatch({ type: "undo" })}><Undo2 size={17} /></button><button className="spb-icon-btn" aria-label="Redo" title="Redo" disabled={controlsDisabled || !history.future.length} onClick={() => dispatch({ type: "redo" })}><Redo2 size={17} /></button><button className="fs-btn fs-outline fs-btn-sm" disabled={controlsDisabled} onClick={() => setConfirm("reload")}>Reload draft</button><button className="fs-btn fs-outline fs-btn-sm spb-full-preview-button" disabled={loading || !snapshot} onClick={() => setFullPreview(true)}><Maximize2 size={15} />Full preview</button><button className="fs-btn fs-outline fs-btn-sm" disabled={controlsDisabled} onClick={() => void save("save").catch(e => setError(e.message))}>{busy ? <LoaderCircle className="fs-spin" size={15} /> : <Save size={15} />}Save draft</button><button className="fs-btn fs-primary fs-btn-sm" disabled={controlsDisabled} onClick={() => setConfirm("publish")}><Globe size={15} />Publish</button></div>
    </div>
    {loading ? <div className="spb-loading"><AdminLoading label="Loading sales page builder..." /></div> : !snapshot ? <section className="fs-settings-card"><p className="fs-alert" role="alert">{error}</p><button className="fs-btn fs-outline" onClick={() => void load()}>Try again</button></section> : <>
    {error && <p className="fs-alert" role="alert">{error}</p>}{note && <p className="fs-note" role="status"><Check size={15} />{note}</p>}
    <div ref={workspace} className="spb-workspace">
      <nav className="spb-tool-rail" aria-label="Page editor tools">
        <button data-tool="add" aria-label="Add section" aria-expanded={panel === "add"} aria-controls="spb-blocks" disabled={busy || page.sections.length >= 60} className={panel === "add" ? "on" : ""} onClick={() => panel === "add" ? closePanel(true) : setPanel("add")}><PanelTop size={21} /><small className="spb-tool-caption">Sections</small><span className="spb-tool-tip">Designer sections</span></button>
        <span className="spb-rail-divider" />
        <button data-tool="outline" aria-label="Page sections" aria-expanded={panel === "outline"} aria-controls="spb-sections" className={panel === "outline" ? "on" : ""} onClick={() => panel === "outline" ? closePanel(true) : setPanel("outline")}><Layers size={20} /><small className="spb-tool-caption">Layers</small><span className="spb-tool-tip">Page sections</span></button>
        <button data-tool="inspector" aria-label="Section settings" aria-expanded={panel === "inspector" && selected !== "page"} aria-controls="spb-inspector" disabled={busy || !sectionId} className={panel === "inspector" && selected !== "page" ? "on" : ""} onClick={() => { if (panel === "inspector" && selected !== "page") closePanel(true); else if (sectionId) { setSelected(sectionId); setPanel("inspector"); } }}><SlidersHorizontal size={20} /><small className="spb-tool-caption">Settings</small><span className="spb-tool-tip">Section settings</span></button>
        <button data-tool="brand" disabled={busy} aria-label="Brand & page settings" aria-expanded={panel === "inspector" && selected === "page"} aria-controls="spb-inspector" className={panel === "inspector" && selected === "page" ? "on" : ""} onClick={() => { if (panel === "inspector" && selected === "page") closePanel(true); else { setSelected("page"); setPanel("inspector"); } }}><Palette size={20} /><small className="spb-tool-caption">Style</small><span className="spb-tool-tip">Brand & page settings</span></button>
      </nav>
      <aside id="spb-sections" className="spb-outline spb-floating-panel" role="dialog" aria-label="Page sections" tabIndex={-1} hidden={panel !== "outline"}><div className="spb-panel-title"><Layers size={16} /><strong>Page sections</strong><span>{page.sections.length}</span><button className="spb-panel-close" aria-label="Close sections panel" onClick={() => closePanel(true)}><X size={16} /></button></div><p className="spb-floating-intro">Select a section to find it on your page.</p><div className="spb-section-list">
        {page.sections.map((section, index) => <div key={section.id} className={`spb-outline-row${selected === section.id ? " selected" : ""}${!section.enabled ? " hidden" : ""}`}><button className="spb-section-select" draggable={!busy} onDragStart={event => startDrag({ kind: "section", id: section.id }, event.nativeEvent)} onDragEnd={endDrag} disabled={busy} onClick={() => chooseSection(section.id)}><small>{String(index + 1).padStart(2, "0")}</small><span><strong>{SALES_SECTION_LABELS[section.type]}</strong><small>{section.title || "Untitled section"}</small></span>{!section.enabled && <EyeOff size={13} />}</button>{selected === section.id && <div className="spb-section-tools"><button title="Move up" aria-label="Move section up" disabled={busy || index === 0} onClick={() => move(section.id, -1)}><ArrowUp size={14} /></button><button title="Move down" aria-label="Move section down" disabled={busy || index === page.sections.length - 1} onClick={() => move(section.id, 1)}><ArrowDown size={14} /></button><button title={section.enabled ? "Hide section" : "Show section"} aria-label={section.enabled ? "Hide section" : "Show section"} disabled={busy} onClick={() => editSection({ enabled: !section.enabled })}>{section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}</button><button title="Duplicate section" aria-label="Duplicate section" disabled={busy || page.sections.length >= 60} onClick={() => { const id = salesPageId(); const copy = { ...section, id, items: section.items.map(item => ({ ...item, id: salesPageId() })) }; const sections = [...page.sections]; sections.splice(index + 1, 0, copy); edit({ ...page, sections }); setSelected(id); }}><Copy size={14} /></button><button title="Delete section" aria-label="Delete section" disabled={busy} onClick={() => setConfirm("delete")}><Trash2 size={14} /></button></div>}</div>)}
      </div><p className="spb-hint">Use section settings to edit your selection.</p></aside>
      <div className="spb-preview"><div className="spb-preview-toolbar"><div className="spb-preview-label"><span><Eye size={15} />Live preview</span></div><div>{([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([name, Icon]) => <button key={name} aria-label={`${name} preview`} aria-pressed={device === name} className={device === name ? "on" : ""} onClick={() => setDevice(name)}><Icon size={16} /></button>)}</div></div><div className="spb-preview-stage"><SalesEditorCanvas page={page} drag={drag} editor={viewEditor} onDrop={dropAt} device={device} selectedId={selected} reveal={reveal} onDismiss={closePanel} onSelect={(id, edit = false) => { if (!busy) { setSelected(id); setPanel(edit ? "inspector" : null); } }} /></div><div className="spb-preview-note">Drag blocks into the page. Double-click text to edit it. Use image controls to replace images.</div></div>
      <aside id="spb-inspector" className="spb-inspector spb-floating-panel" role="dialog" aria-label={active ? `${SALES_SECTION_LABELS[active.type]} settings` : "Brand & page settings"} tabIndex={-1} hidden={panel !== "inspector"}><div className="spb-panel-title"><Settings2 size={16} /><strong>{active ? SALES_SECTION_LABELS[active.type] : "Page settings"}</strong><button className="spb-panel-close" aria-label="Close settings panel" onClick={() => closePanel(true)}><X size={16} /></button></div><fieldset disabled={busy} className="spb-fields">
        {active ? <SectionFields key={active.id} section={active} update={editSection} uploadPending={uploadPending} /> : <>
          <Field label="Page title" value={page.title} max={160} onChange={title => edit({ ...page, title })} /><Field label="Meta description" value={page.description} max={400} multiline onChange={description => edit({ ...page, description })} /><Field label="Brand name" value={page.brand} max={100} onChange={brand => edit({ ...page, brand })} /><MediaField fieldId="logo" label="Logo" value={page.logo} onChange={logo => edit({ ...page, logo })} uploadPending={uploadPending} /><Field label="Navigation button" value={page.navLabel} max={100} onChange={navLabel => edit({ ...page, navLabel })} /><Field label="Navigation button URL" value={page.navUrl} onChange={navUrl => edit({ ...page, navUrl })} />
          <div className="spb-color-grid">{([['primary','Primary'],['accent','Highlight'],['ink','Text & dark'],['background','Background']] as const).map(([key,label]) => <label key={key}>{label}<input type="color" value={page.theme[key]} onChange={event => edit({ ...page, theme: { ...page.theme, [key]: event.target.value } })} /></label>)}</div><label>Heading font<select value={page.theme.font} onChange={event => edit({ ...page, theme: { ...page.theme, font: event.target.value as "serif" | "sans" } })}><option value="serif">Classic serif</option><option value="sans">Modern sans</option></select></label>
          <div className="spb-publish-info"><strong>Homepage publishing</strong><p>Save draft keeps changes private. Publish replaces the public homepage. Unpublish restores the original landing page.</p><a href="/" target="_blank" rel="noopener noreferrer">View live homepage<ExternalLink size={13} /></a>{snapshot.publishedAt && <button type="button" disabled={busy} onClick={() => setConfirm("unpublish")}>Unpublish sales page</button>}</div>
        </>}
      </fieldset></aside>
      <aside id="spb-blocks" className="spb-floating-panel spb-designer-panel" role="dialog" aria-label="Designer Sections" tabIndex={-1} hidden={panel !== "add"}><div className="spb-panel-title"><strong>Designer Sections</strong><button className="spb-panel-close" aria-label="Close section picker" onClick={() => closePanel(true)}><X size={19} /></button></div><SalesSectionLibrary page={page} open={panel === "add"} disabled={busy || page.sections.length >= 60} onDrag={(section, event) => startDrag({ kind: "insert", section }, event)} onDragEnd={endDrag} onAdd={section => { edit(applySalesDrop(page, { kind: "insert", section }, { after: true })); chooseSection(section.id); }} /></aside>
    </div>
    {fullPreview && <FullPreview page={page} onClose={() => setFullPreview(false)} />}
    </>}
    {confirm && <AdminConfirm title={confirm === "back" ? "Leave the editor?" : confirm === "publish" ? "Publish this sales page?" : confirm === "unpublish" ? "Restore the original homepage?" : confirm === "delete" ? "Remove this section?" : "Reload the saved draft?"} message={confirm === "back" ? "You have unsaved changes. Save your draft before leaving, or leave without saving these changes." : confirm === "publish" ? "The current editor content will be saved and shown publicly on your homepage." : confirm === "unpublish" ? "Your sales page draft will stay saved. Visitors will see the original landing page again." : confirm === "delete" ? "This section will be removed from the draft. You can undo this change before saving." : "Unsaved changes will be replaced with the latest draft from the database."} label={confirm === "back" ? "Leave without saving" : confirm === "publish" ? "Publish page" : confirm === "unpublish" ? "Unpublish" : confirm === "delete" ? "Remove section" : "Reload draft"} danger={confirm === "back" || confirm === "delete" || confirm === "unpublish"} onCancel={() => setConfirm(null)} onConfirm={async () => { if (confirm === "back") router.push("/admin"); else if (confirm === "delete") { edit({ ...page, sections: page.sections.filter(section => section.id !== selected) }); setSelected("page"); } else if (confirm === "reload") await load(); else await save(confirm); setConfirm(null); }} />}
  </div>;
}

function Field({ label, value, onChange, multiline = false, max = 2048 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; max?: number }) {
  return <label>{label}{multiline ? <textarea value={value} rows={4} maxLength={max} onChange={event => onChange(event.target.value)} /> : <input value={value} maxLength={max} onChange={event => onChange(event.target.value)} />}</label>;
}
function MediaField({ label, value, onChange, uploadPending, fieldId }: { fieldId?: string; label: string; value: string; onChange: (value: string) => void; uploadPending: (pending: boolean) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const input = useRef<HTMLInputElement>(null);
  return <div className="spb-media-field" data-media-field={fieldId}><Field label={`${label} URL`} value={value} onChange={onChange} /><button type="button" className="spb-upload" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="fs-spin" size={14} /> : <ImagePlus size={14} />}{busy ? "Uploading..." : "Upload image"}</button><input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={async event => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setError(""); if (file.size > 7.9 * 1024 * 1024) { setError("Choose an image smaller than 8 MB."); return; }
    setBusy(true); uploadPending(true); try { const form = new FormData(); form.append("image", file); const response = await fetch("/api/admin/sales-page/media", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed."); onChange(data.url); } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); } finally { setBusy(false); uploadPending(false); }
  }} />{error && <small role="alert">{error}</small>}</div>;
}
function SectionFields({ section, update, uploadPending }: { section: SalesSection; update: (fields: Partial<SalesSection>) => void; uploadPending: (pending: boolean) => void }) {
  const updateItem = (id: string, fields: Partial<SalesItem>) => update({ items: section.items.map(item => item.id === id ? { ...item, ...fields } : item) });
  return <>
    <label className="spb-toggle"><input type="checkbox" checked={section.enabled} onChange={event => update({ enabled: event.target.checked })} />Show this section</label>
    {!["image", "button"].includes(section.type) && <><Field label={section.type === "hero" ? "Main headline" : "Heading"} value={section.title} max={500} onChange={title => update({ title })} /><Field label={section.type === "hero" ? "Highlighted text" : "Subheading"} value={section.subtitle} max={500} onChange={subtitle => update({ subtitle })} /></>}{section.type !== "button" && <Field label={section.type === "image" ? "Caption" : "Description"} value={section.body} max={6000} multiline onChange={body => update({ body })} />}
    <label>Background<select value={section.background} onChange={event => update({ background: event.target.value as SalesSection["background"] })}><option value="plain">Plain</option><option value="tint">Soft tint</option><option value="dark">Dark</option></select></label>
    {buttonTypes.includes(section.type) && <><Field label="Button text" value={section.buttonLabel} max={100} onChange={buttonLabel => update({ buttonLabel })} /><Field label="Button URL" value={section.buttonUrl} onChange={buttonUrl => update({ buttonUrl })} /></>}
    {["hero", "video", "cta", "image"].includes(section.type) && <><MediaField fieldId="image" key={section.id} label={section.type === "video" ? "Video poster" : "Image"} value={section.image} onChange={image => update({ image })} uploadPending={uploadPending} /><Field label="Image description (alt text)" value={section.imageAlt} max={300} onChange={imageAlt => update({ imageAlt })} /></>}
    {section.type === "offer" && <label>Countdown end time<input type="datetime-local" value={section.endAt ? (() => { const date = new Date(section.endAt); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); })() : ""} onChange={event => update({ endAt: event.target.value ? new Date(event.target.value).toISOString() : "" })} /><small>Uses your local timezone. Leave empty to hide the timer.</small></label>}
    {section.type === "video" && <><Field label="Video URL" value={section.video} onChange={video => update({ video })} /><p className="spb-hint">YouTube, Vimeo or a direct MP4/WebM/OGG link.</p></>}
    {itemTypes.includes(section.type) && <div className="spb-items"><div className="spb-items-heading"><strong>{section.type === "faq" ? "Questions" : section.type === "footer" ? "Links" : "Items"}</strong><span>{section.items.length}</span></div>{section.items.map((item, index) => <details key={item.id} data-sales-item={item.id} className="spb-item"><summary>{index + 1}. {item.title || "Untitled item"}</summary><div><Field label={section.type === "faq" ? "Question" : section.type === "testimonials" ? "Customer name" : "Title"} value={item.title} max={300} onChange={title => updateItem(item.id, { title })} />{section.type !== "footer" && <Field label={section.type === "faq" ? "Answer" : section.type === "testimonials" ? "Quote" : "Description"} value={item.text} max={4000} multiline onChange={text => updateItem(item.id, { text })} />}{["features", "testimonials"].includes(section.type) && <MediaField fieldId={`image:${item.id}`} label="Item image" value={item.image} onChange={image => updateItem(item.id, { image })} uploadPending={uploadPending} />}{section.type === "pricing" && <><Field label="Price display" value={item.price} max={100} onChange={price => updateItem(item.id, { price })} /><Field label="Button text" value={item.label} max={100} onChange={label => updateItem(item.id, { label })} /></>}{["pricing", "footer"].includes(section.type) && <Field label="Link URL" value={item.link} onChange={link => updateItem(item.id, { link })} />}<div className="spb-item-actions"><button type="button" aria-label="Move item up" disabled={!index} onClick={() => { const items = [...section.items]; [items[index - 1], items[index]] = [items[index], items[index - 1]]; update({ items }); }}><ArrowUp size={14} /></button><button type="button" aria-label="Move item down" disabled={index === section.items.length - 1} onClick={() => { const items = [...section.items]; [items[index + 1], items[index]] = [items[index], items[index + 1]]; update({ items }); }}><ArrowDown size={14} /></button><button type="button" onClick={() => update({ items: section.items.filter(entry => entry.id !== item.id) })}><Trash2 size={13} />Remove item</button></div></div></details>)}<button type="button" className="spb-upload" disabled={section.items.length >= 50} onClick={() => update({ items: [...section.items, newSalesItem(salesPageId())] })}><Plus size={14} />Add item</button></div>}
  </>;
}
