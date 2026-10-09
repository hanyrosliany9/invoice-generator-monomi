import { Logger } from "@nestjs/common";
import { AdClickService } from "../../ad-tracking/ad-click.service";
import { parseTrackEvent } from "../../ad-tracking/track-event.payload";
import { decryptToken } from "../../instagram/utils/token-crypto";
import { FakePrisma, withEnv } from "../../whatsapp/testing/whatsapp-fakes.helper-spec";
import { CrmCampaignsService } from "../crm-campaigns.service";
import { backfillTikTokAttribution, releaseTikTokAttribution } from "./tiktok-ads.attribution";
import { resolveTikTokAdsConfig } from "./tiktok-ads.config";
import { TikTokAdsAdminService } from "./tiktok-ads-admin.service";
import { TIKTOK_LEASE_MS, TikTokAdsHttp, TikTokAdsSyncService, TIKTOK_TOKEN_AAD } from "./tiktok-ads-sync.service";
import { classifyTikTokAdsError, computeTikTokRange, mapTikTokStatus, tiktokBackoffMs } from "./tiktok-ads.utils";
import { loadTikTokSpend } from "./tiktok-ads-spend";
import { resolveTokenKey } from "../../instagram/instagram.config";

const ADV = "7000000000000001";
const C1 = "1790000000000001";
const C2 = "1790000000000002";
const TOKEN = "tok_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0";
const APP_ID = "7123456789012345678";
const APP_SECRET = "s3cr3t_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const ENC_KEY = Buffer.from("0123456789abcdef0123456789abcdeX").toString("base64");
const NOW = new Date("2026-10-07T03:00:00.000Z"); // 10:00 WIB, 2026-10-07

const baseEnv: Record<string, string | undefined> = {
  NODE_ENV: "test",
  TIKTOK_ADS_SYNC_ENABLED: "true",
  TIKTOK_ADVERTISER_ID: ADV,
  TIKTOK_ADS_ACCESS_TOKEN: TOKEN,
  TIKTOK_ADS_APP_ID: undefined,
  TIKTOK_ADS_APP_SECRET: undefined,
  TIKTOK_ADS_SYNC_BACKFILL_DAYS: undefined,
  TIKTOK_ADS_API_BASE_URL: undefined,
  TOKEN_ENCRYPTION_KEY: undefined,
};
const mkEnv = (extra: Record<string, string | undefined> = {}) =>
  Object.fromEntries(Object.entries({ ...baseEnv, ...extra }).filter(([, v]) => v !== undefined)) as any;

interface Row {
  campaign_id: string;
  date: string;
  spend: string;
  impressions?: string;
  clicks?: string;
  name?: string;
}
const row = (campaign: "c1" | "c2", date: string, spend: string, impressions = "1000", clicks = "50"): Row => ({
  campaign_id: campaign === "c1" ? C1 : C2,
  date,
  spend,
  impressions,
  clicks,
  name: campaign === "c1" ? "TT Okt Promo" : "TT Brand Awareness",
});

/** Fake TikTok Business API: advertiser/info, campaign/get, report/integrated/get (+ oauth). */
function fakeTikTok(opts: { currency?: string; timezone?: string; rows?: Row[]; pageSize?: number } = {}) {
  const calls: Array<{ method: string; path: string; token: string | null; query: Record<string, string>; json?: any }> = [];
  const state = {
    rows: opts.rows ?? [row("c1", "2026-10-06", "150000.40"), row("c1", "2026-10-07", "100000"), row("c2", "2026-10-07", "75000.60", "800", "20")],
    campaigns: [
      { campaign_id: C1, campaign_name: "TT Okt Promo", operation_status: "ENABLE", secondary_status: "CAMPAIGN_STATUS_ENABLE", objective_type: "LEAD_GENERATION" },
      { campaign_id: C2, campaign_name: "TT Brand Awareness", operation_status: "ENABLE", secondary_status: "CAMPAIGN_STATUS_ENABLE", objective_type: "REACH" },
    ] as any[],
    advertisers: [{ advertiser_id: ADV, name: "Monomi TT", currency: opts.currency ?? "IDR", timezone: opts.timezone ?? "Asia/Jakarta", status: "STATUS_ENABLE" }] as any[],
    fail: null as null | ((path: string) => { status: number; json: any } | null),
    oauth: null as null | ((body: any) => { status: number; json: any }),
  };
  const size = opts.pageSize ?? 2;
  const page = (all: any[], query: Record<string, string>) => {
    const p = Number(query.page ?? 1);
    const slice = all.slice((p - 1) * size, p * size);
    return {
      status: 200,
      json: { code: 0, message: "OK", request_id: "R", data: { list: slice, page_info: { page: p, page_size: size, total_number: all.length, total_page: Math.max(1, Math.ceil(all.length / size)) } } },
    };
  };
  const http: TikTokAdsHttp = {
    async request(method, url, o) {
      const u = new URL(url);
      const path = u.pathname.replace("/open_api/v1.3/", "");
      const query = { ...Object.fromEntries(u.searchParams), ...(o.query ?? {}) };
      calls.push({ method, path, token: o.token ?? null, query, json: o.json });
      const failure = state.fail?.(path);
      if (failure) return failure;
      if (path === "oauth2/access_token/") return state.oauth!(o.json);
      if (path === "advertiser/info/") return { status: 200, json: { code: 0, message: "OK", data: { list: state.advertisers } } };
      if (path === "campaign/get/") return page(state.campaigns, query);
      if (path === "report/integrated/get/") {
        const inRange = state.rows.filter((r) => r.date >= query.start_date && r.date <= query.end_date);
        const list = inRange.map((r) => ({
          dimensions: { campaign_id: r.campaign_id, stat_time_day: `${r.date} 00:00:00` },
          metrics: { spend: r.spend, impressions: r.impressions ?? "0", clicks: r.clicks ?? "0", campaign_name: r.name },
        }));
        return page(list, query);
      }
      return { status: 404, json: { code: 40000, message: "unknown" } };
    },
  };
  return { http, calls, state };
}

const STAGES = [
  { id: "st-new", key: "NEW", name: "New", order: 1, type: "OPEN", isActive: true },
  { id: "st-qual", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN", isActive: true },
];

function setup(tt: Parameters<typeof fakeTikTok>[0] = {}, seed: Record<string, any[]> = {}, env: Record<string, string | undefined> = {}) {
  const fake = fakeTikTok(tt);
  const prisma = new FakePrisma({
    leadStage: STAGES.map((s) => ({ ...s })),
    campaign: [],
    campaignSpend: [],
    lead: [],
    adClick: [],
    metaAdsSyncState: [],
    metaAdsInsightDaily: [],
    tikTokAdsSyncState: [],
    tikTokAdsCampaign: [],
    tikTokAdsInsightDaily: [],
    ...seed,
  });
  const svc = new TikTokAdsSyncService(prisma as any);
  svc.http = fake.http;
  const clock = { now: NOW };
  svc.now = () => clock.now;
  svc.env = () => mkEnv(env);
  const t = prisma.tables as Record<string, any[]>;
  return { ...fake, prisma, svc, t, clock };
}

describe("TikTok Ads sync", () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  describe("config states", () => {
    it("OFF by default (needs TIKTOK_ADS_SYNC_ENABLED=true)", () => {
      expect(resolveTikTokAdsConfig({ NODE_ENV: "production", TIKTOK_ADVERTISER_ID: ADV, TIKTOK_ADS_ACCESS_TOKEN: TOKEN } as any).state).toBe("OFF");
      expect(resolveTikTokAdsConfig({ NODE_ENV: "production" } as any).state).toBe("OFF");
    });
    it("INCOMPLETE without an advertiser id or a token (env or stored)", () => {
      const c = resolveTikTokAdsConfig({ TIKTOK_ADS_SYNC_ENABLED: "true" } as any);
      expect(c.state).toBe("INCOMPLETE");
      expect(c.problems).toEqual(["TIKTOK_ADVERTISER_ID is not set", "TIKTOK_ADS_ACCESS_TOKEN is not set (and no token was stored with Connect TikTok Ads)"]);
      expect(resolveTikTokAdsConfig({ TIKTOK_ADS_SYNC_ENABLED: "true", TIKTOK_ADVERTISER_ID: ADV } as any).state).toBe("INCOMPLETE");
      expect(resolveTikTokAdsConfig({ TIKTOK_ADS_SYNC_ENABLED: "true", TIKTOK_ADVERTISER_ID: ADV } as any, { hasStoredToken: true }).state).toBe("READY");
    });
    it("READY with advertiser + env token; defaults to 90 days and the real API host", () => {
      expect(resolveTikTokAdsConfig(mkEnv())).toMatchObject({ state: "READY", backfillDays: 90, baseUrl: "https://business-api.tiktok.com" });
    });
    it("INVALID for malformed values; problems name the variables, never values", () => {
      for (const extra of [
        { TIKTOK_ADVERTISER_ID: "abc" },
        { TIKTOK_ADS_ACCESS_TOKEN: "your_token_here" },
        { TIKTOK_ADS_SYNC_BACKFILL_DAYS: "0" },
        { TIKTOK_ADS_SYNC_BACKFILL_DAYS: "9999" },
        { TIKTOK_ADS_APP_ID: "x" },
        { TIKTOK_ADS_APP_SECRET: "short" },
      ]) {
        const c = resolveTikTokAdsConfig(mkEnv(extra));
        expect(c.state).toBe("INVALID");
        expect(c.problems.join(" ")).toMatch(/TIKTOK_/);
        expect(JSON.stringify(c.problems)).not.toContain(TOKEN);
      }
    });
    it("ignores the dev API base URL in production", () => {
      const env = { TIKTOK_ADS_API_BASE_URL: "http://127.0.0.1:5499" };
      expect(resolveTikTokAdsConfig(mkEnv({ ...env, NODE_ENV: "production" })).baseUrl).toBe("https://business-api.tiktok.com");
      expect(resolveTikTokAdsConfig(mkEnv({ ...env, NODE_ENV: "development" })).baseUrl).toBe("http://127.0.0.1:5499");
    });
  });

  describe("utils", () => {
    it("first run backfills the configured days in WIB; later runs re-read the last 7; outages are refilled", () => {
      expect(computeTikTokRange(NOW, 90, null)).toEqual({ since: "2026-07-10", until: "2026-10-07" });
      expect(computeTikTokRange(NOW, 90, "2026-10-07")).toEqual({ since: "2026-10-01", until: "2026-10-07" });
      expect(computeTikTokRange(new Date("2026-10-01T03:00:00Z"), 90, "2026-09-19")).toEqual({ since: "2026-09-19", until: "2026-10-01" });
      expect(computeTikTokRange(NOW, 30, "2026-05-01")).toEqual({ since: "2026-09-08", until: "2026-10-07" });
    });
    it("status mapping, rate-limit classes and back-off", () => {
      expect([mapTikTokStatus("ENABLE"), mapTikTokStatus("DISABLE"), mapTikTokStatus("DELETE"), mapTikTokStatus(null)]).toEqual(["ACTIVE", "PAUSED", "ENDED", "PAUSED"]);
      expect(classifyTikTokAdsError(200, 40100)).toBe("rate_limit");
      expect(classifyTikTokAdsError(429, null)).toBe("rate_limit");
      expect(classifyTikTokAdsError(401, 40105)).toBe("auth");
      expect(classifyTikTokAdsError(500, 50000)).toBe("other");
      expect([1, 2, 3, 4, 5, 9].map(tiktokBackoffMs)).toEqual([15, 30, 60, 120, 180, 180].map((m) => m * 60_000));
    });
  });

  describe("sync", () => {
    it("first run: reads the reporting endpoint in 30-day chunks with the documented parameters, follows paging, stores daily rows, creates campaigns", async () => {
      const { svc, calls, t } = setup();
      const r = await svc.run("MANUAL");
      expect(r).toMatchObject({ status: "SUCCESS", firstRun: true, range: { since: "2026-07-10", until: "2026-10-07" }, insightRows: 3, created: 2, campaigns: 2 });

      const reports = calls.filter((c) => c.path === "report/integrated/get/");
      expect(reports.every((c) => c.method === "GET" && c.token === TOKEN)).toBe(true);
      const q0 = reports[0].query;
      expect(q0).toMatchObject({
        advertiser_id: ADV,
        report_type: "BASIC",
        data_level: "AUCTION_CAMPAIGN",
        start_date: "2026-07-10",
        end_date: "2026-08-08",
        page: "1",
      });
      expect(JSON.parse(q0.dimensions)).toEqual(["campaign_id", "stat_time_day"]);
      expect(JSON.parse(q0.metrics)).toEqual(expect.arrayContaining(["spend", "impressions", "clicks"]));
      expect([...new Set(reports.map((c) => `${c.query.start_date}..${c.query.end_date}`))]).toEqual(["2026-07-10..2026-08-08", "2026-08-09..2026-09-07", "2026-09-08..2026-10-07"]);
      // the last chunk has 3 rows with 2 per page -> 2 pages
      expect(reports.filter((c) => c.query.start_date === "2026-09-08").map((c) => c.query.page)).toEqual(["1", "2"]);
      // the campaign list is paged too (2 campaigns / page size 2 -> 1 page), with the fields asked for
      const list = calls.find((c) => c.path === "campaign/get/")!;
      expect(JSON.parse(list.query.fields)).toEqual(["campaign_id", "campaign_name", "operation_status", "secondary_status", "objective_type"]);
      expect(list.query.advertiser_id).toBe(ADV);

      expect(t.tikTokAdsInsightDaily).toHaveLength(3);
      const c2 = t.tikTokAdsInsightDaily.find((x) => x.tiktokCampaignId === C2);
      expect(Number(c2.amount)).toBe(75001); // integer IDR
      expect(c2).toMatchObject({ currency: "IDR", impressions: 800, clicks: 20, advertiserId: ADV });
      expect(Number(t.tikTokAdsInsightDaily.find((x) => x.tiktokCampaignId === C1 && x.date.toISOString().startsWith("2026-10-06")).amount)).toBe(150000);

      expect(t.campaign.map((c) => c.code).sort()).toEqual(["TT-BRAND-AWARENESS", "TT-OKT-PROMO"]);
      expect(t.campaign.find((c) => c.tiktokCampaignId === C1)).toMatchObject({
        platform: "TIKTOK",
        codeAuto: true,
        tiktokCampaignName: "TT Okt Promo",
        tiktokStatus: "ENABLE",
        tiktokObjective: "LEAD_GENERATION",
        status: "ACTIVE",
      });
      expect(t.tikTokAdsSyncState[0]).toMatchObject({ lastStatus: "SUCCESS", lastError: null, advertiserId: ADV, accountName: "Monomi TT", currency: "IDR", backfilledAdvertiserId: ADV });
    });

    it("the backfill length follows TIKTOK_ADS_SYNC_BACKFILL_DAYS", async () => {
      const { svc, calls } = setup({}, {}, { TIKTOK_ADS_SYNC_BACKFILL_DAYS: "30" });
      const r = await svc.run("MANUAL");
      expect(r.range).toEqual({ since: "2026-09-08", until: "2026-10-07" });
      expect([...new Set(calls.filter((c) => c.path === "report/integrated/get/").map((c) => c.query.start_date))]).toEqual(["2026-09-08"]);
    });

    it("idempotent: a second run does not double rows, campaigns or spend; later runs read only the last 7 days", async () => {
      const { svc, calls, t, clock } = setup();
      await svc.run("MANUAL");
      calls.length = 0;
      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      const r = await svc.run("CRON");
      expect(r).toMatchObject({ status: "SUCCESS", firstRun: false, range: { since: "2026-10-01", until: "2026-10-07" }, created: 0 });
      const reports = calls.filter((c) => c.path === "report/integrated/get/");
      expect([...new Set(reports.map((c) => `${c.query.start_date}..${c.query.end_date}`))]).toEqual(["2026-10-01..2026-10-07"]);
      expect(t.tikTokAdsInsightDaily).toHaveLength(3);
      expect(t.tikTokAdsCampaign).toHaveLength(2);
      expect(t.campaign).toHaveLength(2);
    });

    it("the rolling window picks up restated days and drops days TikTok no longer reports; older history stays", async () => {
      const { svc, state, t, clock } = setup({ rows: [row("c1", "2026-08-01", "999000"), row("c1", "2026-10-06", "150000"), row("c2", "2026-10-07", "75000")] });
      await svc.run("MANUAL");
      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      state.rows = [row("c1", "2026-08-01", "999000"), row("c1", "2026-10-06", "162500")]; // 10-06 restated, c2 day gone
      await svc.run("CRON");
      expect(t.tikTokAdsInsightDaily.map((r) => Number(r.amount)).sort((a, b) => a - b)).toEqual([162500, 999000]);
    });

    it("manual spend is never touched", async () => {
      const { svc, t } = setup(
        {},
        {
          campaign: [{ id: "cm", name: "Manual", code: "MANUAL-1", metaAdIds: [], tiktokCampaignId: null, metaCampaignId: null }],
          campaignSpend: [{ id: "s1", campaignId: "cm", amount: 500000, source: "MANUAL" }],
        },
      );
      await svc.run("MANUAL");
      expect(t.campaignSpend).toEqual([expect.objectContaining({ id: "s1", amount: 500000, source: "MANUAL" })]);
    });

    it("skips (no network) while OFF, INCOMPLETE or INVALID", async () => {
      const { svc, calls } = setup();
      svc.env = () => ({ NODE_ENV: "test" }) as any;
      expect(await svc.run("CRON")).toMatchObject({ status: "SKIPPED" });
      svc.env = () => mkEnv({ TIKTOK_ADS_ACCESS_TOKEN: undefined }) as any;
      expect(await svc.run("CRON")).toMatchObject({ status: "SKIPPED" });
      svc.env = () => mkEnv({ TIKTOK_ADVERTISER_ID: "nope" }) as any;
      expect(await svc.run("CRON")).toMatchObject({ status: "SKIPPED" });
      expect(calls).toHaveLength(0);
    });

    it("a token problem is a FAILED run with a scrubbed message, nothing half-written, lease released", async () => {
      const { svc, state, t } = setup();
      state.fail = (path) => (path === "report/integrated/get/" ? { status: 401, json: { code: 40105, message: `Access token is invalid ${TOKEN}${"x".repeat(70)}` } } : null);
      const r = await svc.run("MANUAL");
      expect(r.status).toBe("FAILED");
      expect(r.message).toMatch(/40105/);
      expect(JSON.stringify(t.tikTokAdsSyncState[0])).not.toContain(TOKEN);
      expect(r.message).not.toContain(TOKEN);
      expect(t.tikTokAdsInsightDaily).toHaveLength(0);
      expect(t.tikTokAdsSyncState[0].leaseUntil).toBeNull();
    });

    it("an advertiser the token cannot see is INCOMPLETE with a readable message", async () => {
      const { svc, state, t } = setup();
      state.advertisers.length = 0;
      const r = await svc.run("MANUAL");
      expect(r.status).toBe("INCOMPLETE");
      expect(r.message).toMatch(/TIKTOK_ADVERTISER_ID/);
      expect(t.tikTokAdsSyncState[0].lastStatus).toBe("INCOMPLETE");
    });
  });

  describe("CRM campaigns", () => {
    it("links an existing unlinked campaign with the same sanitised code or name instead of duplicating it", async () => {
      const { svc, t } = setup({}, {
        campaign: [
          { id: "mine", name: "Something", code: "TT-OKT-PROMO", metaAdIds: [], tiktokCampaignId: null, metaCampaignId: null },
          { id: "byname", name: "tt brand awareness", code: "BRAND-1", metaAdIds: [], tiktokCampaignId: null, metaCampaignId: null },
        ],
      });
      const r = await svc.run("MANUAL");
      expect(r.created).toBe(0);
      expect(t.campaign).toHaveLength(2);
      expect(t.campaign.find((c) => c.id === "mine")).toMatchObject({ tiktokCampaignId: C1, platform: "TIKTOK", code: "TT-OKT-PROMO" });
      expect(t.campaign.find((c) => c.id === "byname")).toMatchObject({ tiktokCampaignId: C2 });
    });

    it("never takes over a campaign that is linked to Meta; makes unique codes (codeAuto)", async () => {
      const { svc, t } = setup({}, { campaign: [{ id: "metaone", name: "TT Okt Promo", code: "TT-OKT-PROMO", metaAdIds: [], metaCampaignId: "120254253291320085", tiktokCampaignId: null }] });
      await svc.run("MANUAL");
      expect(t.campaign.find((c) => c.id === "metaone").tiktokCampaignId ?? null).toBeNull();
      const created = t.campaign.find((c) => c.tiktokCampaignId === C1);
      expect(created).toMatchObject({ code: "TT-OKT-PROMO-2", codeAuto: true });
    });

    it("auto-creates only active campaigns or ones with spend; a renamed campaign keeps its code", async () => {
      const { svc, state, t, clock } = setup();
      state.campaigns.push(
        { campaign_id: "1790000000000003", campaign_name: "Old paused no spend", operation_status: "DISABLE", objective_type: "X" },
        { campaign_id: "1790000000000004", campaign_name: "Paused with spend", operation_status: "DISABLE", objective_type: "X" },
      );
      state.rows.push({ ...row("c1", "2026-10-05", "5000"), campaign_id: "1790000000000004", name: "Paused with spend" });
      await svc.run("MANUAL");
      expect(t.campaign.map((c) => c.tiktokCampaignName).sort()).toEqual(["Paused with spend", "TT Brand Awareness", "TT Okt Promo"]);
      expect(t.campaign.find((c) => c.tiktokCampaignName === "Paused with spend").status).toBe("PAUSED");

      t.campaign.find((c) => c.tiktokCampaignId === C1).code = "LANDING"; // staff renamed the code
      state.campaigns[0].campaign_name = "TT Okt Promo v2";
      state.campaigns[0].operation_status = "DISABLE";
      clock.now = new Date(NOW.getTime() + 3 * 3600_000);
      await svc.run("CRON");
      expect(t.campaign.find((c) => c.tiktokCampaignId === C1)).toMatchObject({ code: "LANDING", tiktokCampaignName: "TT Okt Promo v2", tiktokStatus: "DISABLE", name: "TT Okt Promo" });
      expect(t.campaign).toHaveLength(3);
    });

    it("link / switch / unlink by an admin applies the opt-out so the sync does not re-create it; one TikTok campaign has one CRM campaign", async () => {
      const { svc, state, prisma, t } = setup({}, { campaign: [{ id: "mine", name: "Mine", code: "MINE", metaAdIds: [] }] });
      t.tikTokAdsCampaign.push({ id: "m1", advertiserId: ADV, tiktokCampaignId: C1, name: "TT Okt Promo", operationStatus: "ENABLE", objective: "X", autoLinkDisabled: true });
      await svc.run("MANUAL");
      expect(t.campaign.find((c) => c.tiktokCampaignId === C1)).toBeUndefined(); // opted out
      const admin = new TikTokAdsAdminService(prisma as any, svc);
      expect((await admin.listTikTokCampaigns()).map((o) => o.tiktokCampaignId).sort()).toEqual([C1, C2].sort());

      await admin.setLink("mine", C1);
      expect(t.campaign.find((c) => c.id === "mine")).toMatchObject({ tiktokCampaignId: C1, platform: "TIKTOK", tiktokCampaignName: "TT Okt Promo" });
      expect(t.tikTokAdsCampaign.find((m) => m.tiktokCampaignId === C1).autoLinkDisabled).toBe(false);
      t.campaign.push({ id: "other", name: "Other", code: "OTHER", metaAdIds: [], tiktokCampaignId: null });
      await expect(admin.setLink("other", C1)).rejects.toMatchObject({ status: 409 });
      await expect(admin.setLink("other", "1790000000009999")).rejects.toMatchObject({ status: 404 });

      // switch to a third campaign: the previous one is opted out of auto-creation
      state.campaigns.push({ campaign_id: "1790000000000003", campaign_name: "TT Third", operation_status: "DISABLE", objective_type: "X" });
      await svc.run("MANUAL");
      await admin.setLink("mine", "1790000000000003");
      expect(t.tikTokAdsCampaign.find((m) => m.tiktokCampaignId === C1).autoLinkDisabled).toBe(true);
      await admin.setLink("mine", null);
      expect(t.campaign.find((c) => c.id === "mine")).toMatchObject({ tiktokCampaignId: null, tiktokCampaignName: null });
      await svc.run("MANUAL");
      expect(t.campaign.filter((c) => c.tiktokCampaignId === C1 || c.tiktokCampaignId === "1790000000000003")).toHaveLength(0);
    });
  });

  describe("auto-link never changes another platform's campaign", () => {
    it("a CRM campaign whose platform is something else is not taken over: a new codeAuto campaign is created", async () => {
      const { svc, t } = setup({}, { campaign: [{ id: "fb", name: "TT Okt Promo", code: "TT-OKT-PROMO", platform: "FACEBOOK", metaAdIds: [], tiktokCampaignId: null, metaCampaignId: null }] });
      await svc.run("MANUAL");
      expect(t.campaign.find((c) => c.id === "fb")).toMatchObject({ platform: "FACEBOOK", tiktokCampaignId: null });
      expect(t.campaign.find((c) => c.tiktokCampaignId === C1)).toMatchObject({ code: "TT-OKT-PROMO-2", codeAuto: true, platform: "TIKTOK" });
    });

    it("a campaign whose platform is unset or already TIKTOK is still linked", async () => {
      const { svc, t } = setup({}, {
        campaign: [
          { id: "unset", name: "TT Okt Promo", code: "TT-OKT-PROMO", platform: null, metaAdIds: [], tiktokCampaignId: null, metaCampaignId: null },
          { id: "tt", name: "TT Brand Awareness", code: "BRAND", platform: "TIKTOK", metaAdIds: [], tiktokCampaignId: null, metaCampaignId: null },
        ],
      });
      await svc.run("MANUAL");
      expect(t.campaign.find((c) => c.id === "unset")).toMatchObject({ tiktokCampaignId: C1, platform: "TIKTOK" });
      expect(t.campaign.find((c) => c.id === "tt")).toMatchObject({ tiktokCampaignId: C2 });
      expect(t.campaign).toHaveLength(2);
    });
  });

  describe("spend is never summed across currencies", () => {
    it("TikTok in USD against a rupiah total is shown apart, not added", async () => {
      const { svc, prisma, t } = setup({ currency: "USD" });
      await svc.run("MANUAL");
      const c1 = t.campaign.find((c) => c.tiktokCampaignId === C1);
      const row: any = (await new CrmCampaignsService(prisma as any).list()).find((c: any) => c.id === c1.id);
      expect(row).toMatchObject({ tiktokSpend: 250000.4, tiktokCurrency: "USD", tiktokSeparate: true, spend: 0, spendCurrency: "IDR" });
    });

    it("Meta in USD and TikTok in IDR: TikTok stays apart (and manual rupiah too); Meta in USD and TikTok in USD add up in USD", async () => {
      const { tiktokSpendSeparate } = require("./tiktok-ads-spend");
      expect(tiktokSpendSeparate("USD", "IDR")).toBe(true);
      expect(tiktokSpendSeparate("IDR", "USD")).toBe(true);
      expect(tiktokSpendSeparate("USD", "USD")).toBe(false);
      expect(tiktokSpendSeparate("IDR", "IDR")).toBe(false);
      const ctx = setup({ currency: "IDR" }, { metaAdsSyncState: [{ id: "default", currency: "USD", lastSuccessAt: NOW }] });
      await ctx.svc.run("MANUAL");
      const c1 = ctx.t.campaign.find((c) => c.tiktokCampaignId === C1);
      const row: any = (await new CrmCampaignsService(ctx.prisma as any).list()).find((c: any) => c.id === c1.id);
      expect(row).toMatchObject({ spendCurrency: "USD", tiktokCurrency: "IDR", tiktokSeparate: true, spend: 0 });
    });
  });

  describe("attribution by TikTok campaign id", () => {
    const click = (over: any) => ({ id: over.id, utmCampaign: null, campaignCode: null, leadId: null, ...over });

    it("backfills clicks and AUTO / empty leads; never overwrites staff's MANUAL campaign; idempotent", async () => {
      const { prisma, t } = setup({}, {
        campaign: [
          { id: "c-tt", name: "TT Okt Promo", code: "TT-OKT", metaAdIds: [], tiktokCampaignId: C1 },
          { id: "c-manual", name: "Manual", code: "MANUAL", metaAdIds: [] },
          { id: "c-old", name: "Old", code: "OLD", metaAdIds: [] },
        ],
        adClick: [
          click({ id: "k1", utmCampaign: C1, leadId: "l1" }),
          click({ id: "k2", utmCampaign: C1, leadId: "l2" }),
          click({ id: "k3", utmCampaign: C1, leadId: "l3" }),
          click({ id: "k4", utmCampaign: C1, leadId: null }),
          click({ id: "k5", utmCampaign: "something-else", leadId: "l4" }),
          click({ id: "k6", utmCampaign: C1, leadId: "l5" }),
        ],
        lead: [
          { id: "l1", campaignId: null, campaignCode: null },
          { id: "l2", campaignId: "c-manual", campaignCode: "MANUAL", campaignSource: "MANUAL" },
          { id: "l3", campaignId: null, campaignCode: "TYPED-UNKNOWN" },
          { id: "l4", campaignId: null, campaignCode: null },
          { id: "l5", campaignId: "c-old", campaignCode: "OLD", campaignSource: "AUTO" },
        ],
      });
      const r = await backfillTikTokAttribution(prisma as any);
      expect(r).toEqual({ clicks: 5, leads: 2 });
      expect(t.adClick.find((c) => c.id === "k4").campaignCode).toBe("TT-OKT");
      expect(t.adClick.find((c) => c.id === "k5").campaignCode).toBeNull();
      expect(t.lead.find((l) => l.id === "l1")).toMatchObject({ campaignId: "c-tt", campaignCode: "TT-OKT", campaignSource: "AUTO" });
      expect(t.lead.find((l) => l.id === "l2")).toMatchObject({ campaignId: "c-manual", campaignSource: "MANUAL" });
      expect(t.lead.find((l) => l.id === "l3")).toMatchObject({ campaignId: null, campaignCode: "TYPED-UNKNOWN" });
      expect(t.lead.find((l) => l.id === "l5")).toMatchObject({ campaignId: "c-tt", campaignSource: "AUTO" }); // AUTO follows the link
      expect(await backfillTikTokAttribution(prisma as any)).toEqual({ clicks: 0, leads: 0 });

      // unlink: AUTO attribution is withdrawn, MANUAL stays
      const rel = await releaseTikTokAttribution(prisma as any, C1, { id: "c-tt", code: "TT-OKT" });
      expect(rel.leads).toBe(2);
      expect(t.lead.find((l) => l.id === "l1")).toMatchObject({ campaignId: null, campaignCode: null, campaignSource: null });
      expect(t.lead.find((l) => l.id === "l2")).toMatchObject({ campaignId: "c-manual" });
      expect(t.adClick.find((c) => c.id === "k1").campaignCode).toBeNull();
    });

    it("the sync's own backfill links earlier landing clicks once the campaign exists", async () => {
      const { svc, t } = setup({}, { adClick: [click({ id: "k1", utmCampaign: C1, leadId: "l1" })], lead: [{ id: "l1", campaignId: null, campaignCode: null }] });
      const r = await svc.run("MANUAL");
      expect(r).toMatchObject({ attributedClicks: 1, attributedLeads: 1 });
      expect(t.lead[0]).toMatchObject({ campaignCode: "TT-OKT-PROMO", campaignSource: "AUTO" });
    });

    it("a new landing click whose utm_campaign is the TikTok campaign id resolves to the linked campaign", async () => {
      const restore = withEnv({ NODE_ENV: "test" });
      try {
        const prisma = new FakePrisma({
          campaign: [{ id: "c-tt", name: "TT", code: "TT-OKT", metaAdIds: [], tiktokCampaignId: C1 }],
          adClick: [],
        });
        const clicks = new AdClickService(prisma as any);
        const send = async (n: number, campaign: string) =>
          clicks.recordEvent(
            parseTrackEvent(
              JSON.stringify({
                visitId: `55555555-0000-4000-8000-${String(n).padStart(12, "0")}`,
                name: "PageView",
                eventId: `evt-000000000${n}`,
                pageUrl: `https://link.monomiagency.com/?utm_source=tiktok&utm_campaign=${campaign}&ttclid=E.C.P.abc123`,
                utm: { source: "tiktok", medium: "paid", campaign },
              }),
            )!,
            { ip: "198.51.100.7", userAgent: "Mozilla/5.0" },
          );
        await send(1, C1);
        await send(2, "1790000000009999"); // digits, not linked
        expect(prisma.tables.adClick.map((r) => r.campaignCode)).toEqual(["TT-OKT", null]);
      } finally {
        restore();
      }
    });
  });

  describe("rate limits and the lease", () => {
    it.each([
      [200, 40100],
      [429, null],
    ])("HTTP %s / code %s backs off 15 min, then longer; no traffic while backing off", async (status, code) => {
      const { svc, state, calls, t, clock } = setup();
      state.fail = (path) => (path === "report/integrated/get/" ? { status: status as number, json: { code: code ?? 40100, message: "Too many requests" } } : null);
      expect(await svc.run("CRON")).toMatchObject({ status: "RATE_LIMITED" });
      expect(t.tikTokAdsSyncState[0]).toMatchObject({ lastStatus: "RATE_LIMITED", rateLimitStrikes: 1 });
      expect(t.tikTokAdsSyncState[0].rateLimitedUntil.getTime()).toBe(NOW.getTime() + 15 * 60_000);

      const n = calls.length;
      clock.now = new Date(NOW.getTime() + 5 * 60_000);
      expect(await svc.run("MANUAL")).toMatchObject({ status: "RATE_LIMITED" });
      expect(calls.length).toBe(n);

      clock.now = new Date(NOW.getTime() + 16 * 60_000);
      expect(await svc.run("CRON")).toMatchObject({ status: "RATE_LIMITED" });
      expect(t.tikTokAdsSyncState[0].rateLimitStrikes).toBe(2);
      expect(t.tikTokAdsSyncState[0].rateLimitedUntil.getTime()).toBe(NOW.getTime() + 16 * 60_000 + 30 * 60_000);
    });

    it("a successful run clears the back-off", async () => {
      const { svc, state, t, clock } = setup();
      state.fail = (path) => (path === "report/integrated/get/" ? { status: 200, json: { code: 40100, message: "limit" } } : null);
      await svc.run("CRON");
      state.fail = null;
      clock.now = new Date(NOW.getTime() + 20 * 60_000);
      expect((await svc.run("CRON")).status).toBe("SUCCESS");
      expect(t.tikTokAdsSyncState[0]).toMatchObject({ rateLimitStrikes: 0, rateLimitedUntil: null, lastStatus: "SUCCESS" });
    });

    it("overlapping runs never double-sync (BUSY); a stale lease expires", async () => {
      const a = setup();
      const [x, y] = await Promise.all([a.svc.run("CRON"), a.svc.run("MANUAL")]);
      expect([x.status, y.status].sort()).toEqual(["BUSY", "SUCCESS"]);
      expect(a.calls.filter((c) => c.path === "campaign/get/")).toHaveLength(1);
      expect(a.t.tikTokAdsSyncState[0].leaseUntil).toBeNull();

      const b = setup({}, { tikTokAdsSyncState: [{ id: "default", leaseOwner: "dead:1", leaseUntil: new Date(NOW.getTime() + 60_000) }] });
      expect((await b.svc.run("CRON")).status).toBe("BUSY");
      b.clock.now = new Date(NOW.getTime() + TIKTOK_LEASE_MS + 1);
      expect((await b.svc.run("CRON")).status).toBe("SUCCESS");
    });
  });

  describe("spend in the CRM", () => {
    it("campaign list and daily spend show synced TikTok spend (read-only, source TIKTOK) and cost per lead", async () => {
      const { svc, prisma, t } = setup();
      await svc.run("MANUAL");
      const c1 = t.campaign.find((c) => c.tiktokCampaignId === C1);
      t.lead.push({ id: "l1", campaignId: c1.id, stageId: "st-new", createdAt: NOW, activities: [] });
      t.lead.push({ id: "l2", campaignId: c1.id, stageId: "st-new", createdAt: NOW, activities: [] });
      const svcC = new CrmCampaignsService(prisma as any);
      const list = await svcC.list();
      const row: any = list.find((c: any) => c.id === c1.id);
      expect(row).toMatchObject({ tiktokSpend: 250000, spend: 250000, impressions: 2000, clicks: 100, tiktokCurrency: "IDR", tiktokSeparate: false, metaSpend: 0 });
      expect(row.costPerLead).toBe(125000);
      const daily = await svcC.listSpend(c1.id);
      expect(daily).toHaveLength(2);
      expect(daily[0]).toMatchObject({ source: "TIKTOK", readOnly: true, id: "tiktok:2026-10-07", amount: 100000 });
      const agg = await loadTikTokSpend(prisma as any, { range: { from: new Date("2026-10-07T00:00:00+07:00"), to: new Date("2026-10-07T23:00:00+07:00") } });
      expect(agg.byCampaign.get(c1.id)).toMatchObject({ amount: 100000 });
    });
  });

  describe("Connect TikTok Ads (auth_code exchange)", () => {
    const withOAuth = (env: Record<string, string | undefined>) => {
      const ctx = setup({}, {}, { TIKTOK_ADS_ACCESS_TOKEN: undefined, TIKTOK_ADS_APP_ID: APP_ID, TIKTOK_ADS_APP_SECRET: APP_SECRET, ...env });
      ctx.state.oauth = () => ({ status: 200, json: { code: 0, message: "OK", request_id: "R", data: { access_token: TOKEN, scope: [4], advertiser_ids: [ADV, "7000000000000002"] } } });
      const admin = new TikTokAdsAdminService(ctx.prisma as any, ctx.svc);
      return { ...ctx, admin };
    };

    it("posts app_id / secret / auth_code as JSON to /oauth2/access_token/ and stores the token ENCRYPTED, never returning it", async () => {
      const { admin, calls, t, svc } = withOAuth({ TOKEN_ENCRYPTION_KEY: ENC_KEY });
      const res = await admin.connect("authcode_1234567890abcdef");
      expect(res).toEqual({ stored: true, advertiserIds: [ADV, "7000000000000002"] });
      expect(JSON.stringify(res)).not.toContain(TOKEN);
      const call = calls.find((c) => c.path === "oauth2/access_token/")!;
      expect(call).toMatchObject({ method: "POST", token: null, json: { app_id: APP_ID, secret: APP_SECRET, auth_code: "authcode_1234567890abcdef" } });
      const s = t.tikTokAdsSyncState[0];
      expect(s.tokenEnc).toMatch(/^v1:/);
      expect(JSON.stringify(s)).not.toContain(TOKEN);
      expect(s.tokenAdvertiserIds).toEqual([ADV, "7000000000000002"]);
      expect(decryptToken(s.tokenEnc, resolveTokenKey(mkEnv({ TOKEN_ENCRYPTION_KEY: ENC_KEY })), TIKTOK_TOKEN_AAD)).toBe(TOKEN);
      // status never shows it either
      const status = await admin.status();
      expect(status).toMatchObject({ tokenSource: "STORED", canStoreToken: true, appConfigured: true });
      expect(JSON.stringify(status)).not.toContain(TOKEN);
      // and the sync now runs on the stored token
      const r = await svc.run("MANUAL");
      expect(r.status).toBe("SUCCESS");
      expect(calls.filter((c) => c.path === "advertiser/info/").every((c) => c.token === TOKEN)).toBe(true);
    });

    it("without TOKEN_ENCRYPTION_KEY nothing is stored: the token is returned once with the instruction", async () => {
      const { admin, t } = withOAuth({});
      const res = await admin.connect("authcode_1234567890abcdef");
      expect(res).toMatchObject({ stored: false, token: TOKEN });
      expect(res.note).toMatch(/TIKTOK_ADS_ACCESS_TOKEN/);
      expect(t.tikTokAdsSyncState).toHaveLength(0);
      expect((await admin.status()).canStoreToken).toBe(false);
    });

    it("a refused code is a 400 whose message holds no secret; bad formats and missing app credentials are 400 without calling TikTok", async () => {
      const { admin, state, calls } = withOAuth({ TOKEN_ENCRYPTION_KEY: ENC_KEY });
      state.oauth = () => ({ status: 200, json: { code: 40110, message: `Invalid auth_code ${APP_SECRET}`, request_id: "R" } });
      const err: any = await admin.connect("authcode_1234567890abcdef").catch((e) => e);
      expect(err.status).toBe(400);
      expect(JSON.stringify(err.response)).not.toContain(APP_SECRET);
      await expect(admin.connect("bad code!")).rejects.toMatchObject({ status: 400 });
      await expect(admin.connect("")).rejects.toMatchObject({ status: 400 });
      const n = calls.length;
      const noApp = withOAuth({ TIKTOK_ADS_APP_ID: undefined });
      await expect(noApp.admin.connect("authcode_1234567890abcdef")).rejects.toMatchObject({ status: 400 });
      expect(noApp.calls.filter((c) => c.path === "oauth2/access_token/")).toHaveLength(0);
      expect(calls.length).toBe(n + 0);
    });

    it("the environment token keeps precedence and says so; disconnect forgets the stored copy", async () => {
      const { admin, t } = withOAuth({ TOKEN_ENCRYPTION_KEY: ENC_KEY, TIKTOK_ADS_ACCESS_TOKEN: TOKEN });
      const res = await admin.connect("authcode_1234567890abcdef");
      expect(res.stored).toBe(true);
      expect(res.note).toMatch(/TIKTOK_ADS_ACCESS_TOKEN/);
      expect((await admin.status()).tokenSource).toBe("ENV");
      await admin.disconnect();
      expect(t.tikTokAdsSyncState[0]).toMatchObject({ tokenEnc: null, tokenKeyId: null, tokenAdvertiserIds: [] });
    });

    it("redacts EVERY occurrence of the app secret in a refusal message (split/join, not a first-match replace)", async () => {
      const { admin, state } = withOAuth({ TOKEN_ENCRYPTION_KEY: ENC_KEY });
      state.oauth = () => ({ status: 200, json: { code: 40110, message: `bad ${APP_SECRET} and again ${APP_SECRET} $& ${APP_SECRET}`, request_id: "R" } });
      const err: any = await admin.connect("authcode_1234567890abcdef").catch((e) => e);
      expect(err.status).toBe(400);
      expect(JSON.stringify(err.response)).not.toContain(APP_SECRET);
      expect(JSON.stringify(err.response)).toContain("[redacted]");
    });

    it("in production a plaintext token is NEVER returned: no key -> clear error, and the auth_code is not spent", async () => {
      const { admin, calls, t } = withOAuth({ NODE_ENV: "production" });
      const err: any = await admin.connect("authcode_1234567890abcdef").catch((e) => e);
      expect(err.status).toBe(400);
      expect(JSON.stringify(err.response)).toMatch(/TOKEN_ENCRYPTION_KEY/);
      expect(JSON.stringify(err.response)).not.toContain(TOKEN);
      expect(calls.filter((c) => c.path === "oauth2/access_token/")).toHaveLength(0);
      expect(t.tikTokAdsSyncState).toHaveLength(0);
    });

    it("a key that is present but INVALID is the same error (in production and elsewhere), never a plaintext fallback", async () => {
      for (const NODE_ENV of ["production", "test"]) {
        const { admin, calls } = withOAuth({ NODE_ENV, TOKEN_ENCRYPTION_KEY: "not-a-valid-key" });
        const err: any = await admin.connect("authcode_1234567890abcdef").catch((e) => e);
        expect(err.status).toBe(400);
        expect(JSON.stringify(err.response)).toMatch(/TOKEN_ENCRYPTION_KEY/);
        expect(calls.filter((c) => c.path === "oauth2/access_token/")).toHaveLength(0);
      }
    });

    it("with a valid key production stores the token encrypted as usual", async () => {
      const { admin } = withOAuth({ NODE_ENV: "production", TOKEN_ENCRYPTION_KEY: ENC_KEY });
      expect(await admin.connect("authcode_1234567890abcdef")).toEqual({ stored: true, advertiserIds: [ADV, "7000000000000002"] });
    });

    it("the connect response is sent with Cache-Control: no-store", async () => {
      const { CrmController } = require("../crm.controller");
      const res = { setHeader: jest.fn() };
      const connect = jest.fn().mockResolvedValue({ stored: true, advertiserIds: [] });
      await CrmController.prototype.tiktokAdsConnect.call({ tiktokAds: { connect } }, { authCode: "authcode_1234567890abcdef" }, res);
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
      expect(connect).toHaveBeenCalledWith("authcode_1234567890abcdef");
    });

    it("a network failure during the exchange is a plain 400 (no internals)", async () => {
      const { admin, svc } = withOAuth({ TOKEN_ENCRYPTION_KEY: ENC_KEY });
      svc.http = { request: async () => { throw new Error(`connect ECONNREFUSED ${APP_SECRET}`); } };
      const err: any = await admin.connect("authcode_1234567890abcdef").catch((e) => e);
      expect(err.status).toBe(400);
      expect(JSON.stringify(err.response)).not.toContain(APP_SECRET);
    });
  });
});
