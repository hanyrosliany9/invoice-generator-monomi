-- CreateEnum
CREATE TYPE "DeferredRevenueStatus" AS ENUM ('DEFERRED', 'PARTIALLY_RECOGNIZED', 'FULLY_RECOGNIZED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'BILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "deferred_revenue" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "recognitionDate" TIMESTAMP(3) NOT NULL,
    "recognizedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(15,2) NOT NULL,
    "status" "DeferredRevenueStatus" NOT NULL DEFAULT 'DEFERRED',
    "performanceObligation" TEXT,
    "completionPercentage" DECIMAL(5,2),
    "initialJournalId" TEXT,
    "recognitionJournalId" TEXT,
    "fiscalPeriodId" TEXT,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "recognizedAt" TIMESTAMP(3),
    "recognizedBy" TEXT,

    CONSTRAINT "deferred_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameId" TEXT,
    "description" TEXT,
    "descriptionId" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "plannedRevenue" DECIMAL(15,2) NOT NULL,
    "recognizedRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remainingRevenue" DECIMAL(15,2) NOT NULL,
    "estimatedCost" DECIMAL(15,2),
    "actualCost" DECIMAL(15,2) DEFAULT 0,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "deliverables" JSONB,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deferred_revenue_invoiceId_idx" ON "deferred_revenue"("invoiceId");

-- CreateIndex
CREATE INDEX "deferred_revenue_status_idx" ON "deferred_revenue"("status");

-- CreateIndex
CREATE INDEX "deferred_revenue_recognitionDate_idx" ON "deferred_revenue"("recognitionDate");

-- CreateIndex
CREATE INDEX "deferred_revenue_fiscalPeriodId_idx" ON "deferred_revenue"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "deferred_revenue_paymentDate_idx" ON "deferred_revenue"("paymentDate");

-- CreateIndex
CREATE INDEX "project_milestones_projectId_idx" ON "project_milestones"("projectId");

-- CreateIndex
CREATE INDEX "project_milestones_status_idx" ON "project_milestones"("status");

-- CreateIndex
CREATE INDEX "project_milestones_completionPercentage_idx" ON "project_milestones"("completionPercentage");

-- CreateIndex
CREATE INDEX "project_milestones_milestoneNumber_idx" ON "project_milestones"("milestoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "project_milestones_projectId_milestoneNumber_key" ON "project_milestones"("projectId", "milestoneNumber");

-- AddForeignKey
ALTER TABLE "deferred_revenue" ADD CONSTRAINT "deferred_revenue_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deferred_revenue" ADD CONSTRAINT "deferred_revenue_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
