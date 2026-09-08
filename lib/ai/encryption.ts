import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(override?: string): Buffer | null {
  const raw = override ?? process.env.ENCRYPTION_KEY;
  if (!raw) {
    console.warn("[encryption] ENCRYPTION_KEY not set — storing keys in plaintext (dev only)");
    return null;
  }
  // Accept base64 (44 chars) or hex or raw 32-byte string
  try {
    // Try base64
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {}
  try {
    const h = Buffer.from(raw, "hex");
    if (h.length === 32) return h;
  } catch {}
  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) return utf8;
  // If raw is base64 without padding or different, try raw base64url decode
  console.warn(
    "[encryption] ENCRYPTION_KEY must be 32 bytes (base64). Got length",
    Buffer.from(raw, "base64").length,
    "— fallback to plaintext",
  );
  return null;
}

export function encryptApiKey(plaintext: string, keyOverride?: string): string {
  if (!plaintext) return "";
  const key = getKey(keyOverride);
  if (!key) return plaintext; // fallback dev
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv:enc:tag all base64
  return `${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptApiKey(ciphertext: string, keyOverride?: string): string {
  if (!ciphertext) return "";
  const key = getKey(keyOverride);
  if (!key) return ciphertext;
  // If not in iv:enc:tag format, it's plaintext fallback
  if (!ciphertext.includes(":")) return ciphertext;
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext;
  const [ivB64, encB64, tagB64] = parts as [string, string, string];
  try {
    const iv = Buffer.from(ivB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return ciphertext;
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch (e) {
    console.warn("[encryption] decrypt failed, returning as-is", e);
    return ciphertext;
  }
}
