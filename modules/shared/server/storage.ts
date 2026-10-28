import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
export const STORAGE_PREFIX = process.env.STORAGE_PREFIX || "ppt_editor_data";
export const bucket = process.env.KD_AWS_S3_BUCKET_NAME;
export const s3 = new S3Client({
  region: process.env.KD_AWS_REGION || "us-east-1",
  credentials: process.env.KD_AWS_ACCESS_KEY_ID && process.env.KD_AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.KD_AWS_ACCESS_KEY_ID, secretAccessKey: process.env.KD_AWS_SECRET_ACCESS_KEY,
  } : undefined,
});
export function isStorageKey(key: string) {
  return key.startsWith(`${STORAGE_PREFIX}/`) && !key.includes("..") && /^[a-zA-Z0-9_./-]+$/.test(key);
}
function assertKey(key: string) {
  if (!bucket) throw new Error("KD_AWS_S3_BUCKET_NAME is required.");
  if (!isStorageKey(key)) throw new Error("Invalid storage key.");
}
export async function putObject(userId: string, category: string, bytes: Buffer, contentType: string, extension: string) {
  if (![userId, category, extension].every(v => /^[a-zA-Z0-9_-]+$/.test(v))) throw new Error("Invalid storage path.");
  const key = `${STORAGE_PREFIX}/users/${userId}/${category}/${randomUUID()}.${extension}`;
  assertKey(key);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType, ServerSideEncryption: "AES256" }));
  return key;
}
export async function getObject(key: string, range?: string) { assertKey(key); return s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range })); }
