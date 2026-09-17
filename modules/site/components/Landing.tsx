import Link from "next/link";
import {
  ArrowUpRight, PenTool, Sparkles, Cloud, FileDown, Share2, MousePointerClick,
  LayoutTemplate, BarChart3, Volume2, ShieldCheck, GraduationCap, Briefcase, Feather,
} from "lucide-react";
import { MarketingPage } from "@site/marketing/SiteChrome";
import { PricingCards, Faq, FAQS } from "@site/marketing/Pricing";
import { SITE } from "@shared/site";

const features = [
  { icon: PenTool, title: "Design every page", text: "Drag in text, images, shapes, tables and charts. Smart guides keep your layout clean." },
  { icon: Sparkles, title: "AI writing copilot", text: "Draft chapters, rewrite paragraphs and generate full pages from a short prompt." },
  { icon: LayoutTemplate, title: "Starter layouts", text: "Begin with guides, stories and workbooks instead of a blank page." },
  { icon: MousePointerClick, title: "Interactive books", text: "Add quizzes, questions, contact forms, video and slideshows readers can use." },
  { icon: FileDown, title: "Export anywhere", text: "Download print-ready PDF, PowerPoint or page images in a couple of clicks." },
  { icon: Share2, title: "Publish a reader link", text: "Share a page-flip reader with anyone — and revoke the link whenever you like." },
  { icon: BarChart3, title: "Charts, tables and QR codes", text: "Explain ideas with data and link printed pages back to the web." },
  { icon: Volume2, title: "Read aloud", text: "Readers can listen to your book with built-in text-to-speech." },
  { icon: Cloud, title: "Autosave and history", text: "Every change is saved to the cloud, with earlier versions kept safe." },
];

const steps = [
  { title: "Create your book", text: "Sign up free, name your book and pick a starter layout." },
  { title: "Write and design", text: "Write with AI help, drop in media and arrange pages your way." },
  { title: "Export or publish", text: "Download a PDF or share a live reader link with your audience." },
];

const audiences = [
  { icon: Feather, title: "Authors", text: "Short stories, poetry collections and self-published books." },
  { icon: GraduationCap, title: "Educators", text: "Workbooks, lesson guides and interactive quizzes for students." },
  { icon: Briefcase, title: "Businesses", text: "Brochures, playbooks, catalogues and lead-magnet e-books." },
];

export default function Landing() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", name: SITE.name, applicationCategory: "DesignApplication", operatingSystem: "Web", description: SITE.description, url: SITE.url, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
      { "@type": "FAQPage", mainEntity: FAQS.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  return <MarketingPage>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

    <section className="fs-hero">
      <div className="fs-hero-copy">
        <span className="fs-pill">AI-POWERED BOOK EDITOR</span>
        <h1>Your ideas deserve<br />their own book.</h1>
        <p>Write, design and publish beautiful books, guides and workbooks — with an intuitive editor and an AI copilot that helps at every page.</p>
        <div className="fs-hero-actions">
          <Link href="/signup" className="fs-btn fs-primary fs-btn-lg">Create your first book free <ArrowUpRight size={18} /></Link>
          <Link href="/pricing" className="fs-btn fs-outline fs-btn-lg">See pricing</Link>
        </div>
        <small className="fs-muted"><ShieldCheck size={14} /> Free plan · No credit card required</small>
      </div>
      <div className="fs-hero-mock" aria-hidden="true">
        <div className="fs-mock-bar"><i /><i /><i /><span>My next great book</span></div>
        <div className="fs-mock-body">
          <div className="fs-mock-side"><b /><b /><b /><b /><b /></div>
          <div className="fs-mock-page">
            <span className="fs-mock-kicker">CHAPTER ONE</span>
            <h2>The Art of Beginning</h2>
            <p /><p /><p className="short" />
            <div className="fs-mock-img" />
            <p /><p className="short" />
          </div>
          <div className="fs-mock-ai"><Sparkles size={14} /><span>Rewrite this paragraph in a warmer tone</span></div>
        </div>
      </div>
    </section>

    <section className="fs-section" id="features">
      <div className="fs-section-head"><span className="fs-eyebrow">EVERYTHING IN ONE PLACE</span><h2>From first idea to finished book</h2><p className="fs-muted">No more jumping between a word processor, a design tool and a file-sharing app.</p></div>
      <div className="fs-feature-grid">{features.map(f => <article key={f.title}><f.icon /><h3>{f.title}</h3><p>{f.text}</p></article>)}</div>
    </section>

    <section className="fs-section fs-section-tint" id="how-it-works">
      <div className="fs-section-head"><span className="fs-eyebrow">HOW IT WORKS</span><h2>Three steps to a book you are proud of</h2></div>
      <ol className="fs-steps">{steps.map((s, i) => <li key={s.title}><span>{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    </section>

    <section className="fs-section">
      <div className="fs-section-head"><span className="fs-eyebrow">BUILT FOR CREATORS</span><h2>Made for people with something to share</h2></div>
      <div className="fs-feature-grid fs-audience">{audiences.map(a => <article key={a.title}><a.icon /><h3>{a.title}</h3><p>{a.text}</p></article>)}</div>
    </section>

    <section className="fs-section fs-section-tint" id="pricing">
      <div className="fs-section-head"><span className="fs-eyebrow">SIMPLE PRICING</span><h2>Start free. Upgrade when you grow.</h2></div>
      <PricingCards />
    </section>

    <section className="fs-section" id="faq">
      <div className="fs-section-head"><span className="fs-eyebrow">QUESTIONS</span><h2>Frequently asked questions</h2></div>
      <Faq />
    </section>

    <section className="fs-cta">
      <h2>Your next chapter is one page away.</h2>
      <p>Join {SITE.name} and turn your ideas into a book people can read, download and share.</p>
      <Link href="/signup" className="fs-btn fs-white fs-btn-lg">Get started for free <ArrowUpRight size={18} /></Link>
    </section>
  </MarketingPage>;
}
