"use client";
import { useEffect, useState } from "react";
import { BookPreview } from "@reader/index";
import { BookLoader } from "@shared/components/BookLoader";

/** The owner's full-page preview: the same reader the public sees, without view tracking. */
export default function OwnerPreview({ id }: { id: string }) {
  const [json, setJson] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/books/${id}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not open the book.");
        if (active) setJson(JSON.stringify(data.document));
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not open the book."); });
    return () => { active = false; };
  }, [id]);

  if (error) return <p className="m-6 rounded-lg bg-rose-50 p-4 font-sans text-sm text-rose-700" role="alert">{error}</p>;
  if (json === null) return <div className="flex h-dvh items-center justify-center bg-slate-50"><BookLoader label="Opening your book" size={1.2} /></div>;
  return <BookPreview json={json} mode="page" />;
}
