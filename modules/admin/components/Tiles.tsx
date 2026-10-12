import { ChartNoAxesCombined, CircleCheck, CirclePause } from "lucide-react";

/** Summary cards shared by the admin screens. */
export default function Tiles({ items }: { items: [string, number | string][] }) {
  return <section className="fs-admin-stats fs-admin-stats-sm">
    {items.map(([label, value]) => {
      const Icon = label === "Active" ? CircleCheck : label === "Inactive" ? CirclePause : ChartNoAxesCombined;
      return <div key={label} className={label === "Active" ? "fs-stat-active" : label === "Inactive" ? "fs-stat-inactive" : ""}><span className="fs-stat-icon" aria-hidden="true"><Icon size={20} /></span><small>{label}</small><strong>{value}</strong></div>;
    })}
  </section>;
}
