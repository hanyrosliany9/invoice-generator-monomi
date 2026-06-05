-- DropIndex
DROP INDEX "chart_of_accounts_code_idx";

-- DropIndex
DROP INDEX "expenses_status_idx";

-- DropIndex
DROP INDEX "general_ledger_accountId_idx";

-- DropIndex
DROP INDEX "invoices_clientId_idx";

-- DropIndex
DROP INDEX "invoices_status_idx";

-- DropIndex
DROP INDEX "journal_entries_isPosted_idx";

-- DropIndex
DROP INDEX "projects_status_idx";

-- DropIndex
DROP INDEX "quotations_clientId_idx";

-- DropIndex
DROP INDEX "quotations_createdAt_idx";

-- DropIndex
DROP INDEX "quotations_projectId_idx";

-- DropIndex
DROP INDEX "quotations_status_idx";

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "parentQuotationId" TEXT;

-- CreateIndex
CREATE INDEX "quotations_parentQuotationId_idx" ON "quotations"("parentQuotationId");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_parentQuotationId_fkey" FOREIGN KEY ("parentQuotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

