import {
  assertGraphCallNotDenied,
  ForbiddenGraphEndpointError,
} from "./graph-denylist";
import { MetaGraphClient } from "../../modules/social-publishing/meta-graph.client";

const PHONE = "998877665544";
const PAGE = "777777777";

describe("shared Graph denylist", () => {
  it.each([
    ["register path", "POST", `/v26.0/${PHONE}/register`, {}],
    ["deregister path", "POST", `/${PHONE}/deregister`, {}],
    ["two-step path", "POST", `/${PHONE}/two_step_verification`, {}],
    ["encoded path", "POST", `/${PHONE}/%72egister`, {}],
    ["encoded slash", "POST", `/${PHONE}%2Fregister`, {}],
    ["traversal", "POST", `/${PHONE}/messages/../register`, {}],
    ["control char", "POST", `/${PHONE}/messages%00`, {}],
    ["query method override", "GET", `/${PHONE}?method=post&pin=123456`, {}],
    ["query method override via object", "GET", `/${PHONE}`, { query: { method: "delete" } }],
    ["query pin via URLSearchParams", "GET", `/${PHONE}`, { query: new URLSearchParams("pin=1") }],
    ["form pin", "POST", `/${PHONE}`, { body: { pin: "123456" } }],
    ["bracketed form key", "POST", `/${PAGE}/feed`, { body: { "x[pin]": "1" } }],
    ["nested JSON key", "POST", `/${PHONE}/messages`, { body: { a: [{ b: { code_method: "SMS" } }] } }],
    ["batch", "POST", "/", { body: { batch: "[]" } }],
    ["relative_url", "POST", `/${PAGE}/feed`, { body: { relative_url: `${PHONE}/register` } }],
    ["Graph path value", "POST", `/${PAGE}/feed`, { body: { link: `${PHONE}/register` } }],
    ["Graph URL value", "POST", `/${PAGE}/feed`, { body: { link: `https://graph.facebook.com/v26.0/${PHONE}/register` } }],
    ["Graph URL value with override query", "POST", `/${PAGE}/feed`, { body: { link: `https://graph.facebook.com/v26.0/${PHONE}?method=post` } }],
  ])("blocks %s", (_n, method, path, input) => {
    expect(() => assertGraphCallNotDenied(method, path, input as any)).toThrow(
      ForbiddenGraphEndpointError,
    );
  });

  it("allows ordinary publishing / messaging calls, including free text with the words", () => {
    expect(
      assertGraphCallNotDenied("POST", `/v26.0/${PAGE}/feed`, {
        body: {
          message: "Register now! Workshop 2026/10/06 — pin this post, migrate your brand",
          "attached_media[0]": JSON.stringify({ media_fbid: "123456" }),
        },
      }),
    ).toBe(`/${PAGE}/feed`);
    expect(() =>
      assertGraphCallNotDenied("GET", `/v26.0/${PAGE}/published_posts?fields=id%2Cmessage&limit=15`),
    ).not.toThrow();
    expect(() =>
      assertGraphCallNotDenied("POST", `/v26.0/22222222/media`, {
        body: {
          image_url: "https://media.monomiagency.com/x/register-banner.jpg?sig=a%2Fb",
          caption: "123/register is not a path in a sentence",
        },
      }),
    ).not.toThrow();
  });
});

describe("MetaGraphClient (auto-publishing) applies the shared denylist before I/O", () => {
  function client() {
    const calls: string[] = [];
    const fetchImpl = jest.fn(async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ id: "1" }), { status: 200 });
    });
    return { c: new MetaGraphClient(fetchImpl as any), calls };
  }

  it("refuses query overrides, forbidden form keys and forbidden paths", async () => {
    const { c, calls } = client();
    await expect(
      c.call(`https://graph.facebook.com/v26.0/${PHONE}`, "TOKEN", { query: { method: "post", pin: "1" } }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    await expect(
      c.call(`https://graph.facebook.com/v26.0/${PHONE}?method=delete`, "TOKEN"),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    await expect(
      c.call(`https://graph.facebook.com/v26.0/${PHONE}`, "TOKEN", { form: { pin: "123456" } }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    await expect(
      c.call(`https://graph.facebook.com/v26.0/${PHONE}/register`, "TOKEN", { form: {} }),
    ).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
    expect(calls).toHaveLength(0);
  });

  it("still sends normal publishing calls (with appsecret_proof added after the check)", async () => {
    const { c, calls } = client();
    await c.call(
      `https://graph.facebook.com/v26.0/${PAGE}/feed`,
      "TOKEN",
      { form: { message: "Register for our workshop" } },
      "0123456789abcdef0123456789abcdef",
    );
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0]).searchParams.get("appsecret_proof")).toMatch(/^[0-9a-f]{64}$/);
  });
});
