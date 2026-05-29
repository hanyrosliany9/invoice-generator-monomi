-- AlterEnum: Add ASSET_PURCHASE and YEAR_END_CLOSING to TransactionType
-- These values are needed for:
--   ASSET_PURCHASE: journal entries when fixed assets are acquired
--   YEAR_END_CLOSING: closing entry that transfers net income to Retained Earnings

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ASSET_PURCHASE';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'YEAR_END_CLOSING';
