import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@shared/auth";
import { ownedBook } from "@shared/server/books";
import { previewPath, slugify } from "@shared/bookUrl";
import OwnerPreview from "@site/components/OwnerPreview";

export const metadata = { title: "Book preview — AI Book Creator", robots: { index: false, follow: false } };

/**
 * The owner's full-page preview of a book, opened in its own tab from the
 * library: /preview/<id>/<title>. Reading here is not counted as a view.
 */
export default async function Page({ params }: { params: Promise<{ id: string; slug?: string[] }> }) {
  const [{ id, slug }, head] = await Promise.all([params, headers()]);
  const session = await auth.api.getSession({ headers: head });
  if (!session) redirect(`/login?next=${encodeURIComponent(`/preview/${id}`)}`);
  const book = await ownedBook(id, session.user.id).catch(() => null);
  if (!book) notFound();
  const title = String(book.title);
  const canonical = previewPath({ id: String(book.id), short_id: book.short_id, title });
  // Keep the title in the address, and follow renames.
  if (slug?.[0] !== slugify(title) || String(book.short_id ?? book.id) !== id) redirect(canonical);
  return <OwnerPreview id={String(book.short_id ?? book.id)} />;
}
