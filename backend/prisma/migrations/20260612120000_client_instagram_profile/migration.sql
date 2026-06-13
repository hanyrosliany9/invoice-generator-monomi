-- Per-client Instagram profile fields + backfill content-calendar items to a
-- client (content is now client-scoped). Idempotent for hand-apply on dev and
-- safe replay on prod via migrate deploy.

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "instagramAvatarUrl" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "instagramBio" TEXT;

-- Backfill any content with no client to the earliest client so nothing is
-- orphaned now that every item must belong to a client. No-op if there are no
-- client-less items (or no clients).
UPDATE "content_calendar_items"
SET "clientId" = (SELECT id FROM "clients" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "clientId" IS NULL
  AND EXISTS (SELECT 1 FROM "clients");
