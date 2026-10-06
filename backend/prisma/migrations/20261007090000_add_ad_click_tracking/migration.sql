-- CreateEnum
CREATE TYPE "MetaEventRoute" AS ENUM ('BUSINESS_MESSAGING', 'WEBSITE');

-- AlterTable
ALTER TABLE "meta_event_outbox" ADD COLUMN     "adClickId" TEXT,
ADD COLUMN     "route" "MetaEventRoute" NOT NULL DEFAULT 'BUSINESS_MESSAGING',
ALTER COLUMN "leadId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "fbclid" TEXT,
    "fbc" TEXT,
    "fbp" TEXT,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "campaignCode" TEXT,
    "leadId" TEXT,
    "linkedAt" TIMESTAMP(3),

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_clicks_ref_key" ON "ad_clicks"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "ad_clicks_eventId_key" ON "ad_clicks"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_clicks_leadId_key" ON "ad_clicks"("leadId");

-- CreateIndex
CREATE INDEX "ad_clicks_createdAt_idx" ON "ad_clicks"("createdAt");

-- CreateIndex
CREATE INDEX "ad_clicks_campaignCode_idx" ON "ad_clicks"("campaignCode");

-- CreateIndex
CREATE INDEX "meta_event_outbox_route_status_idx" ON "meta_event_outbox"("route", "status");

-- CreateIndex
CREATE INDEX "meta_event_outbox_adClickId_idx" ON "meta_event_outbox"("adClickId");

-- AddForeignKey
ALTER TABLE "meta_event_outbox" ADD CONSTRAINT "meta_event_outbox_adClickId_fkey" FOREIGN KEY ("adClickId") REFERENCES "ad_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

