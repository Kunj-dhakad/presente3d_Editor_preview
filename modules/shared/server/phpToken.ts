import { createDecipheriv } from "node:crypto";


export type EditorUser = { id: string; userId: string; businessId: string };

function key() {
  const secret = Buffer.alloc(32);
  Buffer.from(process.env.PHP_TOKEN_KEY || "your-256-bit-secret").copy(secret);
  return secret;
}

export function decodePhpToken(token: string): EditorUser | null {
  try {
    const raw = Buffer.from(token, "base64");
    if (raw.length < 17) return null;
    const iv = raw.subarray(0, 16);
    const encrypted = Buffer.from(raw.subarray(16).toString("latin1"), "base64");
    const decipher = createDecipheriv("aes-256-cbc", key(), iv);
    const text = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const fields = Object.fromEntries(text.split(":").map(part => part.split("=") as [string, string]));
    const userId = String(fields.user_id || "");
    const businessId = String(fields.business_id || "");
    if (!/^\d+$/.test(userId) || !/^\d+$/.test(businessId)) return null;
    return { id: `${businessId}_${userId}`, userId, businessId };
  } catch {
    return null;
  }
}
