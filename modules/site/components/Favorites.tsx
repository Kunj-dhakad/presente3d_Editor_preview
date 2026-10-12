"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

const FavoritesContext = createContext("");
export function FavoritesProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <FavoritesContext.Provider value={`fs-favorites:${userId}`}>
      {children}
    </FavoritesContext.Provider>
  );
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("fs-favorites-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("fs-favorites-changed", callback);
  };
}
export function useFavorites() {
  const key = useContext(FavoritesContext);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) || "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  const favorites = useMemo<string[]>(() => {
    try {
      const value: unknown = JSON.parse(snapshot);
      return Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }, [snapshot]);
  function toggleFavorite(id: string) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(
          favorites.includes(id)
            ? favorites.filter((item) => item !== id)
            : [...favorites, id],
        ),
      );
      window.dispatchEvent(new Event("fs-favorites-changed"));
    } catch {
      window.alert(
        "Favourites could not be saved. Please allow browser storage and try again.",
      );
    }
  }
  return { favorites, toggleFavorite };
}
