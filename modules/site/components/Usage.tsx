"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { formatBytes, type Plan } from "@shared/plans";

export type AccountUsage = {
  plan: Plan;
  suspended: boolean;
  usage: {
    books: number;
    storageBytes: number;
    aiToday: number;
    videoToday: number;
  };
  checklist: {
    createdBook: boolean;
    editedBook: boolean;
    uploadedMedia: boolean;
    exported: boolean;
    shared: boolean;
  };
};

export function useUsage() {
  const [data, setData] = useState<AccountUsage | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/account/usage", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load usage.");
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, reload };
}

function Meter({
  label,
  used,
  limit,
  format = String,
}: {
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
}) {
  const pct = Math.min(100, limit ? (used / limit) * 100 : 0);
  return (
    <div
      className={`fs-meter${pct >= 90 ? " fs-meter-full" : pct >= 70 ? " fs-meter-warn" : ""}`}
    >
      <div>
        <span>{label}</span>
        <strong>
          {format(used)} <small>/ {format(limit)}</small>
        </strong>
      </div>
      <progress
        value={pct}
        max={100}
        aria-label={`${label}: ${Math.round(pct)}% used`}
      />
    </div>
  );
}

export function UsageMeters({ data }: { data: AccountUsage }) {
  const { plan, usage } = data;
  return (
    <div className="fs-meters">
      <Meter label="Books" used={usage.books} limit={plan.limits.books} />
      <Meter
        label="AI actions today"
        used={usage.aiToday}
        limit={plan.limits.aiDaily}
      />
      <Meter
        label="AI videos today"
        used={usage.videoToday}
        limit={plan.limits.videoDaily}
      />
      <Meter
        label="Media storage"
        used={usage.storageBytes}
        limit={plan.limits.storageBytes}
        format={formatBytes}
      />
    </div>
  );
}

const steps: {
  key: keyof AccountUsage["checklist"];
  label: string;
  hint: string;
}[] = [
  {
    key: "createdBook",
    label: "Create your first book",
    hint: "Use the New book button.",
  },
  {
    key: "editedBook",
    label: "Add content to a page",
    hint: "Open the editor and add text or a layout.",
  },
  {
    key: "uploadedMedia",
    label: "Upload an image or video",
    hint: "Use Uploads in the editor sidebar.",
  },
  {
    key: "exported",
    label: "Export a PDF or PowerPoint",
    hint: "Use Export in the editor header.",
  },
  {
    key: "shared",
    label: "Publish a reader link",
    hint: "Use Publish in the editor header.",
  },
];

export function GettingStarted({ data }: { data: AccountUsage }) {
  const storageKey = "fs-onboarding-dismissed";
  // Only mounted after usage loads in the browser, so localStorage is safe here.
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const done = steps.filter((s) => data.checklist[s.key]).length;
  if (hidden || done === steps.length) return null;
  return (
    <section className="fs-onboarding" aria-label="Getting started">
      <button
        className="fs-modal-close"
        aria-label="Hide getting started"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(storageKey, "1");
          } catch {}
        }}
      >
        <X size={18} />
      </button>
      <div className="fs-onboarding-head">
        <span className="fs-eyebrow">GETTING STARTED</span>
        <h2>
          {done} of {steps.length} steps done
        </h2>
        <progress
          value={done}
          max={steps.length}
          aria-label="Onboarding progress"
        />
      </div>
      <ol>
        {steps.map((s) => (
          <li key={s.key} className={data.checklist[s.key] ? "done" : ""}>
            {data.checklist[s.key] ? (
              <CheckCircle2 size={18} />
            ) : (
              <Circle size={18} />
            )}
            <span>
              <strong>{s.label}</strong>
              <small>{s.hint}</small>
            </span>
          </li>
        ))}
      </ol>
      <Link href="/help" className="fs-text-link">
        Read the getting-started guide
      </Link>
    </section>
  );
}
