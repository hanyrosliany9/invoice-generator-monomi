import { PrismaService } from "../../prisma/prisma.service";

type Db = Pick<PrismaService, "campaign" | "adClick" | "lead">;

/**
 * Attribution by TikTok campaign id: a landing-page visit whose utm_campaign is
 * the numeric TikTok campaign id (__CAMPAIGN_ID__ in the ad URL) follows the CRM
 * campaign linked to that TikTok campaign (same rules as the Meta link).
 *
 * Lead.campaignSource records how the campaign was set:
 *  - AUTO   utm campaign id / code match: re-attributed on link, re-link and unlink;
 *  - MANUAL staff choice: never touched.
 * A lead without any campaign (and no typed code) is filled and marked AUTO.
 * Click codes are always derived from the utm, so they simply follow the link.
 * Idempotent.
 */
async function leadIdsOf(db: Db, tiktokCampaignId: string): Promise<string[]> {
  const clicks = await db.adClick.findMany({
    where: { utmCampaign: tiktokCampaignId, leadId: { not: null } },
    select: { leadId: true },
  });
  return [...new Set(clicks.map((c) => c.leadId).filter((x): x is string => !!x))];
}

/** Points clicks and AUTO / empty leads of every linked TikTok campaign (or only `onlyIds`) at their CRM campaign. */
export async function backfillTikTokAttribution(
  db: Db,
  onlyIds?: string[],
): Promise<{ clicks: number; leads: number }> {
  const campaigns = await db.campaign.findMany({
    where: { tiktokCampaignId: onlyIds ? { in: onlyIds } : { not: null } },
    select: { id: true, code: true, tiktokCampaignId: true },
  });
  let clicks = 0;
  let leads = 0;
  for (const c of campaigns) {
    if (!c.tiktokCampaignId) continue;
    clicks += (
      await db.adClick.updateMany({
        where: { utmCampaign: c.tiktokCampaignId, OR: [{ campaignCode: null }, { NOT: { campaignCode: c.code } }] },
        data: { campaignCode: c.code },
      })
    ).count;
    const ids = await leadIdsOf(db, c.tiktokCampaignId);
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

/** A CRM campaign stops following a TikTok campaign: its AUTO attribution is withdrawn, MANUAL stays. */
export async function releaseTikTokAttribution(
  db: Db,
  tiktokCampaignId: string,
  campaign: { id: string; code: string },
): Promise<{ clicks: number; leads: number }> {
  const clicks = (
    await db.adClick.updateMany({
      where: { utmCampaign: tiktokCampaignId, campaignCode: campaign.code },
      data: { campaignCode: null },
    })
  ).count;
  const ids = await leadIdsOf(db, tiktokCampaignId);
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
