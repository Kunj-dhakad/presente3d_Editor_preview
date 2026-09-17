/**
 * Brand colours as plain hex, for the few places CSS variables cannot reach:
 * emails, generated OG images, the global error page and colours saved into a
 * book's data (exports and the reader render those outside the app's CSS).
 * Keep in sync with the --kd-brand-* scale in styles/base.css.
 */
export const BRAND = {
  accent: "#6c56dc",   // --kd-brand-500
  hover: "#5b45cf",    // --kd-brand-600
  light: "#8a76ea",    // --kd-brand-400
  subtle: "#efebfb",   // --kd-brand-100
  ink: "#1e1a3a",      // --kd-brand-900
} as const;
