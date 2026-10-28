import sanitizeHtml from "sanitize-html";
import type { SlideType } from "@editor/store/editorStore";
import { ApiError } from "./api";
import { appUrl } from "./origins";
const types = new Set(["text","image","shape","svg","video","button","interaction","table","chart","frame","qr-code","watermark"]);
export function validateDocument(input: unknown): { slides: SlideType[] } {
  if (!input || typeof input !== "object" || !("slides" in input) || !Array.isArray(input.slides) || input.slides.length < 1 || input.slides.length > 500) throw new ApiError(400, "A presentation must contain 1–500 slides.");
  const doc = JSON.parse(JSON.stringify(input)) as { slides: SlideType[] };
  for (const page of doc.slides) {
    if (!page || typeof page.id !== "string" || typeof page.width !== "number" || typeof page.height !== "number" || !Number.isFinite(page.width) || !Number.isFinite(page.height) || page.width < 50 || page.height < 50 || page.width > 5000 || page.height > 5000 || !Array.isArray(page.elements) || page.elements.length > 1000) throw new ApiError(400, "Invalid slide dimensions or elements.");
    for (const element of page.elements) {
      if (!element || typeof element.id !== "string" || !element.data || !types.has(element.data.type)) throw new ApiError(400, "Invalid slide element.");
    }
  }
  // In development the app is served over http, and so are its own files.
  const ownFiles = appUrl() + "/api/files/";
  const clean = (value: unknown, key = ""): unknown => {
    if (typeof value === "string") {
      if (["text", "html", "label", "title"].includes(key)) return sanitizeHtml(value, { allowedTags: ["span","p","br","b","strong","i","em","u","s","div","ul","ol","li","sup","sub"], allowedAttributes: { "*": ["style"] }, allowedStyles: { "*": { color: [/^[#(),.\w\s%-]+$/], "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|%)$/], "font-weight": [/^\w+$/], "font-family": [/^[\w\s,'"-]+$/], "text-decoration": [/^[\w\s-]+$/], "text-align": [/^(left|center|right|justify)$/] } } });
      if (/^(src|url|href|image|imageUrl|image_url|thumbnail|thumbnail_url|backgroundImage|poster|link|linkUrl|submitUrl)$/i.test(key) && value && !value.startsWith(ownFiles) && !/^(https:\/\/|\/api\/|data:image\/(png|jpeg|gif|webp);base64,|\/video-placeholder\.svg$|mailto:|tel:|#)/i.test(value)) throw new ApiError(400, "Media and links must use a secure URL.");
      if ((key === "svg" || key === "shape") && /<\s*(script|foreignObject|iframe|image|use|style)|\bon\w+\s*=|javascript:|(?:href|src)\s*=/i.test(value)) throw new ApiError(400, "This SVG contains unsupported active content.");
      return value;
    }
    if (Array.isArray(value)) return value.map(v => clean(v, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,clean(v,k)]));
    return value;
  };
  return clean(doc) as { slides: SlideType[] };
}
