import Landing from "@site/components/Landing";
import SalesPageView from "@site/components/SalesPageView";
import { publishedSalesPage } from "@shared/server/salesPage";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const page = await publishedSalesPage();
  return page ? { title: { absolute: page.title }, description: page.description, openGraph: { type: "website" as const, title: page.title, description: page.description, siteName: page.brand, url: "/" }, twitter: { card: "summary_large_image" as const, title: page.title, description: page.description } } : {};
}
export default async function Page() {
  const page = await publishedSalesPage();
  return page ? <SalesPageView page={page} /> : <Landing />;
}
