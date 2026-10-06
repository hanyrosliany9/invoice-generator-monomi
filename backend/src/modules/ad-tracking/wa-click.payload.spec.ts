import { parseWaClickPayload, WA_CLICK_MAX_BYTES } from "./wa-click.payload";

const valid = {
  ref: "K7QM2X",
  eventId: "3f6b8c1e-2d4a-4f60-9a51-0c8d7e5b1a22",
  pageUrl: "https://link.monomiagency.com/?utm_campaign=FB-OKT1&fbclid=IwAR123#hash",
  referrer: "https://l.facebook.com/",
  utm: { source: "meta", medium: "paid", campaign: "FB-OKT1", content: "ad_123", term: "x" },
  fbclid: "IwAR3_AbC-def.GH",
  fbc: "fb.1.1759900000000.IwAR3_AbC-def.GH",
  fbp: "fb.1.1759900000000.1234567890",
  meta: { brandName: "Kopi Senja", category: "F&B", looks: "3", extra: "dropped" },
};

describe("parseWaClickPayload", () => {
  it("accepts the snippet payload as an object or as the raw text sendBeacon sends", () => {
    const fromObject = parseWaClickPayload(valid);
    const fromText = parseWaClickPayload(JSON.stringify(valid));
    expect(fromText).toEqual(fromObject);
    expect(fromObject).toMatchObject({
      ref: "K7QM2X",
      eventId: valid.eventId,
      utmCampaign: "FB-OKT1",
      utmContent: "ad_123",
      fbclid: "IwAR3_AbC-def.GH",
      fbc: valid.fbc,
      fbp: valid.fbp,
      meta: { brandName: "Kopi Senja", category: "F&B", looks: "3" },
    });
    // fragments never reach the database
    expect(fromObject?.pageUrl).not.toContain("#");
  });

  it("upper-cases the ref", () => {
    expect(parseWaClickPayload({ ...valid, ref: "k7qm2x" })?.ref).toBe("K7QM2X");
  });

  it.each([
    ["not JSON", "{oops"],
    ["array body", "[1,2]"],
    ["null body", "null"],
    ["empty object", {}],
    ["missing ref", { ...valid, ref: undefined }],
    ["bad ref alphabet", { ...valid, ref: "K7QM0X" }],
    ["short ref", { ...valid, ref: "K7QM2" }],
    ["missing eventId", { ...valid, eventId: undefined }],
    ["eventId with spaces", { ...valid, eventId: "not a valid id!!" }],
    ["too-short eventId", { ...valid, eventId: "abc" }],
    ["numeric ref", { ...valid, ref: 123456 }],
  ])("rejects %s", (_name, body) => {
    expect(parseWaClickPayload(body)).toBeNull();
  });

  it("rejects a body over the 4 KB cap", () => {
    const big = JSON.stringify({ ...valid, meta: { brandName: "x".repeat(WA_CLICK_MAX_BYTES) } });
    expect(parseWaClickPayload(big)).toBeNull();
  });

  it("drops malformed optional fields instead of storing them", () => {
    const p = parseWaClickPayload({
      ...valid,
      pageUrl: "javascript:alert(1)",
      referrer: "ftp://x",
      fbclid: "<script>",
      fbc: "nope",
      fbp: "fb.1.x.y",
      utm: "string",
      meta: ["a"],
    });
    expect(p).toMatchObject({
      pageUrl: null,
      referrer: null,
      fbclid: null,
      fbc: null,
      fbp: null,
      utmSource: null,
      meta: null,
    });
  });

  it("caps lengths, strips control characters and ignores unknown keys", () => {
    const p = parseWaClickPayload({
      ...valid,
      utm: { campaign: `a\u0000b\n${"z".repeat(500)}` },
      meta: { brandName: "y".repeat(500), other: "x" },
      isAdmin: true,
    });
    expect(p?.utmCampaign).toHaveLength(120);
    expect(p?.utmCampaign).not.toMatch(/[\u0000-\u001f]/);
    expect(p?.meta).toEqual({ brandName: "y".repeat(80) });
    expect(p).not.toHaveProperty("isAdmin");
  });
});
