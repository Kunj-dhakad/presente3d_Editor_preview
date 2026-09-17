"use client";

import { useSyncExternalStore } from "react";

/**
 * The five widths the editor shell is designed against.
 *
 * The old layout sized every region as a percentage of the viewport, which put
 * the chrome on the wrong side of the trade: the nav rail and tool panel shrank
 * below usable on a tablet and sprawled on a wide monitor, while the slide rail
 * — the one region that should give way — was pinned at a fixed 172px and so
 * ate the most space exactly where there was least. Naming the steps here lets
 * the shell hand fixed sizes to the chrome and the remainder to the canvas.
 */
export type Breakpoint =
  | "phone"
  | "tabletPortrait"
  | "tabletLandscape"
  | "laptop"
  | "large";

/** Lower bound of each step, in CSS pixels. Mirrored in globals.css `@theme`. */
export const BREAKPOINT_MIN: Record<Breakpoint, number> = {
  phone: 0,
  tabletPortrait: 768,
  tabletLandscape: 1024,
  laptop: 1280,
  large: 1920,
};

/** Widest first, so the first match is the right one. */
const ORDER: Breakpoint[] = [
  "large",
  "laptop",
  "tabletLandscape",
  "tabletPortrait",
  "phone",
];

/**
 * What the server renders. There is no viewport to measure during SSR, and the
 * desktop shell is both the most common case and the one that degrades most
 * gracefully if the first client paint corrects it.
 */
const SERVER_BREAKPOINT: Breakpoint = "laptop";

const queries = ORDER.filter((step) => BREAKPOINT_MIN[step] > 0).map((step) => ({
  step,
  query: `(min-width: ${BREAKPOINT_MIN[step]}px)`,
}));

let mediaQueryLists: { step: Breakpoint; mql: MediaQueryList }[] | null = null;

const lists = () => {
  if (!mediaQueryLists) {
    mediaQueryLists = queries.map(({ step, query }) => ({
      step,
      mql: window.matchMedia(query),
    }));
  }
  return mediaQueryLists;
};

const subscribe = (onChange: () => void) => {
  const all = lists();
  all.forEach(({ mql }) => mql.addEventListener("change", onChange));
  return () => {
    all.forEach(({ mql }) => mql.removeEventListener("change", onChange));
  };
};

const readBreakpoint = (): Breakpoint => {
  const hit = lists().find(({ mql }) => mql.matches);
  return hit ? hit.step : "phone";
};

// useSyncExternalStore compares snapshots by identity, and these are strings,
// so no caching layer is needed for it to settle.
const getSnapshot = () => readBreakpoint();
const getServerSnapshot = () => SERVER_BREAKPOINT;

/** The current step. Re-renders only when the step itself changes. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * True where the shell stacks instead of sitting in columns — phone and tablet
 * held upright. This is the single test the layout branches on; everything
 * wider keeps the four-column shell and only changes its measurements.
 */
export function useIsNarrow(): boolean {
  const bp = useBreakpoint();
  return bp === "phone" || bp === "tabletPortrait";
}
