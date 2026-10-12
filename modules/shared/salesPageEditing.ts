import type { SalesPage, SalesSection } from "./salesPage";

export type SalesEditTarget = { sectionId: string; field: string; itemId?: string };
export type SalesDrag = { kind: "insert"; section: SalesSection } | { kind: "section"; id: string } | { kind: "item"; sectionId: string; id: string };
export type SalesDropTarget = { sectionId?: string; itemId?: string; after: boolean };
export type SalesViewEditor = {
  disabled: boolean;
  onText: (target: SalesEditTarget, value: string) => void;
  onMedia: (target: SalesEditTarget) => void;
  onSettings: (id: string) => void;
  onMove: (id: string, direction: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDrag: (payload: SalesDrag, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragReady: () => void;
};

const group = (section: SalesSection) => section.type === "offer" ? 0 : section.type === "footer" ? 2 : 1;

/** All drag operations produce a single history entry and preserve pinned offer/footer groups. */
export function applySalesDrop(page: SalesPage, payload: SalesDrag, target: SalesDropTarget): SalesPage {
  if (payload.kind === "item") {
    if (target.sectionId !== payload.sectionId || !target.itemId || target.itemId === payload.id) return page;
    const section = page.sections.find(section => section.id === payload.sectionId);
    const item = section?.items.find(item => item.id === payload.id);
    if (!section || !item || !section.items.some(item => item.id === target.itemId)) return page;
    const items = section.items.filter(item => item.id !== payload.id);
    const index = items.findIndex(item => item.id === target.itemId) + (target.after ? 1 : 0);
    items.splice(index, 0, item);
    if (items.every((item, index) => item.id === section.items[index].id)) return page;
    return { ...page, sections: page.sections.map(current => current.id === section.id ? { ...current, items } : current) };
  }
  const section = payload.kind === "insert" ? payload.section : page.sections.find(section => section.id === payload.id);
  if (!section || payload.kind === "insert" && (page.sections.length >= 60 || page.sections.some(current => current.id === section.id))) return page;
  if (payload.kind === "section" && target.sectionId === section.id) return page;
  const remainder = page.sections.filter(current => current.id !== section.id);
  const targetSection = remainder.find(current => current.id === target.sectionId);
  const buckets = [0, 1, 2].map(rank => remainder.filter(current => group(current) === rank));
  const bucket = buckets[group(section)];
  const index = targetSection && group(targetSection) === group(section)
    ? bucket.findIndex(current => current.id === targetSection.id) + (target.after ? 1 : 0)
    : targetSection && group(targetSection) < group(section) ? 0 : bucket.length;
  bucket.splice(index, 0, section);
  const sections = buckets.flat();
  return sections.length === page.sections.length && sections.every((section, index) => section.id === page.sections[index].id) ? page : { ...page, sections };
}

/** Only known plain-text fields can be committed from the preview. */
export function applySalesText(page: SalesPage, target: SalesEditTarget, value: string): SalesPage {
  if (target.sectionId === "page") {
    if (!["brand", "navLabel"].includes(target.field)) return page;
    const field = target.field as "brand" | "navLabel";
    const text = value.slice(0, 100);
    return page[field] === text || field === "brand" && !text.trim() ? page : { ...page, [field]: text };
  }
  const section = page.sections.find(section => section.id === target.sectionId);
  if (!section) return page;
  if (target.itemId) {
    const max: Record<string, number> = { title: 300, text: 4000, price: 100, label: 100 };
    if (!Object.hasOwn(max, target.field)) return page;
    const field = target.field as "title" | "text" | "price" | "label";
    const item = section.items.find(item => item.id === target.itemId);
    const text = value.slice(0, max[field]);
    if (!item || item[field] === text) return page;
    return { ...page, sections: page.sections.map(current => current.id === section.id ? { ...current, items: current.items.map(item => item.id === target.itemId ? { ...item, [field]: text } : item) } : current) };
  }
  const max: Record<string, number> = { title: 500, subtitle: 500, body: 6000, buttonLabel: 100 };
  if (!Object.hasOwn(max, target.field)) return page;
  const field = target.field as "title" | "subtitle" | "body" | "buttonLabel";
  const text = value.slice(0, max[field]);
  if (section[field] === text) return page;
  return { ...page, sections: page.sections.map(current => current.id === section.id ? { ...current, [field]: text } : current) };
}
