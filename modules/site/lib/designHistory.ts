"use client";

/**
 * The designs this browser's author used last, per publication type. A new AI
 * book is sent these to avoid, so books made one after another look different.
 */
const KEY = "abc-recent-designs";
const KEEP = 5;

function read(): Record<string, number[]> {
  try { return JSON.parse(window.localStorage.getItem(KEY) || "{}") ?? {}; } catch { return {}; }
}

export function recentDesigns(type = "ebook"): number[] {
  const list = read()[type];
  return Array.isArray(list) ? list.filter(Number.isInteger).slice(0, KEEP) : [];
}

export function rememberDesign(type = "ebook", variant: unknown) {
  if (!Number.isInteger(variant)) return;
  const all = read();
  all[type] = [variant as number, ...recentDesigns(type).filter(n => n !== variant)].slice(0, KEEP);
  try { window.localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private mode */ }
}
