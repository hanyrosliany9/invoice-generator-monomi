import { normalizeRefCode } from "./ref-code";

/** Hard cap for the request body (sendBeacon payloads are tiny). */
export const WA_CLICK_MAX_BYTES = 4096;

export interface ParsedWaClick {
  ref: string;
  eventId: string;
  pageUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  fbc: string | null;
  fbp: string | null;
  meta: Record<string, string> | null;
}

const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const FBCLID_RE = /^[A-Za-z0-9_.-]{4,300}$/;
const FBC_RE = /^fb\.\d{1,2}\.\d{10,16}\.[A-Za-z0-9_.-]{4,300}$/;
const FBP_RE = /^fb\.\d{1,2}\.\d{10,16}\.\d{4,20}$/;
const META_KEYS = ["brandName", "category", "looks"] as const;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/g;

/** Trimmed single-line string within a length cap, else null. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  if (!v) return null;
  return v.slice(0, max);
}

/** http(s) URL without fragment, capped; anything else is dropped. */
function url(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    u.username = "";
    u.password = "";
    return u.toString().slice(0, max);
  } catch {
    return null;
  }
}

function pattern(value: unknown, re: RegExp): string | null {
  return typeof value === "string" && re.test(value) ? value : null;
}

/**
 * Strict parse of the beacon body. `ref` and `eventId` are required (null
 * when missing / malformed, so the caller answers a generic 400); every
 * optional field is sanitised or dropped. Unknown keys are ignored and never
 * stored. Accepts the raw string (sendBeacon sends text/plain) or an object.
 */
export function parseWaClickPayload(raw: unknown): ParsedWaClick | null {
  let body: unknown = raw;
  if (typeof raw === "string") {
    if (Buffer.byteLength(raw, "utf8") > WA_CLICK_MAX_BYTES) return null;
    try {
      body = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;

  const ref = normalizeRefCode(b.ref);
  const eventId = pattern(b.eventId, EVENT_ID_RE);
  if (!ref || !eventId) return null;

  const utmRaw =
    b.utm && typeof b.utm === "object" && !Array.isArray(b.utm)
      ? (b.utm as Record<string, unknown>)
      : {};

  let meta: Record<string, string> | null = null;
  if (b.meta && typeof b.meta === "object" && !Array.isArray(b.meta)) {
    const m = b.meta as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of META_KEYS) {
      const v = text(m[k], 80);
      if (v) out[k] = v;
    }
    if (Object.keys(out).length) meta = out;
  }

  return {
    ref,
    eventId,
    pageUrl: url(b.pageUrl, 500),
    referrer: url(b.referrer, 500),
    utmSource: text(utmRaw.source, 120),
    utmMedium: text(utmRaw.medium, 120),
    utmCampaign: text(utmRaw.campaign, 120),
    utmContent: text(utmRaw.content, 120),
    utmTerm: text(utmRaw.term, 120),
    fbclid: pattern(b.fbclid, FBCLID_RE),
    fbc: pattern(b.fbc, FBC_RE),
    fbp: pattern(b.fbp, FBP_RE),
    meta,
  };
}
