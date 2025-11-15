-- Add layout fields to ReportSection
ALTER TABLE "report_sections" ADD COLUMN "layout" JSONB;
ALTER TABLE "report_sections" ADD COLUMN "layoutVersion" INTEGER NOT NULL DEFAULT 1;

-- Add default values for id fields using cuid-like generation
-- Note: Prisma will handle CUID generation in the application layer
ALTER TABLE "social_media_reports" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "report_sections" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Add comments for clarity
COMMENT ON COLUMN "report_sections"."layout" IS 'Widget-based layout for visual report builder';
COMMENT ON COLUMN "report_sections"."layoutVersion" IS 'Track layout schema version';
