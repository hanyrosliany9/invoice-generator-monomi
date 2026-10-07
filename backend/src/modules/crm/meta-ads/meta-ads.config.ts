import { DEFAULT_GRAPH_VERSION } from "../../instagram/instagram.config";
import { looksLikeTokenPlaceholder } from "../../social-publishing/social-publishing.config";

/**
 * Meta Ads sync: ad spend per campaign from the Marketing API, using the same
 * production system user token as auto-publishing (needs ads_read).
 *
 *   OFF         no META_SYSTEM_USER_TOKEN, or META_ADS_SYNC_ENABLED=false
 *   INCOMPLETE  (decided at run time) the ad account could not be chosen:
 *               META_AD_ACCOUNT_ID is unset and the token sees 0 or 2+ active
 *               ad accounts
 *   INVALID     a value is malformed / a placeholder
 *   READY       the sync may run
 *
 * Env vars (names only; values never leave the process)
 *  - META_SYSTEM_USER_TOKEN, META_SYSTEM_APP_SECRET, META_GRAPH_VERSION: shared
 *  - META_AD_ACCOUNT_ID           optional; digits, with or without "act_"
 *  - META_ADS_SYNC_ENABLED        default true when the token exists
 *  - META_ADS_SYNC_BACKFILL_DAYS  first-run history in days, default 90
 *  - META_GRAPH_BASE_URL          DEV ONLY fake Graph server (ignored in production)
 */

export const DEFAULT_BACKFILL_DAYS = 90;
export const MAX_BACKFILL_DAYS = 365;
/** Meta restates recent days, so every run after the first re-reads this many. */
export const RESYNC_WINDOW_DAYS = 7;

export type MetaAdsState = "OFF" | "INCOMPLETE" | "INVALID" | "READY";

export interface MetaAdsConfig {
  state: "OFF" | "INVALID" | "READY";
  token: string | null;
  appSecret: string | null;
  graphVersion: string;
  graphBaseUrl: string;
  /** Digits without "act_"; null = discover through me/adaccounts. */
  adAccountId: string | null;
  syncEnabled: boolean;
  backfillDays: number;
  isProduction: boolean;
  /** Env var names + what is wrong; never values. Admin-only. */
  problems: string[];
}

const clean = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/** "act_123", "123" -> "123"; anything else -> null. */
export function normalizeAdAccountId(raw: string | null | undefined): string | null {
  const t = raw?.trim().replace(/^act_/i, "");
  return t && /^\d{5,25}$/.test(t) ? t : null;
}

export function resolveMetaAdsConfig(env: NodeJS.ProcessEnv = process.env): MetaAdsConfig {
  const isProduction = env.NODE_ENV === "production";
  const problems: string[] = [];
  const token = clean(env.META_SYSTEM_USER_TOKEN);
  const enabledRaw = clean(env.META_ADS_SYNC_ENABLED)?.toLowerCase();
  const syncEnabled = enabledRaw === undefined ? true : !["false", "0", "no", "off"].includes(enabledRaw);

  let invalid = false;
  if (token && looksLikeTokenPlaceholder(token)) {
    problems.push("META_SYSTEM_USER_TOKEN looks like a placeholder or is malformed");
    invalid = true;
  }
  const appSecret = clean(env.META_SYSTEM_APP_SECRET);
  if (appSecret && !/^[a-f0-9]{32}$/i.test(appSecret)) {
    problems.push("META_SYSTEM_APP_SECRET must be the 32-hex-character app secret");
    invalid = true;
  }
  let graphVersion = clean(env.META_GRAPH_VERSION) ?? DEFAULT_GRAPH_VERSION;
  if (!/^v\d{1,3}\.\d{1,2}$/.test(graphVersion)) {
    problems.push('META_GRAPH_VERSION must look like "v26.0"');
    invalid = true;
    graphVersion = DEFAULT_GRAPH_VERSION;
  }
  const rawAccount = clean(env.META_AD_ACCOUNT_ID);
  const adAccountId = normalizeAdAccountId(rawAccount);
  if (rawAccount && !adAccountId) {
    problems.push("META_AD_ACCOUNT_ID must be the numeric ad account id (with or without act_)");
    invalid = true;
  }
  let backfillDays = DEFAULT_BACKFILL_DAYS;
  const rawDays = clean(env.META_ADS_SYNC_BACKFILL_DAYS);
  if (rawDays !== null) {
    const n = /^\d{1,4}$/.test(rawDays) ? Number(rawDays) : NaN;
    if (n >= 1 && n <= MAX_BACKFILL_DAYS) backfillDays = n;
    else {
      problems.push(`META_ADS_SYNC_BACKFILL_DAYS must be a whole number from 1 to ${MAX_BACKFILL_DAYS}`);
      invalid = true;
    }
  }
  let graphBaseUrl = "https://graph.facebook.com";
  const override = clean(env.META_GRAPH_BASE_URL);
  if (override && !isProduction) {
    try {
      const u = new URL(override);
      if (u.protocol === "http:" || u.protocol === "https:") graphBaseUrl = u.origin;
      else throw new Error("protocol");
    } catch {
      problems.push("META_GRAPH_BASE_URL is not a valid http(s) URL");
      invalid = true;
    }
  }

  let state: MetaAdsConfig["state"] = "READY";
  if (!token) {
    state = "OFF";
    problems.unshift("META_SYSTEM_USER_TOKEN is not set");
  } else if (!syncEnabled) {
    state = "OFF";
    problems.unshift("META_ADS_SYNC_ENABLED is false");
  } else if (invalid) {
    state = "INVALID";
  }
  return {
    state,
    token,
    appSecret,
    graphVersion,
    graphBaseUrl,
    adAccountId,
    syncEnabled,
    backfillDays,
    isProduction,
    problems,
  };
}
