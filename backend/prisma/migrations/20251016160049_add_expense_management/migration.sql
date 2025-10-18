-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpensePaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ExpenseApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RECALLED', 'PAYMENT_REQUESTED', 'PAYMENT_COMPLETED');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExpenseClass" AS ENUM ('SELLING', 'GENERAL_ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "PPNCategory" AS ENUM ('CREDITABLE', 'NON_CREDITABLE', 'EXEMPT', 'ZERO_RATED');

-- CreateEnum
CREATE TYPE "EFakturStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'UPLOADED', 'VALID', 'INVALID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WithholdingTaxType" AS ENUM ('PPH23', 'PPH4_2', 'PPH15', 'NONE');

-- CreateEnum
CREATE TYPE "ExpenseDocumentCategory" AS ENUM ('RECEIPT', 'SUPPORTING_DOC', 'CONTRACT', 'BUKTI_POTONG', 'OTHER');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "buktiPengeluaranNumber" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNameEn" TEXT,
    "expenseClass" "ExpenseClass" NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "descriptionEn" TEXT,
    "ppnRate" DECIMAL(5,4) NOT NULL DEFAULT 0.1200,
    "ppnAmount" DECIMAL(12,2) NOT NULL,
    "ppnCategory" "PPNCategory" NOT NULL DEFAULT 'CREDITABLE',
    "isLuxuryGoods" BOOLEAN NOT NULL DEFAULT false,
    "eFakturNSFP" TEXT,
    "eFakturQRCode" TEXT,
    "eFakturApprovalCode" TEXT,
    "eFakturStatus" "EFakturStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "eFakturValidatedAt" TIMESTAMP(3),
    "withholdingTaxType" "WithholdingTaxType",
    "withholdingTaxRate" DECIMAL(5,4),
    "withholdingTaxAmount" DECIMAL(12,2),
    "buktiPotongNumber" TEXT,
    "buktiPotongDate" TIMESTAMP(3),
    "vendorName" TEXT NOT NULL,
    "vendorNPWP" TEXT,
    "vendorAddress" TEXT,
    "vendorPhone" TEXT,
    "vendorBank" TEXT,
    "vendorAccountNo" TEXT,
    "vendorAccountName" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "withholdingAmount" DECIMAL(12,2),
    "netAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "categoryId" TEXT NOT NULL,
    "tags" TEXT[],
    "isTaxDeductible" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "billableAmount" DECIMAL(12,2),
    "invoiceId" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paymentStatus" "ExpensePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "paymentId" TEXT,
    "notes" TEXT,
    "notesId" TEXT,
    "notesEn" TEXT,
    "receiptNumber" TEXT,
    "merchantName" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "expenseClass" "ExpenseClass" NOT NULL,
    "name" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "description" TEXT,
    "descriptionId" TEXT,
    "parentId" TEXT,
    "defaultPPNRate" DECIMAL(5,4) NOT NULL DEFAULT 0.1200,
    "isLuxuryGoods" BOOLEAN NOT NULL DEFAULT false,
    "withholdingTaxType" "WithholdingTaxType" DEFAULT 'NONE',
    "withholdingTaxRate" DECIMAL(5,4),
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1890ff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "requiresReceipt" BOOLEAN NOT NULL DEFAULT true,
    "requiresEFaktur" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_approval_history" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "action" "ExpenseApprovalAction" NOT NULL,
    "actionBy" TEXT NOT NULL,
    "previousStatus" "ExpenseStatus" NOT NULL,
    "newStatus" "ExpenseStatus" NOT NULL,
    "comments" TEXT,
    "commentsId" TEXT,
    "commentsEn" TEXT,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_comments" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "commentId" TEXT,
    "commentEn" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_budgets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameId" TEXT,
    "description" TEXT,
    "descriptionId" TEXT,
    "categoryId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remaining" DECIMAL(12,2) NOT NULL,
    "alertThreshold" INTEGER NOT NULL DEFAULT 80,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "ExpenseDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "expenseId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON "expenses"("expenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_buktiPengeluaranNumber_key" ON "expenses"("buktiPengeluaranNumber");

-- CreateIndex
CREATE INDEX "expenses_expenseNumber_idx" ON "expenses"("expenseNumber");

-- CreateIndex
CREATE INDEX "expenses_buktiPengeluaranNumber_idx" ON "expenses"("buktiPengeluaranNumber");

-- CreateIndex
CREATE INDEX "expenses_accountCode_idx" ON "expenses"("accountCode");

-- CreateIndex
CREATE INDEX "expenses_expenseClass_idx" ON "expenses"("expenseClass");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "expenses_projectId_idx" ON "expenses"("projectId");

-- CreateIndex
CREATE INDEX "expenses_clientId_idx" ON "expenses"("clientId");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "expenses_eFakturNSFP_idx" ON "expenses"("eFakturNSFP");

-- CreateIndex
CREATE INDEX "expenses_ppnCategory_idx" ON "expenses"("ppnCategory");

-- CreateIndex
CREATE INDEX "expenses_status_userId_idx" ON "expenses"("status", "userId");

-- CreateIndex
CREATE INDEX "expenses_projectId_status_idx" ON "expenses"("projectId", "status");

-- CreateIndex
CREATE INDEX "expenses_paymentStatus_idx" ON "expenses"("paymentStatus");

-- CreateIndex
CREATE INDEX "expenses_createdAt_idx" ON "expenses"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code");

-- CreateIndex
CREATE INDEX "expense_categories_code_idx" ON "expense_categories"("code");

-- CreateIndex
CREATE INDEX "expense_categories_accountCode_idx" ON "expense_categories"("accountCode");

-- CreateIndex
CREATE INDEX "expense_categories_expenseClass_idx" ON "expense_categories"("expenseClass");

-- CreateIndex
CREATE INDEX "expense_categories_parentId_idx" ON "expense_categories"("parentId");

-- CreateIndex
CREATE INDEX "expense_categories_isActive_idx" ON "expense_categories"("isActive");

-- CreateIndex
CREATE INDEX "expense_approval_history_expenseId_idx" ON "expense_approval_history"("expenseId");

-- CreateIndex
CREATE INDEX "expense_approval_history_actionBy_idx" ON "expense_approval_history"("actionBy");

-- CreateIndex
CREATE INDEX "expense_approval_history_actionDate_idx" ON "expense_approval_history"("actionDate");

-- CreateIndex
CREATE INDEX "expense_comments_expenseId_idx" ON "expense_comments"("expenseId");

-- CreateIndex
CREATE INDEX "expense_comments_userId_idx" ON "expense_comments"("userId");

-- CreateIndex
CREATE INDEX "expense_comments_createdAt_idx" ON "expense_comments"("createdAt");

-- CreateIndex
CREATE INDEX "expense_budgets_categoryId_idx" ON "expense_budgets"("categoryId");

-- CreateIndex
CREATE INDEX "expense_budgets_projectId_idx" ON "expense_budgets"("projectId");

-- CreateIndex
CREATE INDEX "expense_budgets_userId_idx" ON "expense_budgets"("userId");

-- CreateIndex
CREATE INDEX "expense_budgets_startDate_endDate_idx" ON "expense_budgets"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "expense_budgets_isActive_idx" ON "expense_budgets"("isActive");

-- CreateIndex
CREATE INDEX "expense_documents_expenseId_idx" ON "expense_documents"("expenseId");

-- CreateIndex
CREATE INDEX "expense_documents_category_idx" ON "expense_documents"("category");

-- CreateIndex
CREATE INDEX "expense_documents_mimeType_idx" ON "expense_documents"("mimeType");

-- CreateIndex
CREATE INDEX "expense_documents_uploadedAt_idx" ON "expense_documents"("uploadedAt");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_approval_history" ADD CONSTRAINT "expense_approval_history_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_approval_history" ADD CONSTRAINT "expense_approval_history_actionBy_fkey" FOREIGN KEY ("actionBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_documents" ADD CONSTRAINT "expense_documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
