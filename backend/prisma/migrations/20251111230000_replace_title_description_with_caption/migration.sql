-- AlterTable: Replace title & description with caption field for social media content
-- Step 1: Add new caption column
ALTER TABLE "content_calendar_items" ADD COLUMN "caption" TEXT;

-- Step 2: Migrate existing data (title + description -> caption)
UPDATE "content_calendar_items"
SET "caption" = CASE
  WHEN "description" IS NOT NULL AND "description" != '' THEN "title" || E'\n\n' || "description"
  ELSE "title"
END;

-- Step 3: Make caption NOT NULL (all rows now have data)
ALTER TABLE "content_calendar_items" ALTER COLUMN "caption" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "content_calendar_items" DROP COLUMN "title";
ALTER TABLE "content_calendar_items" DROP COLUMN "description";

-- Comment: Caption field is used for social media post text (combines previous title & description)
COMMENT ON COLUMN "content_calendar_items"."caption" IS 'Social media caption/post text (replaces title & description)';
