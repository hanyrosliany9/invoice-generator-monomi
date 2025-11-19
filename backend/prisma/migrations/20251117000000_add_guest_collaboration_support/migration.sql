-- CreateEnum for InviteStatus
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable: Make userId nullable and add guest collaboration fields
ALTER TABLE "media_collaborators"
  -- Make userId nullable for guest collaborators
  ALTER COLUMN "userId" DROP NOT NULL,

  -- Add guest email and name
  ADD COLUMN "guestEmail" TEXT,
  ADD COLUMN "guestName" TEXT,

  -- Add invite token and status
  ADD COLUMN "inviteToken" TEXT,
  ADD COLUMN "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',

  -- Add access tracking
  ADD COLUMN "lastAccessAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),

  -- Add updatedAt timestamp with default value for existing rows
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex for invite token
CREATE UNIQUE INDEX "media_collaborators_inviteToken_key" ON "media_collaborators"("inviteToken");

-- CreateIndex for projectId and guestEmail combination
CREATE UNIQUE INDEX "media_collaborators_projectId_guestEmail_key" ON "media_collaborators"("projectId", "guestEmail");

-- CreateIndex for guestEmail lookup
CREATE INDEX "media_collaborators_guestEmail_idx" ON "media_collaborators"("guestEmail");

-- CreateIndex for status lookup
CREATE INDEX "media_collaborators_status_idx" ON "media_collaborators"("status");

-- Update existing rows to set ACCEPTED status for internal users
UPDATE "media_collaborators"
SET "status" = 'ACCEPTED', "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" IS NOT NULL;
