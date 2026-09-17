/*
 * A string preference that survives reloads via localStorage, readable with
 * useSyncExternalStore (SSR renders the default, so no hydration mismatch).
 * The in-memory copy keeps it working this session when storage is blocked.
 */
export interface StoredValue {
  subscribe: (listener: () => void) => () => void;
  read: () => string;
  readServer: () => string;
  write: (value: string) => void;
}

export function createStoredValue(key: string, fallback: string): StoredValue {
  let memory: string | null = null;
  const listeners = new Set<() => void>();

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    read() {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored) return stored;
      } catch {
        // storage unavailable — fall back to memory
      }
      return memory ?? fallback;
    },
    readServer: () => fallback,
    write(value) {
      memory = value;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // storage unavailable — memory value still applies this session
      }
      listeners.forEach((listener) => listener());
    },
  };
}

/** Media-query match as an external store (false on the server). */
export function createMediaQuery(query: string) {
  return {
    subscribe(listener: () => void) {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    },
    read: () => window.matchMedia(query).matches,
    readServer: () => false,
  };
}
