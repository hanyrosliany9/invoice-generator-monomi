-- AlterTable
ALTER TABLE "crm_campaigns" ADD COLUMN     "codeAuto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "campaignSource" TEXT;

-- AlterTable
ALTER TABLE "meta_ads_sync_state" ADD COLUMN     "timezoneName" TEXT;

-- CreateIndex
CREATE INDEX "ad_clicks_utmCampaign_idx" ON "ad_clicks"("utmCampaign");


-- Backfill: a campaign set by the server from a landing-page tap (auto-created lead
-- with a click and ad id) is AUTO; every other existing assignment is MANUAL (when unsure, MANUAL).
UPDATE "leads" SET "campaignSource" = CASE
  WHEN "autoCreated" = true OR ("adId" IS NOT NULL AND "ctwaClid" IS NOT NULL) THEN 'AUTO'
  ELSE 'MANUAL' END
WHERE "campaignId" IS NOT NULL;
