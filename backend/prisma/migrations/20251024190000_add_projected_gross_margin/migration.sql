-- AddColumn to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectedGrossMargin" DECIMAL(5,2);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectedNetMargin" DECIMAL(5,2);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "projectedProfit" DECIMAL(15,2);
