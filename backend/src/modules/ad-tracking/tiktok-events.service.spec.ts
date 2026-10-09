import { Logger } from "@nestjs/common";
import { CrmFlowService } from "../crm/crm-flow.service";
import { CrmLeadsService } from "../crm/crm-leads.service";
import { CrmOutboxService } from "../crm/crm-outbox.service";
import { FakePrisma, withEnv } from "../whatsapp/testing/whatsapp-fakes.helper-spec";
import { AdClickService } from "./ad-click.service";
import { AutoLeadService } from "./auto-lead.service";
import { parseTrackEvent } from "./track-event.payload";
import { InMemoryTrackCounters } from "./track-limits";
import { TikTokApiError, TikTokEventsService, TikTokHttp } from "./tiktok-events.service";
import { SKIP_META_ATTRIBUTED_TIKTOK } from "./tiktok-events.payload";
import { WebCapiService } from "./web-capi.service";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { FakeGraph } from "../whatsapp/testing/whatsapp-fakes.helper-spec";
import { sha256 } from "./web-capi.payload";

const PIXEL = "CABC1234567890XYZ";
const TOKEN = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const TTCLID = "E.C.P.v3fQ2RHacdksKfofPmlyuStIIHJ4Af1tKYxF9zz2c2PLx1Oaw15oHpcfl5AH";
const LANDING = "https://link.monomiagency.com";
const TT_URL = `${LANDING}/?utm_source=tiktok&utm_medium=paid&utm_campaign=1234567890123456789&ttclid=${TTCLID}`;
const META_URL = `${LANDING}/?utm_source=facebook&utm_medium=paid&utm_campaign=fb-okt1&fbclid=IwAR1`;
const DIRECT_URL = `${LANDING}/`;
const DAY = 86_400_000;

const STAGES = [
  { id: "st-new", key: "NEW", name: "New", order: 1, type: "OPEN", isActive: true, metaEvent: null },
  { id: "st-qual", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN", isActive: true, metaEvent: "QualifiedLead" },
  { id: "st-won", key: "WON", name: "Won", order: 5, type: "WON", isActive: true, metaEvent: "Purchase" },
  { id: "st-lost", key: "LOST", name: "Lost", order: 6, type: "LOST", isActive: true, metaEvent: null },
];
const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const refFor = (i: number) => `T${ALPHA[Math.floor(i / 32) % 32]}${ALPHA[i % 32]}ZZZ`;
const visitFor = (i: number) => `44444444-0000-4000-8000-${String(i).padStart(12, "0")}`;
let evtSeq = 0;
const eventId = () => `evt-${String(++evtSeq).padStart(10, "0")}`;

interface TapOpts {
  i: number;
  url?: string;
  /** extra fields of the beacon body (ttclid, fbclid, fbt, ttt, ...) */
  extra?: Record<string, unknown>;
  utm?: Record<string, string>;
  referrer?: string;
}

function setup() {
  const prisma = new FakePrisma({
    leadStage: STAGES.map((s) => ({ ...s })),
    campaign: [{ id: "cmp1", code: "FB-OKT1", name: "Oktober 1", metaAdIds: [] }],
    crmSettings: [{ id: "default", responseThresholdMinutes: 15 }],
    campaignSpend: [],
    metaAdsSyncState: [],
    metaAdsInsightDaily: [],
    invoice: [],
  });
  const counters = new InMemoryTrackCounters();
  const autoLeads = new AutoLeadService(prisma as any, counters);
  const clicks = new AdClickService(prisma as any, counters, autoLeads);
  const outbox = new CrmOutboxService();
  const flow = new CrmFlowService(prisma as any, outbox);
  const settings: any = { getThresholdMinutes: async () => 15 };
  const leads = new CrmLeadsService(prisma as any, flow, outbox, settings, { create: jest.fn() } as any, {} as any, {} as any, clicks, autoLeads);
  const t = prisma.tables as Record<string, any[]>;

  /** PageView (aged for the 3 s rule) then the WhatsApp tap, like the landing page. */
  const tap = async (o: TapOpts) => {
    const ip = `198.51.100.${(o.i % 250) + 1}`;
    const visitId = visitFor(o.i);
    const base = {
      visitId,
      pageUrl: o.url ?? TT_URL,
      utm: o.utm ?? {},
      fbp: "fb.1.1759900000000.1234567890",
      ...(o.referrer ? { referrer: o.referrer } : {}),
      ...(o.extra ?? {}),
    };
    const pv = await clicks.recordEvent(parseTrackEvent(JSON.stringify({ ...base, name: "PageView", eventId: eventId() }))!, { ip, userAgent: UA });
    for (const r of prisma.tables.adClick) {
      if (r.visitId === visitId && r.pageViewAt) r.pageViewAt = new Date(r.pageViewAt.getTime() - 5000);
    }
    const r = await clicks.recordEvent(
      parseTrackEvent(JSON.stringify({ ...base, name: "Lead", eventId: eventId(), ref: refFor(o.i), meta: { instagram: `brand${o.i}` } }))!,
      { ip, userAgent: UA },
    );
    const click: any = prisma.tables.adClick.find((c: any) => c.ref === refFor(o.i));
    return { ...r, pageView: { ...pv, visitEvent: pv.visitEvent! }, ref: refFor(o.i), click };
  };
  return { prisma, t, clicks, autoLeads, outbox, flow, leads, tap };
}

const okHttp = () => {
  const calls: Array<{ url: string; token: string; body: any }> = [];
  const http: TikTokHttp = {
    post: async (url, token, body) => {
      calls.push({ url, token, body });
      return { status: 200, json: { code: 0, message: "OK", request_id: "REQ1", data: {} } };
    },
  };
  return { http, calls };
};
const tt = (t: Record<string, any[]>) => t.tikTokEventOutbox;
const names = (rows: any[]) => rows.map((r) => r.eventName);

describe("TikTok routing, outbox and sender", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withEnv({
      NODE_ENV: "test",
      META_WEB_CAPI_ENABLED: "true",
      META_PIXEL_ID: "28492116573772457",
      META_WEB_CAPI_TOKEN: "EAAGm0PX4ZCpsBO7Zxk9QwLrN2vTb8YhJcUdFeGaIiKoMlPqRsStUuVvWwXxYyZz",
      META_WEB_CAPI_TEST_EVENT_CODE: undefined,
      META_WEB_CAPI_GRAPH_BASE_URL: undefined,
      PUBLIC_TRACK_ALLOWED_ORIGINS: undefined,
      TIKTOK_EVENTS_ENABLED: "true",
      TIKTOK_PIXEL_ID: PIXEL,
      TIKTOK_EVENTS_ACCESS_TOKEN: TOKEN,
      TIKTOK_TEST_EVENT_CODE: undefined,
      TIKTOK_EVENTS_MAX_AGE_DAYS: undefined,
      TIKTOK_EVENTS_API_BASE_URL: undefined,
    });
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });

  describe("routing: which platform gets a tap", () => {
    it("TikTok-only: Contact goes to TikTok, Meta only keeps a SKIPPED marker, the lead is still auto-created", async () => {
      const { t, tap } = setup();
      const r = await tap({ i: 1 });
      expect(r.click).toMatchObject({ attributedPlatform: "TIKTOK", attributionReason: "url_param", ttclid: TTCLID });
      expect(tt(t)).toHaveLength(1);
      expect(tt(t)[0]).toMatchObject({ eventName: "Contact", status: "PENDING_CONFIG", adClickId: r.click.id, dedupeKey: expect.stringMatching(/^click:/) });
      const metaRow = t.metaEventOutbox.find((e: any) => e.eventName === "Lead");
      expect(metaRow).toMatchObject({ status: "SKIPPED", lastError: SKIP_META_ATTRIBUTED_TIKTOK });
      expect(t.lead).toHaveLength(1);
      // the Contact row follows the click onto the lead
      expect(tt(t)[0].leadId).toBe(t.lead[0].id);
      expect(r.pageView.visitEvent.platform).toBe("TIKTOK");
    });

    it("Meta-only: nothing for TikTok, Meta exactly as before", async () => {
      const { t, tap } = setup();
      const r = await tap({ i: 2, url: META_URL, extra: { fbclid: "IwAR1", ttclid: undefined } });
      expect(r.click).toMatchObject({ attributedPlatform: "META", attributionReason: "url_param" });
      expect(tt(t)).toHaveLength(0);
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "Lead")).toMatchObject({ status: "PENDING_CONFIG", lastError: null });
      expect(r.pageView.visitEvent.platform).toBe("META");
    });

    it("neither (organic): nothing for TikTok, Meta keeps today's behaviour", async () => {
      const { t, tap } = setup();
      const r = await tap({ i: 3, url: DIRECT_URL });
      expect(r.click).toMatchObject({ attributedPlatform: "NONE", attributionReason: "none" });
      expect(tt(t)).toHaveLength(0);
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "Lead")).toMatchObject({ status: "PENDING_CONFIG" });
      expect(r.pageView.visitEvent.platform).toBe("NONE");
    });

    it("both in one URL: utm_source decides", async () => {
      const { t, tap } = setup();
      const url = `${LANDING}/?utm_source=tiktok&fbclid=IwAR1&ttclid=${TTCLID}`;
      const r = await tap({ i: 4, url, extra: { fbclid: "IwAR1" }, utm: { source: "tiktok" } });
      expect(r.click.attributedPlatform).toBe("TIKTOK");
      expect(tt(t)).toHaveLength(1);
      const url2 = `${LANDING}/?utm_source=instagram&fbclid=IwAR1&ttclid=${TTCLID}`;
      const r2 = await tap({ i: 5, url: url2, extra: { fbclid: "IwAR1" }, utm: { source: "instagram" } });
      expect(r2.click.attributedPlatform).toBe("META");
      expect(tt(t)).toHaveLength(1);
    });

    it("direct return visit with both stored: the newer touch time wins, and a click id is not sent to the other platform", async () => {
      const { t, tap } = setup();
      const now = Date.now();
      const a = await tap({ i: 6, url: DIRECT_URL, extra: { fbclid: "IwAR1", ttclid: TTCLID, fbt: now - 9 * DAY, ttt: now - 2 * DAY } });
      expect(a.click).toMatchObject({ attributedPlatform: "TIKTOK", attributionReason: "last_touch" });
      const b = await tap({ i: 7, url: DIRECT_URL, extra: { fbclid: "IwAR1", ttclid: TTCLID, fbt: now - 2 * DAY, ttt: now - 9 * DAY } });
      expect(b.click).toMatchObject({ attributedPlatform: "META", attributionReason: "last_touch" });
      expect(tt(t).map((r: any) => r.adClickId)).toEqual([a.click.id]);
    });
  });

  describe("stage events follow the converting click", () => {
    it("TikTok lead: Lead when the phone arrives, CompleteRegistration at Qualified, Purchase at Won; nothing on Meta", async () => {
      const { t, tap, leads } = setup();
      const r = await tap({ i: 10 });
      const lead = t.lead[0];
      expect(names(tt(t))).toEqual(["Contact"]); // no phone yet: no Lead
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      expect(names(tt(t))).toEqual(["Contact", "Lead"]);
      expect(tt(t)[1]).toMatchObject({ leadId: lead.id, adClickId: r.click.id, dedupeKey: `${lead.id}:Lead` });
      lead.estimatedValue = 15_000_000;
      await leads.moveStage(lead.id, "st-qual", "u1");
      await leads.moveStage(lead.id, "st-won", "u1");
      expect(names(tt(t))).toEqual(["Contact", "Lead", "CompleteRegistration", "Purchase"]);
      expect(tt(t).find((e: any) => e.eventName === "Purchase")).toMatchObject({ currency: "IDR", dedupeKey: `${lead.id}:Purchase` });
      expect(Number(tt(t).find((e: any) => e.eventName === "Purchase").value)).toBe(15_000_000);
      // Meta got no stage event for this lead, only the SKIPPED tap marker
      expect(t.metaEventOutbox.filter((e: any) => e.eventName !== "Lead")).toHaveLength(0);
    });

    it("the timeline names the TikTok event a stage change queued (not a Meta one)", async () => {
      const { t, tap, leads } = setup();
      await tap({ i: 9 });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      await leads.moveStage(lead.id, "st-qual", "u1");
      const stageRows = t.leadActivity.filter((a: any) => a.type === "STAGE_CHANGE" && a.toStageId === "st-qual");
      expect(stageRows.map((a: any) => a.metaEvent)).toEqual(["tiktok:CompleteRegistration"]);
    });

    it("implied CompleteRegistration: skipping straight to Won still reports the qualified signal once, before Purchase", async () => {
      const { t, tap, leads } = setup();
      await tap({ i: 11 });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      lead.estimatedValue = 8_000_000;
      await leads.moveStage(lead.id, "st-won", "u1");
      expect(names(tt(t))).toEqual(["Contact", "Lead", "CompleteRegistration", "Purchase"]);
      expect(tt(t).filter((e: any) => e.eventName === "CompleteRegistration")).toHaveLength(1);
    });

    it("idempotent: the same event twice makes one row; a still-unsent Purchase gets its value refreshed", async () => {
      const { t, tap, leads, outbox, prisma } = setup();
      await tap({ i: 12 });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      expect(await outbox.queueEvent(prisma as any, lead, "Purchase", { value: 1000 })).toBe(true);
      expect(await outbox.queueEvent(prisma as any, lead, "Purchase", { value: 2500 })).toBe(false);
      expect(tt(t).filter((e: any) => e.eventName === "Purchase")).toHaveLength(1);
      expect(Number(tt(t).find((e: any) => e.eventName === "Purchase").value)).toBe(2500);
      expect(t.metaEventOutbox.filter((e: any) => e.eventName === "Purchase")).toHaveLength(0);
    });

    it("a Meta lead stays entirely on Meta (no TikTok rows)", async () => {
      const { t, tap, leads } = setup();
      await tap({ i: 13, url: META_URL, extra: { fbclid: "IwAR1" } });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      await leads.moveStage(lead.id, "st-qual", "u1");
      expect(tt(t)).toHaveLength(0);
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ route: "WEBSITE" });
    });

    it("repeat conversion from the other platform: the latest KODE click decides FUTURE events; sent ones stay", async () => {
      const { t, tap, leads } = setup();
      const first = await tap({ i: 14, url: META_URL, extra: { fbclid: "IwAR1" } });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      await leads.moveStage(lead.id, "st-qual", "u1");
      const qualified = t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead");
      expect(qualified).toMatchObject({ route: "WEBSITE", adClickId: first.click.id });
      qualified.status = "SENT"; // already sent to Meta

      // later the same person taps from a TikTok ad (another Kode, linked by staff)
      const second = await tap({ i: 15 });
      second.click.createdAt = new Date(Date.now() + 60_000); // a later tap than the first
      expect(second.click.attributedPlatform).toBe("TIKTOK");
      await leads.linkAdClick(lead.id, second.ref, "u1");
      expect(t.adClick.find((c: any) => c.id === second.click.id)).toMatchObject({ leadId: lead.id, linkedVia: "KODE" });

      lead.estimatedValue = 5_000_000;
      await leads.moveStage(lead.id, "st-won", "u1");
      // Meta keeps what it already got and nothing new
      expect(t.metaEventOutbox.filter((e: any) => e.leadId === lead.id && e.eventName !== "Lead").map((e: any) => [e.eventName, e.status])).toEqual([["QualifiedLead", "SENT"]]);
      // TikTok gets the future events (Lead for the known phone, the implied qualified signal, Purchase)
      const ttEvents = tt(t).filter((e: any) => e.leadId === lead.id).map((e: any) => e.eventName).sort();
      expect(ttEvents).toEqual(["CompleteRegistration", "Contact", "Lead", "Purchase"].sort());
      expect(tt(t).find((e: any) => e.eventName === "Purchase").adClickId).toBe(second.click.id);
    });

    it("and back: a Meta tap after a TikTok one switches the next events to Meta", async () => {
      const { t, tap, leads } = setup();
      await tap({ i: 16 });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      const second = await tap({ i: 17, url: META_URL, extra: { fbclid: "IwAR1" } });
      second.click.createdAt = new Date(Date.now() + 60_000);
      await leads.linkAdClick(lead.id, second.ref, "u1");
      await leads.moveStage(lead.id, "st-qual", "u1");
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ route: "WEBSITE", adClickId: second.click.id });
      expect(names(tt(t)).includes("CompleteRegistration")).toBe(false);
    });

    it("HANDLE taps never decide the platform", async () => {
      const { t, tap, leads } = setup();
      const real = await tap({ i: 18, url: META_URL, extra: { fbclid: "IwAR1" } });
      const lead = t.lead[0];
      await leads.addPhone(lead.id, "0812 3456 7890", "u1");
      // an anonymous TikTok visitor types the same public handle (HANDLE link)
      const evil = await tap({ i: 18 + 100 });
      evil.click.instagramHandle = real.click.instagramHandle; // same handle -> attached as HANDLE if the lead is open
      await leads.moveStage(lead.id, "st-qual", "u1");
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ adClickId: real.click.id });
    });

    it("events earned before the click was known move to TikTok when the Kode is linked, and Meta never gets them", async () => {
      const { t, tap, leads } = setup();
      t.lead.push({
        id: "L-phone", name: "Budi", phone: "+6281234567890", instagramHandle: null, stageId: "st-new", source: "WHATSAPP_ORGANIC",
        createdAt: new Date(), firstContactAt: new Date(), lastContactAt: new Date(), estimatedValue: 0, awaitingWhatsapp: false, autoCreated: false, nameIsPlaceholder: false,
      });
      await leads.moveStage("L-phone", "st-qual", "u1"); // no click yet: Meta business-messaging row
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ route: "BUSINESS_MESSAGING" });
      const r = await tap({ i: 19 });
      await leads.linkAdClick("L-phone", r.ref, "u1");
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ status: "SKIPPED", lastError: SKIP_META_ATTRIBUTED_TIKTOK });
      expect(tt(t).filter((e: any) => e.leadId === "L-phone").map((e: any) => e.eventName).sort()).toEqual(["CompleteRegistration", "Contact", "Lead"]);
    });
  });

  describe("merge", () => {
    it("a waiting TikTok lead merged into an existing lead: Contact moves, sent events are not repeated", async () => {
      const { t, tap, leads } = setup();
      t.lead.push({
        id: "L-old", name: "Budi", phone: "+6281234567890", instagramHandle: null, stageId: "st-new", source: "WHATSAPP_ORGANIC",
        createdAt: new Date(Date.now() - DAY), firstContactAt: new Date(), lastContactAt: new Date(), estimatedValue: 0, awaitingWhatsapp: false, autoCreated: false, nameIsPlaceholder: false,
      });
      const r = await tap({ i: 20 });
      const placeholder = t.lead.find((l: any) => l.autoCreated);
      await leads.addPhone(placeholder.id, "0812 3456 7890", "u1"); // same number as L-old -> merge
      expect(r.click.leadId).toBe("L-old");
      expect(tt(t).find((e: any) => e.eventName === "Contact").leadId).toBe("L-old");
      // the target's latest converting click is TikTok now: the Lead event is queued for it
      expect(tt(t).filter((e: any) => e.leadId === "L-old" && e.eventName === "Lead")).toHaveLength(1);
      await leads.moveStage("L-old", "st-qual", "u1");
      expect(tt(t).filter((e: any) => e.eventName === "CompleteRegistration")).toHaveLength(1);
    });

    it("post-merge SKIP markers: events the placeholder already queued are not repeated for the target", async () => {
      const { t, tap, leads } = setup();
      t.lead.push({
        id: "L-old", name: "Budi", phone: "+6281234567890", instagramHandle: null, stageId: "st-new", source: "WHATSAPP_ORGANIC",
        createdAt: new Date(Date.now() - DAY), firstContactAt: new Date(), lastContactAt: new Date(), estimatedValue: 0, awaitingWhatsapp: false, autoCreated: false, nameIsPlaceholder: false,
      });
      await tap({ i: 21 });
      const placeholder = t.lead.find((l: any) => l.autoCreated);
      await leads.moveStage(placeholder.id, "st-qual", "u1"); // staff qualify the waiting lead
      expect(tt(t).find((e: any) => e.eventName === "CompleteRegistration")).toMatchObject({ leadId: placeholder.id });
      await leads.addPhone(placeholder.id, "0812 3456 7890", "u1"); // merge into L-old
      const marker = tt(t).find((e: any) => e.leadId === "L-old" && e.eventName === "CompleteRegistration");
      expect(marker).toMatchObject({ status: "SKIPPED", dedupeKey: "L-old:CompleteRegistration" });
      expect(marker.lastError).toMatch(/SKIP_SENT_BEFORE_MERGE/);
      await leads.moveStage("L-old", "st-qual", "u1");
      expect(tt(t).filter((e: any) => e.eventName === "CompleteRegistration" && e.status !== "SKIPPED")).toHaveLength(1);
    });
  });

  describe("sender", () => {
    const makeSender = (prisma: any, http: TikTokHttp) => {
      const s = new TikTokEventsService(prisma);
      s.http = http;
      return s;
    };

    async function tiktokLead() {
      const ctx = setup();
      const r = await ctx.tap({ i: 30 });
      const lead = ctx.t.lead[0];
      lead.estimatedValue = 15_000_000;
      lead.email = "Budi@Example.co.id";
      await ctx.leads.addPhone(lead.id, "0812-3456-7890", "u1");
      await ctx.leads.moveStage(lead.id, "st-qual", "u1");
      await ctx.leads.moveStage(lead.id, "st-won", "u1");
      return { ...ctx, r, lead };
    }

    it("sends each event to /event/track/ with the Access-Token header and the exact documented fields", async () => {
      const { prisma, t, lead, r } = await tiktokLead();
      const { http, calls } = okHttp();
      const res = await makeSender(prisma, http).run();
      expect(res).toMatchObject({ enabled: true, sent: 4, failed: 0, skipped: 0 });
      expect(calls.every((c) => c.url === "https://business-api.tiktok.com/open_api/v1.3/event/track/" && c.token === TOKEN)).toBe(true);
      // stage events first, then the click-time Contact
      expect(calls.map((c) => c.body.data[0].event)).toEqual(["Lead", "CompleteRegistration", "Purchase", "Contact"]);
      const byEvent = Object.fromEntries(calls.map((c) => [c.body.data[0].event, c.body]));
      expect(byEvent.Lead).toMatchObject({ event_source: "web", event_source_id: PIXEL });
      expect(byEvent.Lead.test_event_code).toBeUndefined();
      const leadEv = byEvent.Lead.data[0];
      expect(leadEv).toMatchObject({
        event: "Lead",
        event_id: `tt_lead_${lead.id}`,
        user: {
          ttclid: TTCLID,
          phone: "62397bbd6a8c9ae53bc914a6017300eb6b13af5be20e4cc9ad2dc3d61ecb24cd",
          email: sha256("budi@example.co.id"),
          external_id: [sha256(visitFor(30)), sha256(lead.id)],
          ip: "198.51.100.31",
          user_agent: UA,
          locale: "id-ID",
        },
        page: { url: TT_URL },
      });
      expect(leadEv.event_time).toBe(Math.floor(tt(t).find((e: any) => e.eventName === "Lead").eventTime.getTime() / 1000));
      expect(byEvent.Purchase.data[0]).toMatchObject({
        event_id: `tt_purchase_${lead.id}`,
        properties: { currency: "IDR", value: 15000000, order_id: lead.id },
      });
      expect(byEvent.Contact.data[0]).toMatchObject({ event_id: `tt_contact_${r.click.eventId}` });
      expect(byEvent.Contact.data[0].user.phone).toBeUndefined();
      // sent rows keep a redacted copy and the response id, never the token / ip
      for (const row of tt(t)) {
        expect(row).toMatchObject({ status: "SENT", attempts: 1, inFlightAt: null });
        expect(JSON.stringify(row)).not.toMatch(new RegExp(`${TOKEN}|198\\.51\\.100|62397bbd`));
      }
      expect(tt(t)[0].response).toMatchObject({ code: 0, request_id: "REQ1" });
    });

    it("test_event_code travels at the top level while TIKTOK_TEST_EVENT_CODE is set", async () => {
      const { prisma } = await tiktokLead();
      const off = withEnv({ TIKTOK_TEST_EVENT_CODE: "TEST12345" });
      try {
        const { http, calls } = okHttp();
        await makeSender(prisma, http).run();
        expect(calls.every((c) => c.body.test_event_code === "TEST12345")).toBe(true);
      } finally {
        off();
      }
    });

    it("at most once: a sent row is never sent again, a second run sends nothing", async () => {
      const { prisma, t } = await tiktokLead();
      const { http, calls } = okHttp();
      const s = makeSender(prisma, http);
      await s.run();
      const n = calls.length;
      await s.run();
      expect(calls).toHaveLength(n);
      expect(tt(t).every((e: any) => e.status === "SENT")).toBe(true);
    });

    it("a claimed row (interrupted send) is not picked up until its lease expires", async () => {
      const { prisma, t } = await tiktokLead();
      const { http, calls } = okHttp();
      await makeSender(prisma, http).run();
      const row = tt(t)[0];
      row.status = "QUEUED";
      row.inFlightAt = new Date(); // claimed just now by another instance
      const before = calls.length;
      await makeSender(prisma, http).run();
      expect(calls).toHaveLength(before);
      row.inFlightAt = new Date(Date.now() - 20 * 60_000); // lease over: safe to retry with the same event_id
      await makeSender(prisma, http).run();
      expect(calls).toHaveLength(before + 1);
      expect(row.status).toBe("SENT");
    });

    it("stays idle (nothing read, sent or changed) unless READY", async () => {
      const { prisma, t } = await tiktokLead();
      const off = withEnv({ TIKTOK_EVENTS_ENABLED: "false" });
      try {
        const { http, calls } = okHttp();
        const res = await makeSender(prisma, http).run();
        expect(res.enabled).toBe(false);
        expect(calls).toHaveLength(0);
        expect(tt(t).every((e: any) => e.status === "PENDING_CONFIG")).toBe(true);
      } finally {
        off();
      }
    });

    it("events older than the max age are SKIPPED with a clear reason (default 7 days, configurable)", async () => {
      const { prisma, t } = await tiktokLead();
      for (const row of tt(t)) row.eventTime = new Date(Date.now() - 9 * DAY);
      const { http, calls } = okHttp();
      const res = await makeSender(prisma, http).run();
      expect(res.skipped).toBe(4);
      expect(calls).toHaveLength(0);
      expect(tt(t)[0].lastError).toMatch(/older than 7 days/);
      // raising the limit makes them sendable again
      for (const row of tt(t)) { row.status = "PENDING_CONFIG"; row.lastError = null; }
      const off = withEnv({ TIKTOK_EVENTS_MAX_AGE_DAYS: "14" });
      try {
        await makeSender(prisma, http).run();
        expect(calls).toHaveLength(4);
      } finally {
        off();
      }
    });

    it("click-time Contacts that waited more than 24 h for the sender are SKIPPED on the first READY run", async () => {
      const { prisma, t } = await tiktokLead();
      const contact = tt(t).find((e: any) => e.eventName === "Contact");
      contact.createdAt = new Date(Date.now() - 2 * DAY);
      const { http, calls } = okHttp();
      const res = await makeSender(prisma, http).run();
      expect(contact).toMatchObject({ status: "SKIPPED" });
      expect(contact.lastError).toMatch(/SKIP_STALE_BEFORE_ENABLE/);
      expect(res.sent).toBe(3);
      expect(calls.map((c) => c.body.data[0].event)).not.toContain("Contact");
    });

    it("skips a row whose click is no longer TikTok-attributed, or gone", async () => {
      const { prisma, t, r } = await tiktokLead();
      r.click.attributedPlatform = "META";
      const { http, calls } = okHttp();
      const res = await makeSender(prisma, http).run();
      expect(calls).toHaveLength(0);
      expect(res.skipped).toBe(4);
      expect(tt(t)[0].lastError).toMatch(/not attributed to TikTok/);
    });

    it("40002 invalid payload: FAILED at once, never retried", async () => {
      const { prisma, t } = await tiktokLead();
      const post = jest.fn(async () => ({ status: 400, json: { code: 40002, message: "Invalid value for data. 0 .event_id: not a valid string.", request_id: "R" } }));
      const res = await makeSender(prisma, { post }).run();
      expect(res).toMatchObject({ sent: 0, failed: 4 });
      expect(tt(t).every((e: any) => e.status === "FAILED" && e.attempts === 1)).toBe(true);
      expect(tt(t)[0].lastError).toMatch(/code 40002/);
      await makeSender(prisma, { post }).run();
      expect(post).toHaveBeenCalledTimes(4);
    });

    it("40104 / 40001 (token or permission) and 40100 / 5xx are retried with backoff, then FAILED after the attempts run out; the token is never stored", async () => {
      const { prisma, t } = await tiktokLead();
      let status = 401;
      let code = 40104;
      const post = jest.fn(async (_u: string, token: string) => ({ status, json: { code, message: `bad token ${token}`, request_id: "R" } }));
      const s = makeSender(prisma, { post });
      const res = await s.run();
      expect(res).toMatchObject({ sent: 0, failed: 0, retrying: 4 });
      expect(tt(t).every((e: any) => e.status === "QUEUED" && e.attempts === 1 && e.nextTryAt instanceof Date && e.inFlightAt === null)).toBe(true);
      expect(JSON.stringify(tt(t))).not.toContain(TOKEN);
      expect(s.lastAuthError).toMatchObject({ code: 40104 });
      // backoff holds: a run right after sends nothing
      post.mockClear();
      await s.run();
      expect(post).not.toHaveBeenCalled();
      // the retry reuses the same event_id; 5xx now
      status = 503;
      code = 50000;
      for (const row of tt(t)) row.nextTryAt = new Date(Date.now() - 1000);
      const first = (await (async () => { post.mockClear(); await s.run(); return post.mock.calls.length; })());
      expect(first).toBe(4);
      expect(tt(t).every((e: any) => e.attempts === 2 && e.status === "QUEUED")).toBe(true);
      // max attempts -> FAILED
      for (const row of tt(t)) { row.attempts = 5; row.nextTryAt = new Date(Date.now() - 1000); }
      const last = await s.run();
      expect(last.failed).toBe(4);
      expect(tt(t).every((e: any) => e.status === "FAILED")).toBe(true);
    });

    it("a network error is transient and keeps the same event_id on retry", async () => {
      const { prisma, t } = await tiktokLead();
      const seen: string[] = [];
      let fail = true;
      const post = jest.fn(async (_u: string, _t: string, body: any) => {
        seen.push(body.data[0].event_id);
        if (fail) throw new Error("socket hang up");
        return { status: 200, json: { code: 0, message: "OK", request_id: "R" } };
      });
      const s = makeSender(prisma, { post });
      await s.run();
      expect(tt(t).every((e: any) => e.status === "QUEUED")).toBe(true);
      fail = false;
      for (const row of tt(t)) row.nextTryAt = new Date(Date.now() - 1000);
      await s.run();
      expect(tt(t).every((e: any) => e.status === "SENT")).toBe(true);
      const dup = seen.filter((id, i) => seen.indexOf(id) !== i);
      expect(new Set(dup).size).toBe(4); // every event_id was sent twice, identically
    });

    it("the TikTok denies/limits never touch Meta: the Meta sender still sends nothing for this lead", async () => {
      const { prisma } = await tiktokLead();
      const graph = new FakeGraph().on("POST", /\/28492116573772457\/events$/, (c: any) => ({ json: { events_received: c.body.data.length } }));
      await new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any)).run();
      expect(graph.calls).toHaveLength(0);
    });
  });

  describe("visit batch (ViewContent)", () => {
    it("queues a ViewContent for a TikTok visit only, flushes it in one request, and drops events older than the max age", async () => {
      const { prisma, tap } = setup();
      const s = new TikTokEventsService(prisma as any);
      const { http, calls } = okHttp();
      s.http = http;
      const a = await tap({ i: 40 });
      const b = await tap({ i: 41 });
      expect(s.enqueueVisitEvent(a.pageView.visitEvent)).toBe(true);
      expect(s.enqueueVisitEvent({ ...b.pageView.visitEvent, eventTime: new Date(Date.now() - 9 * DAY) })).toBe(true);
      const res = await s.flushVisitEvents();
      expect(res).toMatchObject({ sent: 1, stale: 1, requests: 1 });
      expect(calls).toHaveLength(1);
      const ev = calls[0].body.data[0];
      expect(ev).toMatchObject({
        event: "ViewContent",
        event_id: `tt_view_${a.pageView.visitEvent.eventId}`,
        user: { ttclid: TTCLID, external_id: [sha256(visitFor(40))], ip: "198.51.100.41", user_agent: UA },
        page: { url: TT_URL },
      });
      expect(ev.user.phone).toBeUndefined();
    });

    it("40002 on a batch names the bad index: only that event is dropped, the rest is resent; transient errors retry then drop", async () => {
      const { prisma, tap } = setup();
      const s = new TikTokEventsService(prisma as any);
      const calls: any[] = [];
      s.http = {
        post: async (_u, _t, body: any) => {
          calls.push(body);
          if (body.data.length === 3) return { status: 400, json: { code: 40002, message: "Invalid value for data. 1 .event_id: not a valid string.", request_id: "R" } };
          return { status: 200, json: { code: 0, message: "OK", request_id: "R" } };
        },
      };
      for (const i of [50, 51, 52]) {
        const x = await tap({ i });
        s.enqueueVisitEvent(x.pageView.visitEvent);
      }
      const res = await s.flushVisitEvents();
      expect(res).toMatchObject({ sent: 2, dropped: 1, requests: 2 });
      expect(calls[1].data.map((e: any) => e.event_id)).toEqual(calls[0].data.filter((_: any, i: number) => i !== 1).map((e: any) => e.event_id));

      const s2 = new TikTokEventsService(prisma as any);
      s2.http = { post: async () => ({ status: 503, json: null }) };
      const y = await tap({ i: 53 });
      s2.enqueueVisitEvent(y.pageView.visitEvent);
      expect((await s2.flushVisitEvents()).retrying).toBe(1);
      expect((await s2.flushVisitEvents()).retrying).toBe(1);
      expect((await s2.flushVisitEvents()).dropped).toBe(1);
      expect(s2.queuedVisitEvents).toBe(0);
    });

    it("nothing is queued while the sender is not READY", async () => {
      const { prisma, tap } = setup();
      const off = withEnv({ TIKTOK_EVENTS_ENABLED: "false" });
      try {
        const s = new TikTokEventsService(prisma as any);
        const a = await tap({ i: 60 });
        expect(s.enqueueVisitEvent(a.pageView.visitEvent)).toBe(false);
        expect(s.queuedVisitEvents).toBe(0);
      } finally {
        off();
      }
    });
  });

  it("TikTokApiError carries the class used by the sender", () => {
    const e = new TikTokApiError("x", "auth", 401, 40104);
    expect(e).toMatchObject({ kind: "auth", status: 401, code: 40104 });
  });
});
