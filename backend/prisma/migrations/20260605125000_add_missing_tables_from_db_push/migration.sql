-- Ten tables (and the "ShotStatus" enum) exist on production but were never
-- created by any migration in this folder — they were added via `prisma db
-- push` directly at some point (shot lists, Pinterest downloader, call sheet
-- advance schedule / stand-ins, Instagram story highlights) and no one ever
-- generated a matching migration. This wasn't caught until a from-scratch
-- `prisma migrate deploy` was tested end-to-end: migration
-- 20260605130000_add_missing_foreign_keys adds FK constraints referencing
-- "shot_lists" / "shots" / "pinterest_downloads" etc, which don't exist yet
-- on a fresh replay, so it fails with "relation does not exist".
--
-- Every statement here is idempotent (CREATE TABLE IF NOT EXISTS / CREATE
-- INDEX IF NOT EXISTS / DO-block-guarded CREATE TYPE and ADD CONSTRAINT), so
-- this migration is a genuine fix on a fresh database and a safe no-op on
-- production and any other environment that already has these tables.
--
-- Column/index/constraint definitions below were taken verbatim from a
-- pg_dump of production (2026-08-03) to guarantee they match what's
-- actually running, not a best-effort reconstruction from schema.prisma.

-- ============================================================
-- Enum used by "shots" — also missing from migration history.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "ShotStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'SHOT', 'WRAPPED', 'CUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- story_highlights (Instagram story highlights, per-client)
-- ============================================================
CREATE TABLE IF NOT EXISTS "story_highlights" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "coverKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_highlights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "story_highlights_clientId_idx" ON "story_highlights"("clientId");
CREATE INDEX IF NOT EXISTS "story_highlights_clientId_order_idx" ON "story_highlights"("clientId", "order");

DO $$ BEGIN
  ALTER TABLE "story_highlights" ADD CONSTRAINT "story_highlights_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- highlight_media (media items within a story highlight)
-- ============================================================
CREATE TABLE IF NOT EXISTS "highlight_media" (
    "id" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "thumbnailKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "highlight_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "highlight_media_highlightId_idx" ON "highlight_media"("highlightId");
CREATE INDEX IF NOT EXISTS "highlight_media_highlightId_order_idx" ON "highlight_media"("highlightId", "order");

DO $$ BEGIN
  ALTER TABLE "highlight_media" ADD CONSTRAINT "highlight_media_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "story_highlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- shot_lists / shot_list_scenes / shots (production shot-list planning)
-- ============================================================
CREATE TABLE IF NOT EXISTS "shot_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shot_lists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shot_lists_projectId_idx" ON "shot_lists"("projectId");

DO $$ BEGIN
  ALTER TABLE "shot_lists" ADD CONSTRAINT "shot_lists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shot_lists" ADD CONSTRAINT "shot_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "shot_list_scenes" (
    "id" TEXT NOT NULL,
    "shotListId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "intExt" TEXT,
    "dayNight" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shot_list_scenes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shot_list_scenes_shotListId_idx" ON "shot_list_scenes"("shotListId");

DO $$ BEGIN
  ALTER TABLE "shot_list_scenes" ADD CONSTRAINT "shot_list_scenes_shotListId_fkey" FOREIGN KEY ("shotListId") REFERENCES "shot_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "shots" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "shotNumber" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "shotSize" TEXT,
    "shotType" TEXT,
    "cameraAngle" TEXT,
    "cameraMovement" TEXT,
    "lens" TEXT,
    "frameRate" TEXT,
    "camera" TEXT,
    "description" TEXT,
    "action" TEXT,
    "dialogue" TEXT,
    "notes" TEXT,
    "storyboardUrl" TEXT,
    "storyboardKey" TEXT,
    "setupNumber" INTEGER,
    "estimatedTime" INTEGER,
    "status" "ShotStatus" NOT NULL DEFAULT 'PLANNED',
    "vfx" TEXT,
    "sfx" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shots_sceneId_idx" ON "shots"("sceneId");

DO $$ BEGIN
  ALTER TABLE "shots" ADD CONSTRAINT "shots_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "shot_list_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- pinterest_downloads / pinterest_pins (Pinterest board downloader)
-- ============================================================
CREATE TABLE IF NOT EXISTS "pinterest_downloads" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "username" TEXT,
    "boardName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalPins" INTEGER NOT NULL DEFAULT 0,
    "downloadedPins" INTEGER NOT NULL DEFAULT 0,
    "failedPins" INTEGER NOT NULL DEFAULT 0,
    "skippedPins" INTEGER NOT NULL DEFAULT 0,
    "outputPath" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pinterest_downloads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pinterest_downloads_createdAt_idx" ON "pinterest_downloads"("createdAt");
CREATE INDEX IF NOT EXISTS "pinterest_downloads_status_idx" ON "pinterest_downloads"("status");
CREATE INDEX IF NOT EXISTS "pinterest_downloads_userId_idx" ON "pinterest_downloads"("userId");

DO $$ BEGIN
  ALTER TABLE "pinterest_downloads" ADD CONSTRAINT "pinterest_downloads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "pinterest_pins" (
    "id" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "localPath" TEXT,
    "mediaType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadId" TEXT NOT NULL,

    CONSTRAINT "pinterest_pins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pinterest_pins_downloadId_idx" ON "pinterest_pins"("downloadId");
CREATE INDEX IF NOT EXISTS "pinterest_pins_downloaded_idx" ON "pinterest_pins"("downloaded");
CREATE UNIQUE INDEX IF NOT EXISTS "pinterest_pins_pinId_downloadId_key" ON "pinterest_pins"("pinId", "downloadId");

DO $$ BEGIN
  ALTER TABLE "pinterest_pins" ADD CONSTRAINT "pinterest_pins_downloadId_fkey" FOREIGN KEY ("downloadId") REFERENCES "pinterest_downloads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- call_sheet_advance_days / call_sheet_advance_scenes / call_sheet_standins
-- (call sheet advance schedule + stand-in tracking; "call_sheets" itself was
-- created earlier by 20251221220812_add_schedule_callsheet_models)
-- ============================================================
CREATE TABLE IF NOT EXISTS "call_sheet_advance_days" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "estCall" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_advance_days_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_sheet_advance_days_callSheetId_idx" ON "call_sheet_advance_days"("callSheetId");

DO $$ BEGIN
  ALTER TABLE "call_sheet_advance_days" ADD CONSTRAINT "call_sheet_advance_days_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "call_sheet_advance_scenes" (
    "id" TEXT NOT NULL,
    "advanceDayId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "sceneName" TEXT,
    "castIds" TEXT,
    "dayNight" TEXT,
    "location" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_advance_scenes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_sheet_advance_scenes_advanceDayId_idx" ON "call_sheet_advance_scenes"("advanceDayId");

DO $$ BEGIN
  ALTER TABLE "call_sheet_advance_scenes" ADD CONSTRAINT "call_sheet_advance_scenes_advanceDayId_fkey" FOREIGN KEY ("advanceDayId") REFERENCES "call_sheet_advance_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "call_sheet_standins" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "forActor" TEXT NOT NULL,
    "callTime" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sheet_standins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "call_sheet_standins_callSheetId_idx" ON "call_sheet_standins"("callSheetId");

DO $$ BEGIN
  ALTER TABLE "call_sheet_standins" ADD CONSTRAINT "call_sheet_standins_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "call_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
