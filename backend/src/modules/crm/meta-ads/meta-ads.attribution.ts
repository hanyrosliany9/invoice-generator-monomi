import { PrismaService } from "../../prisma/prisma.service";

/**
 * Attribution by Meta campaign id: a landing-page visit whose utm_campaign is
 * the numeric Meta campaign id ({{campaign.id}} in the ad URL) belongs to the
 * CRM campaign linked to that Meta campaign.
 *
 * New clicks are resolved on arrival (AdClickService.resolveCampaignCode).
 * This catches up what arrived BEFORE the campaign was linked: clicks without
 * a campaign get its code, and leads of those clicks get the campaign. A
 * lead that already has a campaign (staff choice, code match) is never
 * changed. Idempotent.
 */
export async function backfillMetaAttribution(
  prisma: Pick<PrismaService, "campaign" | "adClick" | "lead">,
  onlyMetaCampaignIds?: string[],
): Promise<{ clicks: number; leads: number }> {
  const campaigns = await prisma.campaign.findMany({
    where: { metaCampaignId: onlyMetaCampaignIds ? { in: onlyMetaCampaignIds } : { not: null } },
    select: { id: true, code: true, metaCampaignId: true },
  });
  let clicks = 0;
  let leads = 0;
  for (const c of campaigns) {
    if (!c.metaCampaignId) continue;
    clicks += (
      await prisma.adClick.updateMany({
        where: { utmCampaign: c.metaCampaignId, campaignCode: null },
        data: { campaignCode: c.code },
      })
    ).count;
    const linked = await prisma.adClick.findMany({
      where: { utmCampaign: c.metaCampaignId, leadId: { not: null } },
      select: { leadId: true },
    });
    const ids = [...new Set(linked.map((l) => l.leadId).filter((x): x is string => !!x))];
    if (ids.length) {
      leads += (
        await prisma.lead.updateMany({
          where: { id: { in: ids }, campaignId: null, campaignCode: null },
          data: { campaignId: c.id, campaignCode: c.code },
        })
      ).count;
    }
  }
  return { clicks, leads };
}
