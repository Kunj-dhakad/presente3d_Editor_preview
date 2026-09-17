import type { Metadata } from "next";
import { Mail, Clock } from "lucide-react";
import { MarketingPage } from "@site/marketing/SiteChrome";
import ContactForm from "@site/marketing/ContactForm";
import { SITE } from "@shared/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Questions about ${SITE.name}, plans or your account? Send us a message.`,
  alternates: { canonical: "/contact" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ topic?: string; plan?: string }> }) {
  const { topic, plan } = await searchParams;
  return <MarketingPage>
    <section className="fs-section fs-page-hero fs-contact">
      <div>
        <span className="fs-eyebrow">CONTACT</span>
        <h1>We would love to hear from you</h1>
        <p className="fs-muted">Plan upgrades, billing, account help or partnership ideas — send a message and our team will reply by email.</p>
        <ul className="fs-contact-points">
          <li><Mail size={18} /><span>Email us directly at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></span></li>
          <li><Clock size={18} /><span>We usually reply within 1–2 business days.</span></li>
        </ul>
      </div>
      <ContactForm topic={topic} plan={plan} />
    </section>
  </MarketingPage>;
}
