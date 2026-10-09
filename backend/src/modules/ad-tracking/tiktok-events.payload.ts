import { sha256, USER_AGENT_MAX } from "./web-capi.payload";

/** The Meta stage events the CRM queues, and the TikTok event each one becomes. */
export const TIKTOK_EVENT_FOR_META: Record<string, string> = {
  LeadSubmitted: "Lead",
  QualifiedLead: "CompleteRegistration",
  Purchase: "Purchase",
};
export const TIKTOK_STAGE_EVENTS = ["Lead", "CompleteRegistration", "Purchase"] as const;
export type TikTokStageEvent = (typeof TIKTOK_STAGE_EVENTS)[number];

export const SKIP_TT_NO_CLICK = "no landing-page ad click linked to this lead";
export const SKIP_TT_NOT_TIKTOK = "the converting click is not attributed to TikTok";
export const SKIP_TT_STALE_BEFORE_ENABLE =
  "SKIP_STALE_BEFORE_ENABLE: click-time Contact older than 24 h when the sender was enabled";
export const SKIP_TT_ATTRIBUTED_ELSEWHERE = (platform: string) =>
  `SKIP_ATTRIBUTED_${platform}: the converting click belongs to ${platform === "META" ? "Meta" : "another platform"}, not TikTok`;
/** Row on the Meta outbox for a TikTok-attributed tap (so the lead page explains why Meta got nothing). */
export const SKIP_META_ATTRIBUTED_TIKTOK =
  "SKIP_ATTRIBUTED_TIKTOK: the converting click came from TikTok, so this event goes to TikTok only";
export const skipTooOld = (days: number) =>
  `event older than ${days} days - not sent to TikTok (TikTok documents no maximum age; limit is TIKTOK_EVENTS_MAX_AGE_DAYS)`;

/**
 * Phone in TikTok's format: E.164 WITH the leading "+" ("+6281234567890"),
 * then SHA-256. Meta's helper (normalizePhoneForMeta) drops the "+" and would
 * silently give zero matches here.
 *  - input starting with "+" is already international: digits kept as typed
 *    (so a foreign +84... number is never "fixed" into +62);
 *  - otherwise Indonesian local forms: "0812..." / "812..." / "62812..." / "0062812...".
 * Returns null when it cannot be a phone number (8-15 digits, ITU E.164 max 15).
 */
export function normalizePhoneForTikTok(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (!raw.startsWith("+")) {
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("0")) d = `62${d.slice(1)}`;
    else if (d.startsWith("8")) d = `62${d}`;
  }
  if (d.startsWith("0")) return null;
  return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
}

export const hashPhoneForTikTok = (phone: string | null | undefined): string | null => {
  const e164 = normalizePhoneForTikTok(phone);
  return e164 ? sha256(e164) : null;
};

/** Email trimmed + lowercased, then SHA-256 (null for anything that is not an address). */
export function hashEmailForTikTok(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? sha256(e) : null;
}

/** TikTok click id: letters, digits and . _ - ~ = only, 4-1000 chars (no "E.C.P." prefix required). */
export const TTCLID_RE = /^[A-Za-z0-9_.~=-]{4,1000}$/;

/** The ttclid query parameter of a landing URL when it is a valid one (the snippet normally sends it too). */
export function ttclidFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const v = new URL(url).searchParams.get("ttclid");
    return v && TTCLID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export interface TikTokClick {
  visitId?: string | null;
  pageUrl: string | null;
  referrer?: string | null;
  ttclid: string | null;
  clientIp: string | null;
  userAgent: string | null;
}

export interface TikTokLead {
  id: string;
  phone: string | null;
  email?: string | null;
}

export interface TikTokEventInput {
  eventName: string;
  eventTime: Date;
  /** Stable per event: TikTok drops repeats of (pixel, event, event_id) for 48 h. */
  eventId: string;
  value?: number | string | { toString(): string } | null;
  orderId?: string | null;
  description?: string | null;
}

/**
 * One TikTok Events API 2.0 web event (event_source "web"). Field names are
 * those of the official "Report events" reference: event, event_time (UNIX
 * seconds, UTC), event_id, user{ttclid, email, phone, external_id, ip,
 * user_agent, locale}, page{url, referrer}, properties{currency, value,
 * order_id, description}. Hashed: email, phone, external_id. Raw: ttclid, ip,
 * user_agent. `_ttp` is never generated or sent (without the TikTok Pixel
 * nothing in the browser sets it).
 */
export function buildTikTokEvent(
  input: TikTokEventInput,
  click: TikTokClick,
  lead: TikTokLead | null,
  landingPageUrl: string,
): Record<string, unknown> {
  const user: Record<string, unknown> = {};
  if (click.ttclid && TTCLID_RE.test(click.ttclid)) user.ttclid = click.ttclid;
  if (lead) {
    const phone = hashPhoneForTikTok(lead.phone);
    if (phone) user.phone = phone;
    const email = hashEmailForTikTok(lead.email);
    if (email) user.email = email;
  }
  const externalIds: string[] = [];
  if (click.visitId) externalIds.push(sha256(click.visitId));
  if (lead) externalIds.push(sha256(lead.id));
  if (externalIds.length) user.external_id = externalIds;
  if (click.clientIp) user.ip = click.clientIp;
  if (click.userAgent) user.user_agent = click.userAgent.slice(0, USER_AGENT_MAX);
  if (lead) user.locale = "id-ID";

  const page: Record<string, unknown> = { url: click.pageUrl ?? landingPageUrl };
  if (click.referrer) page.referrer = click.referrer;

  const properties: Record<string, unknown> = {};
  if (input.eventName === "Purchase") {
    properties.currency = "IDR";
    if (input.value !== null && input.value !== undefined) properties.value = Number(input.value);
    if (input.orderId) properties.order_id = input.orderId;
  }
  if (input.description) properties.description = input.description;

  const event: Record<string, unknown> = {
    event: input.eventName,
    event_time: Math.floor(input.eventTime.getTime() / 1000),
    event_id: input.eventId,
    user,
    page,
  };
  if (Object.keys(properties).length) event.properties = properties;
  return event;
}

/** The request body: event_source "web", event_source_id = pixel code, data[]. */
export function buildTikTokRequest(
  pixelCode: string,
  events: Record<string, unknown>[],
  testEventCode?: string | null,
): Record<string, unknown> {
  const body: Record<string, unknown> = { event_source: "web", event_source_id: pixelCode, data: events };
  if (testEventCode) body.test_event_code = testEventCode;
  return body;
}

/** Why a TikTok row cannot be sent (or null when it can). */
export function tiktokSkipReason(
  row: {
    eventName: string;
    eventTime: Date;
    adClick: { attributedPlatform: string | null } | null;
  },
  now: Date,
  maxAgeDays: number,
): string | null {
  if (!row.adClick) return SKIP_TT_NO_CLICK;
  if (row.adClick.attributedPlatform !== "TIKTOK") return SKIP_TT_NOT_TIKTOK;
  if (now.getTime() - row.eventTime.getTime() > maxAgeDays * 86_400_000) return skipTooOld(maxAgeDays);
  return null;
}

/** What is kept of a sent event: no ip / user agent / identifiers, only which fields went out. */
export function redactTikTokEventForStorage(event: Record<string, unknown>): Record<string, unknown> {
  const { user, page, ...rest } = event;
  return {
    ...rest,
    user_fields: Object.keys((user as Record<string, unknown>) ?? {}),
    page_fields: Object.keys((page as Record<string, unknown>) ?? {}),
  };
}

export type TikTokErrorKind = "permanent" | "auth" | "rate_limit" | "transient";

/**
 * Classifies a failed call by TikTok's return code (the HTTP status is the
 * fallback):
 *  - 40002 invalid payload      -> permanent (never retried)
 *  - 40001 no permission, 40104 empty/invalid token -> auth: a configuration
 *    problem; retried with backoff (a re-generated token fixes it) until the
 *    attempts run out, and surfaced to the admin
 *  - 40100 too many requests, 429 -> rate_limit (backoff)
 *  - 5xx, network, timeouts, unknown -> transient
 *  - other 4xx -> permanent
 */
export function classifyTikTokError(status: number | null, code: number | null): TikTokErrorKind {
  if (code === 40002) return "permanent";
  if (code === 40001 || code === 40104) return "auth";
  if (code === 40100 || status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status !== null && status >= 400 && status < 500 && status !== 408) return "permanent";
  return "transient";
}
