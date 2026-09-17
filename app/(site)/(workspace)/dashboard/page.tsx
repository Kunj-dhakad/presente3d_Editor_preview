import { headers } from "next/headers";
import { auth } from "@shared/auth";
import Dashboard from "@site/components/Dashboard";

export const metadata = { title: "Dashboard" };

export default async function Page() {
  // The name comes from the server so the greeting is identical in both renders.
  const session = await auth.api.getSession({ headers: await headers() });
  return <Dashboard name={session?.user.name ?? ""} />;
}
