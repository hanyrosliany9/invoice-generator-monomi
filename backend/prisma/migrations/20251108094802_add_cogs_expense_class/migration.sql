-- AlterEnum
-- Add COGS (Cost of Goods Sold) to ExpenseClass enum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COGS' AND enumtypid = 'ExpenseClass'::regtype) THEN
        ALTER TYPE "ExpenseClass" ADD VALUE 'COGS';
    END IF;
END $$;
