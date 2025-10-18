-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('PERCENTAGE', 'HOURS', 'DIRECT', 'SQUARE_METER', 'HEADCOUNT');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('MATERIAL', 'LABOR', 'OVERHEAD', 'SUBCONTRACTOR', 'EQUIPMENT');

-- CreateTable
CREATE TABLE "work_in_progress" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "fiscalPeriodId" TEXT,
    "directMaterialCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "directLaborCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "directExpenses" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "allocatedOverhead" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "billedToDate" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recognizedRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unbilledRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "costJournalId" TEXT,
    "revenueJournalId" TEXT,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "work_in_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_cost_allocations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "allocationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocationMethod" "AllocationMethod" NOT NULL,
    "allocationPercentage" DECIMAL(5,2),
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "journalEntryId" TEXT,
    "costType" "CostType" NOT NULL,
    "isDirect" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "project_cost_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_in_progress_projectId_idx" ON "work_in_progress"("projectId");

-- CreateIndex
CREATE INDEX "work_in_progress_periodDate_idx" ON "work_in_progress"("periodDate");

-- CreateIndex
CREATE INDEX "work_in_progress_fiscalPeriodId_idx" ON "work_in_progress"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "work_in_progress_isCompleted_idx" ON "work_in_progress"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "work_in_progress_projectId_periodDate_key" ON "work_in_progress"("projectId", "periodDate");

-- CreateIndex
CREATE INDEX "project_cost_allocations_projectId_idx" ON "project_cost_allocations"("projectId");

-- CreateIndex
CREATE INDEX "project_cost_allocations_expenseId_idx" ON "project_cost_allocations"("expenseId");

-- CreateIndex
CREATE INDEX "project_cost_allocations_allocationDate_idx" ON "project_cost_allocations"("allocationDate");

-- CreateIndex
CREATE INDEX "project_cost_allocations_costType_idx" ON "project_cost_allocations"("costType");

-- AddForeignKey
ALTER TABLE "work_in_progress" ADD CONSTRAINT "work_in_progress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_in_progress" ADD CONSTRAINT "work_in_progress_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cost_allocations" ADD CONSTRAINT "project_cost_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cost_allocations" ADD CONSTRAINT "project_cost_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
