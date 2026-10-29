/**
 * Brand colours as plain hex, for the few places CSS variables cannot reach:
 * emails, generated OG images, the global error page and colours saved into a
 * book's data (exports and the reader render those outside the app's CSS).
 * Keep in sync with the --kd-brand-* scale in styles/base.css.
 */
export const BRAND = {
  accent: "#0088cc",   // --kd-brand-600 (--kd-accent)
  hover: "#006ea6",    // --kd-brand-700
  light: "#00a6ee",    // --kd-brand-500, the logo blue
  subtle: "#e0f4fe",   // --kd-brand-100
  ink: "#0b2638",      // --kd-brand-900
} as const;
