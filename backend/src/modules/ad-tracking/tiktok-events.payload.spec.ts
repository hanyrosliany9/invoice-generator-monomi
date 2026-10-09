import { createHash } from "crypto";
import { resolveTikTokEventsConfig } from "./tiktok-events.config";
import {
  buildTikTokEvent,
  buildTikTokRequest,
  classifyTikTokError,
  hashEmailForTikTok,
  hashPhoneForTikTok,
  normalizePhoneForTikTok,
  redactTikTokEventForStorage,
  tiktokSkipReason,
  TTCLID_RE,
} from "./tiktok-events.payload";
import { normalizePhoneForMeta, sha256 } from "./web-capi.payload";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const LANDING = "https://link.monomiagency.com";
const TTCLID = "E.C.P.v3fQ2RHacdksKfofPmlyuStIIHJ4Af1tKYxF9zz2c2PLx1Oaw15oHpcfl5AH";

describe("TikTok phone normaliser + hash", () => {
  it("matches the worked example of TikTok's reference (E.164 WITH the +)", () => {
    // official-doc-style example verified by the research report
    expect(normalizePhoneForTikTok("0812-3456-7890")).toBe("+6281234567890");
    expect(hashPhoneForTikTok("0812-3456-7890")).toBe("62397bbd6a8c9ae53bc914a6017300eb6b13af5be20e4cc9ad2dc3d61ecb24cd");
    expect(sha("+6281234567890")).toBe("62397bbd6a8c9ae53bc914a6017300eb6b13af5be20e4cc9ad2dc3d61ecb24cd");
  });

  it("accepts 08..., +62..., 62..., 8..., 0062... and spaces / dashes", () => {
    const want = "+6281234567890";
    for (const input of ["081234567890", "+6281234567890", "6281234567890", "81234567890", "006281234567890", "+62 812-3456-7890", " (0812) 3456 7890 "]) {
      expect(normalizePhoneForTikTok(input)).toBe(want);
    }
  });

  it("is NOT the Meta format (no '+' there) and wrong forms hash differently", () => {
    expect(normalizePhoneForMeta("0812-3456-7890")).toBe("6281234567890");
    expect(hashPhoneForTikTok("0812-3456-7890")).not.toBe(sha256("6281234567890"));
    expect(sha("6281234567890").startsWith("dd752605")).toBe(true);
    expect(sha("081234567890").startsWith("4f3ac1bc")).toBe(true);
  });

  it("keeps a foreign international number as typed (+84 is never turned into +62)", () => {
    expect(normalizePhoneForTikTok("+84 912 345 678")).toBe("+84912345678");
    expect(normalizePhoneForTikTok("+65 9123 4567")).toBe("+6591234567");
  });

  it("rejects what cannot be a phone number", () => {
    for (const bad of [null, undefined, "", "abc", "12", "+1234567890123456", "0", "+0123456789"]) {
      expect(normalizePhoneForTikTok(bad as any)).toBeNull();
      expect(hashPhoneForTikTok(bad as any)).toBeNull();
    }
  });

  it("email: trimmed, lowercased, then SHA-256; junk gives nothing", () => {
    expect(hashEmailForTikTok("  Budi.Santoso@Example.co.id ")).toBe(sha("budi.santoso@example.co.id"));
    expect(hashEmailForTikTok("not-an-email")).toBeNull();
    expect(hashEmailForTikTok(null)).toBeNull();
  });
});

describe("TikTok event payload (exact field names of the Events API 2.0 reference)", () => {
  const click = {
    visitId: "0b6f3b0e-52a2-4f0e-8a54-1c1f0f0b6c11",
    pageUrl: `${LANDING}/?utm_source=tiktok&utm_campaign=1790000000000001&ttclid=${TTCLID}`,
    referrer: "https://www.tiktok.com/",
    ttclid: TTCLID,
    clientIp: "203.0.113.45",
    userAgent: "Mozilla/5.0 (Linux; Android 14)",
  };
  const lead = { id: "lead_1", phone: "+6281234567890", email: "Budi@Example.co.id" };
  const time = new Date("2026-10-09T10:00:00Z");

  it("ViewContent (visit): ttclid, ip, user_agent, hashed visit id; page.url + referrer; no phone, no ttp", () => {
    const e: any = buildTikTokEvent({ eventName: "ViewContent", eventTime: time, eventId: "tt_view_x" }, click, null, LANDING);
    expect(e).toEqual({
      event: "ViewContent",
      event_time: Math.floor(time.getTime() / 1000),
      event_id: "tt_view_x",
      user: {
        ttclid: TTCLID,
        external_id: [sha(click.visitId)],
        ip: "203.0.113.45",
        user_agent: "Mozilla/5.0 (Linux; Android 14)",
      },
      page: { url: click.pageUrl, referrer: "https://www.tiktok.com/" },
    });
    expect(JSON.stringify(e)).not.toMatch(/"ttp"/);
  });

  it("Contact (WhatsApp tap): same as the visit fields, still no phone", () => {
    const e: any = buildTikTokEvent(
      { eventName: "Contact", eventTime: time, eventId: "tt_contact_1", description: "WhatsApp inquiry" },
      click,
      null,
      LANDING,
    );
    expect(e.event).toBe("Contact");
    expect(e.user.phone).toBeUndefined();
    expect(e.properties).toEqual({ description: "WhatsApp inquiry" });
  });

  it("Lead: adds the hashed +62 phone, hashed email, external_id [visit, lead], locale", () => {
    const e: any = buildTikTokEvent({ eventName: "Lead", eventTime: time, eventId: "tt_lead_lead_1" }, click, lead, LANDING);
    expect(e.user).toEqual({
      ttclid: TTCLID,
      phone: "62397bbd6a8c9ae53bc914a6017300eb6b13af5be20e4cc9ad2dc3d61ecb24cd",
      email: sha("budi@example.co.id"),
      external_id: [sha(click.visitId), sha("lead_1")],
      ip: "203.0.113.45",
      user_agent: "Mozilla/5.0 (Linux; Android 14)",
      locale: "id-ID",
    });
  });

  it("CompleteRegistration: no value, no currency", () => {
    const e: any = buildTikTokEvent({ eventName: "CompleteRegistration", eventTime: time, eventId: "tt_qualified_lead_1" }, click, lead, LANDING);
    expect(e.event).toBe("CompleteRegistration");
    expect(e.properties).toBeUndefined();
  });

  it("Purchase: value is a plain number, currency IDR, order_id", () => {
    const e: any = buildTikTokEvent(
      { eventName: "Purchase", eventTime: time, eventId: "tt_purchase_lead_1", value: "15000000.00", orderId: "INV-2026-10-0042" },
      click,
      lead,
      LANDING,
    );
    expect(e.properties).toEqual({ currency: "IDR", value: 15000000, order_id: "INV-2026-10-0042" });
    expect(typeof e.properties.value).toBe("number");
  });

  it("falls back to the landing page URL; raw user agent is capped; an invalid ttclid is dropped", () => {
    const e: any = buildTikTokEvent(
      { eventName: "ViewContent", eventTime: time, eventId: "x" },
      { ...click, pageUrl: null, referrer: null, ttclid: "bad value!", userAgent: "u".repeat(900) },
      null,
      LANDING,
    );
    expect(e.page).toEqual({ url: LANDING });
    expect(e.user.ttclid).toBeUndefined();
    expect(e.user.user_agent).toHaveLength(512);
  });

  it("accepts a 1000-character ttclid and refuses 1001; no E.C.P. prefix required", () => {
    expect(TTCLID_RE.test("a".repeat(1000))).toBe(true);
    expect(TTCLID_RE.test("a".repeat(1001))).toBe(false);
    expect(TTCLID_RE.test("abc")).toBe(false);
    expect(TTCLID_RE.test("plain_token-123")).toBe(true);
    expect(TTCLID_RE.test("a b")).toBe(false);
  });

  it("request body: event_source web, event_source_id = pixel code, data[], test_event_code only when set", () => {
    const e = { event: "Lead" };
    expect(buildTikTokRequest("CPIXEL123456", [e])).toEqual({ event_source: "web", event_source_id: "CPIXEL123456", data: [e] });
    expect(buildTikTokRequest("CPIXEL123456", [e], "TEST1234")).toMatchObject({ test_event_code: "TEST1234" });
  });

  it("the stored copy keeps field names only, never ip / ua / ids", () => {
    const e = buildTikTokEvent({ eventName: "Lead", eventTime: time, eventId: "x" }, click, lead, LANDING);
    const stored = JSON.stringify(redactTikTokEventForStorage(e));
    expect(stored).not.toMatch(/203\.0\.113\.45|Mozilla|E\.C\.P|62397bbd/);
    expect(stored).toContain("user_fields");
  });
});

describe("TikTok skip rules (staleness, wrong platform, no click)", () => {
  const now = new Date("2026-10-09T10:00:00Z");
  const row = (over: any = {}) => ({
    eventName: "Lead",
    eventTime: new Date(now.getTime() - 3600_000),
    adClick: { attributedPlatform: "TIKTOK" },
    ...over,
  });
  it("sends a fresh TikTok event", () => expect(tiktokSkipReason(row(), now, 7)).toBeNull());
  it("skips events older than the configured max age with a clear reason", () => {
    const r = tiktokSkipReason(row({ eventTime: new Date(now.getTime() - 8 * 86_400_000) }), now, 7);
    expect(r).toMatch(/older than 7 days/);
    expect(tiktokSkipReason(row({ eventTime: new Date(now.getTime() - 8 * 86_400_000) }), now, 30)).toBeNull();
  });
  it("skips without a click, or when the click is not TikTok-attributed", () => {
    expect(tiktokSkipReason(row({ adClick: null }), now, 7)).toMatch(/no landing-page ad click/);
    expect(tiktokSkipReason(row({ adClick: { attributedPlatform: "META" } }), now, 7)).toMatch(/not attributed to TikTok/);
    expect(tiktokSkipReason(row({ adClick: { attributedPlatform: null } }), now, 7)).toMatch(/not attributed to TikTok/);
  });
});

describe("TikTok error classification", () => {
  it("40002 invalid payload is permanent", () => expect(classifyTikTokError(400, 40002)).toBe("permanent"));
  it("40001 no permission and 40104 empty token are auth problems", () => {
    expect(classifyTikTokError(400, 40001)).toBe("auth");
    expect(classifyTikTokError(401, 40104)).toBe("auth");
    expect(classifyTikTokError(401, null)).toBe("auth");
  });
  it("40100 and 429 are rate limits", () => {
    expect(classifyTikTokError(401, 40100)).toBe("rate_limit");
    expect(classifyTikTokError(429, null)).toBe("rate_limit");
  });
  it("5xx, network errors and unknown codes are transient; other 4xx are permanent", () => {
    expect(classifyTikTokError(500, null)).toBe("transient");
    expect(classifyTikTokError(503, 50000)).toBe("transient");
    expect(classifyTikTokError(null, null)).toBe("transient");
    expect(classifyTikTokError(200, 40999)).toBe("transient");
    expect(classifyTikTokError(404, null)).toBe("permanent");
    expect(classifyTikTokError(408, null)).toBe("transient");
  });
});

describe("TikTok Events config states", () => {
  const TOKEN = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0";
  const base = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
  it("OFF unless TIKTOK_EVENTS_ENABLED=true (default false)", () => {
    expect(resolveTikTokEventsConfig({ ...base, TIKTOK_PIXEL_ID: "CABC1234567890", TIKTOK_EVENTS_ACCESS_TOKEN: TOKEN }).state).toBe("OFF");
  });
  it("INCOMPLETE when enabled without pixel or token (names the env var, never a value)", () => {
    const c = resolveTikTokEventsConfig({ ...base, TIKTOK_EVENTS_ENABLED: "true" });
    expect(c.state).toBe("INCOMPLETE");
    expect(c.problems).toEqual(["TIKTOK_PIXEL_ID is not set", "TIKTOK_EVENTS_ACCESS_TOKEN is not set"]);
  });
  it("INVALID for a malformed pixel code or a placeholder token", () => {
    expect(resolveTikTokEventsConfig({ ...base, TIKTOK_EVENTS_ENABLED: "true", TIKTOK_PIXEL_ID: "bad id!", TIKTOK_EVENTS_ACCESS_TOKEN: TOKEN }).state).toBe("INVALID");
    const c = resolveTikTokEventsConfig({ ...base, TIKTOK_EVENTS_ENABLED: "true", TIKTOK_PIXEL_ID: "CABC1234567890", TIKTOK_EVENTS_ACCESS_TOKEN: "your_token_here" });
    expect(c.state).toBe("INVALID");
    expect(JSON.stringify(c.problems)).not.toContain("your_token_here");
  });
  it("READY with pixel + token; test event code, max age and base URL are read", () => {
    const c = resolveTikTokEventsConfig({
      ...base,
      TIKTOK_EVENTS_ENABLED: "1",
      TIKTOK_PIXEL_ID: "CABC1234567890",
      TIKTOK_EVENTS_ACCESS_TOKEN: TOKEN,
      TIKTOK_TEST_EVENT_CODE: "TEST12345",
      TIKTOK_EVENTS_MAX_AGE_DAYS: "14",
      TIKTOK_EVENTS_API_BASE_URL: "http://127.0.0.1:9999/",
    });
    expect(c).toMatchObject({ state: "READY", testEventCode: "TEST12345", maxAgeDays: 14, baseUrl: "http://127.0.0.1:9999" });
  });
  it("defaults: 7 days, the real TikTok host; the base URL override is ignored in production", () => {
    const c = resolveTikTokEventsConfig({
      NODE_ENV: "production",
      TIKTOK_EVENTS_ENABLED: "true",
      TIKTOK_PIXEL_ID: "CABC1234567890",
      TIKTOK_EVENTS_ACCESS_TOKEN: TOKEN,
      TIKTOK_EVENTS_API_BASE_URL: "http://127.0.0.1:9999",
    });
    expect(c).toMatchObject({ state: "READY", maxAgeDays: 7, baseUrl: "https://business-api.tiktok.com" });
  });
  it("a malformed max age is INVALID", () => {
    expect(resolveTikTokEventsConfig({ ...base, TIKTOK_EVENTS_ENABLED: "true", TIKTOK_PIXEL_ID: "CABC1234567890", TIKTOK_EVENTS_ACCESS_TOKEN: TOKEN, TIKTOK_EVENTS_MAX_AGE_DAYS: "0" }).state).toBe("INVALID");
  });
});
