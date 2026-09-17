"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, X, WandSparkles, LayoutGrid, Rocket, FileUp, BookOpenText, Share2, Search, Palette, MousePointerClick } from "lucide-react";
import { bookTypeArt, type BookTypeArt } from "@shared/siteArt";

/** The three ways to start a book, shared by the library and the dashboard. */
export const BOOK_TYPES: { id: BookTypeArt; title: string; text: string; href: string; features: { label: string; icon: typeof ChevronRight }[] }[] = [
  {
    id: "ai-book", title: "AI Book", text: "Let AI create a stunning book for you.", href: "/books/ai",
    features: [{ label: "AI Writing", icon: WandSparkles }, { label: "Smart Layout", icon: LayoutGrid }, { label: "Publish", icon: Rocket }],
  },
  {
    id: "flip-book", title: "Flip and Photo Book", text: "Upload a PDF or photos and turn them into a flip book.", href: "/books/flip",
    features: [{ label: "PDF Upload", icon: FileUp }, { label: "Flip Effect", icon: BookOpenText }, { label: "Share & Download", icon: Share2 }],
  },
  {
    id: "templates", title: "Book Templates", text: "Pick from a variety of professional templates.", href: "/books/templates",
    features: [{ label: "Browse", icon: Search }, { label: "Customise", icon: Palette }, { label: "One click", icon: MousePointerClick }],
  },
];

export default function BookTypePicker({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return <div className="fs-modal-backdrop" onClick={onClose}>
    <section className="fs-modal fs-type-picker" role="dialog" aria-modal="true" aria-labelledby="book-type-title" onClick={event => event.stopPropagation()}>
      <header>
        <div><h2 id="book-type-title">Choose your book type</h2><p>Select the best way to create your book.</p></div>
        <button className="fs-type-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="fs-type-list">
        {BOOK_TYPES.map(type => <Link key={type.id} href={type.href} className="fs-type-card" onClick={onClose}>
          <span className="fs-type-art">{bookTypeArt(type.id) && <Image src={bookTypeArt(type.id)} alt="" width={240} height={160} unoptimized />}</span>
          <span className="fs-type-body">
            <strong>{type.title}</strong>
            <small>{type.text}</small>
            <span className="fs-type-chips">{type.features.map(feature => <span key={feature.label}><feature.icon size={13} />{feature.label}</span>)}</span>
          </span>
          <span className="fs-type-go" aria-hidden="true"><ChevronRight size={18} /></span>
        </Link>)}
      </div>
    </section>
  </div>;
}
