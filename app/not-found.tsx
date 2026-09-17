import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return <main className="fs-app fs-message-page">
    <section>
      <span className="fs-message-icon"><Compass size={26} /></span>
      <h1>We cannot find that page</h1>
      <p className="fs-muted">The link may be broken, or the page may have been moved or deleted.</p>
      <div className="fs-row">
        <Link className="fs-btn fs-primary" href="/">Back to home</Link>
        <Link className="fs-btn fs-outline" href="/dashboard">My books</Link>
      </div>
    </section>
  </main>;
}
