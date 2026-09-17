"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ChevronDown } from "lucide-react";

/**
 * Placeholder catalogue: the real templates are not built yet, so these cards
 * show the layout of the page with drawn covers and a "Coming soon" action.
 */
type Template = { id: string; name: string; category: string; tagline: string; colors: [string, string]; ink: string };

const TEMPLATES: Template[] = [
  { id: "real-estate", name: "Real Estate", category: "Business", tagline: "Brand book", colors: ["#1f6f78", "#8fd3c8"], ink: "#ffffff" },
  { id: "furniture", name: "Furniture Design", category: "Lifestyle", tagline: "Interiors all over the world", colors: ["#3a2f2a", "#a47e5f"], ink: "#f6e9dc" },
  { id: "ascension", name: "The Ascension Edge", category: "Personal Development", tagline: "Rise with purpose", colors: ["#16263f", "#4b6fa8"], ink: "#f1e6c8" },
  { id: "pet-puppy", name: "Pet Puppy", category: "Lifestyle", tagline: "Care guide", colors: ["#f2b33d", "#f7dd8a"], ink: "#4a2c05" },
  { id: "birthday", name: "Birthday Photo Album", category: "Photo Book", tagline: "Celebration · Happiness", colors: ["#f4e6dc", "#e2b598"], ink: "#6b3b24" },
  { id: "cookbook", name: "Delicious Food Cookbook", category: "Food & Cooking", tagline: "Healthy recipes", colors: ["#1d1f22", "#c2482f"], ink: "#ffffff" },
  { id: "swimming", name: "Swimming", category: "Fitness & Wellness", tagline: "Learn to swim", colors: ["#0e7fa6", "#8fe0f0"], ink: "#ffffff" },
  { id: "travel", name: "Travel Diaries", category: "Travel", tagline: "Seven days in Japan", colors: ["#b8424a", "#f1a78d"], ink: "#ffffff" },
  { id: "business-plan", name: "Business Plan", category: "Business", tagline: "From idea to launch", colors: ["#312a6b", "#8a76ea"], ink: "#ffffff" },
  { id: "wedding", name: "Wedding Memories", category: "Photo Book", tagline: "Our forever day", colors: ["#efe6dc", "#cfae8b"], ink: "#5a4027" },
  { id: "kids-story", name: "Bedtime Stories", category: "Fiction & Stories", tagline: "For little dreamers", colors: ["#3c3a8e", "#f3b7d0"], ink: "#ffffff" },
  { id: "marketing", name: "Marketing Playbook", category: "Marketing", tagline: "Grow your brand", colors: ["#0f3d34", "#3fbf8f"], ink: "#e9fff6" },
];

const CATEGORIES = ["All types", ...Array.from(new Set(TEMPLATES.map(t => t.category))).sort()];

export default function TemplateGallery() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All types");
  const shown = useMemo(() => TEMPLATES.filter(t =>
    (category === "All types" || t.category === category) &&
    `${t.name} ${t.category} ${t.tagline}`.toLowerCase().includes(search.trim().toLowerCase())), [search, category]);

  return <main className="fs-content fs-dash fs-templates">
    <section className="fs-dash-head">
      <div>
        <Link href="/books" className="fs-back-link"><ArrowLeft size={15} /> AI Books</Link>
        <h1>Book Templates</h1>
        <p className="fs-muted">Done-for-you books, ready to make your own.</p>
      </div>
      <div className="fs-template-filters">
        <div className="fs-search"><Search size={17} /><input aria-label="Search templates" placeholder="Search templates…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className="fs-select"><select aria-label="Book type" value={category} onChange={event => setCategory(event.target.value)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={16} /></div>
      </div>
    </section>

    <section className="fs-template-panel">
      {shown.length ? <div className="fs-template-grid">
        {shown.map(template => <article key={template.id} className="fs-template-card">
          <div className="fs-template-stage">
            <div className="fs-template-cover" style={{ background: `linear-gradient(160deg, ${template.colors[0]}, ${template.colors[1]})`, color: template.ink }}>
              <small>{template.category}</small>
              <strong>{template.name}</strong>
              <span>{template.tagline}</span>
            </div>
          </div>
          <h3 title={template.name}>{template.name}</h3>
          <button type="button" className="fs-template-choose" disabled title="Templates are on their way">Coming soon</button>
        </article>)}
      </div> : <div className="fs-empty"><h3>No templates match</h3><p>Try another name or book type.</p></div>}
    </section>

    <footer className="fs-dash-footer">All rights reserved to <strong>AI Book Creator</strong></footer>
  </main>;
}
