import { Logger } from "@nestjs/common";
import {
  assertGraphCallAllowed,
  ForbiddenGraphEndpointError,
  GraphApiError,
  WhatsAppGraphClient,
} from "./whatsapp-graph.client";
import {
  ACCESS_TOKEN,
  FakeGraph,
  PHONE_ID,
  WABA_ID,
} from "./testing/whatsapp-fakes.helper-spec";

const BASE = "https://graph.facebook.com";
const V = "v26.0";

describe("WhatsAppGraphClient safety denylist (never register / verify / migrate the coexistence number)", () => {
  let graph: FakeGraph;
  let client: WhatsAppGraphClient;
  beforeEach(() => {
    graph = new FakeGraph()
      .on("POST", /.*/, { success: true })
      .on("GET", /.*/, { data: [] });
    client = new WhatsAppGraphClient(graph.fetch as any);
  });

  it.each([
    [
      "POST",
      `/${PHONE_ID}/register`,
      { messaging_product: "whatsapp", pin: "123456" },
    ],
    [
      "POST",
      `/${PHONE_ID}/request_code`,
      { code_method: "SMS", language: "id" },
    ],
    ["POST", `/${PHONE_ID}/verify_code`, { code: "123456" }],
    ["POST", `/${PHONE_ID}/deregister`, {}],
    ["POST", `/${PHONE_ID}/register`, undefined],
    ["GET", `/${PHONE_ID}/request_code`, undefined],
  ])("%s %s throws before any HTTP call", async (method, path, json) => {
    await expect(
      client.request(BASE, V, path, {
        method: method as any,
        json: json as any,
        token: ACCESS_TOKEN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    expect(graph.calls).toHaveLength(0);
  });

  it.each([
    `/${V}/${PHONE_ID}/register`,
    `/${PHONE_ID}/REGISTER`,
    `/${PHONE_ID}/%72egister`,
    `//${PHONE_ID}//register/`,
    `/${PHONE_ID}/register?x=1`,
    `/${PHONE_ID}/deregister_number`,
    `/${WABA_ID}/migrate_phone_number`,
    `/${PHONE_ID}/two_step_verification`,
  ])("blocks evasive spelling %s", async (path) => {
    await expect(
      client.request(BASE, V, path, {
        method: "POST",
        json: {},
        token: ACCESS_TOKEN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    expect(graph.calls).toHaveLength(0);
  });

  it("blocks setting a two-step verification PIN (POST to the bare phone number node)", async () => {
    await expect(
      client.request(BASE, V, `/${PHONE_ID}`, {
        method: "POST",
        json: { pin: "123456" },
      }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    await expect(
      client.request(BASE, V, `/${PHONE_ID}`, {
        method: "POST",
        json: { foo: 1 },
      }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    expect(graph.calls).toHaveLength(0);
  });

  it("blocks a `pin` body field even on an otherwise allowed endpoint", () => {
    expect(() =>
      assertGraphCallAllowed("POST", `/${PHONE_ID}/messages`, {
        pin: "000000",
      }),
    ).toThrow(ForbiddenGraphEndpointError);
  });

  it("refuses endpoints that are not on the allowlist and absolute/traversing paths", () => {
    expect(() =>
      assertGraphCallAllowed("DELETE", `/${WABA_ID}/subscribed_apps`),
    ).toThrow(ForbiddenGraphEndpointError);
    expect(() =>
      assertGraphCallAllowed("POST", `/${WABA_ID}/phone_numbers`, {}),
    ).toThrow(ForbiddenGraphEndpointError);
    expect(() =>
      assertGraphCallAllowed("GET", `https://evil.example/${WABA_ID}`),
    ).toThrow(ForbiddenGraphEndpointError);
    expect(() => assertGraphCallAllowed("GET", `/${WABA_ID}/../me`)).toThrow(
      ForbiddenGraphEndpointError,
    );
    expect(() => assertGraphCallAllowed("GET", `/me/accounts`)).toThrow(
      ForbiddenGraphEndpointError,
    );
  });

  it("the SMB sync edge is allowed only through config and stays subject to the denylist", () => {
    expect(() =>
      assertGraphCallAllowed("POST", `/${PHONE_ID}/smb_app_data`, {
        sync_type: "history",
      }),
    ).toThrow();
    expect(() =>
      assertGraphCallAllowed(
        "POST",
        `/${PHONE_ID}/smb_app_data`,
        { sync_type: "history" },
        ["smb_app_data"],
      ),
    ).not.toThrow();
    expect(() =>
      assertGraphCallAllowed("POST", `/${PHONE_ID}/register`, {}, ["register"]),
    ).toThrow(ForbiddenGraphEndpointError);
  });

  it.each([
    ["GET", `/${WABA_ID}`],
    ["GET", `/${WABA_ID}/phone_numbers`],
    ["GET", `/${WABA_ID}/message_templates`],
    ["POST", `/${PHONE_ID}/messages`],
    ["POST", `/${WABA_ID}/subscribed_apps`],
    ["POST", `/556677889900/events`],
    ["GET", `/oauth/access_token`],
  ])("allows %s %s", (method, path) => {
    expect(() =>
      assertGraphCallAllowed(method, path, method === "POST" ? {} : undefined),
    ).not.toThrow();
  });

  it("sends the token only in the Authorization header (never in the URL)", async () => {
    await client.request(BASE, V, `/${WABA_ID}/phone_numbers`, {
      token: ACCESS_TOKEN,
      query: { fields: "status" },
    });
    expect(graph.calls).toHaveLength(1);
    expect(graph.calls[0].url).not.toContain(ACCESS_TOKEN);
    expect(graph.calls[0].url).toBe(
      `${BASE}/${V}/${WABA_ID}/phone_numbers?fields=status`,
    );
    expect(graph.calls[0].headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it("scrubs tokens from Meta error messages and logs", async () => {
    const warn = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    graph.on("GET", /phone_numbers/, () => ({
      status: 400,
      json: {
        error: {
          message: `Invalid token ${ACCESS_TOKEN}`,
          code: 190,
          type: "OAuthException",
        },
      },
    }));
    const err = await client
      .request(BASE, V, `/${WABA_ID}/phone_numbers`, { token: ACCESS_TOKEN })
      .catch((e) => e);
    expect(err).toBeInstanceOf(GraphApiError);
    expect(err.kind).toBe("token");
    expect(err.message).not.toContain(ACCESS_TOKEN);
    for (const call of warn.mock.calls)
      expect(String(call[0])).not.toContain(ACCESS_TOKEN);
    warn.mockRestore();
  });

  it("downloads media only from Meta media hosts (or the dev fake origin)", async () => {
    graph.on("GET", /\/media\//, () => ({
      body: Buffer.from("img"),
      headers: { "content-type": "image/jpeg" },
    }));
    await expect(
      client.downloadMedia("https://evil.example/media/1", ACCESS_TOKEN, {
        maxBytes: 100,
      }),
    ).rejects.toBeInstanceOf(GraphApiError);
    await expect(
      client.downloadMedia("http://lookaside.fbsbx.com/media/1", ACCESS_TOKEN, {
        maxBytes: 100,
      }),
    ).rejects.toBeInstanceOf(GraphApiError);
    expect(graph.calls).toHaveLength(0);
    const ok = await client.downloadMedia(
      "https://lookaside.fbsbx.com/media/1",
      ACCESS_TOKEN,
      { maxBytes: 100 },
    );
    expect(ok.buffer.toString()).toBe("img");
    const dev = await client.downloadMedia(
      "http://127.0.0.1:9999/media/2",
      ACCESS_TOKEN,
      { maxBytes: 100, devOrigin: "http://127.0.0.1:9999" },
    );
    expect(dev.contentType).toBe("image/jpeg");
    await expect(
      client.downloadMedia(
        "https://lookaside.fbsbx.com/media/3",
        ACCESS_TOKEN,
        { maxBytes: 2 },
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
