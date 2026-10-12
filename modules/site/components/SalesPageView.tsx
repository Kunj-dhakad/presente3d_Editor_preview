"use client";
/* eslint-disable @next/next/no-img-element -- Sales page media includes external URLs and uploaded images. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-css-tags -- This renderer also runs in isolated preview documents. */
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type KeyboardEvent, type ClipboardEvent, type ElementType } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, CheckCircle2, Copy, GripVertical, ImagePlus, Pencil, Play, Quote, Settings2, Trash2 } from "lucide-react";
import { isSalesUrl, salesVideoSource, type SalesPage, type SalesSection } from "@shared/salesPage";
import type { SalesEditTarget, SalesViewEditor } from "@shared/salesPageEditing";

function Countdown({ endAt }: { endAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.floor((Date.parse(endAt) - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [endAt]);
  if (remaining === 0) return <span className="sp-expired">Offer ended</span>;
  const values = remaining == null ? ["--", "--", "--", "--"] : [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60].map(value => String(value).padStart(2, "0"));
  return <div className="sp-countdown" role="timer" aria-label="Offer countdown">{values.map((value, index) => <div key={index}><strong>{value}</strong><small>{["Days", "Hours", "Minutes", "Seconds"][index]}</small></div>)}</div>;
}

function Text({ as = "span", value, target, editor, className, multiline = false, placeholder = "Add text" }: { as?: string; value: string; target: SalesEditTarget; editor?: SalesViewEditor; className?: string; multiline?: boolean; placeholder?: string }) {
  const element = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);
  const Tag = as as ElementType;
  useEffect(() => {
    if (!editing || !element.current) return;
    element.current.textContent = value;
    element.current.focus();
    element.current.ownerDocument.getSelection()?.selectAllChildren(element.current);
  }, [editing, value]);
  return <Tag ref={element} className={className} contentEditable={editor ? editing : undefined} suppressContentEditableWarning
    data-sp-text={editor ? target.field : undefined} data-sp-item-field={editor ? target.itemId : undefined}
    data-sp-placeholder={editor && !value ? true : undefined} role={editing ? "textbox" : undefined}
    aria-label={editing ? `Edit ${target.field}` : undefined} aria-multiline={editing ? multiline : undefined}
    onDoubleClick={editor ? (event: MouseEvent<HTMLElement>) => { if (editor.disabled) return; event.preventDefault(); event.stopPropagation(); setEditing(true); } : undefined}
    onBlur={() => { if (!editing) return; const text = element.current?.innerText || ""; setEditing(false); editor?.onText(target, multiline ? text : text.replace(/\n/g, " ")); }}
    onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
      if (!editing) return;
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); if (element.current) element.current.textContent = value; element.current?.blur(); }
      else if (event.key === "Enter" && (!multiline || event.ctrlKey || event.metaKey)) { event.preventDefault(); element.current?.blur(); }
    }}
    onPaste={(event: ClipboardEvent<HTMLElement>) => {
      if (!editing) return;
      event.preventDefault();
      const selection = element.current?.ownerDocument.getSelection();
      if (!selection?.rangeCount || !element.current) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = element.current.ownerDocument.createTextNode(event.clipboardData.getData("text/plain"));
      range.insertNode(node); range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
    }}
  >{editing ? undefined : value || (editor ? placeholder : "")}</Tag>;
}

function Image({ src, alt, className = "", editor, target }: { src: string; alt: string; className?: string; editor?: SalesViewEditor; target?: SalesEditTarget }) {
  if (!src || !isSalesUrl(src, true)) return editor && target ? <button type="button" className="sp-editor-image-empty" disabled={editor.disabled} onClick={event => { event.stopPropagation(); editor.onMedia(target); }}><ImagePlus size={25} /><span>Add image</span></button> : null;
  const image = <img src={src} alt={alt} className={className} loading="lazy" onDoubleClick={editor && target ? event => { event.preventDefault(); event.stopPropagation(); editor.onMedia(target); } : undefined} />;
  return editor && target ? <div className="sp-editor-image">{image}<button type="button" aria-label="Edit image" disabled={editor.disabled} onClick={event => { event.stopPropagation(); editor.onMedia(target); }}><Pencil size={15} />Replace image</button></div> : image;
}

function Button({ section, editor }: { section: SalesSection; editor?: SalesViewEditor }) {
  return section.buttonLabel && section.buttonUrl && isSalesUrl(section.buttonUrl) ? <a className="sp-button" href={section.buttonUrl}><Text value={section.buttonLabel} target={{ sectionId: section.id, field: "buttonLabel" }} editor={editor} /><ArrowRight size={20} /></a> : null;
}

function ItemHandle({ sectionId, id, editor }: { sectionId: string; id: string; editor?: SalesViewEditor }) {
  return editor ? <button type="button" className="sp-editor-item-handle" aria-label="Drag item" title="Drag to reorder items in this section" draggable={!editor.disabled} disabled={editor.disabled} onClick={event => event.stopPropagation()} onDragStart={event => editor.onDrag({ kind: "item", sectionId, id }, event.nativeEvent)} onDragEnd={editor.onDragEnd}><GripVertical size={17} /></button> : null;
}

function Section({ section, preview = false, editor }: { section: SalesSection; preview?: boolean; editor?: SalesViewEditor }) {
  const text = (field: "title" | "subtitle" | "body", as: string, className?: string) => <Text as={as} value={section[field]} target={{ sectionId: section.id, field }} editor={editor} className={className} multiline={field === "body"} />;
  const itemText = (id: string, field: string, value: string, as = "span", className?: string) => <Text as={as} value={value} target={{ sectionId: section.id, itemId: id, field }} editor={editor} className={className} multiline={field === "text"} />;
  const image = (className = "") => <Image src={section.image} alt={section.imageAlt} className={className} editor={editor} target={{ sectionId: section.id, field: "image" }} />;
  const heading = <>{(section.title || editor) && text("title", "h2")}{section.subtitle && text("subtitle", "p", "sp-subtitle")}{section.body && text("body", "p", "sp-copy")}</>;
  const benefits = (wide = false) => <div className={`sp-benefits${wide ? " sp-benefits-wide" : ""}`}>{section.items.map(item => <div key={item.id} data-sp-item={item.id}><ItemHandle sectionId={section.id} id={item.id} editor={editor} /><CheckCircle2 size={24} /><p>{itemText(item.id, "title", item.title, "strong")}{item.text && itemText(item.id, "text", item.text)}</p></div>)}</div>;
  switch (section.type) {
    case "offer": return <div className="sp-offer"><div>{text("title", "strong")}{section.body && text("body", "span")}</div>{section.endAt && <Countdown endAt={section.endAt} />}<Button section={section} editor={editor} /></div>;
    case "hero": return <div className="sp-hero">{(section.title || editor) && text("title", "h1")}{section.subtitle && text("subtitle", "div", "sp-highlight")}{section.body && text("body", "p", "sp-hero-description")}<Button section={section} editor={editor} />{image("sp-hero-image")}</div>;
    case "video": {
      const video = salesVideoSource(section.video);
      return <><div className="sp-section-heading">{heading}</div><div className={`sp-video-layout${!video && !section.image && !preview ? " sp-video-no-media" : ""}`}><div className="sp-video-frame" hidden={!video && !section.image && !preview}>{video?.type === "embed" ? <iframe src={video.url} title={section.title || "Product walkthrough"} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : video ? <video src={video.url} poster={section.image || undefined} controls preload="metadata" /> : section.image ? image() : <div className="sp-video-placeholder"><Play size={48} /><span>Your product walkthrough</span>{editor && <button type="button" className="sp-editor-media-button" onClick={event => { event.stopPropagation(); editor.onSettings(section.id); }}>Set video & poster</button>}</div>}</div>{benefits()}</div></>;
    }
    case "benefits": return <><div className="sp-section-heading">{heading}</div>{benefits(true)}</>;
    case "features": return <><div className="sp-section-heading">{heading}</div><div className="sp-card-grid">{section.items.map(item => <article className="sp-card" key={item.id} data-sp-item={item.id}><ItemHandle sectionId={section.id} id={item.id} editor={editor} />{item.image || editor ? <Image src={item.image} alt={item.title} editor={editor} target={{ sectionId: section.id, itemId: item.id, field: "image" }} /> : <BookOpen className="sp-card-icon" />}{itemText(item.id, "title", item.title, "h3")}{itemText(item.id, "text", item.text, "p")}</article>)}</div></>;
    case "cta": return <div className="sp-cta">{heading}<Button section={section} editor={editor} />{(section.image || editor) && image("sp-cta-image")}</div>;
    case "pricing": return <><div className="sp-section-heading">{heading}</div><div className="sp-card-grid">{section.items.map(item => <article className="sp-card sp-pricing" key={item.id} data-sp-item={item.id}><ItemHandle sectionId={section.id} id={item.id} editor={editor} />{itemText(item.id, "title", item.title, "h3")}{itemText(item.id, "price", item.price, "strong", "sp-price")}{itemText(item.id, "text", item.text, "p")}{item.link && isSalesUrl(item.link) && <a className="sp-button" href={item.link}>{itemText(item.id, "label", item.label || "Get started")}<ArrowRight size={18} /></a>}</article>)}</div></>;
    case "testimonials": return <><div className="sp-section-heading">{heading}</div><div className="sp-card-grid">{section.items.map(item => <article className="sp-card sp-testimonial" key={item.id} data-sp-item={item.id}><ItemHandle sectionId={section.id} id={item.id} editor={editor} /><Quote size={28} />{itemText(item.id, "text", item.text, "p")}<div><Image src={item.image} alt={item.title} editor={editor} target={{ sectionId: section.id, itemId: item.id, field: "image" }} />{itemText(item.id, "title", item.title, "strong")}</div></article>)}</div></>;
    case "faq": return <><div className="sp-section-heading">{heading}</div><div className="sp-faq">{section.items.map(item => <details key={item.id} data-sp-item={item.id}><summary><ItemHandle sectionId={section.id} id={item.id} editor={editor} />{itemText(item.id, "title", item.title)}</summary>{itemText(item.id, "text", item.text, "p")}</details>)}</div></>;
    case "footer": return <footer className="sp-footer"><div>{text("title", "strong")}{text("body", "p")}</div><nav aria-label="Footer">{section.items.map(item => item.link && isSalesUrl(item.link) ? <span key={item.id} data-sp-item={item.id}><ItemHandle sectionId={section.id} id={item.id} editor={editor} /><a href={item.link}>{itemText(item.id, "title", item.title)}</a></span> : null)}</nav></footer>;
    case "text": return <div className="sp-text-block">{heading}</div>;
    case "image": return <div className="sp-image-block">{image()}{section.body && text("body", "p", "sp-copy")}</div>;
    case "button": return <div className="sp-button-block"><Button section={section} editor={editor} /></div>;
  }
}

function SectionTools({ id, editor }: { id: string; editor: SalesViewEditor }) {
  return <div className="sp-editor-section-tools" onClick={event => event.stopPropagation()}>
    <button type="button" aria-label="Drag section" title="Drag section" draggable={!editor.disabled} disabled={editor.disabled} onDragStart={event => editor.onDrag({ kind: "section", id }, event.nativeEvent)} onDragEnd={editor.onDragEnd}><GripVertical size={17} /></button>
    <button type="button" aria-label="Edit section settings" disabled={editor.disabled} onClick={() => editor.onSettings(id)}><Settings2 size={16} /></button>
    <button type="button" aria-label="Move section up" disabled={editor.disabled} onClick={() => editor.onMove(id, -1)}><ArrowUp size={16} /></button>
    <button type="button" aria-label="Move section down" disabled={editor.disabled} onClick={() => editor.onMove(id, 1)}><ArrowDown size={16} /></button>
    <button type="button" aria-label="Duplicate section" disabled={editor.disabled} onClick={() => editor.onDuplicate(id)}><Copy size={16} /></button>
    <button type="button" aria-label="Delete section" disabled={editor.disabled} onClick={() => editor.onDelete(id)}><Trash2 size={16} /></button>
  </div>;
}

export default function SalesPageView({ page, preview = false, selectedId, onSelect, editor }: { page: SalesPage; preview?: boolean; selectedId?: string; onSelect?: (id: string) => void; editor?: SalesViewEditor }) {
  const style = { "--sp-primary": page.theme.primary, "--sp-accent": page.theme.accent, "--sp-ink": page.theme.ink, "--sp-background": page.theme.background, "--sp-heading": page.theme.font === "serif" ? "Georgia, 'Times New Roman', serif" : "Arial, sans-serif" } as CSSProperties;
  const sections = page.sections.filter(section => section.enabled);
  const tools = (id: string) => editor && selectedId === id ? <SectionTools id={id} editor={editor} /> : null;
  return <div className="sales-page" style={style} data-preview={preview || undefined} onClickCapture={preview ? event => {
    const target = event.target as HTMLElement;
    if (target.closest("a")) event.preventDefault();
    if (target.closest(".sp-editor-section-tools, .sp-editor-item-handle, .sp-editor-image button, .sp-editor-image-empty, .sp-editor-media-button, [contenteditable=true]")) return;
    const section = target.closest<HTMLElement>("[data-sp-section]");
    if (section?.dataset.spSection) onSelect?.(section.dataset.spSection);
    else if (target.closest(".sp-header")) onSelect?.("page");
  } : undefined}>
    <link rel="stylesheet" href="/sales-page.css" />
    {sections.filter(section => section.type === "offer").map(section => <aside data-sp-section={section.id} data-editor-selected={preview && selectedId === section.id || undefined} className={`sp-offer-wrap sp-bg-${section.background}`} key={section.id}>{tools(section.id)}<Section section={section} preview={preview} editor={editor} /></aside>)}
    <header className="sp-header"><a href="/" className="sp-brand">{page.logo ? <Image src={page.logo} alt="" editor={editor} target={{ sectionId: "page", field: "logo" }} /> : <BookOpen size={30} />}<Text value={page.brand} target={{ sectionId: "page", field: "brand" }} editor={editor} /></a>{page.navLabel && page.navUrl && isSalesUrl(page.navUrl) && <a className="sp-button" href={page.navUrl}><Text value={page.navLabel} target={{ sectionId: "page", field: "navLabel" }} editor={editor} /><ArrowRight size={18} /></a>}</header>
    <main>{sections.filter(section => !["offer", "footer"].includes(section.type)).map(section => <section data-sp-section={section.id} data-editor-selected={preview && selectedId === section.id || undefined} key={section.id} id={`section-${section.id}`} className={`sp-section sp-bg-${section.background} sp-kind-${section.type}`}>{tools(section.id)}<div className="sp-container"><Section section={section} preview={preview} editor={editor} /></div></section>)}</main>
    {sections.filter(section => section.type === "footer").map(section => <div data-sp-section={section.id} data-editor-selected={preview && selectedId === section.id || undefined} key={section.id} className={`sp-section sp-bg-${section.background}`}>{tools(section.id)}<div className="sp-container"><Section section={section} preview={preview} editor={editor} /></div></div>)}
  </div>;
}
