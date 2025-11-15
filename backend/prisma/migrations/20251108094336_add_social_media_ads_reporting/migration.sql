-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('PERCENTAGE', 'FIXED', 'HOURLY');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "ad_platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "apiEndpoint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supportedObjectives" JSONB,
    "supportedMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_credentials" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "projectId" TEXT,
    "credentialType" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "objective" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "totalBudget" DECIMAL(12,2),
    "dailyBudget" DECIMAL(12,2),
    "currency" "Currency" NOT NULL DEFAULT 'IDR',
    "description" TEXT,
    "externalId" TEXT,
    "managementFeeType" "FeeType" DEFAULT 'PERCENTAGE',
    "managementFeeAmount" DECIMAL(12,2),
    "billingCycle" TEXT DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_daily_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT,
    "amountSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'IDR',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "results" INTEGER NOT NULL DEFAULT 0,
    "costPerResult" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cpm" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cpc" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ctr" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "videoViews" INTEGER DEFAULT 0,
    "engagement" INTEGER DEFAULT 0,
    "linkClicks" INTEGER DEFAULT 0,
    "shares" INTEGER DEFAULT 0,
    "comments" INTEGER DEFAULT 0,
    "saves" INTEGER DEFAULT 0,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_monthly_reports" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalReach" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "avgCostPerResult" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgCpm" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgCpc" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgCtr" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avgConversionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportUrl" TEXT,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "emailedAt" TIMESTAMP(3),
    "emailedTo" TEXT,
    "insights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_data_imports" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "importType" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSizeKb" INTEGER,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE,
    "endDate" DATE,
    "errors" JSONB,
    "metadata" JSONB,
    "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_data_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_platforms_name_key" ON "ad_platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ad_platforms_slug_key" ON "ad_platforms"("slug");

-- CreateIndex
CREATE INDEX "ad_platforms_slug_idx" ON "ad_platforms"("slug");

-- CreateIndex
CREATE INDEX "ad_platforms_isActive_idx" ON "ad_platforms"("isActive");

-- CreateIndex
CREATE INDEX "platform_credentials_platformId_idx" ON "platform_credentials"("platformId");

-- CreateIndex
CREATE INDEX "platform_credentials_projectId_idx" ON "platform_credentials"("projectId");

-- CreateIndex
CREATE INDEX "platform_credentials_createdBy_idx" ON "platform_credentials"("createdBy");

-- CreateIndex
CREATE INDEX "platform_credentials_isActive_idx" ON "platform_credentials"("isActive");

-- CreateIndex
CREATE INDEX "campaigns_name_idx" ON "campaigns"("name");

-- CreateIndex
CREATE INDEX "campaigns_projectId_idx" ON "campaigns"("projectId");

-- CreateIndex
CREATE INDEX "campaigns_clientId_idx" ON "campaigns"("clientId");

-- CreateIndex
CREATE INDEX "campaigns_platformId_idx" ON "campaigns"("platformId");

-- CreateIndex
CREATE INDEX "campaigns_status_startDate_idx" ON "campaigns"("status", "startDate");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "campaigns_name_status_idx" ON "campaigns"("name", "status");

-- CreateIndex
CREATE INDEX "campaigns_externalId_idx" ON "campaigns"("externalId");

-- CreateIndex
CREATE INDEX "campaign_daily_metrics_campaignId_date_idx" ON "campaign_daily_metrics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "campaign_daily_metrics_date_idx" ON "campaign_daily_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_daily_metrics_campaignId_date_key" ON "campaign_daily_metrics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "campaign_monthly_reports_campaignId_year_month_idx" ON "campaign_monthly_reports"("campaignId", "year", "month");

-- CreateIndex
CREATE INDEX "campaign_monthly_reports_generatedAt_campaignId_idx" ON "campaign_monthly_reports"("generatedAt", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_monthly_reports_campaignId_year_month_key" ON "campaign_monthly_reports"("campaignId", "year", "month");

-- CreateIndex
CREATE INDEX "campaign_data_imports_campaignId_idx" ON "campaign_data_imports"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_data_imports_importedBy_idx" ON "campaign_data_imports"("importedBy");

-- CreateIndex
CREATE INDEX "campaign_data_imports_status_idx" ON "campaign_data_imports"("status");

-- CreateIndex
CREATE INDEX "campaign_data_imports_createdAt_idx" ON "campaign_data_imports"("createdAt");

-- AddForeignKey
ALTER TABLE "platform_credentials" ADD CONSTRAINT "platform_credentials_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ad_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_credentials" ADD CONSTRAINT "platform_credentials_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_credentials" ADD CONSTRAINT "platform_credentials_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "ad_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_daily_metrics" ADD CONSTRAINT "campaign_daily_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_monthly_reports" ADD CONSTRAINT "campaign_monthly_reports_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_data_imports" ADD CONSTRAINT "campaign_data_imports_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_data_imports" ADD CONSTRAINT "campaign_data_imports_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
