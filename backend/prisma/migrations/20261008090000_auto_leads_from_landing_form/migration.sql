-- DropIndex
DROP INDEX "ad_clicks_leadId_key";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "autoCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awaitingWhatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "nameIsPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ad_clicks_leadId_idx" ON "ad_clicks"("leadId");

-- CreateIndex
CREATE INDEX "leads_instagramHandle_idx" ON "leads"("instagramHandle");

-- CreateIndex
CREATE INDEX "leads_awaitingWhatsapp_idx" ON "leads"("awaitingWhatsapp");
