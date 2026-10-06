import { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { createHash } from "crypto";
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
import { LEAD_IP_CAP_PER_HOUR } from "./ad-click.service";
import { parseTrackEvent } from "./track-event.payload";
import { InMemoryTrackCounters } from "./track-limits";
import {
  SKIP_DUPLICATE_CLICK_ID,
  SKIP_DUPLICATE_VISIT_LEAD,
  SKIP_IP_LEAD_CAP,
  SKIP_UNVERIFIED_VISIT,
} from "./web-capi.payload";

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
  let clicks: AdClickService;

  /** Backdates the visit's PageView so a Lead may pass the 3 s rule. */
  const agePageView = (visitId = VISIT, ms = 5000) => {
    for (const r of prisma.tables.adClick) {
      if (r.visitId === visitId && r.pageViewAt) r.pageViewAt = new Date(r.pageViewAt.getTime() - ms);
    }
  };
  const leadRows = () => prisma.tables.metaEventOutbox.filter((r: any) => r.eventName === "Lead");

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
      PUBLIC_TRACK_MAX_NEW_PER_MIN: undefined,
      LANDING_PAGE_URL: undefined,
    });
    prisma = new FakePrisma({ campaign: [{ id: "cmp1", code: "FB-OKT1", name: "Oktober 1" }] });
    graph = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({
      json: { events_received: c.body.data.length, fbtrace_id: "T" },
    }));
    sender = new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any));
    const mod = await Test.createTestingModule({
      controllers: [PublicTrackController],
      providers: [
        { provide: AdClickService, useValue: (clicks = new AdClickService(prisma as any, new InMemoryTrackCounters())) },
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
    agePageView();
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

  it("a second WhatsApp tap in the same visit gets its own row; ref/eventId clashes answer the same 200 {ok:true} and change nothing", async () => {
    await post(ev());
    await post(lead());
    expect((await post(lead({ ref: "ABCD23" }))).status).toBe(200);
    expect(prisma.tables.adClick).toHaveLength(2);
    expect(prisma.tables.adClick.every((r: any) => r.visitId === VISIT)).toBe(true);
    const before = JSON.stringify(prisma.tables);
    const sameRef = await post(lead({ eventId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" })); // same ref, other eventId
    const first = prisma.tables.adClick[0].eventId;
    const sameEvent = await post(lead({ ref: "WXYZ23", eventId: first })); // eventId used by another ref
    for (const res of [sameRef, sameEvent]) {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }
    expect(JSON.stringify(prisma.tables)).toBe(before);
    expect(prisma.tables.adClick).toHaveLength(2);
  });

  it("a code clash looks exactly like a fresh code (no enumeration) and the server log never holds the input", async () => {
    const warn = jest.spyOn((app.get(PublicTrackController) as any).logger, "warn").mockImplementation(() => undefined);
    await post(lead({ ref: "K7QM2X" }));
    const fresh = await post(lead({ ref: "QQQQ22", visitId: "aaaaaaaa-bbbb-4ccc-8ddd-000000000001" }));
    const clash = await post(lead({ ref: "K7QM2X", visitId: "aaaaaaaa-bbbb-4ccc-8ddd-000000000002" }));
    expect(clash.status).toBe(fresh.status);
    expect(clash.text).toBe(fresh.text);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/K7QM2X|aaaaaaaa/);
    warn.mockRestore();
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

  describe("page URL origin filter", () => {
    it("keeps the page URL of an allowed landing page; another origin is not stored and Meta gets LANDING_PAGE_URL", async () => {
      await post(ev());
      expect(prisma.tables.adClick[0].pageUrl).toContain("https://link.monomiagency.com/");
      const other = "aaaaaaaa-bbbb-4ccc-8ddd-00000000aaaa";
      await post(ev({ visitId: other, pageUrl: "https://evil.example.com/123456789/register?x=1" }));
      const row: any = prisma.tables.adClick.find((r: any) => r.visitId === other);
      expect(row.pageUrl).toBeNull();
      await sender.flushVisitEvents();
      const sent = graph.calls.flatMap((c) => c.body.data);
      const byVisit = (v: string) => sent.find((e: any) => e.user_data.external_id[0] === createHash("sha256").update(v).digest("hex"));
      expect(sent).toHaveLength(2);
      expect(byVisit(VISIT).event_source_url).toContain("https://link.monomiagency.com/?");
      expect(byVisit(other).event_source_url).toBe("https://link.monomiagency.com");
      expect(JSON.stringify(graph.calls)).not.toContain("evil.example.com");
    });

    it("look-alike origins are refused too (suffix, http, credentials)", async () => {
      for (const [i, pageUrl] of [
        "https://link.monomiagency.com.evil.com/",
        "http://link.monomiagency.com/",
        "https://evil.com@link.monomiagency.com.evil.com/",
      ].entries()) {
        await post(ev({ visitId: `aaaaaaaa-bbbb-4ccc-8ddd-00000000000${i}`, pageUrl }));
      }
      expect(prisma.tables.adClick.map((r: any) => r.pageUrl)).toEqual([null, null, null]);
    });
  });

  describe("global new-row cap (PUBLIC_TRACK_MAX_NEW_PER_MIN)", () => {
    it("drops new visits above the cap silently (200 {ok:true}); existing visits still work", async () => {
      const cap = withEnv({ PUBLIC_TRACK_MAX_NEW_PER_MIN: "2" });
      try {
        const ids = ["11111111-0000-4000-8000-000000000001", "11111111-0000-4000-8000-000000000002", "11111111-0000-4000-8000-000000000003"];
        for (const visitId of ids) {
          const res = await post(ev({ visitId }));
          expect(res.status).toBe(200);
          expect(res.body).toEqual({ ok: true });
        }
        expect(prisma.tables.adClick.map((r: any) => r.visitId)).toEqual(ids.slice(0, 2));
        // a new tap row is a new row too: dropped (nothing stored, no Lead)
        const tap = await post(lead({ visitId: ids[2], ref: "CAPP22" }));
        expect(tap.body).toEqual({ ok: true });
        expect(prisma.tables.adClick.some((r: any) => r.ref === "CAPP22")).toBe(false);
        expect(leadRows()).toHaveLength(0);
        // an existing visit row is not new: still updated
        expect((await post(ev({ visitId: ids[0], name: "ViewContent" }))).status).toBe(200);
        expect(prisma.tables.adClick[0].viewContentAt).toBeInstanceOf(Date);
        // a tap that fills the existing visit row needs no new row either
        await post(lead({ visitId: ids[1], ref: "CAPQ22" }));
        expect(prisma.tables.adClick[1].ref).toBe("CAPQ22");
        expect(prisma.tables.adClick).toHaveLength(2);
      } finally {
        cap();
      }
    });

    it("defaults to 600 per minute and ignores a malformed value", () => {
      expect(resolveAdTrackingConfig({ NODE_ENV: "test" } as any).maxNewClicksPerMin).toBe(600);
      const bad = resolveAdTrackingConfig({ NODE_ENV: "test", PUBLIC_TRACK_MAX_NEW_PER_MIN: "-5" } as any);
      expect(bad.maxNewClicksPerMin).toBe(600);
      expect(bad.problems.join(" ")).toContain("PUBLIC_TRACK_MAX_NEW_PER_MIN");
      expect(resolveAdTrackingConfig({ NODE_ENV: "test", PUBLIC_TRACK_MAX_NEW_PER_MIN: "50" } as any).maxNewClicksPerMin).toBe(50);
    });
  });

  describe("click-time Lead gating (stored always, forwarded only when verified)", () => {
    const visit = (i: number) => `22222222-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const refFor = (i: number) => "LD" + "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(i / 32) % 32] + "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[i % 32] + "ZZ";

    it("no PageView before the tap -> SKIPPED (SKIP_UNVERIFIED_VISIT), still stored and linkable", async () => {
      await post(lead());
      expect(prisma.tables.adClick[0]).toMatchObject({ ref: "K7QM2X", visitId: VISIT });
      expect(leadRows()[0]).toMatchObject({ status: "SKIPPED", lastError: SKIP_UNVERIFIED_VISIT });
      expect(await clicks.preview("K7QM2X")).toMatchObject({ ref: "K7QM2X", available: true });
    });

    it("a PageView under 3 s old, or from another network, does not verify the visit", async () => {
      await post(ev({ visitId: visit(1) }));
      await post(lead({ visitId: visit(1), ref: refFor(1) })); // immediately
      await post(ev({ visitId: visit(2) }), { "X-Forwarded-For": "198.51.100.7" });
      agePageView(visit(2));
      await post(lead({ visitId: visit(2), ref: refFor(2) }), { "X-Forwarded-For": "203.0.113.200" });
      expect(leadRows().map((r: any) => r.lastError)).toEqual([SKIP_UNVERIFIED_VISIT, SKIP_UNVERIFIED_VISIT]);
    });

    it("IPv6: a PageView and tap from the same /64 verify the visit", async () => {
      await post(ev({ visitId: visit(3), fbclid: undefined }), { "X-Forwarded-For": "2001:db8:aa:bb::1" });
      agePageView(visit(3));
      await post(lead({ visitId: visit(3), ref: refFor(3), fbclid: undefined }), { "X-Forwarded-For": "2001:db8:aa:bb:ffff::2" });
      expect(leadRows()[0]).toMatchObject({ status: "PENDING_CONFIG", lastError: null });
    });

    it("only the first Lead of a visit is forwarded; the second tap is stored (own row) and SKIPPED", async () => {
      await post(ev());
      agePageView();
      await post(lead());
      await post(lead({ ref: "ABCD23" }));
      expect(prisma.tables.adClick.map((r: any) => r.ref)).toEqual(["K7QM2X", "ABCD23"]);
      expect(leadRows().map((r: any) => [r.status, r.lastError])).toEqual([
        ["PENDING_CONFIG", null],
        ["SKIPPED", SKIP_DUPLICATE_VISIT_LEAD],
      ]);
      expect(await clicks.preview("ABCD23")).toMatchObject({ available: true });
    });

    it("one forwarded Lead per Meta click id (fbc / fbclid) per 24 h; organic visits (no click id) are not refused", async () => {
      for (const i of [10, 11]) {
        await post(ev({ visitId: visit(i), fbclid: "IwAR_same" }));
        agePageView(visit(i));
        await post(lead({ visitId: visit(i), ref: refFor(i), fbclid: "IwAR_same" }));
      }
      for (const i of [12, 13]) {
        await post(ev({ visitId: visit(i), fbclid: undefined }));
        agePageView(visit(i));
        await post(lead({ visitId: visit(i), ref: refFor(i), fbclid: undefined }));
      }
      expect(leadRows().map((r: any) => r.lastError)).toEqual([null, SKIP_DUPLICATE_CLICK_ID, null, null]);
      // the visit claim of the refused Lead was released (a later verified tap of that visit may still go)
      expect(prisma.tables.adClick.find((r: any) => r.visitId === visit(11))!.leadForwardedAt).toBeNull();
    });

    it(`caps forwarded Leads at ${LEAD_IP_CAP_PER_HOUR} per network per hour (IPv6 grouped by /64)`, async () => {
      const n = LEAD_IP_CAP_PER_HOUR + 2;
      for (let i = 0; i < n; i += 1) {
        const ip = `2001:db8:1:2:${(i + 1).toString(16)}::1`; // all in 2001:db8:1:2::/64
        await post(ev({ visitId: visit(100 + i), fbclid: undefined }), { "X-Forwarded-For": ip });
        agePageView(visit(100 + i));
        await post(lead({ visitId: visit(100 + i), ref: refFor(100 + i), fbclid: undefined }), { "X-Forwarded-For": ip });
      }
      const st = leadRows().map((r: any) => r.lastError);
      expect(st.slice(0, LEAD_IP_CAP_PER_HOUR).every((x: any) => x === null)).toBe(true);
      expect(st.slice(LEAD_IP_CAP_PER_HOUR)).toEqual([SKIP_IP_LEAD_CAP, SKIP_IP_LEAD_CAP]);
      expect(prisma.tables.adClick.filter((r: any) => r.ref)).toHaveLength(n); // all stored
      // another network is not affected
      await post(ev({ visitId: visit(999), fbclid: undefined }), { "X-Forwarded-For": "2001:db8:1:3::1" });
      agePageView(visit(999));
      await post(lead({ visitId: visit(999), ref: refFor(999), fbclid: undefined }), { "X-Forwarded-For": "2001:db8:1:3::1" });
      expect(leadRows()[n].lastError).toBeNull();
    });
  });

  describe("race safety", () => {
    const parse = (b: Record<string, unknown>) => parseTrackEvent(JSON.stringify(b))!;
    const ctx = { ip: "127.0.0.1", userAgent: UA };

    it("concurrent first events of a visit create exactly one visit row", async () => {
      const results = await Promise.all([
        clicks.recordEvent(parse(ev()), ctx),
        clicks.recordEvent(parse(ev({ name: "ViewContent" })), ctx),
        clicks.recordEvent(parse(ev({ name: "EngagedVisit" })), ctx),
      ]);
      expect(prisma.tables.adClick).toHaveLength(1);
      expect(prisma.tables.adClick[0].visitKey).toBe(VISIT);
      expect(results.map((r) => r.outcome)).toEqual(["ok", "ok", "ok"]);
    });

    it("two concurrent taps of one visit: the visit row takes exactly one code, the other gets its own row", async () => {
      await clicks.recordEvent(parse(ev()), ctx);
      agePageView();
      const [a, b] = await Promise.all([
        clicks.recordEvent(parse(lead({ ref: "RACE22" })), ctx),
        clicks.recordEvent(parse(lead({ ref: "RACE33" })), ctx),
      ]);
      expect([a.outcome, b.outcome]).toEqual(["ok", "ok"]);
      const rows = prisma.tables.adClick;
      expect(rows).toHaveLength(2);
      expect(rows.map((r: any) => r.ref).sort()).toEqual(["RACE22", "RACE33"]);
      expect(rows.filter((r: any) => r.visitKey === VISIT)).toHaveLength(1);
      // exactly one of the two Leads is forwarded
      expect(leadRows().filter((r: any) => r.status === "PENDING_CONFIG")).toHaveLength(1);
      expect(leadRows().filter((r: any) => r.lastError === SKIP_DUPLICATE_VISIT_LEAD)).toHaveLength(1);
    });

    it("the visit row's ref is assigned with a conditional update (ref still null), never overwritten", async () => {
      await clicks.recordEvent(parse(ev()), ctx);
      const spy = jest.spyOn(prisma.adClick, "updateMany");
      await clicks.recordEvent(parse(lead()), ctx);
      expect(spy.mock.calls.some(([args]: any) => args.where.ref === null && args.data.ref === "K7QM2X")).toBe(true);
      // a stale snapshot cannot overwrite: simulate another tap having taken the row
      prisma.tables.adClick[0].ref = "OTHR22";
      prisma.tables.adClick[0].eventId = "other-event-0001";
      await clicks.recordEvent(parse(lead({ ref: "NEWW22" })), ctx);
      expect(prisma.tables.adClick[0].ref).toBe("OTHR22");
      expect(prisma.tables.adClick.find((r: any) => r.ref === "NEWW22")).toBeTruthy();
      spy.mockRestore();
    });
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

describe("POST /event throttling (IPv4 per address, IPv6 per /64)", () => {
  let app: INestApplication;
  let restore: () => void;

  beforeEach(async () => {
    restore = withEnv({ NODE_ENV: "test", META_WEB_CAPI_ENABLED: "false" });
    const prisma = new FakePrisma();
    const mod = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] })],
      controllers: [PublicTrackController],
      providers: [
        { provide: AdClickService, useValue: new AdClickService(prisma as any, new InMemoryTrackCounters()) },
        { provide: WebCapiService, useValue: new WebCapiService(prisma as any, new WhatsAppGraphClient(new FakeGraph().fetch as any)) },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.use(createPublicTrackBody());
    app.setGlobalPrefix("api/v1");
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    restore();
  });

  const hit = (ip: string) =>
    request(app.getHttpServer()).post(URL_PATH).set("X-Forwarded-For", ip).set("Content-Type", "text/plain").send("x");

  it("rotating addresses inside one IPv6 /64 shares one bucket of 120/min; another /64 and IPv4 addresses are separate", async () => {
    for (let i = 0; i < 120; i += 1) {
      const res = await hit(`2001:db8:5:6:${(i + 1).toString(16)}::${(i + 7).toString(16)}`);
      expect(res.status).toBe(400); // counted, then rejected as invalid
    }
    expect((await hit("2001:0db8:0005:0006:ffff:ffff:ffff:ffff")).status).toBe(429);
    expect((await hit("2001:db8:5:7::1")).status).toBe(400);
    expect((await hit("198.51.100.1")).status).toBe(400);
    expect((await hit("198.51.100.2")).status).toBe(400);
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
