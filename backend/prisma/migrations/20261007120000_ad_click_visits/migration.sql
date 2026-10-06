-- AlterTable
ALTER TABLE "ad_clicks" DROP COLUMN "meta",
ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "engagedAt" TIMESTAMP(3),
ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "pageViewAt" TIMESTAMP(3),
ADD COLUMN     "viewContentAt" TIMESTAMP(3),
ADD COLUMN     "visitId" TEXT,
ALTER COLUMN "ref" DROP NOT NULL,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "instagramHandle" TEXT;

-- CreateIndex
CREATE INDEX "ad_clicks_visitId_idx" ON "ad_clicks"("visitId");

