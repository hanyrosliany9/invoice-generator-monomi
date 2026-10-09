import { PrismaService } from "../../prisma/prisma.service";
import { dateStringInTz } from "../meta-ads/meta-ads.utils";
import type { MetaSpendAgg } from "../meta-ads/meta-ads-spend";

/**
 * Synced TikTok spend per CRM campaign (through Campaign.tiktokCampaignId), for an
 * optional window of instants: its days are the calendar days in the advertiser's
 * time zone (the zone TikTok reports its days in). The currency is the advertiser's
 * (IDR for Monomi).
 */
export async function loadTikTokSpend(
  prisma: Pick<PrismaService, "campaign" | "tikTokAdsInsightDaily" | "tikTokAdsSyncState">,
  opts: { range?: { from: Date; to: Date }; campaignId?: string } = {},
): Promise<{ byCampaign: Map<string, MetaSpendAgg>; currency: string; lastSyncAt: Date | null }> {
  const state = await prisma.tikTokAdsSyncState.findUnique({ where: { id: "default" } });
  const tz = state?.timezoneName ?? null;
  const from = opts.range ? dateStringInTz(opts.range.from, tz) : undefined;
  const to = opts.range ? dateStringInTz(opts.range.to, tz) : undefined;
  const currency = state?.currency ?? "IDR";
  const byCampaign = new Map<string, MetaSpendAgg>();
  const campaigns = await prisma.campaign.findMany({
    where: { tiktokCampaignId: { not: null }, ...(opts.campaignId ? { id: opts.campaignId } : {}) },
    select: { id: true, tiktokCampaignId: true },
  });
  const linked = campaigns.filter((c) => c.tiktokCampaignId);
  if (!linked.length) return { byCampaign, currency, lastSyncAt: state?.lastSuccessAt ?? null };
  const idToCampaign = new Map(linked.map((c) => [c.tiktokCampaignId as string, c.id]));
  const rows = await prisma.tikTokAdsInsightDaily.findMany({
    where: {
      tiktokCampaignId: { in: [...idToCampaign.keys()] },
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
              ...(to ? { lte: new Date(to + "T00:00:00.000Z") } : {}),
            },
          }
        : {}),
    },
    select: { tiktokCampaignId: true, amount: true, impressions: true, clicks: true },
  });
  for (const r of rows) {
    const cid = idToCampaign.get(r.tiktokCampaignId);
    if (!cid) continue;
    const a = byCampaign.get(cid) ?? { amount: 0, impressions: 0, clicks: 0 };
    a.amount += Number(r.amount);
    a.impressions += r.impressions;
    a.clicks += r.clicks;
    byCampaign.set(cid, a);
  }
  return { byCampaign, currency, lastSyncAt: state?.lastSuccessAt ?? null };
}

/**
 * The totals ("spend", cost per ...) are in ONE currency: the Meta account's (rupiah when it has
 * none). TikTok spend is only added when its account is in that same currency; otherwise it is
 * kept apart and shown in its own currency, never summed across currencies.
 */
export const tiktokSpendSeparate = (totalsCurrency: string, tiktokCurrency: string): boolean => tiktokCurrency !== totalsCurrency;
