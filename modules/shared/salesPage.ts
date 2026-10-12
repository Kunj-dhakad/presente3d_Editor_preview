export const SALES_SECTION_TYPES = ["offer", "hero", "video", "benefits", "features", "cta", "pricing", "testimonials", "faq", "footer", "text", "image", "button"] as const;
export type SalesSectionType = typeof SALES_SECTION_TYPES[number];
export const SALES_SECTION_LABELS: Record<SalesSectionType, string> = { offer: "Offer & countdown", hero: "Hero headline", video: "Video & benefits", benefits: "Benefits list", features: "Feature cards", cta: "Call to action", pricing: "Pricing cards", testimonials: "Testimonials", faq: "Questions & answers", footer: "Footer links", text: "Text block", image: "Image block", button: "Button block" };
export type SalesItem = { id: string; title: string; text: string; image: string; price: string; link: string; label: string };
export type SalesSection = { id: string; type: SalesSectionType; enabled: boolean; title: string; subtitle: string; body: string; image: string; imageAlt: string; video: string; buttonLabel: string; buttonUrl: string; endAt: string; background: "plain" | "tint" | "dark"; items: SalesItem[] };
export type SalesPage = { schemaVersion: 1; title: string; description: string; brand: string; logo: string; navLabel: string; navUrl: string; theme: { primary: string; accent: string; ink: string; background: string; font: "serif" | "sans" }; sections: SalesSection[] };
export type SalesPageSnapshot = { draft: SalesPage; revision: number; publishedRevision: number | null; publishedAt: string | null; updatedAt: string | null };

/** getRandomValues also works on LAN HTTP URLs, where randomUUID is unavailable. */
export function salesPageId(): string {
  const bytes = new Uint8Array(16); globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function newSalesItem(id: string): SalesItem { return { id, title: "New item", text: "Add your description here.", image: "", price: "", link: "/pricing", label: "Get started" }; }
export function newSalesSection(type: SalesSectionType, id: string): SalesSection {
  return { id, type, enabled: true, title: SALES_SECTION_LABELS[type], subtitle: "", body: "", image: "", imageAlt: "", video: "", buttonLabel: "Get started", buttonUrl: "/pricing", endAt: "", background: type === "offer" || type === "footer" ? "dark" : type === "cta" ? "tint" : "plain", items: ["video", "benefits", "features", "pricing", "testimonials", "faq", "footer"].includes(type) ? [newSalesItem(`${id}-item`)] : [] };
}

export function defaultSalesPage(): SalesPage {
  const section = (type: SalesSectionType, fields: Partial<SalesSection>): SalesSection => ({ ...newSalesSection(type, type), ...fields });
  const item = (id: string, title: string, text: string): SalesItem => ({ ...newSalesItem(id), title, text });
  return {
    schemaVersion: 1, title: "AI Book Creator | Write, design & publish", description: "Create interactive books and publications with AI Book Creator.", brand: "AI Book Creator", logo: "", navLabel: "Get started", navUrl: "/pricing",
    theme: { primary: "#00becb", accent: "#ff8425", ink: "#053b38", background: "#fcfefe", font: "serif" },
    sections: [
      section("offer", { title: "YOUR NEXT BOOK STARTS HERE", body: "Write. Design. Publish.", buttonLabel: "EXPLORE PLANS", endAt: "" }),
      section("hero", { title: "Publish Beautiful Interactive Books & Publications", subtitle: "Bring your ideas to life", body: "Turn your knowledge into books, guides and workbooks. Add interactive content, design every page and share your work with the world.", buttonLabel: "Start creating" }),
      section("video", { title: "See what you can create", body: "From a first idea to a book your readers can explore.", items: [item("v1", "Create your book", "Start with your own content or use AI to build a first draft."), item("v2", "Make it interactive", "Add videos, links, quizzes and QR codes."), item("v3", "Share your work", "Publish a reader link or export your book.")] }),
      section("cta", { title: "Your next book starts with one idea", subtitle: "Create. Customize. Share.", body: "Choose the plan that fits your publishing workflow.", buttonLabel: "Get AI Book Creator" }),
      section("features", { title: "Everything your book needs", items: [item("f1", "AI writing copilot", "Draft, rewrite and develop your content."), item("f2", "Beautiful layouts", "Design pages with text, images, tables and charts."), item("f3", "Interactive publishing", "Give readers a book they can explore.")] }),
      section("faq", { title: "Your questions, answered", items: [item("q1", "Can I customize my book?", "Yes. Edit the text, layout and interactive elements in the book editor."), item("q2", "Where can I see the available plans?", "Use the Get started button to view current plans and features.")] }),
      section("footer", { title: "AI Book Creator", body: "Write, design and publish beautiful books.", items: [{ ...item("contact", "Contact", ""), link: "/contact" }, { ...item("privacy", "Privacy", ""), link: "/privacy" }, { ...item("terms", "Terms", ""), link: "/terms" }] }),
    ],
  };
}

/** Allow ordinary navigation and image URLs, never executable or protocol-relative URLs. */
export function isSalesUrl(value: string, image = false): boolean {
  if (!value) return true;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (!image && /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function salesVideoSource(value: string): { type: "embed" | "file"; url: string } | null {
  if (!value || !isSalesUrl(value, true)) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    if (["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? { type: "embed", url: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const id = url.pathname.match(/(?:\/video)?\/(\d+)$/)?.[1];
      return id ? { type: "embed", url: `https://player.vimeo.com/video/${id}` } : null;
    }
    return /\.(mp4|webm|ogg)$/i.test(url.pathname) ? { type: "file", url: value } : null;
  } catch { return null; }
}

export function parseSalesPage(input: unknown): SalesPage {
  const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid page data."); return value as Record<string, unknown>; };
  const text = (value: unknown, max = 500): string => { if (typeof value !== "string" || value.length > max) throw new Error(`Text fields must contain at most ${max} characters.`); return value; };
  const url = (value: unknown, image = false): string => { const result = text(value, 2048).trim(); if (!isSalesUrl(result, image)) throw new Error("Use a valid https URL or a local path for links and media."); return result; };
  const identity = (value: unknown): string => { const result = text(value, 100); if (!/^[\w-]+$/.test(result)) throw new Error("Invalid section or item ID."); return result; };
  const source = object(input), theme = object(source.theme);
  const color = (value: unknown): string => { const result = text(value, 7); if (!/^#[0-9a-fA-F]{6}$/.test(result)) throw new Error("Choose a valid theme color."); return result; };
  if (source.schemaVersion !== 1 || !Array.isArray(source.sections) || source.sections.length > 60) throw new Error("A page can contain up to 60 sections.");
  if (theme.font !== "serif" && theme.font !== "sans") throw new Error("Invalid heading font.");
  const ids = new Set<string>();
  const sections = source.sections.map(raw => {
    const section = object(raw), id = identity(section.id);
    if (ids.has(id)) throw new Error("Sections must have unique IDs."); ids.add(id);
    if (!SALES_SECTION_TYPES.includes(section.type as SalesSectionType) || typeof section.enabled !== "boolean" || !["plain", "tint", "dark"].includes(String(section.background))) throw new Error("Invalid section settings.");
    if (!Array.isArray(section.items) || section.items.length > 50) throw new Error("A section can contain up to 50 items.");
    const itemIds = new Set<string>();
    const items = section.items.map(rawItem => {
      const entry = object(rawItem), itemId = identity(entry.id);
      if (itemIds.has(itemId)) throw new Error("Items must have unique IDs."); itemIds.add(itemId);
      return { id: itemId, title: text(entry.title, 300), text: text(entry.text, 4000), image: url(entry.image, true), price: text(entry.price, 100), link: url(entry.link), label: text(entry.label, 100) };
    });
    const endAt = text(section.endAt, 40);
    if (endAt && (!/^\d{4}-\d{2}-\d{2}T/.test(endAt) || !Number.isFinite(Date.parse(endAt)))) throw new Error("Choose a valid countdown end date.");
    const video = url(section.video, true);
    if (video && !salesVideoSource(video)) throw new Error("Use a YouTube, Vimeo, MP4, WebM or OGG video URL.");
    return { id, type: section.type as SalesSectionType, enabled: section.enabled, title: text(section.title, 500), subtitle: text(section.subtitle, 500), body: text(section.body, 6000), image: url(section.image, true), imageAlt: text(section.imageAlt, 300), video, buttonLabel: text(section.buttonLabel, 100), buttonUrl: url(section.buttonUrl), endAt, background: section.background as SalesSection["background"], items };
  });
  const result: SalesPage = { schemaVersion: 1, title: text(source.title, 160), description: text(source.description, 400), brand: text(source.brand, 100), logo: url(source.logo, true), navLabel: text(source.navLabel, 100), navUrl: url(source.navUrl), theme: { primary: color(theme.primary), accent: color(theme.accent), ink: color(theme.ink), background: color(theme.background), font: theme.font }, sections };
  if (!result.title.trim() || !result.brand.trim()) throw new Error("Page title and brand name are required.");
  return result;
}
