import { createHmac, timingSafeEqual } from "crypto";

/**
 * Meta `signed_request` (deauthorize + data-deletion callbacks):
 *
 *   signed_request = base64url(signature) "." base64url(JSON payload)
 *   signature      = HMAC-SHA256(app secret, <payload part exactly as received>)
 *   payload        = { algorithm: "HMAC-SHA256", issued_at, user_id, ... }
 *
 * Verified strictly: exact two-part shape, base64url alphabet only, algorithm
 * must be HMAC-SHA256, constant-time signature comparison, user_id required.
 */
export interface SignedRequestPayload {
  algorithm: string;
  issued_at?: number;
  user_id: string;
  [key: string]: unknown;
}

const MAX_LENGTH = 4096;
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export function parseSignedRequest(
  signedRequest: unknown,
  appSecret: string,
): SignedRequestPayload | null {
  if (typeof signedRequest !== "string" || signedRequest.length === 0 || signedRequest.length > MAX_LENGTH) {
    return null;
  }
  if (!appSecret) return null;
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [sigPart, payloadPart] = parts;
  if (!B64URL.test(sigPart) || !B64URL.test(payloadPart)) return null;

  const given = Buffer.from(sigPart, "base64url");
  const expected = createHmac("sha256", appSecret).update(payloadPart, "utf8").digest();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.algorithm !== "string" || p.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
  const userId =
    typeof p.user_id === "string" ? p.user_id : typeof p.user_id === "number" ? String(p.user_id) : "";
  if (!/^\d{1,32}$/.test(userId)) return null;
  return { ...p, algorithm: p.algorithm, user_id: userId } as SignedRequestPayload;
}

/** Test/helper: build a signed_request the way Meta does. */
export function buildSignedRequest(payload: Record<string, unknown>, appSecret: string): string {
  const payloadPart = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", appSecret).update(payloadPart, "utf8").digest("base64url");
  return `${sig}.${payloadPart}`;
}
