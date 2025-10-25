-- Create Currency enum safely
DO $$ BEGIN
  CREATE TYPE "Currency" AS ENUM ('IDR', 'USD', 'USDT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add columns to chart_of_accounts table
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "currency" "Currency" DEFAULT 'IDR' NOT NULL;
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "isCurrencyAccount" BOOLEAN DEFAULT false NOT NULL;

-- Add column to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "estimatedExpenses" JSONB;
