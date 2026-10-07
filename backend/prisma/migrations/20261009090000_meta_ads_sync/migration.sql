-- AlterTable
ALTER TABLE "crm_campaigns" ADD COLUMN     "metaCampaignId" TEXT,
ADD COLUMN     "metaCampaignName" TEXT,
ADD COLUMN     "metaObjective" TEXT,
ADD COLUMN     "metaStatus" TEXT;

-- CreateTable
CREATE TABLE "meta_ads_sync_state" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "adAccountId" TEXT,
    "accountName" TEXT,
    "currency" TEXT,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastTrigger" TEXT,
    "backfilledAccountId" TEXT,
    "rateLimitedUntil" TIMESTAMP(3),
    "rateLimitStrikes" INTEGER NOT NULL DEFAULT 0,
    "lastRangeFrom" DATE,
    "lastRangeTo" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ads_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ads_campaigns" (
    "id" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "effectiveStatus" TEXT,
    "objective" TEXT,
    "autoLinkDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ads_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ads_ads" (
    "adId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ads_ads_pkey" PRIMARY KEY ("adId")
);

-- CreateTable
CREATE TABLE "meta_ads_insights_daily" (
    "id" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ads_insights_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_ads_campaigns_metaCampaignId_key" ON "meta_ads_campaigns"("metaCampaignId");

-- CreateIndex
CREATE INDEX "meta_ads_campaigns_adAccountId_idx" ON "meta_ads_campaigns"("adAccountId");

-- CreateIndex
CREATE INDEX "meta_ads_ads_metaCampaignId_idx" ON "meta_ads_ads"("metaCampaignId");

-- CreateIndex
CREATE INDEX "meta_ads_insights_daily_date_idx" ON "meta_ads_insights_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ads_insights_daily_metaCampaignId_date_key" ON "meta_ads_insights_daily"("metaCampaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaigns_metaCampaignId_key" ON "crm_campaigns"("metaCampaignId");

