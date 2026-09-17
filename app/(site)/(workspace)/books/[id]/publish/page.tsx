import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@shared/auth";
import { coverUrl, ownedBook } from "@shared/server/books";
import { bookShare } from "@shared/server/shares";
import PublishBook from "@site/components/PublishBook";

export const metadata = { title: "Publish" };

/** Where the editor's Publish button lands: the book's link, share and embed tools. */
export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publish?: string }>;
}) {
  const [{ id }, { publish }, head] = await Promise.all([params, searchParams, headers()]);
  const session = await auth.api.getSession({ headers: head });
  if (!session) notFound();
  const book = await ownedBook(id, session.user.id).catch(() => null);
  if (!book) notFound();

  const title = String(book.title);
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || /^\d/.test(host);
  const protocol = head.get("x-forwarded-proto") ?? (local ? "http" : "https");

  return (
    <PublishBook
      book={{
        id: String(book.short_id ?? book.id),
        uuid: String(book.id),
        title,
        pages: Number(book.page_count),
        updatedAt: new Date(book.updated_at).toISOString(),
        leadForm: Boolean(book.lead_form),
        // A stored cover is used only while it still matches page 1.
        cover: book.cover_key && book.cover_hash === book.page_hash ? coverUrl(book) : null,
      }}
      initialShare={await bookShare(String(book.id), title)}
      origin={`${protocol}://${host}`}
      autoPublish={publish === "1"}
    />
  );
}
