"use client";
import React, { useEffect, useSyncExternalStore } from "react";
import useThemeMode from "@shared/themes/useThemeMode";

/**
 * Header ka light / dark switch.
 *
 * Pehla paint `app/layout.tsx` ke inline script se hota hai (flash
 * na aaye isliye), aur ye component mount hote hi store ko us DOM
 * state se sync kar leta hai.
 */
const subscribeNever = () => () => {};

const ThemeToggle: React.FC = () => {
  const mode = useThemeMode((s) => s.mode);
  const toggle = useThemeMode((s) => s.toggle);
  const init = useThemeMode((s) => s.init);
  // "Have we hydrated yet" is a fact about the environment, not component
  // state — reading it this way keeps the first paint honest without a
  // setState inside an effect, which would cost a second render pass on every
  // mount. Same idiom the book reader uses.
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);

  useEffect(() => {
    init();
  }, [init]);

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className="kd-theme-toggle kd-header-btn"
      // Hydration se pehle server ne "light" bola tha; ready hone tak
      // icon ko transition mat karao warna pehle frame me jhatka dikhta hai.
      data-ready={ready}
    >
      <span className="kd-theme-toggle-track">
        <span className="kd-theme-toggle-thumb">
          {isDark ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;
