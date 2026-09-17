import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE } from "@shared/site";
import { BrandMark } from "@shared/components/BrandMark";

export function SiteHeader() {
  return <header className="fs-site-nav">
    <Link href="/" className="fs-brand"><BrandMark /> {SITE.name}</Link>
    <nav aria-label="Main">
      <Link href="/#features">Features</Link>
      <Link href="/#how-it-works">How it works</Link>
      <Link href="/pricing">Pricing</Link>
      <Link href="/#faq">FAQ</Link>
    </nav>
    <div className="fs-site-nav-actions">
      <Link href="/login" className="fs-site-login">Log in</Link>
      <Link href="/signup" className="fs-btn fs-primary">Get started <ArrowUpRight size={16} /></Link>
    </div>
  </header>;
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return <footer className="fs-site-footer">
    <div className="fs-site-footer-inner">
      <div className="fs-site-footer-brand">
        <Link href="/" className="fs-brand"><BrandMark /> {SITE.name}</Link>
        <p>{SITE.tagline}</p>
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
      </div>
      <div><h3>Product</h3><Link href="/#features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/signup">Create account</Link><Link href="/login">Log in</Link></div>
      <div><h3>Support</h3><Link href="/contact">Contact us</Link><Link href="/#faq">FAQ</Link><Link href="/#how-it-works">How it works</Link></div>
      <div><h3>Legal</h3><Link href="/terms">Terms of service</Link><Link href="/privacy">Privacy policy</Link><Link href="/refund">Refund policy</Link></div>
    </div>
    <p className="fs-site-copy">© {year} {SITE.company}. All rights reserved.</p>
  </footer>;
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return <div className="fs-app fs-site"><SiteHeader /><main>{children}</main><SiteFooter /></div>;
}
