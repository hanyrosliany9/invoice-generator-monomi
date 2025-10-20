-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "totalDirectCosts" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "totalIndirectCosts" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "totalAllocatedCosts" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "totalInvoicedAmount" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "totalPaidAmount" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "grossProfit" DECIMAL(15,2),
ADD COLUMN     "netProfit" DECIMAL(15,2),
ADD COLUMN     "grossMarginPercent" DECIMAL(5,2),
ADD COLUMN     "netMarginPercent" DECIMAL(5,2),
ADD COLUMN     "budgetVariance" DECIMAL(15,2),
ADD COLUMN     "budgetVariancePercent" DECIMAL(5,2),
ADD COLUMN     "profitCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "profitCalculatedBy" TEXT;

-- CreateIndex
CREATE INDEX "projects_grossMarginPercent_idx" ON "projects"("grossMarginPercent");

-- CreateIndex
CREATE INDEX "projects_netMarginPercent_idx" ON "projects"("netMarginPercent");

-- CreateIndex
CREATE INDEX "projects_totalAllocatedCosts_idx" ON "projects"("totalAllocatedCosts");

-- CreateIndex
CREATE INDEX "projects_profitCalculatedAt_idx" ON "projects"("profitCalculatedAt");
