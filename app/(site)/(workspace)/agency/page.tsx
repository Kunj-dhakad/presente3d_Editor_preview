import Link from "next/link";
import { ArrowRight, Library, Users, Share2 } from "lucide-react";
export const metadata = { title: "Agency" };
export default function Page() {
  return <main className="fs-content fs-dash"><section className="fs-dash-head"><div><h1>Agency</h1><p className="fs-muted">Create books for your clients and keep reader responses in one place.</p></div></section>
    <section className="fs-page-panel"><h2>From client brief to published book</h2><p>Build a book for each project, customize it in the editor, then publish a reader link to share with your client.</p><Link className="fs-btn fs-primary" href="/books/new">Create a client book <ArrowRight size={16} /></Link></section>
    <div className="fs-page-grid">
      <section className="fs-page-panel"><Library size={32} /><h2>Client books</h2><p>Find, rename and duplicate books for your next client project.</p><Link className="fs-btn fs-outline" href="/books">Open library <ArrowRight size={16} /></Link></section>
      <section className="fs-page-panel"><Users size={32} /><h2>Reader leads</h2><p>Review contact forms, questions and quiz responses from your published books.</p><Link className="fs-btn fs-outline" href="/leads">View responses <ArrowRight size={16} /></Link></section>
      <section className="fs-page-panel"><Share2 size={32} /><h2>Publishing guide</h2><p>Learn how to export your work and manage public reader links.</p><Link className="fs-btn fs-outline" href="/help">Read the guide <ArrowRight size={16} /></Link></section>
    </div>
  </main>;
}
