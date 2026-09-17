import CreateBook from "@site/components/CreateBook";
export const metadata = { title: "Create a book" };
export default async function Page({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const initialTemplate = template && ["guide", "story", "workbook"].includes(template) ? template : "blank";
  return <main className="fs-content fs-dash"><section className="fs-dash-head"><div><h1>Create a Book</h1><p className="fs-muted">Start fresh or make a template your own.</p></div></section><CreateBook key={initialTemplate} initialTemplate={initialTemplate} /></main>;
}
