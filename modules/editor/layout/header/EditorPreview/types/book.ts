import type { SlideType } from "@editor/store/editorStore";

/** Preview pages use the editor's persisted slide schema. */
export type BookPageData = SlideType;
export type BookElementData = SlideType["elements"][number];
export type ViewMode = "flipbook" | "vertical" | "horizontal" | "index";
