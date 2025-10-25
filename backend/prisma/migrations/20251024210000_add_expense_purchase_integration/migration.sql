-- CreateEnum for PurchaseType (if not exists)
DO $$ BEGIN
    CREATE TYPE "PurchaseType" AS ENUM ('DIRECT', 'THROUGH_PO', 'REQUISITION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for PurchaseSource (if not exists)
DO $$ BEGIN
    CREATE TYPE "PurchaseSource" AS ENUM ('MANUAL', 'AUTOMATED', 'IMPORTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddColumn to expenses table for Purchase-to-Pay Integration
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "purchaseType" "PurchaseType" DEFAULT 'DIRECT';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "purchaseSource" "PurchaseSource" DEFAULT 'MANUAL';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "vendorInvoiceId" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "accountsPayableId" TEXT UNIQUE;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
