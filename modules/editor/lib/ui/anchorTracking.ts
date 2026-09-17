"use client";

import useEditorUIStore from "@editor/store/useEditorUIStore";

/**
 * Keeps a floating popup pinned to the element it belongs to.
 *
 * Every edit popup used to do this with an endless `requestAnimationFrame`
 * loop: 60 `getBoundingClientRect()` reads and 60 React state updates a second,
 * for as long as the popup stayed open, whether anything had moved or not. That
 * is the single hottest thing in the editor when a panel is open.
 *
 * This watches for the events that can actually move the anchor instead:
 *
 * - scroll (capture, so scrolling *any* container counts) and window resize
 * - the canvas zoom level, which moves everything without firing either
 * - the anchor's own size (ResizeObserver)
 * - direct style/class writes on the anchor, which is how dragging moves an
 *   element (MutationObserver)
 *
 * Returns the unsubscribe function, so callers can hand it straight back from
 * their effect.
 */
export function trackAnchor(target: Element, onMove: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  // A scroll or a mutation can arrive several times in one frame; coalesce so
  // the anchor is measured once per frame at most.
  let frame: number | null = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      onMove();
    });
  };

  window.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);

  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(target);

  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(target, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  // Canvas zoom moves every element without a scroll or resize event.
  const unsubscribeZoom = useEditorUIStore.subscribe((state, previous) => {
    if (state.MainCanvasScale !== previous.MainCanvasScale) schedule();
  });

  return () => {
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    unsubscribeZoom();
  };
}

/**
 * `setPos`-style updater that keeps the previous object when nothing moved, so
 * a scroll that does not shift the anchor costs no re-render.
 */
export function samePosition(
  previous: { top: number; left: number; visible?: boolean },
  top: number,
  left: number,
): boolean {
  return (
    Math.abs(previous.top - top) < 0.5 &&
    Math.abs(previous.left - left) < 0.5 &&
    previous.visible !== false
  );
}
