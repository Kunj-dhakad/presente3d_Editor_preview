"use client";
import Link from "next/link";
import { Check, LoaderCircle } from "lucide-react";
import { PLAN_LIST } from "@shared/plans";
import { useUsage, UsageMeters } from "./Usage";

export default function Billing() {
  const { data, error } = useUsage();
  return <main className="fs-content">
    <span className="fs-eyebrow">PLAN &amp; BILLING</span>
    <h1>Your plan</h1>
    <p className="fs-muted">See what is included, how much you have used and upgrade when you need more.</p>
    {error && <p className="fs-alert" role="alert">{error}</p>}
    {!data ? <div className="fs-empty"><LoaderCircle className="fs-spin" /><p>Loading your plan…</p></div> : <>
      <section className="fs-settings-card fs-wide">
        <div className="fs-plan-current">
          <div><small className="fs-muted">Current plan</small><h2>{data.plan.name}</h2><p>{data.plan.price} <span className="fs-muted">{data.plan.period}</span></p></div>
          <Link href="/contact?topic=billing" className="fs-btn fs-outline">Billing question</Link>
        </div>
        <UsageMeters data={data} />
        <p className="fs-muted fs-small">Daily AI limits reset at 00:00 UTC. Storage includes files kept in your book history.</p>
      </section>
      <h2 className="fs-section-title">Compare plans</h2>
      <div className="fs-pricing fs-pricing-compact">
        {PLAN_LIST.map(plan => {
          const current = plan.id === data.plan.id;
          return <section key={plan.id} className={`fs-price-card${plan.highlight ? " fs-price-featured" : ""}`}>
            <h3>{plan.name}</h3>
            <p className="fs-price"><strong>{plan.price}</strong><span>{plan.period}</span></p>
            {current ? <span className="fs-btn fs-outline fs-current">Current plan</span>
              : <Link href={`/contact?topic=upgrade&plan=${plan.id}`} className={`fs-btn ${plan.highlight ? "fs-primary" : "fs-outline"}`}>{PLAN_LIST.indexOf(plan) > PLAN_LIST.findIndex(p => p.id === data.plan.id) ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}</Link>}
            <ul>{plan.features.map(f => <li key={f}><Check size={16} />{f}</li>)}</ul>
          </section>;
        })}
      </div>
      <p className="fs-muted fs-small">Online checkout is coming soon. Until then, send a plan request and our team will activate it on your account and share payment details by email.</p>
    </>}
  </main>;
}
