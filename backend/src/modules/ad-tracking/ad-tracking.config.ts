import { Logger } from "@nestjs/common";
import { DEFAULT_GRAPH_VERSION } from "../instagram/instagram.config";
import { looksLikePlaceholder } from "../whatsapp/whatsapp.config";

/**
 * Landing-page tracking: website Conversions API (Pixel dataset) + the public
 * click endpoint. Never fatal: a missing/partial/invalid configuration only
 * keeps the website CAPI sender off (clicks are still stored and linked, and
 * events wait as PENDING_CONFIG).
 *
 *   OFF         META_WEB_CAPI_ENABLED is not "true"
 *   INCOMPLETE  enabled, but META_PIXEL_ID or META_WEB_CAPI_TOKEN is missing
 *   INVALID     a value is malformed / a placeholder
 *   READY       the sender may POST /{pixel}/events
 *
 * Env vars
 *  - META_PIXEL_ID                 the Pixel (dataset) id used by the landing page
 *  - META_WEB_CAPI_TOKEN           Conversions API token generated in Events Manager
 *  - META_WEB_CAPI_ENABLED         "true" to actually send events (default false)
 *  - META_WEB_CAPI_TEST_EVENT_CODE optional Events Manager "Test events" code
 *  - PUBLIC_TRACK_ALLOWED_ORIGINS  comma list of origins allowed to call the click
 *                                  endpoint (default https://link.monomiagency.com;
 *                                  localhost is also accepted outside production)
 *  - LANDING_PAGE_URL              base of "Copy ad link" (default
 *                                  https://link.monomiagency.com)
 *  - META_GRAPH_VERSION            shared, default v26.0
 *  - META_WEB_CAPI_GRAPH_BASE_URL  DEV ONLY fake Graph server (ignored in production)
 */

export const DEFAULT_LANDING_PAGE_URL = "https://link.monomiagency.com";
export const DEFAULT_TRACK_ORIGINS = ["https://link.monomiagency.com"];
export const PIXEL_ID_RE = /^\d{5,25}$/;

export type WebCapiState = "OFF" | "INCOMPLETE" | "INVALID" | "READY";

export interface AdTrackingConfig {
  state: WebCapiState;
  enabled: boolean;
  pixelId: string | null;
  token: string | null;
  testEventCode: string | null;
  graphVersion: string;
  graphBaseUrl: string;
  allowedOrigins: string[];
  allowLocalhost: boolean;
  landingPageUrl: string;
  isProduction: boolean;
  /** Env var names + what is wrong; never values. */
  problems: string[];
}

const logger = new Logger("AdTrackingConfig");
const clean = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};
const flag = (v: string | undefined): boolean =>
  ["1", "true", "yes", "on"].includes(clean(v)?.toLowerCase() ?? "");

/** Bare origin of an http(s) URL, or null. */
export function toHttpOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;
export function isLocalOrigin(origin: string): boolean {
  return LOCAL_ORIGIN_RE.test(origin);
}

export function resolveAdTrackingConfig(
  env: NodeJS.ProcessEnv = process.env,
): AdTrackingConfig {
  const isProduction = env.NODE_ENV === "production";
  const problems: string[] = [];
  const enabled = flag(env.META_WEB_CAPI_ENABLED);
  const pixelId = clean(env.META_PIXEL_ID);
  const token = clean(env.META_WEB_CAPI_TOKEN);

  let invalid = false;
  if (enabled) {
    if (!pixelId) problems.push("META_PIXEL_ID is not set");
    if (!token) problems.push("META_WEB_CAPI_TOKEN is not set");
  }
  if (pixelId && !PIXEL_ID_RE.test(pixelId)) {
    problems.push("META_PIXEL_ID must be the numeric Pixel id");
    invalid = true;
  }
  if (token && (token.length < 20 || /\s/.test(token) || looksLikePlaceholder(token))) {
    problems.push("META_WEB_CAPI_TOKEN looks like a placeholder or is malformed");
    invalid = true;
  }

  let graphVersion = clean(env.META_GRAPH_VERSION) ?? DEFAULT_GRAPH_VERSION;
  if (!/^v\d{1,3}\.\d{1,2}$/.test(graphVersion)) {
    problems.push('META_GRAPH_VERSION must look like "v26.0"');
    invalid = true;
    graphVersion = DEFAULT_GRAPH_VERSION;
  }
  let graphBaseUrl = "https://graph.facebook.com";
  const override = clean(env.META_WEB_CAPI_GRAPH_BASE_URL);
  if (override) {
    if (isProduction) {
      logger.warn("META_WEB_CAPI_GRAPH_BASE_URL is ignored in production");
    } else {
      const o = toHttpOrigin(override);
      if (o) graphBaseUrl = o;
      else {
        problems.push("META_WEB_CAPI_GRAPH_BASE_URL is not a valid http(s) URL");
        invalid = true;
      }
    }
  }

  const listed = (clean(env.PUBLIC_TRACK_ALLOWED_ORIGINS) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins: string[] = [];
  for (const raw of listed) {
    const o = toHttpOrigin(raw);
    // "*" and non-URLs are refused: the endpoint is open to named sites only.
    if (o && (!isProduction || o.startsWith("https://"))) {
      if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
    } else {
      problems.push("PUBLIC_TRACK_ALLOWED_ORIGINS contains an invalid origin");
    }
  }
  if (allowedOrigins.length === 0) allowedOrigins.push(...DEFAULT_TRACK_ORIGINS);

  const landingPageUrl =
    toHttpOrigin(clean(env.LANDING_PAGE_URL)) ?? DEFAULT_LANDING_PAGE_URL;

  const state: WebCapiState = !enabled
    ? "OFF"
    : invalid
      ? "INVALID"
      : !pixelId || !token
        ? "INCOMPLETE"
        : "READY";

  return {
    state,
    enabled,
    pixelId,
    token,
    testEventCode: clean(env.META_WEB_CAPI_TEST_EVENT_CODE),
    graphVersion,
    graphBaseUrl,
    allowedOrigins,
    allowLocalhost: !isProduction,
    landingPageUrl,
    isProduction,
    problems,
  };
}

let reported = false;
/** Logs the state once at boot. Never throws. */
export function reportAdTrackingConfig(): AdTrackingConfig | null {
  try {
    const cfg = resolveAdTrackingConfig();
    if (!reported) {
      reported = true;
      if (cfg.problems.length)
        logger.warn(`Landing page tracking ${cfg.state}: ${cfg.problems.join("; ")}`);
      else logger.log(`Landing page tracking website CAPI: ${cfg.state}`);
    }
    return cfg;
  } catch (error) {
    logger.warn(`Landing page tracking config check failed: ${(error as Error).message}`);
    return null;
  }
}

/** Origin allowed to call the public click endpoint? */
export function isOriginAllowed(origin: string, cfg: AdTrackingConfig): boolean {
  if (cfg.allowedOrigins.includes(origin)) return true;
  return cfg.allowLocalhost && isLocalOrigin(origin);
}
