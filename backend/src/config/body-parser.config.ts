import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
// body-parser is the parser Nest itself registers by default; it is a pinned
// dependency of @nestjs/platform-express (same situation as `cors` in main.ts).
import { json, urlencoded } from "body-parser";

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
