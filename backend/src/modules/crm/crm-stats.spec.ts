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
  function build(
    leads: any[],
    spends: any[],
    metaLinked: any[] = [],
    metaDaily: any[] = [],
    syncState: any = null,
    tiktok: { linked?: any[]; daily?: any[]; state?: any } = {},
  ) {
    const prisma: any = {
      leadStage: { findMany: jest.fn(async () => stages) },
      lead: { findMany: jest.fn(async () => leads), count: jest.fn(async (a: any) => (a.where?.firstResponseAt === null ? 3 : 7)) },
      campaignSpend: { findMany: jest.fn(async () => spends) },
      campaign: {
        findMany: jest.fn(async (a: any) =>
          a?.where?.metaCampaignId
            ? metaLinked
            : a?.where?.tiktokCampaignId
              ? (tiktok.linked ?? [])
              : [
                  { id: "c1", name: "October Video Promo", code: "FB-OKT1", platform: "FACEBOOK", tiktokCampaignId: null },
                  { id: "c2", name: "Reels", code: "IG-R", platform: "INSTAGRAM", tiktokCampaignId: null },
                  { id: "c3", name: "TikTok Okt", code: "TT-OKT", platform: "TIKTOK", tiktokCampaignId: "1790000000000001" },
                ],
        ),
      },
      metaAdsSyncState: { findUnique: jest.fn(async () => syncState) },
      metaAdsInsightDaily: { findMany: jest.fn(async () => metaDaily) },
      tikTokAdsSyncState: { findUnique: jest.fn(async () => tiktok.state ?? null) },
      tikTokAdsInsightDaily: { findMany: jest.fn(async () => tiktok.daily ?? []) },
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

  it("a manual entry counts in its own WIB calendar month, not the neighbouring one (no UTC off-by-one)", async () => {
    const edge = [
      { campaignId: "c1", amount: 1_000_000, dateFrom: new Date("2026-09-30T00:00:00Z"), dateTo: new Date("2026-09-30T00:00:00Z") },
      { campaignId: "c1", amount: 400_000, dateFrom: new Date("2026-10-01T00:00:00Z"), dateTo: new Date("2026-10-01T00:00:00Z") },
    ];
    const oct = await build(leads, edge).stats({ from: "2026-10-01", to: "2026-10-31" });
    expect(oct.spend).toBe(400_000);
    const sep = await build(leads, edge).stats({ from: "2026-09-01", to: "2026-09-30" });
    expect(sep.spend).toBe(1_000_000);
    const oneDay = await build(leads, edge).stats({ from: "2026-09-30", to: "2026-09-30" });
    expect(oneDay.spend).toBe(1_000_000);
  });

  it("a non-IDR Meta account keeps rupiah manual costs apart (not in spend or cost per)", async () => {
    const metaLinked = [{ id: "c1", metaCampaignId: "120254253291320085" }];
    const metaDaily = [{ metaCampaignId: "120254253291320085", amount: 60, impressions: 100, clicks: 5 }];
    const s = await build(leads, spends, metaLinked, metaDaily, { currency: "USD" }).stats({ from: "2026-10-01", to: "2026-10-31" });
    expect(s).toMatchObject({ spend: 60, metaSpend: 60, manualSeparate: true, spendCurrency: "USD" });
    expect(s.manualSpend).toBeCloseTo(4_000_000);
    expect(s.costPerLead).toBeCloseTo(10);
    const c1 = s.byCampaign.find((c) => c.code === "FB-OKT1")!;
    expect(c1).toMatchObject({ spend: 60, metaSpend: 60 });
    expect(c1.costPerLead).toBeCloseTo(12);
  });
});

describe("CrmStatsService.stats - TikTok spend", () => {
  // reuse the module-level helpers through a tiny local build
  const mk = (tiktok: any) => {
    const prisma: any = {
      leadStage: { findMany: jest.fn(async () => stages) },
      lead: { findMany: jest.fn(async () => tiktokLeads), count: jest.fn(async () => 0) },
      campaignSpend: { findMany: jest.fn(async () => []) },
      campaign: {
        findMany: jest.fn(async (a: any) =>
          a?.where?.metaCampaignId
            ? []
            : a?.where?.tiktokCampaignId
              ? [{ id: "c3", tiktokCampaignId: "1790000000000001" }]
              : [
                  { id: "c1", name: "Meta Okt", code: "FB-OKT1", platform: "FACEBOOK", tiktokCampaignId: null },
                  { id: "c3", name: "TikTok Okt", code: "TT-OKT", platform: "TIKTOK", tiktokCampaignId: "1790000000000001" },
                ],
        ),
      },
      metaAdsSyncState: { findUnique: jest.fn(async () => null) },
      metaAdsInsightDaily: { findMany: jest.fn(async () => []) },
      tikTokAdsSyncState: { findUnique: jest.fn(async () => tiktok.state) },
      tikTokAdsInsightDaily: { findMany: jest.fn(async () => tiktok.daily) },
    };
    return new CrmStatsService(prisma, { getThresholdMinutes: jest.fn(async () => 15) } as any);
  };
  const tiktokLeads = [
    lead("m1", "QUALIFIED", { campaignId: "c1", activities: hist("QUALIFIED") }),
    lead("t1", "QUALIFIED", { campaignId: "c3", activities: hist("QUALIFIED") }),
    lead("t2", "NEW", { campaignId: "c3" }),
  ];
  const daily = [
    { tiktokCampaignId: "1790000000000001", amount: 600_000, impressions: 1000, clicks: 40 },
    { tiktokCampaignId: "1790000000000001", amount: 400_000, impressions: 500, clicks: 10 },
  ];

  it("adds synced TikTok spend to the totals and the campaign, and splits the cost-per numbers by platform", async () => {
    const s = await mk({ state: { currency: "IDR", timezoneName: "Asia/Jakarta", lastSuccessAt: new Date("2026-10-09T05:00:00Z") }, daily }).stats({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(s.spend).toBe(1_000_000);
    expect(s.tiktokSpend).toBe(1_000_000);
    expect(s.tiktokSeparate).toBe(false);
    expect(s.tiktokLastSyncAt).toBe("2026-10-09T05:00:00.000Z");
    const c3 = s.byCampaign.find((c) => c.campaignId === "c3")!;
    expect(c3).toMatchObject({ platform: "TIKTOK", tiktokSpend: 1_000_000, spend: 1_000_000, manualSpend: 0, impressions: 1500, clicks: 50, leads: 2 });
    expect(c3.costPerLead).toBe(500_000);
    expect(c3.costPerQualified).toBe(1_000_000);
    const tt = s.byPlatform.find((p) => p.platform === "TIKTOK")!;
    const meta = s.byPlatform.find((p) => p.platform === "META")!;
    expect(tt).toMatchObject({ leads: 2, qualified: 1, spend: 1_000_000, costPerLead: 500_000 });
    expect(meta).toMatchObject({ leads: 1, spend: 0 });
  });

  it("a TikTok account in another currency is reported but kept out of the rupiah totals", async () => {
    const s = await mk({ state: { currency: "USD", timezoneName: "Asia/Jakarta", lastSuccessAt: null }, daily }).stats({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(s.spend).toBe(0);
    expect(s.tiktokSpend).toBe(1_000_000);
    expect(s.tiktokSeparate).toBe(true);
    expect(s.tiktokCurrency).toBe("USD");
  });

  it("with no TikTok data everything is unchanged (zero TikTok spend, Meta platform row only has leads)", async () => {
    const s = await mk({ state: null, daily: [] }).stats({ from: "2026-10-01", to: "2026-10-31" });
    expect(s.tiktokSpend).toBe(0);
    expect(s.spend).toBe(0);
    expect(s.byPlatform.find((p) => p.platform === "TIKTOK")!.spend).toBe(0);
  });
});
