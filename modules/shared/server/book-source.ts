import sanitizeHtml from "sanitize-html";
import { PDFParse } from "pdf-parse";
import { ApiError } from "./api";
import { downloadRemote } from "./download";
import { PDF_PAGE_LIMIT, PDF_SIZE_LIMIT, SOURCE_TEXT_LIMIT, type ImportedBookSource } from "@shared/aiBook";

function sourceResult(text: string, title: string, pages?: number): ImportedBookSource {
  const clean = text.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length < 80) throw new ApiError(422, "Not enough readable text was found. Use a text-based PDF or paste your content in Description.");
  return { title: title.slice(0, 160), text: clean.slice(0, SOURCE_TEXT_LIMIT), characters: clean.length, truncated: clean.length > SOURCE_TEXT_LIMIT, ...(pages ? { pages } : {}) };
}

export async function extractPdfSource(bytes: Buffer, name: string) {
  if (bytes.length > PDF_SIZE_LIMIT) throw new ApiError(413, "Choose a PDF smaller than 10 MB.");
  if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))) throw new ApiError(400, "This file is not a valid PDF.");
  const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false });
  try {
    const info = await parser.getInfo();
    if (info.total > PDF_PAGE_LIMIT) throw new ApiError(413, `Choose a PDF with ${PDF_PAGE_LIMIT} pages or fewer.`);
    const result = await parser.getText();
    return sourceResult(result.pages.map(page => page.text).join("\n\n"), name.replace(/\.pdf$/i, ""), info.total);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "This PDF could not be read. Try an unlocked, text-based PDF.");
  } finally { await parser.destroy(); }
}

/** Convert a single public article to plain text; no scripts or embedded resources run. */
export function extractHtmlSource(html: string, fallbackTitle: string) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || fallbackTitle;
  const main = /<(?:article|main)\b[^>]*>([\s\S]*?)<\/(?:article|main)>/i.exec(html)?.[1] || html;
  const plain = (value: string) => sanitizeHtml(value.replace(/<\/(?:p|div|h[1-6]|li|section|tr)>/gi, "\n").replace(/<br\s*\/?\s*>/gi, "\n"), {
    allowedTags: [], allowedAttributes: {},
    nonTextTags: ["script", "style", "textarea", "option", "nav", "header", "footer", "svg", "form", "noscript"],
  }).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    if (code[0] !== "#") return named[code.toLowerCase()] || entity;
    const number = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : "";
  });
  return sourceResult(plain(main), plain(title));
}

export async function extractUrlSource(input: unknown) {
  let url: URL;
  try { url = new URL(String(input)); } catch { throw new ApiError(400, "Enter a valid public HTTPS URL."); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new ApiError(400, "Enter a public HTTPS URL without a login or custom port.");
  try {
    const { bytes, contentType } = await downloadRemote(url.href, PDF_SIZE_LIMIT);
    if (contentType === "application/pdf") return extractPdfSource(bytes, url.pathname.split("/").pop() || "Imported PDF");
    if (!["text/html", "application/xhtml+xml", "text/plain"].includes(contentType.toLowerCase())) throw new ApiError(415, "This URL must point to a readable webpage, text file or PDF.");
    return contentType === "text/plain" ? sourceResult(bytes.toString("utf8"), url.hostname) : extractHtmlSource(bytes.toString("utf8"), url.hostname);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "This page could not be imported. Use a publicly accessible HTTPS page or paste its text in Description.");
  }
}
