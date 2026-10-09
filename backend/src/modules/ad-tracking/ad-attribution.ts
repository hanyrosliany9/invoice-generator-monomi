/**
 * Which ad platform gets a landing-page visit / WhatsApp tap (and, through the
 * tap's click, the lead's events): the MOST RECENT ad touch that led the person
 * to convert wins. Decided per click at the moment the row is written (tap time
 * for a WhatsApp tap), never per person and never by first touch.
 *
 *   (a) the landing URL of the visit first (the event's own URL, and the
 *       visit's first URL): fbclid / utm_source=facebook|instagram|meta|fb|ig
 *       -> META, ttclid / utm_source=tiktok -> TIKTOK ("url_param");
 *       both platforms in one URL: utm_source decides, else the referrer host
 *       (tiktok.com / facebook.com / instagram.com), else META (the incumbent
 *       platform: today's behaviour);
 *   (b) no ad parameter in that URL (returning direct visit): the newest
 *       first-party touch time sent by the snippet (fbt / ttt, ms) wins
 *       ("last_touch"); a platform with a stored click id but no time (old
 *       cached snippet) only wins when the other has none, ties and unknowns
 *       -> META (today's behaviour);
 *   (c) nothing: organic -> NONE ("none"). Organic keeps today's Meta
 *       behaviour (Meta still gets PageView and the click-time Lead as
 *       before); TikTok gets nothing.
 */
export type AttributedPlatform = "META" | "TIKTOK" | "NONE";
export type AttributionReason = "url_param" | "last_touch" | "none";

export interface Attribution {
  platform: AttributedPlatform;
  reason: AttributionReason;
}

export interface AttributionInput {
  /** Landing URLs to inspect: the event's pageUrl and the visit row's pageUrl. */
  urls: Array<string | null | undefined>;
  /** utm_source of the visit (session-persistent in the snippet). */
  utmSource?: string | null;
  referrer?: string | null;
  /** A stored Meta click id exists (fbclid / _fbc). */
  hasFbId?: boolean;
  /** A stored TikTok click id exists (ttclid). */
  hasTtId?: boolean;
  /** Last time a Meta / TikTok ad touch was recorded by the snippet (epoch ms). */
  fbTouchAt?: number | null;
  ttTouchAt?: number | null;
  now?: Date;
}

const META_SOURCES = new Set(["facebook", "fb", "instagram", "ig", "meta"]);
const TIKTOK_SOURCES = new Set(["tiktok", "tt"]);

export function classifyUtmSource(value: string | null | undefined): "META" | "TIKTOK" | null {
  const v = (value ?? "").trim().toLowerCase();
  if (META_SOURCES.has(v)) return "META";
  if (TIKTOK_SOURCES.has(v)) return "TIKTOK";
  return null;
}

function classifyReferrer(referrer: string | null | undefined): "META" | "TIKTOK" | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const is = (d: string) => host === d || host.endsWith(`.${d}`);
    if (is("tiktok.com")) return "TIKTOK";
    if (is("facebook.com") || is("instagram.com") || is("fb.com") || host === "l.facebook.com") return "META";
  } catch {
    /* not a URL */
  }
  return null;
}

/** What a landing URL says: click ids and utm_source (missing/invalid URL -> nothing). */
export function urlAdParams(url: string | null | undefined): { fbclid: boolean; ttclid: boolean; source: "META" | "TIKTOK" | null } {
  const out = { fbclid: false, ttclid: false, source: null as "META" | "TIKTOK" | null };
  if (!url) return out;
  try {
    const p = new URL(url).searchParams;
    out.fbclid = !!p.get("fbclid");
    out.ttclid = !!p.get("ttclid");
    out.source = classifyUtmSource(p.get("utm_source"));
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

export function decideAttribution(input: AttributionInput): Attribution {
  const now = input.now ?? new Date();
  let fb = false;
  let tt = false;
  let source: "META" | "TIKTOK" | null = classifyUtmSource(input.utmSource);
  for (const u of input.urls) {
    const p = urlAdParams(u);
    fb = fb || p.fbclid;
    tt = tt || p.ttclid;
    source = source ?? p.source;
  }
  if (source === "META") fb = true;
  if (source === "TIKTOK") tt = true;

  // (a) the landing URL
  if (fb || tt) {
    if (fb && tt) {
      const decided = source ?? classifyReferrer(input.referrer) ?? "META";
      return { platform: decided, reason: "url_param" };
    }
    return { platform: tt ? "TIKTOK" : "META", reason: "url_param" };
  }

  // (b) last stored touch
  const fbAt = sanitizeTouchAt(input.fbTouchAt, now);
  const ttAt = sanitizeTouchAt(input.ttTouchAt, now);
  const hasFb = fbAt !== null || !!input.hasFbId;
  const hasTt = ttAt !== null || !!input.hasTtId;
  if (hasFb && hasTt) {
    if (fbAt !== null && ttAt !== null) {
      return { platform: ttAt > fbAt ? "TIKTOK" : "META", reason: "last_touch" };
    }
    // one side has a time, the other only an id of unknown age: the timed one is the known touch
    if (ttAt !== null) return { platform: "TIKTOK", reason: "last_touch" };
    return { platform: "META", reason: "last_touch" };
  }
  if (hasTt) return { platform: "TIKTOK", reason: "last_touch" };
  if (hasFb) return { platform: "META", reason: "last_touch" };

  // (c) organic
  return { platform: "NONE", reason: "none" };
}
