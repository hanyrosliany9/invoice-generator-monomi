-- AlterTable
ALTER TABLE "invoices"
  ADD COLUMN "subtotalAmount" DECIMAL(15,2),
  ADD COLUMN "taxRate" DECIMAL(5,2),
  ADD COLUMN "taxAmount" DECIMAL(15,2),
  ADD COLUMN "includeTax" BOOLEAN NOT NULL DEFAULT false;
