-- AlterTable: Add unique constraint on paymentMilestoneId to prevent race condition
-- This prevents duplicate milestone invoices from being created simultaneously

-- First, remove any potential duplicates (if they exist)
-- Keep the oldest invoice for each milestone
WITH ranked_invoices AS (
  SELECT
    id,
    "paymentMilestoneId",
    ROW_NUMBER() OVER (PARTITION BY "paymentMilestoneId" ORDER BY "createdAt" ASC) as rn
  FROM "invoices"
  WHERE "paymentMilestoneId" IS NOT NULL
)
UPDATE "invoices"
SET "paymentMilestoneId" = NULL
WHERE id IN (
  SELECT id FROM ranked_invoices WHERE rn > 1
);

-- Now add the unique constraint
CREATE UNIQUE INDEX "invoices_paymentMilestoneId_key" ON "invoices"("paymentMilestoneId");
