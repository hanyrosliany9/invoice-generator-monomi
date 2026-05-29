-- Cash & Bank balances become per-account (one running balance per cash/bank
-- account per period). Existing rows are derived period snapshots, rebuilt by
-- the "Recalculate" action — clear them so the new NOT NULL columns can be added.
DELETE FROM "cash_bank_balances";

-- DropIndex
DROP INDEX "cash_bank_balances_year_month_key";

-- AlterTable
ALTER TABLE "cash_bank_balances" ADD COLUMN     "accountCode" VARCHAR(20) NOT NULL,
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "accountName" VARCHAR(150) NOT NULL,
ADD COLUMN     "group" VARCHAR(10) NOT NULL;

-- CreateIndex
CREATE INDEX "cash_bank_balances_group_idx" ON "cash_bank_balances"("group");

-- CreateIndex
CREATE UNIQUE INDEX "cash_bank_balances_accountId_year_month_key" ON "cash_bank_balances"("accountId", "year", "month");

-- AddForeignKey
ALTER TABLE "cash_bank_balances" ADD CONSTRAINT "cash_bank_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
