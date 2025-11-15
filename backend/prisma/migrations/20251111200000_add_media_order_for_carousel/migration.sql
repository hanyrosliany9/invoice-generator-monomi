-- AlterTable: Add order column to content_media for carousel sequencing
ALTER TABLE "content_media" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: Add composite index for efficient ordering
CREATE INDEX "content_media_contentId_order_idx" ON "content_media"("contentId", "order");

-- Data Migration: Set order based on uploadedAt (existing media)
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "contentId" ORDER BY "uploadedAt" ASC) - 1 AS new_order
  FROM "content_media"
)
UPDATE "content_media"
SET "order" = numbered.new_order
FROM numbered
WHERE "content_media".id = numbered.id;

-- Comment: Carousel media order (0 = first, 1 = second, etc.)
COMMENT ON COLUMN "content_media"."order" IS 'Carousel order (0 = first, 1 = second, etc.)';
