import { create } from "zustand";
import type { GuideLine, SpacingHint } from "@editor/lib/canvas/snapping";

/**
 * The alignment guides currently on screen.
 *
 * These live in their own store rather than in the editor's, because a drag
 * deliberately never re-renders the elements it is moving — the rect is written
 * straight to the DOM instead. Only the thin overlay listens here, so guides
 * can follow the pointer without dragging a page full of charts and tables
 * through React on every move.
 */

type SnapGuideState = {
  /** Which slide the guides belong to; nothing is drawn on the others. */
  slideIndex: number | null;
  guides: GuideLine[];
  spacing: SpacingHint[];
  show: (slideIndex: number, guides: GuideLine[], spacing: SpacingHint[]) => void;
  clear: () => void;
};

const sameGuides = (a: GuideLine[], b: GuideLine[]) =>
  a.length === b.length &&
  a.every((g, i) => g.axis === b[i].axis && g.at === b[i].at && g.from === b[i].from && g.to === b[i].to);

const sameSpacing = (a: SpacingHint[], b: SpacingHint[]) =>
  a.length === b.length &&
  a.every((s, i) => s.axis === b[i].axis && s.gap === b[i].gap && s.from === b[i].from && s.to === b[i].to);

const useSnapGuideStore = create<SnapGuideState>((set, get) => ({
  slideIndex: null,
  guides: [],
  spacing: [],
  show: (slideIndex, guides, spacing) => {
    // Most of a drag crosses open space with nothing to line up against.
    // Skipping the identical update keeps those moves free of a re-render.
    const current = get();
    if (
      current.slideIndex === slideIndex &&
      sameGuides(current.guides, guides) &&
      sameSpacing(current.spacing, spacing)
    )
      return;
    set({ slideIndex, guides, spacing });
  },
  clear: () => {
    if (get().slideIndex === null && get().guides.length === 0) return;
    set({ slideIndex: null, guides: [], spacing: [] });
  },
}));

export default useSnapGuideStore;
