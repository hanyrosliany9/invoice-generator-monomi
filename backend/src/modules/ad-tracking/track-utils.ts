/** Reserved first path segments of instagram.com URLs (not account names). */
const IG_RESERVED = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "about", "web"]);
const IG_HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

/**
 * Instagram handle from "@name", "name", "instagram.com/name/", "https://www.instagram.com/name?igsh=x".
 * Returns the lowercase handle without "@" ([a-z0-9._], max 30) or null.
 */
export function normalizeInstagramHandle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let v = input.trim();
  if (!v || v.length > 200) return null;
  const urlMatch = v.match(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([^/?#\s]+)/i);
  if (urlMatch) {
    v = urlMatch[1];
    if (IG_RESERVED.has(v.toLowerCase())) return null;
  }
  v = v.replace(/^@+/, "");
  if (!IG_HANDLE_RE.test(v) || !/[A-Za-z0-9]/.test(v)) return null;
  if (v.startsWith(".") || v.endsWith(".") || v.includes("..")) return null;
  return v.toLowerCase();
}

/** "Instagram: @handle" / "IG: handle" / "Instagram - instagram.com/handle" line in pasted text. */
export function extractInstagramHandle(text: string | null | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  const m = text.match(/(?:^|[\s,;(])(?:instagram|ig)\s*[:=\-]\s*(\S+)/i);
  return m ? normalizeInstagramHandle(m[1].replace(/[),;]+$/, "")) : null;
}

const BOT_UA =
  /bot\b|bot[\/;_ -]|crawl|spider|slurp|headless|phantom|lighthouse|pagespeed|facebookexternalhit|facebot|preview|python-requests|python-urllib|aiohttp|curl\/|wget|httpclient|okhttp\/|go-http|java\/|monitor|uptime|scrapy|selenium|puppeteer|playwright|node-fetch|axios\/|postman|libwww|mediapartners|bingpreview|ahrefs|semrush|dataprovider|screaming/i;

/** Cheap filter for obvious bots / tools (and requests without a user agent). */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length < 12) return true;
  return BOT_UA.test(ua);
}
