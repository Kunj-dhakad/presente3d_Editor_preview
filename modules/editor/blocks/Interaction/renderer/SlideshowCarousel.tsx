"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

export type SlideshowCarouselProps = {
  images: string[];
  interval?: number;
  /** Auto-advance when true (preview / popup). */
  autoplay?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  borderRadius?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** Stop click from bubbling to parent drag/select handlers */
  stopPropagation?: boolean;
};

type Scale = {
  btn: number;
  icon: number;
  inset: number;
  dot: number;
  dotActive: number;
  bottom: number;
  gap: number;
};

const scaleFromWidth = (width: number): Scale => {
  // Tiny canvas elements → compact controls; large → roomier
  if (width < 120) {
    return { btn: 18, icon: 11, inset: 4, dot: 4, dotActive: 10, bottom: 6, gap: 3 };
  }
  if (width < 200) {
    return { btn: 22, icon: 13, inset: 5, dot: 5, dotActive: 12, bottom: 7, gap: 4 };
  }
  if (width < 360) {
    return { btn: 28, icon: 16, inset: 8, dot: 7, dotActive: 16, bottom: 10, gap: 6 };
  }
  return { btn: 34, icon: 18, inset: 12, dot: 8, dotActive: 18, bottom: 14, gap: 7 };
};

const SlideshowCarousel: React.FC<SlideshowCarouselProps> = ({
  images,
  interval = 3000,
  autoplay = true,
  showArrows = true,
  showDots = true,
  borderRadius = 0,
  className,
  style,
  stopPropagation = true,
}) => {
  const list = (images ?? []).filter(Boolean);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState<Scale>(() => scaleFromWidth(320));

  // Reset to the first slide when the image set changes. Done by adjusting
  // state during render (React's recommended pattern) rather than in an
  // effect, which avoided a cascading second render.
  const listKey = list.join("|");
  const [prevListKey, setPrevListKey] = useState(listKey);
  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setIndex(0);
  }

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const apply = (width: number) => setScale(scaleFromWidth(width));
    apply(el.clientWidth || 320);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      apply(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Only used by the arrow buttons, so it doesn't need memoizing.
  const go = (dir: -1 | 1) => {
    if (list.length <= 1) return;
    setIndex((current) => (current + dir + list.length) % list.length);
  };

  // `go` and `index` used to be dependencies here, so the interval was torn
  // down and recreated on every single slide change. The functional updater
  // means neither is needed.
  useEffect(() => {
    if (!autoplay || list.length <= 1) return;
    const ms = Math.max(1500, Number(interval) || 3000);
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % list.length);
    }, ms);
    return () => window.clearInterval(timer);
  }, [autoplay, interval, list.length]);

  const onNav = (event: React.SyntheticEvent, dir: -1 | 1) => {
    if (stopPropagation) {
      event.stopPropagation();
      event.preventDefault();
    }
    go(dir);
  };

  if (list.length === 0) {
    return (
      <div
        ref={rootRef}
        className={className}
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "#f1f5f9",
          color: "#64748b",
          borderRadius,
          boxSizing: "border-box",
          padding: 8,
          ...style,
        }}
      >
        <ImageIcon size={Math.max(18, scale.icon + 8)} strokeWidth={1.5} />
        <span
          style={{
            fontSize: Math.max(10, Math.min(13, scale.icon)),
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Add images
        </span>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        borderRadius,
        background: "#0f172a",
        userSelect: "none",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {list.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: i === index ? 1 : 0,
            transition: "opacity 0.35s ease",
            pointerEvents: "none",
          }}
        />
      ))}

      {showArrows && list.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => onNav(e, -1)}
            onPointerDown={(e) => stopPropagation && e.stopPropagation()}
            style={navBtnStyle("left", scale)}
          >
            <ChevronLeft size={scale.icon} />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => onNav(e, 1)}
            onPointerDown={(e) => stopPropagation && e.stopPropagation()}
            style={navBtnStyle("right", scale)}
          >
            <ChevronRight size={scale.icon} />
          </button>
        </>
      )}

      {showDots && list.length > 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: scale.bottom,
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: scale.gap,
            zIndex: 2,
            padding: "0 8px",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to image ${i + 1}`}
              onClick={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                setIndex(i);
              }}
              onPointerDown={(e) => stopPropagation && e.stopPropagation()}
              style={{
                width: i === index ? scale.dotActive : scale.dot,
                height: scale.dot,
                borderRadius: 999,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i === index ? "#ffffff" : "rgba(255,255,255,0.45)",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const navBtnStyle = (side: "left" | "right", scale: Scale): React.CSSProperties => ({
  position: "absolute",
  top: "50%",
  [side]: scale.inset,
  transform: "translateY(-50%)",
  width: scale.btn,
  height: scale.btn,
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
  flexShrink: 0,
});

export default SlideshowCarousel;
