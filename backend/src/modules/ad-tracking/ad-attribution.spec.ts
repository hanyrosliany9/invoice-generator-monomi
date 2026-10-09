import { adTouchOfUrl, classifyUtmSource, decideAttribution, isPaidMedium, sanitizeTouchAt, urlAdParams } from "./ad-attribution";

const NOW = new Date("2026-10-09T10:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => NOW.getTime() - days * DAY;
const META_URL = "https://link.monomiagency.com/?utm_source=facebook&fbclid=IwAR1";
const TT_URL = "https://link.monomiagency.com/?utm_source=tiktok&utm_medium=paid&ttclid=E.C.P.abc123";
const DIRECT = "https://link.monomiagency.com/";

describe("ad attribution (most recent ad touch that converted wins)", () => {
  it("classifies utm_source and paid mediums", () => {
    for (const v of ["facebook", "Instagram", "META", "fb", "ig"]) expect(classifyUtmSource(v)).toBe("META");
    for (const v of ["tiktok", "TikTok", "tt"]) expect(classifyUtmSource(v)).toBe("TIKTOK");
    for (const v of ["google", "", null, undefined, "newsletter"]) expect(classifyUtmSource(v as any)).toBeNull();
    for (const v of ["paid", "CPC", "paid_social", "ads"]) expect(isPaidMedium(v)).toBe(true);
    for (const v of ["bio", "organic", "social", "", null]) expect(isPaidMedium(v as any)).toBe(false);
  });

  it("reads click ids, utm_source and medium out of ONE landing URL (bad URLs say nothing)", () => {
    expect(urlAdParams(TT_URL)).toEqual({ fbclid: false, ttclid: true, source: "TIKTOK", paid: true });
    expect(urlAdParams(META_URL)).toEqual({ fbclid: true, ttclid: false, source: "META", paid: false });
    expect(urlAdParams("not a url")).toEqual({ fbclid: false, ttclid: false, source: null, paid: false });
    expect(urlAdParams(null)).toEqual({ fbclid: false, ttclid: false, source: null, paid: false });
  });

  it("Meta visit, then a TikTok visit + tap -> TikTok (the URL of the converting visit decides)", () => {
    expect(decideAttribution({ tapUrl: TT_URL, hasFbId: true, fbTouchAt: ago(5), ttTouchAt: NOW.getTime(), now: NOW })).toEqual({ platform: "TIKTOK", reason: "url_param" });
  });

  it("TikTok visit, then a Meta visit + tap -> Meta", () => {
    expect(decideAttribution({ tapUrl: META_URL, hasFbId: true, fbTouchAt: NOW.getTime(), ttTouchAt: ago(5), now: NOW })).toEqual({ platform: "META", reason: "url_param" });
  });

  it("direct return visit with both stored: the most recent touch timestamp wins", () => {
    const base = { tapUrl: DIRECT, hasFbId: true, now: NOW };
    expect(decideAttribution({ ...base, fbTouchAt: ago(10), ttTouchAt: ago(2) })).toEqual({ platform: "TIKTOK", reason: "last_touch" });
    expect(decideAttribution({ ...base, fbTouchAt: ago(2), ttTouchAt: ago(10) })).toEqual({ platform: "META", reason: "last_touch" });
  });

  it("direct visit with a single stored platform follows it; a TikTok touch needs its time", () => {
    expect(decideAttribution({ tapUrl: DIRECT, ttTouchAt: ago(3), now: NOW })).toMatchObject({ platform: "TIKTOK", reason: "last_touch" });
    expect(decideAttribution({ tapUrl: DIRECT, hasFbId: true, now: NOW })).toMatchObject({ platform: "META", reason: "last_touch" });
    // a stored fbc of unknown age (old snippet) with no TikTok time: Meta, today's behaviour
    expect(decideAttribution({ tapUrl: DIRECT, hasFbId: true, now: NOW })).toMatchObject({ platform: "META" });
    expect(decideAttribution({ tapUrl: DIRECT, hasFbId: true, ttTouchAt: ago(1), now: NOW })).toMatchObject({ platform: "TIKTOK" });
    expect(decideAttribution({ tapUrl: DIRECT, hasFbId: true, fbTouchAt: ago(1), ttTouchAt: ago(2), now: NOW })).toMatchObject({ platform: "META" });
  });

  it("both click ids in one URL: that URL's utm_source decides, else the referrer host, else Meta", () => {
    const both = "https://link.monomiagency.com/?fbclid=IwAR1&ttclid=E.C.P.abc123";
    expect(decideAttribution({ tapUrl: both + "&utm_source=tiktok", now: NOW })).toEqual({ platform: "TIKTOK", reason: "url_param" });
    expect(decideAttribution({ tapUrl: both + "&utm_source=instagram", now: NOW })).toEqual({ platform: "META", reason: "url_param" });
    expect(decideAttribution({ tapUrl: both, referrer: "https://www.tiktok.com/", now: NOW }).platform).toBe("TIKTOK");
    expect(decideAttribution({ tapUrl: both, referrer: "https://l.facebook.com/", now: NOW }).platform).toBe("META");
    expect(decideAttribution({ tapUrl: both, now: NOW })).toEqual({ platform: "META", reason: "url_param" });
  });

  describe("URL precedence (never combine params of different URLs)", () => {
    it("S6: the tap URL wins over the visit's first URL (first URL fbclid, tap URL ttclid -> TikTok)", () => {
      expect(decideAttribution({ tapUrl: "https://link.monomiagency.com/p2?ttclid=TTS6xx", visitUrl: "https://link.monomiagency.com/?fbclid=FBS6aaaa", now: NOW }))
        .toEqual({ platform: "TIKTOK", reason: "url_param" });
      expect(decideAttribution({ tapUrl: "https://link.monomiagency.com/p2?fbclid=FBS6aaaa", visitUrl: "https://link.monomiagency.com/?ttclid=TTS6xx", now: NOW }))
        .toEqual({ platform: "META", reason: "url_param" });
    });

    it("S6b: no session utm is merged in: a tap URL with only a ttclid is TikTok even if the visit said utm_source=facebook elsewhere", () => {
      // the session utm is not an input any more; only URLs count
      expect(decideAttribution({ tapUrl: "https://link.monomiagency.com/?ttclid=TTS6bb", visitUrl: null, fbTouchAt: ago(0), now: NOW }).platform).toBe("TIKTOK");
    });

    it("only when the tap URL has no ad parameter does the visit's first URL count", () => {
      expect(decideAttribution({ tapUrl: DIRECT + "page2", visitUrl: TT_URL, now: NOW })).toEqual({ platform: "TIKTOK", reason: "url_param" });
    });

    it("params of the two URLs are not combined: a bare utm_source=tiktok on one and utm_medium=paid on the other is no ad touch", () => {
      expect(
        decideAttribution({ tapUrl: "https://link.monomiagency.com/?utm_source=tiktok", visitUrl: "https://link.monomiagency.com/?utm_medium=paid", now: NOW }),
      ).toEqual({ platform: "NONE", reason: "none" });
    });

    it("only when neither URL has an ad parameter do the touch times decide", () => {
      expect(decideAttribution({ tapUrl: DIRECT, visitUrl: DIRECT + "x", fbTouchAt: ago(1), ttTouchAt: ago(4), hasFbId: true, now: NOW })).toEqual({ platform: "META", reason: "last_touch" });
    });
  });

  describe("what is a TikTok ad touch", () => {
    it("a ttclid, or utm_source=tiktok with a paid medium", () => {
      expect(adTouchOfUrl(DIRECT + "?ttclid=abc123", null, true)).toBe("TIKTOK");
      for (const m of ["paid", "cpc", "paid_social", "ads"]) {
        expect(adTouchOfUrl(`${DIRECT}?utm_source=tiktok&utm_medium=${m}`, null, true)).toBe("TIKTOK");
      }
    });
    it("a plain utm_source=tiktok (profile bio link) is NOT an ad touch", () => {
      expect(adTouchOfUrl(DIRECT + "?utm_source=tiktok", null, true)).toBeNull();
      expect(adTouchOfUrl(DIRECT + "?utm_source=tiktok&utm_medium=bio", null, true)).toBeNull();
      expect(decideAttribution({ tapUrl: DIRECT + "?utm_source=tiktok", now: NOW })).toEqual({ platform: "NONE", reason: "none" });
    });
    it("Meta's definition is unchanged (fbclid or a Meta utm_source, no medium needed)", () => {
      expect(adTouchOfUrl(DIRECT + "?utm_source=instagram", null, true)).toBe("META");
      expect(adTouchOfUrl(DIRECT + "?fbclid=abc", null, true)).toBe("META");
    });
  });

  describe("TikTok attribution is gated on a READY TikTok config", () => {
    it("while OFF / INCOMPLETE / INVALID every TikTok signal is ignored: organic stays organic, Meta stays Meta", () => {
      const off = { tiktokEnabled: false, now: NOW };
      expect(decideAttribution({ tapUrl: TT_URL, ...off })).toEqual({ platform: "NONE", reason: "none" });
      expect(decideAttribution({ tapUrl: TT_URL, ttTouchAt: ago(1), ...off })).toEqual({ platform: "NONE", reason: "none" });
      expect(decideAttribution({ tapUrl: TT_URL, hasFbId: true, fbTouchAt: ago(9), ttTouchAt: ago(1), ...off })).toEqual({ platform: "META", reason: "last_touch" });
      const both = "https://link.monomiagency.com/?fbclid=IwAR1&ttclid=E.C.P.abc123&utm_source=tiktok&utm_medium=paid";
      expect(decideAttribution({ tapUrl: both, ...off })).toEqual({ platform: "META", reason: "url_param" });
      expect(decideAttribution({ tapUrl: META_URL, ...off })).toEqual({ platform: "META", reason: "url_param" });
    });
  });

  it("no ad touch at all -> NONE (organic)", () => {
    expect(decideAttribution({ tapUrl: DIRECT, now: NOW })).toEqual({ platform: "NONE", reason: "none" });
    expect(decideAttribution({ tapUrl: null, visitUrl: null, now: NOW })).toEqual({ platform: "NONE", reason: "none" });
  });

  it("junk touch times are ignored (negative, future, non-numbers, forged far future)", () => {
    expect(sanitizeTouchAt(-5, NOW)).toBeNull();
    expect(sanitizeTouchAt(NOW.getTime() + DAY, NOW)).toBeNull();
    expect(sanitizeTouchAt("1" as any, NOW)).toBeNull();
    expect(sanitizeTouchAt(ago(1), NOW)).toBe(ago(1));
    expect(decideAttribution({ tapUrl: DIRECT, hasFbId: true, fbTouchAt: ago(2), ttTouchAt: NOW.getTime() + 5 * DAY, now: NOW })).toMatchObject({ platform: "META" });
  });

  it("the server ignores a ttt older than 30 days", () => {
    expect(decideAttribution({ tapUrl: DIRECT, ttTouchAt: ago(29), now: NOW })).toMatchObject({ platform: "TIKTOK", reason: "last_touch" });
    expect(decideAttribution({ tapUrl: DIRECT, ttTouchAt: ago(31), now: NOW })).toEqual({ platform: "NONE", reason: "none" });
    expect(decideAttribution({ tapUrl: DIRECT, hasFbId: true, fbTouchAt: ago(80), ttTouchAt: ago(31), now: NOW })).toEqual({ platform: "META", reason: "last_touch" });
  });
});
