"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_THROTTLE_MS = 80;

/**
 * Keeps a continuous input (range slider, colour picker, numeric drag) feeling
 * instant while limiting how often the value reaches the store.
 *
 * The problem it solves: these inputs fire `onChange` on every pixel of drag,
 * and each store write re-renders the canvas, the thumbnail rail and every
 * panel subscribed to that element. Throttling the *commit* while driving the
 * UI from local state keeps the drag smooth without changing what value
 * ultimately gets stored.
 *
 * Guarantees:
 *  - the displayed value updates on every change, with no lag;
 *  - the last value of a drag is always committed (`release`);
 *  - an external change (undo, reset, selecting a different element) replaces
 *    the local value;
 *  - a pending commit is dropped when `identity` changes, so a value dragged
 *    on one element can never land on another.
 *
 * @param value     current committed value, from the store
 * @param onCommit  writes the value to the store
 * @param identity  changes when the underlying target changes (e.g. element id)
 */
export function useThrottledCommit<T>(
  value: T,
  onCommit: (next: T) => void,
  identity: string | number = "",
  throttleMs: number = DEFAULT_THROTTLE_MS,
) {
  const [liveValue, setLiveValue] = useState<T>(value);

  // `echo` is the last value this hook committed. When that value comes back
  // in through `value`, it is our own write echoing through the store — not an
  // external change — so the live value must NOT be reset to it. Without this,
  // a throttled commit landing mid-drag would snap the thumb backwards to an
  // already-stale position.
  const [echo, setEcho] = useState<T>(value);

  // "Adjust state during render" — React's recommended pattern — so a genuine
  // external change is reflected in the same paint with no extra render.
  const [prevValue, setPrevValue] = useState<T>(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== echo) setLiveValue(value);
  }

  const pendingRef = useRef<{ timer: ReturnType<typeof setTimeout>; value: T } | null>(null);
  const lastCommitRef = useRef(0);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // Drop any pending commit when the target changes or the input unmounts.
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current = null;
      }
    };
  }, [identity]);

  const commitNow = useCallback((next: T) => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
    lastCommitRef.current = Date.now();
    setEcho(next);
    onCommitRef.current(next);
  }, []);

  const change = useCallback(
    (next: T) => {
      setLiveValue(next);
      if (pendingRef.current) clearTimeout(pendingRef.current.timer);

      const elapsed = Date.now() - lastCommitRef.current;
      if (elapsed >= throttleMs) {
        commitNow(next);
      } else {
        const timer = setTimeout(() => commitNow(next), throttleMs - elapsed);
        pendingRef.current = { timer, value: next };
      }
    },
    [commitNow, throttleMs],
  );

  // Call on pointerup/keyup so the final value of a drag is never left pending.
  const release = useCallback(() => {
    if (pendingRef.current) commitNow(pendingRef.current.value);
  }, [commitNow]);

  return { liveValue, change, release };
}
