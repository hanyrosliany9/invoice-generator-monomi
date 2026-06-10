-- Link an asset back to the journal entry (Pembelian / manual purchase) that
-- created it, so auto-registered purchases aren't double-counted as
-- "unregistered" fixed-asset acquisitions in the depreciation report.
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "acquisitionJournalId" TEXT;
