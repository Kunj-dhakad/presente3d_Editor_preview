import type { Breakpoint } from "./useBreakpoint";

/**
 * How big each piece of editor chrome is at each width.
 *
 * Every number here used to be a percentage of the viewport, which meant the
 * chrome grew on a big screen and shrank on a small one — exactly backwards.
 * A header needs the height its logo and buttons need and not a pixel more,
 * whatever the monitor; the canvas is the only region that should absorb what
 * is left over.
 */

/* ==================== VERTICAL ==================== */
/* Fixed at every width, because the content inside them is fixed. */

/**
 * Every control in the header — logo, buttons, theme toggle, the title box —
 * is 32px tall, so this is that plus 6px of air above and below.
 *
 * It replaces `h-[6.5%]`, which came out at 47px on a 720px laptop and 94px on
 * a 1440px monitor for exactly the same 32px of content. 44 is under the old
 * figure at every common laptop height, so the bar never grows on the screens
 * that had the least room to give.
 */
export const HEADER_H = 44;

/**
 * Every element toolbar is `h-10 mt-4` — 40px of bar under a 16px gap — so 56
 * is exactly what the row holds, and anything less clips it.
 *
 * The old `h-[8%]` gave 58px on a 720px laptop, which is where this number has
 * to sit under: rounding up to a comfortable 60 made the bar taller on the one
 * screen that could least afford it.
 */
export const TOOLBAR_H = 56;

/** The footer's own row is `h-[35px]`. */
export const FOOTER_H = 40;

/* ==================== HORIZONTAL ==================== */

/**
 * The icon rail's own content width, measured in the browser: the column
 * inside it reports a scrollWidth of 81px once its longest label is laid out.
 *
 * `w-[5%]` gave that column 68px on a 1366 laptop and 96px on a 1920 monitor,
 * so the labels were quietly clipped on every screen below about 1620px.
 */
const NAV_W = 84;

export type ShellMetrics = {
  /** Left icon rail. 0 where the nav becomes a bottom tab bar instead. */
  navW: number;
  /** Asset / edit panel. Below ~260 the two-column asset grid stops working. */
  panelW: number;
  /**
   * Slide + layers rail. 0 where it becomes a horizontal filmstrip. Never
   * below 172: the pages list inside it is 155px plus its own margins.
   */
  railW: number;
};

const METRICS: Record<Breakpoint, ShellMetrics> = {
  // Both of these run the stacked shell — bottom tab bar, panel sheet,
  // filmstrip — so they have no column widths to give.
  phone: { navW: 0, panelW: 0, railW: 0 },
  tabletPortrait: { navW: 0, panelW: 0, railW: 0 },

  tabletLandscape: { navW: NAV_W, panelW: 260, railW: 172 },
  laptop: { navW: NAV_W, panelW: 300, railW: 172 },

  // Deliberately not larger than laptop by much: a two-column asset grid gains
  // nothing from 550px, and every pixel spent here is taken from the page.
  large: { navW: NAV_W, panelW: 340, railW: 200 },
};

export const shellMetrics = (bp: Breakpoint): ShellMetrics => METRICS[bp];

/**
 * Widest the canvas column is allowed to get before it stops centring and
 * starts stranding the page in a corner of an ultrawide monitor.
 */
export const CANVAS_MAX_W = 1600;

/* ==================== NARROW SHELL ==================== */

/** Bottom tab bar, before the device's own safe-area inset is added. */
export const TABBAR_H = 56;
/** Horizontal slide filmstrip. */
export const FILMSTRIP_H = 76;
/** The element toolbar when it sits above the tab bar as a scrolling strip. */
export const MOBILE_TOOLBAR_H = 52;
