-- Instagram preview: content format, manual grid order, agency IG profile.
-- Idempotent so it can be applied by hand on the dev DB (prisma migrate dev is broken here)
-- and replayed safely on prod via migrate deploy.

DO $$ BEGIN
  CREATE TYPE "ContentFormat" AS ENUM ('FEED', 'REEL', 'STORY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "content_calendar_items"
  ADD COLUMN IF NOT EXISTS "format" "ContentFormat" NOT NULL DEFAULT 'FEED';
ALTER TABLE "content_calendar_items"
  ADD COLUMN IF NOT EXISTS "gridOrder" INTEGER;

CREATE INDEX IF NOT EXISTS "content_calendar_items_format_idx" ON "content_calendar_items"("format");
CREATE INDEX IF NOT EXISTS "content_calendar_items_gridOrder_idx" ON "content_calendar_items"("gridOrder");

ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "instagramAvatarUrl" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "instagramBio" TEXT;
