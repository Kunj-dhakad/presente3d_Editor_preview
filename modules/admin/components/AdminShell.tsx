"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Receipt, Mail, MessageSquare, ShieldCheck, Package, ToggleRight, Layers, Gauge, ShoppingBag, LogOut, PanelsTopLeft } from "lucide-react";
import { BrandMark } from "@shared/components/BrandMark";

// The sections the reference BMS runs, in its order.
const NAV = [
  { href: "/admin", name: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", name: "Users", icon: Users },
  { href: "/admin/packages", name: "Packages", icon: Package },
  { href: "/admin/package-fields", name: "Package fields", icon: Gauge },
  { href: "/admin/features", name: "Features", icon: ToggleRight },
  { href: "/admin/feature-plans", name: "Feature plans", icon: Layers },
  { href: "/admin/purchases", name: "Purchases", icon: ShoppingBag },
  { href: "/admin/orders", name: "Orders", icon: Receipt },
  { href: "/admin/emails", name: "Email templates", icon: Mail },
  { href: "/admin/messages", name: "Messages", icon: MessageSquare },
  { href: "/admin/admins", name: "Team", icon: ShieldCheck },
  { href: "/admin/sales-page-builder", name: "Sales Page Builder", icon: PanelsTopLeft },
];

export default function AdminShell({ admin, children }: { admin: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const path = usePathname();
  const editor = path === "/admin/sales-page-builder";
  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }
  return <div className={`fs-app fs-bms${editor ? " fs-bms-editor" : ""}`}>
    {!editor && <aside className="fs-bms-sidebar">
      <Link href="/admin" className="fs-brand fs-bms-brand"><BrandMark /> Administration</Link>
      <span className="fs-nav-label">MANAGEMENT</span>
      <nav aria-label="Administration">{NAV.map(item => {
        const active = item.href === "/admin" ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
        return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><item.icon size={19} />{item.name}</Link>;
      })}</nav>
      <div className="fs-bms-foot">
        <div className="fs-account">
          <span className="fs-avatar">{admin.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{admin.name}</strong><small>{admin.role === "owner" ? "Owner" : "Manager"} · {admin.email}</small></div>
          <button aria-label="Log out" title="Log out" onClick={signOut}><LogOut size={18} /></button>
        </div>
      </div>
    </aside>}
    <div className="fs-bms-main">{children}</div>
  </div>;
}
