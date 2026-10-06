import { ForbiddenException, Logger } from "@nestjs/common";
import { MetaCapiService } from "./meta-capi.service";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { WhatsAppGraphClient } from "./whatsapp-graph.client";
import { WhatsAppStatusService } from "./whatsapp-status.service";
import {
  assertWhatsAppConfig,
  loadWhatsAppConfig,
  reportWhatsAppConfig,
  webhookReady,
  whatsappWebhookGate,
} from "./whatsapp.config";
import {
  ACCESS_TOKEN,
  APP_SECRET,
  FakeGraph,
  FakePrisma,
  PHONE_ID,
  VERIFY_TOKEN,
  WABA_ID,
  WA_ENV_KEYS,
  waEnv,
  withEnv,
} from "./testing/whatsapp-fakes.helper-spec";

const blank = Object.fromEntries(
  WA_ENV_KEYS.map((k) => [k, undefined]),
) as NodeJS.ProcessEnv;

describe("whatsapp.config", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("boots with nothing set (feature off)", () => {
    expect(() =>
      assertWhatsAppConfig({ ...blank, NODE_ENV: "production" }),
    ).not.toThrow();
    const cfg = loadWhatsAppConfig({ ...blank });
    expect(cfg).toMatchObject({
      accessToken: null,
      wabaId: null,
      capiEnabled: false,
      coexistenceEnabled: false,
      graphVersion: "v26.0",
    });
  });

  const prod = () => ({ ...blank, ...waEnv(), NODE_ENV: "production" });
  const noThrow = (env: NodeJS.ProcessEnv) => {
    expect(() => reportWhatsAppConfig(env)).not.toThrow();
    expect(() => assertWhatsAppConfig(env)).not.toThrow(); // old name, same behaviour
    return loadWhatsAppConfig(env);
  };

  it("a complete production config is READY (webhook usable)", () => {
    const cfg = noThrow(prod());
    expect(cfg.state).toBe("READY");
    expect(cfg.problems).toEqual([]);
    expect(cfg.credentialMode).toBe("env");
    expect(webhookReady(cfg)).toBe(true);
  });

  it("NEVER fails boot on a partial / invalid production config: the feature is gated instead", () => {
    const cases: Array<[string, NodeJS.ProcessEnv, string, RegExp]> = [
      ["only the access token", { ...blank, NODE_ENV: "production", META_APP_SECRET: APP_SECRET, WHATSAPP_ACCESS_TOKEN: ACCESS_TOKEN }, "INCOMPLETE", /WHATSAPP_WEBHOOK_VERIFY_TOKEN is required.*|WHATSAPP_WABA_ID/],
      ["only the access token, no app secret", { ...blank, NODE_ENV: "production", WHATSAPP_ACCESS_TOKEN: ACCESS_TOKEN }, "INCOMPLETE", /META_APP_SECRET \(or WHATSAPP_APP_SECRET\) is required/],
      ["missing verify token", { ...prod(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: undefined }, "INCOMPLETE", /WHATSAPP_WEBHOOK_VERIFY_TOKEN is required/],
      ["missing app secret", { ...prod(), META_APP_SECRET: undefined }, "INCOMPLETE", /APP_SECRET.*required to verify webhook signatures/],
      ["missing ids", { ...prod(), WHATSAPP_WABA_ID: undefined, WHATSAPP_PHONE_NUMBER_ID: undefined }, "INCOMPLETE", /WHATSAPP_WABA_ID, WHATSAPP_PHONE_NUMBER_ID are required/],
      ["placeholder verify token", { ...prod(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: "your-verify-token" }, "INVALID", /WHATSAPP_WEBHOOK_VERIFY_TOKEN is/],
      ["low-entropy verify token", { ...prod(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: "aaaaaaaaaaaaaaaaaaaa" }, "INVALID", /WHATSAPP_WEBHOOK_VERIFY_TOKEN is a low-entropy/],
      ["short verify token", { ...prod(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: "monomi-verify" }, "INVALID", /shorter than 16 characters/],
      ["placeholder app secret", { ...prod(), META_APP_SECRET: "your-meta-app-secret" }, "INVALID", /META_APP_SECRET looks like a placeholder/],
      ["non-numeric WABA id", { ...prod(), WHATSAPP_WABA_ID: "abc" }, "INVALID", /WHATSAPP_WABA_ID must be the numeric/],
      ["phone number instead of id", { ...prod(), WHATSAPP_PHONE_NUMBER_ID: "+62 811 1111" }, "INVALID", /WHATSAPP_PHONE_NUMBER_ID must be the numeric/],
      ["bad graph version", { ...prod(), META_GRAPH_VERSION: "26" }, "INVALID", /META_GRAPH_VERSION must look like/],
      ["quoted token", { ...prod(), WHATSAPP_ACCESS_TOKEN: `"${ACCESS_TOKEN}"` }, "INVALID", /WHATSAPP_ACCESS_TOKEN looks like a placeholder/],
      ["dataset only, no WhatsApp", { ...blank, NODE_ENV: "production", META_DATASET_ID: "dataset-abc", META_CAPI_ENABLED: "true" }, "INCOMPLETE", /WHATSAPP_WEBHOOK_VERIFY_TOKEN is required/],
      ["coexistence without TOKEN_ENCRYPTION_KEY", { ...prod(), WHATSAPP_ACCESS_TOKEN: undefined, WHATSAPP_COEXISTENCE_ENABLED: "true", WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: "998877665", TOKEN_ENCRYPTION_KEY: undefined }, "INVALID", /TOKEN_ENCRYPTION_KEY is required/],
    ];
    for (const [name, env, state, re] of cases) {
      const cfg = noThrow(env);
      expect({ name, state: cfg.state }).toEqual({ name, state });
      expect(cfg.problems.join("; ")).toMatch(re);
      expect(webhookReady(cfg)).toBe(false);
      // problems name variables, never their values
      for (const p of cfg.problems) {
        expect(p).not.toContain(ACCESS_TOKEN);
        expect(p).not.toContain(APP_SECRET);
        expect(p).not.toContain(VERIFY_TOKEN);
      }
    }
  });

  it("logs a warning (not an error / throw) listing the problems", () => {
    const warn = jest.spyOn(Logger.prototype, "warn");
    reportWhatsAppConfig({ ...prod(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: "short" });
    expect(warn.mock.calls.map((c) => String(c[0])).join("\n")).toMatch(
      /WhatsApp inbox DISABLED — configuration INVALID: .*WHATSAPP_WEBHOOK_VERIFY_TOKEN/,
    );
  });

  it("CAPI problems are reported separately and do not disable the inbox", () => {
    const cfg = noThrow({ ...prod(), META_CAPI_ENABLED: "true", META_DATASET_ID: "dataset-abc" });
    expect(cfg.state).toBe("READY");
    expect(cfg.capiState).toBe("INVALID");
    expect(cfg.capiProblems.join(";")).toMatch(/META_DATASET_ID must be the numeric/);
    expect(noThrow({ ...prod(), META_CAPI_ENABLED: "true" }).capiState).toBe("INCOMPLETE");
    expect(noThrow({ ...prod(), META_CAPI_ENABLED: "true", META_DATASET_ID: "556677889900" }).capiState).toBe("READY");
    const notReady = noThrow({ ...prod(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: undefined, META_CAPI_ENABLED: "true", META_DATASET_ID: "556677889900" });
    expect(notReady.capiState).toBe("INCOMPLETE");
    expect(notReady.capiProblems.join(";")).toMatch(/must be READY first \(currently INCOMPLETE\)/);
    expect(noThrow({ ...prod() }).capiState).toBe("OFF");
  });

  it("development only warns about a weak verify token (stays READY)", () => {
    const cfg = noThrow({ ...prod(), NODE_ENV: "development", WHATSAPP_WEBHOOK_VERIFY_TOKEN: "short" });
    expect(cfg.state).toBe("READY");
  });

  it("webhook gate (used before the raw body is read): OFF 404, misconfigured 503, READY none", () => {
    let restore = withEnv({ ...blank });
    expect(whatsappWebhookGate()).toEqual({ status: 404, message: "Not found" });
    restore();
    restore = withEnv({ ...blank, ...waEnv(), WHATSAPP_WEBHOOK_VERIFY_TOKEN: undefined });
    expect(whatsappWebhookGate()?.status).toBe(503);
    restore();
    restore = withEnv({ ...blank, ...waEnv() });
    expect(whatsappWebhookGate()).toBeNull();
    restore();
  });

  it("appsecret_proof is on by default when an app secret is set, and can be opted out", () => {
    expect(noThrow(prod()).appSecretProof).toBe(true);
    expect(noThrow({ ...prod(), WHATSAPP_APPSECRET_PROOF: "false" }).appSecretProof).toBe(false);
    expect(noThrow({ ...prod(), META_APP_SECRET: undefined }).appSecretProof).toBe(false);
  });

  it("ignores the fake Graph base URL in production; feature flags default off", () => {
    expect(
      loadWhatsAppConfig({
        ...blank,
        WHATSAPP_GRAPH_BASE_URL: "http://127.0.0.1:9",
        NODE_ENV: "production",
      }).graphBaseUrl,
    ).toBe("https://graph.facebook.com");
    expect(
      loadWhatsAppConfig({
        ...blank,
        WHATSAPP_GRAPH_BASE_URL: "http://127.0.0.1:9/x",
      }).graphBaseUrl,
    ).toBe("http://127.0.0.1:9");
    expect(
      loadWhatsAppConfig({
        ...blank,
        META_CAPI_ENABLED: "TRUE",
        WHATSAPP_COEXISTENCE_ENABLED: "1",
      }),
    ).toMatchObject({ capiEnabled: true, coexistenceEnabled: true });
  });
});

describe("Embedded Signup (coexistence) completion", () => {
  let saved: NodeJS.ProcessEnv;
  beforeEach(() => {
    saved = { ...process.env };
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env = saved;
    jest.restoreAllMocks();
  });

  function setup() {
    const prisma = new FakePrisma();
    const graph = new FakeGraph()
      .on("GET", /\/oauth\/access_token$/, {
        access_token: "EAABusinessIntegrationTokenFromCodeExchange0001",
        token_type: "bearer",
      })
      .on("GET", new RegExp(`/${WABA_ID}/phone_numbers$`), {
        data: [
          {
            id: PHONE_ID,
            display_phone_number: "+62 811-0000-0000",
            platform_type: "CLOUD_API",
            status: "CONNECTED",
          },
        ],
      })
      .on("POST", new RegExp(`/${WABA_ID}/subscribed_apps$`), { success: true })
      .on("POST", new RegExp(`/${PHONE_ID}/smb_app_data$`), { success: true });
    const api = new WhatsAppApiService(
      prisma as any,
      new WhatsAppGraphClient(graph.fetch as any),
    );
    const status = new WhatsAppStatusService(
      prisma as any,
      api,
      new MetaCapiService(prisma as any, api),
    );
    return { prisma, graph, api, status };
  }

  it("is refused while the coexistence flag is off", async () => {
    process.env = {
      ...saved,
      ...blank,
      META_APP_ID: "1234567890",
      META_APP_SECRET: "0123456789abcdef0123456789abcdef",
    } as any;
    const { status, graph } = setup();
    await expect(
      status.completeEmbeddedSignup(
        { code: "AQDcode1234567", wabaId: WABA_ID, phoneNumberId: PHONE_ID },
        "u1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(graph.calls).toHaveLength(0);
  });

  it("exchanges the code server-side, stores the token encrypted, subscribes, requests sync — and never registers the number", async () => {
    process.env = {
      ...saved,
      ...blank,
      META_APP_ID: "1234567890",
      META_APP_SECRET: "0123456789abcdef0123456789abcdef",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN,
      WHATSAPP_COEXISTENCE_ENABLED: "true",
      WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID: "998877665",
    } as any;
    const { status, graph, prisma, api } = setup();
    const r = await status.completeEmbeddedSignup(
      { code: "AQDcode1234567", wabaId: WABA_ID, phoneNumberId: PHONE_ID },
      "u1",
    );
    expect(r).toMatchObject({
      connected: true,
      steps: {
        exchange: "ok",
        verify: "ok",
        subscribe: "ok",
        contacts: "requested",
        history: "requested",
      },
    });
    const paths = graph.calls.map((c) => `${c.method} ${c.path}`);
    expect(paths).toEqual([
      "GET /v26.0/oauth/access_token",
      `GET /v26.0/${WABA_ID}/phone_numbers`,
      `POST /v26.0/${WABA_ID}/subscribed_apps`,
      `POST /v26.0/${PHONE_ID}/smb_app_data`,
      `POST /v26.0/${PHONE_ID}/smb_app_data`,
    ]);
    expect(
      paths.some((p) => /register|request_code|verify_code|deregister/.test(p)),
    ).toBe(false);
    expect(graph.calls.slice(3).map((c) => c.body.sync_type)).toEqual([
      "smb_app_state_sync",
      "history",
    ]);
    const conn = prisma.tables.whatsAppConnection[0];
    expect(conn).toMatchObject({
      status: "CONNECTED",
      wabaId: WABA_ID,
      phoneNumberId: PHONE_ID,
      connectedById: "u1",
    });
    expect(conn.accessTokenEnc).toMatch(/^v1:/);
    expect(conn.accessTokenEnc).not.toContain("EAABusiness");
    expect(conn.historySyncRequestedAt).toBeInstanceOf(Date);
    // the stored token is usable (decrypts) and is the effective credential without env token
    expect((await api.resolve())?.source).toBe("embedded");
    const st = await status.status();
    expect(JSON.stringify(st)).not.toContain("EAABusinessIntegrationToken");
  });
});
