import { classifyUtmSource, decideAttribution, sanitizeTouchAt, urlAdParams } from "./ad-attribution";

const NOW = new Date("2026-10-09T10:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => NOW.getTime() - days * DAY;
const META_URL = "https://link.monomiagency.com/?utm_source=facebook&fbclid=IwAR1";
const TT_URL = "https://link.monomiagency.com/?utm_source=tiktok&ttclid=E.C.P.abc123";
const DIRECT = "https://link.monomiagency.com/";

describe("ad attribution (most recent ad touch that converted wins)", () => {
  it("classifies utm_source", () => {
    for (const v of ["facebook", "Instagram", "META", "fb", "ig"]) expect(classifyUtmSource(v)).toBe("META");
    for (const v of ["tiktok", "TikTok", "tt"]) expect(classifyUtmSource(v)).toBe("TIKTOK");
    for (const v of ["google", "", null, undefined, "newsletter"]) expect(classifyUtmSource(v as any)).toBeNull();
  });

  it("reads click ids and utm_source out of a landing URL (bad URLs say nothing)", () => {
    expect(urlAdParams(TT_URL)).toEqual({ fbclid: false, ttclid: true, source: "TIKTOK" });
    expect(urlAdParams(META_URL)).toEqual({ fbclid: true, ttclid: false, source: "META" });
    expect(urlAdParams("not a url")).toEqual({ fbclid: false, ttclid: false, source: null });
    expect(urlAdParams(null)).toEqual({ fbclid: false, ttclid: false, source: null });
  });

  it("Meta visit, then a TikTok visit + tap -> TikTok (the URL of the converting visit decides)", () => {
    // an old Meta click is still stored (fbc 90 days), but this visit landed from TikTok
    expect(
      decideAttribution({ urls: [TT_URL], hasFbId: true, hasTtId: true, fbTouchAt: ago(5), ttTouchAt: NOW.getTime(), now: NOW }),
    ).toEqual({ platform: "TIKTOK", reason: "url_param" });
  });

  it("TikTok visit, then a Meta visit + tap -> Meta", () => {
    expect(
      decideAttribution({ urls: [META_URL], hasFbId: true, hasTtId: true, fbTouchAt: NOW.getTime(), ttTouchAt: ago(5), now: NOW }),
    ).toEqual({ platform: "META", reason: "url_param" });
  });

  it("direct return visit with both stored: the most recent touch timestamp wins", () => {
    const base = { urls: [DIRECT], hasFbId: true, hasTtId: true, now: NOW };
    expect(decideAttribution({ ...base, fbTouchAt: ago(10), ttTouchAt: ago(2) })).toEqual({ platform: "TIKTOK", reason: "last_touch" });
    expect(decideAttribution({ ...base, fbTouchAt: ago(2), ttTouchAt: ago(10) })).toEqual({ platform: "META", reason: "last_touch" });
  });

  it("direct visit with a single stored platform follows it; an id with no time only counts alone", () => {
    expect(decideAttribution({ urls: [DIRECT], hasTtId: true, ttTouchAt: ago(3), now: NOW })).toMatchObject({ platform: "TIKTOK", reason: "last_touch" });
    expect(decideAttribution({ urls: [DIRECT], hasFbId: true, now: NOW })).toMatchObject({ platform: "META", reason: "last_touch" });
    // both ids, no times at all (old cached snippet): today's behaviour, Meta
    expect(decideAttribution({ urls: [DIRECT], hasFbId: true, hasTtId: true, now: NOW })).toMatchObject({ platform: "META" });
    // one timed touch beats an id of unknown age
    expect(decideAttribution({ urls: [DIRECT], hasFbId: true, hasTtId: true, ttTouchAt: ago(1), now: NOW })).toMatchObject({ platform: "TIKTOK" });
    expect(decideAttribution({ urls: [DIRECT], hasFbId: true, hasTtId: true, fbTouchAt: ago(1), now: NOW })).toMatchObject({ platform: "META" });
  });

  it("both click ids in one URL: utm_source decides, else the referrer host, else Meta", () => {
    const both = "https://link.monomiagency.com/?fbclid=IwAR1&ttclid=E.C.P.abc123";
    expect(decideAttribution({ urls: [both], utmSource: "tiktok", now: NOW })).toEqual({ platform: "TIKTOK", reason: "url_param" });
    expect(decideAttribution({ urls: [both], utmSource: "instagram", now: NOW })).toEqual({ platform: "META", reason: "url_param" });
    expect(decideAttribution({ urls: [both + "&utm_source=tiktok"], now: NOW }).platform).toBe("TIKTOK");
    expect(decideAttribution({ urls: [both], referrer: "https://www.tiktok.com/", now: NOW }).platform).toBe("TIKTOK");
    expect(decideAttribution({ urls: [both], referrer: "https://l.facebook.com/", now: NOW }).platform).toBe("META");
    // nothing decisive: Meta (the incumbent, today's behaviour)
    expect(decideAttribution({ urls: [both], now: NOW })).toEqual({ platform: "META", reason: "url_param" });
  });

  it("the visit's first URL counts when the tap page has no ad parameter", () => {
    expect(decideAttribution({ urls: [DIRECT + "page2", TT_URL], now: NOW })).toMatchObject({ platform: "TIKTOK", reason: "url_param" });
  });

  it("no ad touch at all -> NONE (organic)", () => {
    expect(decideAttribution({ urls: [DIRECT], now: NOW })).toEqual({ platform: "NONE", reason: "none" });
    expect(decideAttribution({ urls: [], utmSource: "newsletter", now: NOW })).toEqual({ platform: "NONE", reason: "none" });
  });

  it("junk touch times are ignored (negative, future, non-numbers)", () => {
    expect(sanitizeTouchAt(-5, NOW)).toBeNull();
    expect(sanitizeTouchAt(NOW.getTime() + DAY, NOW)).toBeNull();
    expect(sanitizeTouchAt("1" as any, NOW)).toBeNull();
    expect(sanitizeTouchAt(ago(1), NOW)).toBe(ago(1));
    // a forged far-future TikTok time cannot beat a real Meta touch
    expect(
      decideAttribution({ urls: [DIRECT], hasFbId: true, fbTouchAt: ago(2), ttTouchAt: NOW.getTime() + 5 * DAY, now: NOW }),
    ).toMatchObject({ platform: "META" });
  });
});
