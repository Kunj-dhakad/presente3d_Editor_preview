/**
 * Shapes are stored as inner SVG markup on a 100×100 viewBox. Books made by
 * the first AI writer stored the word "rectangle" instead, which drew nothing;
 * they are read as a plain rectangle.
 */
export function shapeMarkup(shape: string | undefined) {
  return shape === "rectangle" ? '<rect x="0" y="0" width="100" height="100"/>' : shape ?? "";
}

/** A rectangle for a box of the given size, with real (undistorted) rounded corners. */
export function roundedRect(width: number, height: number, radius: number) {
  if (radius <= 0) return '<rect x="0" y="0" width="100" height="100"/>';
  if (radius * 2 >= Math.min(width, height) && Math.abs(width - height) < 1) return '<circle cx="50" cy="50" r="50"/>';
  const rx = Math.min(50, (radius / width) * 100).toFixed(2);
  const ry = Math.min(50, (radius / height) * 100).toFixed(2);
  return `<rect x="0" y="0" width="100" height="100" rx="${rx}" ry="${ry}"/>`;
}
