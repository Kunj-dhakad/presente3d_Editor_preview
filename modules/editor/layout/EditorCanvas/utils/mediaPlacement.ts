export type MediaPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_CANVAS_WIDTH = 300;
const DEFAULT_CANVAS_HEIGHT = 200;
const DEFAULT_MEDIA_WIDTH = 300;
const DEFAULT_MEDIA_HEIGHT = 200;
const MEDIA_CANVAS_GAP = 48;
const MIN_MEDIA_SIZE = 80;

const safeNumber = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && (value ?? 0) > 0 ? (value as number) : fallback;

export const getCenteredMediaPlacement = (
  canvasWidth?: number,
  canvasHeight?: number,
  mediaWidth?: number,
  mediaHeight?: number
): MediaPlacement => {
  const cw = safeNumber(canvasWidth, DEFAULT_CANVAS_WIDTH);
  const ch = safeNumber(canvasHeight, DEFAULT_CANVAS_HEIGHT);
  const sourceWidth = safeNumber(mediaWidth, DEFAULT_MEDIA_WIDTH);
  const sourceHeight = safeNumber(mediaHeight, DEFAULT_MEDIA_HEIGHT);

  const horizontalGap = Math.min(MEDIA_CANVAS_GAP, Math.max(0, (cw - MIN_MEDIA_SIZE) / 2));
  const verticalGap = Math.min(MEDIA_CANVAS_GAP, Math.max(0, (ch - MIN_MEDIA_SIZE) / 2));
  const maxWidth = Math.max(MIN_MEDIA_SIZE, cw - horizontalGap * 2);
  const maxHeight = Math.max(MIN_MEDIA_SIZE, ch - verticalGap * 2);
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (cw - width) / 2,
    y: (ch - height) / 2,
    width,
    height,
  };
};
