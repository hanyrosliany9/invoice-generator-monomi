/**
 * Which ad platform gets a landing-page visit / WhatsApp tap (and, through the
 * tap's click, the lead's events): the MOST RECENT ad touch that led the person
 * to convert wins. Decided per click at the moment the row is written (tap time
 * for a WhatsApp tap), never per person and never by first touch.
 *
 * Order of the checks; the first that finds an ad touch decides, and params of
 * DIFFERENT URLs are never combined:
 *   (a) the ad parameters of the tap event's own URL;
 *   (b) only if that URL has none, the visit's first (landing) URL;
 *   (c) only if neither has any, the newest first-party touch time sent by the
 *       snippet (fbt / ttt, ms), "last_touch";
 *   (d) nothing: organic -> NONE (today's Meta behaviour is kept for organic).
 *
 * An ad touch of one URL:
 *   Meta    fbclid, or utm_source=facebook|instagram|meta|fb|ig
 *   TikTok  ttclid, or utm_source=tiktok together with a PAID utm_medium
 *           (paid, cpc, paid_social, ads): a plain utm_source=tiktok, e.g. a
 *           profile bio link, is not an ad touch.
 *   Both in one URL: that URL's utm_source decides, else the referrer host
 *   (tiktok.com / facebook.com / instagram.com), else META (the incumbent).
 *
 * TikTok only counts while the TikTok Events config is READY (`tiktokEnabled`):
 * otherwise every TikTok signal is ignored and everything behaves exactly as it
 * did before TikTok support (Meta gets what it always got).
 */
export type AttributedPlatform = "META" | "TIKTOK" | "NONE";
export type AttributionReason = "url_param" | "last_touch" | "none";

export interface Attribution {
  platform: AttributedPlatform;
  reason: AttributionReason;
}

export interface AttributionInput {
  /** The URL of the tap event itself (check a). */
  tapUrl?: string | null;
  /** The visit's first URL (check b, only when the tap URL has no ad parameter). */
  visitUrl?: string | null;
  referrer?: string | null;
  /** A stored Meta click id exists (fbclid / _fbc). */
  hasFbId?: boolean;
  /** Last time a Meta / TikTok ad touch was recorded by the snippet (epoch ms). */
  fbTouchAt?: number | null;
  ttTouchAt?: number | null;
  /** TikTok attribution applies at all (TikTok Events config READY). Default true. */
  tiktokEnabled?: boolean;
  now?: Date;
}

/** A TikTok ttclid / paid touch older than this is forgotten (TikTok recommends keeping click ids 28+ days). */
export const TT_TOUCH_MAX_AGE_MS = 30 * 86_400_000;

const META_SOURCES = new Set(["facebook", "fb", "instagram", "ig", "meta"]);
const TIKTOK_SOURCES = new Set(["tiktok", "tt"]);
const PAID_MEDIUMS = new Set(["paid", "cpc", "paid_social", "ads"]);

export function classifyUtmSource(value: string | null | undefined): "META" | "TIKTOK" | null {
  const v = (value ?? "").trim().toLowerCase();
  if (META_SOURCES.has(v)) return "META";
  if (TIKTOK_SOURCES.has(v)) return "TIKTOK";
  return null;
}

export const isPaidMedium = (value: string | null | undefined): boolean => PAID_MEDIUMS.has((value ?? "").trim().toLowerCase());

function classifyReferrer(referrer: string | null | undefined): "META" | "TIKTOK" | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const is = (d: string) => host === d || host.endsWith(`.${d}`);
    if (is("tiktok.com")) return "TIKTOK";
    if (is("facebook.com") || is("instagram.com") || is("fb.com")) return "META";
  } catch {
    /* not a URL */
  }
  return null;
}

/** What a landing URL says: click ids, utm_source and utm_medium (missing / invalid URL -> nothing). */
export function urlAdParams(url: string | null | undefined): {
  fbclid: boolean;
  ttclid: boolean;
  source: "META" | "TIKTOK" | null;
  paid: boolean;
} {
  const out = { fbclid: false, ttclid: false, source: null as "META" | "TIKTOK" | null, paid: false };
  if (!url) return out;
  try {
    const p = new URL(url).searchParams;
    out.fbclid = !!p.get("fbclid");
    out.ttclid = !!p.get("ttclid");
    out.source = classifyUtmSource(p.get("utm_source"));
    out.paid = isPaidMedium(p.get("utm_medium"));
  } catch {
    /* ignore */
  }
  return out;
}

/** A snippet touch time: a positive epoch ms not (meaningfully) in the future. */
export function sanitizeTouchAt(value: unknown, now: Date = new Date()): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (n <= 0 || n > now.getTime() + 5 * 60_000) return null;
  return n;
}

/** The ad touch of ONE URL (never mixed with another URL's parameters), or null. */
export function adTouchOfUrl(
  url: string | null | undefined,
  referrer: string | null | undefined,
  tiktokEnabled: boolean,
): "META" | "TIKTOK" | null {
  const p = urlAdParams(url);
  const fb = p.fbclid || p.source === "META";
  const tt = tiktokEnabled && (p.ttclid || (p.source === "TIKTOK" && p.paid));
  if (fb && tt) return p.source ?? classifyReferrer(referrer) ?? "META";
  if (tt) return "TIKTOK";
  if (fb) return "META";
  return null;
}

export function decideAttribution(input: AttributionInput): Attribution {
  const now = input.now ?? new Date();
  const tiktokEnabled = input.tiktokEnabled !== false;

  // (a) the tap's own URL, (b) only if that has none: the visit's first URL
  for (const url of [input.tapUrl, input.visitUrl]) {
    const touch = adTouchOfUrl(url, input.referrer, tiktokEnabled);
    if (touch) return { platform: touch, reason: "url_param" };
  }

  // (c) last stored touch; a TikTok touch needs a recent time (the snippet drops a ttclid without one)
  const fbAt = sanitizeTouchAt(input.fbTouchAt, now);
  let ttAt = tiktokEnabled ? sanitizeTouchAt(input.ttTouchAt, now) : null;
  if (ttAt !== null && now.getTime() - ttAt > TT_TOUCH_MAX_AGE_MS) ttAt = null;
  const hasFb = fbAt !== null || !!input.hasFbId;
  const hasTt = ttAt !== null;
  if (hasFb && hasTt) {
    if (fbAt !== null) return { platform: (ttAt as number) > fbAt ? "TIKTOK" : "META", reason: "last_touch" };
    // a Meta id of unknown age against a timed TikTok touch: the timed one is the known touch
    return { platform: "TIKTOK", reason: "last_touch" };
  }
  if (hasTt) return { platform: "TIKTOK", reason: "last_touch" };
  if (hasFb) return { platform: "META", reason: "last_touch" };

  // (d) organic
  return { platform: "NONE", reason: "none" };
}
