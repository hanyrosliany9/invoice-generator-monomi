-- CreateEnum
CREATE TYPE "AdAttributionPlatform" AS ENUM ('META', 'TIKTOK', 'NONE');

-- CreateEnum
CREATE TYPE "TikTokEventStatus" AS ENUM ('PENDING_CONFIG', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "CampaignPlatform" ADD VALUE 'TIKTOK';

-- AlterEnum
ALTER TYPE "CampaignSpendSource" ADD VALUE 'TIKTOK';

-- AlterTable
ALTER TABLE "ad_clicks" ADD COLUMN     "attributedPlatform" "AdAttributionPlatform",
ADD COLUMN     "attributionReason" TEXT,
ADD COLUMN     "ttclid" TEXT;

-- AlterTable
ALTER TABLE "crm_campaigns" ADD COLUMN     "tiktokCampaignId" TEXT,
ADD COLUMN     "tiktokCampaignName" TEXT,
ADD COLUMN     "tiktokObjective" TEXT,
ADD COLUMN     "tiktokStatus" TEXT;

-- CreateTable
CREATE TABLE "tiktok_event_outbox" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "adClickId" TEXT,
    "eventName" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "TikTokEventStatus" NOT NULL DEFAULT 'PENDING_CONFIG',
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "nextTryAt" TIMESTAMP(3),
    "inFlightAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_ads_sync_state" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "advertiserId" TEXT,
    "accountName" TEXT,
    "currency" TEXT,
    "timezoneName" TEXT,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastTrigger" TEXT,
    "backfilledAdvertiserId" TEXT,
    "rateLimitedUntil" TIMESTAMP(3),
    "rateLimitStrikes" INTEGER NOT NULL DEFAULT 0,
    "lastRangeFrom" DATE,
    "lastRangeTo" DATE,
    "tokenEnc" TEXT,
    "tokenKeyId" TEXT,
    "tokenAdvertiserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenStoredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_ads_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_ads_campaigns" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "tiktokCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "operationStatus" TEXT,
    "secondaryStatus" TEXT,
    "objective" TEXT,
    "autoLinkDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_ads_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_ads_insights_daily" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "tiktokCampaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_ads_insights_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_event_outbox_dedupeKey_key" ON "tiktok_event_outbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "tiktok_event_outbox_leadId_idx" ON "tiktok_event_outbox"("leadId");

-- CreateIndex
CREATE INDEX "tiktok_event_outbox_status_idx" ON "tiktok_event_outbox"("status");

-- CreateIndex
CREATE INDEX "tiktok_event_outbox_adClickId_idx" ON "tiktok_event_outbox"("adClickId");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_ads_campaigns_tiktokCampaignId_key" ON "tiktok_ads_campaigns"("tiktokCampaignId");

-- CreateIndex
CREATE INDEX "tiktok_ads_campaigns_advertiserId_idx" ON "tiktok_ads_campaigns"("advertiserId");

-- CreateIndex
CREATE INDEX "tiktok_ads_insights_daily_date_idx" ON "tiktok_ads_insights_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_ads_insights_daily_tiktokCampaignId_date_key" ON "tiktok_ads_insights_daily"("tiktokCampaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaigns_tiktokCampaignId_key" ON "crm_campaigns"("tiktokCampaignId");

-- AddForeignKey
ALTER TABLE "tiktok_event_outbox" ADD CONSTRAINT "tiktok_event_outbox_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiktok_event_outbox" ADD CONSTRAINT "tiktok_event_outbox_adClickId_fkey" FOREIGN KEY ("adClickId") REFERENCES "ad_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

