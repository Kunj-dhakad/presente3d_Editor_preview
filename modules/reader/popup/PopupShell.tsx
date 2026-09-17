"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { X } from "lucide-react";
import PopupPortal from "./PopupPortal";
import { createMediaQuery } from "../utils/storedValue";

const reducedMotionQuery = createMediaQuery("(prefers-reduced-motion: reduce)");

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  label?: string;
}

const OPEN_DURATION = 300;
const CLOSE_DURATION = 200;

/**
 * The one dialog frame every reader popup uses:
 * - Portalled to <body>
 * - Animated backdrop
 * - Animated popup panel
 * - Backdrop click and Escape both close
 * - Exit animation completes before the parent is notified
 * - Panel is capped against the viewport so long forms scroll inside
 */
export default function PopupShell({
  onClose,
  children,
  maxWidth = 320,
  label = "Dialog",
}: Props) {
  const [hasEntered, setHasEntered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    reducedMotionQuery.subscribe,
    reducedMotionQuery.read,
    reducedMotionQuery.readServer,
  );
  /* Reduced motion skips the entrance animation entirely. */
  const isVisible = prefersReducedMotion || hasEntered;

  // Trigger entrance animation after the popup has mounted
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    },
    [],
  );

  const handleClose = useCallback(() => {
    // Prevent multiple close triggers while the exit animation is running.
    if (closeTimerRef.current != null) return;

    // Reduced-motion users get an instant close.
    if (prefersReducedMotion) {
      onCloseRef.current();
      return;
    }

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onCloseRef.current();
    }, CLOSE_DURATION);
  }, [prefersReducedMotion]);

  // Escape closes the popup
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // The reader's own Escape handler would close the whole preview.
      event.stopPropagation();

      handleClose();
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [handleClose]);

  const animationTransition = prefersReducedMotion
    ? "none"
    : isClosing
      ? `opacity ${CLOSE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1),
         transform ${CLOSE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : `opacity ${OPEN_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1),
         transform ${OPEN_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  const backdropTransition = prefersReducedMotion
    ? "none"
    : `opacity ${
        isClosing ? CLOSE_DURATION : OPEN_DURATION
      }ms cubic-bezier(0.22, 1, 0.36, 1),
       backdrop-filter ${
         isClosing ? CLOSE_DURATION : OPEN_DURATION
       }ms cubic-bezier(0.22, 1, 0.36, 1),
       -webkit-backdrop-filter ${
         isClosing ? CLOSE_DURATION : OPEN_DURATION
       }ms cubic-bezier(0.22, 1, 0.36, 1)`;

  return (
    <PopupPortal>
      <div
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleClose();
          }
        }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(2, 6, 23, 0.45)",
          opacity: isVisible && !isClosing ? 1 : 0,
          backdropFilter:
            isVisible && !isClosing
              ? "blur(6px)"
              : "blur(0px)",
          WebkitBackdropFilter:
            isVisible && !isClosing
              ? "blur(6px)"
              : "blur(0px)",
          transition: backdropTransition,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="relative flex max-h-[min(88vh,760px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_45px_rgba(0,0,0,0.25)]"
          style={{
            maxWidth,
            opacity: isVisible && !isClosing ? 1 : 0,
            transform:
              isVisible && !isClosing
                ? "translateY(0) scale(1)"
                : isClosing
                  ? "translateY(5px) scale(0.97)"
                  : "translateY(8px) scale(0.94)",
            transition: animationTransition,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 z-[3] flex h-7 w-7 items-center justify-center rounded-full border-0 bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <X size={14} />
          </button>

          <div className="min-w-0 overflow-y-auto overflow-x-hidden px-4 py-5 font-sans text-slate-900">
            {children}
          </div>
        </div>
      </div>
    </PopupPortal>
  );
}