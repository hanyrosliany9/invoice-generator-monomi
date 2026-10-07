import { Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { classifyError } from "../../instagram/instagram-graph.client";
import { assertGraphCallNotDenied, ForbiddenGraphEndpointError } from "../../../common/meta/graph-denylist";
import { AdClickService } from "../../ad-tracking/ad-click.service";
import { parseTrackEvent } from "../../ad-tracking/track-event.payload";
import { MetaGraphClient } from "../../social-publishing/meta-graph.client";
import {
  ACCESS_TOKEN,
  APP_SECRET,
  FakeGraph,
  FakePrisma,
  withEnv,
} from "../../whatsapp/testing/whatsapp-fakes.helper-spec";
import { WhatsAppIngestService } from "../../whatsapp/whatsapp-ingest.service";
import { matchCampaign } from "../../whatsapp/whatsapp.utils";
import { CrmCampaignsService } from "../crm-campaigns.service";
import { campaignCostMetrics, parseQuickAdd } from "../crm.utils";
import { backfillMetaAttribution } from "./meta-ads.attribution";
import { MetaAdsAdminService } from "./meta-ads-admin.service";
import { LEASE_MS, MetaAdsSyncService } from "./meta-ads-sync.service";
import { resolveMetaAdsConfig } from "./meta-ads.config";
import {
  chunkRange,
  computeSyncRange,
  discoverAdAccount,
  parseSpend,
  rateLimitBackoffMs,
  sanitizeCampaignCode,
  uniqueCampaignCode,
} from "./meta-ads.utils";

const ACCT = "1014675364676172";
const C_LINK = "120254253291320085";
const C_CTWA = "120254277597640085";
const NOW = new Date("2026-10-07T03:00:00.000Z"); // 10:00 WIB, 2026-10-07

const STAGES = [
  { id: "st-new", key: "NEW", name: "New", order: 1, type: "OPEN", isActive: true },
  { id: "st-qual", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN", isActive: true },
  { id: "st-won", key: "WON", name: "Won", order: 5, type: "WON", isActive: true },
];

const baseEnv = {
  NODE_ENV: "test",
  META_SYSTEM_USER_TOKEN: ACCESS_TOKEN,
  META_SYSTEM_APP_SECRET: APP_SECRET,
  META_AD_ACCOUNT_ID: `act_${ACCT}`,
  META_ADS_SYNC_ENABLED: undefined,
  META_ADS_SYNC_BACKFILL_DAYS: undefined,
  META_GRAPH_VERSION: undefined,
  META_GRAPH_BASE_URL: undefined,
};

const q = (call: { url: string }) => new URL(call.url).searchParams;

interface InsightFixture {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  date_start: string;
}

const day = (campaign: "link" | "ctwa", date: string, spend: string, impressions = "1000", clicks = "50"): InsightFixture => ({
  campaign_id: campaign === "link" ? C_LINK : C_CTWA,
  campaign_name: campaign === "link" ? "PB-CAMP-LINK" : "PB-CAMP-01-CTWA",
  spend,
  impressions,
  clicks,
  date_start: date,
});

/** Fake Graph answering like the verified production account (MON-1, IDR). */
function fakeMeta(opts: { currency?: string; timezone?: string; insights?: InsightFixture[]; pageSize?: number } = {}) {
  const graph = new FakeGraph();
  const state = {
    insights: opts.insights ?? [
      day("link", "2026-10-06", "150000"),
      day("link", "2026-10-07", "100000"),
      day("ctwa", "2026-10-07", "75000.60", "800", "20"),
    ],
    campaigns: [
      { id: C_LINK, name: "PB-CAMP-LINK", status: "ACTIVE", effective_status: "ACTIVE", objective: "OUTCOME_TRAFFIC" },
      { id: C_CTWA, name: "PB-CAMP-01-CTWA", status: "ACTIVE", effective_status: "ACTIVE", objective: "OUTCOME_ENGAGEMENT" },
    ] as any[],
    ads: [
      { id: "6900000000001", campaign_id: C_LINK },
      { id: "6900000000002", campaign_id: C_CTWA },
      { id: "6900000000003", campaign_id: C_CTWA },
    ],
    accounts: [{ account_id: ACCT, name: "MON-1", account_status: 1, currency: opts.currency ?? "IDR", timezone_name: opts.timezone ?? "Asia/Jakarta" }] as any[],
    currency: opts.currency ?? "IDR",
    timezone: opts.timezone ?? "Asia/Jakarta",
  };
  const paged = (all: any[], call: { url: string }, size: number) => {
    const p = q(call);
    const start = p.get("after") ? Number(p.get("after")) : 0;
    const slice = all.slice(start, start + size);
    const end = start + size;
    return {
      json: {
        data: slice,
        paging: end < all.length ? { cursors: { after: String(end) }, next: "https://graph.facebook.com/next?x=1" } : { cursors: { after: String(end) } },
      },
    };
  };
  const size = opts.pageSize ?? 2;
  graph.on("GET", /\/me\/adaccounts$/, (c: any) => paged(state.accounts, c, 25));
  graph.on("GET", new RegExp(`/act_${ACCT}$`), () => ({
    json: { account_id: ACCT, name: "MON-1", currency: state.currency, account_status: 1, timezone_name: state.timezone },
  }));
  graph.on("GET", new RegExp(`/act_${ACCT}/insights$`), (c: any) => {
    const tr = JSON.parse(q(c).get("time_range")!);
    return paged(state.insights.filter((i) => i.date_start >= tr.since && i.date_start <= tr.until), c, size);
  });
  graph.on("GET", new RegExp(`/act_${ACCT}/campaigns$`), (c: any) => paged(state.campaigns, c, size));
  graph.on("GET", new RegExp(`/act_${ACCT}/ads$`), (c: any) => paged(state.ads, c, size));
  return { graph, state };
}

function setup(metaOpts: Parameters<typeof fakeMeta>[0] = {}, seed: Record<string, any[]> = {}) {
  const { graph, state } = fakeMeta(metaOpts);
  const prisma = new FakePrisma({
    leadStage: STAGES.map((s) => ({ ...s })),
    campaign: [],
    campaignSpend: [],
    lead: [],
    adClick: [],
    metaAdsSyncState: [],
    metaAdsCampaign: [],
    metaAdsAd: [],
    metaAdsInsightDaily: [],
    ...seed,
  });
  const svc = new MetaAdsSyncService(prisma as any, new MetaGraphClient(graph.fetch));
  const clock = { now: NOW };
  svc.now = () => clock.now;
  svc.env = () => ({ ...process.env, ...Object.fromEntries(Object.entries(baseEnv).filter(([, v]) => v !== undefined)) }) as any;
  const t = prisma.tables as Record<string, any[]>;
  return { graph, state, prisma, svc, t, clock };
}

describe("Meta Ads sync", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  // ------------------------------------------------------------------ config
  describe("config states", () => {
    it("OFF without the token, and when disabled", () => {
      expect(resolveMetaAdsConfig({ NODE_ENV: "production" } as any).state).toBe("OFF");
      expect(
        resolveMetaAdsConfig({ META_SYSTEM_USER_TOKEN: ACCESS_TOKEN, META_ADS_SYNC_ENABLED: "false" } as any),
      ).toMatchObject({ state: "OFF" });
    });

    it("READY with the token only (sync enabled by default, 90 days, account discovered later)", () => {
      const c = resolveMetaAdsConfig({ META_SYSTEM_USER_TOKEN: ACCESS_TOKEN } as any);
      expect(c).toMatchObject({ state: "READY", syncEnabled: true, backfillDays: 90, adAccountId: null });
    });

    it("accepts the account id with or without act_", () => {
      for (const v of [ACCT, `act_${ACCT}`]) {
        expect(resolveMetaAdsConfig({ META_SYSTEM_USER_TOKEN: ACCESS_TOKEN, META_AD_ACCOUNT_ID: v } as any).adAccountId).toBe(ACCT);
      }
    });

    it("INVALID for a malformed account id, backfill days, secret or placeholder token; problems name vars, never values", () => {
      const bad = [
        { META_AD_ACCOUNT_ID: "act_abc" },
        { META_ADS_SYNC_BACKFILL_DAYS: "0" },
        { META_ADS_SYNC_BACKFILL_DAYS: "9999" },
        { META_SYSTEM_APP_SECRET: "short" },
        { META_SYSTEM_USER_TOKEN: "your_token_here" },
      ];
      for (const extra of bad) {
        const c = resolveMetaAdsConfig({ META_SYSTEM_USER_TOKEN: ACCESS_TOKEN, ...extra } as any);
        expect(c.state).toBe("INVALID");
        expect(JSON.stringify(c.problems)).not.toContain(ACCESS_TOKEN);
        expect(c.problems.join(" ")).toMatch(/META_/);
      }
    });

    it("ignores the dev Graph base URL in production", () => {
      const env = { META_SYSTEM_USER_TOKEN: ACCESS_TOKEN, META_GRAPH_BASE_URL: "http://127.0.0.1:5499" };
      expect(resolveMetaAdsConfig({ ...env, NODE_ENV: "production" } as any).graphBaseUrl).toBe("https://graph.facebook.com");
      expect(resolveMetaAdsConfig({ ...env, NODE_ENV: "development" } as any).graphBaseUrl).toBe("http://127.0.0.1:5499");
    });

    it("INCOMPLETE at run time: discovery with 0, 1 or 2 active ad accounts", () => {
      const acc = (id: string, status: number) => ({ id, name: `acct ${id}`, currency: "IDR", status });
      const none = discoverAdAccount([]);
      expect(none.ok).toBe(false);
      const disabledOnly = discoverAdAccount([acc("11111", 2)]);
      expect(disabledOnly.ok).toBe(false);
      const one = discoverAdAccount([acc("11111", 1), acc("22222", 2)]);
      expect(one).toMatchObject({ ok: true, account: { id: "11111" } });
      const two = discoverAdAccount([acc("11111", 1), acc("22222", 1)]);
      expect(two.ok).toBe(false);
      expect((two as any).message).toContain("11111");
    });

    it("discovery through me/adaccounts: one account runs; two stop with an admin-readable INCOMPLETE", async () => {
      const t1 = setup();
      t1.svc.env = () => ({ ...baseEnv, META_AD_ACCOUNT_ID: undefined }) as any;
      expect((await t1.svc.run("MANUAL")).status).toBe("SUCCESS");
      expect(t1.t.metaAdsSyncState[0]).toMatchObject({ adAccountId: ACCT, accountName: "MON-1" });

      const t2 = setup();
      t2.svc.env = () => ({ ...baseEnv, META_AD_ACCOUNT_ID: undefined }) as any;
      t2.state.accounts.push({ account_id: "999000111222", name: "Other", account_status: 1, currency: "IDR" });
      const r = await t2.svc.run("MANUAL");
      expect(r.status).toBe("INCOMPLETE");
      expect(t2.graph.calls.some((c) => c.path.endsWith("/insights"))).toBe(false);
      const status = await new MetaAdsAdminService(t2.prisma as any, t2.svc).status();
      expect(status.state).toBe("INCOMPLETE");
      expect(status.message).toContain("2 active ad accounts");
    });
  });

  // -------------------------------------------------------------------- utils
  describe("utils", () => {
    it("first run backfills BACKFILL_DAYS WIB days; later runs re-read the last 7", () => {
      expect(computeSyncRange(NOW, 90, null)).toEqual({ since: "2026-07-10", until: "2026-10-07" });
      expect(computeSyncRange(NOW, 30, null)).toEqual({ since: "2026-09-08", until: "2026-10-07" });
      // up to date: the last 7 days
      expect(computeSyncRange(NOW, 90, "2026-10-07")).toEqual({ since: "2026-10-01", until: "2026-10-07" });
      // 23:00 UTC is already the next day in WIB
      expect(computeSyncRange(new Date("2026-10-07T23:00:00Z"), 90, "2026-10-08").until).toBe("2026-10-08");
      // the ad account's own zone decides the day (Los Angeles is still on the 7th)
      expect(computeSyncRange(new Date("2026-10-08T03:00:00Z"), 90, "2026-10-08", "America/Los_Angeles").until).toBe("2026-10-07");
      expect(computeSyncRange(NOW, 90, "2026-10-07", "Not/AZone").until).toBe("2026-10-07");
    });

    it("gap refill: an outage reaches back to the last day read, clamped to BACKFILL_DAYS, in 30-day chunks", () => {
      const oct1 = new Date("2026-10-01T03:00:00Z");
      expect(computeSyncRange(oct1, 90, "2026-09-19")).toEqual({ since: "2026-09-19", until: "2026-10-01" });
      expect(computeSyncRange(NOW, 30, "2026-05-01")).toEqual({ since: "2026-09-08", until: "2026-10-07" }); // clamped
      expect(chunkRange("2026-07-10", "2026-10-07", 30).map((c) => [c.since, c.until])).toEqual([
        ["2026-07-10", "2026-08-08"],
        ["2026-08-09", "2026-09-07"],
        ["2026-09-08", "2026-10-07"],
      ]);
      expect(chunkRange("2026-10-01", "2026-10-07")).toEqual([{ since: "2026-10-01", until: "2026-10-07" }]);
    });

    it("code sanitising and uniqueness (max 24 chars, suffix when taken)", () => {
      expect(sanitizeCampaignCode("PB-CAMP-LINK", C_LINK)).toBe("PB-CAMP-LINK");
      expect(sanitizeCampaignCode("  Promo Lebaran / Reels (v2)!  ", C_LINK)).toBe("PROMO-LEBARAN-REELS-V2");
      expect(sanitizeCampaignCode("Kampanye Pembukaan Toko Baru Jakarta Selatan", C_LINK).length).toBeLessThanOrEqual(24);
      expect(sanitizeCampaignCode("Édition Été", C_LINK)).toBe("EDITION-ETE");
      expect(sanitizeCampaignCode("!!", C_LINK)).toBe("META-320085");
      expect(sanitizeCampaignCode("日本語", C_LINK)).toBe("META-320085");
      const taken = new Set(["pb-camp-link", "pb-camp-link-2"]);
      expect(uniqueCampaignCode("PB-CAMP-LINK", taken)).toBe("PB-CAMP-LINK-3");
      const long = "A".repeat(24);
      const u = uniqueCampaignCode(long, new Set([long.toLowerCase()]));
      expect(u).toBe("A".repeat(22) + "-2");
      expect(u.length).toBe(24);
    });

    it("money: IDR is an integer, other currencies keep cents", () => {
      expect(parseSpend("150000.00", "IDR")).toBe(150000);
      expect(parseSpend("75000.60", "IDR")).toBe(75001);
      expect(parseSpend("12.345", "USD")).toBe(12.35);
      expect(parseSpend(undefined, "IDR")).toBe(0);
      expect(parseSpend("-5", "IDR")).toBe(0);
    });

    it("rate-limit back-off doubles from 15 minutes up to 3 hours", () => {
      expect([1, 2, 3, 4, 5, 9].map(rateLimitBackoffMs)).toEqual([15, 30, 60, 120, 180, 180].map((m) => m * 60_000));
    });
  });

  // ---------------------------------------------------------------- the sync
  describe("sync", () => {
    it("first run: backfills 90 days, follows paging, creates the 2 CRM campaigns with spend", async () => {
      const { svc, graph, t } = setup();
      const r = await svc.run("MANUAL");
      expect(r).toMatchObject({ status: "SUCCESS", firstRun: true, range: { since: "2026-07-10", until: "2026-10-07" }, insightRows: 3, created: 2, ads: 3 });

      const insightCalls = graph.calls.filter((c) => c.path.endsWith("/insights"));
      expect(insightCalls).toHaveLength(4); // 90 days = 3 chunks of 30 days; only the last has rows (3 rows, page size 2 -> 2 pages)
      const p = q(insightCalls[0]);
      expect(p.get("level")).toBe("campaign");
      expect(p.get("time_increment")).toBe("1");
      expect(p.get("fields")).toBe("campaign_id,campaign_name,spend,impressions,clicks,objective");
      expect(JSON.parse(p.get("time_range")!)).toEqual({ since: "2026-07-10", until: "2026-08-08" });
      expect(JSON.parse(q(insightCalls[2]).get("time_range")!)).toEqual({ since: "2026-09-08", until: "2026-10-07" });
      expect(q(insightCalls[3]).get("after")).toBe("2");

      expect(t.metaAdsInsightDaily).toHaveLength(3);
      const ctwa = t.metaAdsInsightDaily.find((x) => x.metaCampaignId === C_CTWA);
      expect(Number(ctwa.amount)).toBe(75001); // integer IDR
      expect(ctwa).toMatchObject({ currency: "IDR", impressions: 800, clicks: 20, adAccountId: ACCT });

      expect(t.campaign.map((c) => c.code).sort()).toEqual(["PB-CAMP-01-CTWA", "PB-CAMP-LINK"]);
      expect(t.campaign.find((c) => c.code === "PB-CAMP-LINK")).toMatchObject({
        metaCampaignId: C_LINK,
        metaCampaignName: "PB-CAMP-LINK",
        metaStatus: "ACTIVE",
        metaObjective: "OUTCOME_TRAFFIC",
        status: "ACTIVE",
      });
      expect(t.metaAdsAd).toHaveLength(3);
      expect(t.metaAdsSyncState[0]).toMatchObject({
        lastStatus: "SUCCESS",
        lastError: null,
        adAccountId: ACCT,
        accountName: "MON-1",
        currency: "IDR",
        backfilledAccountId: ACCT,
      });
    });

    it("re-running does not double: upsert is idempotent; later runs read only the last 7 days", async () => {
      const { svc, graph, t, clock } = setup();
      await svc.run("MANUAL");
      graph.calls.length = 0;
      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      const r = await svc.run("CRON");
      expect(r).toMatchObject({ status: "SUCCESS", firstRun: false, range: { since: "2026-10-01", until: "2026-10-07" }, created: 0 });
      expect(JSON.parse(q(graph.calls.find((c) => c.path.endsWith("/insights"))!).get("time_range")!)).toEqual({
        since: "2026-10-01",
        until: "2026-10-07",
      });
      expect(t.metaAdsInsightDaily).toHaveLength(3);
      expect(t.metaAdsCampaign).toHaveLength(2);
      expect(t.metaAdsAd).toHaveLength(3);
      expect(t.campaign).toHaveLength(2);
    });

    it("the 7-day window picks up restated days (amount changes in place) and drops days Meta no longer reports", async () => {
      const { svc, state, t, clock } = setup();
      await svc.run("MANUAL");
      const total = () => t.metaAdsInsightDaily.reduce((s, r) => s + Number(r.amount), 0);
      expect(total()).toBe(150000 + 100000 + 75001);

      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      state.insights = [day("link", "2026-10-06", "162500"), day("link", "2026-10-07", "100000")]; // 10-06 restated; ctwa day gone
      await svc.run("CRON");
      expect(t.metaAdsInsightDaily).toHaveLength(2);
      expect(total()).toBe(262500);
    });

    it("keeps history older than the 7-day window untouched", async () => {
      const { svc, state, t, clock } = setup({ insights: [day("link", "2026-08-01", "999000"), day("link", "2026-10-07", "100000")] });
      await svc.run("MANUAL");
      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      state.insights = [day("link", "2026-10-07", "110000")];
      await svc.run("CRON");
      expect(t.metaAdsInsightDaily.map((r) => Number(r.amount)).sort((a, b) => a - b)).toEqual([110000, 999000]);
    });

    it("leaves manual spend entries untouched", async () => {
      const { svc, t } = setup(
        {},
        {
          campaign: [{ id: "cm", name: "Manual", code: "MANUAL-1", metaAdIds: [], metaCampaignId: null }],
          campaignSpend: [{ id: "s1", campaignId: "cm", amount: 500000, source: "MANUAL" }],
        },
      );
      await svc.run("MANUAL");
      expect(t.campaignSpend).toEqual([expect.objectContaining({ id: "s1", amount: 500000, source: "MANUAL" })]);
      expect(t.campaign.find((c) => c.id === "cm").metaCampaignId).toBeNull();
    });

    it("skips (no network) when the config is OFF or INVALID", async () => {
      const { svc, graph } = setup();
      svc.env = () => ({ NODE_ENV: "test" }) as any;
      expect(await svc.run("CRON")).toMatchObject({ status: "SKIPPED" });
      svc.env = () => ({ ...baseEnv, META_AD_ACCOUNT_ID: "nope" }) as any;
      expect(await svc.run("CRON")).toMatchObject({ status: "SKIPPED" });
      expect(graph.calls).toHaveLength(0);
    });

    it("records a failure with a scrubbed message and keeps going next time", async () => {
      const { svc, graph, t } = setup();
      graph.on("GET", new RegExp(`/act_${ACCT}/ads$`), () => ({ status: 403, json: { error: { code: 200, message: `Permission denied ${ACCESS_TOKEN}${"x".repeat(60)}` } } }));
      const r = await svc.run("MANUAL");
      expect(r.status).toBe("FAILED");
      expect(t.metaAdsSyncState[0].lastStatus).toBe("FAILED");
      expect(JSON.stringify(t.metaAdsSyncState[0])).not.toContain(ACCESS_TOKEN);
      expect(t.metaAdsInsightDaily).toHaveLength(0); // nothing half-written
      expect(t.metaAdsSyncState[0].leaseUntil).toBeNull(); // lease released
    });
  });

  // ------------------------------------------------------------ campaigns
  describe("CRM campaigns", () => {
    it("auto-creates only campaigns that are active or have spend; others are skipped", async () => {
      const { svc, state, t } = setup();
      state.campaigns.push(
        { id: "120299990000000001", name: "Old paused no spend", status: "PAUSED", effective_status: "PAUSED", objective: "X" },
        { id: "120299990000000002", name: "Paused with spend", status: "PAUSED", effective_status: "PAUSED", objective: "X" },
        { id: "120299990000000003", name: "Active no spend yet", status: "ACTIVE", effective_status: "ACTIVE", objective: "X" },
      );
      state.insights.push({ ...day("link", "2026-10-05", "5000"), campaign_id: "120299990000000002", campaign_name: "Paused with spend" });
      await svc.run("MANUAL");
      const names = t.campaign.map((c) => c.metaCampaignName).sort();
      expect(names).toEqual(["PB-CAMP-01-CTWA", "PB-CAMP-LINK", "Paused with spend", "Active no spend yet"].sort());
      expect(t.campaign.find((c) => c.metaCampaignName === "Paused with spend").status).toBe("PAUSED");
    });

    it("makes codes unique against campaigns that are already linked to another Meta campaign (case-insensitive)", async () => {
      const { svc, t } = setup({}, { campaign: [{ id: "x", name: "Mine", code: "pb-camp-link", metaAdIds: [], metaCampaignId: "999000111222" }] });
      await svc.run("MANUAL");
      const created = t.campaign.find((c) => c.metaCampaignId === C_LINK);
      expect(created.code).toBe("PB-CAMP-LINK-2");
      expect(created.codeAuto).toBe(true);
    });

    it("a renamed Meta campaign updates the stored name, not the code or the CRM name", async () => {
      const { svc, state, t, clock } = setup();
      await svc.run("MANUAL");
      const before = t.campaign.find((c) => c.metaCampaignId === C_LINK);
      before.code = "LANDING"; // staff renamed the code
      state.campaigns[0].name = "PB-CAMP-LINK v2";
      state.campaigns[0].effective_status = "PAUSED";
      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      await svc.run("CRON");
      const after = t.campaign.find((c) => c.metaCampaignId === C_LINK);
      expect(after).toMatchObject({ code: "LANDING", metaCampaignName: "PB-CAMP-LINK v2", metaStatus: "PAUSED", name: "PB-CAMP-LINK" });
      expect(t.campaign).toHaveLength(2);
    });

    it("link / unlink by an admin; unlinking stops auto-creation from coming back; a Meta campaign has one CRM campaign", async () => {
      const { svc, prisma, t } = setup({}, { campaign: [{ id: "mine", name: "Mine", code: "MINE", metaAdIds: [] }] });
      // sync once with auto-create off for this campaign by pre-listing it as opted out
      t.metaAdsCampaign.push({ id: "m1", adAccountId: ACCT, metaCampaignId: C_LINK, name: "PB-CAMP-LINK", effectiveStatus: "ACTIVE", objective: "OUTCOME_TRAFFIC", autoLinkDisabled: true });
      await svc.run("MANUAL");
      expect(t.campaign.find((c) => c.metaCampaignId === C_LINK)).toBeUndefined(); // opted out

      const admin = new MetaAdsAdminService(prisma as any, svc);
      const opts = await admin.listMetaCampaigns();
      expect(opts.map((o) => o.metaCampaignId).sort()).toEqual([C_LINK, C_CTWA].sort());

      await admin.setLink("mine", C_LINK);
      expect(t.campaign.find((c) => c.id === "mine")).toMatchObject({ metaCampaignId: C_LINK, metaCampaignName: "PB-CAMP-LINK" });
      expect(t.metaAdsCampaign.find((m) => m.metaCampaignId === C_LINK).autoLinkDisabled).toBe(false);

      t.campaign.push({ id: "other", name: "Other", code: "OTHER", metaAdIds: [], metaCampaignId: null });
      await expect(admin.setLink("other", C_LINK)).rejects.toMatchObject({ status: 409 });
      await expect(admin.setLink("other", "120200000000000999")).rejects.toMatchObject({ status: 404 });

      await admin.setLink("mine", null);
      expect(t.campaign.find((c) => c.id === "mine")).toMatchObject({ metaCampaignId: null, metaCampaignName: null });
      await svc.run("MANUAL"); // unlinked + opted out: not re-created
      expect(t.campaign.filter((c) => c.metaCampaignId === C_LINK)).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------- attribution
  describe("attribution by Meta campaign id", () => {
    const click = (over: any) => ({ id: over.id, utmCampaign: null, campaignCode: null, leadId: null, ...over });

    it("backfills clicks and leads with no campaign; never overwrites a campaign set by staff", async () => {
      const { prisma, t } = setup(
        {},
        {
          campaign: [
            { id: "c-link", name: "PB-CAMP-LINK", code: "PB-CAMP-LINK", metaAdIds: [], metaCampaignId: C_LINK },
            { id: "c-manual", name: "Manual", code: "MANUAL", metaAdIds: [], metaCampaignId: null },
          ],
          adClick: [
            click({ id: "k1", utmCampaign: C_LINK, leadId: "l1" }),
            click({ id: "k2", utmCampaign: C_LINK, leadId: "l2" }),
            click({ id: "k3", utmCampaign: C_LINK, leadId: "l3" }),
            click({ id: "k4", utmCampaign: C_LINK, leadId: null }), // visit with no lead
            click({ id: "k5", utmCampaign: "other-thing", leadId: "l4" }),
            click({ id: "k6", utmCampaign: C_LINK, campaignCode: "MANUAL", leadId: null }), // already a code
          ],
          lead: [
            { id: "l1", campaignId: null, campaignCode: null },
            { id: "l2", campaignId: "c-manual", campaignCode: "MANUAL" }, // staff chose
            { id: "l3", campaignId: null, campaignCode: "TYPED-UNKNOWN" }, // typed code, no campaign
            { id: "l4", campaignId: null, campaignCode: null },
          ],
        },
      );
      const r = await backfillMetaAttribution(prisma as any);
      expect(r).toEqual({ clicks: 5, leads: 1 });
      expect(t.adClick.find((c) => c.id === "k1").campaignCode).toBe("PB-CAMP-LINK");
      expect(t.adClick.find((c) => c.id === "k4").campaignCode).toBe("PB-CAMP-LINK");
      expect(t.adClick.find((c) => c.id === "k5").campaignCode).toBeNull();
      expect(t.adClick.find((c) => c.id === "k6").campaignCode).toBe("PB-CAMP-LINK"); // click codes are derived from the utm, so they follow the link
      expect(t.lead.find((l) => l.id === "l1")).toMatchObject({ campaignId: "c-link", campaignCode: "PB-CAMP-LINK", campaignSource: "AUTO" });
      expect(t.lead.find((l) => l.id === "l2")).toMatchObject({ campaignId: "c-manual" });
      expect(t.lead.find((l) => l.id === "l3")).toMatchObject({ campaignId: null, campaignCode: "TYPED-UNKNOWN" });
      expect(t.lead.find((l) => l.id === "l4").campaignId).toBeNull();
      expect(await backfillMetaAttribution(prisma as any)).toEqual({ clicks: 0, leads: 0 }); // idempotent
    });

    it("the sync's own backfill links earlier landing clicks once the campaign is created", async () => {
      const { svc, t } = setup({}, { adClick: [click({ id: "k1", utmCampaign: C_LINK, leadId: "l1" })], lead: [{ id: "l1", campaignId: null, campaignCode: null }] });
      const r = await svc.run("MANUAL");
      expect(r).toMatchObject({ attributedClicks: 1, attributedLeads: 1 });
      expect(t.lead[0]).toMatchObject({ campaignCode: "PB-CAMP-LINK" });
      expect(t.lead[0].campaignId).toBe(t.campaign.find((c) => c.code === "PB-CAMP-LINK").id);
    });

    it("a new landing click whose utm_campaign is the Meta campaign id resolves to the linked campaign; codes still match", async () => {
      const restore = withEnv({ NODE_ENV: "test" });
      try {
        const prisma = new FakePrisma({
          campaign: [
            { id: "c-link", name: "PB-CAMP-LINK", code: "PB-CAMP-LINK", metaAdIds: [], metaCampaignId: C_LINK },
            { id: "c-code", name: "FB", code: "FB-OKT1", metaAdIds: [], metaCampaignId: null },
          ],
          adClick: [],
        });
        const clicks = new AdClickService(prisma as any);
        const send = async (n: number, campaign: string) =>
          clicks.recordEvent(
            parseTrackEvent(
              JSON.stringify({
                visitId: `44444444-0000-4000-8000-${String(n).padStart(12, "0")}`,
                name: "PageView",
                eventId: `evt-000000000${n}`,
                pageUrl: "https://link.monomiagency.com/",
                utm: { source: "meta", medium: "paid", campaign },
              }),
            )!,
            { ip: "198.51.100.7", userAgent: "Mozilla/5.0" },
          );
        await send(1, C_LINK);
        await send(2, "fb-okt1");
        await send(3, "120254000000000000"); // digits, but not linked
        const rows = prisma.tables.adClick;
        expect(rows.map((r) => r.campaignCode)).toEqual(["PB-CAMP-LINK", "FB-OKT1", null]);
        expect(rows[0].utmCampaign).toBe(C_LINK);
      } finally {
        restore();
      }
    });

    it("CTWA: referral.source_id (an ad id) maps to its campaign through the synced ads map", async () => {
      const { svc, prisma } = setup();
      await svc.run("MANUAL");
      const ingest: any = Object.create(WhatsAppIngestService.prototype);
      ingest.prisma = prisma;
      const campaigns = (prisma.tables.campaign as any[]).map((c) => ({ id: c.id, code: c.code, name: c.name, metaAdIds: [...c.metaAdIds] }));
      await ingest.addSyncedAdMapping(campaigns, "6900000000002");
      const m = matchCampaign("Halo", { source_id: "6900000000002", source_type: "ad" } as any, campaigns);
      expect(m).toMatchObject({ reason: "ad_id", code: "PB-CAMP-01-CTWA" });

      const none = (prisma.tables.campaign as any[]).map((c) => ({ id: c.id, code: c.code, name: c.name, metaAdIds: [] }));
      await ingest.addSyncedAdMapping(none, "6999999999999"); // unknown ad
      expect(matchCampaign("Halo", { source_id: "6999999999999" } as any, none).campaign).toBeNull();
    });
  });

  // ------------------------------------------------------ rate limit + lease
  describe("rate limits and the lease", () => {
    it.each([4, 17, 32, 613])("Graph error code %i backs off, and the next runs wait", async (code) => {
      const { svc, graph, t, clock } = setup();
      graph.on("GET", new RegExp(`/act_${ACCT}/insights$`), () => ({ status: 400, json: { error: { code, message: "(#17) User request limit reached" } } }));
      expect(await svc.run("CRON")).toMatchObject({ status: "RATE_LIMITED" });
      expect(t.metaAdsSyncState[0]).toMatchObject({ lastStatus: "RATE_LIMITED", rateLimitStrikes: 1 });
      expect(t.metaAdsSyncState[0].rateLimitedUntil.getTime()).toBe(NOW.getTime() + 15 * 60_000);

      const calls = graph.calls.length;
      clock.now = new Date(NOW.getTime() + 5 * 60_000);
      expect(await svc.run("CRON")).toMatchObject({ status: "RATE_LIMITED" });
      expect(await svc.run("MANUAL")).toMatchObject({ status: "RATE_LIMITED" });
      expect(graph.calls.length).toBe(calls); // no Graph traffic while backing off

      clock.now = new Date(NOW.getTime() + 16 * 60_000);
      expect(await svc.run("CRON")).toMatchObject({ status: "RATE_LIMITED" }); // still limited -> longer back-off
      expect(t.metaAdsSyncState[0].rateLimitStrikes).toBe(2);
      expect(t.metaAdsSyncState[0].rateLimitedUntil.getTime()).toBe(NOW.getTime() + 16 * 60_000 + 30 * 60_000);
    });

    it("recovers: a successful run clears the back-off", async () => {
      const { svc, graph, t, clock } = setup();
      graph.on("GET", new RegExp(`/act_${ACCT}/insights$`), () => ({ status: 429, json: { error: { code: 4, message: "limit" } } }));
      await svc.run("CRON");
      graph.routes.shift(); // the failing route goes away
      clock.now = new Date(NOW.getTime() + 20 * 60_000);
      expect((await svc.run("CRON")).status).toBe("SUCCESS");
      expect(t.metaAdsSyncState[0]).toMatchObject({ rateLimitStrikes: 0, rateLimitedUntil: null, lastStatus: "SUCCESS" });
    });

    it("overlapping runs never double-sync: the second one is BUSY", async () => {
      const { svc, graph, t } = setup();
      const [a, b] = await Promise.all([svc.run("CRON"), svc.run("MANUAL")]);
      expect([a.status, b.status].sort()).toEqual(["BUSY", "SUCCESS"]);
      expect(graph.calls.filter((c) => c.path.endsWith("/campaigns"))).toHaveLength(1); // one run's calls only
      expect(t.metaAdsInsightDaily).toHaveLength(3);
      expect(t.metaAdsSyncState[0].leaseUntil).toBeNull(); // released
    });

    it("a held lease blocks a run until it expires (crashed worker)", async () => {
      const { svc, t, clock } = setup({}, { metaAdsSyncState: [{ id: "default", leaseOwner: "dead:1", leaseUntil: new Date(NOW.getTime() + 60_000) }] });
      expect((await svc.run("CRON")).status).toBe("BUSY");
      clock.now = new Date(NOW.getTime() + LEASE_MS + 1);
      expect((await svc.run("CRON")).status).toBe("SUCCESS");
      expect(t.metaAdsSyncState[0].leaseOwner).toBeNull();
    });
  });

  // ------------------------------------------------------------ currency
  describe("currency", () => {
    it("a non-IDR account keeps cents and the currency on every row and in the status", async () => {
      const { svc, t, prisma } = setup({ currency: "USD", insights: [day("link", "2026-10-07", "12.345"), day("link", "2026-10-06", "7.5")] });
      await svc.run("MANUAL");
      expect(t.metaAdsInsightDaily.map((r) => [Number(r.amount), r.currency]).sort((a, b) => (a[0] as number) - (b[0] as number))).toEqual([
        [7.5, "USD"],
        [12.35, "USD"],
      ]);
      const status = await new MetaAdsAdminService(prisma as any, svc).status();
      expect(status.account).toEqual({ id: ACCT, name: "MON-1", currency: "USD", timezone: "Asia/Jakarta" });
      const link = (prisma.tables.campaign as any[]).find((c) => c.metaCampaignId === C_LINK);
      (prisma.tables.campaignSpend as any[]).push({ id: "s1", campaignId: link.id, amount: 500000, dateFrom: new Date("2026-10-03"), dateTo: new Date("2026-10-03"), source: "MANUAL" });
      const list = await new CrmCampaignsService(prisma as any).list();
      // rupiah manual costs are kept apart, not added to dollars
      expect(list.find((c) => c.metaCampaignId === C_LINK)).toMatchObject({ metaSpend: 19.85, spend: 19.85, manualSpend: 500000, manualSeparate: true, spendCurrency: "USD" });
    });
  });

  // ------------------------------------------------------------ denylist
  describe("Graph safety", () => {
    it("every call passes the shared denylist, carries appsecret_proof and the token only in the header", async () => {
      const { svc, graph } = setup();
      await svc.run("MANUAL");
      expect(graph.calls.length).toBeGreaterThan(4);
      for (const c of graph.calls) {
        const u = new URL(c.url);
        expect(() => assertGraphCallNotDenied("GET", `${u.pathname}${u.search}`)).not.toThrow();
        expect(c.method).toBe("GET");
        expect(u.searchParams.get("appsecret_proof")).toMatch(/^[a-f0-9]{64}$/);
        expect(c.url).not.toContain(ACCESS_TOKEN);
        expect(u.searchParams.has("access_token")).toBe(false);
        expect(c.headers.Authorization).toBe(`OAuth ${ACCESS_TOKEN}`);
        expect(u.pathname.startsWith("/v26.0/")).toBe(true);
      }
    });

    it("the client the sync uses refuses a denied endpoint before any network I/O", async () => {
      const { graph } = setup();
      const client = new MetaGraphClient(graph.fetch);
      await expect(client.call("https://graph.facebook.com/v26.0/123/register", ACCESS_TOKEN)).rejects.toBeInstanceOf(ForbiddenGraphEndpointError);
      await expect(client.call("https://graph.facebook.com/v26.0/act_1/insights", ACCESS_TOKEN, { query: { method: "delete" } })).rejects.toBeInstanceOf(
        ForbiddenGraphEndpointError,
      );
      expect(graph.calls).toHaveLength(0);
    });

    it("never logs the token", async () => {
      const spy = jest.spyOn(Logger.prototype, "warn");
      const { svc, graph } = setup();
      graph.on("GET", new RegExp(`/act_${ACCT}/insights$`), () => ({ status: 400, json: { error: { code: 17, message: `limit ${ACCESS_TOKEN}` } } }));
      await svc.run("MANUAL");
      expect(JSON.stringify(spy.mock.calls)).not.toContain(ACCESS_TOKEN);
    });
  });

  // ------------------------------------------------------- spend + metrics
  describe("combined spend", () => {
    it("cost per lead / Qualified / client use synced + manual spend", () => {
      const m = campaignCostMetrics(200_000, 1_300_000, { leads: 10, qualified: 5, won: 2 });
      expect(m).toEqual({ spend: 1_500_000, costPerLead: 150_000, costPerQualified: 300_000, costPerClient: 750_000 });
      expect(campaignCostMetrics(0, 0, { leads: 0, qualified: 0, won: 0 })).toMatchObject({ costPerLead: null, costPerQualified: null, costPerClient: null });
      expect(campaignCostMetrics(100, 0, { leads: 0, qualified: 0, won: 1 })).toMatchObject({ costPerLead: null, costPerClient: 100 });
    });

    it("the Campaigns list adds synced Meta spend, impressions and clicks to manual entries, and shows Meta rows read-only in the daily list", async () => {
      const { svc, prisma } = setup(
        {},
        {
          lead: [
            { id: "a", campaignId: "x", stageId: "st-new" },
            { id: "b", campaignId: "x", stageId: "st-qual" },
            { id: "c", campaignId: "x", stageId: "st-won" },
          ],
        },
      );
      await svc.run("MANUAL");
      const link = (prisma.tables.campaign as any[]).find((c) => c.metaCampaignId === C_LINK);
      for (const l of prisma.tables.lead) l.campaignId = link.id;
      (prisma.tables.campaignSpend as any[]).push({ id: "s1", campaignId: link.id, amount: 50_000, dateFrom: new Date("2026-10-03"), dateTo: new Date("2026-10-03"), source: "MANUAL", note: "Studio" });

      const campaigns = new CrmCampaignsService(prisma as any);
      const row = (await campaigns.list()).find((c) => c.id === link.id)!;
      expect(row).toMatchObject({ metaSpend: 250_000, manualSpend: 50_000, spend: 300_000, impressions: 2000, clicks: 100, leads: 3, qualified: 2, won: 1, spendCurrency: "IDR" });
      expect(row.costPerLead).toBeCloseTo(100_000);
      expect(row.costPerQualified).toBeCloseTo(150_000);
      expect(row.costPerClient).toBeCloseTo(300_000);

      const daily = await campaigns.listSpend(link.id);
      expect(daily.map((d: any) => [d.source, d.amount])).toEqual([
        ["META", 100000],
        ["META", 150000],
        ["MANUAL", 50000],
      ]);
      expect(daily.filter((d: any) => d.source === "META").every((d: any) => d.readOnly && String(d.id).startsWith("meta:"))).toBe(true);
    });

    it("staff cannot create META-sourced manual rows", async () => {
      const { prisma } = setup({}, { campaign: [{ id: "c", name: "c", code: "CC", metaAdIds: [] }] });
      const campaigns = new CrmCampaignsService(prisma as any);
      const row = await campaigns.addSpend("c", { dateFrom: "2026-10-01", amount: 1000, source: "META" } as any, null);
      expect(row.source).toBe("MANUAL");
    });
  });
});

describe("Meta Ads sync: follow-ups", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  const metaRows = (ids = [C_LINK, C_CTWA]) =>
    ids.map((id, i) => ({ id: `m${i}`, adAccountId: ACCT, metaCampaignId: id, name: id === C_LINK ? "PB-CAMP-LINK" : "PB-CAMP-01-CTWA", effectiveStatus: "ACTIVE", objective: "X", autoLinkDisabled: false }));

  describe("gap refill after an outage", () => {
    it("an outage from Sep 20 to Sep 30 is refilled by the next sync, not lost", async () => {
      const upstream = Array.from({ length: 11 }, (_, i) => day("link", `2026-09-${String(20 + i).padStart(2, "0")}`, String(10000 + i)));
      const { svc, graph, t, clock } = setup({ insights: upstream });
      clock.now = new Date("2026-09-19T03:00:00.000Z"); // last good run: Sep 19
      await svc.run("CRON");
      expect(t.metaAdsInsightDaily).toHaveLength(0);
      expect(t.metaAdsSyncState[0].lastRangeTo.toISOString().slice(0, 10)).toBe("2026-09-19");

      graph.calls.length = 0;
      clock.now = new Date("2026-10-01T03:00:00.000Z"); // back after 12 days (no run between)
      const r = await svc.run("CRON");
      expect(r).toMatchObject({ status: "SUCCESS", firstRun: false, range: { since: "2026-09-19", until: "2026-10-01" } });
      const dates = t.metaAdsInsightDaily.map((x) => x.date.toISOString().slice(0, 10)).sort();
      expect(dates).toEqual(upstream.map((u) => u.date_start));
      expect(dates[0]).toBe("2026-09-20");
      expect(dates[dates.length - 1]).toBe("2026-09-30");
    });

    it("never reaches back further than BACKFILL_DAYS, and reads long gaps in chunks", async () => {
      const { svc, graph, clock } = setup({ insights: [] });
      svc.env = () => ({ ...baseEnv, META_ADS_SYNC_BACKFILL_DAYS: "45" }) as any;
      clock.now = new Date("2026-05-01T03:00:00.000Z");
      await svc.run("CRON");
      graph.calls.length = 0;
      clock.now = NOW; // 159 days later
      const r = await svc.run("CRON");
      expect(r.range).toEqual({ since: "2026-08-24", until: "2026-10-07" });
      const ranges = graph.calls.filter((c) => c.path.endsWith("/insights")).map((c) => JSON.parse(q(c).get("time_range")!));
      expect(ranges).toEqual([
        { since: "2026-08-24", until: "2026-09-22" },
        { since: "2026-09-23", until: "2026-10-07" },
      ]);
    });
  });

  describe("an existing CRM campaign is linked, not duplicated", () => {
    it("links an unlinked campaign with the same code (case-insensitive) or name, keeping its code and name", async () => {
      const { svc, t } = setup(
        {},
        {
          campaign: [
            { id: "byCode", name: "Landing campaign", code: "pb-camp-link", metaAdIds: [], metaCampaignId: null },
            { id: "byName", name: "pb-camp-01-ctwa", code: "WA-1", metaAdIds: [], metaCampaignId: null },
          ],
        },
      );
      const r = await svc.run("MANUAL");
      expect(r.created).toBe(0);
      expect(t.campaign).toHaveLength(2);
      expect(t.campaign.find((c) => c.id === "byCode")).toMatchObject({ metaCampaignId: C_LINK, code: "pb-camp-link", name: "Landing campaign", metaCampaignName: "PB-CAMP-LINK" });
      expect(t.campaign.find((c) => c.id === "byName")).toMatchObject({ metaCampaignId: C_CTWA, code: "WA-1" });
    });

    it("leads and clicks of the Meta campaign are attributed to the campaign it was linked to", async () => {
      const { svc, t } = setup(
        {},
        {
          campaign: [{ id: "byCode", name: "x", code: "PB-CAMP-LINK", metaAdIds: [], metaCampaignId: null }],
          adClick: [{ id: "k1", utmCampaign: C_LINK, campaignCode: null, leadId: "l1" }],
          lead: [{ id: "l1", campaignId: null, campaignCode: null }],
        },
      );
      await svc.run("MANUAL");
      expect(t.lead[0]).toMatchObject({ campaignId: "byCode", campaignSource: "AUTO" });
      expect(t.adClick[0].campaignCode).toBe("PB-CAMP-LINK");
    });
  });

  describe("attribution follows links, MANUAL never moves", () => {
    function linkSetup() {
      return setup(
        {},
        {
          campaign: [
            { id: "cA", name: "A", code: "A-CODE", metaAdIds: [], metaCampaignId: C_LINK },
            { id: "cB", name: "B", code: "B-CODE", metaAdIds: [], metaCampaignId: null },
          ],
          metaAdsCampaign: metaRows(),
          metaAdsAd: [{ adId: "AD1", adAccountId: ACCT, metaCampaignId: C_LINK }],
          adClick: [
            { id: "k1", utmCampaign: C_LINK, campaignCode: "A-CODE", leadId: "lAuto" },
            { id: "k2", utmCampaign: C_LINK, campaignCode: "A-CODE", leadId: "lManual" },
          ],
          lead: [
            { id: "lAuto", campaignId: "cA", campaignCode: "A-CODE", campaignSource: "AUTO" },
            { id: "lManual", campaignId: "cA", campaignCode: "A-CODE", campaignSource: "MANUAL" },
            { id: "lAd", campaignId: "cA", campaignCode: "A-CODE", campaignSource: "AUTO", adId: "AD1" },
            { id: "lOther", campaignId: "cB", campaignCode: "B-CODE", campaignSource: "AUTO", adId: "OTHER" },
          ],
        },
      );
    }

    it("unlink withdraws AUTO attribution (clicks, utm and ad-id leads) and keeps MANUAL", async () => {
      const { svc, prisma, t } = linkSetup();
      await new MetaAdsAdminService(prisma as any, svc).setLink("cA", null);
      const lead = (id: string) => t.lead.find((l) => l.id === id);
      expect(lead("lAuto")).toMatchObject({ campaignId: null, campaignCode: null });
      expect(lead("lAd")).toMatchObject({ campaignId: null });
      expect(lead("lManual")).toMatchObject({ campaignId: "cA", campaignSource: "MANUAL" });
      expect(lead("lOther")).toMatchObject({ campaignId: "cB" });
      expect(t.adClick.every((c) => c.campaignCode === null)).toBe(true);
    });

    it("re-link moves AUTO leads and clicks to the new campaign, MANUAL stays", async () => {
      const { svc, prisma, t } = linkSetup();
      const admin = new MetaAdsAdminService(prisma as any, svc);
      await admin.setLink("cA", null);
      await admin.setLink("cB", C_LINK);
      const lead = (id: string) => t.lead.find((l) => l.id === id);
      expect(lead("lAuto")).toMatchObject({ campaignId: "cB", campaignCode: "B-CODE", campaignSource: "AUTO" });
      expect(lead("lAd")).toMatchObject({ campaignId: "cB" });
      expect(lead("lManual")).toMatchObject({ campaignId: "cA", campaignCode: "A-CODE" });
      expect(t.adClick.every((c) => c.campaignCode === "B-CODE")).toBe(true);
    });

    it("switching a CRM campaign from Meta A to Meta B withdraws A's AUTO attribution and attributes B's", async () => {
      const { svc, prisma, t } = linkSetup();
      t.adClick.push({ id: "k3", utmCampaign: C_CTWA, campaignCode: null, leadId: "lNew" });
      t.lead.push({ id: "lNew", campaignId: null, campaignCode: null });
      await new MetaAdsAdminService(prisma as any, svc).setLink("cA", C_CTWA);
      expect(t.lead.find((l) => l.id === "lAuto")).toMatchObject({ campaignId: null });
      expect(t.lead.find((l) => l.id === "lNew")).toMatchObject({ campaignId: "cA", campaignSource: "AUTO" });
    });
  });

  describe("switching the Meta campaign", () => {
    it("opts the previous Meta campaign out, so the next sync does not re-create it", async () => {
      const { svc, prisma, t } = setup({}, { campaign: [{ id: "cA", name: "A", code: "A-CODE", metaAdIds: [], metaCampaignId: C_LINK }], metaAdsCampaign: metaRows() });
      await new MetaAdsAdminService(prisma as any, svc).setLink("cA", C_CTWA);
      expect(t.metaAdsCampaign.find((m) => m.metaCampaignId === C_LINK).autoLinkDisabled).toBe(true);
      expect(t.metaAdsCampaign.find((m) => m.metaCampaignId === C_CTWA).autoLinkDisabled).toBe(false);
      await svc.run("MANUAL");
      expect(t.campaign).toHaveLength(1);
      expect(t.campaign[0].metaCampaignId).toBe(C_CTWA);
    });

    it("answers 409 (not 500) when two admins link the same Meta campaign at once", async () => {
      const { svc, prisma } = setup({}, { campaign: [{ id: "cA", name: "A", code: "A-CODE", metaAdIds: [] }], metaAdsCampaign: metaRows() });
      jest.spyOn(prisma.campaign, "update").mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "x" }));
      await expect(new MetaAdsAdminService(prisma as any, svc).setLink("cA", C_LINK)).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("Ads throttling codes", () => {
    it.each([80000, 80001, 80004, 80005, 80006, 80007, 80008, 80009, 80010, 80011, 80012, 80013, 80014])("code %i backs off", async (code) => {
      const { svc, graph, t } = setup();
      graph.on("GET", new RegExp(`/act_${ACCT}/insights$`), () => ({ status: 400, json: { error: { code, message: "Too many calls to this ad-account" } } }));
      expect((await svc.run("CRON")).status).toBe("RATE_LIMITED");
      expect(t.metaAdsSyncState[0].rateLimitedUntil).toBeTruthy();
    });

    it("does not change how the shared (Instagram) classifier sees these codes", () => {
      expect(classifyError(400, 80000)).toBe("unknown");
      expect(classifyError(400, 80004)).toBe("rate_limit");
    });
  });

  describe("auto-generated codes", () => {
    const refs = (autoCode: boolean) => [
      { id: "p", code: "PROMO", name: "Promo", metaAdIds: [], codeAuto: autoCode },
      { id: "o", code: "FB-OKT1", name: "Oktober", metaAdIds: ["6900000000009"] },
    ];

    it("an auto code never matches as a bare word in normal text (the Promo case)", () => {
      expect(matchCampaign("🔥 Promo 🔥 halo kak, ada promo?", null, refs(true)).campaign).toBeNull();
      expect(parseQuickAdd("🔥 Promo 🔥", [], ["PROMO"]).campaignCode).toBeNull();
    });

    it("but matches in the explicit forms", () => {
      expect(matchCampaign("Halo [PROMO]", null, refs(true)).campaign?.id).toBe("p");
      expect(matchCampaign("Halo kak\nKode kampanye: promo", null, refs(true)).campaign?.id).toBe("p");
      expect(matchCampaign("Campaign code - PROMO", null, refs(true)).campaign?.id).toBe("p");
      expect(matchCampaign("Kode kampanye: PROMOSI", null, refs(true)).campaign).toBeNull();
    });

    it("a staff-created code keeps matching as a bare word (and in a headline)", () => {
      expect(matchCampaign("🔥 Promo 🔥", null, refs(false)).campaign?.id).toBe("p");
      expect(matchCampaign("Hi", { headline: "Promo besar" } as any, refs(false)).reason).toBe("code_in_headline");
      expect(matchCampaign("Hi", { headline: "Promo besar" } as any, refs(true)).campaign).toBeNull();
    });

    it("the explicit ad id wins over any code in the text", () => {
      const m = matchCampaign("[PROMO] halo", { source_id: "6900000000009" } as any, refs(true));
      expect(m).toMatchObject({ reason: "ad_id", code: "FB-OKT1" });
    });

    it("the Meta campaign id in utm_campaign wins over a code", async () => {
      const restore = withEnv({ NODE_ENV: "test" });
      try {
        const prisma = new FakePrisma({
          campaign: [
            { id: "c1", name: "digits", code: "120254253291320085", metaAdIds: [], metaCampaignId: null },
            { id: "c2", name: "PB", code: "PB-CAMP-LINK", metaAdIds: [], metaCampaignId: C_LINK },
          ],
          adClick: [],
        });
        const clicks = new AdClickService(prisma as any);
        await clicks.recordEvent(
          parseTrackEvent(
            JSON.stringify({ visitId: "66666666-0000-4000-8000-000000000001", name: "PageView", eventId: "evt-0000000099", pageUrl: "https://link.monomiagency.com/", utm: { campaign: C_LINK } }),
          )!,
          { ip: "198.51.100.9", userAgent: "Mozilla/5.0" },
        );
        expect(prisma.tables.adClick[0].campaignCode).toBe("PB-CAMP-LINK");
      } finally {
        restore();
      }
    });

    it("renaming the code by staff makes it a staff code", async () => {
      const prisma = new FakePrisma({ campaign: [{ id: "c", name: "n", code: "PROMO", codeAuto: true, metaAdIds: [] }] });
      const svc = new CrmCampaignsService(prisma as any);
      await svc.update("c", { name: "renamed" } as any);
      expect(prisma.tables.campaign[0].codeAuto).toBe(true);
      await svc.update("c", { code: "PROMO-OKT" } as any);
      expect(prisma.tables.campaign[0]).toMatchObject({ code: "PROMO-OKT", codeAuto: false });
    });
  });

  describe("ad account time zone and lease", () => {
    it("stores the zone, shows it, and decides the day by it", async () => {
      const { svc, prisma, t, clock } = setup({ timezone: "America/Los_Angeles" });
      clock.now = new Date("2026-10-08T03:00:00.000Z"); // Oct 8 in Jakarta, Oct 7 in Los Angeles
      const r = await svc.run("MANUAL");
      expect(r.range?.until).toBe("2026-10-07");
      expect(t.metaAdsSyncState[0].timezoneName).toBe("America/Los_Angeles");
      expect((await new MetaAdsAdminService(prisma as any, svc).status()).account).toMatchObject({ timezone: "America/Los_Angeles" });
    });

    it("renews the lease while paging (a long backfill outlives one lease period)", async () => {
      const { svc, graph, t, clock } = setup();
      const seen: number[] = [];
      graph.on("GET", new RegExp(`/act_${ACCT}/insights$`), () => {
        seen.push(t.metaAdsSyncState[0].leaseUntil.getTime());
        clock.now = new Date(clock.now.getTime() + 15 * 60_000);
        return { json: { data: [] } };
      });
      await svc.run("MANUAL");
      expect(seen.length).toBe(3);
      expect(seen[2]).toBeGreaterThan(seen[0]);
      expect(seen[2]).toBeGreaterThan(clock.now.getTime() - 15 * 60_000); // never lapsed during the run
    });
  });
});

describe("follow-up migration backfill (campaignSource)", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("the SQL marks every lead with a campaign MANUAL and never AUTO", () => {
    const sqlText = require("fs").readFileSync(
      require("path").join(__dirname, "../../../../prisma/migrations/20261009100000_meta_ads_followups/migration.sql"),
      "utf8",
    ) as string;
    const statements = sqlText.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(statements).toContain(`UPDATE "leads" SET "campaignSource" = 'MANUAL' WHERE "campaignId" IS NOT NULL`);
    expect(statements).not.toContain("'AUTO'");
  });

  it("state after the migration: staff-moved auto lead and auto-created lead stay put, the lead without a campaign is attributed", async () => {
    // what the backfill leaves: every lead WITH a campaign is MANUAL, the one without is NULL
    const { svc, prisma, t } = setup(
      {},
      {
        campaign: [{ id: "staffPick", name: "Staff pick", code: "STAFF", metaAdIds: [], metaCampaignId: null }],
        adClick: [
          { id: "k1", utmCampaign: C_LINK, campaignCode: null, leadId: "movedByStaff" },
          { id: "k2", utmCampaign: C_LINK, campaignCode: null, leadId: "noCampaign" },
          { id: "k3", utmCampaign: C_LINK, campaignCode: null, leadId: "autoCreated" },
        ],
        lead: [
          // auto-created from a tap, later moved to another campaign by staff
          { id: "movedByStaff", campaignId: "staffPick", campaignCode: "STAFF", campaignSource: "MANUAL", autoCreated: true, adId: "AD1", ctwaClid: "c" },
          { id: "noCampaign", campaignId: null, campaignCode: null, campaignSource: null },
          // auto-created with a campaign: safe default MANUAL
          { id: "autoCreated", campaignId: "staffPick", campaignCode: "STAFF", campaignSource: "MANUAL", autoCreated: true },
        ],
      },
    );
    await svc.run("MANUAL"); // creates PB-CAMP-LINK, links C_LINK, attributes
    const link = t.campaign.find((c) => c.metaCampaignId === C_LINK);
    const lead = (id: string) => t.lead.find((l) => l.id === id);
    expect(lead("noCampaign")).toMatchObject({ campaignId: link.id, campaignSource: "AUTO" });
    expect(lead("movedByStaff")).toMatchObject({ campaignId: "staffPick", campaignSource: "MANUAL" });
    expect(lead("autoCreated")).toMatchObject({ campaignId: "staffPick", campaignSource: "MANUAL" });
    // and a later re-link/unlink never moves them either
    await new MetaAdsAdminService(prisma as any, svc).setLink(link.id, null);
    expect(lead("movedByStaff").campaignId).toBe("staffPick");
    expect(lead("autoCreated").campaignId).toBe("staffPick");
  });
});
