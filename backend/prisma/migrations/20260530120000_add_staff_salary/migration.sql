-- CreateEnum
CREATE TYPE "SalaryPaymentStatus" AS ENUM ('DRAFT', 'PAID');

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "joinedDate" TIMESTAMP(3),
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_payments" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL,
    "status" "SalaryPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateIndex
CREATE INDEX "staff_isActive_idx" ON "staff"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "salary_payments_staffId_year_month_key" ON "salary_payments"("staffId", "year", "month");

-- CreateIndex
CREATE INDEX "salary_payments_staffId_idx" ON "salary_payments"("staffId");

-- CreateIndex
CREATE INDEX "salary_payments_year_month_idx" ON "salary_payments"("year", "month");

-- CreateIndex
CREATE INDEX "salary_payments_status_idx" ON "salary_payments"("status");

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
