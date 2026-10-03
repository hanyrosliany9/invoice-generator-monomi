import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * OAuth `state` for the Instagram authorize redirect.
 *
 *   state = "<nonce>.<exp>.<sig>"   (nonce/sig base64url, exp = unix seconds)
 *   sig   = HMAC-SHA256(stateKey, "v1.<nonce>.<exp>")
 *   stateKey = HMAC-SHA256(META_APP_SECRET, "monomi-instagram-oauth-state-v1")
 *
 * Only the nonce travels through Instagram; what it binds (client, initiator,
 * return URL, redirect URI, browser cookie hash) is stored server-side keyed by
 * sha256(nonce) and consumed exactly once. The HMAC lets the callback reject
 * forged/expired states before touching the database.
 */
export const STATE_TTL_SECONDS = 10 * 60;
const MAX_STATE_LENGTH = 256;

export function deriveStateKey(appSecret: string): Buffer {
  return createHmac("sha256", appSecret).update("monomi-instagram-oauth-state-v1").digest();
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function sign(key: Buffer, nonce: string, exp: number): string {
  return createHmac("sha256", key).update(`v1.${nonce}.${exp}`).digest("base64url");
}

export function createState(
  key: Buffer,
  now: Date = new Date(),
  ttlSeconds = STATE_TTL_SECONDS,
): { state: string; nonce: string; expiresAt: Date } {
  const nonce = randomToken(32);
  const exp = Math.floor(now.getTime() / 1000) + ttlSeconds;
  return { state: `${nonce}.${exp}.${sign(key, nonce, exp)}`, nonce, expiresAt: new Date(exp * 1000) };
}

export type StateCheck =
  | { ok: true; nonce: string; expiresAt: Date }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyState(key: Buffer, state: unknown, now: Date = new Date()): StateCheck {
  if (typeof state !== "string" || state.length === 0 || state.length > MAX_STATE_LENGTH) {
    return { ok: false, reason: "malformed" };
  }
  const parts = state.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]{32,64}$/.test(parts[0]) || !/^\d{9,11}$/.test(parts[1])) {
    return { ok: false, reason: "malformed" };
  }
  const [nonce, expStr, sig] = parts;
  const exp = Number(expStr);
  const expected = Buffer.from(sign(key, nonce, exp), "utf8");
  const given = Buffer.from(sig, "utf8");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad_signature" };
  }
  if (exp * 1000 <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, nonce, expiresAt: new Date(exp * 1000) };
}

/** Constant-time compare of two hex digests (false on length mismatch). */
export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
