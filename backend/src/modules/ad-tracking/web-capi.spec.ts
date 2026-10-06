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
  SKIP_WEB_TOO_OLD,
  splitName,
  webSkipReason,
} from "./web-capi.payload";
import { WebCapiService } from "./web-capi.service";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { CAPI_MAX_ATTEMPTS } from "../whatsapp/meta-capi.service";
import { FakeGraph, FakePrisma, withEnv } from "../whatsapp/testing/whatsapp-fakes.helper-spec";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const PIXEL = "28492116573772457";
const TOKEN = "EAAGm0PX4ZCpsBO7Zxk9QwLrN2vTb8YhJcUdFeGaIiKoMlPqRsStUuVvWwXxYyZz";
const MIN = 60_000;
const DAY = 86_400_000;

const click = {
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
      external_id: [sha("lead_1")],
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
    expect(stored.user_data_fields).toEqual(["client_ip_address", "client_user_agent", "fbc", "fbp"]);
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
