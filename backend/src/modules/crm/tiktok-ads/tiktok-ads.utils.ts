import { TIKTOK_ADS_RESYNC_WINDOW_DAYS } from "./tiktok-ads.config";
import { addDaysToDateString, dateStringInTz, DEFAULT_TIMEZONE } from "../meta-ads/meta-ads.utils";

export type TikTokAdsErrorKind = "rate_limit" | "auth" | "other";

export class TikTokAdsApiError extends Error {
  constructor(
    message: string,
    readonly kind: TikTokAdsErrorKind,
    readonly status: number | null,
    readonly code: number | null,
  ) {
    super(message);
  }
}

/**
 * 40100 = too many requests (also HTTP 429); 40001 / 40002 / 40104 / 40105 /
 * 40102 = permission or token problems (the token was revoked / the scope is
 * missing). Everything else is a plain failure.
 */
export function classifyTikTokAdsError(status: number | null, code: number | null): TikTokAdsErrorKind {
  if (code === 40100 || status === 429) return "rate_limit";
  if (code !== null && [40001, 40102, 40104, 40105].includes(code)) return "auth";
  if (status === 401 || status === 403) return "auth";
  return "other";
}

/**
 * The days a run fetches (inclusive calendar days in the advertiser's time zone,
 * ending today): the last `backfillDays` on the first run; later the earlier of
 * the last day read and 7 days ago (TikTok restates recent days; reporting lags
 * about 11 h), never further back than `backfillDays`.
 */
export function computeTikTokRange(
  now: Date,
  backfillDays: number,
  lastRangeTo: string | null,
  tz: string | null | undefined = DEFAULT_TIMEZONE,
): { since: string; until: string } {
  const until = dateStringInTz(now, tz);
  const floor = addDaysToDateString(until, -(backfillDays - 1));
  if (!lastRangeTo) return { since: floor, until };
  const recent = addDaysToDateString(until, -(TIKTOK_ADS_RESYNC_WINDOW_DAYS - 1));
  const since = lastRangeTo < recent ? lastRangeTo : recent;
  return { since: since < floor ? floor : since, until };
}

/** operation_status ENABLE / DISABLE / DELETE -> CRM campaign status. */
export function mapTikTokStatus(operationStatus: string | null | undefined): "ACTIVE" | "PAUSED" | "ENDED" {
  const s = (operationStatus ?? "").toUpperCase();
  if (s === "ENABLE") return "ACTIVE";
  if (s === "DELETE") return "ENDED";
  return "PAUSED";
}

/** All-digit utm_campaign = a TikTok campaign id (__CAMPAIGN_ID__ in the ad URL). */
export function isTikTokCampaignIdLike(v: string | null | undefined): v is string {
  return !!v && /^\d{5,25}$/.test(v);
}

/** Back-off after rate-limit answers: 15 min, 30, 60, 120, capped at 3 h. */
export function tiktokBackoffMs(strikes: number): number {
  const n = Math.max(1, strikes);
  return Math.min(3 * 3600_000, 15 * 60_000 * 2 ** (n - 1));
}
