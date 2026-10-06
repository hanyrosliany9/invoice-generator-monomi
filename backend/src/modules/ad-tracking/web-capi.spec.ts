import { createHash } from "crypto";
import { resolveAdTrackingConfig } from "./ad-tracking.config";
import {
  buildWebEvent,
  normalizeNameToken,
  normalizePhoneForMeta,
  redactEventForStorage,
  SKIP_WEB_HAS_CTWA,
  SKIP_WEB_LEAD_AT_CLICK,
  SKIP_WEB_NO_CLICK,
  SKIP_STALE_BEFORE_ENABLE,
  SKIP_WEB_TOO_OLD,
  splitName,
  USER_AGENT_MAX,
  webSkipReason,
} from "./web-capi.payload";
import { VISIT_QUEUE_MAX, WEB_CAPI_MAX_BATCH, WebCapiService } from "./web-capi.service";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { CAPI_MAX_ATTEMPTS } from "../whatsapp/meta-capi.service";
import { FakeGraph, FakePrisma, withEnv } from "../whatsapp/testing/whatsapp-fakes.helper-spec";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const PIXEL = "28492116573772457";
const TOKEN = "EAAGm0PX4ZCpsBO7Zxk9QwLrN2vTb8YhJcUdFeGaIiKoMlPqRsStUuVvWwXxYyZz";
const MIN = 60_000;
const DAY = 86_400_000;

const VISIT = "0b6f3b0e-52a2-4f0e-8a54-1c1f0f0b6c11";
const click = {
  visitId: VISIT,
  pageUrl: "https://link.monomiagency.com/?utm_campaign=FB-OKT1",
  fbc: "fb.1.1759900000000.IwAR3abc",
  fbp: "fb.1.1759900000000.1234567890",
  clientIp: "203.0.113.9",
  userAgent: "Mozilla/5.0 (Linux; Android 14)",
  campaignCode: "FB-OKT1",
};

describe("phone / name normalisation for Meta", () => {
  it.each([
    ["081234567890", "6281234567890"],
    ["0812-3456-7890", "6281234567890"],
    ["+6281234567890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["0062 812 3456 7890", "6281234567890"],
    ["(+62) 812-3456-7890", "6281234567890"],
  ])("%s -> %s (digits only, country code, no +, no leading 0)", (input, out) => {
    expect(normalizePhoneForMeta(input)).toBe(out);
  });

  it("returns null for junk", () => {
    expect(normalizePhoneForMeta(null)).toBeNull();
    expect(normalizePhoneForMeta("")).toBeNull();
    expect(normalizePhoneForMeta("12345")).toBeNull();
    expect(normalizePhoneForMeta("call me")).toBeNull();
  });

  it("lower-cases names and drops punctuation; skips names without letters", () => {
    expect(normalizeNameToken("O'Brien-Smith")).toBe("obriensmith");
    expect(normalizeNameToken("Ånders")).toBe("ånders");
    expect(splitName("Budi Santoso")).toEqual({ fn: "budi", ln: "santoso" });
    expect(splitName("  Siti  Nur  Aini, S.Kom ")).toEqual({ fn: "siti", ln: "skom" });
    expect(splitName("Rina")).toEqual({ fn: "rina", ln: null });
    expect(splitName("+6281234567890")).toEqual({ fn: null, ln: null });
    expect(splitName(null)).toEqual({ fn: null, ln: null });
  });
});

describe("buildWebEvent", () => {
  const eventTime = new Date("2026-10-07T03:00:00.000Z");

  it("every event carries external_id = SHA-256(visitId); stage events add the lead id hash", () => {
    const pv: any = buildWebEvent({ eventName: "PageView", eventTime, eventId: "e1" }, click, null);
    expect(pv.user_data.external_id).toEqual([sha(VISIT)]);
    expect(pv.user_data.ph).toBeUndefined();
    const noVisit: any = buildWebEvent({ eventName: "PageView", eventTime, eventId: "e1" }, { ...click, visitId: null }, null);
    expect(noVisit.user_data.external_id).toBeUndefined();
  });

  it("click-time Lead: website source, technical fields in clear, no personal data", () => {
    const ev = buildWebEvent(
      { eventName: "Lead", eventTime, eventId: "3f6b8c1e-2d4a-4f60-9a51-0c8d7e5b1a22" },
      click,
      null,
    );
    expect(ev).toEqual({
      event_name: "Lead",
      event_time: Math.floor(eventTime.getTime() / 1000),
      event_id: "3f6b8c1e-2d4a-4f60-9a51-0c8d7e5b1a22",
      action_source: "website",
      event_source_url: click.pageUrl,
      user_data: {
        client_ip_address: "203.0.113.9",
        client_user_agent: click.userAgent,
        fbc: click.fbc,
        fbp: click.fbp,
        external_id: [sha(VISIT)],
      },
      custom_data: { campaign_code: "FB-OKT1" },
    });
  });

  it("QualifiedLead: adds hashed ph / fn / ln / country / external_id (08.. -> 628..)", () => {
    const ev: any = buildWebEvent(
      { eventName: "QualifiedLead", eventTime, eventId: "row1" },
      click,
      { id: "lead_1", name: "Budi Santoso", phone: "+6281234567890" },
    );
    expect(ev.action_source).toBe("website");
    expect(ev.event_id).toBe("row1");
    expect(ev.user_data).toMatchObject({
      client_ip_address: "203.0.113.9",
      fbc: click.fbc,
      fbp: click.fbp,
      ph: [sha("6281234567890")],
      fn: [sha("budi")],
      ln: [sha("santoso")],
      country: [sha("id")],
      // the visit hash ties the stage event to the visit's PageView ... Lead events
      external_id: [sha(VISIT), sha("lead_1")],
    });
    // no raw personal data anywhere in the event
    const json = JSON.stringify(ev);
    expect(json).not.toContain("6281234567890");
    expect(json).not.toContain("Budi");
    expect(ev.custom_data).toEqual({ campaign_code: "FB-OKT1" });
  });

  it("hashes an Indonesian 08.. number the same as its +62 form", () => {
    const a: any = buildWebEvent(
      { eventName: "QualifiedLead", eventTime, eventId: "r" },
      click,
      { id: "l", name: null, phone: "0812-3456-7890" },
    );
    expect(a.user_data.ph).toEqual([sha("6281234567890")]);
    expect(a.user_data.fn).toBeUndefined(); // no name -> no fn/ln
  });

  it("Purchase carries value + IDR; other events never carry a value", () => {
    const buy: any = buildWebEvent(
      { eventName: "Purchase", eventTime, eventId: "r", value: "12500000.00" },
      { ...click, campaignCode: null },
      { id: "l", name: "Rina", phone: null },
    );
    expect(buy.custom_data).toEqual({ value: 12500000, currency: "IDR" });
    expect(buy.user_data.ph).toBeUndefined();
    const qual: any = buildWebEvent(
      { eventName: "QualifiedLead", eventTime, eventId: "r", value: 5 },
      { ...click, campaignCode: null },
      null,
    );
    expect(qual.custom_data).toBeUndefined();
  });

  it("stored copy keeps no ip / user agent / identifiers", () => {
    const ev = buildWebEvent({ eventName: "Lead", eventTime, eventId: "e" }, click, null);
    const stored = redactEventForStorage(ev);
    expect(JSON.stringify(stored)).not.toContain("203.0.113.9");
    expect(JSON.stringify(stored)).not.toContain(click.fbc);
    expect(stored.user_data_fields).toEqual(["client_ip_address", "client_user_agent", "fbc", "fbp", "external_id"]);
  });
});

describe("webSkipReason", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  const row = (over: Record<string, any> = {}) => ({
    eventName: "QualifiedLead",
    eventTime: new Date(now.getTime() - MIN),
    adClick: { id: "c1" },
    lead: { ctwaClid: null },
    ...over,
  });

  it("sendable when a click is linked and the event is fresh", () => {
    expect(webSkipReason(row(), now)).toBeNull();
  });
  it("skips events older than 7 days (Meta rejects them)", () => {
    expect(webSkipReason(row({ eventTime: new Date(now.getTime() - 6 * DAY) }), now)).toBeNull();
    expect(webSkipReason(row({ eventTime: new Date(now.getTime() - 7 * DAY - 1000) }), now)).toBe(SKIP_WEB_TOO_OLD);
  });
  it("skips rows without a click, LeadSubmitted, and leads that have a ctwa_clid", () => {
    expect(webSkipReason(row({ adClick: null }), now)).toBe(SKIP_WEB_NO_CLICK);
    expect(webSkipReason(row({ eventName: "LeadSubmitted" }), now)).toBe(SKIP_WEB_LEAD_AT_CLICK);
    expect(webSkipReason(row({ lead: { ctwaClid: "ARA" } }), now)).toBe(SKIP_WEB_HAS_CTWA);
  });
});

describe("ad tracking config states", () => {
  const base = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
  it("OFF by default, never throws", () => {
    const c = resolveAdTrackingConfig({ ...base });
    expect(c.state).toBe("OFF");
    expect(c.allowedOrigins).toEqual(["https://link.monomiagency.com"]);
    expect(c.landingPageUrl).toBe("https://link.monomiagency.com");
  });
  it("INCOMPLETE / INVALID / READY", () => {
    expect(resolveAdTrackingConfig({ ...base, META_WEB_CAPI_ENABLED: "true" }).state).toBe("INCOMPLETE");
    expect(
      resolveAdTrackingConfig({ ...base, META_WEB_CAPI_ENABLED: "true", META_PIXEL_ID: "abc", META_WEB_CAPI_TOKEN: TOKEN }).state,
    ).toBe("INVALID");
    expect(
      resolveAdTrackingConfig({ ...base, META_WEB_CAPI_ENABLED: "true", META_PIXEL_ID: PIXEL, META_WEB_CAPI_TOKEN: "your_token_here" }).state,
    ).toBe("INVALID");
    const ok = resolveAdTrackingConfig({ ...base, META_WEB_CAPI_ENABLED: "true", META_PIXEL_ID: PIXEL, META_WEB_CAPI_TOKEN: TOKEN });
    expect(ok.state).toBe("READY");
    expect(ok.problems).toEqual([]);
  });
  it("problems never contain secret values", () => {
    const c = resolveAdTrackingConfig({ ...base, META_WEB_CAPI_ENABLED: "true", META_PIXEL_ID: "abc", META_WEB_CAPI_TOKEN: "short" });
    expect(JSON.stringify(c.problems)).not.toContain("short");
  });
  it("origin list: named https sites only; '*' refused; localhost only outside production", () => {
    const c = resolveAdTrackingConfig({
      ...base,
      PUBLIC_TRACK_ALLOWED_ORIGINS: "https://a.example.com/path, *, javascript:alert(1), http://b.example.com",
      NODE_ENV: "production",
    });
    expect(c.allowedOrigins).toEqual(["https://a.example.com"]);
    expect(c.allowLocalhost).toBe(false);
    expect(c.problems.length).toBe(3);
    expect(resolveAdTrackingConfig({ ...base }).allowLocalhost).toBe(true);
  });
  it("ignores the fake Graph URL in production", () => {
    const dev = resolveAdTrackingConfig({ ...base, META_WEB_CAPI_GRAPH_BASE_URL: "http://127.0.0.1:5499" });
    expect(dev.graphBaseUrl).toBe("http://127.0.0.1:5499");
    const prod = resolveAdTrackingConfig({ ...base, NODE_ENV: "production", META_WEB_CAPI_GRAPH_BASE_URL: "http://127.0.0.1:5499" });
    expect(prod.graphBaseUrl).toBe("https://graph.facebook.com");
  });
});

describe("WebCapiService (website route sender)", () => {
  let restore: () => void = () => undefined;
  const enable = (extra: Record<string, string> = {}) => {
    restore = withEnv({
      NODE_ENV: "test",
      META_WEB_CAPI_ENABLED: "true",
      META_PIXEL_ID: PIXEL,
      META_WEB_CAPI_TOKEN: TOKEN,
      META_WEB_CAPI_TEST_EVENT_CODE: undefined,
      META_WEB_CAPI_GRAPH_BASE_URL: undefined,
      ...extra,
    });
  };
  afterEach(() => restore());

  function setup(rows: Array<Record<string, any>>, leads: any[] = [], clicks?: any[]) {
    const now = Date.now();
    const prisma = new FakePrisma({
      lead: leads,
      adClick: clicks ?? [{ id: "c1", ref: "K7QM2X", eventId: "evt-click-1", ...click, createdAt: new Date(now - 5 * MIN), leadId: "L1" }],
      metaEventOutbox: rows.map((r, i) => ({
        id: `ev${i + 1}`,
        leadId: "L1",
        route: "WEBSITE",
        adClickId: "c1",
        eventName: "QualifiedLead",
        eventTime: new Date(now - 10 * MIN),
        value: null,
        currency: "IDR",
        status: "PENDING_CONFIG",
        payload: {},
        attempts: 0,
        nextTryAt: null,
        createdAt: new Date(now - (rows.length - i) * 1000),
        ...r,
      })),
    });
    const graph = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({
      json: { events_received: c.body.data.length, messages: [], fbtrace_id: "Atrace1" },
    }));
    const svc = new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any));
    return { prisma, graph, svc, t: prisma.tables };
  }
  const L1 = { id: "L1", name: "Budi Santoso", phone: "+6281234567890", ctwaClid: null };

  it("does nothing (rows stay PENDING_CONFIG) unless the config is READY", async () => {
    restore = withEnv({ META_WEB_CAPI_ENABLED: undefined, META_PIXEL_ID: PIXEL, META_WEB_CAPI_TOKEN: TOKEN });
    const { svc, graph, t } = setup([{}], [L1]);
    const r = await svc.run();
    expect(r.enabled).toBe(false);
    expect(graph.calls).toHaveLength(0);
    expect(t.metaEventOutbox[0].status).toBe("PENDING_CONFIG");
  });

  it("sends one request per event with the exact website payload; token only in the header", async () => {
    enable();
    const { svc, graph, t } = setup(
      [
        { eventName: "Lead", leadId: null },
        { eventName: "QualifiedLead" },
        { eventName: "Purchase", value: 9000000 },
      ],
      [L1],
    );
    const r = await svc.run();
    expect(r).toMatchObject({ enabled: true, queued: 3, sent: 3, failed: 0, skipped: 0 });
    expect(graph.calls).toHaveLength(3); // one event per request
    for (const c of graph.calls) {
      expect(c.body.data).toHaveLength(1);
      expect(c.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      expect(c.url).not.toContain(TOKEN);
      expect(JSON.stringify(c.body)).not.toContain(TOKEN);
      expect(c.body.data[0].action_source).toBe("website");
    }
    const byName = Object.fromEntries(graph.calls.map((c) => [c.body.data[0].event_name, c.body.data[0]]));
    // Lead dedups with the browser Pixel through the click's eventId
    expect(byName.Lead.event_id).toBe("evt-click-1");
    expect(byName.Lead.user_data.ph).toBeUndefined();
    expect(byName.QualifiedLead.event_id).toBe("ev2");
    expect(byName.QualifiedLead.user_data.ph).toEqual([sha("6281234567890")]);
    expect(byName.Purchase.custom_data).toMatchObject({ value: 9000000, currency: "IDR" });
    expect(t.metaEventOutbox.every((x: any) => x.status === "SENT" && x.inFlightAt == null)).toBe(true);
    // stored payload keeps no ip / identifiers
    expect(JSON.stringify(t.metaEventOutbox[1].payload)).not.toContain("203.0.113.9");
    expect(t.metaEventOutbox[1].response).toMatchObject({ events_received: 1, fbtrace_id: "Atrace1" });
  });

  it("adds test_event_code when configured", async () => {
    enable({ META_WEB_CAPI_TEST_EVENT_CODE: "TEST123" });
    const { svc, graph } = setup([{}], [L1]);
    await svc.run();
    expect(graph.calls[0].body.test_event_code).toBe("TEST123");
  });

  it("marks stale (>7 days) events SKIPPED with a clear reason and still sends the fresh ones", async () => {
    enable();
    const { svc, graph, t } = setup(
      [{ eventTime: new Date(Date.now() - 8 * DAY) }, { eventName: "Purchase", value: 1 }],
      [L1],
    );
    const r = await svc.run();
    expect(r).toMatchObject({ skipped: 1, sent: 1 });
    expect(graph.calls).toHaveLength(1);
    expect(t.metaEventOutbox[0]).toMatchObject({ status: "SKIPPED", lastError: SKIP_WEB_TOO_OLD });
    expect(t.metaEventOutbox[1].status).toBe("SENT");
  });

  it("never double-sends: ctwa leads, LeadSubmitted and click-less rows are skipped", async () => {
    enable();
    const { svc, graph, t } = setup(
      [{ eventName: "QualifiedLead" }, { eventName: "LeadSubmitted" }, { eventName: "Purchase", adClickId: null }],
      [{ ...L1, ctwaClid: "ARAclid" }],
      [{ id: "c1", ref: "K7QM2X", eventId: "e", ...click, createdAt: new Date() }],
    );
    const r = await svc.run();
    expect(r.sent).toBe(0);
    expect(graph.calls).toHaveLength(0);
    expect(t.metaEventOutbox.map((x: any) => x.status)).toEqual(["SKIPPED", "SKIPPED", "SKIPPED"]);
    expect(t.metaEventOutbox[0].lastError).toBe(SKIP_WEB_HAS_CTWA);
    expect(t.metaEventOutbox[1].lastError).toBe(SKIP_WEB_LEAD_AT_CLICK);
  });

  it("does not touch business-messaging rows", async () => {
    enable();
    const { svc, graph, t } = setup([{ route: "BUSINESS_MESSAGING", adClickId: null }], [L1]);
    await svc.run();
    expect(graph.calls).toHaveLength(0);
    expect(t.metaEventOutbox[0].status).toBe("PENDING_CONFIG");
  });

  it("retries transient failures with the same event_id, then FAILED after max attempts; invalid_param fails at once", async () => {
    enable();
    const { svc, graph, t, prisma } = setup([{}, { eventName: "Purchase", value: 5 }], [L1]);
    graph.routes = [];
    graph.on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) =>
      c.body.data[0].event_name === "Purchase"
        ? { status: 400, json: { error: { message: "Invalid parameter", code: 100, type: "OAuthException" } } }
        : { status: 503, json: { error: { message: "temporarily unavailable", code: 2, type: "OAuthException" } } },
    );
    const t0 = new Date();
    let r = await svc.run(t0);
    expect(r).toMatchObject({ retrying: 1, failed: 1, sent: 0 });
    expect(t.metaEventOutbox[0]).toMatchObject({ status: "QUEUED", attempts: 1, inFlightAt: null });
    expect(t.metaEventOutbox[0].nextTryAt.getTime()).toBeGreaterThan(t0.getTime());
    expect(t.metaEventOutbox[1].status).toBe("FAILED");
    // not due yet -> nothing is sent
    const calls = graph.calls.length;
    await svc.run(t0);
    expect(graph.calls.length).toBe(calls);
    // keep retrying until the cap
    let when = t0.getTime();
    for (let i = 1; i < CAPI_MAX_ATTEMPTS; i += 1) {
      when += 7 * 3600_000;
      r = await svc.run(new Date(when));
    }
    expect(t.metaEventOutbox[0].status).toBe("FAILED");
    expect(t.metaEventOutbox[0].attempts).toBe(CAPI_MAX_ATTEMPTS);
    const ids = new Set(graph.calls.filter((c) => c.body.data[0].event_name === "QualifiedLead").map((c) => c.body.data[0].event_id));
    expect(ids).toEqual(new Set(["ev1"])); // same event_id every attempt
    void prisma;
  });
});


describe("WebCapiService visit-event batches", () => {
  const restore: Array<() => void> = [];
  afterEach(() => restore.splice(0).forEach((r) => r()));
  const enable = () =>
    restore.push(withEnv({ NODE_ENV: "test", META_WEB_CAPI_ENABLED: "true", META_PIXEL_ID: PIXEL, META_WEB_CAPI_TOKEN: TOKEN, META_WEB_CAPI_TEST_EVENT_CODE: undefined, META_WEB_CAPI_GRAPH_BASE_URL: undefined }));
  const build = (graph: FakeGraph) => new WebCapiService(new FakePrisma() as any, new WhatsAppGraphClient(graph.fetch as any));
  const visit = (i: number, age = 0) => ({
    name: "PageView" as const,
    eventId: `evt-${i}-0000`,
    eventTime: new Date(Date.now() - age),
    click: { ...click, visitId: `visit-${i}-00000000` },
  });
  const okGraph = () =>
    new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({ json: { events_received: c.body.data.length, fbtrace_id: "T" } }));

  it("sends at most 1000 events per request", async () => {
    enable();
    const graph = okGraph();
    const svc = build(graph);
    for (let i = 0; i < 2500; i += 1) expect(svc.enqueueVisitEvent(visit(i))).toBe(true);
    const r = await svc.flushVisitEvents();
    expect(r).toMatchObject({ sent: 2500, requests: 3, stale: 0 });
    expect(graph.calls.map((c) => c.body.data.length)).toEqual([1000, 1000, 500]);
    expect(WEB_CAPI_MAX_BATCH).toBe(1000);
    expect(svc.queuedVisitEvents).toBe(0);
    const e = graph.calls[0].body.data[0];
    expect(e).toMatchObject({ event_name: "PageView", action_source: "website", event_id: "evt-0-0000" });
    expect(e.user_data.external_id).toEqual([sha("visit-0-00000000")]);
    expect(graph.calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("filters out events older than 7 days so one stale event cannot fail the request", async () => {
    enable();
    const graph = okGraph();
    const svc = build(graph);
    svc.enqueueVisitEvent(visit(1, 8 * DAY));
    svc.enqueueVisitEvent(visit(2, 1000));
    svc.enqueueVisitEvent(visit(3, 7 * DAY + 5000));
    const r = await svc.flushVisitEvents();
    expect(r).toMatchObject({ sent: 1, stale: 2, requests: 1 });
    expect(graph.calls[0].body.data.map((x: any) => x.event_id)).toEqual(["evt-2-0000"]);
  });

  it("does not queue or send unless READY; adds test_event_code when set", async () => {
    restore.push(withEnv({ META_WEB_CAPI_ENABLED: undefined }));
    const g = okGraph();
    const off = build(g);
    expect(off.enqueueVisitEvent(visit(1))).toBe(false);
    expect((await off.flushVisitEvents()).requests).toBe(0);
    restore.splice(0).forEach((r) => r());
    enable();
    restore.push(withEnv({ META_WEB_CAPI_TEST_EVENT_CODE: "TEST9" }));
    const g2 = okGraph();
    const on = build(g2);
    on.enqueueVisitEvent(visit(1));
    await on.flushVisitEvents();
    expect(g2.calls[0].body.test_event_code).toBe("TEST9");
  });

  it("retries a transient failure with the same event ids, then drops after the attempt cap; invalid_param drops at once", async () => {
    enable();
    const bad = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), () => ({ status: 503, json: { error: { message: "temporarily unavailable", code: 2, type: "OAuthException" } } }));
    const svc = build(bad);
    svc.enqueueVisitEvent(visit(1));
    expect((await svc.flushVisitEvents()).retrying).toBe(1);
    expect((await svc.flushVisitEvents()).retrying).toBe(1);
    const last = await svc.flushVisitEvents();
    expect(last.dropped).toBe(1);
    expect(svc.queuedVisitEvents).toBe(0);
    expect(new Set(bad.calls.map((c) => c.body.data[0].event_id))).toEqual(new Set(["evt-1-0000"]));

    const invalid = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), () => ({ status: 400, json: { error: { message: "Invalid parameter", code: 100, type: "OAuthException" } } }));
    const s2 = build(invalid);
    s2.enqueueVisitEvent(visit(1));
    expect((await s2.flushVisitEvents()).dropped).toBe(1);
    expect(s2.queuedVisitEvents).toBe(0);
  });

  it("bounds the in-memory queue", () => {
    enable();
    const svc = build(okGraph());
    for (let i = 0; i < VISIT_QUEUE_MAX; i += 1) svc.enqueueVisitEvent(visit(i));
    expect(svc.enqueueVisitEvent(visit(99999))).toBe(false);
  });
});

// A user agent that IS a Graph path: the shared denylist refuses any request
// carrying it ("register" segment), so it must never poison other events.
const POISON_UA = "123456789/register";

describe("Graph denylist + page URL hardening (website sender)", () => {
  const restore: Array<() => void> = [];
  afterEach(() => restore.splice(0).forEach((r) => r()));
  const enable = (extra: Record<string, string | undefined> = {}) =>
    restore.push(
      withEnv({
        NODE_ENV: "test",
        META_WEB_CAPI_ENABLED: "true",
        META_PIXEL_ID: PIXEL,
        META_WEB_CAPI_TOKEN: TOKEN,
        META_WEB_CAPI_TEST_EVENT_CODE: undefined,
        META_WEB_CAPI_GRAPH_BASE_URL: undefined,
        LANDING_PAGE_URL: undefined,
        PUBLIC_TRACK_ALLOWED_ORIGINS: undefined,
        ...extra,
      }),
    );
  const okGraph = () =>
    new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({ json: { events_received: c.body.data.length, fbtrace_id: "T" } }));
  const visit = (i: number, over: Record<string, unknown> = {}) => ({
    name: "PageView" as const,
    eventId: `evt-${i}-0000`,
    eventTime: new Date(),
    click: { ...click, visitId: `visit-${i}-00000000`, ...over },
  });

  it("a visit event that fails the denylist is dropped at enqueue; the batch with the others is still sent", async () => {
    enable();
    const graph = okGraph();
    const svc = new WebCapiService(new FakePrisma() as any, new WhatsAppGraphClient(graph.fetch as any));
    expect(svc.enqueueVisitEvent(visit(1))).toBe(true);
    expect(svc.enqueueVisitEvent(visit(2, { userAgent: POISON_UA }))).toBe(false);
    expect(svc.enqueueVisitEvent(visit(3))).toBe(true);
    const r = await svc.flushVisitEvents();
    expect(r).toMatchObject({ sent: 2, requests: 1, retrying: 0 });
    expect(graph.calls[0].body.data.map((e: any) => e.event_id)).toEqual(["evt-1-0000", "evt-3-0000"]);
  });

  it("if a poisoned event reaches a batch anyway, ForbiddenGraphEndpointError is permanent: it is dropped (never retried) and the rest go out in the same flush", async () => {
    enable();
    const graph = okGraph();
    const svc = new WebCapiService(new FakePrisma() as any, new WhatsAppGraphClient(graph.fetch as any));
    svc.enqueueVisitEvent(visit(1));
    svc.enqueueVisitEvent(visit(3));
    const poisoned = buildWebEvent({ eventName: "PageView", eventTime: new Date(), eventId: "evt-2-0000" }, { ...click, userAgent: POISON_UA }, null);
    (svc as any).visitQueue.splice(1, 0, { event: poisoned, eventTime: new Date(), attempts: 0 });
    const r = await svc.flushVisitEvents();
    expect(r).toMatchObject({ sent: 2, dropped: 1, retrying: 0 });
    expect(svc.queuedVisitEvents).toBe(0);
    expect(graph.calls).toHaveLength(1); // the refused request never left the process
    expect(graph.calls[0].body.data.map((e: any) => e.event_id)).toEqual(["evt-1-0000", "evt-3-0000"]);
  });

  it("outbox path: a denylisted event is FAILED at once (no retry, no request); other rows are sent", async () => {
    enable();
    const graph = okGraph();
    const now = Date.now();
    const prisma = new FakePrisma({
      lead: [{ id: "L1", name: "Budi", phone: "+6281234567890", ctwaClid: null }],
      adClick: [
        { id: "bad", ref: "K7QM2X", eventId: "evt-bad-1", ...click, userAgent: POISON_UA, createdAt: new Date(now - MIN), leadId: null },
        { id: "good", ref: "ABCD23", eventId: "evt-good-1", ...click, createdAt: new Date(now - MIN), leadId: "L1" },
      ],
      metaEventOutbox: [
        { id: "o1", leadId: null, route: "WEBSITE", adClickId: "bad", eventName: "Lead", eventTime: new Date(now - MIN), status: "QUEUED", payload: {}, attempts: 0, nextTryAt: null, createdAt: new Date(now - MIN) },
        { id: "o2", leadId: "L1", route: "WEBSITE", adClickId: "good", eventName: "QualifiedLead", eventTime: new Date(now - MIN), status: "QUEUED", payload: {}, attempts: 0, nextTryAt: null, createdAt: new Date(now - MIN) },
      ],
    });
    const svc = new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any));
    const r = await svc.run();
    expect(r).toMatchObject({ failed: 1, sent: 1, retrying: 0 });
    const o1: any = prisma.tables.metaEventOutbox.find((x: any) => x.id === "o1");
    expect(o1).toMatchObject({ status: "FAILED", attempts: 1, nextTryAt: null, inFlightAt: null });
    expect(o1.lastError).toMatch(/Blocked Graph API call/);
    expect(graph.calls).toHaveLength(1);
    expect(graph.calls[0].body.data[0].event_name).toBe("QualifiedLead");
  });

  it("a stored page URL from another origin is never forwarded: Meta gets LANDING_PAGE_URL", async () => {
    enable({ LANDING_PAGE_URL: "https://lp.monomiagency.com/promo" });
    const graph = okGraph();
    const now = Date.now();
    const prisma = new FakePrisma({
      adClick: [{ id: "c1", ref: "K7QM2X", eventId: "evt-click-1", ...click, pageUrl: "https://evil.example.com/x", createdAt: new Date(now - MIN), leadId: null }],
      metaEventOutbox: [
        { id: "o1", leadId: null, route: "WEBSITE", adClickId: "c1", eventName: "Lead", eventTime: new Date(now - MIN), status: "PENDING_CONFIG", payload: {}, attempts: 0, nextTryAt: null, createdAt: new Date(now - MIN) },
      ],
    });
    const svc = new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any));
    await svc.run();
    expect(graph.calls[0].body.data[0].event_source_url).toBe("https://lp.monomiagency.com");
    // and on the visit path
    svc.enqueueVisitEvent(visit(1, { pageUrl: "https://evil.example.com/y" }));
    svc.enqueueVisitEvent(visit(2));
    await svc.flushVisitEvents();
    expect(graph.calls[1].body.data.map((e: any) => e.event_source_url)).toEqual(["https://lp.monomiagency.com", click.pageUrl]);
  });

  it("clamps the user agent sent to Meta", () => {
    const ev: any = buildWebEvent({ eventName: "PageView", eventTime: new Date(), eventId: "e" }, { ...click, userAgent: "Mozilla/5.0 " + "x".repeat(2000) }, null);
    expect(ev.user_data.client_user_agent.length).toBe(USER_AGENT_MAX);
  });
});

describe("WebCapiService lanes and the stale-before-enable rule", () => {
  const restore: Array<() => void> = [];
  afterEach(() => restore.splice(0).forEach((r) => r()));
  const env = (enabled: boolean) =>
    restore.push(
      withEnv({
        NODE_ENV: "test",
        META_WEB_CAPI_ENABLED: enabled ? "true" : undefined,
        META_PIXEL_ID: PIXEL,
        META_WEB_CAPI_TOKEN: TOKEN,
        META_WEB_CAPI_TEST_EVENT_CODE: undefined,
        META_WEB_CAPI_GRAPH_BASE_URL: undefined,
      }),
    );

  function build(rows: any[], clicks: any[]) {
    const prisma = new FakePrisma({
      lead: [{ id: "L1", name: "Budi", phone: "+6281234567890", ctwaClid: null }],
      adClick: clicks,
      metaEventOutbox: rows,
    });
    const graph = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({ json: { events_received: c.body.data.length, fbtrace_id: "T" } }));
    return { prisma, graph, svc: new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any)) };
  }
  const outbox = (id: string, over: Record<string, any>) => ({
    id,
    leadId: null,
    route: "WEBSITE",
    adClickId: "c0",
    eventName: "Lead",
    eventTime: new Date(Date.now() - 30 * MIN),
    status: "QUEUED",
    payload: {},
    attempts: 0,
    nextTryAt: null,
    createdAt: new Date(Date.now() - 30 * MIN),
    ...over,
  });

  it("CRM stage events never wait behind a click-time Lead backlog (stage lane first, Leads interleaved one batch at a time)", async () => {
    env(true);
    const clicks = [{ id: "c0", ref: "K7QM2X", eventId: "evt-c0", ...click, createdAt: new Date(), leadId: "L1" }];
    // 1,200 older Leads: more than one run sends (20 rounds x 50)
    const rows: any[] = [];
    for (let i = 0; i < 1200; i += 1) {
      rows.push(outbox(`lead${i}`, { eventTime: new Date(Date.now() - 60 * MIN + i), createdAt: new Date(Date.now() - 60 * MIN + i) }));
    }
    rows.push(outbox("qual", { leadId: "L1", eventName: "QualifiedLead", eventTime: new Date(Date.now() - MIN), createdAt: new Date(Date.now() - MIN) }));
    rows.push(outbox("buy", { leadId: "L1", eventName: "Purchase", value: 5, status: "PENDING_CONFIG", eventTime: new Date(Date.now() - MIN), createdAt: new Date(Date.now() - MIN) }));
    const { svc, graph, prisma } = build(rows, clicks);
    const r = await svc.run();
    const names = graph.calls.map((c) => c.body.data[0].event_name);
    expect(names.slice(0, 2).sort()).toEqual(["Purchase", "QualifiedLead"]);
    expect(prisma.tables.metaEventOutbox.find((x: any) => x.id === "qual")!.status).toBe("SENT");
    expect(prisma.tables.metaEventOutbox.find((x: any) => x.id === "buy")!.status).toBe("SENT");
    expect(r.sent).toBe(1002); // 2 stage + 20 rounds x 50 Leads; the rest wait for the next run
    expect(prisma.tables.metaEventOutbox.filter((x: any) => x.status === "QUEUED")).toHaveLength(200);
  });

  it("a stage event created during a Lead backlog goes out before the remaining Leads", async () => {
    env(true);
    const clicks = [{ id: "c0", ref: "K7QM2X", eventId: "evt-c0", ...click, createdAt: new Date(), leadId: "L1" }];
    const rows: any[] = [];
    for (let i = 0; i < 120; i += 1) rows.push(outbox(`lead${i}`, { eventTime: new Date(Date.now() - 60 * MIN + i) }));
    const { svc, graph, prisma } = build(rows, clicks);
    let injected = false;
    graph.on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => {
      if (!injected && graph.calls.length === 10) {
        injected = true;
        prisma.tables.metaEventOutbox.push(outbox("late-qual", { leadId: "L1", eventName: "QualifiedLead", eventTime: new Date() }));
      }
      return { json: { events_received: c.body.data.length } };
    });
    await svc.run();
    const order = graph.calls.map((c) => c.body.data[0].event_name);
    // sent right after the current Lead batch (50), not after all 120 Leads
    expect(order.indexOf("QualifiedLead")).toBe(50);
  });

  it("first READY run skips click-time Leads that waited > 24 h as SKIP_STALE_BEFORE_ENABLE; fresh ones and stage events are sent; later READY runs do not skip", async () => {
    env(false);
    const DAYS = (d: number) => new Date(Date.now() - d * DAY);
    const clicks = [{ id: "c0", ref: "K7QM2X", eventId: "evt-c0", ...click, createdAt: DAYS(3), leadId: "L1" }];
    const { svc, graph, prisma } = build(
      [
        outbox("oldLead", { status: "PENDING_CONFIG", eventTime: DAYS(2), createdAt: DAYS(2) }),
        outbox("freshLead", { status: "PENDING_CONFIG", eventTime: DAYS(0.5), createdAt: DAYS(0.5) }),
        outbox("oldStage", { leadId: "L1", eventName: "QualifiedLead", status: "PENDING_CONFIG", eventTime: DAYS(2), createdAt: DAYS(2) }),
      ],
      clicks,
    );
    expect((await svc.run()).enabled).toBe(false); // OFF: nothing touched
    expect(prisma.tables.metaEventOutbox.every((x: any) => x.status === "PENDING_CONFIG")).toBe(true);
    restore.splice(0).forEach((r) => r());
    env(true);
    await svc.run(); // OFF -> READY
    const by = (id: string): any => prisma.tables.metaEventOutbox.find((x: any) => x.id === id);
    expect(by("oldLead")).toMatchObject({ status: "SKIPPED", lastError: SKIP_STALE_BEFORE_ENABLE });
    expect(by("freshLead").status).toBe("SENT");
    expect(by("oldStage").status).toBe("SENT");
    expect(graph.calls.map((c) => c.body.data[0].event_name).sort()).toEqual(["Lead", "QualifiedLead"]);
    // READY -> READY: no further stale skipping
    prisma.tables.metaEventOutbox.push(outbox("laterOld", { status: "PENDING_CONFIG", eventTime: DAYS(2), createdAt: DAYS(2) }));
    await svc.run();
    expect(by("laterOld").status).toBe("SENT");
  });

  it("a fresh service that boots READY applies the rule on its first run", async () => {
    env(true);
    const clicks = [{ id: "c0", ref: "K7QM2X", eventId: "evt-c0", ...click, createdAt: new Date(), leadId: null }];
    const { svc, prisma } = build([outbox("old", { status: "PENDING_CONFIG", eventTime: new Date(Date.now() - 2 * DAY), createdAt: new Date(Date.now() - 2 * DAY) })], clicks);
    const r = await svc.run();
    expect(r.skipped).toBe(1);
    expect(prisma.tables.metaEventOutbox[0]).toMatchObject({ status: "SKIPPED", lastError: SKIP_STALE_BEFORE_ENABLE });
  });
});
