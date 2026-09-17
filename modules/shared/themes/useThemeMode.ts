"use client";
import { create } from "zustand";
import { THEMES } from "./themes";
import { applyTheme } from "./applyTheme";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "kd-theme";

type ThemeModeStore = {
  mode: ThemeMode;
  init: () => void;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

function paint(mode: ThemeMode) {
  applyTheme(THEMES[mode] ?? {}, "mode");
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
   
  }
}

const useThemeMode = create<ThemeModeStore>((set, get) => ({
  mode: "light",

  init: () => {
    const fromDom = document.documentElement.dataset.theme;
    const mode: ThemeMode = fromDom === "dark" ? "dark" : "light";
    set({ mode });
    paint(mode);
  },

  setMode: (mode) => {
    set({ mode });
    paint(mode);
  },

  toggle: () => get().setMode(get().mode === "dark" ? "light" : "dark"),
}));

export default useThemeMode;
