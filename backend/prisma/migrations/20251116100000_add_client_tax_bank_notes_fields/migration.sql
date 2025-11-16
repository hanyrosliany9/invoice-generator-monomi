-- AlterTable
-- Add taxNumber, bankAccount, and notes fields to Client table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "taxNumber" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "notes" TEXT;
