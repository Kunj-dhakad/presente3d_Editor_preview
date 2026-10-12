import type { Metadata } from "next";
import { MarketingPage } from "@site/marketing/SiteChrome";
import { PricingCards, Faq } from "@site/marketing/Pricing";

// Prices come from Administration; saving a package refreshes this page, and
// it is rebuilt every few minutes in any case.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free and upgrade when you need more books, AI actions and storage.",
  alternates: { canonical: "/pricing" },
};

export default async function Page() {
  return <MarketingPage>
    <section className="fs-section fs-page-hero">
      <div className="fs-section-head"><span className="fs-eyebrow">PRICING</span><h1>Plans that grow with your ideas</h1><p className="fs-muted">Every plan includes the full editor, exports and reader links.</p></div>
      {await PricingCards({})}
      <p className="fs-pricing-note">Need something bigger, like a school or publishing house? <a href="/contact?topic=partnership">Talk to us</a>.</p>
    </section>
    <section className="fs-section fs-section-tint">
      <div className="fs-section-head"><h2>Frequently asked questions</h2></div>
      <Faq />
    </section>
  </MarketingPage>;
}
