import { redirect } from "next/navigation";

/** Book previews open full page in their own tab now. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/preview/${encodeURIComponent(id)}`);
}
