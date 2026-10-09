import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { scrubSecrets } from "../../instagram/instagram-graph.client";
import { resolveTokenKey } from "../../instagram/instagram.config";
import { decryptToken, tokenKeyFingerprint } from "../../instagram/utils/token-crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { chunkRange, dateOnly, parseCount, parseSpend, sanitizeCampaignCode, uniqueCampaignCode } from "../meta-ads/meta-ads.utils";
import { backfillTikTokAttribution } from "./tiktok-ads.attribution";
import {
  resolveTikTokAdsConfig,
  TIKTOK_ADS_REPORT_CHUNK_DAYS,
  TikTokAdsConfig,
} from "./tiktok-ads.config";
import {
  classifyTikTokAdsError,
  computeTikTokRange,
  mapTikTokStatus,
  TikTokAdsApiError,
  tiktokBackoffMs,
} from "./tiktok-ads.utils";

/** Renewed on every call, so it only has to outlast one slow request. */
export const TIKTOK_LEASE_MS = 20 * 60_000;
export const TIKTOK_TOKEN_AAD = Buffer.from("tiktok-ads-token", "utf8");
const PAGE_SIZE = 1000;
const MAX_PAGES = 200;
const CHUNK = 200;

export type TikTokSyncStatus = "SUCCESS" | "FAILED" | "RATE_LIMITED" | "INCOMPLETE" | "SKIPPED" | "BUSY";

export interface TikTokSyncResult {
  status: TikTokSyncStatus;
  message?: string;
  advertiserId?: string;
  range?: { since: string; until: string };
  firstRun?: boolean;
  insightRows?: number;
  campaigns?: number;
  created?: number;
  attributedClicks?: number;
  attributedLeads?: number;
}

export interface TikTokAdsHttp {
  request(
    method: "GET" | "POST",
    url: string,
    opts: { token?: string | null; query?: Record<string, string>; json?: unknown },
  ): Promise<{ status: number; json: any }>;
}

const fetchHttp: TikTokAdsHttp = {
  async request(method, url, opts) {
    const u = new URL(url);
    for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, v);
    const res = await fetch(u.toString(), {
      method,
      headers: {
        ...(opts.token ? { "Access-Token": opts.token } : {}),
        ...(opts.json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(opts.json !== undefined ? { body: JSON.stringify(opts.json) } : {}),
      signal: AbortSignal.timeout(30_000),
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON */
    }
    return { status: res.status, json };
  },
};

interface CampaignInfo {
  name: string;
  operationStatus: string | null;
  secondaryStatus: string | null;
  objective: string | null;
}
interface DayRow {
  tiktokCampaignId: string;
  date: string;
  amount: number;
  impressions: number;
  clicks: number;
}

@Injectable()
export class TikTokAdsSyncService {
  private readonly logger = new Logger(TikTokAdsSyncService.name);
  /** Overridable in tests. */
  env: () => NodeJS.ProcessEnv = () => process.env;
  now: () => Date = () => new Date();
  http: TikTokAdsHttp = fetchHttp;
  private owner: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Every 3 hours (Asia/Jakarta). Never throws. */
  @Cron("30 */3 * * *", { name: "tiktok-ads-sync", timeZone: "Asia/Jakarta" })
  async cron(): Promise<void> {
    try {
      const r = await this.run("CRON");
      if (r.status !== "SKIPPED" && r.status !== "BUSY") {
        this.logger.log(`TikTok Ads sync ${r.status}${r.message ? `: ${r.message}` : ""}`);
      }
    } catch (error) {
      this.logger.warn(`TikTok Ads sync crashed: ${scrubSecrets((error as Error).message)}`);
    }
  }

  // ---- token + config -------------------------------------------------------

  /** The env token, else the one stored by the Connect helper (decrypted in memory only). */
  async resolveToken(cfg: TikTokAdsConfig): Promise<string | null> {
    if (cfg.envToken) return cfg.envToken;
    const s = await this.prisma.tikTokAdsSyncState.findUnique({ where: { id: "default" } });
    if (!s?.tokenEnc) return null;
    try {
      const key = resolveTokenKey(this.env());
      if (s.tokenKeyId && s.tokenKeyId !== tokenKeyFingerprint(key)) {
        this.logger.error("Stored TikTok Ads token was encrypted with a different TOKEN_ENCRYPTION_KEY");
        return null;
      }
      return decryptToken(s.tokenEnc, key, TIKTOK_TOKEN_AAD);
    } catch (error) {
      this.logger.error(`Stored TikTok Ads token cannot be decrypted: ${(error as Error).message}`);
      return null;
    }
  }

  async config(): Promise<{ cfg: TikTokAdsConfig; token: string | null }> {
    const env = this.env();
    const base = resolveTikTokAdsConfig(env);
    const needStored = base.syncEnabled && !base.envToken;
    const stored = needStored ? await this.resolveToken(base) : null;
    return { cfg: resolveTikTokAdsConfig(env, { hasStoredToken: !!stored }), token: base.envToken ?? stored };
  }

  // ---- lease ------------------------------------------------------------------

  private async acquire(owner: string): Promise<boolean> {
    await this.prisma.tikTokAdsSyncState.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
    const now = this.now();
    const r = await this.prisma.tikTokAdsSyncState.updateMany({
      where: { id: "default", OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      data: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + TIKTOK_LEASE_MS) },
    });
    return r.count === 1;
  }

  private async release(owner: string): Promise<void> {
    await this.prisma.tikTokAdsSyncState.updateMany({
      where: { id: "default", leaseOwner: owner },
      data: { leaseOwner: null, leaseUntil: null },
    });
  }

  private async renewLease(): Promise<void> {
    if (!this.owner) return;
    await this.prisma.tikTokAdsSyncState
      .updateMany({
        where: { id: "default", leaseOwner: this.owner },
        data: { leaseUntil: new Date(this.now().getTime() + TIKTOK_LEASE_MS) },
      })
      .catch(() => undefined);
  }

  // ---- API -----------------------------------------------------------------------

  private async get<T = any>(cfg: TikTokAdsConfig, token: string, path: string, query: Record<string, string>): Promise<T> {
    await this.renewLease();
    let res: { status: number; json: any };
    try {
      res = await this.http.request("GET", `${cfg.baseUrl}/open_api/v1.3/${path}`, { token, query });
    } catch (error) {
      throw new TikTokAdsApiError(this.scrub((error as Error).message, token), "other", null, null);
    }
    const code = typeof res.json?.code === "number" ? res.json.code : null;
    if (res.status === 200 && code === 0) return (res.json?.data ?? {}) as T;
    throw new TikTokAdsApiError(
      this.scrub(`code ${code ?? "-"}: ${String(res.json?.message ?? `HTTP ${res.status}`)}`, token),
      classifyTikTokAdsError(res.status, code),
      res.status,
      code,
    );
  }

  private scrub(text: string, token?: string | null): string {
    let out = scrubSecrets(text ?? "");
    if (token) out = out.split(token).join("[redacted]");
    return out.slice(0, 400);
  }

  /** Pages through `list` (page / page_size) until the last page. */
  private async pageAll<T>(
    cfg: TikTokAdsConfig,
    token: string,
    path: string,
    query: Record<string, string>,
  ): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await this.get<any>(cfg, token, path, { ...query, page: String(page), page_size: String(PAGE_SIZE) });
      out.push(...((data.list as T[] | undefined) ?? []));
      const total = Number(data.page_info?.total_page ?? 1);
      if (!Number.isFinite(total) || page >= total) return out;
    }
    throw new Error(`TikTok paging did not end for ${path}`);
  }

  // ---- run -------------------------------------------------------------------------

  async run(trigger: "CRON" | "MANUAL"): Promise<TikTokSyncResult> {
    const { cfg, token } = await this.config();
    if (cfg.state !== "READY" || !token) {
      return { status: "SKIPPED", message: cfg.problems[0] ?? `TikTok Ads sync is ${cfg.state}` };
    }
    const owner = `${process.pid}:${randomBytes(4).toString("hex")}`;
    if (!(await this.acquire(owner))) return { status: "BUSY", message: "A sync is already running" };
    this.owner = owner;
    const startedAt = this.now();
    try {
      const state = await this.prisma.tikTokAdsSyncState.findUnique({ where: { id: "default" } });
      if (state?.rateLimitedUntil && state.rateLimitedUntil > startedAt) {
        return {
          status: "RATE_LIMITED",
          message: `TikTok asked us to slow down; next attempt after ${state.rateLimitedUntil.toISOString()}`,
        };
      }
      const lastTo = state?.lastRangeTo ? state.lastRangeTo.toISOString().slice(0, 10) : null;
      return await this.sync(cfg, token, trigger, startedAt, state?.backfilledAdvertiserId ?? null, lastTo);
    } catch (error) {
      return await this.recordFailure(error, trigger, startedAt, token);
    } finally {
      await this.release(owner).catch(() => undefined);
      this.owner = null;
    }
  }

  private async recordFailure(error: unknown, trigger: string, at: Date, token: string): Promise<TikTokSyncResult> {
    const message = this.scrub((error as Error)?.message ?? "Sync failed", token);
    if (error instanceof TikTokAdsApiError && error.kind === "rate_limit") {
      const cur = await this.prisma.tikTokAdsSyncState.findUnique({ where: { id: "default" } });
      const strikes = (cur?.rateLimitStrikes ?? 0) + 1;
      await this.prisma.tikTokAdsSyncState.update({
        where: { id: "default" },
        data: {
          lastRunAt: at,
          lastTrigger: trigger,
          lastStatus: "RATE_LIMITED",
          lastError: message,
          rateLimitStrikes: strikes,
          rateLimitedUntil: new Date(at.getTime() + tiktokBackoffMs(strikes)),
        },
      });
      return { status: "RATE_LIMITED", message };
    }
    await this.prisma.tikTokAdsSyncState
      .update({
        where: { id: "default" },
        data: { lastRunAt: at, lastTrigger: trigger, lastStatus: "FAILED", lastError: message },
      })
      .catch(() => undefined);
    return { status: "FAILED", message };
  }

  private async sync(
    cfg: TikTokAdsConfig,
    token: string,
    trigger: string,
    startedAt: Date,
    backfilledAdvertiserId: string | null,
    lastRangeTo: string | null,
  ): Promise<TikTokSyncResult> {
    const advertiserId = cfg.advertiserId as string;
    // ---- advertiser: name, currency, time zone
    const info = await this.get<any>(cfg, token, "advertiser/info/", {
      advertiser_ids: JSON.stringify([advertiserId]),
      fields: JSON.stringify(["name", "currency", "timezone", "status"]),
    });
    const adv = (info.list ?? [])[0];
    if (!adv) {
      const message = "The token cannot see this advertiser. Check TIKTOK_ADVERTISER_ID and the authorization of the app.";
      await this.prisma.tikTokAdsSyncState.update({
        where: { id: "default" },
        data: { lastRunAt: startedAt, lastTrigger: trigger, lastStatus: "INCOMPLETE", lastError: message },
      });
      return { status: "INCOMPLETE", message };
    }
    const currency = String(adv.currency ?? "IDR").toUpperCase();
    const timezone = adv.timezone ? String(adv.timezone) : null;
    const accountName = String(adv.name ?? advertiserId);

    const firstRun = backfilledAdvertiserId !== advertiserId;
    const range = computeTikTokRange(startedAt, cfg.backfillDays, firstRun ? null : lastRangeTo, timezone);

    // ---- campaigns (names + status)
    const campaignList = await this.pageAll<any>(cfg, token, "campaign/get/", {
      advertiser_id: advertiserId,
      fields: JSON.stringify(["campaign_id", "campaign_name", "operation_status", "secondary_status", "objective_type"]),
    });

    // ---- report: spend per campaign per day, 30-day chunks
    const rows = new Map<string, DayRow>();
    const reportNames = new Map<string, string>();
    for (const part of chunkRange(range.since, range.until, TIKTOK_ADS_REPORT_CHUNK_DAYS)) {
      const list = await this.pageAll<any>(cfg, token, "report/integrated/get/", {
        advertiser_id: advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_CAMPAIGN",
        dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
        metrics: JSON.stringify(["spend", "impressions", "clicks", "campaign_name"]),
        start_date: part.since,
        end_date: part.until,
      });
      for (const r of list) {
        const tiktokCampaignId = String(r?.dimensions?.campaign_id ?? "");
        const date = String(r?.dimensions?.stat_time_day ?? "").slice(0, 10);
        if (!/^\d+$/.test(tiktokCampaignId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        if (date < range.since || date > range.until) continue;
        rows.set(`${tiktokCampaignId}|${date}`, {
          tiktokCampaignId,
          date,
          amount: parseSpend(r?.metrics?.spend, currency),
          impressions: parseCount(r?.metrics?.impressions),
          clicks: parseCount(r?.metrics?.clicks),
        });
        if (r?.metrics?.campaign_name) reportNames.set(tiktokCampaignId, String(r.metrics.campaign_name));
      }
    }

    // ---- campaign cache (report names fill in deleted campaigns the list no longer shows)
    const campaignInfo = new Map<string, CampaignInfo>();
    for (const c of campaignList) {
      if (!c?.campaign_id) continue;
      campaignInfo.set(String(c.campaign_id), {
        name: String(c.campaign_name ?? c.campaign_id),
        operationStatus: c.operation_status ?? null,
        secondaryStatus: c.secondary_status ?? null,
        objective: c.objective_type ?? null,
      });
    }
    for (const r of rows.values()) {
      if (!campaignInfo.has(r.tiktokCampaignId)) {
        campaignInfo.set(r.tiktokCampaignId, {
          name: reportNames.get(r.tiktokCampaignId) ?? r.tiktokCampaignId,
          operationStatus: null,
          secondaryStatus: null,
          objective: null,
        });
      }
    }
    for (const [tiktokCampaignId, c] of campaignInfo) {
      await this.prisma.tikTokAdsCampaign.upsert({
        where: { tiktokCampaignId },
        create: { advertiserId, tiktokCampaignId, ...c },
        update: { advertiserId, ...c },
      });
    }

    // ---- daily rows: idempotent upsert on (campaign, date)
    const list = [...rows.values()];
    for (let i = 0; i < list.length; i += CHUNK) {
      await this.prisma.$transaction(
        list.slice(i, i + CHUNK).map((r) => {
          const date = dateOnly(r.date);
          const data = {
            advertiserId,
            amount: new Prisma.Decimal(r.amount),
            currency,
            impressions: r.impressions,
            clicks: r.clicks,
          };
          return this.prisma.tikTokAdsInsightDaily.upsert({
            where: { tiktokCampaignId_date: { tiktokCampaignId: r.tiktokCampaignId, date } },
            create: { tiktokCampaignId: r.tiktokCampaignId, date, ...data },
            update: data,
          });
        }),
      );
    }
    // days TikTok restated to "no delivery" inside the window are gone upstream: drop them here too
    const inWindow = await this.prisma.tikTokAdsInsightDaily.findMany({
      where: { advertiserId, date: { gte: dateOnly(range.since), lte: dateOnly(range.until) } },
      select: { id: true, tiktokCampaignId: true, date: true },
    });
    const stale = inWindow
      .filter((r) => !rows.has(`${r.tiktokCampaignId}|${r.date.toISOString().slice(0, 10)}`))
      .map((r) => r.id);
    if (stale.length) await this.prisma.tikTokAdsInsightDaily.deleteMany({ where: { id: { in: stale } } });

    // ---- link / create CRM campaigns, then attribute clicks and leads
    const created = await this.syncCrmCampaigns(campaignInfo, rows);
    const attributed = await backfillTikTokAttribution(this.prisma);

    await this.prisma.tikTokAdsSyncState.update({
      where: { id: "default" },
      data: {
        advertiserId,
        accountName,
        currency,
        timezoneName: timezone,
        lastRunAt: startedAt,
        lastSuccessAt: this.now(),
        lastTrigger: trigger,
        lastStatus: "SUCCESS",
        lastError: null,
        backfilledAdvertiserId: advertiserId,
        rateLimitStrikes: 0,
        rateLimitedUntil: null,
        lastRangeFrom: dateOnly(range.since),
        lastRangeTo: dateOnly(range.until),
      },
    });
    return {
      status: "SUCCESS",
      advertiserId,
      range,
      firstRun,
      insightRows: list.length,
      campaigns: campaignInfo.size,
      created,
      attributedClicks: attributed.clicks,
      attributedLeads: attributed.leads,
    };
  }

  /** Keeps linked campaigns' TikTok fields fresh and auto-creates the missing ones (Meta-style rules). */
  private async syncCrmCampaigns(
    campaignInfo: Map<string, CampaignInfo>,
    rows: Map<string, { tiktokCampaignId: string; amount: number }>,
  ): Promise<number> {
    const existing = await this.prisma.campaign.findMany({
      select: { id: true, code: true, name: true, platform: true, metaCampaignId: true, tiktokCampaignId: true, tiktokCampaignName: true, tiktokStatus: true, tiktokObjective: true },
    });
    const linked = new Map(existing.filter((c) => c.tiktokCampaignId).map((c) => [c.tiktokCampaignId as string, c]));
    const taken = new Set(existing.map((c) => c.code.toLowerCase()));

    // renamed / status changes: update the stored TikTok fields, keep the code
    for (const [id, info] of campaignInfo) {
      const c = linked.get(id);
      if (!c) continue;
      const status = info.operationStatus ?? c.tiktokStatus;
      const objective = info.objective ?? c.tiktokObjective;
      if (c.tiktokCampaignName !== info.name || c.tiktokStatus !== status || c.tiktokObjective !== objective) {
        await this.prisma.campaign.update({
          where: { id: c.id },
          data: { tiktokCampaignName: info.name, tiktokStatus: status, tiktokObjective: objective },
        });
      }
    }

    const spent = new Set<string>();
    for (const r of rows.values()) if (r.amount > 0) spent.add(r.tiktokCampaignId);
    const optedOut = new Set(
      (await this.prisma.tikTokAdsCampaign.findMany({ where: { autoLinkDisabled: true }, select: { tiktokCampaignId: true } })).map(
        (m) => m.tiktokCampaignId,
      ),
    );

    let created = 0;
    const claimed = new Set<string>();
    for (const [id, info] of campaignInfo) {
      if (linked.has(id) || optedOut.has(id)) continue;
      const active = (info.operationStatus ?? "").toUpperCase() === "ENABLE";
      if (!active && !spent.has(id)) continue;

      // An existing, still unlinked CRM campaign with the same (sanitised) code or name IS this
      // campaign: link it instead of creating a duplicate "-2". A campaign already linked to Meta
      // is a Meta campaign, never taken over; nor is one whose platform is something else (only unset or TIKTOK).
      const base = sanitizeCampaignCode(info.name, id, "TT").toLowerCase();
      const wanted = info.name.trim().toLowerCase();
      const match = existing.find(
        (c: any) =>
          !c.tiktokCampaignId &&
          !c.metaCampaignId &&
          (!c.platform || c.platform === "TIKTOK") &&
          !claimed.has(c.id) &&
          (c.code.toLowerCase() === base || c.code.toLowerCase() === wanted || c.name.trim().toLowerCase() === wanted),
      );
      if (match) {
        try {
          await this.prisma.campaign.update({
            where: { id: match.id },
            data: {
              tiktokCampaignId: id,
              tiktokCampaignName: info.name,
              tiktokStatus: info.operationStatus,
              tiktokObjective: info.objective,
              platform: "TIKTOK",
            },
          });
          claimed.add(match.id);
          linked.set(id, match as any);
          continue;
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
          continue; // linked concurrently
        }
      }

      for (let attempt = 0; attempt < 3; attempt++) {
        const code = uniqueCampaignCode(sanitizeCampaignCode(info.name, id, "TT"), taken);
        try {
          await this.prisma.campaign.create({
            data: {
              name: info.name.slice(0, 120),
              code,
              codeAuto: true,
              platform: "TIKTOK",
              status: mapTikTokStatus(info.operationStatus),
              metaAdIds: [],
              tiktokCampaignId: id,
              tiktokCampaignName: info.name,
              tiktokStatus: info.operationStatus,
              tiktokObjective: info.objective,
            },
          });
          taken.add(code.toLowerCase());
          created++;
          break;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = JSON.stringify(error.meta?.target ?? "");
            if (target.includes("tiktokCampaignId")) break; // linked concurrently
            taken.add(code.toLowerCase());
            continue;
          }
          throw error;
        }
      }
    }
    return created;
  }
}
