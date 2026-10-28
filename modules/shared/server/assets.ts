import { putObject, STORAGE_PREFIX } from "./storage";
import { appUrl } from "./origins";

/**
 * Files this app makes itself (PowerPoint exports, AI images, cut-out images).
 * They go to S3 and are served by /api/files/<key>; the key has a random UUID,
 * so the link is the permission. The URL is absolute because the PHP app (its
 * viewer, its PPT download) opens it from another domain.
 */
export function fileUrl(key: string) {
  return `${appUrl()}/api/files/${key}`;
}
/** The storage key behind a /api/files/ URL, relative or absolute; null for anything else. */
export function keyFromFileUrl(src: string) {
  const match = src.match(/^(?:https?:\/\/[^/]+)?\/api\/files\/(.+)$/);
  return match && match[1].startsWith(`${STORAGE_PREFIX}/`) ? match[1] : null;
}
export async function saveAsset(userId: string, bytes: Buffer, kind: string, _name: string, contentType: string, extension: string) {
  const key = await putObject(userId, kind, bytes, contentType, extension);
  const url = fileUrl(key);
  return { id: key, url, image_url: url, video_url: url, thumbnail_url: contentType.startsWith("video/") ? "/video-placeholder.svg" : url, status: 1 };
}
