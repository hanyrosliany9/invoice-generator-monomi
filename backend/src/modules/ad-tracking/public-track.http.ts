import type { NextFunction, Request, Response } from "express";
import { text as textParser } from "body-parser";
import {
  AdTrackingConfig,
  isOriginAllowed,
  resolveAdTrackingConfig,
} from "./ad-tracking.config";
import { TRACK_EVENT_MAX_BYTES } from "./track-event.payload";

export const PUBLIC_TRACK_PREFIX = "/api/v1/public/track/";

const isTrackPath = (path: string) => path.toLowerCase().startsWith(PUBLIC_TRACK_PREFIX);

/**
 * CORS for the public tracking endpoints, registered BEFORE the app-wide CORS
 * (which has no business with a third-party landing page and would reject it).
 *  - POST /event: only origins in PUBLIC_TRACK_ALLOWED_ORIGINS (localhost
 *    additionally outside production). Disallowed browser origins get 403;
 *    requests without an Origin header (curl, server-to-server) pass through
 *    to the endpoint's own validation and rate limit.
 *  - GET /monomi-track.js: a public static file, readable from any origin.
 * No credentials are ever allowed.
 */
export function createPublicTrackCors(
  getConfig: () => AdTrackingConfig = () => resolveAdTrackingConfig(),
) {
  return function publicTrackCors(req: Request, res: Response, next: NextFunction) {
    if (!isTrackPath(req.path)) return next();
    const origin = req.headers.origin;
    const isScript = /\/monomi-track\.js$/i.test(req.path);

    if (isScript) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      if (req.method === "OPTIONS") return res.status(204).end();
      return next();
    }

    if (typeof origin === "string") {
      if (!isOriginAllowed(origin, getConfig())) {
        res.setHeader("Vary", "Origin");
        return res.status(403).json({ message: "Origin not allowed" });
      }
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  };
}

/**
 * Body for POST /event: raw text (sendBeacon sends text/plain; fetch from
 * the snippet too), capped at TRACK_EVENT_MAX_BYTES (413 above it). The controller
 * JSON-parses it itself. Not named jsonParser: Nest skips its default parser
 * when a middleware with that name exists.
 */
export function createPublicTrackBody() {
  const parser = textParser({ type: () => true, limit: TRACK_EVENT_MAX_BYTES });
  return function publicTrackBody(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "POST" || !isTrackPath(req.path)) return next();
    return parser(req, res, next);
  };
}

/** The first non-empty value of a header (arrays collapse to their first entry). */
export function headerString(value: string | string[] | undefined, max: number): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}
