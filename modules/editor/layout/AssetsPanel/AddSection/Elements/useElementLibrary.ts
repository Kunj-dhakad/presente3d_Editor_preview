"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchLibrary, invalidateLibrary } from "@editor/lib/data/libraryCache";
import { ElementItem } from "./types";

const ELEMENTS_URL = "/api/elements";

export type LibraryStatus = "loading" | "ready" | "error";

/**
 * Shared loader for the `/api/elements` library. Both the Shapes panel and the
 * All Elements panel need the same three states — the panels used to render an
 * empty grid while the request was in flight, which read as "nothing here".
 */
export function useElementLibrary(category?: string) {
  const [items, setItems] = useState<ElementItem[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;

    // Cached, isliye panel dobara kholne par ya do panel ek saath maangne par
    // network par ek hi baar jaata hai — list poore session me badalti nahi.
    fetchLibrary<unknown>(ELEMENTS_URL)
      .then((data) => {
        if (!live) return;
        const all: ElementItem[] = Array.isArray(data) ? data : [];
        setItems(category ? all.filter((item) => item.category === category) : all);
        setStatus("ready");
      })
      .catch(() => {
        if (!live) return;
        setItems([]);
        setStatus("error");
      });

    return () => {
      live = false;
    };
  }, [category, attempt]);

  const retry = useCallback(() => {
    // Cache saaf karo, warna "Try again" wahi fail hui promise wapas de deta.
    invalidateLibrary(ELEMENTS_URL);
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  return { items, status, retry };
}
