-- CreateEnum
CREATE TYPE "SocialPublishStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "content_calendar_items" ADD COLUMN     "autoPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoPublishBy" TEXT,
ADD COLUMN     "autoPublishTargets" "ContentPlatform"[] DEFAULT ARRAY[]::"ContentPlatform"[];

-- CreateTable
CREATE TABLE "social_publications" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "status" "SocialPublishStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "state" JSONB,
    "requestedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "permalink" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_publications_status_nextAttemptAt_idx" ON "social_publications"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_publications_contentId_platform_key" ON "social_publications"("contentId", "platform");

-- CreateIndex
CREATE INDEX "content_calendar_items_autoPublish_status_scheduledAt_idx" ON "content_calendar_items"("autoPublish", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "social_publications" ADD CONSTRAINT "social_publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content_calendar_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
