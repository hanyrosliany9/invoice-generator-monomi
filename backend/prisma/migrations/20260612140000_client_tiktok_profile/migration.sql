-- Per-client TikTok profile fields for the content planner's TikTok preview.
-- Additive + idempotent (safe to hand-apply on dev and replay on prod).
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tiktokHandle" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tiktokAvatarUrl" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tiktokBio" TEXT;
