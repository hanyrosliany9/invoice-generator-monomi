import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

/**
 * AES-256-GCM envelope for Instagram access tokens at rest.
 *
 * Format: "v1:<iv>:<tag>:<ciphertext>" (base64url parts, 12-byte random IV,
 * 16-byte auth tag). The ciphertext is bound to its owner through the AAD
 * ("instagram-token:<clientId>"), so a ciphertext copied onto another
 * client's row fails to decrypt instead of granting that client the token.
 */
const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function tokenAad(clientId: string): Buffer {
  return Buffer.from(`instagram-token:${clientId}`, "utf8");
}

export function encryptToken(plaintext: string, key: Buffer, aad: Buffer): string {
  if (key.length !== 32) throw new Error("Token encryption key must be 32 bytes");
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Nothing to encrypt");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(aad);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
}

/** Throws on any tampering, wrong key, wrong AAD or malformed input. */
export function decryptToken(envelope: string, key: Buffer, aad: Buffer): string {
  if (key.length !== 32) throw new Error("Token encryption key must be 32 bytes");
  const parts = typeof envelope === "string" ? envelope.split(":") : [];
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported token envelope");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ct = Buffer.from(parts[3], "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ct.length === 0) {
    throw new Error("Malformed token envelope");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/**
 * Non-secret identifier of an encryption key: the first 16 hex chars of
 * HMAC-SHA256(key, constant). Stored next to each ciphertext so a wrong /
 * rotated TOKEN_ENCRYPTION_KEY is detected explicitly ("key mismatch")
 * instead of being mistaken for a broken token. A truncated HMAC output does
 * not help recover the 256-bit key.
 */
export function tokenKeyFingerprint(key: Buffer): string {
  if (key.length !== 32) throw new Error("Token encryption key must be 32 bytes");
  return createHmac("sha256", key).update("monomi-instagram-token-key-id-v1").digest("hex").slice(0, 16);
}
