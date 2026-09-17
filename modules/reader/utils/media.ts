/**
 * Playback resolution for the reader.
 *
 * Deliberately small: embed-media blocks arrive with `embedUrl`/`renderMode`
 * already resolved by the authoring tool, so the viewer only has to handle the
 * raw URLs a reader can still hit — a video button's `videoUrl` and plain video
 * sources. The full provider catalogue belongs to authoring, not to reading.
 */

export type PlaybackMode = "video" | "iframe" | "image" | "external";

export interface Playback {
  /** What to point the player at (may differ from the authored URL). */
  src: string;
  mode: PlaybackMode;
}

const YOUTUBE_ID =
  /(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/i;
const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;

export const getYoutubeId = (url: string): string | null =>
  url ? (url.match(YOUTUBE_ID)?.[1] ?? null) : null;

/** YouTube refuses to embed Shorts, so the reader links out instead. */
export const isYoutubeShorts = (url: string): boolean =>
  /youtube\.com\/shorts\//i.test(url);

export function resolvePlayback(rawUrl: string | undefined): Playback | null {
  const url = (rawUrl ?? "").trim();
  if (!url) return null;

  const youtubeId = getYoutubeId(url);
  if (youtubeId && !isYoutubeShorts(url)) {
    return {
      src: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`,
      mode: "iframe",
    };
  }

  const vimeoId = url.match(VIMEO_ID)?.[1];
  if (vimeoId) {
    return { src: `https://player.vimeo.com/video/${vimeoId}`, mode: "iframe" };
  }

  if (VIDEO_FILE.test(url) || url.startsWith("blob:") || url.startsWith("data:video"))
    return { src: url, mode: "video" };
  if (IMAGE_FILE.test(url)) return { src: url, mode: "image" };

  return { src: url, mode: "external" };
}

export const youtubeThumbnail = (youtubeId: string): string =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
