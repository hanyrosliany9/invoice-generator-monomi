-- Add paymentMilestoneId column to invoices if it doesn't exist
-- Note: The foreign key constraint will be enforced by the application layer
ALTER TABLE "invoices"
ADD COLUMN IF NOT EXISTS "paymentMilestoneId" TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "invoices_paymentMilestoneId_idx" ON "invoices"("paymentMilestoneId");
