import { randomBytes } from "crypto";
import {
  assertInstagramConfig,
  DEFAULT_GRAPH_VERSION,
  isInstagramConfigured,
  loadInstagramConfig,
  PROD_REDIRECT_URI,
} from "./instagram.config";
import {
  classifyError,
  GraphApiError,
  InstagramGraphClient,
  parseUsage,
  redactUrl,
  scrubSecrets,
} from "./instagram-graph.client";

const KEY = randomBytes(32).toString("base64");
const base = { META_APP_ID: "123456789012345", META_APP_SECRET: "0f1e2d3c4b5a69788796a5b4c3d2e1f0" };

describe("instagram.config", () => {
  it("is off (null) without app credentials, and boot does not fail", () => {
    expect(isInstagramConfigured({})).toBe(false);
    expect(loadInstagramConfig({ NODE_ENV: "production" } as any)).toBeNull();
    expect(() => assertInstagramConfig({ NODE_ENV: "production" } as any)).not.toThrow();
  });

  it("production: requires a real 32-byte TOKEN_ENCRYPTION_KEY", () => {
    // Boot never aborts (META_APP_ID/SECRET may be set only for the WhatsApp
    // webhook): the integration is disabled and the reason returned/logged.
    expect(() => assertInstagramConfig({ ...base, NODE_ENV: "production" } as any)).not.toThrow();
    expect(assertInstagramConfig({ ...base, NODE_ENV: "production" } as any)).toMatch(/TOKEN_ENCRYPTION_KEY is required/);
    expect(() => loadInstagramConfig({ ...base, NODE_ENV: "production" } as any)).toThrow(/TOKEN_ENCRYPTION_KEY is required/);
    expect(assertInstagramConfig({ ...base, NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: KEY } as any)).toBeNull();
    expect(() =>
      loadInstagramConfig({ ...base, NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: "change-me-base64-32-bytes" } as any),
    ).toThrow(/placeholder/);
    expect(() =>
      loadInstagramConfig({ ...base, NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: randomBytes(16).toString("base64") } as any),
    ).toThrow(/32 bytes/);
    expect(() =>
      loadInstagramConfig({ ...base, NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64") } as any),
    ).toThrow(/low-entropy/);
  });

  it("production: rejects placeholder app secrets", () => {
    expect(() =>
      loadInstagramConfig({ ...base, META_APP_SECRET: "your-secret-here-please", NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: KEY } as any),
    ).toThrow(/META_APP_SECRET/);
    for (const placeholder of [
      "your-meta-app-secret",
      "your_meta_app_secret_value",
      "changeme-changeme-123",
      "<META_APP_SECRET-from-dashboard>",
      "meta-app-secret-goes-here",
      "replace-with-real-secret-1234",
      "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "dummy-secret-for-testing-1234",
    ]) {
      expect(() =>
        loadInstagramConfig({ ...base, META_APP_SECRET: placeholder, NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: KEY } as any),
      ).toThrow(/META_APP_SECRET looks like a placeholder/);
    }
    // A real-looking 32-hex secret is accepted.
    expect(loadInstagramConfig({ ...base, NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: KEY } as any)).not.toBeNull();
  });

  it("production defaults + dev-only base URL overrides are ignored", () => {
    const cfg = loadInstagramConfig({
      ...base,
      NODE_ENV: "production",
      TOKEN_ENCRYPTION_KEY: KEY,
      PORTAL_URL: "https://portal.monomiagency.com",
      INSTAGRAM_GRAPH_BASE_URL: "http://evil.test",
      INSTAGRAM_OAUTH_BASE_URL: "http://evil.test",
      INSTAGRAM_AUTHORIZE_URL: "http://evil.test",
    } as any)!;
    expect(cfg.redirectUri).toBe(PROD_REDIRECT_URI);
    expect(cfg.portalRedirectUri).toBe("https://portal.monomiagency.com/api/v1/instagram/oauth/callback");
    expect(cfg.graphBaseUrl).toBe("https://graph.instagram.com");
    expect(cfg.oauthBaseUrl).toBe("https://api.instagram.com");
    expect(cfg.authorizeUrl).toBe("https://www.instagram.com/oauth/authorize");
    expect(cfg.graphVersion).toBe(DEFAULT_GRAPH_VERSION);
  });

  it("dev: falls back to a derived key and accepts overrides; metric lists are configurable", () => {
    const cfg = loadInstagramConfig({
      ...base,
      NODE_ENV: "development",
      INSTAGRAM_GRAPH_BASE_URL: "http://127.0.0.1:5199",
      INSTAGRAM_ACCOUNT_METRICS: "reach, views,bad metric!,reach",
      META_GRAPH_VERSION: "v27.0",
    } as any)!;
    expect(cfg.tokenKey).toHaveLength(32);
    expect(cfg.graphBaseUrl).toBe("http://127.0.0.1:5199");
    expect(cfg.accountMetrics).toEqual(["reach", "views"]);
    expect(cfg.graphVersion).toBe("v27.0");
    expect(cfg.feedMetrics).not.toContain("impressions");
    expect(() => loadInstagramConfig({ ...base, META_GRAPH_VERSION: "latest" } as any)).toThrow(/META_GRAPH_VERSION/);
  });
});

describe("InstagramGraphClient", () => {
  it("redacts secrets from URLs and messages", () => {
    const u = redactUrl("https://graph.instagram.com/v26.0/me?fields=id&access_token=IGAAsecret123&client_secret=s3cr3t&code=abc");
    expect(u).not.toMatch(/IGAAsecret123|s3cr3t|code=abc/);
    expect(u).toContain("fields=id");
    expect(scrubSecrets("Invalid token IGAAbcdefghijklmnopqrstuvwxyz0123")).not.toContain("IGAAbcdefghijklmnop");
  });

  it("classifies Meta error codes", () => {
    expect(classifyError(400, 4)).toBe("rate_limit");
    expect(classifyError(400, 17)).toBe("rate_limit");
    expect(classifyError(400, 32)).toBe("rate_limit");
    expect(classifyError(400, 613)).toBe("rate_limit");
    expect(classifyError(400, 190, 463)).toBe("token");
    expect(classifyError(400, 10)).toBe("permission");
    expect(classifyError(400, 100)).toBe("invalid_param");
    expect(classifyError(500, 2)).toBe("transient");
  });

  it("parses usage headers", () => {
    const h = new Headers({
      "x-app-usage": JSON.stringify({ call_count: 12, total_time: 40, total_cputime: 5 }),
      "x-business-use-case-usage": JSON.stringify({ "1784": [{ type: "instagram", call_count: 95, estimated_time_to_regain_access: 3 }] }),
    });
    expect(parseUsage(h)).toEqual({ maxPercent: 95, regainSeconds: 180 });
    expect(parseUsage(new Headers())).toBeNull();
  });

  it("turns Meta errors into GraphApiError without leaking the token to logs", async () => {
    const fetchImpl = jest.fn(async () =>
      new Response(JSON.stringify({ error: { message: "Error validating access token", code: 190, error_subcode: 463 } }), { status: 400 }),
    );
    const client = new InstagramGraphClient(fetchImpl as any);
    const warn = jest.spyOn((client as any).logger, "warn").mockImplementation(() => undefined);
    await expect(
      client.request("https://graph.fake.test", "/v26.0/me", { query: { access_token: "IGAAtopsecretvalue" } }),
    ).rejects.toMatchObject({ kind: "token", code: 190 });
    expect(warn.mock.calls.flat().join(" ")).not.toContain("IGAAtopsecretvalue");
  });

  it("times out", async () => {
    const fetchImpl = jest.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => init.signal?.addEventListener("abort", () => rej(Object.assign(new Error("t"), { name: "TimeoutError" })))),
    );
    const client = new InstagramGraphClient(fetchImpl as any);
    jest.spyOn((client as any).logger, "warn").mockImplementation(() => undefined);
    const err = await client.request("https://graph.fake.test", "/x", { timeoutMs: 20 }).catch((e) => e);
    expect(err).toBeInstanceOf(GraphApiError);
    expect(err.kind).toBe("transient");
  });
});
