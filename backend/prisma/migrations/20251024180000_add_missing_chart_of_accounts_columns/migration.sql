-- AddColumn to chart_of_accounts
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'IDR';
ALTER TABLE "chart_of_accounts" ADD COLUMN IF NOT EXISTS "isCurrencyAccount" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn to projects if missing
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "estimatedExpenses" JSONB;
