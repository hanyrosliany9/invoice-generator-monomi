-- CreateTable
CREATE TABLE "cash_bank_balances" (
    "id" TEXT NOT NULL,
    "period" VARCHAR(100) NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "openingBalance" DECIMAL(15,2) NOT NULL,
    "closingBalance" DECIMAL(15,2) NOT NULL,
    "totalInflow" DECIMAL(15,2) NOT NULL,
    "totalOutflow" DECIMAL(15,2) NOT NULL,
    "netChange" DECIMAL(15,2) NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "calculatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "cash_bank_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_bank_balances_periodDate_idx" ON "cash_bank_balances"("periodDate");

-- CreateIndex
CREATE INDEX "cash_bank_balances_year_month_idx" ON "cash_bank_balances"("year", "month");

-- CreateIndex
CREATE INDEX "cash_bank_balances_createdAt_idx" ON "cash_bank_balances"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_bank_balances_year_month_key" ON "cash_bank_balances"("year", "month");
