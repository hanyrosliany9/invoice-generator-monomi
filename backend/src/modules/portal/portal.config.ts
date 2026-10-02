import { Logger } from "@nestjs/common";
import { createHmac } from "crypto";

/**
 * Client-portal configuration (session cookie, JWT, login-code policy).
 *
 * The portal session is a JWT signed with PORTAL_JWT_SECRET — deliberately a
 * DIFFERENT secret, audience and issuer than the staff JWT (JWT_SECRET), so a
 * staff token can never pass the portal guard and a portal token can never
 * pass the staff JwtStrategy.
 */

export const PORTAL_COOKIE_NAME = "portal_session";
/** Cookie is only sent to portal API routes, never to staff routes. */
export const PORTAL_COOKIE_PATH = "/api/v1/portal";
export const PORTAL_JWT_AUDIENCE = "client-portal";
export const PORTAL_JWT_ISSUER = "monomi-client-portal";
export const PORTAL_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const PORTAL_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const PORTAL_CODE_MAX_ATTEMPTS = 5; // guesses per code (incl. the right one) before it dies
/**
 * Codes issued per email per hour. Requesting a code does NOT invalidate
 * earlier ones (so a third party requesting codes for a victim cannot void the
 * code the victim is about to type), hence a slightly higher cap than the
 * original 5. Per-code attempts alone would allow
 * PORTAL_CODE_MAX_PER_HOUR * PORTAL_CODE_MAX_ATTEMPTS = 40 guesses per email
 * per hour; the per-email lockout below caps it at PORTAL_VERIFY_MAX_FAILURES
 * (on top of the per-IP verify throttle).
 */
export const PORTAL_CODE_MAX_PER_HOUR = 8;
/** Codes issued per email per rolling 24 hours (caps email bombing and guesses). */
export const PORTAL_CODE_MAX_PER_DAY = 20;
/**
 * Failed verify-code requests per email (across all of its codes, and for
 * emails with no codes at all) within PORTAL_VERIFY_LOCKOUT_WINDOW_MS that
 * lock verification for that email. While locked, verify-code answers with
 * the same generic error without checking the code and no new codes are
 * issued; the lock lifts once fewer than this many failures fall inside the
 * trailing window, i.e. about an hour after the failures stop. Combined with
 * the caps above, at most 15 guesses per email per hour out of 10^6.
 */
export const PORTAL_VERIFY_MAX_FAILURES = 15;
export const PORTAL_VERIFY_LOCKOUT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
/** Failure rows older than this are pruned. */
export const PORTAL_FAILURE_RETENTION_MS = 24 * 60 * 60 * 1000;
/** How many of the most recent unconsumed, unexpired codes may verify. */
export const PORTAL_CODE_MAX_ACTIVE = 3;
/**
 * Upper bound on background code-issuance tasks in flight (request-code
 * answers before doing any lookup). Beyond this, requests are dropped with a
 * warning instead of queueing unbounded DB work.
 */
export const PORTAL_MAX_PENDING_CODE_REQUESTS = 100;

/** Generic message for every verify-code failure (no oracle). */
export const PORTAL_INVALID_CODE_MESSAGE =
  "Kode tidak valid atau sudah kedaluwarsa";

const logger = new Logger("PortalConfig");
let warnedFallback = false;

/**
 * Resolve the portal JWT/HMAC secret.
 *
 * - production: PORTAL_JWT_SECRET is required (>= 32 chars) and must differ
 *   from JWT_SECRET; otherwise this throws (called at boot, so the app fails
 *   fast instead of running with a weak/shared secret).
 * - other envs: falls back to a value DERIVED from JWT_SECRET (never equal to
 *   it) so local dev works without extra config, with a warning.
 */
export function getPortalJwtSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secret = env.PORTAL_JWT_SECRET?.trim();
  const staffSecret = env.JWT_SECRET?.trim();
  const isProduction = env.NODE_ENV === "production";

  if (secret) {
    if (isProduction && secret.length < 32) {
      throw new Error(
        "PORTAL_JWT_SECRET must be at least 32 characters in production",
      );
    }
    if (isProduction) {
      const weakness = portalSecretWeakness(secret);
      if (weakness) {
        throw new Error(
          `PORTAL_JWT_SECRET looks like ${weakness}; set a random value in production (generate with: openssl rand -base64 48)`,
        );
      }
    }
    if (staffSecret && secret === staffSecret) {
      throw new Error(
        "PORTAL_JWT_SECRET must be different from JWT_SECRET (staff and portal sessions must not share a signing key)",
      );
    }
    return secret;
  }

  if (isProduction) {
    throw new Error(
      "PORTAL_JWT_SECRET is required in production (generate with: openssl rand -base64 48)",
    );
  }

  if (!warnedFallback) {
    warnedFallback = true;
    logger.warn(
      "PORTAL_JWT_SECRET is not set — using a development fallback derived from JWT_SECRET. Set PORTAL_JWT_SECRET before deploying.",
    );
  }
  return createHmac("sha256", staffSecret || "dev-insecure-fallback")
    .update("monomi-client-portal-dev-fallback")
    .digest("hex");
}

/** The value shipped in .env.example (must never reach production). */
export const PORTAL_SECRET_EXAMPLE_VALUE = "change-me-to-a-different-long-random-secret";

const PLACEHOLDER_MARKERS = [
  "change-me",
  "changeme",
  "change_me",
  "replace-me",
  "replace_me",
  "placeholder",
  "your-secret",
  "your_secret",
  "your_very_secure",
  "example",
  "insecure",
  "dev-fallback",
];

/**
 * Why a secret is unfit for production, or null if it looks random. Catches
 * copied placeholders and obviously low-entropy values (few distinct
 * characters, a repeated unit, < 3 bits/char); it is a tripwire for config
 * mistakes, not a randomness test. `openssl rand -base64 48` and 32+ random
 * hex characters both pass.
 */
export function portalSecretWeakness(secret: string): string | null {
  const lower = secret.toLowerCase();
  if (secret === PORTAL_SECRET_EXAMPLE_VALUE || PLACEHOLDER_MARKERS.some((m) => lower.includes(m))) {
    return "a placeholder value";
  }
  const counts = new Map<string, number>();
  for (const ch of secret) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  if (counts.size < 10) return "a low-entropy value (fewer than 10 distinct characters)";
  if (secret.length <= 1024 && /^(.+?)\1+$/s.test(secret)) {
    return "a low-entropy value (a repeated pattern)";
  }
  let bitsPerChar = 0;
  for (const n of counts.values()) {
    const p = n / secret.length;
    bitsPerChar -= p * Math.log2(p);
  }
  if (bitsPerChar < 3) return "a low-entropy value";
  return null;
}

/** Boot-time check: throws in production if the portal secret is unusable. */
export function assertPortalConfig(env: NodeJS.ProcessEnv = process.env): void {
  getPortalJwtSecret(env);
  if (env.NODE_ENV === "production" && !env.PORTAL_URL) {
    logger.warn(
      "PORTAL_URL is not set — portal invite emails will fall back to https://portal.monomiagency.com and the portal origin will not be in the CORS allowlist.",
    );
  }
}

export function getPortalUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.PORTAL_URL ||
    (env.NODE_ENV === "production"
      ? "https://portal.monomiagency.com"
      : "http://localhost:5173")
  ).replace(/\/+$/, "");
}

/** Canonical email form used for storage and lookups. */
export function normalizePortalEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}
