/*
  Warnings:

  - You are about to drop the column `includeTax` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `subtotalAmount` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `taxRate` on the `quotations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('VIDEO', 'IMAGE', 'RAW_IMAGE');

-- CreateEnum
CREATE TYPE "MediaReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('OWNER', 'EDITOR', 'COMMENTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "DrawingType" AS ENUM ('ARROW', 'CIRCLE', 'RECTANGLE', 'FREEHAND', 'TEXT');

-- CreateEnum
CREATE TYPE "SortOrder" AS ENUM ('ASC', 'DESC');

-- AlterEnum
ALTER TYPE "ExpenseClass" ADD VALUE 'COGS';

-- DropIndex
DROP INDEX "invoices_paymentMilestoneId_key";

-- DropIndex
DROP INDEX "payment_milestones_isInvoiced_idx";

-- DropIndex
DROP INDEX "payment_milestones_quotationId_isInvoiced_idx";

-- DropIndex
DROP INDEX "projects_clientId_status_createdAt_idx";

-- DropIndex
DROP INDEX "quotations_createdBy_idx";

-- DropIndex
DROP INDEX "quotations_createdBy_status_idx";

-- AlterTable
ALTER TABLE "cash_bank_balances" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "content_calendar_items" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "includeTax",
DROP COLUMN "subtotalAmount",
DROP COLUMN "taxAmount",
DROP COLUMN "taxRate";

-- AlterTable
ALTER TABLE "report_sections" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "social_media_reports" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropEnum
DROP TYPE "FeeType";

-- CreateTable
CREATE TABLE "media_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "folderId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "mediaType" "MediaAssetType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "duration" DECIMAL(10,3),
    "fps" DECIMAL(6,2),
    "codec" TEXT,
    "bitrate" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "starRating" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_metadata" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "platforms" "ContentPlatform"[],
    "tags" TEXT[],
    "customFields" JSONB,
    "cameraModel" TEXT,
    "cameraMake" TEXT,
    "lens" TEXT,
    "iso" INTEGER,
    "aperture" DECIMAL(4,2),
    "shutterSpeed" TEXT,
    "focalLength" INTEGER,
    "capturedAt" TIMESTAMP(3),
    "gpsLatitude" DECIMAL(10,8),
    "gpsLongitude" DECIMAL(11,8),
    "copyright" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDynamic" BOOLEAN NOT NULL DEFAULT true,
    "filters" JSONB,
    "groupBy" TEXT,
    "sortBy" TEXT NOT NULL DEFAULT 'uploadedAt',
    "sortOrder" "SortOrder" NOT NULL DEFAULT 'DESC',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_versions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "size" BIGINT NOT NULL,
    "duration" DECIMAL(10,3),
    "width" INTEGER,
    "height" INTEGER,
    "changeNotes" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_frames" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "timestamp" DECIMAL(10,3),
    "frameNumber" INTEGER,
    "x" DECIMAL(5,2),
    "y" DECIMAL(5,2),
    "thumbnailUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frame_comments" (
    "id" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "x" DECIMAL(5,2),
    "y" DECIMAL(5,2),
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "mentions" TEXT[],
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frame_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frame_drawings" (
    "id" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "type" "DrawingType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frame_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_collaborators" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "invitedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_projects_clientId_idx" ON "media_projects"("clientId");

-- CreateIndex
CREATE INDEX "media_projects_projectId_idx" ON "media_projects"("projectId");

-- CreateIndex
CREATE INDEX "media_projects_folderId_idx" ON "media_projects"("folderId");

-- CreateIndex
CREATE INDEX "media_projects_createdBy_idx" ON "media_projects"("createdBy");

-- CreateIndex
CREATE INDEX "media_folders_parentId_idx" ON "media_folders"("parentId");

-- CreateIndex
CREATE INDEX "media_folders_createdBy_idx" ON "media_folders"("createdBy");

-- CreateIndex
CREATE INDEX "media_assets_projectId_idx" ON "media_assets"("projectId");

-- CreateIndex
CREATE INDEX "media_assets_uploadedBy_idx" ON "media_assets"("uploadedBy");

-- CreateIndex
CREATE INDEX "media_assets_status_idx" ON "media_assets"("status");

-- CreateIndex
CREATE INDEX "media_assets_starRating_idx" ON "media_assets"("starRating");

-- CreateIndex
CREATE INDEX "media_assets_mediaType_idx" ON "media_assets"("mediaType");

-- CreateIndex
CREATE INDEX "media_assets_projectId_starRating_idx" ON "media_assets"("projectId", "starRating");

-- CreateIndex
CREATE UNIQUE INDEX "asset_metadata_assetId_key" ON "asset_metadata"("assetId");

-- CreateIndex
CREATE INDEX "asset_metadata_assigneeId_idx" ON "asset_metadata"("assigneeId");

-- CreateIndex
CREATE INDEX "asset_metadata_dueDate_idx" ON "asset_metadata"("dueDate");

-- CreateIndex
CREATE INDEX "asset_metadata_platforms_idx" ON "asset_metadata"("platforms");

-- CreateIndex
CREATE UNIQUE INDEX "collections_shareToken_key" ON "collections"("shareToken");

-- CreateIndex
CREATE INDEX "collections_projectId_idx" ON "collections"("projectId");

-- CreateIndex
CREATE INDEX "collections_isDynamic_idx" ON "collections"("isDynamic");

-- CreateIndex
CREATE INDEX "collections_shareToken_idx" ON "collections"("shareToken");

-- CreateIndex
CREATE INDEX "collection_items_collectionId_order_idx" ON "collection_items"("collectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collectionId_assetId_key" ON "collection_items"("collectionId", "assetId");

-- CreateIndex
CREATE INDEX "media_versions_assetId_idx" ON "media_versions"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "media_versions_assetId_versionNumber_key" ON "media_versions"("assetId", "versionNumber");

-- CreateIndex
CREATE INDEX "media_frames_assetId_timestamp_idx" ON "media_frames"("assetId", "timestamp");

-- CreateIndex
CREATE INDEX "media_frames_assetId_x_y_idx" ON "media_frames"("assetId", "x", "y");

-- CreateIndex
CREATE INDEX "media_frames_createdBy_idx" ON "media_frames"("createdBy");

-- CreateIndex
CREATE INDEX "frame_comments_frameId_idx" ON "frame_comments"("frameId");

-- CreateIndex
CREATE INDEX "frame_comments_parentId_idx" ON "frame_comments"("parentId");

-- CreateIndex
CREATE INDEX "frame_comments_authorId_idx" ON "frame_comments"("authorId");

-- CreateIndex
CREATE INDEX "frame_comments_resolved_idx" ON "frame_comments"("resolved");

-- CreateIndex
CREATE INDEX "frame_drawings_frameId_idx" ON "frame_drawings"("frameId");

-- CreateIndex
CREATE INDEX "media_collaborators_projectId_idx" ON "media_collaborators"("projectId");

-- CreateIndex
CREATE INDEX "media_collaborators_userId_idx" ON "media_collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "media_collaborators_projectId_userId_key" ON "media_collaborators"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "media_projects" ADD CONSTRAINT "media_projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_projects" ADD CONSTRAINT "media_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_projects" ADD CONSTRAINT "media_projects_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_projects" ADD CONSTRAINT "media_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "media_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "media_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_metadata" ADD CONSTRAINT "asset_metadata_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_metadata" ADD CONSTRAINT "asset_metadata_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "media_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_versions" ADD CONSTRAINT "media_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_versions" ADD CONSTRAINT "media_versions_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_frames" ADD CONSTRAINT "media_frames_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_frames" ADD CONSTRAINT "media_frames_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frame_comments" ADD CONSTRAINT "frame_comments_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "media_frames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frame_comments" ADD CONSTRAINT "frame_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "frame_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frame_comments" ADD CONSTRAINT "frame_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frame_comments" ADD CONSTRAINT "frame_comments_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frame_drawings" ADD CONSTRAINT "frame_drawings_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "media_frames"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frame_drawings" ADD CONSTRAINT "frame_drawings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collaborators" ADD CONSTRAINT "media_collaborators_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "media_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collaborators" ADD CONSTRAINT "media_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collaborators" ADD CONSTRAINT "media_collaborators_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
