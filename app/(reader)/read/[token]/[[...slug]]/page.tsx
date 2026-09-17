import { BookPreview } from "@reader/index";

export const metadata = { title: "Read a book — AI Book Creator", robots: { index: false, follow: false } };

// The trailing segment is the book title, kept readable in the URL:
//   /read/k7m2x9qp4t/celebrating-diwali
export default async function Page({ params }: { params: Promise<{ token: string; slug?: string[] }> }) {
  const { token } = await params;
  return <BookPreview jsonUrl={`/api/read/${encodeURIComponent(token)}`} mode="page" engagementToken={token} />;
}
