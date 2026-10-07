import {
  matchCampaign,
  nextStatus,
  parseMessageContent,
  safeEqual,
  sanitizeReferral,
  templateParamCount,
  renderTemplate,
  tsFromUnix,
  verifyWebhookSignature,
  windowState,
} from "./whatsapp.utils";
import { APP_SECRET, sign } from "./testing/whatsapp-fakes.helper-spec";

describe("verifyWebhookSignature (X-Hub-Signature-256 on the raw body)", () => {
  const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(body, sign(body), APP_SECRET)).toBe(true);
    expect(
      verifyWebhookSignature(
        body,
        sign(body).toUpperCase().replace("SHA256=", "sha256="),
        APP_SECRET,
      ),
    ).toBe(true);
  });

  it("rejects a tampered body, wrong secret, missing/malformed header", () => {
    const tampered = Buffer.from(body.toString().replace("[]", "[1]"));
    expect(verifyWebhookSignature(tampered, sign(body), APP_SECRET)).toBe(
      false,
    );
    expect(
      verifyWebhookSignature(
        body,
        sign(body, "another-secret-value-123456"),
        APP_SECRET,
      ),
    ).toBe(false);
    expect(verifyWebhookSignature(body, undefined, APP_SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", APP_SECRET)).toBe(false);
    expect(
      verifyWebhookSignature(
        body,
        sign(body).replace("sha256=", "sha1="),
        APP_SECRET,
      ),
    ).toBe(false);
    expect(
      verifyWebhookSignature(body, sign(body).slice(0, 40), APP_SECRET),
    ).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), "")).toBe(false);
  });

  it("must be computed on the raw bytes: re-serialised JSON does not verify", () => {
    const raw = Buffer.from(
      '{ "object": "whatsapp_business_account",  "entry": [] }',
    );
    const reserialised = Buffer.from(
      JSON.stringify(JSON.parse(raw.toString())),
    );
    expect(verifyWebhookSignature(raw, sign(raw), APP_SECRET)).toBe(true);
    expect(verifyWebhookSignature(reserialised, sign(raw), APP_SECRET)).toBe(
      false,
    );
  });

  it("refuses non-Buffer bodies (an already-parsed object)", () => {
    expect(verifyWebhookSignature({} as any, sign(body), APP_SECRET)).toBe(
      false,
    );
  });
});

describe("safeEqual", () => {
  it("compares in constant time and rejects empties", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual(null, "x")).toBe(false);
  });
});

describe("parseMessageContent", () => {
  it("handles text, media, location, interactive, reaction", () => {
    expect(
      parseMessageContent({ type: "text", text: { body: " Halo " } }),
    ).toMatchObject({ type: "text", text: "Halo" });
    const img = parseMessageContent({
      type: "image",
      image: { id: "123456789", mime_type: "image/jpeg", caption: "foto" },
    });
    expect(img).toMatchObject({
      type: "image",
      text: "foto",
      media: { id: "123456789", mime: "image/jpeg" },
    });
    expect(
      parseMessageContent({
        type: "image",
        image: { id: "../etc", mime_type: "<script>" },
      }).media,
    ).toEqual({
      id: null,
      mime: null,
      caption: null,
      filename: null,
    });
    expect(
      parseMessageContent({
        type: "location",
        location: { latitude: -6.2, longitude: 106.8, name: "Kantor" },
      }).text,
    ).toBe("Kantor (-6.20000, 106.80000)");
    expect(
      parseMessageContent({
        type: "interactive",
        interactive: { button_reply: { title: "Ya" } },
      }).text,
    ).toBe("Ya");
    expect(
      parseMessageContent({ type: "reaction", reaction: { emoji: "👍" } }).text,
    ).toBe("👍");
    expect(parseMessageContent({ type: "weird type!" }).type).toBe("unknown");
    expect(
      parseMessageContent({
        type: "text",
        text: { body: "x" },
        context: { id: "wamid.ABC=" },
      }).contextId,
    ).toBe("wamid.ABC=");
  });
});

describe("sanitizeReferral", () => {
  it("keeps known fields, drops unsafe URLs and junk", () => {
    expect(
      sanitizeReferral({
        source_url: "javascript:alert(1)",
        source_id: "120211234567890",
        source_type: "ad",
        headline: "Promo Video",
        ctwa_clid:
          "ARAkLkA8rmlFeiCktEJQ-QTwRiyYHAFDLMNDBH0CD3qpjd0HR4irJ6LEkR7JwFF4XvnO2E4Nx0-eM-GABDLOPaOdRMv-_zfUQ2a",
        evil: { nested: true },
      }),
    ).toEqual({
      source_id: "120211234567890",
      source_type: "ad",
      headline: "Promo Video",
      ctwa_clid:
        "ARAkLkA8rmlFeiCktEJQ-QTwRiyYHAFDLMNDBH0CD3qpjd0HR4irJ6LEkR7JwFF4XvnO2E4Nx0-eM-GABDLOPaOdRMv-_zfUQ2a",
    });
    expect(sanitizeReferral(null)).toBeNull();
    expect(sanitizeReferral({ foo: "bar" })).toBeNull();
  });
});

describe("matchCampaign", () => {
  const campaigns = [
    {
      id: "c1",
      code: "FB-OKT1",
      name: "Oktober 1",
      metaAdIds: ["120211234567890"],
    },
    { id: "c2", code: "IG-REELS", name: "Reels", metaAdIds: [] },
  ];
  it("the explicit ad id wins over a [CODE] in the first message", () => {
    expect(
      matchCampaign(
        "Halo, mau tanya harga [ig-reels]",
        { source_id: "120211234567890" },
        campaigns,
      ),
    ).toMatchObject({
      campaign: { id: "c1" },
      reason: "ad_id",
    });
    // without an ad id the [CODE] still decides
    expect(
      matchCampaign("Halo, mau tanya harga [ig-reels]", null, campaigns),
    ).toMatchObject({ campaign: { id: "c2" }, reason: "code_in_message" });
  });
  it("falls back to the Meta ad id, then the headline", () => {
    expect(
      matchCampaign("Halo", { source_id: "120211234567890" }, campaigns),
    ).toMatchObject({ campaign: { id: "c1" }, reason: "ad_id" });
    expect(
      matchCampaign(
        "Halo",
        { headline: "Promo IG-REELS minggu ini" },
        campaigns,
      ),
    ).toMatchObject({
      campaign: { id: "c2" },
      reason: "code_in_headline",
    });
    expect(matchCampaign("Halo", null, campaigns)).toEqual({
      campaign: null,
      code: null,
      reason: null,
    });
  });
  it("keeps an unknown bracket code (stored on the lead) without a campaign", () => {
    expect(matchCampaign("Hi [NEW-AD]", null, campaigns)).toEqual({
      campaign: null,
      code: "NEW-AD",
      reason: null,
    });
  });
});

describe("windows and statuses", () => {
  it("24h service window and 72h free entry", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    expect(
      windowState(new Date("2026-10-05T12:30:00Z"), null, now),
    ).toMatchObject({ open: true });
    expect(
      windowState(new Date("2026-10-05T11:59:00Z"), null, now),
    ).toMatchObject({ open: false });
    expect(windowState(null, null, now)).toMatchObject({
      open: false,
      expiresAt: null,
    });
    expect(
      windowState(null, new Date("2026-10-07T00:00:00Z"), now),
    ).toMatchObject({ freeEntryActive: true });
  });
  it("statuses only move forward; failed never overrides delivered/read", () => {
    expect(nextStatus("PENDING", "SENT")).toBe("SENT");
    expect(nextStatus("READ", "DELIVERED")).toBe("READ");
    expect(nextStatus("SENT", "FAILED")).toBe("FAILED");
    expect(nextStatus("DELIVERED", "FAILED")).toBe("DELIVERED");
    expect(nextStatus("FAILED", "SENT")).toBe("FAILED");
  });
  it("timestamps and templates", () => {
    expect(tsFromUnix("1759752000")?.toISOString()).toBe(
      "2025-10-06T12:00:00.000Z",
    );
    expect(tsFromUnix("abc", null)).toBeNull();
    expect(
      tsFromUnix(String(Math.floor(Date.now() / 1000) + 10 * 86400), null),
    ).toBeNull();
    expect(templateParamCount("Halo {{1}}, pesanan {{2}}")).toBe(2);
    expect(renderTemplate("Halo {{1}}", ["Budi"])).toBe("Halo Budi");
  });
});
