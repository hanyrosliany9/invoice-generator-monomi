import { createHash } from "crypto";

/** Meta rejects events older than 7 days (one stale event fails the request). */
export const WEB_CAPI_MAX_AGE_MS = 7 * 86_400_000;
export const SKIP_WEB_TOO_OLD = "event older than 7 days — not accepted by Meta";
export const SKIP_WEB_NO_CLICK = "no landing-page ad click linked to this lead";
export const SKIP_WEB_LEAD_AT_CLICK =
  "Lead event is already sent when the WhatsApp button is tapped";
export const SKIP_WEB_HAS_CTWA =
  "lead has a Click-to-WhatsApp id — sent through the WhatsApp route instead";

// Click-time Leads that are stored (and linkable in the CRM) but not forwarded
// to Meta. The code comes first so the reason is easy to filter on.
export const SKIP_UNVERIFIED_VISIT =
  "SKIP_UNVERIFIED_VISIT: no PageView from the same network at least 3 s before the WhatsApp tap";
export const SKIP_DUPLICATE_VISIT_LEAD =
  "SKIP_DUPLICATE_VISIT_LEAD: a Lead was already forwarded for this visit";
export const SKIP_DUPLICATE_CLICK_ID =
  "SKIP_DUPLICATE_CLICK_ID: a Lead was already forwarded for this Meta click id in the last 24 h";
export const SKIP_IP_LEAD_CAP =
  "SKIP_IP_LEAD_CAP: too many forwarded Leads from this network in the last hour";
export const SKIP_LIMITER_UNAVAILABLE =
  "SKIP_LIMITER_UNAVAILABLE: the rate-limit store could not be reached";
export const SKIP_STALE_BEFORE_ENABLE =
  "SKIP_STALE_BEFORE_ENABLE: click-time Lead older than 24 h when the sender was enabled";

/** User agents longer than this are cut (stored and sent). */
export const USER_AGENT_MAX = 512;

export const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

/**
 * Phone in Meta's format: digits only, country code, no "+", no leading 0
 * (Indonesian "0812-3456-7890" / "+62 812 ..." -> "628123456789...").
 * Returns null when it cannot be a phone number.
 */
export function normalizePhoneForMeta(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  else if (d.startsWith("8")) d = `62${d}`;
  return d.length >= 9 && d.length <= 15 ? d : null;
}

/** Lowercase, letters only (no punctuation/digits), as Meta asks before hashing. */
export function normalizeNameToken(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[^\p{L}]/gu, "");
}

/** First / last name from a full name; names without letters (a bare phone) give nothing. */
export function splitName(name: string | null | undefined): { fn: string | null; ln: string | null } {
  const parts = (name ?? "")
    .split(/\s+/)
    .map(normalizeNameToken)
    .filter(Boolean);
  if (parts.length === 0) return { fn: null, ln: null };
  return { fn: parts[0], ln: parts.length > 1 ? parts[parts.length - 1] : null };
}

export interface WebClick {
  /** First-party visit id from the snippet; its hash is the external_id on every event. */
  visitId?: string | null;
  pageUrl: string | null;
  fbc: string | null;
  fbp: string | null;
  clientIp: string | null;
  userAgent: string | null;
  campaignCode?: string | null;
}

export interface WebLead {
  id: string;
  name: string | null;
  /** Null for a lead auto-created from the landing page until the chat arrives (no ph is sent). */
  phone: string | null;
  /** The name is a brand / "@handle" / "Website visitor · Kode", not a person: no fn / ln. */
  nameIsPlaceholder?: boolean | null;
}

export interface WebEventInput {
  eventName: string;
  eventTime: Date;
  /** CAPI event_id: the click eventId for Lead (browser dedup), else the outbox row id. */
  eventId: string;
  value?: number | string | { toString(): string } | null;
}

/**
 * One website Conversions API event (action_source "website").
 * Technical fields (ip, user agent, fbc, fbp) are sent as-is; personal data
 * (phone, names, country, external id) is normalised and SHA-256 hashed.
 */
export function buildWebEvent(
  input: WebEventInput,
  click: WebClick,
  lead: WebLead | null,
): Record<string, unknown> {
  const userData: Record<string, unknown> = {};
  if (click.clientIp) userData.client_ip_address = click.clientIp;
  if (click.userAgent) userData.client_user_agent = click.userAgent.slice(0, USER_AGENT_MAX);
  if (click.fbc) userData.fbc = click.fbc;
  if (click.fbp) userData.fbp = click.fbp;
  // external_id: ties the visit's events (PageView ... Lead) and the later CRM
  // stage events of the same person together on Meta's side.
  const externalIds: string[] = [];
  if (click.visitId) externalIds.push(sha256(click.visitId));
  if (lead) externalIds.push(sha256(lead.id));
  if (externalIds.length) userData.external_id = externalIds;
  if (lead) {
    const ph = normalizePhoneForMeta(lead.phone);
    if (ph) userData.ph = [sha256(ph)];
    const { fn, ln } = lead.nameIsPlaceholder ? { fn: null, ln: null } : splitName(lead.name);
    if (fn) userData.fn = [sha256(fn)];
    if (ln) userData.ln = [sha256(ln)];
    userData.country = [sha256("id")];
  }
  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(input.eventTime.getTime() / 1000),
    event_id: input.eventId,
    action_source: "website",
    user_data: userData,
  };
  if (click.pageUrl) event.event_source_url = click.pageUrl;
  const custom: Record<string, unknown> = {};
  if (input.eventName === "Purchase" && input.value !== null && input.value !== undefined) {
    custom.value = Number(input.value);
    custom.currency = "IDR";
  }
  if (click.campaignCode) custom.campaign_code = click.campaignCode;
  if (Object.keys(custom).length) event.custom_data = custom;
  return event;
}

/** Why a website-route row cannot be sent (or null when it can). */
export function webSkipReason(
  row: {
    eventName: string;
    eventTime: Date;
    adClick: unknown | null;
    lead: { ctwaClid: string | null } | null;
  },
  now: Date,
): string | null {
  if (row.eventName === "LeadSubmitted") return SKIP_WEB_LEAD_AT_CLICK;
  // The click-time Lead is the website tap itself; linking its click to a
  // CTWA lead later does not move it to the WhatsApp route.
  if (row.eventName !== "Lead" && row.lead?.ctwaClid) return SKIP_WEB_HAS_CTWA;
  if (!row.adClick) return SKIP_WEB_NO_CLICK;
  if (now.getTime() - row.eventTime.getTime() > WEB_CAPI_MAX_AGE_MS) return SKIP_WEB_TOO_OLD;
  return null;
}

/** What is kept of a sent event: no ip / user agent / identifiers, only which fields went out. */
export function redactEventForStorage(event: Record<string, unknown>): Record<string, unknown> {
  const { user_data, ...rest } = event;
  return {
    ...rest,
    user_data_fields: Object.keys((user_data as Record<string, unknown>) ?? {}),
  };
}
