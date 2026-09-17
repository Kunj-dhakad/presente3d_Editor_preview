import React from "react";

/**
 * Ye panels pehle har block (Image / Video / Shape / Sticker / Button) me
 * alag-alag copy hote the — 30 files, ek jaisa code. Ab ek hi jagah hain
 * aur data ke type par generic hain, isliye har block apna hi
 * `ImageData` / `ShapeData` / ... pass kar sakta hai.
 */
export interface PanelProps<T> {
  data: T;
  updateButton: (patch: Partial<T>) => void;
  targetRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * TS ko ye nahi pata chalta ki `{ opacity: 0.5 }` har `Partial<T>` me
 * fit hoga, kyunki T ka opacity aur narrow ho sakta hai. Panels sirf
 * apne hi field ko chhoote hain, isliye yahan ek jagah cast kar liya —
 * har call site par `as` bikherne se behtar hai.
 */
export const patchOf = <T,>(patch: Record<string, unknown>): Partial<T> =>
  patch as Partial<T>;
