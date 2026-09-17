import type { RowDataPacket } from "mysql2";
import { db } from "@shared/server/db";
import { requireUser, apiError, ApiError } from "@shared/server/api";
import { getObject } from "@shared/server/storage";
export async function GET(request: Request, context: {params:Promise<{id:string}>}) {
  try {
    const user = await requireUser(request); const {id} = await context.params;
    const [rows] = await db.execute<RowDataPacket[]>("SELECT * FROM assets WHERE id=? AND user_id=?",[id,user.id]);
    if (!rows.length) throw new ApiError(404,"File not found.");
    const range = request.headers.get("range") || undefined;
    if (range && !/^bytes=\d*-\d*$/.test(range)) throw new ApiError(416,"Invalid byte range.");
    const object = await getObject(rows[0].object_key,range);
    if (!object.Body) throw new ApiError(404,"File not found.");
    const headers = new Headers({"Content-Type":rows[0].content_type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Accept-Ranges":"bytes"});
    if (object.ContentLength != null) headers.set("Content-Length",String(object.ContentLength));
    if (object.ContentRange) headers.set("Content-Range",object.ContentRange);
    if (rows[0].kind === "exports") headers.set("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(rows[0].name)}`);
    return new Response(object.Body.transformToWebStream() as ReadableStream, {status:range?206:200,headers});
  } catch(e) { return apiError(e); }
}

