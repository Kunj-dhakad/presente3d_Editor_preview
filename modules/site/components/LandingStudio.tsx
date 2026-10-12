import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Cloud, Play, Sparkles } from "lucide-react";
import { SITE } from "@shared/site";
import { BrandMark } from "@shared/components/BrandMark";
import { SiteFooter } from "@site/marketing/SiteChrome";
import BookShowcase from "./BookShowcase";
import CreationTypes from "./CreationTypes";
import styles from "@site/styles/public-studio.module.css";

const examples = [
  { type: "ebook", title: "Stories worth slowing down for.", label: "EBOOKS", color: "#f3ecda" },
  { type: "magazine", title: "A fresh perspective on every page.", label: "MAGAZINES", color: "#f6e7e0" },
  { type: "workbook", title: "Make learning a little more inspiring.", label: "WORKBOOKS", color: "#e9edf5" },
];

export default function LandingStudio({ features, steps, audiences, faq, pricing, children }: {
  features: ReactNode; steps: ReactNode; audiences: ReactNode; faq: ReactNode; pricing: ReactNode; children: ReactNode;
}) {
  return <div className={`fs-app ${styles.landing}`}>
    {children}
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><BrandMark src="/icon.png" />{SITE.name}</Link>
      <nav aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#inspiration">Inspiration</a><a href="#pricing">Pricing</a></nav>
      <div className={styles.headerActions}><Link href="/login">Log in</Link><Link className={styles.primary} href="/signup">Start creating <ArrowUpRight size={16} /></Link></div>
      <details className={styles.mobileNav}><summary>Explore <ChevronDown size={14} /></summary><nav aria-label="Mobile navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#inspiration">Inspiration</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav></details>
    </header>
    <main>
      <div className={styles.heroBackdrop}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><Sparkles size={14} /> YOUR IDEAS. A WORLD OF POSSIBILITIES.</span>
            <h1>Big ideas.<br />Beautiful books.<br /><span>Made by you.</span></h1>
            <p>Write, design and publish books you’re proud to share. Bring your imagination to life with an intuitive editor and a little help from AI.</p>
            <div className={styles.heroActions}><Link className={styles.primary} href="/signup">Create your first book <ArrowRight size={18} /></Link><a className={styles.secondary} href="#how-it-works"><Play size={15} /> See how it works</a></div>
            <div className={styles.reassurance}><span><Check size={14} /> Free to get started</span><span><Check size={14} /> No credit card required</span></div>
          </div>
          <div className={styles.heroVisual}><BookShowcase /><span className={styles.visualCaption}>From your first “what if” to your next “I made this”.</span></div>
        </section>
        <div className={styles.creationWrap}><div className={styles.creationIntro}><span className={styles.eyebrow}>ONE WORKSPACE. SO MANY POSSIBILITIES.</span><p>What will you create today?</p></div><CreationTypes /></div>
      </div>
      <section className={styles.section} id="features">
        <div className={styles.sectionHead}><span className={styles.eyebrow}>LESS FRICTION. MORE CREATION.</span><h2>Everything you need.<br /><span>All on the same page.</span></h2><p>From the first spark of an idea to the final finishing touch,<br />your entire creative process lives here.</p></div>
        {features}
      </section>
      <section className={styles.workflow} id="how-it-works">
        <div className={styles.workflowInner}>
          <div className={styles.workflowPreview}>
            <div className={styles.previewToolbar}><span><i /><i /><i /></span><span>My next great book</span><Cloud size={16} /></div>
            <div className={styles.previewCanvas}><div className={styles.pageThumbnails}><span>01</span><span>02</span><span>03</span></div><div className={styles.previewPage}><span>CHAPTER ONE</span><h3>A brighter<br />tomorrow.</h3><div className={styles.previewPhoto}><Image src="/images/book-types/guide.webp" alt="Travel guide cover in the book editor illustration" width={400} height={250} sizes="300px" /></div><p>Every great adventure begins with an idea.<br />This is where yours takes shape.</p><i /><i /></div></div>
            <div className={styles.previewPrompt}><Sparkles size={18} /><span>A little inspiration for your next chapter…</span><ArrowRight size={17} /></div>
          </div>
          <div className={styles.workflowCopy}><span className={styles.eyebrow}>YOUR IDEA, BROUGHT TO LIFE</span><h2>A beautiful book.<br /><span>Three simple steps.</span></h2><p>No complicated tools. No design experience needed.<br />Just you, your ideas, and a place to begin.</p>{steps}<Link href="/signup" className={styles.textLink}>Let’s make your first book <ArrowRight size={17} /></Link></div>
        </div>
      </section>
      <section className={styles.section} id="inspiration">
        <div className={styles.sectionHead}><span className={styles.eyebrow}>A LITTLE INSPIRATION GOES A LONG WAY</span><h2>One idea. <span>Endless possibilities.</span></h2><p>A story, a lesson, a fresh perspective. Give it a beautiful home.</p></div>
        <div className={styles.examples}>{examples.map(example => <Link href="/signup" key={example.type} className={styles.example}><div style={{ background: example.color }}><Image src={`/images/book-types/${example.type}.webp`} alt={`${example.label.toLowerCase()} cover design example`} width={400} height={250} sizes="(max-width: 680px) 90vw, 30vw" /></div><span>{example.label}</span><h3>{example.title}</h3><small>Make something like this <ArrowUpRight size={15} /></small></Link>)}</div>
      </section>
      <section className={`${styles.section} ${styles.audienceSection}`}><div className={styles.sectionHead}><span className={styles.eyebrow}>FOR THE CREATOR IN YOU</span><h2>You have something to share.<br /><span>Let’s make it happen.</span></h2></div>{audiences}</section>
      <section className={styles.pricingSection} id="pricing"><div className={styles.sectionHead}><span className={styles.eyebrow}>ROOM TO START. SPACE TO GROW.</span><h2>Your next chapter <span>starts free.</span></h2><p>Find a plan that fits your imagination. Make more when you’re ready.</p></div><div className={styles.pricingInner}>{pricing}</div></section>
      <section className={`${styles.section} ${styles.faqSection}`} id="faq"><div className={styles.sectionHead}><span className={styles.eyebrow}>GOOD QUESTIONS. SIMPLE ANSWERS.</span><h2>A little clarity,<br /><span>before you create.</span></h2><p>Still curious about something?<br /><Link href="/contact">We’re here to help <ArrowUpRight size={14} /></Link></p></div>{faq}</section>
      <section className={styles.finalCta}><span className={styles.eyebrow}><Sparkles size={16} /> THE NEXT CHAPTER IS YOURS</span><h2>That idea in your head?<br />Let’s turn it into <span>a book.</span></h2><p>A blank page, a little inspiration, and everything you need to begin.</p><Link className={styles.primary} href="/signup">Create your first book free <ArrowRight size={18} /></Link><small>No credit card. Just your imagination.</small></section>
    </main>
    <SiteFooter />
  </div>;
}
