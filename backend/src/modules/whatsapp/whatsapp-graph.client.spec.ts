import { Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import {
  assertGraphCallAllowed,
  ForbiddenGraphEndpointError,
  GraphApiError,
  WaGraphError,
  WhatsAppGraphClient,
} from "./whatsapp-graph.client";
import {
  ACCESS_TOKEN,
  APP_SECRET,
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

  it.each([
    ["method override in the query", "GET", `/${PHONE_ID}`, undefined, { method: "post", pin: "123456" }],
    ["method override (DELETE) in the query", "GET", `/${WABA_ID}/subscribed_apps`, undefined, { method: "DELETE" }],
    ["_method in the query", "GET", `/${PHONE_ID}`, undefined, { _method: "POST" }],
    ["pin in the query", "GET", `/${PHONE_ID}`, undefined, { pin: "123456" }],
    ["register-ish query key", "GET", `/${PHONE_ID}`, undefined, { deregister: "1" }],
    ["bracketed pin in the query", "GET", `/${PHONE_ID}`, undefined, { "x[pin]": "1" }],
    ["query string inside the path", "GET", `/${PHONE_ID}?method=post&pin=123456`, undefined, undefined],
    ["encoded query delimiter in the path", "GET", `/${PHONE_ID}%3Fmethod=post`, undefined, undefined],
    ["encoded slash in the path", "POST", `/${PHONE_ID}%2Fregister`, {}, undefined],
    ["nested pin in the body", "POST", `/${PHONE_ID}/messages`, { messaging_product: "whatsapp", nested: { deep: [{ pin: "1" }] } }, undefined],
    ["nested migrate key", "POST", `/${PHONE_ID}/messages`, { a: { migrate_phone_number: true } }, undefined],
    ["batch request", "POST", `/${PHONE_ID}/messages`, { batch: [{ method: "POST", relative_url: `${PHONE_ID}/register` }] }, undefined],
    ["Graph path as a body value", "POST", `/${PHONE_ID}/messages`, { messaging_product: "whatsapp", next: `${PHONE_ID}/register` }, undefined],
    ["Graph URL as a body value", "POST", `/${PHONE_ID}/messages`, { url: `https://graph.facebook.com/v26.0/${PHONE_ID}/deregister` }, undefined],
  ])("blocks %s before any I/O", async (_name, method, path, json, query) => {
    expect(() =>
      assertGraphCallAllowed(method, path, json, [], query as any),
    ).toThrow(ForbiddenGraphEndpointError);
    await expect(
      client.request(BASE, V, path, {
        method: method as any,
        json: json as any,
        query: query as any,
        token: ACCESS_TOKEN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    expect(graph.calls).toHaveLength(0);
  });

  it("does not block free text that merely mentions the words (customer replies, template params)", async () => {
    const body = {
      messaging_product: "whatsapp",
      to: "6281234567890",
      type: "text",
      text: { body: "Please register me — my PIN is not needed, migrate later? method: post" },
    };
    expect(() =>
      assertGraphCallAllowed("POST", `/${PHONE_ID}/messages`, body),
    ).not.toThrow();
    expect(() =>
      assertGraphCallAllowed("GET", `/${WABA_ID}/phone_numbers`, undefined, [], {
        fields: "display_phone_number,verified_name,platform_type,status,quality_rating",
      }),
    ).not.toThrow();
  });

  it("adds appsecret_proof = HMAC-SHA256(app secret, token) when an app secret is given", async () => {
    await client.request(BASE, V, `/${WABA_ID}/phone_numbers`, {
      token: ACCESS_TOKEN,
      appSecret: APP_SECRET,
    });
    await client.request(BASE, V, `/${WABA_ID}/phone_numbers`, { token: ACCESS_TOKEN });
    const proof = createHmac("sha256", APP_SECRET).update(ACCESS_TOKEN).digest("hex");
    expect(new URL(graph.calls[0].url).searchParams.get("appsecret_proof")).toBe(proof);
    expect(new URL(graph.calls[1].url).searchParams.has("appsecret_proof")).toBe(false);
    expect(graph.calls[0].url).not.toContain(ACCESS_TOKEN);
    expect(graph.calls[0].url).not.toContain(APP_SECRET);
  });

  it("classifies POST outcomes: Graph error = definitive, timeout / bare 5xx = ambiguous, refused connection = not sent", async () => {
    graph.on("POST", /events$/, () => ({ status: 500, json: { error: { message: "down", code: 2 } } }));
    const definitive = await client
      .request(BASE, V, `/${WABA_ID}/events`, { json: { data: [] }, token: ACCESS_TOKEN })
      .catch((e) => e);
    expect(definitive).toBeInstanceOf(WaGraphError);
    expect(definitive.ambiguous).toBe(false);

    graph.on("POST", /events$/, () => ({ status: 504, body: Buffer.from("Gateway Timeout") }));
    const gateway = await client
      .request(BASE, V, `/${WABA_ID}/events`, { json: { data: [] }, token: ACCESS_TOKEN })
      .catch((e) => e);
    expect(gateway.ambiguous).toBe(true);

    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const timeoutClient = new WhatsAppGraphClient((async () => {
      const e = new Error("timed out");
      e.name = "TimeoutError";
      throw e;
    }) as any);
    const timeout = await timeoutClient
      .request(BASE, V, `/${WABA_ID}/events`, { json: { data: [] }, token: ACCESS_TOKEN })
      .catch((e) => e);
    expect(timeout.ambiguous).toBe(true);

    const refusedClient = new WhatsAppGraphClient((async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    }) as any);
    const refused = await refusedClient
      .request(BASE, V, `/${WABA_ID}/events`, { json: { data: [] }, token: ACCESS_TOKEN })
      .catch((e) => e);
    expect(refused.ambiguous).toBe(false);
    warn.mockRestore();
  });
});
