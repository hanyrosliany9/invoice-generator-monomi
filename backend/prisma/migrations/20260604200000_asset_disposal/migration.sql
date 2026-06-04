-- Migration: Asset Disposal support
-- Adds DISPOSED enum value to AssetStatus, disposal fields to assets table,
-- and ASSET_DISPOSAL transaction type to TransactionType enum.

-- Step 1: Add DISPOSED to AssetStatus enum (must be outside transaction)
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'DISPOSED';

-- Step 2: Add ASSET_DISPOSAL to TransactionType enum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ASSET_DISPOSAL';

-- Step 3: Add disposal fields to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS "disposalDate" timestamp(3) without time zone;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS "disposalProceeds" numeric(15,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS "disposalJournalId" text;
