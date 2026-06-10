-- Indonesian fiscal depreciation group (Kelompok I-IV) on assets
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "depreciationGroup" TEXT;
