import { Logger } from "@nestjs/common";
import { looksLikePlaceholder } from "../whatsapp/whatsapp.config";
import { toHttpOrigin } from "./ad-tracking.config";

/**
 * TikTok Events API (server-side web conversions from the landing page).
 * Never fatal: a missing / partial / invalid configuration only keeps the
 * sender off (rows wait as PENDING_CONFIG while clicks keep being stored).
 *
 *   OFF         TIKTOK_EVENTS_ENABLED is not "true"
 *   INCOMPLETE  enabled, but TIKTOK_PIXEL_ID or TIKTOK_EVENTS_ACCESS_TOKEN is missing
 *   INVALID     a value is malformed / a placeholder
 *   READY       the sender may POST /open_api/v1.3/event/track/
 *
 * Env vars
 *  - TIKTOK_PIXEL_ID                pixel code (event_source_id), e.g. CXXXXXXXXXXXXXXXXXXX
 *  - TIKTOK_EVENTS_ACCESS_TOKEN     Events API token (Events Manager > pixel > Settings)
 *  - TIKTOK_EVENTS_ENABLED          "true" to actually send events (default false)
 *  - TIKTOK_TEST_EVENT_CODE         optional Events Manager "Test Events" code (remove for production)
 *  - TIKTOK_EVENTS_MAX_AGE_DAYS     events older than this are SKIPPED (default 7; TikTok documents
 *                                   no maximum age: OPEN ITEM, confirm with test events)
 *  - TIKTOK_EVENTS_API_BASE_URL     TEST/DEV ONLY fake server origin (ignored in production)
 */
export const TIKTOK_DEFAULT_BASE_URL = "https://business-api.tiktok.com";
export const TIKTOK_EVENT_PATH = "/open_api/v1.3/event/track/";
export const TIKTOK_DEFAULT_MAX_AGE_DAYS = 7;
/** TikTok pixel codes look like C3Q... (alphanumeric, ~20 chars). */
export const TIKTOK_PIXEL_RE = /^[A-Za-z0-9]{8,40}$/;

export type TikTokEventsState = "OFF" | "INCOMPLETE" | "INVALID" | "READY";

export interface TikTokEventsConfig {
  state: TikTokEventsState;
  enabled: boolean;
  pixelId: string | null;
  token: string | null;
  testEventCode: string | null;
  maxAgeDays: number;
  baseUrl: string;
  isProduction: boolean;
  /** Env var names + what is wrong; never values. */
  problems: string[];
}

const logger = new Logger("TikTokEventsConfig");
const clean = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};
const flag = (v: string | undefined): boolean =>
  ["1", "true", "yes", "on"].includes(clean(v)?.toLowerCase() ?? "");

export function resolveTikTokEventsConfig(env: NodeJS.ProcessEnv = process.env): TikTokEventsConfig {
  const isProduction = env.NODE_ENV === "production";
  const problems: string[] = [];
  const enabled = flag(env.TIKTOK_EVENTS_ENABLED);
  const pixelId = clean(env.TIKTOK_PIXEL_ID);
  const token = clean(env.TIKTOK_EVENTS_ACCESS_TOKEN);
  let invalid = false;

  if (enabled) {
    if (!pixelId) problems.push("TIKTOK_PIXEL_ID is not set");
    if (!token) problems.push("TIKTOK_EVENTS_ACCESS_TOKEN is not set");
  }
  if (pixelId && !TIKTOK_PIXEL_RE.test(pixelId)) {
    problems.push("TIKTOK_PIXEL_ID must be the alphanumeric Pixel code");
    invalid = true;
  }
  if (token && (token.length < 20 || /\s/.test(token) || looksLikePlaceholder(token))) {
    problems.push("TIKTOK_EVENTS_ACCESS_TOKEN looks like a placeholder or is malformed");
    invalid = true;
  }
  const testEventCode = clean(env.TIKTOK_TEST_EVENT_CODE);
  if (testEventCode && !/^[A-Za-z0-9_-]{3,64}$/.test(testEventCode)) {
    problems.push("TIKTOK_TEST_EVENT_CODE is malformed");
    invalid = true;
  }

  let maxAgeDays = TIKTOK_DEFAULT_MAX_AGE_DAYS;
  const rawAge = clean(env.TIKTOK_EVENTS_MAX_AGE_DAYS);
  if (rawAge !== null) {
    const n = /^\d{1,3}$/.test(rawAge) ? Number(rawAge) : NaN;
    if (n >= 1 && n <= 365) maxAgeDays = n;
    else {
      problems.push("TIKTOK_EVENTS_MAX_AGE_DAYS must be a whole number from 1 to 365");
      invalid = true;
    }
  }

  let baseUrl = TIKTOK_DEFAULT_BASE_URL;
  const override = clean(env.TIKTOK_EVENTS_API_BASE_URL);
  if (override) {
    if (isProduction) {
      logger.warn("TIKTOK_EVENTS_API_BASE_URL is ignored in production");
    } else {
      const o = toHttpOrigin(override);
      if (o) baseUrl = o;
      else {
        problems.push("TIKTOK_EVENTS_API_BASE_URL is not a valid http(s) URL");
        invalid = true;
      }
    }
  }

  const state: TikTokEventsState = !enabled
    ? "OFF"
    : invalid
      ? "INVALID"
      : !pixelId || !token
        ? "INCOMPLETE"
        : "READY";
  return { state, enabled, pixelId, token, testEventCode, maxAgeDays, baseUrl, isProduction, problems };
}

let reported = false;
/** Logs the state once at boot. Never throws. */
export function reportTikTokEventsConfig(): TikTokEventsConfig | null {
  try {
    const cfg = resolveTikTokEventsConfig();
    if (!reported) {
      reported = true;
      if (cfg.problems.length) logger.warn(`TikTok Events API ${cfg.state}: ${cfg.problems.join("; ")}`);
      else logger.log(`TikTok Events API: ${cfg.state}`);
    }
    return cfg;
  } catch (error) {
    logger.warn(`TikTok Events config check failed: ${(error as Error).message}`);
    return null;
  }
}
