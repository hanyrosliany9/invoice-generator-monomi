-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INVOICE_SENT', 'INVOICE_PAID', 'EXPENSE_SUBMITTED', 'EXPENSE_PAID', 'PAYMENT_RECEIVED', 'PAYMENT_MADE', 'DEPRECIATION', 'ADJUSTMENT', 'CLOSING', 'OPENING');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "StatementType" AS ENUM ('INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW', 'TRIAL_BALANCE', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "paymentJournalId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "journalEntryId" TEXT,
ADD COLUMN     "paymentJournalId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "journalEntryId" TEXT;

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "accountSubType" TEXT NOT NULL,
    "normalBalance" "BalanceType" NOT NULL,
    "parentId" TEXT,
    "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
    "isTaxAccount" BOOLEAN NOT NULL DEFAULT false,
    "taxType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "descriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "descriptionEn" TEXT,
    "transactionType" "TransactionType" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "fiscalPeriodId" TEXT,
    "isReversing" BOOLEAN NOT NULL DEFAULT false,
    "reversedEntryId" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_line_items" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "descriptionId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_ledger" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3) NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "journalEntryNumber" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "transactionType" "TransactionType" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "documentNumber" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "fiscalPeriodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_balances" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fiscalPeriodId" TEXT NOT NULL,
    "beginningBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "debitTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "endingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_statements" (
    "id" TEXT NOT NULL,
    "statementType" "StatementType" NOT NULL,
    "fiscalPeriodId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_code_idx" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_accountType_idx" ON "chart_of_accounts"("accountType");

-- CreateIndex
CREATE INDEX "chart_of_accounts_isActive_idx" ON "chart_of_accounts"("isActive");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parentId_idx" ON "chart_of_accounts"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON "journal_entries"("entryNumber");

-- CreateIndex
CREATE INDEX "journal_entries_entryNumber_idx" ON "journal_entries"("entryNumber");

-- CreateIndex
CREATE INDEX "journal_entries_entryDate_idx" ON "journal_entries"("entryDate");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");

-- CreateIndex
CREATE INDEX "journal_entries_transactionType_idx" ON "journal_entries"("transactionType");

-- CreateIndex
CREATE INDEX "journal_entries_transactionId_idx" ON "journal_entries"("transactionId");

-- CreateIndex
CREATE INDEX "journal_entries_fiscalPeriodId_idx" ON "journal_entries"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "journal_entries_isPosted_idx" ON "journal_entries"("isPosted");

-- CreateIndex
CREATE INDEX "journal_line_items_journalEntryId_idx" ON "journal_line_items"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_line_items_accountId_idx" ON "journal_line_items"("accountId");

-- CreateIndex
CREATE INDEX "journal_line_items_projectId_idx" ON "journal_line_items"("projectId");

-- CreateIndex
CREATE INDEX "journal_line_items_clientId_idx" ON "journal_line_items"("clientId");

-- CreateIndex
CREATE INDEX "general_ledger_accountId_idx" ON "general_ledger"("accountId");

-- CreateIndex
CREATE INDEX "general_ledger_entryDate_idx" ON "general_ledger"("entryDate");

-- CreateIndex
CREATE INDEX "general_ledger_postingDate_idx" ON "general_ledger"("postingDate");

-- CreateIndex
CREATE INDEX "general_ledger_journalEntryId_idx" ON "general_ledger"("journalEntryId");

-- CreateIndex
CREATE INDEX "general_ledger_transactionType_idx" ON "general_ledger"("transactionType");

-- CreateIndex
CREATE INDEX "general_ledger_fiscalPeriodId_idx" ON "general_ledger"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "general_ledger_projectId_idx" ON "general_ledger"("projectId");

-- CreateIndex
CREATE INDEX "general_ledger_clientId_idx" ON "general_ledger"("clientId");

-- CreateIndex
CREATE INDEX "account_balances_accountId_idx" ON "account_balances"("accountId");

-- CreateIndex
CREATE INDEX "account_balances_fiscalPeriodId_idx" ON "account_balances"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "account_balances_isClosed_idx" ON "account_balances"("isClosed");

-- CreateIndex
CREATE UNIQUE INDEX "account_balances_accountId_fiscalPeriodId_key" ON "account_balances"("accountId", "fiscalPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_code_key" ON "fiscal_periods"("code");

-- CreateIndex
CREATE INDEX "fiscal_periods_code_idx" ON "fiscal_periods"("code");

-- CreateIndex
CREATE INDEX "fiscal_periods_status_idx" ON "fiscal_periods"("status");

-- CreateIndex
CREATE INDEX "fiscal_periods_startDate_idx" ON "fiscal_periods"("startDate");

-- CreateIndex
CREATE INDEX "fiscal_periods_endDate_idx" ON "fiscal_periods"("endDate");

-- CreateIndex
CREATE INDEX "financial_statements_statementType_idx" ON "financial_statements"("statementType");

-- CreateIndex
CREATE INDEX "financial_statements_fiscalPeriodId_idx" ON "financial_statements"("fiscalPeriodId");

-- CreateIndex
CREATE INDEX "financial_statements_startDate_endDate_idx" ON "financial_statements"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversedEntryId_fkey" FOREIGN KEY ("reversedEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line_items" ADD CONSTRAINT "journal_line_items_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line_items" ADD CONSTRAINT "journal_line_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
