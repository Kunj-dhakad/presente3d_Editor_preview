import { getObject, isStorageKey } from "@shared/server/storage";
export const runtime = "nodejs";

/**
 * Serves a file this app stored (see @shared/server/assets). The key carries a
 * random UUID, so knowing the URL is the permission: the PHP viewer and
 * PowerPoint download open these links without an editor session.
 */
export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const key = (await context.params).key.join("/");
  if (!isStorageKey(key)) return new Response("Not found", { status: 404 });
  try {
    const range = request.headers.get("range") || undefined;
    const object = await getObject(key, range);
    const headers = new Headers({
      "Content-Type": object.ContentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    });
    if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength));
    if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
    return new Response(object.Body!.transformToWebStream(), { status: object.ContentRange ? 206 : 200, headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
