-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION');

-- CreateEnum
CREATE TYPE "DepreciationStatus" AS ENUM ('CALCULATED', 'POSTED', 'REVERSED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "ECLProvisionStatus" AS ENUM ('ACTIVE', 'WRITTEN_OFF', 'RECOVERED', 'REVERSED');

-- CreateTable
CREATE TABLE "depreciation_schedules" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "method" "DepreciationMethod" NOT NULL,
    "depreciableAmount" DECIMAL(15,2) NOT NULL,
    "residualValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "usefulLifeYears" DECIMAL(5,2) NOT NULL,
    "depreciationPerMonth" DECIMAL(15,2) NOT NULL,
    "depreciationPerYear" DECIMAL(15,2) NOT NULL,
    "annualRate" DECIMAL(5,4) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFulfilled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "fiscalPeriodId" TEXT,
    "depreciationAmount" DECIMAL(15,2) NOT NULL,
    "accumulatedDepreciation" DECIMAL(15,2) NOT NULL,
    "bookValue" DECIMAL(15,2) NOT NULL,
    "journalEntryId" TEXT,
    "status" "DepreciationStatus" NOT NULL DEFAULT 'CALCULATED',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowance_for_doubtful_accounts" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,
    "fiscalPeriodId" TEXT,
    "agingBucket" TEXT NOT NULL,
    "daysPastDue" INTEGER NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(15,2) NOT NULL,
    "eclRate" DECIMAL(5,4) NOT NULL,
    "eclAmount" DECIMAL(15,2) NOT NULL,
    "previousEclAmount" DECIMAL(15,2),
    "adjustmentAmount" DECIMAL(15,2),
    "eclModel" TEXT NOT NULL DEFAULT '12_MONTH',
    "lossRateSource" TEXT,
    "provisionStatus" "ECLProvisionStatus" NOT NULL DEFAULT 'ACTIVE',
    "journalEntryId" TEXT,
    "writtenOffAt" TIMESTAMP(3),
    "writtenOffBy" TEXT,
    "writeOffReason" TEXT,
    "writeOffAmount" DECIMAL(15,2),
    "recoveredAt" TIMESTAMP(3),
    "recoveredAmount" DECIMAL(15,2),
    "recoveryJournalId" TEXT,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "allowance_for_doubtful_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "depreciation_schedules_assetId_idx" ON "depreciation_schedules"("assetId");

-- CreateIndex
CREATE INDEX "depreciation_schedules_isActive_idx" ON "depreciation_schedules"("isActive");

-- CreateIndex
CREATE INDEX "depreciation_schedules_startDate_idx" ON "depreciation_schedules"("startDate");

-- CreateIndex
CREATE INDEX "depreciation_schedules_endDate_idx" ON "depreciation_schedules"("endDate");

-- CreateIndex
CREATE INDEX "depreciation_schedules_isFulfilled_idx" ON "depreciation_schedules"("isFulfilled");

-- CreateIndex
CREATE INDEX "depreciation_entries_assetId_idx" ON "depreciation_entries"("assetId");

-- CreateIndex
CREATE INDEX "depreciation_entries_scheduleId_idx" ON "depreciation_entries"("scheduleId");

-- CreateIndex
CREATE INDEX "depreciation_entries_periodDate_idx" ON "depreciation_entries"("periodDate");

-- CreateIndex
CREATE INDEX "depreciation_entries_fiscalPeriodId_idx" ON "depreciation_entries"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "depreciation_entries_journalEntryId_idx" ON "depreciation_entries"("journalEntryId");

-- CreateIndex
CREATE INDEX "depreciation_entries_status_idx" ON "depreciation_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_assetId_periodDate_key" ON "depreciation_entries"("assetId", "periodDate");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_invoiceId_idx" ON "allowance_for_doubtful_accounts"("invoiceId");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_calculationDate_idx" ON "allowance_for_doubtful_accounts"("calculationDate");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_fiscalPeriodId_idx" ON "allowance_for_doubtful_accounts"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_agingBucket_idx" ON "allowance_for_doubtful_accounts"("agingBucket");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_provisionStatus_idx" ON "allowance_for_doubtful_accounts"("provisionStatus");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_journalEntryId_idx" ON "allowance_for_doubtful_accounts"("journalEntryId");

-- CreateIndex
CREATE INDEX "allowance_for_doubtful_accounts_daysPastDue_idx" ON "allowance_for_doubtful_accounts"("daysPastDue");

-- AddForeignKey
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "depreciation_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowance_for_doubtful_accounts" ADD CONSTRAINT "allowance_for_doubtful_accounts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowance_for_doubtful_accounts" ADD CONSTRAINT "allowance_for_doubtful_accounts_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowance_for_doubtful_accounts" ADD CONSTRAINT "allowance_for_doubtful_accounts_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
