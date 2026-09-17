// User-facing site: marketing pages, auth and the signed-in workspace.
import "@shared/styles/app.css";
import "@shared/styles/ui.css";
import "@site/styles/site.css";
import "@site/styles/workspace.css";
import "@site/styles/ai-book-creator.css";
import "@site/styles/book-types.css";
import "@site/styles/book-agent.css";
import "@site/styles/publish.css";
import "@site/styles/library.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
