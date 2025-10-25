-- Create priority enum
CREATE TYPE "MilestonePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Add new columns to project_milestones
ALTER TABLE "project_milestones"
ADD COLUMN "priority" "MilestonePriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "predecessorId" VARCHAR(255),
ADD COLUMN "delayDays" INTEGER DEFAULT 0,
ADD COLUMN "delayReason" TEXT;

-- Add foreign key constraint for predecessor
ALTER TABLE "project_milestones"
ADD CONSTRAINT "project_milestones_predecessorId_fkey"
FOREIGN KEY ("predecessorId")
REFERENCES "project_milestones"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "project_milestones_predecessorId_idx" ON "project_milestones"("predecessorId");
