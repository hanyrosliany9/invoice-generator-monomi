import { CrmStatsService, leadRevenue, parseRange } from "./crm-stats.service";

const stages = [
  { id: "s1", key: "NEW", name: "New", order: 1, type: "OPEN", isActive: true },
  { id: "s2", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN", isActive: true },
  { id: "s3", key: "MEETING", name: "Meeting", order: 3, type: "OPEN", isActive: true },
  { id: "s4", key: "PROPOSAL", name: "Proposal", order: 4, type: "OPEN", isActive: true },
  { id: "s5", key: "WON", name: "Won", order: 5, type: "WON", isActive: true },
  { id: "s6", key: "LOST", name: "Lost", order: 6, type: "LOST", isActive: true },
];
const st = (key: string) => stages.find((s) => s.key === key)!;
const t = (min: number) => new Date(Date.UTC(2026, 9, 10, 3, min));

function lead(id: string, key: string, over: any = {}) {
  const current = st(key);
  return {
    id, createdAt: t(0), firstContactAt: t(0), firstResponseAt: null,
    assignedToId: "u1", assignedTo: { id: "u1", name: "Andi" },
    source: "WHATSAPP_CTWA", campaignId: "c1",
    stage: { id: current.id, type: current.type, order: current.order },
    activities: [] as any[], quotation: null as any,
    ...over,
  };
}
const hist = (...keys: string[]) => keys.map((k) => ({ toStage: { order: st(k).order, type: st(k).type } }));

describe("leadRevenue (no double counting)", () => {
  it("counts an approved quotation once even when invoices are paid", () => {
    const q = { status: "APPROVED", totalAmount: 10_000_000, invoices: [{ status: "PAID", totalAmount: 4_000_000 }, { status: "SENT", totalAmount: 6_000_000 }] };
    expect(leadRevenue({ quotation: q })).toEqual({ revenue: 10_000_000, paid: 4_000_000 });
  });
  it("falls back to paid invoices when the quotation is not approved", () => {
    const q = { status: "SENT", totalAmount: 10_000_000, invoices: [{ status: "PAID", totalAmount: 2_500_000 }] };
    expect(leadRevenue({ quotation: q })).toEqual({ revenue: 2_500_000, paid: 2_500_000 });
  });
  it("is zero without a quotation", () => {
    expect(leadRevenue({ quotation: null })).toEqual({ revenue: 0, paid: 0 });
  });
});

describe("parseRange", () => {
  it("treats date-only values as whole WIB days", () => {
    const r = parseRange("2026-10-01", "2026-10-31");
    expect(r.from.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-10-31T16:59:59.999Z");
  });
});

describe("CrmStatsService.stats", () => {
  function build(leads: any[], spends: any[], metaLinked: any[] = [], metaDaily: any[] = []) {
    const prisma: any = {
      leadStage: { findMany: jest.fn(async () => stages) },
      lead: { findMany: jest.fn(async () => leads), count: jest.fn(async (a: any) => (a.where?.firstResponseAt === null ? 3 : 7)) },
      campaignSpend: { findMany: jest.fn(async () => spends) },
      campaign: {
        findMany: jest.fn(async (a: any) =>
          a?.where?.metaCampaignId
            ? metaLinked
            : [{ id: "c1", name: "October Video Promo", code: "FB-OKT1" }, { id: "c2", name: "Reels", code: "IG-R" }],
        ),
      },
      metaAdsSyncState: { findUnique: jest.fn(async () => null) },
      metaAdsInsightDaily: { findMany: jest.fn(async () => metaDaily) },
    };
    const settings: any = { getThresholdMinutes: jest.fn(async () => 15) };
    return new CrmStatsService(prisma, settings);
  }

  const leads = [
    lead("a", "NEW", { firstResponseAt: t(4) }),
    lead("b", "NEW", { campaignId: "c2", source: "REFERRAL" }),
    lead("c", "QUALIFIED", { firstResponseAt: t(10), activities: hist("QUALIFIED"), assignedTo: { id: "u2", name: "Sinta" }, assignedToId: "u2" }),
    lead("d", "LOST", { firstResponseAt: t(20), activities: hist("QUALIFIED", "LOST") }),
    lead("e", "WON", {
      firstResponseAt: t(2),
      activities: hist("QUALIFIED", "MEETING", "PROPOSAL", "WON"),
      quotation: { status: "APPROVED", totalAmount: 20_000_000, invoices: [{ status: "PAID", totalAmount: 8_000_000 }] },
    }),
    lead("f", "WON", {
      firstResponseAt: t(6),
      activities: hist("QUALIFIED", "WON"),
      quotation: { status: "SENT", totalAmount: 5_000_000, invoices: [{ status: "PAID", totalAmount: 5_000_000 }] },
    }),
  ];
  // 3,000,000 over Oct 1-10; the report window below covers Oct 1-31 -> fully inside; 1,000,000 for c2
  const spends = [
    { campaignId: "c1", amount: 3_000_000, dateFrom: new Date("2026-10-01T00:00:00Z"), dateTo: new Date("2026-10-10T00:00:00Z") },
    { campaignId: "c2", amount: 1_000_000, dateFrom: new Date("2026-10-05T00:00:00Z"), dateTo: new Date("2026-10-05T00:00:00Z") },
  ];

  it("computes funnel, conversion, revenue, spend and cost metrics", async () => {
    const s = await build(leads, spends).stats({ from: "2026-10-01", to: "2026-10-31" });
    expect(s.leads).toBe(6);
    expect(s.qualified).toBe(4); // c, d, e, f reached Qualified
    expect(s.meeting).toBe(2); // e, and f (progression: skipped stages count as passed)
    expect(s.proposal).toBe(2);
    expect(s.won).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.conversionPct).toBe(33.3);
    expect(s.funnel.map((f) => f.count)).toEqual([6, 4, 2, 2, 2]); // New, Qualified, Meeting, Proposal, Won
    expect(s.revenue).toBe(25_000_000); // 20M approved + 5M paid
    expect(s.revenuePaid).toBe(13_000_000);
    expect(s.revenuePending).toBe(12_000_000);
    expect(s.spend).toBeCloseTo(4_000_000);
    expect(s.costPerLead).toBeCloseTo(4_000_000 / 6);
    expect(s.costPerClient).toBeCloseTo(2_000_000); // spend / won
    expect(s.costPerPayingClient).toBeCloseTo(2_000_000); // 2 leads with paid invoices
    expect(s.dropOff).toMatchObject({ fromKey: "QUALIFIED", toKey: "MEETING" });
    expect(s.dropOff?.dropPct).toBe(50);
  });

  it("response times (avg / median / answered) and by-owner", async () => {
    const s = await build(leads, spends).stats({ from: "2026-10-01", to: "2026-10-31" });
    // responses: a=4, c=10, d=20, e=2, f=6 -> avg 8.4, median 6
    expect(s.response.answered).toBe(5);
    expect(s.response.avgMinutes).toBeCloseTo(8.4);
    expect(s.response.medianMinutes).toBe(6);
    expect(s.response.uncontactedNow).toBe(3);
    const andi = s.byOwner.find((o) => o.name === "Andi")!;
    expect(andi).toMatchObject({ leads: 5, won: 2, revenue: 25_000_000 });
    expect(s.byOwner.find((o) => o.name === "Sinta")).toMatchObject({ leads: 1, won: 0 });
  });

  it("by campaign and by source", async () => {
    const s = await build(leads, spends).stats({ from: "2026-10-01", to: "2026-10-31" });
    const c1 = s.byCampaign.find((c) => c.code === "FB-OKT1")!;
    expect(c1).toMatchObject({ leads: 5, qualified: 4, won: 2, revenue: 25_000_000 });
    expect(c1.costPerLead).toBeCloseTo(600_000);
    expect(c1.costPerClient).toBeCloseTo(1_500_000);
    const c2 = s.byCampaign.find((c) => c.code === "IG-R")!;
    expect(c2).toMatchObject({ leads: 1, won: 0, costPerClient: null });
    expect(s.bySource.find((x) => x.source === "REFERRAL")).toMatchObject({ leads: 1, won: 0 });
  });

  it("returns null ratios instead of dividing by zero", async () => {
    const s = await build([], []).stats({ from: "2026-10-01", to: "2026-10-31" });
    expect(s).toMatchObject({ leads: 0, won: 0, conversionPct: 0, costPerLead: null, costPerClient: null, dropOff: null });
    expect(s.response.avgMinutes).toBeNull();
  });

  it("adds synced Meta spend (daily rows in the WIB window) to manual entries", async () => {
    const metaLinked = [{ id: "c1", metaCampaignId: "120254253291320085" }];
    const metaDaily = [
      { metaCampaignId: "120254253291320085", amount: 600_000, impressions: 1000, clicks: 40 },
      { metaCampaignId: "120254253291320085", amount: 400_000, impressions: 500, clicks: 10 },
    ];
    const s = await build(leads, spends, metaLinked, metaDaily).stats({ from: "2026-10-01", to: "2026-10-31" });
    expect(s.metaSpend).toBe(1_000_000);
    expect(s.manualSpend).toBeCloseTo(4_000_000);
    expect(s.spend).toBeCloseTo(5_000_000);
    expect(s.costPerLead).toBeCloseTo(5_000_000 / 6);
    expect(s.costPerQualified).toBeCloseTo(5_000_000 / 4);
    const c1 = s.byCampaign.find((c) => c.code === "FB-OKT1")!;
    expect(c1).toMatchObject({ spend: 4_000_000, metaSpend: 1_000_000, impressions: 1500, clicks: 50 });
    expect(c1.costPerLead).toBeCloseTo(800_000);
    expect(c1.costPerQualified).toBeCloseTo(1_000_000);
    expect(c1.costPerClient).toBeCloseTo(2_000_000);
  });
});
