"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessageSquare, LogOut, ExternalLink } from "lucide-react";
import { BrandMark } from "@shared/components/BrandMark";
import { authClient } from "@shared/auth-client";

const NAV = [
  { href: "/admin", name: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", name: "Accounts", icon: Users },
  { href: "/admin/messages", name: "Messages", icon: MessageSquare },
];

export default function AdminShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const path = usePathname();
  return <div className="fs-app fs-bms">
    <aside className="fs-bms-sidebar">
      <Link href="/admin" className="fs-brand fs-bms-brand"><BrandMark /> BMS</Link>
      <span className="fs-nav-label">MANAGEMENT</span>
      <nav>{NAV.map(item => <Link key={item.href} href={item.href} className={path === item.href ? "active" : ""}><item.icon size={19} />{item.name}</Link>)}</nav>
      <div className="fs-bms-foot">
        <Link href="/dashboard"><ExternalLink size={15} /> Open user workspace</Link>
        <div className="fs-account">
          <span className="fs-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.name}</strong><small>{user.email}</small></div>
          <button aria-label="Log out" title="Log out" onClick={async () => { await authClient.signOut(); window.location.assign("/admin/login"); }}><LogOut size={18} /></button>
        </div>
      </div>
    </aside>
    <div className="fs-bms-main">{children}</div>
  </div>;
}
