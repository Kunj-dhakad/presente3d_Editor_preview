"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};

export default function PopupPortal({ children }: { children: ReactNode }) {
 
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
