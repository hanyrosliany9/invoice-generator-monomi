import { createHash, createHmac, timingSafeEqual } from "crypto";
import { parseQuickAdd } from "../crm/crm.utils";

/**
 * Pure helpers for the WhatsApp module (no Nest / Prisma) — unit-testable.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
/** Free-form messages are allowed for 24h after the customer's last message. */
export const SERVICE_WINDOW_MS = 24 * HOUR_MS;
/** Click-to-WhatsApp free entry point window. */
export const FREE_ENTRY_MS = 72 * HOUR_MS;

// ---------------------------------------------------------------------------
// Webhook security
// ---------------------------------------------------------------------------

/**
 * Verify Meta's X-Hub-Signature-256 header ("sha256=<hex>") against
 * HMAC-SHA256(appSecret, rawBody). Must be given the RAW request bytes —
 * re-serialised JSON would not match. Constant-time comparison.
 */
export function verifyWebhookSignature(
  rawBody: Buffer | null | undefined,
  header: string | string[] | null | undefined,
  appSecret: string | null | undefined,
): boolean {
  if (!appSecret || !Buffer.isBuffer(rawBody)) return false;
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return false;
  const m = /^sha256=([a-f0-9]{64})$/i.exec(value.trim());
  if (!m) return false;
  const given = Buffer.from(m[1].toLowerCase(), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Constant-time string comparison (hash both sides so lengths never leak). */
export function safeEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    a.length === 0 ||
    b.length === 0
  )
    return false;
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb) && a === b;
}

export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

// ---------------------------------------------------------------------------
// Identifiers & timestamps
// ---------------------------------------------------------------------------

export const isWaId = (v: unknown): v is string =>
  typeof v === "string" && /^\d{6,20}$/.test(v);
export const isMediaId = (v: unknown): v is string =>
  typeof v === "string" && /^\d{5,30}$/.test(v);
export const isWaMessageId = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length >= 4 &&
  v.length <= 256 &&
  /^[A-Za-z0-9._=:+/-]+$/.test(v);

/** Unix seconds (string or number) -> Date; null when absent/out of range. */
export function tsFromUnix(
  v: unknown,
  fallback: Date | null = null,
): Date | null {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && /^\d{9,11}$/.test(v)
        ? Number(v)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  const d = new Date(n * 1000);
  // between 2009 and "now + 1 day" (clock skew)
  if (d.getTime() < 1230768000000 || d.getTime() > Date.now() + DAY_MS)
    return fallback;
  return d;
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t.slice(0, max);
};

// ---------------------------------------------------------------------------
// Message content
// ---------------------------------------------------------------------------

export interface ParsedMedia {
  id: string | null;
  mime: string | null;
  caption: string | null;
  filename: string | null;
}

export interface ParsedContent {
  type: string;
  text: string | null;
  media: ParsedMedia | null;
  contextId: string | null;
}

const MEDIA_TYPES = ["image", "video", "audio", "document", "sticker"];
const SAFE_MIME = /^[a-z]+\/[a-z0-9.+-]{1,80}(;\s?[a-z0-9=._ -]{1,60})?$/i;

/** Extract what we store from a Cloud API message / echo / history message object. */
export function parseMessageContent(msg: any): ParsedContent {
  const type =
    typeof msg?.type === "string" && /^[a-z_]{2,30}$/.test(msg.type)
      ? msg.type
      : "unknown";
  let text: string | null = null;
  let media: ParsedMedia | null = null;
  if (type === "text") {
    text = str(msg.text?.body, 8000);
  } else if (MEDIA_TYPES.includes(type)) {
    const m = msg[type] ?? {};
    media = {
      id: isMediaId(m.id) ? m.id : null,
      mime:
        typeof m.mime_type === "string" && SAFE_MIME.test(m.mime_type)
          ? m.mime_type.slice(0, 120)
          : null,
      caption: str(m.caption, 2000),
      filename: str(m.filename, 200),
    };
    text = media.caption;
  } else if (type === "location") {
    const l = msg.location ?? {};
    const name = str(l.name, 200) ?? str(l.address, 300);
    const lat = typeof l.latitude === "number" ? l.latitude.toFixed(5) : null;
    const lng = typeof l.longitude === "number" ? l.longitude.toFixed(5) : null;
    text =
      [name, lat && lng ? `(${lat}, ${lng})` : null]
        .filter(Boolean)
        .join(" ") || null;
  } else if (type === "contacts") {
    const names = Array.isArray(msg.contacts)
      ? msg.contacts
          .map((c: any) => str(c?.name?.formatted_name, 100))
          .filter(Boolean)
      : [];
    text = names.length ? names.join(", ") : null;
  } else if (type === "button") {
    text = str(msg.button?.text, 500) ?? str(msg.button?.payload, 500);
  } else if (type === "interactive") {
    const i = msg.interactive ?? {};
    text =
      str(i.button_reply?.title, 500) ??
      str(i.list_reply?.title, 500) ??
      str(i.nfm_reply?.body, 1000);
  } else if (type === "reaction") {
    text = str(msg.reaction?.emoji, 20);
  } else if (type === "template") {
    text = str(msg.template?.name, 200);
  } else if (type === "order") {
    text = "order";
  }
  const contextId = isWaMessageId(msg?.context?.id) ? msg.context.id : null;
  return { type, text, media, contextId };
}

/** Short single-line preview for the conversation list. */
export function previewOf(content: {
  type: string;
  text: string | null;
}): string {
  const base = content.text
    ? content.text.replace(/\s+/g, " ").trim()
    : `[${content.type}]`;
  return base.length > 120 ? `${base.slice(0, 117)}...` : base;
}

const REFERRAL_FIELDS = [
  "source_url",
  "source_id",
  "source_type",
  "headline",
  "body",
  "media_type",
  "image_url",
  "video_url",
  "thumbnail_url",
  "ctwa_clid",
] as const;

export type Referral = Partial<
  Record<(typeof REFERRAL_FIELDS)[number], string>
>;

/** Keep only known referral fields (strings, length-capped); null when empty. */
export function sanitizeReferral(ref: unknown): Referral | null {
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) return null;
  const out: Referral = {};
  for (const f of REFERRAL_FIELDS) {
    const v = (ref as Record<string, unknown>)[f];
    const s =
      typeof v === "string"
        ? str(v, f === "body" ? 1000 : 500)
        : typeof v === "number"
          ? String(v)
          : null;
    if (s) out[f] = s;
  }
  // URLs we may render as links must be http(s).
  for (const f of [
    "source_url",
    "image_url",
    "video_url",
    "thumbnail_url",
  ] as const) {
    if (out[f] && !/^https?:\/\//i.test(out[f] as string)) delete out[f];
  }
  if (out.ctwa_clid && !/^[A-Za-z0-9._-]{4,500}$/.test(out.ctwa_clid))
    delete out.ctwa_clid;
  if (out.source_id && !/^[A-Za-z0-9_-]{1,64}$/.test(out.source_id))
    delete out.source_id;
  return Object.keys(out).length ? out : null;
}

// ---------------------------------------------------------------------------
// Campaign attribution
// ---------------------------------------------------------------------------

export interface CampaignRef {
  id: string;
  code: string;
  name: string;
  metaAdIds: string[];
}

export type CampaignMatchReason =
  | "code_in_message"
  | "ad_id"
  | "code_in_headline";

/**
 * Attribute a first message to a campaign:
 *   1. "[CODE]" (or a bare known code) in the message text (ad prefill);
 *   2. referral.source_id listed in Campaign.metaAdIds;
 *   3. a campaign code appearing in the referral headline/body.
 */
export function matchCampaign(
  text: string | null,
  referral: Referral | null,
  campaigns: CampaignRef[],
): {
  campaign: CampaignRef | null;
  code: string | null;
  reason: CampaignMatchReason | null;
} {
  const codes = campaigns.map((c) => c.code);
  if (text) {
    const parsed = parseQuickAdd(text, codes);
    if (parsed.campaignCode) {
      const c =
        campaigns.find((x) => x.code.toUpperCase() === parsed.campaignCode) ??
        null;
      return {
        campaign: c,
        code: parsed.campaignCode,
        reason: c ? "code_in_message" : null,
      };
    }
  }
  if (referral?.source_id) {
    const c = campaigns.find((x) =>
      x.metaAdIds.includes(referral.source_id as string),
    );
    if (c) return { campaign: c, code: c.code, reason: "ad_id" };
  }
  const hay =
    `${referral?.headline ?? ""} ${referral?.body ?? ""}`.toUpperCase();
  if (hay.trim()) {
    for (const c of campaigns) {
      const code = c.code.toUpperCase();
      const re = new RegExp(
        `(^|[^A-Z0-9_-])${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Z0-9_-])`,
      );
      if (re.test(hay))
        return { campaign: c, code: c.code, reason: "code_in_headline" };
    }
  }
  return { campaign: null, code: null, reason: null };
}

// ---------------------------------------------------------------------------
// Windows & statuses
// ---------------------------------------------------------------------------

export interface WindowState {
  open: boolean;
  expiresAt: Date | null;
  freeEntryUntil: Date | null;
  freeEntryActive: boolean;
}

/** 24h customer service window (free-form allowed) + CTWA 72h free entry point. */
export function windowState(
  lastInboundAt: Date | null | undefined,
  freeEntryUntil: Date | null | undefined,
  now: Date = new Date(),
): WindowState {
  const expiresAt = lastInboundAt
    ? new Date(lastInboundAt.getTime() + SERVICE_WINDOW_MS)
    : null;
  return {
    open: !!expiresAt && expiresAt.getTime() > now.getTime(),
    expiresAt,
    freeEntryUntil: freeEntryUntil ?? null,
    freeEntryActive:
      !!freeEntryUntil && freeEntryUntil.getTime() > now.getTime(),
  };
}

export type MsgStatus =
  | "RECEIVED"
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";
const RANK: Record<MsgStatus, number> = {
  RECEIVED: 0,
  PENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

export function webhookStatusToEnum(s: unknown): MsgStatus | null {
  const v = typeof s === "string" ? s.toLowerCase() : "";
  return v === "sent"
    ? "SENT"
    : v === "delivered"
      ? "DELIVERED"
      : v === "read"
        ? "READ"
        : v === "failed"
          ? "FAILED"
          : null;
}

/**
 * Status updates only move forward (webhooks can arrive out of order). FAILED
 * wins over PENDING/SENT but never over DELIVERED/READ (the message arrived).
 */
export function nextStatus(current: MsgStatus, incoming: MsgStatus): MsgStatus {
  if (incoming === "FAILED")
    return current === "DELIVERED" || current === "READ" ? current : "FAILED";
  if (current === "FAILED")
    return RANK[incoming] >= RANK.DELIVERED ? incoming : current;
  return RANK[incoming] > RANK[current] ? incoming : current;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Number of {{n}} placeholders in a template body. */
export function templateParamCount(
  bodyText: string | null | undefined,
): number {
  if (!bodyText) return 0;
  let max = 0;
  for (const m of bodyText.matchAll(/\{\{\s*(\d{1,2})\s*\}\}/g))
    max = Math.max(max, Number(m[1]));
  return max;
}

export function renderTemplate(
  bodyText: string | null | undefined,
  params: string[],
): string | null {
  if (!bodyText) return null;
  return bodyText.replace(
    /\{\{\s*(\d{1,2})\s*\}\}/g,
    (_, n) => params[Number(n) - 1] ?? `{{${n}}}`,
  );
}

/** Phone (E.164) for a wa_id; the CRM normaliser decides validity. */
export function waIdToPhoneInput(waId: string): string {
  return `+${waId}`;
}
