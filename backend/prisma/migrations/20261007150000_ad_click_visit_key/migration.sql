-- AlterTable
ALTER TABLE "ad_clicks" ADD COLUMN     "leadForwardedAt" TIMESTAMP(3),
ADD COLUMN     "visitKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ad_clicks_visitKey_key" ON "ad_clicks"("visitKey");

