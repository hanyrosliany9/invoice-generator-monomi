import { ForbiddenException, Logger } from "@nestjs/common";
import { MetaCapiService } from "./meta-capi.service";
import { WhatsAppApiService } from "./whatsapp-api.service";
import { WhatsAppGraphClient } from "./whatsapp-graph.client";
import { WhatsAppStatusService } from "./whatsapp-status.service";
import { assertWhatsAppConfig, loadWhatsAppConfig } from "./whatsapp.config";
import {
  FakeGraph,
  FakePrisma,
  PHONE_ID,
  WABA_ID,
  WA_ENV_KEYS,
  waEnv,
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

  it("production refuses placeholder/weak verify tokens and a missing app secret", () => {
    const prod = { ...blank, ...waEnv(), NODE_ENV: "production" };
    expect(() => assertWhatsAppConfig(prod)).not.toThrow();
    expect(() =>
      assertWhatsAppConfig({
        ...prod,
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: "your-verify-token",
      }),
    ).toThrow(/VERIFY_TOKEN/);
    expect(() =>
      assertWhatsAppConfig({
        ...prod,
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: "aaaaaaaaaaaaaaaaaaaa",
      }),
    ).toThrow(/VERIFY_TOKEN/);
    expect(() =>
      assertWhatsAppConfig({ ...prod, WHATSAPP_WEBHOOK_VERIFY_TOKEN: "short" }),
    ).toThrow(/VERIFY_TOKEN/);
    expect(() =>
      assertWhatsAppConfig({
        ...prod,
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: undefined,
      }),
    ).toThrow(/VERIFY_TOKEN is required/);
    expect(() =>
      assertWhatsAppConfig({ ...prod, META_APP_SECRET: undefined }),
    ).toThrow(/APP_SECRET/);
    expect(() =>
      assertWhatsAppConfig({ ...prod, WHATSAPP_WABA_ID: "abc" }),
    ).toThrow(/WABA_ID/);
    // development only warns
    expect(() =>
      assertWhatsAppConfig({
        ...prod,
        NODE_ENV: "development",
        WHATSAPP_WEBHOOK_VERIFY_TOKEN: "short",
      }),
    ).not.toThrow();
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
