"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useDeferredValue,
  useSyncExternalStore,
} from "react";
import useEditorStore from "@editor/store/editorStore";
import { loadGoogleFont, loadFontPreview } from "@shared/fonts/useFontLoader";
import { CURATED_FONTS, type FontItem } from "@shared/fonts/fonts";
import { apiFetch } from "@shared/apiFetch";

/** Rows rendered before the "load more" sentinel adds another page. */
const PAGE_SIZE = 24;

/**
 * The Google Fonts directory is only fetched when a key is configured;
 * without one the request always 400s, so the curated list is the default
 * rather than a fallback paid for with a failed round trip.
 */


async function fetchGoogleFonts(signal: AbortSignal): Promise<FontItem[] | null> {
  try {
    const res = await apiFetch(
      "/api/fonts",
      { signal }
    );
    const data = await res.json();
    if (!data.items?.length) return null;

    return data.items
      .slice(0, 100)
      .map((f: { family: string; category: string }) => ({
        family: f.family,
        category: f.category,
      }));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Recently used fonts (localStorage, read without an SSR mismatch)     */
/* ------------------------------------------------------------------ */

const RECENT_KEY = "editor_recent_fonts";
const NO_RECENTS: string[] = [];

let recentRaw: string | null = null;
let recentCache: string[] = NO_RECENTS;
const recentListeners = new Set<() => void>();

/** Stable snapshot: only re-parses when the stored string actually changed. */
function readRecentFonts(): string[] {
  if (typeof window === "undefined") return NO_RECENTS;

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RECENT_KEY);
  } catch {
    return NO_RECENTS;
  }

  if (raw !== recentRaw) {
    recentRaw = raw;
    try {
      const parsed = JSON.parse(raw || "[]");
      recentCache = Array.isArray(parsed)
        ? parsed.filter((f): f is string => typeof f === "string")
        : NO_RECENTS;
    } catch {
      recentCache = NO_RECENTS;
    }
  }
  return recentCache;
}

function subscribeRecentFonts(onChange: () => void) {
  recentListeners.add(onChange);
  return () => {
    recentListeners.delete(onChange);
  };
}

function pushRecentFont(family: string) {
  const next = [family, ...readRecentFonts().filter((f) => f !== family)].slice(0, 5);
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(RECENT_KEY, raw);
  } catch {
    /* storage may be full or blocked — the in-memory list still updates */
  }
  recentRaw = raw;
  recentCache = next;
  recentListeners.forEach((listener) => listener());
}

const serverRecentFonts = () => NO_RECENTS;

/* ------------------------------------------------------------------ */
/* One IntersectionObserver for the whole list                          */
/* ------------------------------------------------------------------ */

type RowObserver = {
  observe: (el: Element, onVisible: () => void) => void;
  unobserve: (el: Element) => void;
};

type ObserverState = {
  observer: IntersectionObserver;
  callbacks: Map<Element, () => void>;
};

/**
 * A single observer for every row. One per row meant ~80 live observers for a
 * list the user usually scrolls a fraction of.
 */
function useRowObserver(): RowObserver {
  const stateRef = useRef<ObserverState | null>(null);

  const ensure = useCallback((): ObserverState => {
    let state = stateRef.current;
    if (!state) {
      const callbacks = new Map<Element, () => void>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const onVisible = callbacks.get(entry.target);
            callbacks.delete(entry.target);
            observer.unobserve(entry.target);
            onVisible?.();
          }
        },
        { rootMargin: "150px" }
      );
      state = { observer, callbacks };
      stateRef.current = state;
    }
    return state;
  }, []);

  useEffect(
    () => () => {
      stateRef.current?.observer.disconnect();
      stateRef.current?.callbacks.clear();
      stateRef.current = null;
    },
    []
  );

  return useMemo(
    () => ({
      observe: (el, onVisible) => {
        const state = ensure();
        state.callbacks.set(el, onVisible);
        state.observer.observe(el);
      },
      unobserve: (el) => {
        const state = stateRef.current;
        if (!state) return;
        state.callbacks.delete(el);
        state.observer.unobserve(el);
      },
    }),
    [ensure]
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                  */
/* ------------------------------------------------------------------ */

const FontRow: React.FC<{
  font: FontItem;
  isActive: boolean;
  observer: RowObserver;
  onSelect: (family: string) => void;
}> = React.memo(({ font, isActive, observer, onSelect }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  // Tracking which family settled (rather than a boolean) keeps the row
  // correct when React reuses it for a different font.
  const [settledFamily, setSettledFamily] = useState<string | null>(null);
  const loaded = settledFamily === font.family;

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    let cancelled = false;
    observer.observe(el, () => {
      loadFontPreview(font.family).finally(() => {
        // Show the name in the UI face if the webfont never arrives — a
        // permanently shimmering row is worse than an unstyled one.
        if (!cancelled) setSettledFamily(font.family);
      });
    });

    return () => {
      cancelled = true;
      observer.unobserve(el);
    };
  }, [font.family, observer]);

  return (
    <div
      ref={rowRef}
      onClick={() => onSelect(font.family)}
      className={`kd-font-row ${isActive ? "kd-font-row-active" : ""}`}
    >
      <svg
        width="14" height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="kd-font-row-icon"
      >
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <span
        style={{ fontFamily: loaded ? `"${font.family}", var(--kd-font)` : undefined }}
        className={`kd-font-row-text ${loaded ? "" : "kd-font-row-text-pending"}`}
      >
        {font.family}
      </span>
    </div>
  );
});
FontRow.displayName = "FontRow";

const FontRowSkeleton: React.FC<{ width: number }> = ({ width }) => (
  <div className="kd-font-row kd-font-row-skeleton">
    <span className="kd-font-skeleton-bar" style={{ width: `${width}%` }} />
  </div>
);

/* ------------------------------------------------------------------ */
/* Paged list                                                           */
/* ------------------------------------------------------------------ */

/**
 * Owns its own page count so the parent can reset paging by remounting it
 * with a new key, instead of syncing state in an effect.
 */
const PagedFontList: React.FC<{
  fonts: FontItem[];
  currentFont?: string;
  observer: RowObserver;
  onSelect: (family: string) => void;
}> = ({ fonts, currentFont, observer, onSelect }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const moreRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => fonts.slice(0, visibleCount), [fonts, visibleCount]);
  const hasMore = visibleCount < fonts.length;

  // Paging in on scroll keeps the panel from mounting — and font-loading —
  // the whole directory the moment it opens.
  useEffect(() => {
    const el = moreRef.current;
    if (!el || !hasMore) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => count + PAGE_SIZE);
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visibleCount]);

  return (
    <>
      {visible.map((font) => (
        <FontRow
          key={font.family}
          font={font}
          isActive={currentFont === font.family}
          observer={observer}
          onSelect={onSelect}
        />
      ))}

      {hasMore && (
        <div ref={moreRef}>
          {[68, 54, 76].map((width, i) => (
            <FontRowSkeleton key={i} width={width} />
          ))}
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

const FontFamilyPanel: React.FC = () => {
  const [fonts, setFonts] = useState<FontItem[]>(CURATED_FONTS);
  const [search, setSearch] = useState("");

  const recentFonts = useSyncExternalStore(
    subscribeRecentFonts,
    readRecentFonts,
    serverRecentFonts
  );

  // Filtering the whole list on every keystroke kept the input laggy; the
  // deferred value lets typing stay responsive while the list catches up.
  const deferredSearch = useDeferredValue(search);
  const observer = useRowObserver();

  const updateElement = useEditorStore((s) => s.updateElement);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  const element = slides[activeSlide]?.elements.find((el) => el.id === activeElementId);
  const currentFont =
    element && (element.data.type === "text" || element.data.type === "button")
      ? element.data.fontFamily
      : undefined;

  useEffect(() => {
    if (currentFont) void loadGoogleFont(currentFont);
  }, [currentFont]);

  useEffect(() => {
    const controller = new AbortController();
    fetchGoogleFonts(controller.signal).then((data) => {
      if (data?.length) setFonts(data);
    });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return fonts;
    return fonts.filter((f) => f.family.toLowerCase().includes(query));
  }, [fonts, deferredSearch]);

  const handleSelect = useCallback(
    (family: string) => {
      if (!element) return;
      void loadGoogleFont(family);
      updateElement(element.id, { fontFamily: family }, { history: true });
      pushRecentFont(family);
    },
    [element, updateElement]
  );

  const listPending = deferredSearch !== search;

  return (
    <div className="flex flex-col h-full">

      <div className="px-4 pt-1 pb-2">
        <h3 className="kd-font-panel-heading mb-3">Font</h3>

        <div className="kd-font-search-wrapper">
          <svg
            className="kd-font-search-icon"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search fonts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="kd-font-search-input"
          />
          {search && (
            <button onClick={() => setSearch("")} className="kd-font-search-clear">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 kd-custom-scrollbar">

        {!deferredSearch && currentFont && (
          <div className="mb-3">
            <p className="kd-font-section-label">Current font</p>
            <div
              className="kd-font-recent-box"
              style={{ fontFamily: `"${currentFont}", var(--kd-font)` }}
            >
              {currentFont}
            </div>
          </div>
        )}

        {!deferredSearch && recentFonts.length > 0 && (
          <div className="mb-2">
            <p className="kd-font-section-label px-2">Recently used</p>
            {recentFonts.map((family) => (
              <FontRow
                key={`recent-${family}`}
                font={{ family }}
                isActive={currentFont === family}
                observer={observer}
                onSelect={handleSelect}
              />
            ))}
            <hr className="kd-font-divider" />
          </div>
        )}

        <p className="kd-font-section-label px-2">
          {deferredSearch ? `${filtered.length} results` : "All fonts"}
        </p>

        <div className={listPending ? "kd-font-list-pending" : undefined}>
          <PagedFontList
            key={`${deferredSearch}|${fonts.length}`}
            fonts={filtered}
            currentFont={currentFont}
            observer={observer}
            onSelect={handleSelect}
          />
        </div>

        {filtered.length === 0 && deferredSearch && (
          <p className="kd-font-empty-text">No fonts found</p>
        )}
      </div>
    </div>
  );
};

export default FontFamilyPanel;
