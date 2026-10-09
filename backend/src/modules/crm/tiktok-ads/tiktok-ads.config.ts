import { looksLikePlaceholder } from "../../whatsapp/whatsapp.config";

/**
 * TikTok Ads sync: ad spend per campaign from the Marketing API reporting
 * endpoint. OFF until explicitly enabled.
 *
 *   OFF         TIKTOK_ADS_SYNC_ENABLED is not "true"
 *   INCOMPLETE  enabled, but no advertiser id or no long-term access token
 *               (TIKTOK_ADS_ACCESS_TOKEN, or a token stored by the "Connect
 *               TikTok Ads" helper when TOKEN_ENCRYPTION_KEY exists)
 *   INVALID     a value is malformed / a placeholder
 *   READY       the sync may run
 *
 * Env vars (names only; values never leave the process)
 *  - TIKTOK_ADS_SYNC_ENABLED       "true" to turn the sync on (default false)
 *  - TIKTOK_ADVERTISER_ID          the ad account (advertiser) id, digits
 *  - TIKTOK_ADS_ACCESS_TOKEN       long-term advertiser access token (from the OAuth helper)
 *  - TIKTOK_ADS_APP_ID, TIKTOK_ADS_APP_SECRET   developer app, only needed by the
 *                                  "Connect TikTok Ads" helper (auth_code exchange)
 *  - TIKTOK_ADS_SYNC_BACKFILL_DAYS first-run history in days, default 90
 *  - TIKTOK_ADS_API_BASE_URL       TEST/DEV ONLY fake server origin (ignored in production)
 */
export const TIKTOK_ADS_DEFAULT_BASE_URL = "https://business-api.tiktok.com";
export const TIKTOK_ADS_DEFAULT_BACKFILL_DAYS = 90;
export const TIKTOK_ADS_MAX_BACKFILL_DAYS = 365;
/** TikTok restates recent days: every run after the first re-reads this many. */
export const TIKTOK_ADS_RESYNC_WINDOW_DAYS = 7;
/** The day-level report is read in chunks of this many days (TikTok limits the range per request). */
export const TIKTOK_ADS_REPORT_CHUNK_DAYS = 30;

export type TikTokAdsState = "OFF" | "INCOMPLETE" | "INVALID" | "READY";

export interface TikTokAdsConfig {
  state: TikTokAdsState;
  syncEnabled: boolean;
  advertiserId: string | null;
  /** Token from the environment, if any (a stored one is resolved at run time). */
  envToken: string | null;
  appId: string | null;
  appSecret: string | null;
  backfillDays: number;
  baseUrl: string;
  isProduction: boolean;
  /** Env var names + what is wrong; never values. Admin-only. */
  problems: string[];
}

const clean = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};
const flag = (v: string | undefined): boolean =>
  ["1", "true", "yes", "on"].includes(clean(v)?.toLowerCase() ?? "");

export function resolveTikTokAdsConfig(
  env: NodeJS.ProcessEnv = process.env,
  opts: { hasStoredToken?: boolean } = {},
): TikTokAdsConfig {
  const isProduction = env.NODE_ENV === "production";
  const problems: string[] = [];
  const syncEnabled = flag(env.TIKTOK_ADS_SYNC_ENABLED);
  const advertiserId = clean(env.TIKTOK_ADVERTISER_ID);
  const envToken = clean(env.TIKTOK_ADS_ACCESS_TOKEN);
  const appId = clean(env.TIKTOK_ADS_APP_ID);
  const appSecret = clean(env.TIKTOK_ADS_APP_SECRET);
  let invalid = false;

  if (advertiserId && !/^\d{5,25}$/.test(advertiserId)) {
    problems.push("TIKTOK_ADVERTISER_ID must be the numeric advertiser id");
    invalid = true;
  }
  if (envToken && (envToken.length < 20 || /\s/.test(envToken) || looksLikePlaceholder(envToken))) {
    problems.push("TIKTOK_ADS_ACCESS_TOKEN looks like a placeholder or is malformed");
    invalid = true;
  }
  if (appId && !/^\d{5,25}$/.test(appId)) {
    problems.push("TIKTOK_ADS_APP_ID must be the numeric developer app id");
    invalid = true;
  }
  if (appSecret && (appSecret.length < 16 || /\s/.test(appSecret) || looksLikePlaceholder(appSecret))) {
    problems.push("TIKTOK_ADS_APP_SECRET looks like a placeholder or is malformed");
    invalid = true;
  }
  let backfillDays = TIKTOK_ADS_DEFAULT_BACKFILL_DAYS;
  const rawDays = clean(env.TIKTOK_ADS_SYNC_BACKFILL_DAYS);
  if (rawDays !== null) {
    const n = /^\d{1,4}$/.test(rawDays) ? Number(rawDays) : NaN;
    if (n >= 1 && n <= TIKTOK_ADS_MAX_BACKFILL_DAYS) backfillDays = n;
    else {
      problems.push(`TIKTOK_ADS_SYNC_BACKFILL_DAYS must be a whole number from 1 to ${TIKTOK_ADS_MAX_BACKFILL_DAYS}`);
      invalid = true;
    }
  }
  let baseUrl = TIKTOK_ADS_DEFAULT_BASE_URL;
  const override = clean(env.TIKTOK_ADS_API_BASE_URL);
  if (override && !isProduction) {
    try {
      const u = new URL(override);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol");
      baseUrl = u.origin;
    } catch {
      problems.push("TIKTOK_ADS_API_BASE_URL is not a valid http(s) URL");
      invalid = true;
    }
  }

  let state: TikTokAdsState = "READY";
  if (!syncEnabled) {
    state = "OFF";
    problems.unshift("TIKTOK_ADS_SYNC_ENABLED is not true");
  } else if (invalid) {
    state = "INVALID";
  } else {
    if (!advertiserId) problems.push("TIKTOK_ADVERTISER_ID is not set");
    if (!envToken && !opts.hasStoredToken) {
      problems.push("TIKTOK_ADS_ACCESS_TOKEN is not set (and no token was stored with Connect TikTok Ads)");
    }
    if (!advertiserId || (!envToken && !opts.hasStoredToken)) state = "INCOMPLETE";
  }
  return { state, syncEnabled, advertiserId, envToken, appId, appSecret, backfillDays, baseUrl, isProduction, problems };
}
