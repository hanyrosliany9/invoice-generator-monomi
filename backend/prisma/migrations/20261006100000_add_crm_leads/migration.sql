-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WHATSAPP_CTWA', 'WHATSAPP_ORGANIC', 'INSTAGRAM_DM', 'REFERRAL', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStageType" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'CALL', 'WHATSAPP', 'MEETING', 'STAGE_CHANGE', 'FOLLOW_UP_SET', 'FOLLOW_UP_DONE', 'CONVERTED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "CampaignPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'BOTH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "CampaignSpendSource" AS ENUM ('MANUAL', 'META');

-- CreateEnum
CREATE TYPE "MetaEventStatus" AS ENUM ('PENDING_CONFIG', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "lead_stages" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#8d8b93',
    "type" "LeadStageType" NOT NULL DEFAULT 'OPEN',
    "metaEvent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "platform" "CampaignPlatform" NOT NULL DEFAULT 'FACEBOOK',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(14,2),
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "prefillMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_campaign_spends" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "source" "CampaignSpendSource" NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_campaign_spends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "waId" TEXT,
    "email" TEXT,
    "company" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "campaignId" TEXT,
    "campaignCode" TEXT,
    "adId" TEXT,
    "ctwaClid" TEXT,
    "referral" JSONB,
    "firstMessage" TEXT,
    "stageId" TEXT NOT NULL,
    "estimatedValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "assignedToId" TEXT,
    "followUpAt" TIMESTAMP(3),
    "followUpNote" TEXT,
    "lostReason" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "quotationId" TEXT,
    "firstContactAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "body" TEXT,
    "fromStageId" TEXT,
    "toStageId" TEXT,
    "metaEvent" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_event_outbox" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "MetaEventStatus" NOT NULL DEFAULT 'PENDING_CONFIG',
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "responseThresholdMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_stages_key_key" ON "lead_stages"("key");

-- CreateIndex
CREATE INDEX "lead_stages_order_idx" ON "lead_stages"("order");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaigns_code_key" ON "crm_campaigns"("code");

-- CreateIndex
CREATE INDEX "crm_campaigns_status_idx" ON "crm_campaigns"("status");

-- CreateIndex
CREATE INDEX "crm_campaign_spends_campaignId_idx" ON "crm_campaign_spends"("campaignId");

-- CreateIndex
CREATE INDEX "crm_campaign_spends_dateFrom_dateTo_idx" ON "crm_campaign_spends"("dateFrom", "dateTo");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "leads_waId_idx" ON "leads"("waId");

-- CreateIndex
CREATE INDEX "leads_stageId_idx" ON "leads"("stageId");

-- CreateIndex
CREATE INDEX "leads_assignedToId_idx" ON "leads"("assignedToId");

-- CreateIndex
CREATE INDEX "leads_campaignId_idx" ON "leads"("campaignId");

-- CreateIndex
CREATE INDEX "leads_followUpAt_idx" ON "leads"("followUpAt");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "leads_quotationId_idx" ON "leads"("quotationId");

-- CreateIndex
CREATE INDEX "leads_projectId_idx" ON "leads"("projectId");

-- CreateIndex
CREATE INDEX "lead_activities_leadId_createdAt_idx" ON "lead_activities"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "meta_event_outbox_dedupeKey_key" ON "meta_event_outbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "meta_event_outbox_leadId_idx" ON "meta_event_outbox"("leadId");

-- CreateIndex
CREATE INDEX "meta_event_outbox_status_idx" ON "meta_event_outbox"("status");

-- AddForeignKey
ALTER TABLE "crm_campaign_spends" ADD CONSTRAINT "crm_campaign_spends_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "crm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "crm_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "lead_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "lead_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "lead_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_event_outbox" ADD CONSTRAINT "meta_event_outbox_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

