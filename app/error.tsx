"use client";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="fs-app fs-message-page">
    <section>
      <span className="fs-message-icon"><TriangleAlert size={26} /></span>
      <h1>Something went wrong</h1>
      <p className="fs-muted">The page could not be loaded. This is usually temporary — try again in a moment.</p>
      <div className="fs-row">
        <button className="fs-btn fs-primary" onClick={reset}><RotateCcw size={17} /> Try again</button>
        <Link className="fs-btn fs-outline" href="/dashboard">Go to my books</Link>
      </div>
      {error.digest && <small className="fs-muted">Reference: {error.digest}</small>}
    </section>
  </main>;
}
