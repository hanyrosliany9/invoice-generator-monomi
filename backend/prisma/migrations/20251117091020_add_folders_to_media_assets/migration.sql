/*
  Warnings:

  - You are about to drop the column `createdBy` on the `media_folders` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `media_folders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `media_folders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "media_folders" DROP CONSTRAINT "media_folders_createdBy_fkey";

-- DropIndex
DROP INDEX "media_folders_createdBy_idx";

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "folderId" TEXT;

-- AlterTable
ALTER TABLE "media_collaborators" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "media_folders" DROP COLUMN "createdBy",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "projectId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "media_assets_folderId_idx" ON "media_assets"("folderId");

-- CreateIndex
CREATE INDEX "media_collaborators_inviteToken_idx" ON "media_collaborators"("inviteToken");

-- CreateIndex
CREATE INDEX "media_folders_projectId_idx" ON "media_folders"("projectId");

-- CreateIndex
CREATE INDEX "media_folders_createdById_idx" ON "media_folders"("createdById");

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "media_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
