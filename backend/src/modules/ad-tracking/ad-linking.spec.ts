import { ConflictException, NotFoundException } from "@nestjs/common";
import { chooseRoute, CrmOutboxService } from "../crm/crm-outbox.service";
import { CrmFlowService } from "../crm/crm-flow.service";
import { CrmLeadsService } from "../crm/crm-leads.service";
import { AdClickService, AD_CLICK_RETENTION_DAYS } from "./ad-click.service";
import { FakePrisma } from "../whatsapp/testing/whatsapp-fakes.helper-spec";
import { webSkipReason } from "./web-capi.payload";
import { skipReason as bmSkipReason, SKIP_NO_CLID } from "../whatsapp/meta-capi.service";

const DAY = 86_400_000;
const REF = "K7QM2X";
const settings: any = { getThresholdMinutes: async () => 15 };

function setup(opts: { clicks?: any[]; leads?: any[]; stageMeta?: string | null } = {}) {
  const prisma = new FakePrisma({
    leadStage: [
      { id: "st-new", key: "new", name: "New", type: "OPEN", order: 1, isActive: true, metaEvent: null },
      { id: "st-qual", key: "qualified", name: "Qualified", type: "OPEN", order: 2, isActive: true, metaEvent: "QualifiedLead" },
    ],
    campaign: [{ id: "cmp1", code: "FB-OKT1", name: "Oktober 1" }],
    lead: opts.leads ?? [],
    adClick: opts.clicks ?? [
      {
        id: "c1",
        ref: REF,
        eventId: "evt-1",
        createdAt: new Date(),
        pageUrl: "https://link.monomiagency.com/",
        campaignCode: "FB-OKT1",
        leadId: null,
      },
    ],
  });
  const outbox = new CrmOutboxService();
  const adClicks = new AdClickService(prisma as any);
  const flow = new CrmFlowService(prisma as any, outbox);
  const svc = new CrmLeadsService(prisma as any, flow, outbox, settings, {} as any, {} as any, {} as any, adClicks);
  return { prisma, svc, adClicks, flow, outbox, t: prisma.tables };
}

describe("route selection", () => {
  it("ctwaClid -> business_messaging (never both); linked click -> website; neither -> business_messaging row that is skipped", () => {
    expect(chooseRoute({ ctwaClid: "ARA" }, true)).toBe("BUSINESS_MESSAGING");
    expect(chooseRoute({ ctwaClid: "ARA" }, false)).toBe("BUSINESS_MESSAGING");
    expect(chooseRoute({ ctwaClid: null }, true)).toBe("WEBSITE");
    expect(chooseRoute({ ctwaClid: null }, false)).toBe("BUSINESS_MESSAGING");
    const now = new Date();
    const row = { eventTime: now };
    // neither: the business-messaging sender skips it for lack of a ctwa_clid
    expect(bmSkipReason({ ...row, lead: { ctwaClid: null } }, now)).toBe(SKIP_NO_CLID);
    // website sender: a ctwa lead is skipped even if a click exists
    expect(webSkipReason({ eventName: "Purchase", eventTime: now, adClick: {}, lead: { ctwaClid: "ARA" } }, now)).toMatch(/Click-to-WhatsApp/);
  });

  it("queueEvent picks the route from the lead", async () => {
    const { prisma, outbox, t } = setup({
      leads: [
        { id: "L-ctwa", ctwaClid: "ARA" },
        { id: "L-web", ctwaClid: null },
        { id: "L-none", ctwaClid: null },
      ],
      clicks: [{ id: "c1", ref: REF, eventId: "e", createdAt: new Date(), leadId: "L-web" }],
    });
    await outbox.queueEvent(prisma as any, { id: "L-ctwa", ctwaClid: "ARA" }, "QualifiedLead");
    await outbox.queueEvent(prisma as any, { id: "L-web", ctwaClid: null }, "QualifiedLead");
    await outbox.queueEvent(prisma as any, { id: "L-none", ctwaClid: null }, "QualifiedLead");
    const by = Object.fromEntries(t.metaEventOutbox.map((r: any) => [r.leadId, r]));
    expect(by["L-ctwa"]).toMatchObject({ route: "BUSINESS_MESSAGING", adClickId: null });
    expect(by["L-web"]).toMatchObject({ route: "WEBSITE", adClickId: "c1" });
    expect(by["L-none"]).toMatchObject({ route: "BUSINESS_MESSAGING" });
  });

  it("a website lead's LeadSubmitted is not queued (the Lead went out at click time)", async () => {
    const { prisma, outbox, t } = setup({
      leads: [{ id: "L-web", ctwaClid: null }],
      clicks: [{ id: "c1", ref: REF, eventId: "e", createdAt: new Date(), leadId: "L-web" }],
    });
    expect(await outbox.queueEvent(prisma as any, { id: "L-web", ctwaClid: null }, "LeadSubmitted")).toBe(false);
    expect(t.metaEventOutbox).toHaveLength(0);
  });
});

describe("quick-add parse + create with a pasted Kode", () => {
  const chat = `Budi Santoso +62 812-3456-7890\nHalo kak, mau tanya paket foto produk.\n\nKode: ${REF}`;

  it("parse shows the ad click (campaign filled from the click)", async () => {
    const { svc } = setup();
    const p: any = await svc.parseQuickAdd(chat);
    expect(p.adClick).toMatchObject({ ref: REF, available: true, campaignCode: "FB-OKT1" });
    expect(p.campaign).toMatchObject({ code: "FB-OKT1" });
    expect(p.phone).toBe("+6281234567890");
  });

  it("parse reports a click that already belongs to another lead as unavailable; unknown codes give none", async () => {
    const { svc } = setup({ clicks: [{ id: "c1", ref: REF, eventId: "e", createdAt: new Date(), leadId: "other" }] });
    expect(((await svc.parseQuickAdd(chat)) as any).adClick.available).toBe(false);
    const { svc: s2 } = setup({ clicks: [] });
    expect(((await s2.parseQuickAdd(chat)) as any).adClick).toBeNull();
    expect(((await s2.parseQuickAdd("halo tanpa kode")) as any).adClick).toBeNull();
  });

  it("create links the click, sets source WEBSITE + campaign, writes the timeline note, queues no LeadSubmitted", async () => {
    const { svc, t } = setup();
    const lead: any = await svc.create(
      { name: "Budi Santoso", phone: "+6281234567890", firstMessage: chat, adClickRef: REF } as any,
      "u1",
    );
    expect(t.lead[0]).toMatchObject({ source: "WEBSITE", campaignCode: "FB-OKT1", campaignId: "cmp1" });
    expect(t.adClick[0]).toMatchObject({ leadId: t.lead[0].id });
    expect(t.adClick[0].linkedAt).toBeInstanceOf(Date);
    expect(t.metaEventOutbox.filter((r: any) => r.eventName === "LeadSubmitted")).toHaveLength(0);
    expect(t.leadActivity.some((a: any) => a.body === `@lead.adClickLinked: ${REF}`)).toBe(true);
    expect(lead).toBeTruthy();
  });

  it("create auto-links from the Kode inside the pasted message even without the explicit field (WhatsApp ingest path)", async () => {
    const { svc, t } = setup();
    await svc.createFromWhatsApp({
      waId: "6281234567890",
      name: "Budi",
      firstMessage: `Halo, saya mau tanya.\n\nKode: ${REF}`,
      firstContactAt: new Date(),
      source: "WHATSAPP_ORGANIC",
      campaignId: null,
      campaignCode: null,
      adId: null,
      ctwaClid: null,
      referral: null,
    });
    expect(t.lead[0].source).toBe("WEBSITE");
    expect(t.adClick[0].leadId).toBe(t.lead[0].id);
  });

  it("a click that is already linked can't be linked to a second lead; the lead is still created", async () => {
    const { svc, t } = setup({ clicks: [{ id: "c1", ref: REF, eventId: "e", createdAt: new Date(), leadId: "someone" }] });
    await svc.create({ name: "Dewi", phone: "+6281111111111", firstMessage: chat, adClickRef: REF } as any, "u1");
    expect(t.lead).toHaveLength(1);
    expect(t.lead[0].source).not.toBe("WEBSITE");
    expect(t.adClick[0].leadId).toBe("someone");
  });

  it("a CTWA lead (has ctwa_clid) is never re-routed to the website route", async () => {
    const { svc, t } = setup();
    await svc.create({ name: "X", phone: "+6281222222222", firstMessage: chat, ctwaClid: "ARAclid", source: "WHATSAPP_CTWA" } as any, "u1");
    expect(t.lead[0].source).toBe("WHATSAPP_CTWA");
    expect(t.adClick[0].leadId).toBeNull();
  });

  it("created straight in Qualified with a Kode -> the QualifiedLead event is on the website route", async () => {
    const { svc, t } = setup();
    await svc.create({ name: "Budi", phone: "+6281234567890", firstMessage: chat, stageId: "st-qual" } as any, "u1");
    const q = t.metaEventOutbox.find((r: any) => r.eventName === "QualifiedLead");
    expect(q).toMatchObject({ route: "WEBSITE", adClickId: "c1", leadId: t.lead[0].id });
  });
});

describe("downstream stage events for a website-linked lead", () => {
  it("moving to Qualified queues a website QualifiedLead (event time = the stage change)", async () => {
    const { svc, flow, t } = setup();
    await svc.create({ name: "Budi", phone: "+6281234567890", firstMessage: `x\nKode: ${REF}` } as any, "u1");
    const before = Date.now();
    await flow.changeStage(t.lead[0].id, "st-qual", "u1");
    const row = t.metaEventOutbox.find((r: any) => r.eventName === "QualifiedLead");
    expect(row).toMatchObject({ route: "WEBSITE", status: "PENDING_CONFIG", adClickId: "c1" });
    expect(row!.eventTime.getTime()).toBeGreaterThanOrEqual(before - 5);
  });
});

describe("manual link (lead detail) + re-routing of earlier events", () => {
  it("links, marks WEBSITE, fills the campaign, re-routes skipped/pending QualifiedLead, not LeadSubmitted or sent rows", async () => {
    const { adClicks, t } = setup({
      leads: [{ id: "L1", ctwaClid: null, source: "WHATSAPP_ORGANIC", campaignId: null, campaignCode: null }],
    });
    t.metaEventOutbox.push(
      { id: "o1", leadId: "L1", route: "BUSINESS_MESSAGING", eventName: "QualifiedLead", status: "SKIPPED", dedupeKey: "L1:QualifiedLead", lastError: "no ctwa_clid" },
      { id: "o2", leadId: "L1", route: "BUSINESS_MESSAGING", eventName: "LeadSubmitted", status: "SKIPPED", dedupeKey: "L1:LeadSubmitted" },
      { id: "o3", leadId: "L1", route: "BUSINESS_MESSAGING", eventName: "Purchase", status: "SENT", dedupeKey: "L1:Purchase" },
    );
    expect(await adClicks.linkLead("L1", "k7qm2x", "u1")).toBe("linked");
    expect(t.lead[0]).toMatchObject({ source: "WEBSITE", campaignCode: "FB-OKT1", campaignId: "cmp1" });
    const o = (id: string) => t.metaEventOutbox.find((r: any) => r.id === id);
    expect(o("o1")).toMatchObject({ route: "WEBSITE", status: "PENDING_CONFIG", adClickId: "c1", lastError: null });
    expect(o("o2")).toMatchObject({ route: "BUSINESS_MESSAGING", status: "SKIPPED" });
    expect(o("o3")).toMatchObject({ route: "BUSINESS_MESSAGING", status: "SENT" });
    expect(t.leadActivity.some((a: any) => a.leadId === "L1" && a.body === `@lead.adClickLinked: ${REF}`)).toBe(true);
    // linking the same code to the same lead again is a no-op
    expect(await adClicks.linkLead("L1", REF, "u1")).toBe("linked");
  });

  it("refuses a code that belongs to another lead, and unknown codes", async () => {
    const { adClicks, svc, t } = setup({
      leads: [{ id: "L1", ctwaClid: null }, { id: "L2", ctwaClid: null }],
    });
    expect(await adClicks.linkLead("L1", REF, null)).toBe("linked");
    expect(await adClicks.linkLead("L2", REF, null)).toBe("taken");
    expect(t.adClick[0].leadId).toBe("L1");
    expect(await adClicks.linkLead("L2", "ZZZZ22", null)).toBe("not_found");
    expect(await adClicks.linkLead("L2", "garbage", null)).toBe("not_found");
    await expect(svc.linkAdClick("L2", REF, null)).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.linkAdClick("L2", "ZZZZ22", null)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("a lead can hold only one click", async () => {
    const { adClicks, t } = setup({
      leads: [{ id: "L1", ctwaClid: null }],
      clicks: [
        { id: "c1", ref: REF, eventId: "e1", createdAt: new Date(), leadId: null },
        { id: "c2", ref: "ABCD23", eventId: "e2", createdAt: new Date(), leadId: null },
      ],
    });
    expect(await adClicks.linkLead("L1", REF, null)).toBe("linked");
    expect(await adClicks.linkLead("L1", "ABCD23", null)).toBe("taken");
    expect(t.adClick[1].leadId).toBeNull();
  });

  it("does not flip a CTWA lead's source", async () => {
    const { adClicks, t } = setup({ leads: [{ id: "L1", ctwaClid: "ARA", source: "WHATSAPP_CTWA" }] });
    await adClicks.linkLead("L1", REF, null);
    expect(t.lead[0].source).toBe("WHATSAPP_CTWA");
  });
});

describe("retention", () => {
  it("purges unlinked clicks older than 30 days, keeps linked and recent ones", async () => {
    const now = new Date();
    const { adClicks, t } = setup({
      clicks: [
        { id: "old", ref: "AAAA22", eventId: "a", createdAt: new Date(now.getTime() - (AD_CLICK_RETENTION_DAYS + 1) * DAY), leadId: null },
        { id: "oldLinked", ref: "BBBB22", eventId: "b", createdAt: new Date(now.getTime() - 90 * DAY), leadId: "L1" },
        { id: "fresh", ref: "CCCC22", eventId: "c", createdAt: new Date(now.getTime() - 2 * DAY), leadId: null },
      ],
    });
    expect(await adClicks.purgeUnlinked(now)).toBe(1);
    expect(t.adClick.map((c: any) => c.id).sort()).toEqual(["fresh", "oldLinked"]);
  });
});
