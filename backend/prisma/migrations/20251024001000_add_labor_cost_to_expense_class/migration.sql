-- AlterEnum - Add LABOR_COST value safely
-- Using safe pattern: IF NOT EXISTS to prevent errors on re-runs
DO $$ BEGIN
  ALTER TYPE "ExpenseClass" ADD VALUE IF NOT EXISTS 'LABOR_COST';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
