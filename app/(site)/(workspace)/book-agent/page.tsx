import { headers } from "next/headers";
import { auth } from "@shared/auth";
import BookAgent from "@site/components/BookAgent";

export const metadata = { title: "Book Agent" };

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  return <BookAgent userName={session?.user.name ?? ""} />;
}
