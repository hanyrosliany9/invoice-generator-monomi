import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { GraphApiError, scrubSecrets } from "../../instagram/instagram-graph.client";
import { MetaGraphClient } from "../../social-publishing/meta-graph.client";
import { PrismaService } from "../../prisma/prisma.service";
import { backfillMetaAttribution } from "./meta-ads.attribution";
import { MetaAdsConfig, resolveMetaAdsConfig } from "./meta-ads.config";
import {
  AdAccountInfo,
  computeSyncRange,
  dateOnly,
  discoverAdAccount,
  mapMetaStatus,
  parseCount,
  parseSpend,
  rateLimitBackoffMs,
  sanitizeCampaignCode,
  uniqueCampaignCode,
} from "./meta-ads.utils";

export const LEASE_MS = 20 * 60_000;
const PAGE_LIMIT = 500;
const MAX_PAGES = 200;
const CHUNK = 200;

export type SyncStatus = "SUCCESS" | "FAILED" | "RATE_LIMITED" | "INCOMPLETE" | "SKIPPED" | "BUSY";

export interface SyncResult {
  status: SyncStatus;
  message?: string;
  accountId?: string;
  range?: { since: string; until: string };
  firstRun?: boolean;
  insightRows?: number;
  campaigns?: number;
  ads?: number;
  created?: number;
  attributedClicks?: number;
  attributedLeads?: number;
}

interface GraphPage<T> {
  data?: T[];
  paging?: { cursors?: { after?: string }; next?: string };
}

@Injectable()
export class MetaAdsSyncService {
  private readonly logger = new Logger(MetaAdsSyncService.name);
  /** Overridable in tests. */
  env: () => NodeJS.ProcessEnv = () => process.env;
  now: () => Date = () => new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphClient,
  ) {}

  /** Every 3 hours (Asia/Jakarta). Never throws. */
  @Cron("0 */3 * * *", { name: "meta-ads-sync", timeZone: "Asia/Jakarta" })
  async cron(): Promise<void> {
    try {
      const r = await this.run("CRON");
      if (r.status !== "SKIPPED" && r.status !== "BUSY") {
        this.logger.log(`Meta Ads sync ${r.status}${r.message ? `: ${r.message}` : ""}`);
      }
    } catch (error) {
      this.logger.warn(`Meta Ads sync crashed: ${scrubSecrets((error as Error).message)}`);
    }
  }

  // ---- lease --------------------------------------------------------------

  private async acquire(owner: string): Promise<boolean> {
    await this.prisma.metaAdsSyncState.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
    const now = this.now();
    const r = await this.prisma.metaAdsSyncState.updateMany({
      where: { id: "default", OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      data: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + LEASE_MS) },
    });
    return r.count === 1;
  }

  private async release(owner: string): Promise<void> {
    await this.prisma.metaAdsSyncState.updateMany({
      where: { id: "default", leaseOwner: owner },
      data: { leaseOwner: null, leaseUntil: null },
    });
  }

  // ---- graph ----------------------------------------------------------------

  private async get<T>(cfg: MetaAdsConfig, path: string, query: Record<string, string | number>): Promise<T> {
    const url = `${cfg.graphBaseUrl}/${cfg.graphVersion}/${path}`;
    return this.graph.call<T>(url, cfg.token as string, { query }, cfg.appSecret);
  }

  /** Follows paging cursors ("after"); never a URL taken from a response. */
  private async pageAll<T>(
    cfg: MetaAdsConfig,
    path: string,
    query: Record<string, string | number>,
  ): Promise<T[]> {
    const out: T[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await this.get<GraphPage<T>>(cfg, path, {
        ...query,
        limit: PAGE_LIMIT,
        ...(after ? { after } : {}),
      });
      out.push(...(res.data ?? []));
      const next = res.paging?.next ? res.paging.cursors?.after : undefined;
      if (!next || next === after) return out;
      after = next;
    }
    throw new Error(`Meta paging did not end for ${path}`);
  }

  private async resolveAccount(
    cfg: MetaAdsConfig,
  ): Promise<{ ok: true; account: AdAccountInfo } | { ok: false; message: string }> {
    if (cfg.adAccountId) {
      const a = await this.get<any>(cfg, `act_${cfg.adAccountId}`, { fields: "account_id,name,currency,account_status" });
      return {
        ok: true,
        account: {
          id: cfg.adAccountId,
          name: String(a?.name ?? `act_${cfg.adAccountId}`),
          currency: String(a?.currency ?? "IDR").toUpperCase(),
          status: Number(a?.account_status ?? 1),
        },
      };
    }
    const list = await this.pageAll<any>(cfg, "me/adaccounts", { fields: "account_id,name,account_status,currency" });
    return discoverAdAccount(
      list.map((a) => ({
        id: String(a.account_id ?? "").replace(/^act_/, ""),
        name: String(a.name ?? ""),
        currency: String(a.currency ?? "IDR").toUpperCase(),
        status: Number(a.account_status ?? 0),
      })),
    );
  }

  // ---- run ------------------------------------------------------------------

  async run(trigger: "CRON" | "MANUAL"): Promise<SyncResult> {
    const cfg = resolveMetaAdsConfig(this.env());
    if (cfg.state !== "READY") {
      return { status: "SKIPPED", message: cfg.problems[0] ?? `Meta Ads sync is ${cfg.state}` };
    }
    const owner = `${process.pid}:${randomBytes(4).toString("hex")}`;
    if (!(await this.acquire(owner))) {
      return { status: "BUSY", message: "A sync is already running" };
    }
    const startedAt = this.now();
    try {
      const state = await this.prisma.metaAdsSyncState.findUnique({ where: { id: "default" } });
      if (state?.rateLimitedUntil && state.rateLimitedUntil > startedAt) {
        return {
          status: "RATE_LIMITED",
          message: `Meta asked us to slow down; next attempt after ${state.rateLimitedUntil.toISOString()}`,
        };
      }
      const result = await this.sync(cfg, trigger, startedAt, state?.backfilledAccountId ?? null);
      return result;
    } catch (error) {
      return await this.recordFailure(error, trigger, startedAt);
    } finally {
      await this.release(owner).catch(() => undefined);
    }
  }

  private async recordFailure(error: unknown, trigger: string, at: Date): Promise<SyncResult> {
    const message = scrubSecrets((error as Error)?.message ?? "Sync failed");
    const limited = error instanceof GraphApiError && error.kind === "rate_limit";
    if (limited) {
      const cur = await this.prisma.metaAdsSyncState.findUnique({ where: { id: "default" } });
      const strikes = (cur?.rateLimitStrikes ?? 0) + 1;
      await this.prisma.metaAdsSyncState.update({
        where: { id: "default" },
        data: {
          lastRunAt: at,
          lastTrigger: trigger,
          lastStatus: "RATE_LIMITED",
          lastError: message,
          rateLimitStrikes: strikes,
          rateLimitedUntil: new Date(at.getTime() + rateLimitBackoffMs(strikes)),
        },
      });
      return { status: "RATE_LIMITED", message };
    }
    await this.prisma.metaAdsSyncState
      .update({
        where: { id: "default" },
        data: { lastRunAt: at, lastTrigger: trigger, lastStatus: "FAILED", lastError: message },
      })
      .catch(() => undefined);
    return { status: "FAILED", message };
  }

  private async sync(
    cfg: MetaAdsConfig,
    trigger: string,
    startedAt: Date,
    backfilledAccountId: string | null,
  ): Promise<SyncResult> {
    const choice = await this.resolveAccount(cfg);
    if (!choice.ok) {
      await this.prisma.metaAdsSyncState.update({
        where: { id: "default" },
        data: { lastRunAt: startedAt, lastTrigger: trigger, lastStatus: "INCOMPLETE", lastError: choice.message },
      });
      return { status: "INCOMPLETE", message: choice.message };
    }
    const account = choice.account;
    const act = `act_${account.id}`;
    const firstRun = backfilledAccountId !== account.id;
    const range = computeSyncRange(startedAt, cfg.backfillDays, firstRun);

    const [metaCampaigns, metaAds, insights] = await Promise.all([
      this.pageAll<any>(cfg, `${act}/campaigns`, { fields: "id,name,status,effective_status,objective" }),
      this.pageAll<any>(cfg, `${act}/ads`, { fields: "id,campaign_id" }),
      this.pageAll<any>(cfg, `${act}/insights`, {
        level: "campaign",
        fields: "campaign_id,campaign_name,spend,impressions,clicks,objective",
        time_increment: 1,
        time_range: JSON.stringify(range),
      }),
    ]);

    // ---- insights -> daily rows (idempotent upsert on campaign + date)
    const currency = account.currency || "IDR";
    const rows = new Map<string, { metaCampaignId: string; date: string; amount: number; impressions: number; clicks: number }>();
    for (const i of insights) {
      const metaCampaignId = String(i.campaign_id ?? "");
      const date = String(i.date_start ?? "").slice(0, 10);
      if (!/^\d+$/.test(metaCampaignId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      rows.set(`${metaCampaignId}|${date}`, {
        metaCampaignId,
        date,
        amount: parseSpend(i.spend, currency),
        impressions: parseCount(i.impressions),
        clicks: parseCount(i.clicks),
      });
    }

    // ---- Meta campaign cache (insights names fill in archived/deleted ones)
    const campaignInfo = new Map<string, { name: string; status: string | null; effectiveStatus: string | null; objective: string | null }>();
    for (const c of metaCampaigns) {
      if (!c?.id) continue;
      campaignInfo.set(String(c.id), {
        name: String(c.name ?? c.id),
        status: c.status ?? null,
        effectiveStatus: c.effective_status ?? null,
        objective: c.objective ?? null,
      });
    }
    for (const i of insights) {
      const id = String(i.campaign_id ?? "");
      if (id && !campaignInfo.has(id)) {
        campaignInfo.set(id, {
          name: String(i.campaign_name ?? id),
          status: null,
          effectiveStatus: null,
          objective: i.objective ?? null,
        });
      }
    }

    for (const [metaCampaignId, c] of campaignInfo) {
      await this.prisma.metaAdsCampaign.upsert({
        where: { metaCampaignId },
        create: { adAccountId: account.id, metaCampaignId, ...c },
        update: { adAccountId: account.id, ...c },
      });
    }

    const adRows = metaAds
      .filter((a) => a?.id && a?.campaign_id)
      .map((a) => ({ adId: String(a.id), metaCampaignId: String(a.campaign_id) }));
    for (let i = 0; i < adRows.length; i += CHUNK) {
      await this.prisma.$transaction(
        adRows.slice(i, i + CHUNK).map((a) =>
          this.prisma.metaAdsAd.upsert({
            where: { adId: a.adId },
            create: { ...a, adAccountId: account.id },
            update: { metaCampaignId: a.metaCampaignId, adAccountId: account.id },
          }),
        ),
      );
    }

    const list = [...rows.values()];
    for (let i = 0; i < list.length; i += CHUNK) {
      await this.prisma.$transaction(
        list.slice(i, i + CHUNK).map((r) => {
          const date = dateOnly(r.date);
          const data = {
            adAccountId: account.id,
            amount: new Prisma.Decimal(r.amount),
            currency,
            impressions: r.impressions,
            clicks: r.clicks,
          };
          return this.prisma.metaAdsInsightDaily.upsert({
            where: { metaCampaignId_date: { metaCampaignId: r.metaCampaignId, date } },
            create: { metaCampaignId: r.metaCampaignId, date, ...data },
            update: data,
          });
        }),
      );
    }
    // Days Meta restated to "no delivery" inside the window are gone upstream: drop them here too.
    const inWindow = await this.prisma.metaAdsInsightDaily.findMany({
      where: { adAccountId: account.id, date: { gte: dateOnly(range.since), lte: dateOnly(range.until) } },
      select: { id: true, metaCampaignId: true, date: true },
    });
    const stale = inWindow
      .filter((r) => !rows.has(`${r.metaCampaignId}|${r.date.toISOString().slice(0, 10)}`))
      .map((r) => r.id);
    if (stale.length) await this.prisma.metaAdsInsightDaily.deleteMany({ where: { id: { in: stale } } });

    // ---- link / create CRM campaigns
    const created = await this.syncCrmCampaigns(campaignInfo, rows);
    const attributed = await backfillMetaAttribution(this.prisma);

    await this.prisma.metaAdsSyncState.update({
      where: { id: "default" },
      data: {
        adAccountId: account.id,
        accountName: account.name,
        currency,
        lastRunAt: startedAt,
        lastSuccessAt: this.now(),
        lastTrigger: trigger,
        lastStatus: "SUCCESS",
        lastError: null,
        backfilledAccountId: account.id,
        rateLimitStrikes: 0,
        rateLimitedUntil: null,
        lastRangeFrom: dateOnly(range.since),
        lastRangeTo: dateOnly(range.until),
      },
    });
    return {
      status: "SUCCESS",
      accountId: account.id,
      range,
      firstRun,
      insightRows: list.length,
      campaigns: campaignInfo.size,
      ads: adRows.length,
      created,
      attributedClicks: attributed.clicks,
      attributedLeads: attributed.leads,
    };
  }

  /** Keeps linked campaigns' Meta fields fresh and auto-creates the missing ones. */
  private async syncCrmCampaigns(
    campaignInfo: Map<string, { name: string; status: string | null; effectiveStatus: string | null; objective: string | null }>,
    rows: Map<string, { metaCampaignId: string; amount: number }>,
  ): Promise<number> {
    const existing = await this.prisma.campaign.findMany({
      select: { id: true, code: true, metaCampaignId: true, metaCampaignName: true, metaStatus: true, metaObjective: true },
    });
    const linked = new Map(existing.filter((c) => c.metaCampaignId).map((c) => [c.metaCampaignId as string, c]));
    const taken = new Set(existing.map((c) => c.code.toLowerCase()));

    // renamed / status changes: update the stored Meta fields, keep the code
    for (const [metaId, info] of campaignInfo) {
      const c = linked.get(metaId);
      if (!c) continue;
      const status = info.effectiveStatus ?? c.metaStatus;
      const objective = info.objective ?? c.metaObjective;
      if (c.metaCampaignName !== info.name || c.metaStatus !== status || c.metaObjective !== objective) {
        await this.prisma.campaign.update({
          where: { id: c.id },
          data: { metaCampaignName: info.name, metaStatus: status, metaObjective: objective },
        });
      }
    }

    const spent = new Set<string>();
    for (const r of rows.values()) if (r.amount > 0) spent.add(r.metaCampaignId);
    const optedOut = new Set(
      (
        await this.prisma.metaAdsCampaign.findMany({
          where: { autoLinkDisabled: true },
          select: { metaCampaignId: true },
        })
      ).map((m) => m.metaCampaignId),
    );

    let created = 0;
    for (const [metaId, info] of campaignInfo) {
      if (linked.has(metaId) || optedOut.has(metaId)) continue;
      const active = (info.effectiveStatus ?? "").toUpperCase() === "ACTIVE";
      if (!active && !spent.has(metaId)) continue;
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = uniqueCampaignCode(sanitizeCampaignCode(info.name, metaId), taken);
        try {
          await this.prisma.campaign.create({
            data: {
              name: info.name.slice(0, 120),
              code,
              platform: "FACEBOOK",
              status: mapMetaStatus(info.effectiveStatus),
              metaAdIds: [],
              metaCampaignId: metaId,
              metaCampaignName: info.name,
              metaStatus: info.effectiveStatus,
              metaObjective: info.objective,
            },
          });
          taken.add(code.toLowerCase());
          created++;
          break;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = JSON.stringify(error.meta?.target ?? "");
            if (target.includes("metaCampaignId")) break; // linked concurrently
            taken.add(code.toLowerCase()); // code taken meanwhile: next suffix
            continue;
          }
          throw error;
        }
      }
    }
    return created;
  }
}
