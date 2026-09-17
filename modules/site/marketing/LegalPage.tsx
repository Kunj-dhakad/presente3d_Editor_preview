import { MarketingPage } from "./SiteChrome";
import { SITE } from "@shared/site";

export default function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: { heading: string; body: React.ReactNode }[] }) {
  return <MarketingPage>
    <article className="fs-legal">
      <span className="fs-eyebrow">LEGAL</span>
      <h1>{title}</h1>
      <p className="fs-muted">Last updated: {SITE.legalUpdated}</p>
      <p>{intro}</p>
      {sections.map((s, i) => <section key={s.heading}><h2>{i + 1}. {s.heading}</h2>{s.body}</section>)}
      <section><h2>Contact</h2><p>Questions about this page? Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or use our <a href="/contact">contact form</a>.</p></section>
    </article>
  </MarketingPage>;
}
