/**
 * URL hygiene for what each ad platform is sent: a platform never receives the
 * other platform's click ids, and Meta keeps the URL length it always had.
 */

/** Meta's event_source_url has always been cut at this many characters (storage may hold more). */
export const META_URL_MAX = 500;

const TIKTOK_PARAM = /^(ttclid|ttp|tt_[a-z0-9_]+)$/i;
const META_PARAM = /^(fbclid|fbc|fbp)$/i;

/**
 * `url` without the query parameters whose NAME matches `isStripped`, removed
 * textually (no re-encoding of what stays). A URL without such a parameter is
 * returned unchanged, byte for byte.
 */
function stripParams(url: string, isStripped: (name: string) => boolean): string {
  const q = url.indexOf("?");
  if (q === -1) return url;
  const hash = url.indexOf("#", q);
  const end = hash === -1 ? url.length : hash;
  const parts = url.slice(q + 1, end).split("&");
  const kept = parts.filter((p) => {
    const eq = p.indexOf("=");
    const name = eq === -1 ? p : p.slice(0, eq);
    let decoded = name;
    try {
      decoded = decodeURIComponent(name);
    } catch {
      /* keep the raw name */
    }
    return !isStripped(decoded);
  });
  if (kept.length === parts.length) return url;
  return url.slice(0, q) + (kept.length ? `?${kept.join("&")}` : "") + url.slice(end);
}

export const stripTikTokParams = (url: string): string => stripParams(url, (n) => TIKTOK_PARAM.test(n));
export const stripMetaParams = (url: string): string => stripParams(url, (n) => META_PARAM.test(n));

/** The page URL as sent to Meta: no TikTok params, cut at the old 500-character cap. */
export const urlForMeta = (url: string): string => stripTikTokParams(url).slice(0, META_URL_MAX);

/** The page URL as sent to TikTok: no Meta click ids. */
export const urlForTikTok = (url: string): string => stripMetaParams(url);

/** Only the origin ("https://l.facebook.com"), or null when it is not an http(s) URL. */
export function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}
