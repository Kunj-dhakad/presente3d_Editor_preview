"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, CreditCard, ImageIcon, LayoutTemplate, ListChecks, MousePointerClick, PanelBottom, PanelsTopLeft, PlayCircle, Plus, Quote, RectangleHorizontal, Timer, Type } from "lucide-react";
import { defaultSalesPage, newSalesItem, newSalesSection, SALES_SECTION_LABELS, salesPageId, type SalesPage, type SalesSection, type SalesSectionType } from "@shared/salesPage";
import SalesPageView from "@site/components/SalesPageView";

const categories = [
  { type: "text", icon: Type }, { type: "image", icon: ImageIcon }, { type: "button", icon: RectangleHorizontal },
  { type: "hero", icon: LayoutTemplate }, { type: "cta", icon: MousePointerClick },
  { type: "offer", icon: Timer }, { type: "features", icon: PanelsTopLeft },
  { type: "benefits", icon: ListChecks }, { type: "video", icon: PlayCircle },
  { type: "testimonials", icon: Quote }, { type: "faq", icon: CircleHelp },
  { type: "pricing", icon: CreditCard }, { type: "footer", icon: PanelBottom },
] as const;
const styles = [
  { background: "plain", name: "Clean & minimal", description: "A clean background with room for your content." },
  { background: "tint", name: "Soft color", description: "A subtle tint using your page's brand color." },
  { background: "dark", name: "Bold & dark", description: "A dark background with a strong visual contrast." },
] as const;

function designerSection(type: SalesSectionType, background: SalesSection["background"], id: string): SalesSection {
  const seed = defaultSalesPage().sections.find(section => section.type === type) || newSalesSection(type, id);
  const section = { ...seed, id, background, items: seed.items.map((item, index) => ({ ...item, id: `${id}-item-${index}` })) };
  if (type === "benefits") {
    section.title = "What makes your product different";
    section.items = ["Easy to get started", "Made for your audience", "Ready for your next idea"].map((title, index) => ({ ...newSalesItem(`${id}-item-${index}`), title, text: "Add a benefit your customers will love." }));
  } else if (type === "pricing") {
    section.title = "Choose your plan";
    section.items = ["Starter", "Pro", "Business"].map((title, index) => ({ ...newSalesItem(`${id}-item-${index}`), title, price: "Your price", text: "Describe what is included in this plan." }));
  } else if (type === "testimonials") {
    section.title = "What your customers say";
    section.items = [0, 1, 2].map(index => ({ ...newSalesItem(`${id}-item-${index}`), title: "Customer name", text: "Add a customer quote here." }));
  } else if (type === "text") {
    section.title = "Tell your story"; section.body = "Write your text here. Double-click the text in the editor to make it your own.";
  } else if (type === "image") {
    section.image = "/images/marketing/image-placeholder.svg"; section.imageAlt = "Replace this image with your own"; section.body = "Add a caption for your image.";
  } else if (type === "button") {
    section.buttonLabel = "Learn more";
  }
  return section;
}

const thumbnailDocument = '<!doctype html><html><head><link rel="stylesheet" href="/sales-page.css"><style>html,body{margin:0;overflow:hidden}.sales-page>.sp-header{display:none}.sales-page{min-height:100vh}.sp-section{padding:48px 32px}.sp-offer-wrap{position:static}</style></head><body><div id="template-root"></div></body></html>';

function Thumbnail({ page, section }: { page: SalesPage; section: SalesSection }) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = width / 960;
  return <div ref={root} className="spb-template-thumb" aria-hidden="true" inert>
    <iframe title="Section design thumbnail" tabIndex={-1} srcDoc={thumbnailDocument} style={{ width: 960, height: 180 / Math.max(scale, .1), transform: `scale(${scale})` }} onLoad={event => setTarget(event.currentTarget.contentDocument?.getElementById("template-root") || null)} />
    {target && createPortal(<SalesPageView page={{ ...page, sections: [section] }} />, target)}
  </div>;
}

export default function SalesSectionLibrary({ page, open, disabled, onAdd, onDrag, onDragEnd }: { page: SalesPage; open: boolean; disabled: boolean; onAdd: (section: SalesSection) => void; onDrag: (section: SalesSection, event: DragEvent) => void; onDragEnd: () => void }) {
  const [category, setCategory] = useState<SalesSectionType>("cta");
  if (!open) return null;
  return <div className="spb-designer-body">
    <nav className="spb-design-categories" aria-label="Section categories"><span className="spb-category-heading">SECTION TYPES</span>{categories.map(({ type, icon: Icon }) => <button key={type} type="button" aria-pressed={category === type} className={category === type ? "on" : ""} onClick={() => setCategory(type)}><Icon size={17} /><span>{SALES_SECTION_LABELS[type]}</span></button>)}</nav>
    <div className="spb-design-gallery" key={category}><div className="spb-design-gallery-heading"><strong>{SALES_SECTION_LABELS[category]}</strong><span>Drag a design onto the page, or click to add</span></div>{styles.map(style => <article key={style.background} className="spb-design-card">
      <Thumbnail page={page} section={designerSection(category, style.background, `preview-${category}-${style.background}`)} />
      <div className="spb-design-card-footer"><div><strong>{style.name}</strong><span>{style.description}</span></div><span className="spb-design-add"><Plus size={17} /></span></div>
      <button type="button" className="spb-design-use" disabled={disabled} draggable={!disabled} aria-label={`Add ${SALES_SECTION_LABELS[category]}: ${style.name}`} onDragStart={event => onDrag(designerSection(category, style.background, salesPageId()), event.nativeEvent)} onDragEnd={onDragEnd} onClick={() => onAdd(designerSection(category, style.background, salesPageId()))} />
    </article>)}<p className="spb-design-note">Text, colors and links can be edited after adding.</p></div>
  </div>;
}
