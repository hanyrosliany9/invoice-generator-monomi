import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as vm from "vm";
import request from "supertest";
import { AdClickService } from "./ad-click.service";
import { resolveAdTrackingConfig } from "./ad-tracking.config";
import { PublicTrackController } from "./public-track.controller";
import { createPublicTrackBody, createPublicTrackCors } from "./public-track.http";
import { MONOMI_TRACK_JS } from "./monomi-track.snippet";
import { WebCapiService } from "./web-capi.service";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { FakeGraph, FakePrisma, withEnv } from "../whatsapp/testing/whatsapp-fakes.helper-spec";

const ALLOWED = "https://link.monomiagency.com";
const URL_PATH = "/api/v1/public/track/event";
const PIXEL = "28492116573772457";
const TOKEN = "EAAGm0PX4ZCpsBO7Zxk9QwLrN2vTb8YhJcUdFeGaIiKoMlPqRsStUuVvWwXxYyZz";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const VISIT = "0b6f3b0e-52a2-4f0e-8a54-1c1f0f0b6c11";

let n = 0;
const ev = (over: Record<string, unknown> = {}) => ({
  name: "PageView",
  visitId: VISIT,
  eventId: `evt-${String(++n).padStart(8, "0")}-aaaa`,
  pageUrl: "https://link.monomiagency.com/?utm_campaign=fb-okt1&fbclid=IwAR1",
  utm: { source: "meta", medium: "paid", campaign: "fb-okt1" },
  fbclid: "IwAR1",
  fbp: "fb.1.1759900000000.1234567890",
  ...over,
});
const lead = (over: Record<string, unknown> = {}) =>
  ev({ name: "Lead", ref: "K7QM2X", meta: { instagram: "@Kopi.Senja", brandName: "Kopi Senja", category: "F&B" }, ...over });

describe("public tracking endpoints", () => {
  let app: INestApplication;
  let prisma: FakePrisma;
  let sender: WebCapiService;
  let graph: FakeGraph;
  let restore: () => void;

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .post(URL_PATH)
      .set("Origin", ALLOWED)
      .set("User-Agent", UA)
      .set("Content-Type", "text/plain;charset=UTF-8")
      .set(headers)
      .send(typeof body === "string" ? body : JSON.stringify(body));

  beforeEach(async () => {
    restore = withEnv({
      NODE_ENV: "test",
      PUBLIC_TRACK_ALLOWED_ORIGINS: undefined,
      META_WEB_CAPI_ENABLED: "true",
      META_PIXEL_ID: PIXEL,
      META_WEB_CAPI_TOKEN: TOKEN,
      META_WEB_CAPI_TEST_EVENT_CODE: undefined,
      META_WEB_CAPI_GRAPH_BASE_URL: undefined,
    });
    prisma = new FakePrisma({ campaign: [{ id: "cmp1", code: "FB-OKT1", name: "Oktober 1" }] });
    graph = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({
      json: { events_received: c.body.data.length, fbtrace_id: "T" },
    }));
    sender = new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any));
    const mod = await Test.createTestingModule({
      controllers: [PublicTrackController],
      providers: [
        { provide: AdClickService, useValue: new AdClickService(prisma as any) },
        { provide: WebCapiService, useValue: sender },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.use(createPublicTrackCors(() => resolveAdTrackingConfig()));
    app.use(createPublicTrackBody());
    app.setGlobalPrefix("api/v1");
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    restore();
  });

  it("PageView creates the visit row once; the second PageView of the visit is a duplicate and sends nothing more to Meta", async () => {
    expect((await post(ev(), { "X-Forwarded-For": "203.0.113.9" })).status).toBe(200);
    expect((await post(ev())).status).toBe(200);
    expect(prisma.tables.adClick).toHaveLength(1);
    expect(prisma.tables.adClick[0]).toMatchObject({
      visitId: VISIT,
      ref: null,
      eventId: null,
      clientIp: "203.0.113.9",
      userAgent: UA,
      campaignCode: "FB-OKT1",
      leadId: null,
    });
    expect(prisma.tables.adClick[0].pageViewAt).toBeInstanceOf(Date);
    expect(prisma.tables.adClick[0].fbc).toMatch(/^fb\.1\.\d{13}\.IwAR1$/);
    expect(sender.queuedVisitEvents).toBe(1); // only the first PageView is queued
    const r = await sender.flushVisitEvents();
    expect(r.sent).toBe(1);
    expect(graph.calls).toHaveLength(1);
    const e = graph.calls[0].body.data[0];
    expect(e).toMatchObject({ event_name: "PageView", action_source: "website", event_source_url: expect.stringContaining("link.monomiagency.com") });
    expect(e.user_data).toMatchObject({ client_ip_address: "203.0.113.9", client_user_agent: UA, fbp: "fb.1.1759900000000.1234567890" });
    expect(e.user_data.ph).toBeUndefined();
    // a PageView from another visit is a separate row and event
    await post(ev({ visitId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" }));
    expect(prisma.tables.adClick).toHaveLength(2);
    expect(sender.queuedVisitEvents).toBe(1);
  });

  it("ViewContent and EngagedVisit are also accepted once per visit, on the same visit row", async () => {
    await post(ev());
    await post(ev({ name: "ViewContent" }));
    await post(ev({ name: "ViewContent" }));
    await post(ev({ name: "EngagedVisit" }));
    await post(ev({ name: "EngagedVisit" }));
    expect(prisma.tables.adClick).toHaveLength(1);
    expect(prisma.tables.adClick[0]).toMatchObject({ pageViewAt: expect.any(Date), viewContentAt: expect.any(Date), engagedAt: expect.any(Date) });
    expect(sender.queuedVisitEvents).toBe(3);
  });

  it("Lead: stores the code, Instagram (normalised), brand and category on the visit row and queues one Lead; idempotent on eventId", async () => {
    await post(ev());
    const body = lead();
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).status).toBe(200); // retry / fetch fallback
    expect(prisma.tables.adClick).toHaveLength(1);
    expect(prisma.tables.adClick[0]).toMatchObject({
      visitId: VISIT,
      ref: "K7QM2X",
      instagramHandle: "kopi.senja",
      brandName: "Kopi Senja",
      category: "F&B",
    });
    expect(prisma.tables.metaEventOutbox).toHaveLength(1);
    expect(prisma.tables.metaEventOutbox[0]).toMatchObject({ route: "WEBSITE", eventName: "Lead", leadId: null, status: "PENDING_CONFIG", dedupeKey: `click:${body.eventId}` });
  });

  it("a second WhatsApp tap in the same visit gets its own row; ref/eventId clashes are 409", async () => {
    await post(ev());
    await post(lead());
    expect((await post(lead({ ref: "ABCD23" }))).status).toBe(200);
    expect(prisma.tables.adClick).toHaveLength(2);
    expect(prisma.tables.adClick.every((r: any) => r.visitId === VISIT)).toBe(true);
    expect((await post(lead({ eventId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" }))).status).toBe(409); // same ref, other eventId
    const first = prisma.tables.adClick[0].eventId;
    expect((await post(lead({ ref: "WXYZ23", eventId: first }))).status).toBe(409); // eventId used by another ref
    expect(prisma.tables.adClick).toHaveLength(2);
  });

  it("only whitelisted event names are accepted (400, nothing stored)", async () => {
    for (const name of ["Purchase", "QualifiedLead", "AddToCart", "pageview", "<script>"]) {
      const res = await post(ev({ name }));
      expect(res.status).toBe(400);
      expect(res.text).not.toContain("script");
    }
    expect(prisma.tables.adClick).toHaveLength(0);
  });

  it("drops bots: acknowledged, nothing stored, nothing sent to Meta", async () => {
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "facebookexternalhit/1.1",
      "curl/8.4.0",
    ]) {
      expect((await post(ev(), { "User-Agent": ua })).status).toBe(200);
      expect((await post(lead(), { "User-Agent": ua })).status).toBe(200);
    }
    expect(prisma.tables.adClick).toHaveLength(0);
    expect(prisma.tables.metaEventOutbox).toHaveLength(0);
    expect(sender.queuedVisitEvents).toBe(0);
  });

  it("rejects invalid payloads with a generic 400 that never reflects the input", async () => {
    const evil = "<script>alert('xss-marker')</script>";
    for (const payload of ["not json", JSON.stringify({ name: evil, visitId: evil, eventId: evil }), JSON.stringify({ ...lead(), ref: "bad" }), ""]) {
      const res = await post(payload);
      expect(res.status).toBe(400);
      expect(res.text).not.toContain("xss-marker");
      expect(res.text).not.toContain("not json");
    }
    expect(prisma.tables.adClick).toHaveLength(0);
  });

  it("also accepts application/json", async () => {
    const res = await request(app.getHttpServer()).post(URL_PATH).set("Origin", ALLOWED).set("User-Agent", UA).send(ev());
    expect(res.status).toBe(200);
    expect(prisma.tables.adClick).toHaveLength(1);
  });

  it("caps the body at 4 KB (413) and stores nothing", async () => {
    const res = await post(lead({ meta: { brandName: "x".repeat(6000) } }));
    expect(res.status).toBe(413);
    expect(prisma.tables.adClick).toHaveLength(0);
  });

  it("does not queue visit events while the sender is not READY (clicks are still stored)", async () => {
    const off = withEnv({ META_WEB_CAPI_ENABLED: "false" });
    try {
      await post(ev());
      expect(prisma.tables.adClick).toHaveLength(1);
      expect(sender.queuedVisitEvents).toBe(0);
    } finally {
      off();
    }
  });

  describe("CORS", () => {
    it("answers the preflight for the allowed origin only", async () => {
      const ok = await request(app.getHttpServer()).options(URL_PATH).set("Origin", ALLOWED).set("Access-Control-Request-Method", "POST").set("Access-Control-Request-Headers", "content-type");
      expect(ok.status).toBe(204);
      expect(ok.headers["access-control-allow-origin"]).toBe(ALLOWED);
      expect(ok.headers["access-control-allow-methods"]).toContain("POST");
      const bad = await request(app.getHttpServer()).options(URL_PATH).set("Origin", "https://evil.example.com").set("Access-Control-Request-Method", "POST");
      expect(bad.status).toBe(403);
      expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("refuses other origins before anything is stored (look-alike hosts, http, 'null')", async () => {
      for (const origin of ["https://evil.example.com", "https://link.monomiagency.com.evil.com", "http://link.monomiagency.com", "null"]) {
        const res = await post(ev(), { Origin: origin });
        expect(res.status).toBe(403);
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      }
      expect(prisma.tables.adClick).toHaveLength(0);
    });

    it("allows localhost outside production only, and honours PUBLIC_TRACK_ALLOWED_ORIGINS", async () => {
      expect((await post(ev(), { Origin: "http://localhost:8080" })).status).toBe(200);
      const prod = withEnv({ NODE_ENV: "production", PUBLIC_TRACK_ALLOWED_ORIGINS: "https://lp.example.com" });
      try {
        expect((await post(ev({ visitId: "11111111-2222-4333-8444-555555555551" }), { Origin: "http://localhost:8080" })).status).toBe(403);
        expect((await post(ev({ visitId: "11111111-2222-4333-8444-555555555552" }), { Origin: "https://lp.example.com" })).status).toBe(200);
        expect((await post(ev({ visitId: "11111111-2222-4333-8444-555555555553" }), { Origin: ALLOWED })).status).toBe(403); // replaced, not merged
      } finally {
        prod();
      }
    });
  });

  describe("GET monomi-track.js", () => {
    it("serves the snippet as cacheable JavaScript with an ETag (304 on revalidation)", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/public/track/monomi-track.js");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/javascript");
      expect(res.headers["cache-control"]).toContain("max-age=300");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
      const again = await request(app.getHttpServer()).get("/api/v1/public/track/monomi-track.js").set("If-None-Match", res.headers.etag);
      expect(again.status).toBe(304);
    });
  });
});

describe("monomi-track.js source", () => {
  it("is valid plain JavaScript, small, never calls fbq, holds nothing sensitive", () => {
    expect(() => new vm.Script(MONOMI_TRACK_JS)).not.toThrow();
    expect(MONOMI_TRACK_JS.length).toBeLessThan(14000);
    expect(MONOMI_TRACK_JS).not.toMatch(/fbq\s*\(|fbevents|connect\.facebook/);
    expect(MONOMI_TRACK_JS).not.toMatch(/secret|password|access_token|EAA[A-Za-z0-9]{10}/i);
    expect(MONOMI_TRACK_JS).not.toContain("${");
    expect(MONOMI_TRACK_JS).toContain("sendBeacon");
  });
});
