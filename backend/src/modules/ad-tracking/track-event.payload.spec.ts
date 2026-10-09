import { BRAND_NAME_MAX, CATEGORY_MAX, parseTrackEvent, TRACK_EVENT_MAX_BYTES, TRACK_EVENT_NAMES } from "./track-event.payload";
import { extractInstagramHandle, isBotUserAgent, normalizeInstagramHandle } from "./track-utils";

const base = {
  name: "PageView",
  visitId: "0b6f3b0e-52a2-4f0e-8a54-1c1f0f0b6c11",
  eventId: "3f6b8c1e-2d4a-4f60-9a51-0c8d7e5b1a22",
  pageUrl: "https://link.monomiagency.com/?utm_campaign=FB-OKT1&fbclid=IwAR123#hash",
  referrer: "https://l.facebook.com/",
  utm: { source: "meta", medium: "paid", campaign: "FB-OKT1", content: "ad_123", term: "x" },
  fbclid: "IwAR3_AbC-def.GH",
  fbc: "fb.1.1759900000000.IwAR3_AbC-def.GH",
  fbp: "fb.1.1759900000000.1234567890",
};
const lead = {
  ...base,
  name: "Lead",
  ref: "K7QM2X",
  meta: { instagram: "@Kopi.Senja", brandName: "Kopi Senja", category: "F&B", looks: "3", extra: "dropped" },
};

describe("parseTrackEvent - TikTok fields", () => {
  const TTCLID = "E.C.P.v3fQ2RHacdksKfofPmlyuStIIHJ4Af1tKYxF9zz2c2PLx1Oaw15oHpcfl5AH";
  it("accepts ttclid up to 1000 characters and the touch times, and nothing else", () => {
    const p = parseTrackEvent({ ...base, ttclid: TTCLID, fbt: 1759900000000, ttt: 1759950000000 });
    expect(p).toMatchObject({ ttclid: TTCLID, fbTouchAt: 1759900000000, ttTouchAt: 1759950000000 });
    expect(parseTrackEvent({ ...base, ttclid: "a".repeat(1000) })!.ttclid).toHaveLength(1000);
    expect(parseTrackEvent({ ...base, ttclid: "a".repeat(1001) })!.ttclid).toBeNull();
  });
  it("drops malformed ttclid / touch values instead of failing the event", () => {
    for (const bad of ["<script>", "a b", "ab", 12345, {}, ["x"]]) {
      expect(parseTrackEvent({ ...base, ttclid: bad })!.ttclid).toBeNull();
    }
    for (const bad of ["1759900000000", -1, 0, 1.5, 9e15, null, {}]) {
      const p = parseTrackEvent({ ...base, fbt: bad, ttt: bad })!;
      expect(p.fbTouchAt).toBeNull();
      expect(p.ttTouchAt).toBeNull();
    }
  });
  it("keeps the long page URL a 1000-character ttclid makes (1500 cap) and fits the body cap", () => {
    const url = `https://link.monomiagency.com/?utm_source=tiktok&ttclid=${"a".repeat(1000)}`;
    const body = JSON.stringify({ ...base, pageUrl: url, ttclid: "a".repeat(1000) });
    expect(Buffer.byteLength(body)).toBeLessThan(TRACK_EVENT_MAX_BYTES);
    expect(parseTrackEvent(body)!.pageUrl).toBe(url);
  });
});

describe("parseTrackEvent", () => {
  it("accepts the snippet payload as an object or as the raw text sendBeacon sends", () => {
    expect(parseTrackEvent(JSON.stringify(base))).toEqual(parseTrackEvent(base));
    expect(parseTrackEvent(base)).toMatchObject({
      name: "PageView",
      visitId: base.visitId,
      eventId: base.eventId,
      ref: null,
      utmCampaign: "FB-OKT1",
      utmContent: "ad_123",
      fbclid: "IwAR3_AbC-def.GH",
      fbc: base.fbc,
      fbp: base.fbp,
    });
    expect(parseTrackEvent(base)?.pageUrl).not.toContain("#"); // no fragments stored
  });

  it("whitelists the event names", () => {
    expect([...TRACK_EVENT_NAMES]).toEqual(["PageView", "ViewContent", "EngagedVisit", "Lead"]);
    for (const name of ["PageView", "ViewContent", "EngagedVisit"]) {
      expect(parseTrackEvent({ ...base, name })?.name).toBe(name);
    }
    for (const name of ["Purchase", "QualifiedLead", "AddToCart", "pageview", "", "Lead ", 5, null, undefined, {}]) {
      expect(parseTrackEvent({ ...lead, name })).toBeNull();
    }
  });

  it("Lead needs a valid ref (upper-cased) and keeps instagram / brand / category only", () => {
    const p = parseTrackEvent({ ...lead, ref: "k7qm2x" });
    expect(p).toMatchObject({ name: "Lead", ref: "K7QM2X", instagramHandle: "kopi.senja", brandName: "Kopi Senja", category: "F&B" });
    expect(p).not.toHaveProperty("looks");
    expect(parseTrackEvent({ ...lead, ref: undefined })).toBeNull();
    expect(parseTrackEvent({ ...lead, ref: "K7QM0X" })).toBeNull(); // 0 is not in the alphabet
  });

  it("clamps brand (80) and category (40) to one plain-text line (they become the auto-created lead's name / fields)", () => {
    expect(BRAND_NAME_MAX).toBe(80);
    expect(CATEGORY_MAX).toBe(40);
    const p = parseTrackEvent({
      ...lead,
      meta: { brandName: `  <b>Kopi</b>
 Senja ${"x".repeat(200)}`, category: `${"y".repeat(60)}
z` },
    })!;
    expect(p.brandName!.length).toBe(80);
    expect(p.brandName).toMatch(/^<b>Kopi<\/b> Senja x+$/); // stored as text; the UI renders it escaped
    expect(p.category).toBe("y".repeat(40));
    expect(parseTrackEvent({ ...lead, meta: { brandName: { evil: 1 }, category: ["a"] } })).toMatchObject({ brandName: null, category: null });
  });

  it("ignores qualifier answers on non-Lead events", () => {
    const p = parseTrackEvent({ ...base, meta: lead.meta, ref: "K7QM2X" });
    expect(p).toMatchObject({ ref: null, instagramHandle: null, brandName: null, category: null });
  });

  it.each([
    ["not JSON", "{oops"],
    ["array body", "[1,2]"],
    ["null body", "null"],
    ["empty object", {}],
    ["missing visitId", { ...base, visitId: undefined }],
    ["bad visitId", { ...base, visitId: "no spaces allowed!" }],
    ["missing eventId", { ...base, eventId: undefined }],
    ["short eventId", { ...base, eventId: "abc" }],
  ])("rejects %s", (_n, body) => {
    expect(parseTrackEvent(body)).toBeNull();
  });

  it("rejects a body over the 4 KB cap", () => {
    expect(parseTrackEvent(JSON.stringify({ ...lead, meta: { brandName: "x".repeat(TRACK_EVENT_MAX_BYTES) } }))).toBeNull();
  });

  it("drops malformed optional fields instead of storing them", () => {
    const p = parseTrackEvent({ ...base, pageUrl: "javascript:alert(1)", referrer: "ftp://x", fbclid: "<script>", fbc: "nope", fbp: "fb.1.x.y", utm: "string" });
    expect(p).toMatchObject({ pageUrl: null, referrer: null, fbclid: null, fbc: null, fbp: null, utmSource: null });
  });

  it("caps lengths, strips control characters and ignores unknown keys", () => {
    const p = parseTrackEvent({ ...base, utm: { campaign: `a\u0000b\n${"z".repeat(500)}` }, isAdmin: true });
    expect(p?.utmCampaign).toHaveLength(120);
    expect(p?.utmCampaign).not.toMatch(/[\u0000-\u001f]/);
    expect(p).not.toHaveProperty("isAdmin");
  });
});

describe("Instagram handle parsing and normalisation", () => {
  it.each([
    ["@Kopi.Senja", "kopi.senja"],
    ["kopi_senja", "kopi_senja"],
    ["  @@brand99 ", "brand99"],
    ["instagram.com/kopisenja", "kopisenja"],
    ["https://www.instagram.com/Kopi.Senja/", "kopi.senja"],
    ["https://instagram.com/kopisenja?igsh=abc123", "kopisenja"],
    ["m.instagram.com/kopisenja#x", "kopisenja"],
  ])("%s -> %s", (input, out) => {
    expect(normalizeInstagramHandle(input)).toBe(out);
  });

  it.each(["", "   ", "@", "has space", "a".repeat(31), "bad!char", "https://instagram.com/p/Cxyz123/", "https://instagram.com/reel/abc", "...", ".lead", "a..b", 42, null])(
    "rejects %j",
    (input) => {
      expect(normalizeInstagramHandle(input)).toBeNull();
    },
  );

  it("finds the Instagram line of the pre-filled message", () => {
    expect(extractInstagramHandle("Halo Monomi\nInstagram: @kopi.senja\n\nKode: K7QM2X")).toBe("kopi.senja");
    expect(extractInstagramHandle("IG: kopisenja")).toBe("kopisenja");
    expect(extractInstagramHandle("instagram - https://instagram.com/kopisenja/")).toBe("kopisenja");
    expect(extractInstagramHandle("Instagram: @kopi.senja, tolong dibantu")).toBe("kopi.senja");
    expect(extractInstagramHandle("saya suka instagram")).toBeNull();
    expect(extractInstagramHandle("Instagram: has space")).toBe("has");
    expect(extractInstagramHandle("")).toBeNull();
  });
});

describe("bot filter", () => {
  it.each([
    "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/470.0.0]",
  ])("lets a real browser through: %s", (ua) => {
    expect(isBotUserAgent(ua)).toBe(false);
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "Mozilla/5.0 (X11; Linux x86_64) Chrome-Lighthouse",
    "python-requests/2.31.0",
    "curl/8.4.0",
    "Mozilla/5.0 (compatible; UptimeRobot/2.0)",
    "Mozilla/5.0 PhantomJS/2.1.1",
    "node-fetch/1.0",
    "",
    "x",
  ])("drops %j", (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
  });

  it("treats a missing user agent as a bot", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
  });
});
