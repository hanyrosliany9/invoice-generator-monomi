-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "markedPaidAt" TIMESTAMP(3),
ADD COLUMN     "markedPaidBy" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT;
