import { INestApplication, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { CrmFlowService } from "../crm/crm-flow.service";
import { CrmLeadsService } from "../crm/crm-leads.service";
import { CrmOutboxService } from "../crm/crm-outbox.service";
import { CrmStatsService } from "../crm/crm-stats.service";
import { normalizePhone } from "../crm/crm.utils";
import { WhatsAppApiService } from "../whatsapp/whatsapp-api.service";
import { WhatsAppGraphClient } from "../whatsapp/whatsapp-graph.client";
import { WhatsAppIngestService } from "../whatsapp/whatsapp-ingest.service";
import { WhatsAppInboxService } from "../whatsapp/whatsapp-inbox.service";
import {
  FakeGraph,
  FakePrisma,
  WA_ENV_KEYS,
  messagesPayload,
  unixAgo,
  waEnv,
  withEnv,
} from "../whatsapp/testing/whatsapp-fakes.helper-spec";
import { AdClickService, LEAD_IP_CAP_PER_HOUR } from "./ad-click.service";
import { resolveAdTrackingConfig } from "./ad-tracking.config";
import {
  autoLeadName,
  AutoLeadService,
  LOST_REASON_DUPLICATE,
  LOST_REASON_NEVER_SENT_WHATSAPP,
  SKIP_SENT_BEFORE_MERGE,
} from "./auto-lead.service";
import { PublicTrackController } from "./public-track.controller";
import { createPublicTrackBody, createPublicTrackCors } from "./public-track.http";
import { parseTrackEvent } from "./track-event.payload";
import { InMemoryTrackCounters, TrackCounters } from "./track-limits";
import { buildWebEvent, sha256 } from "./web-capi.payload";
import { WebCapiService } from "./web-capi.service";

const PIXEL = "28492116573772457";
const TOKEN = "EAAGm0PX4ZCpsBO7Zxk9QwLrN2vTb8YhJcUdFeGaIiKoMlPqRsStUuVvWwXxYyZz";
const UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const BOT_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const PHONE = "+6281234567890";
const DAY = 86_400_000;

const STAGES = [
  { id: "st-new", key: "NEW", name: "New", order: 1, type: "OPEN", isActive: true, metaEvent: null },
  { id: "st-qual", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN", isActive: true, metaEvent: "QualifiedLead" },
  { id: "st-won", key: "WON", name: "Won", order: 5, type: "WON", isActive: true, metaEvent: "Purchase" },
  { id: "st-lost", key: "LOST", name: "Lost", order: 6, type: "LOST", isActive: true, metaEvent: null },
];

/** 6-char codes from the ref alphabet, unique per i. */
const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const refFor = (i: number) => `R${ALPHA[Math.floor(i / 32) % 32]}${ALPHA[i % 32]}ZZZ`;
const visitFor = (i: number) => `33333333-0000-4000-8000-${String(i).padStart(12, "0")}`;
let evtSeq = 0;
const eventId = () => `evt-${String(++evtSeq).padStart(10, "0")}`;

interface TapOpts {
  i: number;
  ip?: string;
  ua?: string;
  instagram?: string | null;
  brandName?: string;
  category?: string;
  pageView?: boolean;
  pageViewAgeMs?: number;
  fbclid?: string;
}

function setup(opts: { counters?: TrackCounters; leads?: any[]; stages?: any[] } = {}) {
  const prisma = new FakePrisma({
    leadStage: (opts.stages ?? STAGES).map((s) => ({ ...s })),
    campaign: [{ id: "cmp1", code: "FB-OKT1", name: "Oktober 1", metaAdIds: [] }],
    crmSettings: [{ id: "default", responseThresholdMinutes: 15 }],
    campaignSpend: [],
    metaAdsSyncState: [],
    metaAdsInsightDaily: [],
    // seeded rows get the DB defaults a real insert would have
    lead: (opts.leads ?? []).map((l) => ({
      firstContactAt: l.createdAt ?? new Date(),
      lastContactAt: l.createdAt ?? new Date(),
      firstResponseAt: null,
      awaitingWhatsapp: false,
      autoCreated: false,
      nameIsPlaceholder: false,
      estimatedValue: 0,
      ...l,
    })),
  });
  const counters = opts.counters ?? new InMemoryTrackCounters();
  const autoLeads = new AutoLeadService(prisma as any, counters);
  const clicks = new AdClickService(prisma as any, counters, autoLeads);
  const outbox = new CrmOutboxService();
  const flow = new CrmFlowService(prisma as any, outbox);
  const settings: any = { getThresholdMinutes: async () => 15 };
  const clients: any = { create: jest.fn(async (d: any) => ({ id: "client-1", ...d })) };
  const leads = new CrmLeadsService(prisma as any, flow, outbox, settings, clients, {} as any, {} as any, clicks, autoLeads);
  const stats = new CrmStatsService(prisma as any, settings);

  /** PageView (aged so the 3 s rule passes) then the WhatsApp tap, like the landing page. */
  const tap = async (o: TapOpts) => {
    const ip = o.ip ?? `198.51.100.${(o.i % 250) + 1}`;
    const ua = o.ua ?? UA;
    const visitId = visitFor(o.i);
    const base = {
      visitId,
      pageUrl: "https://link.monomiagency.com/?utm_campaign=fb-okt1",
      utm: { source: "meta", medium: "paid", campaign: "fb-okt1" },
      fbp: "fb.1.1759900000000.1234567890",
      ...(o.fbclid ? { fbclid: o.fbclid } : {}),
    };
    if (o.pageView !== false) {
      await clicks.recordEvent(parseTrackEvent(JSON.stringify({ ...base, name: "PageView", eventId: eventId() }))!, { ip, userAgent: ua });
      for (const r of prisma.tables.adClick) {
        if (r.visitId === visitId && r.pageViewAt) r.pageViewAt = new Date(r.pageViewAt.getTime() - (o.pageViewAgeMs ?? 5000));
      }
    }
    const meta: Record<string, unknown> = {};
    if (o.instagram !== null) meta.instagram = o.instagram ?? `brand${o.i}`;
    if (o.brandName) meta.brandName = o.brandName;
    if (o.category) meta.category = o.category;
    const r = await clicks.recordEvent(
      parseTrackEvent(JSON.stringify({ ...base, name: "Lead", eventId: eventId(), ref: refFor(o.i), meta }))!,
      { ip, userAgent: ua },
    );
    const click: any = prisma.tables.adClick.find((c: any) => c.ref === refFor(o.i));
    return { ...r, ref: refFor(o.i), click };
  };
  const t = prisma.tables as Record<string, any[]>;
  return { prisma, t, counters, autoLeads, clicks, outbox, flow, leads, stats, tap };
}

const autoLeadsOf = (t: Record<string, any[]>) => t.lead.filter((l: any) => l.autoCreated);

describe("auto-created leads from the landing-page form", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withEnv({
      NODE_ENV: "test",
      META_WEB_CAPI_ENABLED: "true",
      META_PIXEL_ID: PIXEL,
      META_WEB_CAPI_TOKEN: TOKEN,
      META_WEB_CAPI_TEST_EVENT_CODE: undefined,
      META_WEB_CAPI_GRAPH_BASE_URL: undefined,
      PUBLIC_TRACK_ALLOWED_ORIGINS: undefined,
      PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR: undefined,
      AUTO_LEAD_STALE_DAYS: undefined,
    });
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });
  afterEach(() => {
    restore();
    jest.restoreAllMocks();
  });

  describe("creation gate", () => {
    it("creates a waiting WEBSITE lead in the first stage on a gated tap, linked to the click and its click-time Lead row", async () => {
      const { t, tap } = setup();
      const r = await tap({ i: 1, instagram: "@Kopi.Senja", brandName: "Kopi Senja", category: "Modest wear" });
      expect(r.outcome).toBe("ok");
      expect(t.lead).toHaveLength(1);
      const lead = t.lead[0];
      expect(lead).toMatchObject({
        name: "Kopi Senja",
        phone: null,
        waId: null,
        source: "WEBSITE",
        stageId: "st-new",
        campaignId: "cmp1",
        campaignCode: "FB-OKT1",
        instagramHandle: "kopi.senja",
        company: "Kopi Senja",
        category: "Modest wear",
        awaitingWhatsapp: true,
        autoCreated: true,
        nameIsPlaceholder: true,
        assignedToId: null,
      });
      expect(lead.createdById ?? null).toBeNull();
      expect(r.click).toMatchObject({ leadId: lead.id });
      expect(r.click.linkedAt).toBeInstanceOf(Date);
      const leadRow = t.metaEventOutbox.find((e: any) => e.eventName === "Lead");
      expect(leadRow).toMatchObject({ leadId: lead.id, adClickId: r.click.id, status: "PENDING_CONFIG" });
      expect(t.leadActivity.map((a: any) => [a.type, a.body, a.metaEvent ?? null])).toEqual([
        ["STAGE_CHANGE", null, null],
        ["NOTE", `@lead.fromLandingForm: ${r.ref}`, null],
      ]);
    });

    it("display name: brand, else @handle, else 'Website visitor · <Kode>'", async () => {
      expect(autoLeadName("  Kopi Senja ", "kopi", "K7QM2X")).toBe("Kopi Senja");
      expect(autoLeadName(null, "kopi.senja", "K7QM2X")).toBe("@kopi.senja");
      expect(autoLeadName("", null, "K7QM2X")).toBe("Website visitor · K7QM2X");
      const { t, tap } = setup();
      await tap({ i: 2, instagram: null });
      expect(t.lead[0].name).toBe(`Website visitor · ${refFor(2)}`);
    });

    it("does not need a Meta click id: organic visits get a lead too", async () => {
      const { t, tap } = setup();
      await tap({ i: 3 }); // no fbclid / fbc
      expect(autoLeadsOf(t)).toHaveLength(1);
    });

    it("no lead without a PageView, with a PageView under 3 s old, or from another network; the click stays linkable", async () => {
      const { t, tap, clicks } = setup();
      await tap({ i: 4, pageView: false });
      await tap({ i: 5, pageViewAgeMs: 0 });
      // PageView from one address, tap from another
      await tap({ i: 6, ip: "203.0.113.9" });
      const row = t.adClick.find((c: any) => c.visitId === visitFor(6))!;
      row.clientIp = "203.0.113.10";
      await tap({ i: 7, ip: "203.0.113.11", pageView: false });
      expect(t.lead.filter((l: any) => l.instagramHandle === "brand4" || l.instagramHandle === "brand5")).toHaveLength(0);
      expect(t.adClick.find((c: any) => c.ref === refFor(4)).leadId).toBeNull();
      expect(await clicks.preview(refFor(4))).toMatchObject({ available: true, waitingLead: null });
    });

    it("only the visit's first tap gets a lead; a second tap in the same visit is stored on its own row without one", async () => {
      const { t, tap, clicks } = setup();
      await tap({ i: 8 });
      const visitId = visitFor(8);
      await clicks.recordEvent(
        parseTrackEvent(JSON.stringify({ name: "Lead", visitId, eventId: eventId(), ref: "SECND2", meta: { instagram: "other.brand" } }))!,
        { ip: "198.51.100.9", userAgent: UA },
      );
      expect(t.adClick.filter((c: any) => c.visitId === visitId).map((c: any) => c.ref)).toEqual([refFor(8), "SECND2"]);
      expect(autoLeadsOf(t)).toHaveLength(1);
      expect(t.adClick.find((c: any) => c.ref === "SECND2").leadId).toBeNull();
    });

    it(`stops at ${LEAD_IP_CAP_PER_HOUR} per network per hour (shared with forwarded Leads); other networks unaffected`, async () => {
      const { t, tap } = setup();
      for (let i = 0; i < LEAD_IP_CAP_PER_HOUR + 2; i += 1) await tap({ i: 100 + i, ip: "198.51.100.77" });
      expect(autoLeadsOf(t)).toHaveLength(LEAD_IP_CAP_PER_HOUR);
      expect(t.adClick.filter((c: any) => c.ref && !c.leadId)).toHaveLength(2); // stored, linkable
      await tap({ i: 200, ip: "198.51.100.78" });
      expect(autoLeadsOf(t)).toHaveLength(LEAD_IP_CAP_PER_HOUR + 1);
    });

    it("global cap PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR: above it the click is stored, no lead, one warning", async () => {
      restore = ((prev) => {
        const r = withEnv({ PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR: "2" });
        return () => { r(); prev(); };
      })(restore);
      const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const { t, tap } = setup();
      for (let i = 0; i < 4; i += 1) await tap({ i: 300 + i }); // 4 different networks
      expect(autoLeadsOf(t)).toHaveLength(2);
      expect(t.adClick.filter((c: any) => c.ref)).toHaveLength(4);
      expect(t.adClick.filter((c: any) => c.ref && !c.leadId)).toHaveLength(2);
      const capWarnings = warn.mock.calls.filter((c) => String(c[0]).includes("Auto-lead cap reached"));
      expect(capWarnings).toHaveLength(1);
      expect(String(capWarnings[0][0])).not.toMatch(/brand|198\.51/); // no visitor data in the log
    });

    it("the global cap defaults to 60, accepts 0 (auto-creation off) and ignores a malformed value", async () => {
      expect(resolveAdTrackingConfig({}).maxAutoLeadsPerHour).toBe(60);
      expect(resolveAdTrackingConfig({ PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR: "0" }).maxAutoLeadsPerHour).toBe(0);
      const bad = resolveAdTrackingConfig({ PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR: "lots" });
      expect(bad.maxAutoLeadsPerHour).toBe(60);
      expect(bad.problems.join(" ")).toContain("PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR");
      expect(resolveAdTrackingConfig({}).autoLeadStaleDays).toBe(30);
      restore = ((prev) => {
        const r = withEnv({ PUBLIC_TRACK_MAX_AUTO_LEADS_PER_HOUR: "0" });
        return () => { r(); prev(); };
      })(restore);
      const { t, tap } = setup();
      await tap({ i: 310 });
      expect(t.lead).toHaveLength(0);
    });

    it("fails closed when the cap counter store is down (click stored, no lead)", async () => {
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      class Flaky extends InMemoryTrackCounters {
        override async increment(key: string, ttl: number) {
          if (key === "auto-leads") throw new Error("redis down");
          return super.increment(key, ttl);
        }
      }
      const { t, tap } = setup({ counters: new Flaky() });
      await tap({ i: 320 });
      expect(t.lead).toHaveLength(0);
      expect(t.adClick.find((c: any) => c.ref === refFor(320))).toBeTruthy();
    });

    it("skips bot user agents (service level too, not only the endpoint)", async () => {
      const { t, tap, autoLeads } = setup();
      await tap({ i: 330, ua: BOT_UA });
      expect(t.lead).toHaveLength(0);
      expect(await autoLeads.createForTap("whatever", BOT_UA)).toBe("bot");
      expect(await autoLeads.createForTap("whatever", null)).toBe("bot");
    });

    it("an auto-lead failure never breaks the tap: the click is stored and stays linkable", async () => {
      const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const { t, tap, autoLeads } = setup();
      jest.spyOn(autoLeads, "createForTap").mockRejectedValueOnce(new Error("db hiccup"));
      const r = await tap({ i: 340 });
      expect(r.outcome).toBe("ok");
      expect(t.lead).toHaveLength(0);
      expect(t.adClick.find((c: any) => c.ref === refFor(340)).leadId).toBeNull();
      expect(warn.mock.calls.some((c) => String(c[0]).includes("Auto-lead for a landing-page tap failed"))).toBe(true);
    });
  });

  describe("public endpoint leaks nothing", () => {
    it("answers the same 200 {ok:true} whether a lead was created or not", async () => {
      const ctx = setup();
      const sender = new WebCapiService(ctx.prisma as any, new WhatsAppGraphClient(new FakeGraph().fetch as any));
      const mod = await Test.createTestingModule({
        controllers: [PublicTrackController],
        providers: [
          { provide: AdClickService, useValue: ctx.clicks },
          { provide: WebCapiService, useValue: sender },
        ],
      }).compile();
      const app: INestApplication = mod.createNestApplication();
      app.use(createPublicTrackCors(() => resolveAdTrackingConfig()));
      app.use(createPublicTrackBody());
      app.setGlobalPrefix("api/v1");
      await app.init();
      const post = (body: unknown) =>
        request(app.getHttpServer())
          .post("/api/v1/public/track/event")
          .set("Origin", "https://link.monomiagency.com")
          .set("User-Agent", UA)
          .set("Content-Type", "text/plain;charset=UTF-8")
          .send(JSON.stringify(body));
      try {
        const visitId = visitFor(400);
        await post({ name: "PageView", visitId, eventId: eventId() });
        for (const r of ctx.t.adClick) if (r.pageViewAt) r.pageViewAt = new Date(r.pageViewAt.getTime() - 5000);
        const gated = await post({ name: "Lead", visitId, eventId: eventId(), ref: refFor(400), meta: { instagram: "a.brand" } });
        const ungated = await post({ name: "Lead", visitId: visitFor(401), eventId: eventId(), ref: refFor(401), meta: { instagram: "b.brand" } });
        expect(autoLeadsOf(ctx.t)).toHaveLength(1);
        expect(gated.status).toBe(200);
        expect(ungated.status).toBe(200);
        expect(gated.body).toEqual({ ok: true });
        expect(ungated.body).toEqual({ ok: true });
        expect(gated.headers["content-length"]).toBe(ungated.headers["content-length"]);
      } finally {
        await app.close();
      }
    });
  });

  describe("Instagram handle dedup", () => {
    it("a second tap with the same handle links to the open lead (several clicks per lead) and notes it", async () => {
      const { t, tap } = setup();
      await tap({ i: 500, instagram: "kopi.senja" });
      await tap({ i: 501, instagram: "@KOPI.SENJA", brandName: "Kopi Senja", category: "Menswear" });
      expect(t.lead).toHaveLength(1);
      const lead = t.lead[0];
      expect(t.adClick.filter((c: any) => c.leadId === lead.id)).toHaveLength(2);
      // unverified tap: it never changes the lead's fields
      expect(lead).toMatchObject({ company: null, category: null });
      expect(t.adClick.find((c: any) => c.ref === refFor(501)).linkedVia).toBe("HANDLE");
      expect(t.adClick.find((c: any) => c.ref === refFor(500)).linkedVia).toBe("AUTO_CREATE");
      expect(t.leadActivity.some((a: any) => a.leadId === lead.id && a.body === `@lead.landingFormRepeat: ${refFor(501)}`)).toBe(true);
      expect(t.metaEventOutbox.filter((e: any) => e.eventName === "Lead").every((e: any) => e.leadId === lead.id)).toBe(true);
    });

    it("also matches an open lead staff created from a chat; a Won/Lost lead with that handle does not block a new one", async () => {
      const { t, tap } = setup({
        leads: [
          { id: "L-open", name: "Rina", phone: PHONE, instagramHandle: "rina.store", stageId: "st-qual", createdAt: new Date(Date.now() - DAY), source: "WHATSAPP_ORGANIC", company: "Rina Store", category: null },
          { id: "L-lost", name: "Old", phone: "+6281111111111", instagramHandle: "old.brand", stageId: "st-lost", createdAt: new Date(Date.now() - DAY), source: "OTHER", company: null, category: null },
        ],
      });
      await tap({ i: 510, instagram: "rina.store", brandName: "Another name" });
      await tap({ i: 511, instagram: "old.brand" });
      expect(t.adClick.find((c: any) => c.ref === refFor(510)).leadId).toBe("L-open");
      expect(t.lead.find((l: any) => l.id === "L-open")).toMatchObject({ company: "Rina Store", source: "WHATSAPP_ORGANIC" });
      const fresh = autoLeadsOf(t);
      expect(fresh).toHaveLength(1);
      expect(fresh[0].instagramHandle).toBe("old.brand");
    });

    it("serialises creation per handle with an advisory lock", async () => {
      const { prisma, tap } = setup();
      await tap({ i: 520, instagram: "lock.me" });
      expect(prisma.rawCalls.some((c: string) => c.includes("pg_advisory_xact_lock") && c.includes("auto-lead:lock.me"))).toBe(true);
    });
  });

  describe("Meta events", () => {
    it("queues no LeadSubmitted for an auto-created lead, even when the first stage maps to LeadSubmitted, nor when the chat fills it in", async () => {
      const stages = STAGES.map((s) => (s.id === "st-new" ? { ...s, metaEvent: "LeadSubmitted" } : s));
      const { t, tap, leads } = setup({ stages });
      const r = await tap({ i: 600 });
      expect(t.metaEventOutbox.map((e: any) => e.eventName)).toEqual(["Lead"]);
      await leads.create({ name: "Rina", phone: "0812-3456-7890", firstMessage: `Halo\nKode: ${r.ref}`, adClickRef: r.ref } as any, "u1");
      expect(t.metaEventOutbox.map((e: any) => e.eventName)).toEqual(["Lead"]);
    });

    it("QualifiedLead goes on the website route without ph (and without fn/ln from a placeholder name) while the phone is unknown", async () => {
      const { prisma, t, tap, leads } = setup();
      const r = await tap({ i: 610, fbclid: "IwAR_test_click", brandName: "Kopi Senja" });
      const lead = t.lead[0];
      await leads.moveStage(lead.id, "st-qual", "u1");
      const q = t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead");
      expect(q).toMatchObject({ route: "WEBSITE", adClickId: r.click.id, leadId: lead.id, status: "PENDING_CONFIG" });
      // staff moving a waiting lead is not a "first response" (nothing to answer yet)
      expect(t.lead[0].firstResponseAt).toBeNull();

      const graph = new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({ json: { events_received: c.body.data.length } }));
      const sender = new WebCapiService(prisma as any, new WhatsAppGraphClient(graph.fetch as any));
      await sender.run();
      const sent = graph.calls.map((c) => c.body.data[0]).find((e: any) => e.event_name === "QualifiedLead");
      expect(sent).toBeTruthy();
      expect(sent.action_source).toBe("website");
      const ud = sent.user_data;
      expect(ud.ph).toBeUndefined();
      expect(ud.fn).toBeUndefined();
      expect(ud.ln).toBeUndefined();
      expect(ud.client_ip_address).toBe("198.51.100.111");
      expect(ud.client_user_agent).toBe(UA);
      expect(ud.fbc).toMatch(/^fb\.1\.\d+\.IwAR_test_click$/);
      expect(ud.fbp).toBe("fb.1.1759900000000.1234567890");
      expect(ud.external_id).toEqual([sha256(visitFor(610)), sha256(lead.id)]);
    });

    it("once the phone and a real name are known, ph / fn / ln are sent", () => {
      const click = { visitId: "v", pageUrl: null, fbc: null, fbp: null, clientIp: null, userAgent: null };
      const before = buildWebEvent({ eventName: "QualifiedLead", eventTime: new Date(), eventId: "e" }, click, { id: "L", name: "@kopi.senja", phone: null, nameIsPlaceholder: true });
      expect(Object.keys(before.user_data as object).sort()).toEqual(["country", "external_id"]);
      const after = buildWebEvent({ eventName: "QualifiedLead", eventTime: new Date(), eventId: "e" }, click, { id: "L", name: "Rina Ayu", phone: PHONE, nameIsPlaceholder: false });
      expect(after.user_data).toMatchObject({ ph: [sha256("6281234567890")], fn: [sha256("rina")], ln: [sha256("ayu")] });
    });
  });

  describe("the WhatsApp chat arrives", () => {
    it("quick-add with the Kode (a): parse shows the waiting lead; save fills its phone, opens the same lead, adds the chat", async () => {
      const { t, tap, leads } = setup();
      const r = await tap({ i: 700, instagram: "kopi.senja" });
      const waiting = t.lead[0];
      const chat = `Rina +62 812-3456-7890\nHalo Monomi, mau ambil slot.\n\nInstagram: @kopi.senja\nKode: ${r.ref}`;
      const parsed: any = await leads.parseQuickAdd(chat);
      expect(parsed.adClick).toMatchObject({ ref: r.ref, available: false, waitingLead: { id: waiting.id, instagramHandle: "kopi.senja" } });
      expect(parsed.duplicate).toBeNull();

      const res: any = await leads.create({ name: "Rina", phone: parsed.phone, firstMessage: parsed.message, adClickRef: r.ref, assignedToId: "u1" } as any, "u1");
      expect(res.waitingOutcome).toEqual({ outcome: "filled", leadId: waiting.id, returningFrom: null });
      expect(parsed.waitingMatch).toEqual({ mergeInto: null, returningFrom: null });
      expect(res.id).toBe(waiting.id);
      expect(t.lead).toHaveLength(1);
      expect(t.lead[0]).toMatchObject({
        phone: PHONE,
        waId: "6281234567890",
        awaitingWhatsapp: false,
        name: "Rina",
        nameIsPlaceholder: false,
        firstResponseAt: null,
        assignedToId: "u1",
      });
      expect(t.leadActivity.find((a: any) => a.leadId === waiting.id && a.type === "WHATSAPP").body).toContain("Halo Monomi");
      expect(t.leadActivity.some((a: any) => a.body === "@lead.phoneFilled")).toBe(true);
      expect(res.isUncontacted).toBe(false);
      expect(res.waitingMinutes).toBe(0); // the response clock starts now
    });

    it("quick-add with the Kode but no number asks for the number instead of creating a lead", async () => {
      const { t, tap, leads } = setup();
      const r = await tap({ i: 701 });
      await expect(leads.create({ name: "Rina", firstMessage: `Kode: ${r.ref}`, adClickRef: r.ref } as any, "u1")).rejects.toMatchObject({
        response: { code: "WAITING_LEAD_NEEDS_PHONE" },
      });
      expect(t.lead).toHaveLength(1);
    });

    it("quick-add (b): the number already has a lead -> the click, handle, brand and category move to it; the untouched placeholder is deleted", async () => {
      const older = { id: "L-old", name: "Rina Ayu", phone: PHONE, stageId: "st-new", source: "WHATSAPP_ORGANIC", createdAt: new Date(Date.now() - 5 * DAY), instagramHandle: null, company: null, category: null, ctwaClid: null };
      const { t, tap, leads } = setup({ leads: [older] });
      const r = await tap({ i: 710, instagram: "kopi.senja", brandName: "Kopi Senja", category: "Unisex / streetwear" });
      const placeholder = autoLeadsOf(t)[0];
      const parsed: any = await leads.parseQuickAdd(`+62 812 3456 7890\nKode: ${r.ref}`);
      expect(parsed.duplicate).toMatchObject({ id: "L-old" });
      expect(parsed.adClick.waitingLead).toMatchObject({ id: placeholder.id });

      const res: any = await leads.create({ phone: PHONE, firstMessage: `Kode: ${r.ref}`, adClickRef: r.ref } as any, "u1");
      expect(res.waitingOutcome).toEqual({ outcome: "merged", leadId: "L-old", fromLeadId: placeholder.id, placeholderDeleted: true });
      expect(t.lead.map((l: any) => l.id)).toEqual(["L-old"]);
      expect(t.lead[0]).toMatchObject({ instagramHandle: "kopi.senja", company: "Kopi Senja", category: "Unisex / streetwear", source: "WEBSITE", campaignId: "cmp1" });
      expect(r.click.leadId).toBe("L-old");
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "Lead").leadId).toBe("L-old");
      expect(t.leadActivity.some((a: any) => a.leadId === "L-old" && a.body === `@lead.mergedFrom: ${r.ref}`)).toBe(true);
      expect(t.metaEventOutbox.filter((e: any) => e.eventName !== "Lead")).toHaveLength(0);
    });

    it("merge keeps a placeholder staff already worked on: Lost with reason Duplicate, no Meta event", async () => {
      const older = { id: "L-old", name: "Rina", phone: PHONE, stageId: "st-new", source: "OTHER", createdAt: new Date(Date.now() - 5 * DAY), instagramHandle: "rina", company: "Rina Co", category: null };
      const { t, tap, leads } = setup({ leads: [older] });
      const r = await tap({ i: 720, instagram: "other.handle", brandName: "Placeholder Brand" });
      const placeholder = autoLeadsOf(t)[0];
      await leads.addActivity(placeholder.id, "NOTE", "Looked at their feed", "u1");
      const res: any = await leads.create({ phone: PHONE, adClickRef: r.ref } as any, "u1");
      expect(res.waitingOutcome).toMatchObject({ outcome: "merged", leadId: "L-old", placeholderDeleted: false });
      const kept = t.lead.find((l: any) => l.id === placeholder.id);
      expect(kept).toMatchObject({ stageId: "st-lost", lostReason: LOST_REASON_DUPLICATE, awaitingWhatsapp: false });
      expect(t.lead.find((l: any) => l.id === "L-old")).toMatchObject({ instagramHandle: "rina", company: "Rina Co" }); // not overwritten
      expect(t.leadActivity.find((a: any) => a.leadId === placeholder.id && a.type === "STAGE_CHANGE" && a.toStageId === "st-lost")).toMatchObject({ metaEvent: null, body: "@lead.mergedInto: Rina" });
      expect(t.metaEventOutbox.filter((e: any) => e.eventName !== "Lead")).toHaveLength(0);
    });

    it("'Link ad click code' on another lead's page merges the waiting lead holding that code into it", async () => {
      const older = { id: "L-old", name: "Rina", phone: PHONE, stageId: "st-new", source: "WHATSAPP_ORGANIC", createdAt: new Date(Date.now() - DAY), instagramHandle: null, company: null, category: null };
      const { t, tap, leads } = setup({ leads: [older] });
      const r = await tap({ i: 730, instagram: "kopi.senja" });
      const res: any = await leads.linkAdClick("L-old", r.ref.toLowerCase(), "u1");
      expect(res.waitingOutcome).toMatchObject({ outcome: "merged", leadId: "L-old", placeholderDeleted: true });
      expect(res.adClick).toMatchObject({ ref: r.ref });
      expect(t.lead).toHaveLength(1);
    });

    it("'Add phone' on the waiting lead fills it in (a), or merges it (b)", async () => {
      const { t, tap, leads } = setup({ leads: [{ id: "L-old", name: "Budi", phone: "+6285700000000", stageId: "st-new", source: "OTHER", createdAt: new Date(Date.now() - DAY), instagramHandle: null, company: null, category: null }] });
      await tap({ i: 740 });
      await tap({ i: 741 });
      const [a, b] = autoLeadsOf(t);
      const filled: any = await leads.addPhone(a.id, "0812 3456 7890", "u1");
      expect(filled.waitingOutcome.outcome).toBe("filled");
      expect(t.lead.find((l: any) => l.id === a.id).phone).toBe(PHONE);
      const merged: any = await leads.addPhone(b.id, "+62 857-0000-0000", "u1");
      expect(merged.waitingOutcome).toMatchObject({ outcome: "merged", leadId: "L-old" });
      await expect(leads.addPhone("L-old", PHONE, "u1")).rejects.toThrow(/tidak menunggu/);
    });

    it("WhatsApp Cloud API ingest: the first message with the Kode fills the waiting lead instead of creating one", async () => {
      restore = ((prev) => {
        const r = withEnv({ ...Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])), ...waEnv() });
        return () => { r(); prev(); };
      })(restore);
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const ctx = setup();
      const r = await ctx.tap({ i: 750, instagram: "kopi.senja" });
      const waiting = ctx.t.lead[0];
      const api = new WhatsAppApiService(ctx.prisma as any, new WhatsAppGraphClient(new FakeGraph().fetch as any));
      const ingest = new WhatsAppIngestService(ctx.prisma as any, ctx.leads, api);
      const res = await ingest.processPayload(
        messagesPayload({
          contacts: [{ wa_id: "6281234567890", profile: { name: "Rina Ayu" } }],
          messages: [{ from: "6281234567890", id: "wamid.KODE1", timestamp: unixAgo(1), type: "text", text: { body: `Halo Monomi\nKode: ${r.ref}` } }],
        }),
      );
      expect(res.leadsCreated).toBe(0);
      expect(ctx.t.lead).toHaveLength(1);
      expect(ctx.t.lead[0]).toMatchObject({ id: waiting.id, phone: PHONE, waId: "6281234567890", awaitingWhatsapp: false, name: "Rina Ayu" });
      expect(ctx.t.whatsAppContact[0].leadId).toBe(waiting.id);
      expect(ctx.t.leadActivity.some((a: any) => a.leadId === waiting.id && a.body?.startsWith("@wa.in: Halo Monomi"))).toBe(true);
      expect(ctx.t.metaEventOutbox.map((e: any) => e.eventName)).toEqual(["Lead"]);
    });
  });

  describe("merge target is an OPEN lead; a past client is not merged into", () => {
    const past = (id: string, stageId: string, daysAgo: number, name = id) => ({
      id, name, phone: PHONE, stageId, source: "WHATSAPP_ORGANIC", createdAt: new Date(Date.now() - daysAgo * DAY),
      instagramHandle: null, company: null, category: null,
    });

    it("open-lead merge: an open lead with the number takes the waiting lead (most recent of several)", async () => {
      const { t, tap, leads } = setup({ leads: [past("L-open-old", "st-new", 9), past("L-open-new", "st-qual", 2)] });
      const r = await tap({ i: 1000 });
      const parsed: any = await leads.parseQuickAdd(`+62 812 3456 7890
Kode: ${r.ref}`);
      expect(parsed.waitingMatch).toEqual({ mergeInto: { id: "L-open-new", name: "L-open-new" }, returningFrom: null });
      const res: any = await leads.create({ phone: PHONE, adClickRef: r.ref } as any, "u1");
      expect(res.waitingOutcome).toMatchObject({ outcome: "merged", leadId: "L-open-new", placeholderDeleted: true });
      expect(r.click.leadId).toBe("L-open-new");
      expect(autoLeadsOf(t)).toHaveLength(0);
    });

    it.each([
      ["Won", "st-won", "WON"],
      ["Lost", "st-lost", "LOST"],
    ])("%s-only number: the waiting lead gets the phone and a returning-client note; the closed lead is untouched", async (_label, stageId, type) => {
      const { t, tap, leads } = setup({ leads: [past("L-old-closed", stageId, 200, "Rina Lama"), past("L-older-closed", stageId, 400, "Rina Dulu")] });
      const r = await tap({ i: 1010 + (type === "WON" ? 0 : 1), instagram: "rina.again" });
      const waiting = autoLeadsOf(t)[0];
      const parsed: any = await leads.parseQuickAdd(`Rina +62 812 3456 7890
Kode: ${r.ref}`);
      expect(parsed.waitingMatch).toEqual({ mergeInto: null, returningFrom: { id: "L-old-closed", name: "Rina Lama", stageType: type } });

      const res: any = await leads.create({ name: "Rina", phone: PHONE, firstMessage: `Halo lagi
Kode: ${r.ref}`, adClickRef: r.ref } as any, "u1");
      expect(res.waitingOutcome).toEqual({
        outcome: "filled",
        leadId: waiting.id,
        returningFrom: { id: "L-old-closed", name: "Rina Lama", stageType: type },
      });
      expect(t.lead.find((l: any) => l.id === waiting.id)).toMatchObject({ phone: PHONE, awaitingWhatsapp: false, stageId: "st-new" });
      expect(r.click.leadId).toBe(waiting.id);
      expect(t.leadActivity.find((a: any) => a.leadId === waiting.id && a.body?.startsWith("@lead.returningClient"))).toMatchObject({
        type: "NOTE",
        body: `@lead.returningClient: L-old-closed ${type} Rina Lama`,
      });
      // the past lead keeps its stage, handle and history
      expect(t.lead.find((l: any) => l.id === "L-old-closed")).toMatchObject({ stageId, instagramHandle: null });
      expect(t.leadActivity.filter((a: any) => a.leadId === "L-old-closed")).toHaveLength(0);
      expect(t.metaEventOutbox.filter((e: any) => e.eventName !== "Lead")).toHaveLength(0);
    });

    it("mixed: one open and one Won lead with the number -> merges into the open lead", async () => {
      const { t, tap, leads } = setup({ leads: [past("L-open", "st-new", 30), past("L-won", "st-won", 1)] });
      const r = await tap({ i: 1020 });
      const res: any = await leads.create({ phone: PHONE, adClickRef: r.ref } as any, "u1");
      expect(res.waitingOutcome).toMatchObject({ outcome: "merged", leadId: "L-open" });
      expect(r.click.leadId).toBe("L-open");
      expect(t.lead.find((l: any) => l.id === "L-won").stageId).toBe("st-won");
      expect(t.leadActivity.some((a: any) => a.body?.startsWith("@lead.returningClient"))).toBe(false);
    });

    it("'Add phone' and WhatsApp ingest follow the same rule (a Won lead is not merged into)", async () => {
      const ctx = setup({ leads: [past("L-won", "st-won", 60, "Old Client")] });
      await ctx.tap({ i: 1030 });
      const [a] = autoLeadsOf(ctx.t);
      const res: any = await ctx.leads.addPhone(a.id, "0812-3456-7890", "u1");
      expect(res.waitingOutcome).toMatchObject({ outcome: "filled", leadId: a.id, returningFrom: { id: "L-won", stageType: "WON" } });

      const r2 = await ctx.tap({ i: 1031, instagram: "second.one" });
      const b = autoLeadsOf(ctx.t).find((l: any) => l.awaitingWhatsapp);
      ctx.t.lead.find((l: any) => l.id === "L-won").phone = "+6285711112222";
      const id = await ctx.leads.matchWaitingLeadFromChat({
        text: `Halo
Kode: ${r2.ref}`, waId: "6285711112222", name: "Old Client", activityBody: "@wa.in: Halo", existingLeadId: "L-won",
      });
      expect(id).toBe(b.id);
      expect(ctx.t.lead.find((l: any) => l.id === b.id)).toMatchObject({ phone: "+6285711112222", awaitingWhatsapp: false });
      expect(ctx.t.lead.find((l: any) => l.id === "L-won").stageId).toBe("st-won");
    });
  });

  describe("verifier fixes", () => {
    const ATTACKER_UA = "Mozilla/5.0 (X11; Linux x86_64) AttackerBrowser/9.9 Chrome/129.0 Safari/537.36";
    const fakeGraph = () =>
      new FakeGraph().on("POST", new RegExp(`/${PIXEL}/events$`), (c: any) => ({ json: { events_received: c.body.data.length } }));
    const phoneLead = (over: Record<string, unknown> = {}) => ({
      id: "L-phone", name: "Budi", phone: PHONE, instagramHandle: "budi.shop", stageId: "st-new", source: "WHATSAPP_ORGANIC",
      createdAt: new Date(Date.now() - DAY), company: null, category: null, ...over,
    });

    it("handle dedup cannot hijack a customer's Meta events: Purchase uses the original click's ip / ua / fbp", async () => {
      const ctx = setup();
      // the real customer: tap -> waiting lead -> chat with the Kode fills the phone
      const real = await ctx.tap({ i: 1100, instagram: "verify_brand.id", ip: "198.51.100.10" });
      const lead = autoLeadsOf(ctx.t)[0];
      await ctx.leads.create({ name: "Rina Ayu", phone: PHONE, adClickRef: real.ref } as any, "u1");
      expect(real.click.linkedVia).toBe("KODE");
      // an anonymous visitor types the same public handle from another device
      const evil = await ctx.tap({ i: 1101, instagram: "@Verify_Brand.ID", brandName: "Attacker", ip: "203.0.113.77", ua: ATTACKER_UA });
      evil.click.fbp = "fb.1.1700000000000.6666666666";
      expect(evil.click).toMatchObject({ leadId: lead.id, linkedVia: "HANDLE" });
      expect(ctx.t.lead.find((l: any) => l.id === lead.id)).toMatchObject({ company: null, name: "Rina Ayu" });
      await ctx.leads.moveStage(lead.id, "st-qual", "u1");
      await ctx.leads.moveStage(lead.id, "st-won", "u1");
      const stageRows = ctx.t.metaEventOutbox.filter((e: any) => e.leadId === lead.id && e.eventName !== "Lead");
      expect(stageRows.map((e: any) => [e.eventName, e.adClickId])).toEqual([
        ["QualifiedLead", real.click.id],
        ["Purchase", real.click.id],
      ]);
      const detail: any = await ctx.leads.get(lead.id);
      expect(detail.adClick.ref).toBe(real.ref);
      expect(detail.unconfirmedAdClickRefs).toEqual([evil.ref]);

      const graph = fakeGraph();
      await new WebCapiService(ctx.prisma as any, new WhatsAppGraphClient(graph.fetch as any)).run();
      const purchase = graph.calls.map((c) => c.body.data[0]).find((e: any) => e.event_name === "Purchase");
      expect(purchase.user_data).toMatchObject({
        client_ip_address: "198.51.100.10",
        client_user_agent: UA,
        fbp: "fb.1.1759900000000.1234567890",
        ph: [sha256("6281234567890")],
      });
      expect(JSON.stringify(purchase)).not.toMatch(/203\.0\.113\.77|AttackerBrowser|6666666666/);
    });

    it("a lead whose only clicks are HANDLE taps gets no website events from them; earlier events never move onto them", async () => {
      const { t, tap, leads, outbox, prisma } = setup({ leads: [phoneLead()] });
      await leads.moveStage("L-phone", "st-qual", "u1"); // before the tap: business-messaging row
      await tap({ i: 1110, instagram: "budi.shop" });
      expect(t.adClick.find((c: any) => c.ref === refFor(1110)).linkedVia).toBe("HANDLE");
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ route: "BUSINESS_MESSAGING", adClickId: null });
      expect(await outbox.queueEvent(prisma as any, { id: "L-phone", ctwaClid: null }, "Purchase")).toBe(true);
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "Purchase")).toMatchObject({ route: "BUSINESS_MESSAGING", adClickId: null });
      expect(((await leads.get("L-phone")) as any).adClick).toBeNull();
    });

    it("a Kode confirmed by staff (or the chat) upgrades a HANDLE tap to KODE; pending events move onto it", async () => {
      const { t, tap, leads } = setup({ leads: [phoneLead()] });
      const r = await tap({ i: 1120, instagram: "budi.shop" });
      await leads.moveStage("L-phone", "st-qual", "u1");
      await leads.linkAdClick("L-phone", r.ref, "u1");
      expect(r.click.linkedVia).toBe("KODE");
      expect(t.metaEventOutbox.find((e: any) => e.eventName === "QualifiedLead")).toMatchObject({ route: "WEBSITE", adClickId: r.click.id });
    });

    it("WhatsApp ingest: a Kode chat from a number whose only lead is Won fills the waiting lead and never touches the Won lead", async () => {
      restore = ((prev) => {
        const r = withEnv({ ...Object.fromEntries(WA_ENV_KEYS.map((k) => [k, undefined])), ...waEnv() });
        return () => { r(); prev(); };
      })(restore);
      jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      const old = new Date(Date.now() - 200 * DAY);
      const ctx = setup({
        leads: [{ id: "L-won", name: "Old Client", phone: "+6285711112222", waId: "6285711112222", stageId: "st-won", source: "WHATSAPP_ORGANIC", createdAt: old, firstResponseAt: old, company: null, category: null, instagramHandle: null }],
      });
      const r = await ctx.tap({ i: 1130, instagram: "back.again" });
      const waiting = autoLeadsOf(ctx.t)[0];
      const api = new WhatsAppApiService(ctx.prisma as any, new WhatsAppGraphClient(new FakeGraph().fetch as any));
      const ingest = new WhatsAppIngestService(ctx.prisma as any, ctx.leads, api);
      await ingest.processPayload(
        messagesPayload({
          contacts: [{ wa_id: "6285711112222", profile: { name: "Old Client" } }],
          messages: [{ from: "6285711112222", id: "wamid.K1", timestamp: unixAgo(1), type: "text", text: { body: `Halo lagi\nKode: ${r.ref}` } }],
        }),
      );
      const won = ctx.t.lead.find((l: any) => l.id === "L-won");
      expect(won.lastContactAt.getTime()).toBe(old.getTime());
      expect(ctx.t.leadActivity.filter((a: any) => a.leadId === "L-won")).toHaveLength(0);
      expect(ctx.t.lead.find((l: any) => l.id === waiting.id)).toMatchObject({ phone: "+6285711112222", awaitingWhatsapp: false });
      expect(ctx.t.whatsAppContact[0].leadId).toBe(waiting.id);
      expect(ctx.t.leadActivity.filter((a: any) => a.leadId === waiting.id && a.type === "WHATSAPP").map((a: any) => a.body)).toEqual([`@wa.in: Halo lagi Kode: ${r.ref}`]);
      expect(ctx.t.leadActivity.some((a: any) => a.leadId === waiting.id && a.body?.startsWith("@lead.returningClient: L-won WON"))).toBe(true);
      expect(r.click.linkedVia).toBe("KODE");
    });

    it("stale cleanup only closes untouched waiting leads still in New (no stage move, note or assignment by staff)", async () => {
      const { t, tap, autoLeads, leads } = setup();
      for (const i of [1140, 1141, 1142, 1143]) await tap({ i });
      const [untouched, moved, noted, assigned] = autoLeadsOf(t);
      await leads.moveStage(moved.id, "st-qual", "u1");
      await leads.moveStage(moved.id, "st-new", "u1"); // back in New, but touched by staff
      await leads.addActivity(noted.id, "NOTE", "Sent them a DM on Instagram", "u1");
      t.user.push({ id: "u1", name: "Staff", isActive: true });
      await leads.assign(assigned.id, "u1", "u1");
      for (const l of autoLeadsOf(t)) l.createdAt = new Date(Date.now() - 40 * DAY);
      expect(await autoLeads.closeStale()).toBe(1);
      expect(t.lead.find((l: any) => l.id === untouched.id)).toMatchObject({ stageId: "st-lost", lostReason: LOST_REASON_NEVER_SENT_WHATSAPP });
      for (const l of [moved, noted, assigned]) {
        const row = t.lead.find((x: any) => x.id === l.id);
        expect(row.lostReason ?? null).toBeNull();
        expect(row.awaitingWhatsapp).toBe(true);
      }
      // a waiting lead staff moved on (not in New) is not closed either
      const qual = autoLeadsOf(t).find((l: any) => l.id === moved.id);
      qual.stageId = "st-qual";
      t.leadActivity = t.leadActivity.filter((a: any) => a.leadId !== moved.id || !a.actorId);
      expect(await autoLeads.closeStale()).toBe(0);
    });

    it("inbox: linking a conversation to a waiting lead applies the quick-add rule (open lead -> merge, Won -> fill + returning, bad number -> refused)", async () => {
      const ctx = setup({
        leads: [
          { id: "L-open", name: "Open One", phone: "+6281300000001", stageId: "st-new", source: "OTHER", createdAt: new Date(Date.now() - DAY), instagramHandle: null, company: null, category: null },
          { id: "L-won", name: "Won One", phone: "+6281300000002", stageId: "st-won", source: "OTHER", createdAt: new Date(Date.now() - 9 * DAY), instagramHandle: null, company: null, category: null },
        ],
      });
      const conv = (n: number, waId: string) => {
        ctx.t.whatsAppContact.push({ id: `ct${n}`, waId, phone: null, leadId: null, profileName: "X", phoneBookName: null });
        ctx.t.whatsAppConversation.push({ id: `cv${n}`, contactId: `ct${n}`, unreadCount: 0, status: "OPEN", assignedToId: null, lastReadReceiptFor: null, lastMessageAt: new Date(), lastMessagePreview: "Halo", lastInboundAt: new Date(), freeEntryUntil: null });
      };
      conv(1, "6281300000001");
      conv(2, "6281300000002");
      conv(3, "12");
      for (const i of [1150, 1151, 1152]) await ctx.tap({ i });
      const [w1, w2, w3] = autoLeadsOf(ctx.t);
      const api = new WhatsAppApiService(ctx.prisma as any, new WhatsAppGraphClient(new FakeGraph().fetch as any));
      const inbox = new WhatsAppInboxService(ctx.prisma as any, api, new WhatsAppIngestService(ctx.prisma as any, ctx.leads, api), ctx.leads);

      await inbox.linkLead("cv1", w1.id, "u1");
      expect(ctx.t.lead.some((l: any) => l.id === w1.id)).toBe(false); // untouched placeholder merged away
      expect(ctx.t.whatsAppContact.find((c: any) => c.id === "ct1").leadId).toBe("L-open");

      await inbox.linkLead("cv2", w2.id, "u1");
      expect(ctx.t.lead.find((l: any) => l.id === w2.id)).toMatchObject({ phone: "+6281300000002", awaitingWhatsapp: false, stageId: "st-new" });
      expect(ctx.t.leadActivity.some((a: any) => a.leadId === w2.id && a.body?.startsWith("@lead.returningClient: L-won WON"))).toBe(true);
      expect(ctx.t.whatsAppContact.find((c: any) => c.id === "ct2").leadId).toBe(w2.id);

      await expect(inbox.linkLead("cv3", w3.id, "u1")).rejects.toThrow(/tidak valid/);
      expect(ctx.t.lead.find((l: any) => l.id === w3.id)).toMatchObject({ phone: null, awaitingWhatsapp: true });
      expect(ctx.t.whatsAppContact.find((c: any) => c.id === "ct3").leadId).toBeNull();
    });

    it("merge carries over a QualifiedLead the placeholder already sent: the target does not send it again", async () => {
      const older = { id: "L-old", name: "Rina", phone: PHONE, stageId: "st-new", source: "OTHER", createdAt: new Date(Date.now() - 5 * DAY), instagramHandle: null, company: null, category: null };
      const { t, tap, leads, outbox, prisma } = setup({ leads: [older] });
      const r = await tap({ i: 1160 });
      const placeholder = autoLeadsOf(t)[0];
      await leads.moveStage(placeholder.id, "st-qual", "u1");
      const sent = t.metaEventOutbox.find((e: any) => e.leadId === placeholder.id && e.eventName === "QualifiedLead");
      sent.status = "SENT";
      const res: any = await leads.create({ phone: PHONE, adClickRef: r.ref } as any, "u1");
      expect(res.waitingOutcome).toMatchObject({ outcome: "merged", leadId: "L-old", placeholderDeleted: false });
      expect(t.metaEventOutbox.find((e: any) => e.leadId === "L-old" && e.eventName === "QualifiedLead")).toMatchObject({
        status: "SKIPPED",
        lastError: SKIP_SENT_BEFORE_MERGE,
        dedupeKey: "L-old:QualifiedLead",
      });
      expect(await outbox.queueEvent(prisma as any, { id: "L-old", ctwaClid: null }, "QualifiedLead")).toBe(false);
      await leads.moveStage("L-old", "st-qual", "u1");
      expect(t.metaEventOutbox.filter((e: any) => e.eventName === "QualifiedLead" && e.status !== "SKIPPED")).toHaveLength(1);
      // nothing was carried for an event the placeholder never had
      expect(t.metaEventOutbox.filter((e: any) => e.leadId === "L-old" && e.eventName === "Purchase")).toHaveLength(0);
    });

    it("merge does not carry over a FAILED / SKIPPED placeholder event (the target may still send it)", async () => {
      const older = { id: "L-old", name: "Rina", phone: PHONE, stageId: "st-new", source: "OTHER", createdAt: new Date(Date.now() - 5 * DAY), instagramHandle: null, company: null, category: null };
      const { t, tap, leads } = setup({ leads: [older] });
      const r = await tap({ i: 1170 });
      const placeholder = autoLeadsOf(t)[0];
      await leads.moveStage(placeholder.id, "st-qual", "u1");
      t.metaEventOutbox.find((e: any) => e.leadId === placeholder.id && e.eventName === "QualifiedLead").status = "FAILED";
      await leads.create({ phone: PHONE, adClickRef: r.ref } as any, "u1");
      expect(t.metaEventOutbox.filter((e: any) => e.leadId === "L-old" && e.eventName === "QualifiedLead")).toHaveLength(0);
    });
  });

  describe("metrics", () => {
    it("waiting leads are not 'unanswered > 15 min', not in the badge total, and not in response-time stats", async () => {
      const { t, tap, leads, stats } = setup();
      await tap({ i: 800 });
      const waiting = t.lead[0];
      waiting.firstContactAt = new Date(Date.now() - 3 * 3600_000);
      waiting.createdAt = new Date(Date.now() - 3 * 3600_000);
      // a legacy / odd row: a waiting lead with a response stamp must still not count
      waiting.firstResponseAt = new Date(Date.now() - 3 * 3600_000 + 60_000);
      t.lead.push({ id: "L-chat", name: "Budi", phone: PHONE, stageId: "st-new", source: "WHATSAPP_ORGANIC", createdAt: new Date(Date.now() - 2 * 3600_000), firstContactAt: new Date(Date.now() - 2 * 3600_000), firstResponseAt: null, awaitingWhatsapp: false, lastContactAt: new Date() });

      const list: any = await leads.list({ uncontacted: true } as any, null);
      expect(list.items.map((l: any) => l.id)).toEqual(["L-chat"]);
      const all: any = await leads.list({} as any, null);
      expect(all.items.find((l: any) => l.id === waiting.id)).toMatchObject({ waitingMinutes: null, isUncontacted: false });
      const onlyWaiting: any = await leads.list({ awaiting: true } as any, null);
      expect(onlyWaiting.items.map((l: any) => l.id)).toEqual([waiting.id]);

      const badges = await leads.badges();
      expect(badges).toMatchObject({ uncontacted: 1, awaitingWhatsapp: 1, total: 1 });

      const s: any = await stats.stats({});
      expect(s.response.answered).toBe(0);
      expect(s.response.avgMinutes).toBeNull();
      expect(s.response.uncontactedNow).toBe(1);
    });

    it("tracking summary counts auto-created leads of the last 7 days", async () => {
      const { t, tap, clicks } = setup();
      await tap({ i: 810 });
      await tap({ i: 811 });
      t.lead[1].createdAt = new Date(Date.now() - 8 * DAY);
      const s: any = await clicks.stats();
      expect(s.autoLeads7d).toBe(1);
      expect(s.waitingNow).toBe(2);
    });
  });

  describe("stale cleanup", () => {
    it("waiting leads without a phone after 30 days move to Lost 'Never sent WhatsApp', the record is kept, no Meta event", async () => {
      const { t, tap, clicks } = setup();
      await tap({ i: 900 });
      await tap({ i: 901 });
      const [old, recent] = autoLeadsOf(t);
      old.createdAt = new Date(Date.now() - 31 * DAY);
      const outboxBefore = t.metaEventOutbox.length;
      await clicks.purgeCron(); // the existing nightly job
      expect(t.lead.find((l: any) => l.id === old.id)).toMatchObject({
        stageId: "st-lost",
        lostReason: LOST_REASON_NEVER_SENT_WHATSAPP,
        awaitingWhatsapp: false,
      });
      expect(t.lead.find((l: any) => l.id === recent.id)).toMatchObject({ stageId: "st-new", awaitingWhatsapp: true });
      expect(t.metaEventOutbox).toHaveLength(outboxBefore);
      expect(t.leadActivity.find((a: any) => a.leadId === old.id && a.body === "@lead.neverSentWhatsapp")).toMatchObject({ metaEvent: null, toStageId: "st-lost" });
      // the click stays linked (not purged as an unlinked tap)
      expect(t.adClick.find((c: any) => c.leadId === old.id)).toBeTruthy();
    });

    it("honours AUTO_LEAD_STALE_DAYS", async () => {
      const { t, tap, autoLeads } = setup();
      await tap({ i: 910 });
      t.lead[0].createdAt = new Date(Date.now() - 8 * DAY);
      expect(await autoLeads.closeStale(new Date(), 30)).toBe(0);
      expect(await autoLeads.closeStale(new Date(), 7)).toBe(1);
    });
  });

  describe("nullable phone in every consumer", () => {
    it("duplicate check, search, convert, business-messaging payload, Meta payload and closing the lead all accept phone = null", async () => {
      const { t, tap, leads, outbox } = setup();
      await tap({ i: 950, instagram: "nophone.brand", brandName: "No Phone Co" });
      const lead = t.lead[0];
      expect(normalizePhone(null)).toBeNull();
      expect(await leads.findDuplicate("")).toBeNull();
      // search by handle / name works without a phone
      expect((await leads.list({ q: "@nophone" } as any, null)).items).toHaveLength(1);
      expect((await leads.list({ q: "0812" } as any, null)).items).toHaveLength(0);
      // business-messaging payload: no wa_id when there is no number
      expect(outbox.buildPayload({ id: lead.id, phone: null, waId: null }, "QualifiedLead", new Date()).user_data).toEqual({});
      // convert: client without a phone, named after the brand
      const prismaAny = (leads as any).prisma;
      prismaAny.projectTypeConfig = { findFirst: async () => null };
      const res = await leads.convert(lead.id, { createQuotation: false, createProject: false } as any, "u1");
      expect(res.clientCreated).toBe(true);
      expect((leads as any).clients.create).toHaveBeenCalledWith(expect.objectContaining({ name: "No Phone Co", phone: undefined }));
      // detail page payload
      const detail: any = await leads.get(lead.id);
      expect(detail.phone).toBeNull();
      expect(detail.adClick).toMatchObject({ ref: refFor(950), brandName: "No Phone Co" });
      expect(detail.adClick.id).toBeUndefined();
      // Won closes the waiting state too (no wa.me link etc. needed)
      await leads.moveStage(lead.id, "st-won", "u1");
      expect(t.lead[0].awaitingWhatsapp).toBe(false);
    });
  });
});
