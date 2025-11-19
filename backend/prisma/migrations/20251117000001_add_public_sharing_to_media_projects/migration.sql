-- CreateEnum
CREATE TYPE "PublicAccessLevel" AS ENUM ('VIEW_ONLY', 'DOWNLOAD', 'COMMENT');

-- AlterTable
ALTER TABLE "media_projects" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicShareToken" TEXT,
ADD COLUMN     "publicShareUrl" TEXT,
ADD COLUMN     "publicViewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publicSharedAt" TIMESTAMP(3),
ADD COLUMN     "publicAccessLevel" "PublicAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY';

-- CreateIndex
CREATE UNIQUE INDEX "media_projects_publicShareToken_key" ON "media_projects"("publicShareToken");

-- CreateIndex
CREATE INDEX "media_projects_publicShareToken_idx" ON "media_projects"("publicShareToken");
