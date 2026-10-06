import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
// body-parser is the parser Nest itself registers by default; it is a pinned
// dependency of @nestjs/platform-express (same situation as `cors` in main.ts).
import { json, raw, urlencoded } from "body-parser";

/**
 * JSON body limit for the few routes that legitimately take large bodies.
 *
 * Every other route keeps Nest's default JSON limit (body-parser's 100kb).
 * The async bulk-download DTOs accept up to BULK_DOWNLOAD_MAX_ASSETS (10,000)
 * asset IDs; at ~28 bytes per cuid that is ~280KB, which the default 100kb
 * limit rejected with HTTP 413 above ~3,650 assets. 1mb leaves headroom for
 * that plus zipFilename/projectId without opening the whole API to large
 * bodies.
 */
export const LARGE_JSON_BODY_LIMIT = "1mb";

/**
 * POST routes (path relative to the global prefix) that get the larger limit.
 * `:token` style segments are matched as a single path segment.
 */
const LARGE_JSON_BODY_ROUTE_PATTERNS: readonly string[] = [
  // Authenticated async "Download All" job
  "media-collab/bulk-download/jobs",
  // Public share link async "Download All" job
  "media-collab/public/:token/async-bulk-download",
  // Client portal async "Download All" job
  "portal/clients/:clientId/media-projects/:projectId/async-bulk-download",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRouteMatchers(patterns: readonly string[], globalPrefix: string): RegExp[] {
  const prefix = globalPrefix.replace(/^\/+|\/+$/g, "");
  return patterns.map((pattern) => {
    const segments = pattern.split("/").map((segment) =>
      segment.startsWith(":") ? "[^/]+" : escapeRegExp(segment),
    );
    const path = [prefix ? escapeRegExp(prefix) : null, ...segments]
      .filter(Boolean)
      .join("/");
    // Case-insensitive + optional trailing slash, mirroring Express's default
    // (non-strict, case-insensitive) routing so the limit applies to every
    // spelling Nest would route to the handler.
    return new RegExp(`^/${path}/?$`, "i");
  });
}

export function buildLargeJsonBodyRouteMatchers(globalPrefix: string): RegExp[] {
  return buildRouteMatchers(LARGE_JSON_BODY_ROUTE_PATTERNS, globalPrefix);
}

/**
 * Register a JSON parser with LARGE_JSON_BODY_LIMIT scoped to the routes
 * above. Must be called before `app.listen()`/`app.init()`: Nest registers its
 * default (100kb) JSON parser during init, after middleware added here, and
 * body-parser skips requests whose body was already parsed (`req._body`).
 *
 * The wrapper must NOT be named `jsonParser`: Nest skips registering its
 * default parser when a middleware with that name is already on the stack,
 * which would leave every other route without JSON parsing.
 */
export function registerLargeJsonBodyRoutes(
  app: INestApplication,
  globalPrefix: string,
): void {
  const matchers = buildLargeJsonBodyRouteMatchers(globalPrefix);
  const largeJsonParser = json({ limit: LARGE_JSON_BODY_LIMIT });

  app.use(function bulkDownloadLargeJsonBody(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (req.method === "POST" && matchers.some((re) => re.test(req.path))) {
      return largeJsonParser(req, res, next);
    }
    return next();
  });
}

/**
 * Small body limit for unauthenticated webhook-style routes that only ever
 * receive a tiny form post (Meta's deauthorize / data-deletion callbacks send
 * one `signed_request` field of a few hundred bytes). A bigger body is
 * answered with 413 by the parser instead of being buffered up to the
 * default 100kb (or surfacing as a 500).
 */
export const SMALL_BODY_LIMIT = "16kb";

const SMALL_BODY_ROUTE_PATTERNS: readonly string[] = [
  "instagram/deauthorize",
  "instagram/data-deletion",
];

export function buildSmallBodyRouteMatchers(globalPrefix: string): RegExp[] {
  return buildRouteMatchers(SMALL_BODY_ROUTE_PATTERNS, globalPrefix);
}

/**
 * Register JSON + urlencoded parsers limited to SMALL_BODY_LIMIT on the routes
 * above. Same ordering rules as registerLargeJsonBodyRoutes (before init; the
 * wrapper is not named `jsonParser`/`urlencodedParser`).
 */
export function registerSmallBodyRoutes(app: INestApplication, globalPrefix: string): void {
  const matchers = buildSmallBodyRouteMatchers(globalPrefix);
  const smallJson = json({ limit: SMALL_BODY_LIMIT });
  const smallForm = urlencoded({ limit: SMALL_BODY_LIMIT, extended: false, parameterLimit: 20 });

  app.use(function webhookSmallBody(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "POST" || !matchers.some((re) => re.test(req.path))) return next();
    return smallJson(req, res, (err?: unknown) => (err ? next(err) : smallForm(req, res, next)));
  });
}

/**
 * Raw (Buffer) body for webhooks whose signature is computed over the exact
 * request bytes: Meta's X-Hub-Signature-256 = HMAC-SHA256(app secret, raw
 * body). Re-serialised JSON would not match, so these routes must never go
 * through the JSON parser. Any content type is accepted as bytes; the
 * controller parses JSON itself only after the signature check.
 *
 * Cap: 3mb, 413 above it (checked against Content-Length before reading).
 * Kept at 3mb on purpose: Meta documents WhatsApp webhook payloads of up to
 * 3MB, and coexistence history-sync chunks are the largest of them; a lower
 * cap would make Meta retry and finally drop those deliveries. The cost of
 * the cap is bounded instead by what runs BEFORE any byte is buffered:
 *  1. a per-IP token bucket (WEBHOOK_RATE_LIMIT, 600/min/IP, in memory) —
 *     generous for Meta (deliveries come from many Meta IPs and a 429 is
 *     retried by Meta), but stops one client from streaming 3mb bodies in a
 *     tight loop; no IP is ever hard-blocked (Meta's ranges change);
 *  2. an optional gate (feature off / not configured -> 404 / 503);
 *  3. a cheap header check: no well-formed X-Hub-Signature-256 -> 401;
 *  4. a global cap on bodies being buffered at the same time
 *     (RAW_BODY_MAX_CONCURRENT x 3mb of memory at most) -> 503 + Retry-After.
 * The controller repeats every check (defence in depth).
 */
export const RAW_BODY_LIMIT = "3mb";
export const RAW_BODY_MAX_CONCURRENT = 16;
export const WEBHOOK_RATE_LIMIT = { perMinute: 600, burst: 600, maxTrackedIps: 10_000 };

/**
 * Small in-memory token bucket keyed by client IP. LRU-bounded so a flood of
 * distinct (spoofed or real) addresses cannot grow memory without bound.
 */
export class IpTokenBucket {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly perMinute: number,
    private readonly burst: number,
    private readonly maxKeys: number,
  ) {}

  /** Takes one token; returns 0 when allowed, else the seconds until the next token. */
  take(key: string, now = Date.now()): number {
    const ratePerMs = this.perMinute / 60_000;
    const prev = this.buckets.get(key);
    let tokens = this.burst;
    if (prev) {
      tokens = Math.min(this.burst, prev.tokens + (now - prev.at) * ratePerMs);
      this.buckets.delete(key); // re-insert below: Map order = LRU order
    }
    const allowed = tokens >= 1;
    if (allowed) tokens -= 1;
    this.buckets.set(key, { tokens, at: now });
    while (this.buckets.size > this.maxKeys) {
      const oldest = this.buckets.keys().next().value as string;
      this.buckets.delete(oldest);
    }
    return allowed ? 0 : Math.max(1, Math.ceil((1 - tokens) / ratePerMs / 1000));
  }

  get size(): number {
    return this.buckets.size;
  }
}

/** Early answer for a webhook request (before its body is read), or null to continue. */
export type RawBodyGate = (req: Request) => { status: number; message: string } | null;

export interface RawBodyRouteOptions {
  /** e.g. 404 when the WhatsApp feature is OFF, 503 while it is misconfigured. */
  gate?: RawBodyGate;
  /** Override for tests. */
  rateLimit?: { perMinute: number; burst: number; maxTrackedIps?: number };
  maxConcurrent?: number;
}

const SIGNATURE_HEADER_RE = /^sha256=[0-9a-f]{64}$/i;

const RAW_BODY_ROUTE_PATTERNS: readonly string[] = ["whatsapp/webhook"];

export function buildRawBodyRouteMatchers(globalPrefix: string): RegExp[] {
  return buildRouteMatchers(RAW_BODY_ROUTE_PATTERNS, globalPrefix);
}

/** Refuse without reading the request body; close the connection so it is not drained. */
function refuseEarly(
  res: Response,
  status: number,
  message: string,
  retryAfterSec?: number,
): void {
  res.setHeader("Connection", "close");
  res.setHeader("Cache-Control", "no-store");
  if (retryAfterSec) res.setHeader("Retry-After", String(retryAfterSec));
  res.status(status).json({ message });
}

/** Same ordering rules as registerLargeJsonBodyRoutes (before init; not named jsonParser). */
export function registerRawBodyRoutes(
  app: INestApplication,
  globalPrefix: string,
  options: RawBodyRouteOptions = {},
): void {
  const matchers = buildRawBodyRouteMatchers(globalPrefix);
  const rawParser = raw({ type: () => true, limit: RAW_BODY_LIMIT });
  const rl = { ...WEBHOOK_RATE_LIMIT, ...(options.rateLimit ?? {}) };
  const bucket = new IpTokenBucket(rl.perMinute, rl.burst, rl.maxTrackedIps ?? WEBHOOK_RATE_LIMIT.maxTrackedIps);
  const maxConcurrent = options.maxConcurrent ?? RAW_BODY_MAX_CONCURRENT;
  let buffering = 0;

  app.use(function webhookRawBody(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "POST" || !matchers.some((re) => re.test(req.path))) return next();

    // 1) per-IP rate limit (req.ip honours the app's trust-proxy setting)
    const wait = bucket.take(req.ip || req.socket?.remoteAddress || "unknown");
    if (wait > 0) return refuseEarly(res, 429, "Too many requests", wait);

    // 2) feature gate (OFF -> 404, misconfigured -> 503)
    const gated = options.gate?.(req);
    if (gated) {
      return refuseEarly(res, gated.status, gated.message, gated.status === 503 ? 300 : undefined);
    }

    // 3) a signed delivery always carries a well-formed signature header
    const sig = req.headers["x-hub-signature-256"];
    if (typeof sig !== "string" || !SIGNATURE_HEADER_RE.test(sig.trim())) {
      return refuseEarly(res, 401, "Invalid signature");
    }

    // 4) bound the memory held by bodies being buffered concurrently
    if (buffering >= maxConcurrent) return refuseEarly(res, 503, "Busy, retry later", 5);
    buffering += 1;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        buffering -= 1;
      }
    };
    res.once("finish", release);
    res.once("close", release);
    return rawParser(req, res, next);
  });
}
