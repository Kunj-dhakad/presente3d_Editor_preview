import Link from "next/link";
import { Check } from "lucide-react";
import { publicPlans } from "@shared/server/bms";

export const FAQS = [
  { q: "Do I need design experience?", a: "No. Start from a blank page or a starter layout, then drag in text, images, shapes, charts and interactive elements. Snapping guides keep everything aligned." },
  { q: "How does the AI help?", a: "The AI copilot can draft and rewrite text, generate whole pages, create quizzes, and produce images and short videos from a prompt. Each plan includes a daily number of AI actions." },
  { q: "What can I export?", a: "Download your book as a print-ready PDF, a PowerPoint file or page images. You can also publish a reader link that opens as a page-flip book in any browser." },
  { q: "Who owns what I create?", a: "You do. Your books and uploads stay private to your account until you choose to publish a reader link, and you can revoke that link at any time." },
  { q: "Is my work saved automatically?", a: "Yes. The editor saves to the cloud as you work and keeps previous versions, so a closed tab or lost connection does not cost you your progress." },
  { q: "Can I change or cancel my plan?", a: "Yes. Start free, and contact us from Plan & billing when you want to upgrade, downgrade or cancel. Your books are never deleted when you change plans." },
];

/** The plans come from Administration, so a price change needs no deploy. */
export async function PricingCards({ loggedIn = false }: { loggedIn?: boolean }) {
  const plans = await publicPlans();
  return <div className="fs-pricing">
    {plans.map(plan => <section key={plan.id} className={`fs-price-card${plan.highlight ? " fs-price-featured" : ""}`}>
      {plan.highlight && <span className="fs-price-badge">Most popular</span>}
      <h3>{plan.name}</h3>
      <p className="fs-muted">{plan.blurb}</p>
      <p className="fs-price"><strong>{plan.price}</strong><span>{plan.period}</span></p>
      <Link
        href={plan.priceCents === 0 ? (loggedIn ? "/dashboard" : "/signup") : `/contact?topic=upgrade&plan=${plan.slug}`}
        className={`fs-btn ${plan.highlight ? "fs-primary" : "fs-outline"}`}
      >{plan.priceCents === 0 ? (loggedIn ? "Go to dashboard" : "Start for free") : `Choose ${plan.name}`}</Link>
      <ul>{plan.highlights.map(f => <li key={f}><Check size={16} />{f}</li>)}</ul>
    </section>)}
  </div>;
}

export function Faq() {
  return <div className="fs-faq">
    {FAQS.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
  </div>;
}
