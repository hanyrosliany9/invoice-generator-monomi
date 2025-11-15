-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'TWITTER', 'LINKEDIN', 'YOUTUBE');

-- CreateTable
CREATE TABLE "content_calendar_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "platforms" "ContentPlatform"[],
    "clientId" TEXT,
    "projectId" TEXT,
    "campaignId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_calendar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "originalName" TEXT,
    "contentId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_calendar_items_status_idx" ON "content_calendar_items"("status");

-- CreateIndex
CREATE INDEX "content_calendar_items_scheduledAt_idx" ON "content_calendar_items"("scheduledAt");

-- CreateIndex
CREATE INDEX "content_calendar_items_clientId_idx" ON "content_calendar_items"("clientId");

-- CreateIndex
CREATE INDEX "content_calendar_items_projectId_idx" ON "content_calendar_items"("projectId");

-- CreateIndex
CREATE INDEX "content_calendar_items_campaignId_idx" ON "content_calendar_items"("campaignId");

-- CreateIndex
CREATE INDEX "content_calendar_items_createdBy_idx" ON "content_calendar_items"("createdBy");

-- CreateIndex
CREATE INDEX "content_calendar_items_status_scheduledAt_idx" ON "content_calendar_items"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "content_media_contentId_idx" ON "content_media"("contentId");

-- CreateIndex
CREATE INDEX "content_media_type_idx" ON "content_media"("type");

-- CreateIndex
CREATE INDEX "content_media_uploadedAt_idx" ON "content_media"("uploadedAt");

-- AddForeignKey
ALTER TABLE "content_calendar_items" ADD CONSTRAINT "content_calendar_items_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_calendar_items" ADD CONSTRAINT "content_calendar_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_calendar_items" ADD CONSTRAINT "content_calendar_items_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_calendar_items" ADD CONSTRAINT "content_calendar_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content_calendar_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
