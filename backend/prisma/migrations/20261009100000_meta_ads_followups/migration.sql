-- AlterTable
ALTER TABLE "crm_campaigns" ADD COLUMN     "codeAuto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "campaignSource" TEXT;

-- AlterTable
ALTER TABLE "meta_ads_sync_state" ADD COLUMN     "timezoneName" TEXT;

-- CreateIndex
CREATE INDEX "ad_clicks_utmCampaign_idx" ON "ad_clicks"("utmCampaign");


-- Backfill: nothing records who set an existing lead's campaign (a later manual change
-- is indistinguishable from the original attribution), so EVERY lead that already has a
-- campaign becomes MANUAL (never moved by the Meta sync). Leads without a campaign stay
-- NULL: attribution may still fill them in (and then marks them AUTO).
UPDATE "leads" SET "campaignSource" = 'MANUAL' WHERE "campaignId" IS NOT NULL;
