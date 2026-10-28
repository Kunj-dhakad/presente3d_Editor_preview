"use client";

import { createContext, useContext } from "react";

/**
 * Sending reader responses (lead form, contact forms, quizzes, questions)
 * from a published book to the author's Leads.
 *
 * Nothing provides it in this app: the editor and the PHP preview only show
 * the forms, so their answers are never saved.
 *
 * Each browser gets a random reader id, and a name/email once it gives them
 * (lead form or a contact form). Both travel with every later response, so a
 * quiz or question answered afterwards still shows who sent it.
 */

export type ReaderProfile = { name?: string; email?: string; phone?: string };
export type ResponseKind = "lead" | "contact-form" | "quiz" | "question";
export type ReaderResponse = {
  kind: ResponseKind;
  title?: string;
  answers: Record<string, string>;
  score?: { correct: number; total: number };
};

const storage = {
  get(key: string) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { window.localStorage.setItem(key, value); } catch { /* private mode */ } },
};

// Kept for the page's lifetime even when storage is blocked (private mode).
let memoryVisitor = "";
export function readerId() {
  const saved = storage.get("abc-reader-id");
  if (saved) return saved;
  memoryVisitor ||= typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  storage.set("abc-reader-id", memoryVisitor);
  return memoryVisitor;
}

let memoryProfile: ReaderProfile = {};
export function readerProfile(): ReaderProfile {
  try { return { ...memoryProfile, ...JSON.parse(storage.get("abc-reader-profile") || "{}") }; } catch { return memoryProfile; }
}
/** Remembers what the reader has told us about themselves (never cleared by a blank field). */
export function rememberReader(update: ReaderProfile) {
  const next: ReaderProfile = { ...readerProfile() };
  for (const key of ["name", "email", "phone"] as const) {
    const value = update[key]?.trim();
    if (value) next[key] = value.slice(0, 254);
  }
  memoryProfile = next;
  storage.set("abc-reader-profile", JSON.stringify(next));
}

type Submit = (response: ReaderResponse) => Promise<void>;
const SubmitContext = createContext<Submit | null>(null);


/** The submit function on a published book, or null in a preview (nothing is saved). */
export function useReaderSubmit() {
  return useContext(SubmitContext);
}
