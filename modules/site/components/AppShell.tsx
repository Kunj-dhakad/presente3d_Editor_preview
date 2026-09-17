"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CreditCard, Settings, CircleHelp,
  LogOut, Menu, X, Bot, Users, BriefcaseBusiness, ChevronRight, Sparkles,
} from "lucide-react";
import { authClient } from "@shared/auth-client";
import { FavoritesProvider } from "./Favorites";
import { BrandMark } from "@shared/components/BrandMark";
import { SITE } from "@shared/site";

const NAV = [
  { href: "/dashboard", name: "Dashboard", icon: LayoutDashboard },
  { href: "/book-agent", name: "Book Agent", icon: Bot },
  { href: "/books", name: "AI Books", icon: Sparkles },
  { href: "/leads", name: "Leads", icon: Users },
  { href: "/agency", name: "Agency", icon: BriefcaseBusiness },
  { href: "/settings", name: "Settings", icon: Settings },
];

// The admin console is reached only at /admin/login — it is never linked from the workspace.
export default function AppShell({ user, children }: { user: { id: string; name: string; email: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = user.name.slice(0, 1).toUpperCase();
  const activeHref = NAV.filter(item => path === item.href || path.startsWith(item.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return <FavoritesProvider userId={user.id}><div className="fs-app fs-workspace">
    <button className="fs-shell-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(v => !v)}>
      {open ? <X size={20} /> : <Menu size={20} />}
    </button>

    <aside className={`fs-sidebar${open ? " fs-sidebar-open" : ""}`}>
      <Link href="/dashboard" className="fs-brand fs-sidebar-brand" onClick={() => setOpen(false)}><BrandMark /> {SITE.name}</Link>

      <Link href="/settings" className="fs-workspace-chip" onClick={() => setOpen(false)}>
        <span className="fs-workspace-icon"><BriefcaseBusiness size={21} /></span>
        <div><strong>{user.name}</strong></div><ChevronRight size={18} />
      </Link>

      <nav aria-label="Workspace navigation">
        {NAV.map(item => (
          <Link key={item.href} href={item.href} aria-current={item.href === activeHref ? "page" : undefined} className={item.href === activeHref ? "active" : ""} onClick={() => setOpen(false)}>
            <item.icon size={19} />{item.name}
          </Link>
        ))}
      </nav>

      <div className="fs-sidebar-foot">
        <div className="fs-sidebar-utilities">
          <Link href="/billing" onClick={() => setOpen(false)} aria-current={path === "/billing" ? "page" : undefined}><CreditCard size={15} /> Plans</Link>
          <Link href="/help" onClick={() => setOpen(false)} aria-current={path === "/help" ? "page" : undefined}><CircleHelp size={15} /> Help</Link>
        </div>
        <div className="fs-account">
          <span className="fs-avatar">{initial}</span>
          <Link href="/settings" onClick={() => setOpen(false)}><strong>{user.name}</strong><small>{user.email}</small></Link>
          <button aria-label="Log out" title="Log out" onClick={async () => { await authClient.signOut(); sessionStorage.clear(); router.push("/login"); router.refresh(); }}><LogOut size={18} /></button>
        </div>
      </div>
    </aside>

    {open && <button className="fs-shell-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
    <div className="fs-workspace-main">{children}</div>
  </div></FavoritesProvider>;
}
