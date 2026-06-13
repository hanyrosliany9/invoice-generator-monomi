-- Instagram story highlights (per-client, own uploaded media). Idempotent.
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
CREATE INDEX IF NOT EXISTS "story_highlights_clientId_idx" ON "story_highlights"("clientId");
CREATE INDEX IF NOT EXISTS "story_highlights_clientId_order_idx" ON "story_highlights"("clientId","order");
CREATE INDEX IF NOT EXISTS "highlight_media_highlightId_idx" ON "highlight_media"("highlightId");
CREATE INDEX IF NOT EXISTS "highlight_media_highlightId_order_idx" ON "highlight_media"("highlightId","order");
DO $$ BEGIN
  ALTER TABLE "story_highlights" ADD CONSTRAINT "story_highlights_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "highlight_media" ADD CONSTRAINT "highlight_media_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "story_highlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
