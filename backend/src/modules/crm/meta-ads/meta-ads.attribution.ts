import { PrismaService } from "../../prisma/prisma.service";

type Db = Pick<PrismaService, "campaign" | "adClick" | "lead" | "metaAdsAd">;

/**
 * Attribution by Meta campaign id: a landing-page visit whose utm_campaign is
 * the numeric Meta campaign id ({{campaign.id}} in the ad URL), or a lead whose
 * ad id (CTWA referral.source_id) belongs to the Meta campaign, follows the CRM
 * campaign linked to that Meta campaign.
 *
 * Lead.campaignSource records how the campaign was set:
 *  - AUTO   utm campaign id / ad id / code match: re-attributed on link,
 *           re-link and unlink;
 *  - MANUAL staff choice: never touched.
 * A lead without any campaign (and no typed code) is filled and marked AUTO.
 * Click codes are always derived from the utm, so they simply follow the link.
 * Idempotent.
 */
async function leadIdsOf(db: Db, metaCampaignId: string): Promise<string[]> {
  const clicks = await db.adClick.findMany({
    where: { utmCampaign: metaCampaignId, leadId: { not: null } },
    select: { leadId: true },
  });
  const ads = await db.metaAdsAd.findMany({ where: { metaCampaignId }, select: { adId: true } });
  const ids = new Set(clicks.map((c) => c.leadId).filter((x): x is string => !!x));
  if (ads.length) {
    const byAd = await db.lead.findMany({
      where: { adId: { in: ads.map((a) => a.adId) } },
      select: { id: true },
    });
    for (const l of byAd) ids.add(l.id);
  }
  return [...ids];
}

/** Points clicks and AUTO / empty leads of every linked Meta campaign (or only `onlyMetaCampaignIds`) at their CRM campaign. */
export async function backfillMetaAttribution(
  db: Db,
  onlyMetaCampaignIds?: string[],
): Promise<{ clicks: number; leads: number }> {
  const campaigns = await db.campaign.findMany({
    where: { metaCampaignId: onlyMetaCampaignIds ? { in: onlyMetaCampaignIds } : { not: null } },
    select: { id: true, code: true, metaCampaignId: true },
  });
  let clicks = 0;
  let leads = 0;
  for (const c of campaigns) {
    if (!c.metaCampaignId) continue;
    clicks += (
      await db.adClick.updateMany({
        where: { utmCampaign: c.metaCampaignId, OR: [{ campaignCode: null }, { NOT: { campaignCode: c.code } }] },
        data: { campaignCode: c.code },
      })
    ).count;
    const ids = await leadIdsOf(db, c.metaCampaignId);
    if (!ids.length) continue;
    const data = { campaignId: c.id, campaignCode: c.code, campaignSource: "AUTO" };
    leads += (
      await db.lead.updateMany({ where: { id: { in: ids }, campaignId: null, campaignCode: null }, data })
    ).count;
    leads += (
      await db.lead.updateMany({
        where: { id: { in: ids }, campaignSource: "AUTO", NOT: { campaignId: c.id } },
        data,
      })
    ).count;
  }
  return { clicks, leads };
}

/** A CRM campaign stops following a Meta campaign: its AUTO attribution is withdrawn, MANUAL stays. */
export async function releaseMetaAttribution(
  db: Db,
  metaCampaignId: string,
  campaign: { id: string; code: string },
): Promise<{ clicks: number; leads: number }> {
  const clicks = (
    await db.adClick.updateMany({
      where: { utmCampaign: metaCampaignId, campaignCode: campaign.code },
      data: { campaignCode: null },
    })
  ).count;
  const ids = await leadIdsOf(db, metaCampaignId);
  const leads = ids.length
    ? (
        await db.lead.updateMany({
          where: { id: { in: ids }, campaignId: campaign.id, campaignSource: "AUTO" },
          data: { campaignId: null, campaignCode: null, campaignSource: null },
        })
      ).count
    : 0;
  return { clicks, leads };
}
