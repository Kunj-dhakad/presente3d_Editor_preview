/** Fades an accent colour without needing a colour library. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || "").replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int) || full.length !== 6) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}
