/** How the reader lays the pages out. */
export type ViewMode = "flipbook" | "vertical" | "horizontal" | "index";

/** Where the reader is mounted, which decides whether it owns the viewport. */
export type PreviewMode = "page" | "modal";

/** Narration state surfaced on the toolbar. */
export interface NarrationState {
  isSpeaking: boolean;
  isPaused: boolean;
  speakingBlockId: string | null;
  message: string;
}

export interface ToolbarActions {
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (level: number) => void;
  reset: () => void;
  speak: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}
