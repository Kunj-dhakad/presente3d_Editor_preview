"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

export interface SlideshowCarouselProps {
  images: string[];
  interval?: number;
  autoplay?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  borderRadius?: number | string;
}

interface ControlScale {
  button: number;
  icon: number;
  inset: number;
  dot: number;
  dotActive: number;
  bottom: number;
  gap: number;
}


const scaleFromWidth = (width: number): ControlScale => {
  if (width < 120)
    return { button: 18, icon: 11, inset: 4, dot: 4, dotActive: 10, bottom: 6, gap: 3 };
  if (width < 200)
    return { button: 22, icon: 13, inset: 5, dot: 5, dotActive: 12, bottom: 7, gap: 4 };
  if (width < 360)
    return { button: 28, icon: 16, inset: 8, dot: 7, dotActive: 16, bottom: 10, gap: 6 };
  return { button: 34, icon: 18, inset: 12, dot: 8, dotActive: 18, bottom: 14, gap: 7 };
};

const navButtonStyle = (
  side: "left" | "right",
  scale: ControlScale,
): React.CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: scale.inset,
  transform: "translateY(-50%)",
  width: scale.button,
  height: scale.button,
  borderRadius: "50%",
  border: "none",
  background: "rgba(15, 23, 42, 0.55)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 2,
  backdropFilter: "blur(4px)",
});

export default function SlideshowCarousel({
  images,
  interval = 3000,
  autoplay = true,
  showArrows = true,
  showDots = true,
  borderRadius = 0,
}: SlideshowCarouselProps) {
  const list = (images ?? []).filter(Boolean);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState<ControlScale>(() => scaleFromWidth(320));

  const listKey = list.join("|");
  const [previousKey, setPreviousKey] = useState(listKey);
  if (listKey !== previousKey) {
    setPreviousKey(listKey);
    setIndex(0);
  }

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
   
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setScale(scaleFromWidth(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || list.length <= 1) return;
    const ms = Math.max(1500, Number(interval) || 3000);
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % list.length),
      ms,
    );
    return () => window.clearInterval(timer);
  }, [autoplay, interval, list.length]);

  const go = (event: React.SyntheticEvent, direction: -1 | 1) => {
    event.stopPropagation();
    event.preventDefault();
    if (list.length <= 1) return;
    setIndex((current) => (current + direction + list.length) % list.length);
  };

  if (list.length === 0) {
    return (
      <div
        ref={rootRef}
        className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-2 bg-slate-100 p-2 text-slate-500"
        style={{ borderRadius }}
      >
        <ImageIcon size={Math.max(18, scale.icon + 8)} strokeWidth={1.5} />
        <span className="text-center text-xs font-medium">No images</span>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full min-w-0 select-none overflow-hidden bg-slate-900"
      style={{ borderRadius }}
    >
      {list.map((src, position) => (
        // Exported books carry absolute/blob URLs next/image can't optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${src}-${position}`}
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: position === index ? 1 : 0 }}
        />
      ))}

      {showArrows && list.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => go(event, -1)}
            onPointerDown={(event) => event.stopPropagation()}
            style={navButtonStyle("left", scale)}
          >
            <ChevronLeft size={scale.icon} />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => go(event, 1)}
            onPointerDown={(event) => event.stopPropagation()}
            style={navButtonStyle("right", scale)}
          >
            <ChevronRight size={scale.icon} />
          </button>
        </>
      )}

      {showDots && list.length > 1 && (
        <div
          className="absolute left-0 right-0 z-2 flex max-w-full flex-wrap justify-center px-2"
          style={{ bottom: scale.bottom, gap: scale.gap }}
        >
          {list.map((_, position) => (
            <button
              key={position}
              type="button"
              aria-label={`Go to image ${position + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setIndex(position);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="shrink-0 rounded-full border-0 p-0 transition-all"
              style={{
                width: position === index ? scale.dotActive : scale.dot,
                height: scale.dot,
                background:
                  position === index ? "#ffffff" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
