import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@shared/auth";
import EditorWorkspace from "@editor/components/EditorWorkspace";
export const dynamic = "force-dynamic";


export default async function Page({
  params,
}: {
  params: Promise<{ bookId: string; slug?: string[] }>;
}) {
  const { bookId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    redirect(`/login?next=${encodeURIComponent(`/editor/${bookId}`)}`);
  return <EditorWorkspace key={bookId} id={bookId} userId={session.user.id} />;
}
