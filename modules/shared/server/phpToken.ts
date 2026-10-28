import { createDecipheriv } from "node:crypto";

/**
 * The editor runs inside the PHP app's iframe and never has its own login. The
 * PHP app hands it the user's `access_token` (INIT_DATA), which PHP made with
 * `encrypt_user_token()` in application/helpers/tokengenerate_helper.php:
 *
 *   base64( iv[16] . base64( AES-256-CBC("user_id=2:business_id=2") ) )
 *
 * PHP's openssl pads the passphrase with NUL bytes to the 32-byte key, so the
 * same key is rebuilt here. Set PHP_TOKEN_KEY when PHP's key changes.
 */
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
