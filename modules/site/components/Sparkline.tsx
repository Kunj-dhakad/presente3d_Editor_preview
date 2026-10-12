"use client";
import { useState } from "react";

export type Point = { label: string; value: number };

/**
 * Daily counts, so bars rather than a line: most days are zero and a line
 * through zeros reads as a trend that is not there. One series, so no legend —
 * the card title names it — and no axis: the hovered bar gives the number.
 */
export default function Sparkline({
  points,
  ariaLabel,
}: {
  points: Point[];
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div className="fs-spark-empty" aria-hidden />;

  const max = Math.max(1, ...points.map((p) => p.value));
  const active = hover === null ? null : points[hover];

  return (
    <div
      className="fs-spark"
      role="img"
      aria-label={ariaLabel}
      onMouseLeave={() => setHover(null)}
    >
      <div className="fs-spark-bars">
        {points.map((point, i) => (
          <button
            key={point.label}
            type="button"
            tabIndex={-1}
            aria-label={`${point.label}: ${point.value}`}
            className={hover === i ? "on" : ""}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
          >
            <i
              style={{
                height: `${point.value ? Math.max(8, (point.value / max) * 100) : 3}%`,
              }}
              data-empty={point.value ? undefined : true}
            />
          </button>
        ))}
      </div>
      <div className="fs-spark-axis">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
      {active && (
        <span
          className="fs-spark-tip"
          style={{ left: `${((hover! + 0.5) / points.length) * 100}%` }}
        >
          {active.value} · {active.label}
        </span>
      )}
    </div>
  );
}
