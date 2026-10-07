import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { backfillMetaAttribution, releaseMetaAttribution } from "./meta-ads.attribution";
import { MetaAdsState, resolveMetaAdsConfig } from "./meta-ads.config";
import { MetaAdsSyncService, SyncResult } from "./meta-ads-sync.service";

export interface MetaAdsStatus {
  state: MetaAdsState;
  /** Why the sync is not READY (admin-only; may name env vars, never values). */
  problems: string[];
  /** INCOMPLETE: why the ad account could not be chosen. */
  message: string | null;
  account: { id: string; name: string | null; currency: string | null; timezone: string | null } | null;
  accountConfigured: boolean;
  backfillDays: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: string | null;
  lastTrigger: string | null;
  lastError: string | null;
  rateLimitedUntil: string | null;
  running: boolean;
  range: { from: string; to: string } | null;
  metaCampaigns: number;
  linkedCampaigns: number;
  /** Env var names for the admin-only technical details. */
  env: string[];
}

const ENV_NAMES = [
  "META_SYSTEM_USER_TOKEN",
  "META_SYSTEM_APP_SECRET",
  "META_AD_ACCOUNT_ID",
  "META_ADS_SYNC_ENABLED",
  "META_ADS_SYNC_BACKFILL_DAYS",
  "META_GRAPH_VERSION",
];

@Injectable()
export class MetaAdsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: MetaAdsSyncService,
  ) {}

  async status(): Promise<MetaAdsStatus> {
    const cfg = resolveMetaAdsConfig(this.sync.env());
    const [s, metaCampaigns, linkedCampaigns] = await Promise.all([
      this.prisma.metaAdsSyncState.findUnique({ where: { id: "default" } }),
      this.prisma.metaAdsCampaign.count(),
      this.prisma.campaign.count({ where: { metaCampaignId: { not: null } } }),
    ]);
    const incomplete = cfg.state === "READY" && !cfg.adAccountId && s?.lastStatus === "INCOMPLETE";
    const state: MetaAdsState = incomplete ? "INCOMPLETE" : cfg.state;
    const accountId = cfg.adAccountId ?? s?.adAccountId ?? null;
    return {
      state,
      problems: cfg.problems,
      message: incomplete ? (s?.lastError ?? null) : null,
      account: accountId
        ? {
            id: accountId,
            name: s?.adAccountId === accountId ? s.accountName : null,
            currency: s?.adAccountId === accountId ? s.currency : null,
            timezone: s?.adAccountId === accountId ? s.timezoneName : null,
          }
        : null,
      accountConfigured: !!cfg.adAccountId,
      backfillDays: cfg.backfillDays,
      lastRunAt: s?.lastRunAt?.toISOString() ?? null,
      lastSuccessAt: s?.lastSuccessAt?.toISOString() ?? null,
      lastStatus: s?.lastStatus ?? null,
      lastTrigger: s?.lastTrigger ?? null,
      lastError: s?.lastStatus === "SUCCESS" ? null : (s?.lastError ?? null),
      rateLimitedUntil:
        s?.rateLimitedUntil && s.rateLimitedUntil > new Date() ? s.rateLimitedUntil.toISOString() : null,
      running: !!s?.leaseUntil && s.leaseUntil > new Date(),
      range:
        s?.lastRangeFrom && s?.lastRangeTo
          ? { from: s.lastRangeFrom.toISOString().slice(0, 10), to: s.lastRangeTo.toISOString().slice(0, 10) }
          : null,
      metaCampaigns,
      linkedCampaigns,
      env: ENV_NAMES,
    };
  }

  syncNow(): Promise<SyncResult> {
    return this.sync.run("MANUAL");
  }

  /** Meta campaigns for the "link to Meta campaign" dropdown. */
  async listMetaCampaigns() {
    const [metas, linked] = await Promise.all([
      this.prisma.metaAdsCampaign.findMany({ orderBy: { name: "asc" } }),
      this.prisma.campaign.findMany({
        where: { metaCampaignId: { not: null } },
        select: { id: true, code: true, metaCampaignId: true },
      }),
    ]);
    const by = new Map(linked.map((c) => [c.metaCampaignId as string, c]));
    return metas.map((m) => ({
      metaCampaignId: m.metaCampaignId,
      name: m.name,
      effectiveStatus: m.effectiveStatus,
      objective: m.objective,
      linkedCampaignId: by.get(m.metaCampaignId)?.id ?? null,
      linkedCampaignCode: by.get(m.metaCampaignId)?.code ?? null,
    }));
  }

  /** Link a CRM campaign to a Meta campaign, or unlink (null). Attribution follows (AUTO only, MANUAL is never touched). */
  async setLink(campaignId: string, metaCampaignId: string | null) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Kampanye tidak ditemukan");
    const previous = campaign.metaCampaignId;
    if (previous === metaCampaignId) return campaign;

    let meta: { name: string; effectiveStatus: string | null; objective: string | null } | null = null;
    if (metaCampaignId !== null) {
      meta = await this.prisma.metaAdsCampaign.findUnique({ where: { metaCampaignId } });
      if (!meta) throw new NotFoundException("Kampanye Meta tidak ditemukan. Jalankan sinkronisasi dulu.");
      const other = await this.prisma.campaign.findFirst({ where: { metaCampaignId, NOT: { id: campaignId } } });
      if (other) throw new ConflictException(`Kampanye Meta ini sudah terhubung ke ${other.code}.`);
    }

    // The previously linked Meta campaign (unlink OR switch) must not be re-created by the next sync.
    if (previous) {
      await this.prisma.metaAdsCampaign.updateMany({
        where: { metaCampaignId: previous },
        data: { autoLinkDisabled: true },
      });
      await releaseMetaAttribution(this.prisma, previous, { id: campaign.id, code: campaign.code });
    }
    if (metaCampaignId === null) {
      return this.prisma.campaign.update({
        where: { id: campaignId },
        data: { metaCampaignId: null, metaCampaignName: null, metaStatus: null, metaObjective: null },
      });
    }
    let updated;
    try {
      updated = await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          metaCampaignId,
          metaCampaignName: meta!.name,
          metaStatus: meta!.effectiveStatus,
          metaObjective: meta!.objective,
        },
      });
    } catch (error) {
      // two admins linked the same Meta campaign at the same time
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Kampanye Meta ini sudah terhubung ke kampanye lain.");
      }
      throw error;
    }
    await this.prisma.metaAdsCampaign.update({ where: { metaCampaignId }, data: { autoLinkDisabled: false } });
    await backfillMetaAttribution(this.prisma, [metaCampaignId]);
    return updated;
  }
}
