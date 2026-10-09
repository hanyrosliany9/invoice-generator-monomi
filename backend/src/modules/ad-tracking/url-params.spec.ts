import { Logger } from "@nestjs/common";
import { META_URL_MAX, originOf, stripMetaParams, stripTikTokParams, urlForMeta, urlForTikTok } from "./url-params";
import { resetTikTokConfigWarnings, resolveTikTokEventsConfig } from "./tiktok-events.config";

describe("url hygiene per platform", () => {
  it("a URL without the other platform's params is returned byte for byte (normal Meta flows are unchanged)", () => {
    for (const u of [
      "https://link.monomiagency.com/",
      "https://link.monomiagency.com/?utm_source=facebook&utm_medium=paid&utm_campaign=fb-okt1&fbclid=IwAR1%2Bx",
      "https://link.monomiagency.com/p?a=1&b=%20x#frag",
    ]) {
      expect(urlForMeta(u)).toBe(u);
      if (!u.includes("fbclid")) expect(urlForTikTok(u)).toBe(u);
    }
  });

  it("strips ttclid and TikTok params from what Meta gets, keeping everything else as it was", () => {
    expect(stripTikTokParams("https://a.id/?utm_source=facebook&ttclid=E.C.P.abc&fbclid=IwAR1&tt_medium=x&ttp=1")).toBe(
      "https://a.id/?utm_source=facebook&fbclid=IwAR1",
    );
    expect(stripTikTokParams("https://a.id/?TTCLID=abc")).toBe("https://a.id/");
    expect(stripTikTokParams("https://a.id/?ttclid=abc#h")).toBe("https://a.id/#h");
  });

  it("strips fbclid / fbc / fbp from what TikTok gets", () => {
    expect(stripMetaParams("https://a.id/?fbclid=IwAR1&utm_source=tiktok&ttclid=E.C.P.abc&fbc=fb.1.2.3")).toBe(
      "https://a.id/?utm_source=tiktok&ttclid=E.C.P.abc",
    );
  });

  it("Meta's URL is capped at 500 characters at build time (storage may hold 1500)", () => {
    const long = `https://link.monomiagency.com/?utm_source=facebook&fbclid=IwAR1&x=${"a".repeat(1200)}`;
    expect(urlForMeta(long)).toHaveLength(META_URL_MAX);
    expect(urlForMeta(long)).toBe(long.slice(0, 500));
    // the cap applies after the TikTok params were removed
    const withTt = `https://link.monomiagency.com/?ttclid=${"t".repeat(300)}&x=${"a".repeat(400)}`;
    expect(urlForMeta(withTt)).toBe(`https://link.monomiagency.com/?x=${"a".repeat(400)}`);
  });

  it("referrer: only the origin, and only for http(s)", () => {
    expect(originOf("https://l.facebook.com/l.php?u=https%3A%2F%2Fx&h=secret")).toBe("https://l.facebook.com");
    expect(originOf("http://example.com:8080/a?b=1")).toBe("http://example.com:8080");
    expect(originOf("javascript:alert(1)")).toBeNull();
    expect(originOf("not a url")).toBeNull();
    expect(originOf(null)).toBeNull();
  });
});

describe("TIKTOK_EVENTS_API_BASE_URL ignored-in-production warning", () => {
  afterEach(() => jest.restoreAllMocks());
  it("is logged once, not on every resolve", () => {
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    resetTikTokConfigWarnings();
    const env: any = { NODE_ENV: "production", TIKTOK_EVENTS_API_BASE_URL: "http://localhost:9999" };
    for (let i = 0; i < 5; i++) resolveTikTokEventsConfig(env);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("ignored in production"))).toHaveLength(1);
  });
});
