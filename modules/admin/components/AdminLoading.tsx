import { LoaderCircle } from "lucide-react";

export default function AdminLoading({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={`fs-admin-loading${compact ? " fs-admin-loading-compact" : ""}`} role="status" aria-live="polite">
    <span className="fs-admin-loading-icon" aria-hidden="true"><LoaderCircle size={28} /></span>
    <strong>{label}</strong>
    <span className="fs-admin-loading-caption">Please wait while we fetch the latest data.</span>
  </div>;
}
