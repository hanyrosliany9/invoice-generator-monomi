-- Content planner per-client public sharing fields. Additive + idempotent.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contentShareToken" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contentShareEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contentSharedAt" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contentShareViews" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  CREATE UNIQUE INDEX "clients_contentShareToken_key" ON "clients"("contentShareToken");
EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;
