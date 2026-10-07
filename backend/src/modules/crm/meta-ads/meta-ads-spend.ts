import { PrismaService } from "../../prisma/prisma.service";

export interface MetaSpendAgg {
  amount: number;
  impressions: number;
  clicks: number;
}

/**
 * Synced Meta spend per CRM campaign (through Campaign.metaCampaignId), for an
 * optional inclusive WIB date window ("YYYY-MM-DD"). The currency is the ad
 * account's (IDR for Monomi); manual entries are assumed to be in the same.
 */
export async function loadMetaSpend(
  prisma: Pick<PrismaService, "campaign" | "metaAdsInsightDaily" | "metaAdsSyncState">,
  opts: { from?: string; to?: string; campaignId?: string } = {},
): Promise<{ byCampaign: Map<string, MetaSpendAgg>; currency: string; lastSyncAt: Date | null }> {
  const state = await prisma.metaAdsSyncState.findUnique({ where: { id: "default" } });
  const currency = state?.currency ?? "IDR";
  const byCampaign = new Map<string, MetaSpendAgg>();
  const campaigns = await prisma.campaign.findMany({
    where: { metaCampaignId: { not: null }, ...(opts.campaignId ? { id: opts.campaignId } : {}) },
    select: { id: true, metaCampaignId: true },
  });
  const linked = campaigns.filter((c) => c.metaCampaignId);
  if (!linked.length) return { byCampaign, currency, lastSyncAt: state?.lastSuccessAt ?? null };
  const idToCampaign = new Map(linked.map((c) => [c.metaCampaignId as string, c.id]));
  const rows = await prisma.metaAdsInsightDaily.findMany({
    where: {
      metaCampaignId: { in: [...idToCampaign.keys()] },
      ...(opts.from || opts.to
        ? {
            date: {
              ...(opts.from ? { gte: new Date(opts.from + "T00:00:00.000Z") } : {}),
              ...(opts.to ? { lte: new Date(opts.to + "T00:00:00.000Z") } : {}),
            },
          }
        : {}),
    },
    select: { metaCampaignId: true, amount: true, impressions: true, clicks: true },
  });
  for (const r of rows) {
    const cid = idToCampaign.get(r.metaCampaignId);
    if (!cid) continue;
    const a = byCampaign.get(cid) ?? { amount: 0, impressions: 0, clicks: 0 };
    a.amount += Number(r.amount);
    a.impressions += r.impressions;
    a.clicks += r.clicks;
    byCampaign.set(cid, a);
  }
  return { byCampaign, currency, lastSyncAt: state?.lastSuccessAt ?? null };
}
