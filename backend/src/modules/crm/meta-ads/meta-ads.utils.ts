import { GraphApiError } from "../../instagram/instagram-graph.client";
import { RESYNC_WINDOW_DAYS } from "./meta-ads.config";

const DAY_MS = 86400000;

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

/** A valid IANA zone, else WIB. */
export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** "YYYY-MM-DD" of the calendar day containing `d` in `tz` (default WIB). */
export function dateStringInTz(d: Date, tz: string | null | undefined = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "YYYY-MM-DD" of the WIB calendar day containing `d`. */
export function wibDateString(d: Date): string {
  return dateStringInTz(d, DEFAULT_TIMEZONE);
}

export function addDaysToDateString(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00.000Z") + days * DAY_MS).toISOString().slice(0, 10);
}

/** A pure date (UTC midnight) for @db.Date columns. */
export function dateOnly(s: string): Date {
  return new Date(s.slice(0, 10) + "T00:00:00.000Z");
}

/**
 * The days a run fetches (inclusive calendar days in the ad account's time
 * zone, ending today).
 *  - first run for an account (`lastRangeTo` null): the last `backfillDays`;
 *  - later runs: from the earlier of the last day successfully read and
 *    7 days ago (Meta restates recent days), so an outage never loses days,
 *    but never further back than `backfillDays`.
 */
export function computeSyncRange(
  now: Date,
  backfillDays: number,
  lastRangeTo: string | null,
  tz: string | null | undefined = DEFAULT_TIMEZONE,
): { since: string; until: string } {
  const until = dateStringInTz(now, tz);
  const floor = addDaysToDateString(until, -(backfillDays - 1));
  if (!lastRangeTo) return { since: floor, until };
  const recent = addDaysToDateString(until, -(RESYNC_WINDOW_DAYS - 1));
  const since = lastRangeTo < recent ? lastRangeTo : recent;
  return { since: since < floor ? floor : since, until };
}

/** Splits a long range into consecutive chunks of at most `days` days. */
export function chunkRange(since: string, until: string, days = 30): Array<{ since: string; until: string }> {
  const out: Array<{ since: string; until: string }> = [];
  let from = since;
  while (from <= until) {
    const end = addDaysToDateString(from, days - 1);
    const to = end < until ? end : until;
    out.push({ since: from, until: to });
    from = addDaysToDateString(to, 1);
  }
  return out;
}

/** Graph throttling: the shared classification plus the Ads Insights / Marketing API 80000-80014 codes. */
export function isAdsRateLimit(error: unknown): boolean {
  if (!(error instanceof GraphApiError)) return false;
  if (error.kind === "rate_limit") return true;
  return error.code !== undefined && error.code >= 80000 && error.code <= 80014;
}

/** Meta returns money as a decimal string in the account currency. IDR -> integer. */
export function parseSpend(raw: unknown, currency: string): number {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "0").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return currency.toUpperCase() === "IDR" ? Math.round(n) : Math.round(n * 100) / 100;
}

export function parseCount(raw: unknown): number {
  const n = Number(String(raw ?? "0"));
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 2_000_000_000) : 0;
}

const CODE_MAX = 24;

/** "PB-CAMP-LINK  (copy)" -> "PB-CAMP-LINK-COPY"; fits the campaign code rule (2-24 chars of A-Z 0-9 - _). */
export function sanitizeCampaignCode(name: string, metaCampaignId: string): string {
  let s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+/, "")
    .slice(0, CODE_MAX)
    .replace(/[-_]+$/, "");
  if (s.length < 2) s = `META-${metaCampaignId.slice(-6)}`;
  return s;
}

/** `base`, else `base-2`, `base-3`... (still <= 24 chars); `taken` holds lower-cased codes. */
export function uniqueCampaignCode(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 10_000; i++) {
    const suffix = `-${i}`;
    const candidate = base.slice(0, CODE_MAX - suffix.length).replace(/[-_]+$/, "") + suffix;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `META-${Date.now().toString(36).toUpperCase()}`.slice(0, CODE_MAX);
}

export function mapMetaStatus(effective: string | null | undefined): "ACTIVE" | "PAUSED" | "ENDED" {
  const s = (effective ?? "").toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "ARCHIVED" || s === "DELETED") return "ENDED";
  return "PAUSED";
}

export interface AdAccountInfo {
  id: string;
  name: string;
  currency: string;
  timezone?: string;
  /** Meta account_status; 1 = ACTIVE. */
  status: number;
}

export type AccountChoice =
  | { ok: true; account: AdAccountInfo }
  | { ok: false; message: string };

/** Without META_AD_ACCOUNT_ID: use the token's ad account when exactly one is active. */
export function discoverAdAccount(accounts: AdAccountInfo[]): AccountChoice {
  const active = accounts.filter((a) => a.status === 1);
  if (active.length === 1) return { ok: true, account: active[0] };
  if (active.length === 0) {
    return {
      ok: false,
      message:
        "The token sees no active ad account. Give the system user access to the ad account in Business Settings, or set the ad account id in the server settings.",
    };
  }
  return {
    ok: false,
    message: `The token sees ${active.length} active ad accounts (${active
      .map((a) => `${a.name} ${a.id}`)
      .join(", ")}). Set the ad account id in the server settings to choose one.`,
  };
}

/** Back-off after Graph rate-limit errors: 15 min, 30, 60, 120, capped at 3 h. */
export function rateLimitBackoffMs(strikes: number): number {
  const n = Math.max(1, strikes);
  return Math.min(3 * 3600_000, 15 * 60_000 * 2 ** (n - 1));
}

/** All-digit utm_campaign = a Meta campaign id (Ads Manager {{campaign.id}}). */
export function isMetaCampaignIdLike(v: string | null | undefined): v is string {
  return !!v && /^\d{5,25}$/.test(v);
}
