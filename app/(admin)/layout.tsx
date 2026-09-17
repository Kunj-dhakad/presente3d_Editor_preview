// Admin console (BMS) — separate shell, styles and navigation from the user site.
import "@shared/styles/app.css";
import "@shared/styles/ui.css";
import "@admin/styles/admin.css";

export default function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
