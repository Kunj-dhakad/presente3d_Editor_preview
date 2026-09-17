import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { ApiError } from "./api";
import { putObject, removeObject } from "./storage";
import { assertStorageQuota } from "./limits";
export async function saveAsset(userId: string, bytes: Buffer, kind: string, name: string, contentType: string, extension: string) {
  await assertStorageQuota(userId, bytes.length);
  const id = randomUUID();
  const key = await putObject(userId,kind,bytes,contentType,extension);
  try {
    await db.execute("INSERT INTO assets (id,user_id,object_key,kind,name,content_type,bytes) VALUES (?,?,?,?,?,?,?)", [id,userId,key,kind,name.slice(0,255),contentType,bytes.length]);
  } catch(e) { await removeObject(key).catch(()=>{}); throw e; }
  const url = `/api/assets/${id}/file`;
  return {id,url,image_url:url,video_url:url,thumbnail_url: contentType.startsWith("video/") ? "/video-placeholder.svg" : url,status:1};
}
export async function uploadAsset(userId: string, file: FormDataEntryValue | null, kind: "image" | "video") {
  if (!(file instanceof File) || !file.size) throw new ApiError(400,"Choose a file to upload.");
  if (file.size > (kind === "video" ? 100 : 15) * 1024 * 1024) throw new ApiError(413,"File is too large.");
  let bytes = Buffer.from(await file.arrayBuffer());
  if (kind === "image") {
    let metadata;
    try { metadata = await sharp(bytes, {limitInputPixels: 40_000_000}).metadata(); }
    catch { throw new ApiError(400,"Upload a valid PNG, JPEG, GIF or WebP image."); }
    if (!["png","jpeg","webp","gif"].includes(metadata.format || "")) throw new ApiError(400,"Unsupported image format.");
    if (metadata.format !== "gif") bytes = Buffer.from(await sharp(bytes).rotate().webp({quality:90}).toBuffer());
    return saveAsset(userId,bytes,"images",file.name,metadata.format === "gif" ? "image/gif" : "image/webp",metadata.format === "gif" ? "gif" : "webp");
  }
  const mp4 = bytes.subarray(4,8).toString() === "ftyp";
  const webm = bytes.subarray(0,4).toString("hex") === "1a45dfa3";
  if (!mp4 && !webm) throw new ApiError(400,"Upload an MP4 or WebM video.");
  return saveAsset(userId,bytes,"videos",file.name,mp4?"video/mp4":"video/webm",mp4?"mp4":"webm");
}
export async function listAssets(userId: string, kinds: string[]) {
  const [rows] = await db.query<RowDataPacket[]>("SELECT id,kind,name,content_type,bytes,created_at FROM assets WHERE user_id=? AND deleted_at IS NULL AND kind IN (?) ORDER BY created_at DESC LIMIT 500",[userId,kinds]);
  return rows.map(row => ({...row,url:`/api/assets/${row.id}/file`,image_url:`/api/assets/${row.id}/file`,video_url:`/api/assets/${row.id}/file`,thumbnail_url:row.content_type.startsWith("video/")?"/video-placeholder.svg":`/api/assets/${row.id}/file`,status:"completed"}));
}

