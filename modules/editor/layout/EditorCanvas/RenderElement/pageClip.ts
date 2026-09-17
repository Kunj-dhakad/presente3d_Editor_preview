export type PageClipBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageClipRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type Point = {
  x: number;
  y: number;
};

const EPSILON = 0.01;

const clipPolygon = (
  points: Point[],
  inside: (point: Point) => boolean,
  intersect: (from: Point, to: Point) => Point
) => {
  if (!points.length) return points;
  const output: Point[] = [];
  let previous = points[points.length - 1];
  let previousInside = inside(previous);

  points.forEach((current) => {
    const currentInside = inside(current);
    if (currentInside) {
      if (!previousInside) output.push(intersect(previous, current));
      output.push(current);
    } else if (previousInside) {
      output.push(intersect(previous, current));
    }
    previous = current;
    previousInside = currentInside;
  });

  return output;
};

const clipToRect = (points: Point[], width: number, height: number) => {
  let polygon = points;
  polygon = clipPolygon(
    polygon,
    (point) => point.x >= 0,
    (from, to) => {
      const t = (0 - from.x) / (to.x - from.x || EPSILON);
      return { x: 0, y: from.y + (to.y - from.y) * t };
    }
  );
  polygon = clipPolygon(
    polygon,
    (point) => point.x <= width,
    (from, to) => {
      const t = (width - from.x) / (to.x - from.x || EPSILON);
      return { x: width, y: from.y + (to.y - from.y) * t };
    }
  );
  polygon = clipPolygon(
    polygon,
    (point) => point.y >= 0,
    (from, to) => {
      const t = (0 - from.y) / (to.y - from.y || EPSILON);
      return { x: from.x + (to.x - from.x) * t, y: 0 };
    }
  );
  polygon = clipPolygon(
    polygon,
    (point) => point.y <= height,
    (from, to) => {
      const t = (height - from.y) / (to.y - from.y || EPSILON);
      return { x: from.x + (to.x - from.x) * t, y: height };
    }
  );
  return polygon;
};

const isFullElementClip = (points: Point[], width: number, height: number) => {
  if (points.length !== 4) return false;
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  return points.every((point, index) =>
    Math.abs(point.x - corners[index].x) < EPSILON &&
    Math.abs(point.y - corners[index].y) < EPSILON
  );
};

export const getPageClipPath = (
  rect: PageClipRect,
  page: PageClipBounds | undefined
) => {
  if (!page || rect.width <= 0 || rect.height <= 0) return undefined;

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const angle = -(rect.rotation || 0) * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const pageCorners = [
    { x: page.x, y: page.y },
    { x: page.x + page.width, y: page.y },
    { x: page.x + page.width, y: page.y + page.height },
    { x: page.x, y: page.y + page.height },
  ];

  const pageInElementSpace = pageCorners.map((point) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return {
      x: rect.width / 2 + dx * cos - dy * sin,
      y: rect.height / 2 + dx * sin + dy * cos,
    };
  });

  const visiblePolygon = clipToRect(pageInElementSpace, rect.width, rect.height);

  if (!visiblePolygon.length) {
    return "polygon(0px 0px, 0px 0px, 0px 0px)";
  }

  if (isFullElementClip(visiblePolygon, rect.width, rect.height)) {
    return undefined;
  }

  return `polygon(${visiblePolygon
    .map((point) => `${point.x.toFixed(3)}px ${point.y.toFixed(3)}px`)
    .join(", ")})`;
};
