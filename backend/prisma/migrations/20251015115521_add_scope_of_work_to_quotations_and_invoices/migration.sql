-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "priceBreakdown" JSONB;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "priceBreakdown" JSONB;
