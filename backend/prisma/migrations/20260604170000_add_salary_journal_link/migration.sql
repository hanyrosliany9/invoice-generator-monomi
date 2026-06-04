-- Add journalEntryId column to salary_payments for GL double-entry link
ALTER TABLE "salary_payments" ADD COLUMN "journalEntryId" TEXT;
