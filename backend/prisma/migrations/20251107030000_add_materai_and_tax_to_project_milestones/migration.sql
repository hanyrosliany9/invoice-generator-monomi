-- Add missing Indonesian Business Fields to project_milestones
-- These fields were added to the schema but migration was never created

-- Add materaiRequired column
ALTER TABLE "project_milestones"
ADD COLUMN "materaiRequired" BOOLEAN NOT NULL DEFAULT false;

-- Add taxTreatment column
ALTER TABLE "project_milestones"
ADD COLUMN "taxTreatment" TEXT;

-- Add index for materaiRequired for query performance
CREATE INDEX "project_milestones_materaiRequired_idx" ON "project_milestones"("materaiRequired");

-- Add comment for documentation
COMMENT ON COLUMN "project_milestones"."materaiRequired" IS 'Does this milestone invoice need stamp duty? (Indonesian compliance)';
COMMENT ON COLUMN "project_milestones"."taxTreatment" IS 'Tax treatment for this milestone: PPN 11%, PPh 23, etc. (Indonesian compliance)';
