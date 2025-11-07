-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'PROJECT_MANAGER', 'STAFF', 'VIEWER', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'REVISED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FULL_PAYMENT', 'MILESTONE_BASED', 'ADVANCE_PAYMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('IDR', 'USD', 'USDT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BusinessJourneyEventType" AS ENUM ('CLIENT_CREATED', 'PROJECT_STARTED', 'QUOTATION_DRAFT', 'QUOTATION_SENT', 'QUOTATION_APPROVED', 'QUOTATION_DECLINED', 'QUOTATION_REVISED', 'INVOICE_GENERATED', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'MATERAI_REQUIRED', 'MATERAI_APPLIED');

-- CreateEnum
CREATE TYPE "BusinessJourneyEventStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REQUIRES_ATTENTION');

-- CreateEnum
CREATE TYPE "BusinessJourneyEventSource" AS ENUM ('SYSTEM', 'USER', 'API', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "BusinessJourneyPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('SUPPORTING_DOCUMENT', 'CONTRACT', 'RECEIPT', 'INVOICE_ATTACHMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'IN_MAINTENANCE', 'BROKEN', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BROKEN');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MaintenanceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpensePaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ExpenseApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RECALLED', 'PAYMENT_REQUESTED', 'PAYMENT_COMPLETED');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExpenseClass" AS ENUM ('SELLING', 'GENERAL_ADMIN', 'OTHER', 'LABOR_COST');

-- CreateEnum
CREATE TYPE "PPNCategory" AS ENUM ('CREDITABLE', 'NON_CREDITABLE', 'EXEMPT', 'ZERO_RATED');

-- CreateEnum
CREATE TYPE "EFakturStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'UPLOADED', 'VALID', 'INVALID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WithholdingTaxType" AS ENUM ('PPH23', 'PPH4_2', 'PPH15', 'NONE');

-- CreateEnum
CREATE TYPE "ExpenseDocumentCategory" AS ENUM ('RECEIPT', 'SUPPORTING_DOC', 'CONTRACT', 'BUKTI_POTONG', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INVOICE_SENT', 'INVOICE_PAID', 'EXPENSE_SUBMITTED', 'EXPENSE_PAID', 'PAYMENT_RECEIVED', 'PAYMENT_MADE', 'DEPRECIATION', 'ADJUSTMENT', 'CLOSING', 'OPENING', 'CASH_RECEIPT', 'CASH_DISBURSEMENT', 'BANK_TRANSFER', 'CAPITAL_CONTRIBUTION', 'OWNER_DRAWING', 'PO_APPROVED', 'PO_CANCELLED', 'GOODS_RECEIVED', 'VENDOR_INVOICE_APPROVED', 'VENDOR_PAYMENT_MADE', 'PURCHASE_RETURN', 'BANK_RECONCILIATION');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "StatementType" AS ENUM ('INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW', 'TRIAL_BALANCE', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('RECEIPT', 'DISBURSEMENT');

-- CreateEnum
CREATE TYPE "CashCategory" AS ENUM ('SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_INCOME', 'OPERATING_EXPENSE', 'ASSET_PURCHASE', 'LOAN_REPAYMENT', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "CashTransactionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED', 'VOID');

-- CreateEnum
CREATE TYPE "TransferMethod" AS ENUM ('INTERNAL', 'INTERBANK', 'RTGS', 'CLEARING', 'SKN', 'BIFAST', 'OTHER');

-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankRecStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEWED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BankRecItemType" AS ENUM ('DEPOSIT_IN_TRANSIT', 'OUTSTANDING_CHECK', 'BANK_CHARGE', 'BANK_INTEREST', 'NSF_CHECK', 'AUTOMATIC_PAYMENT', 'DIRECT_DEPOSIT', 'BANK_ERROR', 'BOOK_ERROR', 'OTHER_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BankRecItemStatus" AS ENUM ('PENDING', 'MATCHED', 'ADJUSTED', 'CLEARED', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS_DIGITS', 'UNITS_OF_PRODUCTION');

-- CreateEnum
CREATE TYPE "DepreciationStatus" AS ENUM ('CALCULATED', 'POSTED', 'REVERSED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "ECLProvisionStatus" AS ENUM ('ACTIVE', 'WRITTEN_OFF', 'RECOVERED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DeferredRevenueStatus" AS ENUM ('DEFERRED', 'PARTIALLY_RECOGNIZED', 'FULLY_RECOGNIZED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestonePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('PERCENTAGE', 'HOURS', 'DIRECT', 'SQUARE_METER', 'HEADCOUNT');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('MATERIAL', 'LABOR', 'OVERHEAD', 'SUBCONTRACTOR', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('SUPPLIER', 'SERVICE_PROVIDER', 'CONTRACTOR', 'CONSULTANT', 'UTILITY', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PKPStatus" AS ENUM ('PKP', 'NON_PKP', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "POItemType" AS ENUM ('GOODS', 'SERVICE', 'ASSET', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GRStatus" AS ENUM ('DRAFT', 'RECEIVED', 'INSPECTED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "VIStatus" AS ENUM ('DRAFT', 'PENDING_MATCH', 'MATCHED', 'APPROVED', 'POSTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchingStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'PARTIAL_MATCH', 'VARIANCE', 'FAILED');

-- CreateEnum
CREATE TYPE "APSourceType" AS ENUM ('VENDOR_INVOICE', 'EXPENSE', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "APPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "VendorPaymentStatus" AS ENUM ('DRAFT', 'PENDING', 'POSTED', 'CLEARED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('DIRECT', 'CREDIT', 'FROM_PO');

-- CreateEnum
CREATE TYPE "PurchaseSource" AS ENUM ('MANUAL', 'FROM_PO', 'FROM_VENDOR_INVOICE');

-- CreateEnum
CREATE TYPE "LaborType" AS ENUM ('REGULAR', 'OVERTIME', 'HOLIDAY', 'WEEKEND');

-- CreateEnum
CREATE TYPE "LaborEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'BILLED');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'RELIGIOUS', 'REGIONAL', 'SUBSTITUTE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "company" TEXT,
    "contactPerson" TEXT,
    "paymentTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scopeOfWork" TEXT,
    "output" TEXT NOT NULL,
    "projectTypeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "estimatedBudget" DECIMAL(12,2),
    "basePrice" DECIMAL(12,2),
    "priceBreakdown" JSONB,
    "estimatedExpenses" JSONB,
    "projectedGrossMargin" DECIMAL(5,2),
    "projectedNetMargin" DECIMAL(5,2),
    "projectedProfit" DECIMAL(15,2),
    "totalDirectCosts" DECIMAL(15,2) DEFAULT 0,
    "totalIndirectCosts" DECIMAL(15,2) DEFAULT 0,
    "totalAllocatedCosts" DECIMAL(15,2) DEFAULT 0,
    "totalInvoicedAmount" DECIMAL(15,2) DEFAULT 0,
    "totalPaidAmount" DECIMAL(15,2) DEFAULT 0,
    "grossProfit" DECIMAL(15,2),
    "netProfit" DECIMAL(15,2),
    "grossMarginPercent" DECIMAL(5,2),
    "netMarginPercent" DECIMAL(5,2),
    "budgetVariance" DECIMAL(15,2),
    "budgetVariancePercent" DECIMAL(5,2),
    "profitCalculatedAt" TIMESTAMP(3),
    "profitCalculatedBy" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amountPerProject" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "scopeOfWork" TEXT,
    "priceBreakdown" JSONB,
    "terms" TEXT,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'FULL_PAYMENT',
    "paymentTermsText" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "quotationId" TEXT,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amountPerProject" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "subtotalAmount" DECIMAL(15,2),
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(15,2),
    "includeTax" BOOLEAN NOT NULL DEFAULT false,
    "scopeOfWork" TEXT,
    "priceBreakdown" JSONB,
    "paymentInfo" TEXT NOT NULL,
    "materaiRequired" BOOLEAN NOT NULL DEFAULT false,
    "materaiApplied" BOOLEAN NOT NULL DEFAULT false,
    "materaiAppliedAt" TIMESTAMP(3),
    "materaiAppliedBy" TEXT,
    "materaiAmount" DECIMAL(12,2),
    "terms" TEXT,
    "signature" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "markedPaidBy" TEXT,
    "markedPaidAt" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "paymentJournalId" TEXT,
    "paymentMilestoneId" TEXT,
    "projectMilestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionRef" TEXT,
    "bankDetails" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_journey_events" (
    "id" TEXT NOT NULL,
    "type" "BusinessJourneyEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BusinessJourneyEventStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2),
    "clientId" TEXT,
    "projectId" TEXT,
    "quotationId" TEXT,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_journey_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_journey_event_metadata" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userCreated" TEXT NOT NULL,
    "userModified" TEXT,
    "source" "BusinessJourneyEventSource" NOT NULL DEFAULT 'SYSTEM',
    "priority" "BusinessJourneyPriority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "relatedDocuments" TEXT[],
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "materaiRequired" BOOLEAN NOT NULL DEFAULT false,
    "materaiAmount" DECIMAL(12,2),
    "complianceStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_journey_event_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ux_metrics" (
    "id" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "clientId" TEXT,
    "url" TEXT,
    "userAgent" TEXT,
    "performanceData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ux_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_type_configs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prefix" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1890ff',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "language" TEXT NOT NULL DEFAULT 'id-ID',
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'PT Teknologi Indonesia',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "taxNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "bankBCA" TEXT,
    "bankMandiri" TEXT,
    "bankBNI" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultPaymentTerms" TEXT NOT NULL DEFAULT 'NET 30',
    "materaiThreshold" INTEGER NOT NULL DEFAULT 5000000,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "quotationPrefix" TEXT NOT NULL DEFAULT 'QT-',
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "backupTime" TEXT NOT NULL DEFAULT '02:00',
    "autoMateraiReminder" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "globalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "targetUsers" TEXT[],
    "targetGroups" TEXT[],
    "rules" JSONB,
    "expiresAt" TIMESTAMP(3),
    "disabledReason" TEXT,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_events" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "invoiceId" TEXT,
    "quotationId" TEXT,
    "projectId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "specifications" JSONB,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DECIMAL(15,2) NOT NULL,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "warrantyExpiration" TIMESTAMP(3),
    "currentValue" DECIMAL(15,2),
    "notesFinancial" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "photos" TEXT[],
    "documents" TEXT[],
    "qrCode" TEXT,
    "rfidTag" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "vendorId" TEXT,
    "purchaseOrderId" TEXT,
    "goodsReceiptId" TEXT,
    "vendorInvoiceId" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_reservations" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "frequency" "MaintenanceFrequency" NOT NULL,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "performedDate" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT,
    "cost" DECIMAL(15,2),
    "description" TEXT NOT NULL,
    "partsReplaced" JSONB,
    "nextMaintenanceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_kits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_kit_items" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "asset_kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_equipment_usage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "assetId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "condition" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_equipment_usage_pkey" PRIMARY KEY ("id")
);

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
    "journalEntryId" TEXT,
    "paymentJournalId" TEXT,
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
    "purchaseType" "PurchaseType" NOT NULL DEFAULT 'DIRECT',
    "purchaseSource" "PurchaseSource" NOT NULL DEFAULT 'MANUAL',
    "vendorId" TEXT,
    "purchaseOrderId" TEXT,
    "vendorInvoiceId" TEXT,
    "accountsPayableId" TEXT,
    "dueDate" TIMESTAMP(3),

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
    "currency" "Currency" NOT NULL DEFAULT 'IDR',
    "isCurrencyAccount" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" "Currency" NOT NULL,
    "toCurrency" "Currency" NOT NULL DEFAULT 'IDR',
    "rate" DECIMAL(18,8) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "source" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "transactionType" "CashTransactionType" NOT NULL,
    "category" "CashCategory" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IDR',
    "originalAmount" DECIMAL(18,2),
    "exchangeRate" DECIMAL(18,8),
    "idrAmount" DECIMAL(15,2) NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "offsetAccountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "descriptionEn" TEXT,
    "reference" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "checkNumber" TEXT,
    "bankReference" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "journalEntryId" TEXT,
    "status" "CashTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "notes" TEXT,
    "notesId" TEXT,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transfers" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'IDR',
    "originalAmount" DECIMAL(18,2),
    "exchangeRate" DECIMAL(18,8),
    "idrAmount" DECIMAL(15,2) NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "descriptionEn" TEXT,
    "reference" TEXT,
    "transferFee" DECIMAL(12,2),
    "feeAccountId" TEXT,
    "feePaymentMethod" TEXT,
    "transferMethod" "TransferMethod" NOT NULL DEFAULT 'INTERNAL',
    "bankReference" TEXT,
    "confirmationCode" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "journalEntryId" TEXT,
    "status" "BankTransferStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "notes" TEXT,
    "notesId" TEXT,

    CONSTRAINT "bank_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "reconciliationNumber" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "bookBalanceStart" DECIMAL(15,2) NOT NULL,
    "bookBalanceEnd" DECIMAL(15,2) NOT NULL,
    "statementBalance" DECIMAL(15,2) NOT NULL,
    "depositsInTransit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstandingChecks" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bankCharges" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bankInterest" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "otherAdjustments" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "adjustedBookBalance" DECIMAL(15,2) NOT NULL,
    "adjustedBankBalance" DECIMAL(15,2) NOT NULL,
    "difference" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isBalanced" BOOLEAN NOT NULL DEFAULT false,
    "statementReference" TEXT,
    "statementFilePath" TEXT,
    "status" "BankRecStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "adjustmentJournalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "notes" TEXT,
    "notesId" TEXT,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliation_items" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "itemDate" TIMESTAMP(3) NOT NULL,
    "itemType" "BankRecItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "matchedTransactionId" TEXT,
    "matchedAt" TIMESTAMP(3),
    "matchedBy" TEXT,
    "status" "BankRecItemStatus" NOT NULL DEFAULT 'PENDING',
    "requiresAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentJournalId" TEXT,
    "adjustedAt" TIMESTAMP(3),
    "checkNumber" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "bank_reconciliation_items_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "payment_milestones" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "milestoneNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameId" TEXT,
    "description" TEXT,
    "descriptionId" TEXT,
    "paymentPercentage" DECIMAL(5,2) NOT NULL,
    "paymentAmount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "dueDaysFromPrev" INTEGER,
    "deliverables" JSONB,
    "isInvoiced" BOOLEAN NOT NULL DEFAULT false,
    "projectMilestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_milestones_pkey" PRIMARY KEY ("id")
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
    "priority" "MilestonePriority" NOT NULL DEFAULT 'MEDIUM',
    "predecessorId" TEXT,
    "delayDays" INTEGER DEFAULT 0,
    "delayReason" TEXT,
    "materaiRequired" BOOLEAN NOT NULL DEFAULT false,
    "taxTreatment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameId" TEXT,
    "vendorType" "VendorType" NOT NULL,
    "industryType" TEXT,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Indonesia',
    "npwp" TEXT,
    "pkpStatus" "PKPStatus" NOT NULL DEFAULT 'NON_PKP',
    "taxAddress" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "bankBranch" TEXT,
    "swiftCode" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'NET 30',
    "creditLimit" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPKP" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorId" TEXT NOT NULL,
    "projectId" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ppnAmount" DECIMAL(15,2) NOT NULL,
    "pphAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "isPPNIncluded" BOOLEAN NOT NULL DEFAULT true,
    "ppnRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "withholdingTaxType" "WithholdingTaxType" NOT NULL DEFAULT 'NONE',
    "withholdingTaxRate" DECIMAL(5,2),
    "deliveryAddress" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "paymentTerms" TEXT NOT NULL DEFAULT 'NET 30',
    "dueDate" TIMESTAMP(3),
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "totalReceived" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalInvoiced" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closureReason" TEXT,
    "description" TEXT,
    "descriptionId" TEXT,
    "notes" TEXT,
    "termsConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemType" "POItemType" NOT NULL,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "ppnAmount" DECIMAL(15,2) NOT NULL,
    "quantityReceived" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantityInvoiced" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "quantityOutstanding" DECIMAL(15,3) NOT NULL,
    "assetId" TEXT,
    "expenseCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "grNumber" TEXT NOT NULL,
    "grDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "deliveryNoteNumber" TEXT,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseLocation" TEXT,
    "inspectionStatus" "InspectionStatus" NOT NULL DEFAULT 'PENDING',
    "inspectedBy" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "inspectionNotes" TEXT,
    "status" "GRStatus" NOT NULL DEFAULT 'DRAFT',
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "grId" TEXT NOT NULL,
    "poItemId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "orderedQuantity" DECIMAL(15,3) NOT NULL,
    "receivedQuantity" DECIMAL(15,3) NOT NULL,
    "acceptedQuantity" DECIMAL(15,3) NOT NULL,
    "rejectedQuantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "qualityStatus" "QualityStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_invoices" (
    "id" TEXT NOT NULL,
    "vendorInvoiceNumber" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poId" TEXT,
    "grId" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ppnAmount" DECIMAL(15,2) NOT NULL,
    "pphAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "eFakturNSFP" TEXT,
    "eFakturQRCode" TEXT,
    "eFakturStatus" "EFakturStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "eFakturUploadDate" TIMESTAMP(3),
    "paymentTerms" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "matchingStatus" "MatchingStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedBy" TEXT,
    "matchedAt" TIMESTAMP(3),
    "matchingNotes" TEXT,
    "priceVariance" DECIMAL(15,2),
    "quantityVariance" DECIMAL(15,3),
    "withinTolerance" BOOLEAN NOT NULL DEFAULT false,
    "status" "VIStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "accountsPayableId" TEXT,
    "journalEntryId" TEXT,
    "description" TEXT,
    "descriptionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_invoice_items" (
    "id" TEXT NOT NULL,
    "viId" TEXT NOT NULL,
    "poItemId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionId" TEXT,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "ppnAmount" DECIMAL(15,2) NOT NULL,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "varianceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "apNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "sourceType" "APSourceType" NOT NULL,
    "vendorInvoiceId" TEXT,
    "expenseId" TEXT,
    "originalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(15,2) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "APPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "daysOutstanding" INTEGER,
    "agingBucket" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "bankAccountId" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "status" "VendorPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "clearedAt" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "apId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleId" TEXT,
    "allocationPercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "hourlyRate" DECIMAL(12,2) NOT NULL,
    "hourlyRateCurrency" TEXT NOT NULL DEFAULT 'IDR',
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "notesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_entries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "laborType" "LaborType" NOT NULL DEFAULT 'REGULAR',
    "laborTypeRate" DECIMAL(3,2) NOT NULL,
    "hourlyRate" DECIMAL(12,2) NOT NULL,
    "laborCost" DECIMAL(15,2) NOT NULL,
    "costType" "CostType" NOT NULL DEFAULT 'LABOR',
    "isDirect" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "descriptionId" TEXT,
    "taskPerformed" TEXT,
    "status" "LaborEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "expenseId" TEXT,
    "journalEntryId" TEXT,
    "costAllocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "labor_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indonesian_holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameIndonesian" TEXT NOT NULL,
    "description" TEXT,
    "type" "HolidayType" NOT NULL DEFAULT 'NATIONAL',
    "region" TEXT,
    "isLunarBased" BOOLEAN NOT NULL DEFAULT false,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indonesian_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_counters" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_counters" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_createdAt_idx" ON "clients"("createdAt");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "clients_status_createdAt_idx" ON "clients"("status", "createdAt");

-- CreateIndex
CREATE INDEX "clients_name_status_idx" ON "clients"("name", "status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_number_key" ON "projects"("number");

-- CreateIndex
CREATE INDEX "projects_number_idx" ON "projects"("number");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_projectTypeId_idx" ON "projects"("projectTypeId");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- CreateIndex
CREATE INDEX "projects_clientId_status_idx" ON "projects"("clientId", "status");

-- CreateIndex
CREATE INDEX "projects_projectTypeId_status_idx" ON "projects"("projectTypeId", "status");

-- CreateIndex
CREATE INDEX "projects_status_createdAt_idx" ON "projects"("status", "createdAt");

-- CreateIndex
CREATE INDEX "projects_grossMarginPercent_idx" ON "projects"("grossMarginPercent");

-- CreateIndex
CREATE INDEX "projects_netMarginPercent_idx" ON "projects"("netMarginPercent");

-- CreateIndex
CREATE INDEX "projects_totalAllocatedCosts_idx" ON "projects"("totalAllocatedCosts");

-- CreateIndex
CREATE INDEX "projects_profitCalculatedAt_idx" ON "projects"("profitCalculatedAt");

-- CreateIndex
CREATE INDEX "projects_projectedNetMargin_idx" ON "projects"("projectedNetMargin");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON "quotations"("quotationNumber");

-- CreateIndex
CREATE INDEX "quotations_quotationNumber_idx" ON "quotations"("quotationNumber");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_clientId_idx" ON "quotations"("clientId");

-- CreateIndex
CREATE INDEX "quotations_projectId_idx" ON "quotations"("projectId");

-- CreateIndex
CREATE INDEX "quotations_createdAt_idx" ON "quotations"("createdAt");

-- CreateIndex
CREATE INDEX "quotations_validUntil_idx" ON "quotations"("validUntil");

-- CreateIndex
CREATE INDEX "quotations_clientId_status_idx" ON "quotations"("clientId", "status");

-- CreateIndex
CREATE INDEX "quotations_status_validUntil_idx" ON "quotations"("status", "validUntil");

-- CreateIndex
CREATE INDEX "quotations_projectId_status_idx" ON "quotations"("projectId", "status");

-- CreateIndex
CREATE INDEX "quotations_createdAt_status_idx" ON "quotations"("createdAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_clientId_idx" ON "invoices"("clientId");

-- CreateIndex
CREATE INDEX "invoices_projectId_idx" ON "invoices"("projectId");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE INDEX "invoices_materaiRequired_idx" ON "invoices"("materaiRequired");

-- CreateIndex
CREATE INDEX "invoices_quotationId_idx" ON "invoices"("quotationId");

-- CreateIndex
CREATE INDEX "invoices_paymentMilestoneId_idx" ON "invoices"("paymentMilestoneId");

-- CreateIndex
CREATE INDEX "invoices_projectMilestoneId_idx" ON "invoices"("projectMilestoneId");

-- CreateIndex
CREATE INDEX "invoices_clientId_status_idx" ON "invoices"("clientId", "status");

-- CreateIndex
CREATE INDEX "invoices_clientId_projectId_status_idx" ON "invoices"("clientId", "projectId", "status");

-- CreateIndex
CREATE INDEX "invoices_quotationId_status_idx" ON "invoices"("quotationId", "status");

-- CreateIndex
CREATE INDEX "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate");

-- CreateIndex
CREATE INDEX "invoices_status_createdAt_idx" ON "invoices"("status", "createdAt");

-- CreateIndex
CREATE INDEX "invoices_materaiRequired_totalAmount_idx" ON "invoices"("materaiRequired", "totalAmount");

-- CreateIndex
CREATE INDEX "invoices_materaiRequired_materaiApplied_status_idx" ON "invoices"("materaiRequired", "materaiApplied", "status");

-- CreateIndex
CREATE INDEX "invoices_createdAt_status_idx" ON "invoices"("createdAt", "status");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE INDEX "payments_status_paymentDate_idx" ON "payments"("status", "paymentDate");

-- CreateIndex
CREATE INDEX "payments_invoiceId_status_idx" ON "payments"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "business_journey_events_type_idx" ON "business_journey_events"("type");

-- CreateIndex
CREATE INDEX "business_journey_events_status_idx" ON "business_journey_events"("status");

-- CreateIndex
CREATE INDEX "business_journey_events_clientId_idx" ON "business_journey_events"("clientId");

-- CreateIndex
CREATE INDEX "business_journey_events_projectId_idx" ON "business_journey_events"("projectId");

-- CreateIndex
CREATE INDEX "business_journey_events_quotationId_idx" ON "business_journey_events"("quotationId");

-- CreateIndex
CREATE INDEX "business_journey_events_invoiceId_idx" ON "business_journey_events"("invoiceId");

-- CreateIndex
CREATE INDEX "business_journey_events_createdAt_idx" ON "business_journey_events"("createdAt");

-- CreateIndex
CREATE INDEX "business_journey_events_amount_idx" ON "business_journey_events"("amount");

-- CreateIndex
CREATE INDEX "business_journey_events_clientId_type_createdAt_idx" ON "business_journey_events"("clientId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "business_journey_events_clientId_status_createdAt_idx" ON "business_journey_events"("clientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "business_journey_events_type_status_idx" ON "business_journey_events"("type", "status");

-- CreateIndex
CREATE INDEX "business_journey_events_status_createdAt_idx" ON "business_journey_events"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_journey_event_metadata_eventId_key" ON "business_journey_event_metadata"("eventId");

-- CreateIndex
CREATE INDEX "business_journey_event_metadata_source_idx" ON "business_journey_event_metadata"("source");

-- CreateIndex
CREATE INDEX "business_journey_event_metadata_priority_idx" ON "business_journey_event_metadata"("priority");

-- CreateIndex
CREATE INDEX "business_journey_event_metadata_materaiRequired_idx" ON "business_journey_event_metadata"("materaiRequired");

-- CreateIndex
CREATE INDEX "ux_metrics_componentName_idx" ON "ux_metrics"("componentName");

-- CreateIndex
CREATE INDEX "ux_metrics_eventType_idx" ON "ux_metrics"("eventType");

-- CreateIndex
CREATE INDEX "ux_metrics_metricName_idx" ON "ux_metrics"("metricName");

-- CreateIndex
CREATE INDEX "ux_metrics_userId_idx" ON "ux_metrics"("userId");

-- CreateIndex
CREATE INDEX "ux_metrics_createdAt_idx" ON "ux_metrics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_type_configs_code_key" ON "project_type_configs"("code");

-- CreateIndex
CREATE INDEX "project_type_configs_code_idx" ON "project_type_configs"("code");

-- CreateIndex
CREATE INDEX "project_type_configs_isActive_idx" ON "project_type_configs"("isActive");

-- CreateIndex
CREATE INDEX "project_type_configs_sortOrder_idx" ON "project_type_configs"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- CreateIndex
CREATE INDEX "feature_flag_events_flagId_idx" ON "feature_flag_events"("flagId");

-- CreateIndex
CREATE INDEX "feature_flag_events_userId_idx" ON "feature_flag_events"("userId");

-- CreateIndex
CREATE INDEX "feature_flag_events_eventType_idx" ON "feature_flag_events"("eventType");

-- CreateIndex
CREATE INDEX "documents_invoiceId_idx" ON "documents"("invoiceId");

-- CreateIndex
CREATE INDEX "documents_quotationId_idx" ON "documents"("quotationId");

-- CreateIndex
CREATE INDEX "documents_projectId_idx" ON "documents"("projectId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_mimeType_idx" ON "documents"("mimeType");

-- CreateIndex
CREATE INDEX "documents_uploadedAt_idx" ON "documents"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetCode_key" ON "assets"("assetCode");

-- CreateIndex
CREATE INDEX "assets_assetCode_idx" ON "assets"("assetCode");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_condition_idx" ON "assets"("condition");

-- CreateIndex
CREATE INDEX "assets_createdById_idx" ON "assets"("createdById");

-- CreateIndex
CREATE INDEX "assets_createdAt_idx" ON "assets"("createdAt");

-- CreateIndex
CREATE INDEX "assets_category_status_idx" ON "assets"("category", "status");

-- CreateIndex
CREATE INDEX "assets_status_condition_idx" ON "assets"("status", "condition");

-- CreateIndex
CREATE INDEX "asset_reservations_assetId_idx" ON "asset_reservations"("assetId");

-- CreateIndex
CREATE INDEX "asset_reservations_userId_idx" ON "asset_reservations"("userId");

-- CreateIndex
CREATE INDEX "asset_reservations_projectId_idx" ON "asset_reservations"("projectId");

-- CreateIndex
CREATE INDEX "asset_reservations_status_idx" ON "asset_reservations"("status");

-- CreateIndex
CREATE INDEX "asset_reservations_startDate_idx" ON "asset_reservations"("startDate");

-- CreateIndex
CREATE INDEX "asset_reservations_endDate_idx" ON "asset_reservations"("endDate");

-- CreateIndex
CREATE INDEX "asset_reservations_assetId_startDate_endDate_idx" ON "asset_reservations"("assetId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "asset_reservations_assetId_status_idx" ON "asset_reservations"("assetId", "status");

-- CreateIndex
CREATE INDEX "maintenance_schedules_assetId_idx" ON "maintenance_schedules"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_schedules_nextMaintenanceDate_idx" ON "maintenance_schedules"("nextMaintenanceDate");

-- CreateIndex
CREATE INDEX "maintenance_schedules_isActive_idx" ON "maintenance_schedules"("isActive");

-- CreateIndex
CREATE INDEX "maintenance_schedules_isActive_nextMaintenanceDate_idx" ON "maintenance_schedules"("isActive", "nextMaintenanceDate");

-- CreateIndex
CREATE INDEX "maintenance_records_assetId_idx" ON "maintenance_records"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_records_performedDate_idx" ON "maintenance_records"("performedDate");

-- CreateIndex
CREATE INDEX "maintenance_records_maintenanceType_idx" ON "maintenance_records"("maintenanceType");

-- CreateIndex
CREATE INDEX "asset_kits_isActive_idx" ON "asset_kits"("isActive");

-- CreateIndex
CREATE INDEX "asset_kit_items_kitId_idx" ON "asset_kit_items"("kitId");

-- CreateIndex
CREATE INDEX "asset_kit_items_assetId_idx" ON "asset_kit_items"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_kit_items_kitId_assetId_key" ON "asset_kit_items"("kitId", "assetId");

-- CreateIndex
CREATE INDEX "project_equipment_usage_projectId_idx" ON "project_equipment_usage"("projectId");

-- CreateIndex
CREATE INDEX "project_equipment_usage_assetId_idx" ON "project_equipment_usage"("assetId");

-- CreateIndex
CREATE INDEX "project_equipment_usage_startDate_idx" ON "project_equipment_usage"("startDate");

-- CreateIndex
CREATE INDEX "project_equipment_usage_returnDate_idx" ON "project_equipment_usage"("returnDate");

-- CreateIndex
CREATE INDEX "project_equipment_usage_assetId_startDate_idx" ON "project_equipment_usage"("assetId", "startDate");

-- CreateIndex
CREATE INDEX "project_equipment_usage_projectId_assetId_idx" ON "project_equipment_usage"("projectId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON "expenses"("expenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_buktiPengeluaranNumber_key" ON "expenses"("buktiPengeluaranNumber");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_accountsPayableId_key" ON "expenses"("accountsPayableId");

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
CREATE INDEX "expenses_vendorId_idx" ON "expenses"("vendorId");

-- CreateIndex
CREATE INDEX "expenses_vendorId_status_idx" ON "expenses"("vendorId", "status");

-- CreateIndex
CREATE INDEX "expenses_projectId_categoryId_idx" ON "expenses"("projectId", "categoryId");

-- CreateIndex
CREATE INDEX "expenses_status_expenseDate_idx" ON "expenses"("status", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_purchaseOrderId_idx" ON "expenses"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "expenses_vendorInvoiceId_idx" ON "expenses"("vendorInvoiceId");

-- CreateIndex
CREATE INDEX "expenses_purchaseType_idx" ON "expenses"("purchaseType");

-- CreateIndex
CREATE INDEX "expenses_purchaseSource_idx" ON "expenses"("purchaseSource");

-- CreateIndex
CREATE INDEX "expenses_dueDate_idx" ON "expenses"("dueDate");

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
CREATE INDEX "general_ledger_accountId_postingDate_idx" ON "general_ledger"("accountId", "postingDate");

-- CreateIndex
CREATE INDEX "general_ledger_accountId_fiscalPeriodId_idx" ON "general_ledger"("accountId", "fiscalPeriodId");

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

-- CreateIndex
CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON "exchange_rates"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "exchange_rates_effectiveDate_idx" ON "exchange_rates"("effectiveDate");

-- CreateIndex
CREATE INDEX "exchange_rates_isActive_idx" ON "exchange_rates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_effectiveDate_key" ON "exchange_rates"("fromCurrency", "toCurrency", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_transactionNumber_key" ON "cash_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "cash_transactions_transactionNumber_idx" ON "cash_transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "cash_transactions_transactionType_idx" ON "cash_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "cash_transactions_category_idx" ON "cash_transactions"("category");

-- CreateIndex
CREATE INDEX "cash_transactions_transactionDate_idx" ON "cash_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "cash_transactions_status_idx" ON "cash_transactions"("status");

-- CreateIndex
CREATE INDEX "cash_transactions_cashAccountId_idx" ON "cash_transactions"("cashAccountId");

-- CreateIndex
CREATE INDEX "cash_transactions_offsetAccountId_idx" ON "cash_transactions"("offsetAccountId");

-- CreateIndex
CREATE INDEX "cash_transactions_projectId_idx" ON "cash_transactions"("projectId");

-- CreateIndex
CREATE INDEX "cash_transactions_clientId_idx" ON "cash_transactions"("clientId");

-- CreateIndex
CREATE INDEX "cash_transactions_createdBy_idx" ON "cash_transactions"("createdBy");

-- CreateIndex
CREATE INDEX "cash_transactions_createdAt_idx" ON "cash_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfers_transferNumber_key" ON "bank_transfers"("transferNumber");

-- CreateIndex
CREATE INDEX "bank_transfers_transferNumber_idx" ON "bank_transfers"("transferNumber");

-- CreateIndex
CREATE INDEX "bank_transfers_transferDate_idx" ON "bank_transfers"("transferDate");

-- CreateIndex
CREATE INDEX "bank_transfers_status_idx" ON "bank_transfers"("status");

-- CreateIndex
CREATE INDEX "bank_transfers_fromAccountId_idx" ON "bank_transfers"("fromAccountId");

-- CreateIndex
CREATE INDEX "bank_transfers_toAccountId_idx" ON "bank_transfers"("toAccountId");

-- CreateIndex
CREATE INDEX "bank_transfers_projectId_idx" ON "bank_transfers"("projectId");

-- CreateIndex
CREATE INDEX "bank_transfers_clientId_idx" ON "bank_transfers"("clientId");

-- CreateIndex
CREATE INDEX "bank_transfers_createdBy_idx" ON "bank_transfers"("createdBy");

-- CreateIndex
CREATE INDEX "bank_transfers_createdAt_idx" ON "bank_transfers"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliations_reconciliationNumber_key" ON "bank_reconciliations"("reconciliationNumber");

-- CreateIndex
CREATE INDEX "bank_reconciliations_reconciliationNumber_idx" ON "bank_reconciliations"("reconciliationNumber");

-- CreateIndex
CREATE INDEX "bank_reconciliations_bankAccountId_idx" ON "bank_reconciliations"("bankAccountId");

-- CreateIndex
CREATE INDEX "bank_reconciliations_statementDate_idx" ON "bank_reconciliations"("statementDate");

-- CreateIndex
CREATE INDEX "bank_reconciliations_status_idx" ON "bank_reconciliations"("status");

-- CreateIndex
CREATE INDEX "bank_reconciliations_isBalanced_idx" ON "bank_reconciliations"("isBalanced");

-- CreateIndex
CREATE INDEX "bank_reconciliations_periodStartDate_periodEndDate_idx" ON "bank_reconciliations"("periodStartDate", "periodEndDate");

-- CreateIndex
CREATE INDEX "bank_reconciliations_createdBy_idx" ON "bank_reconciliations"("createdBy");

-- CreateIndex
CREATE INDEX "bank_reconciliations_createdAt_idx" ON "bank_reconciliations"("createdAt");

-- CreateIndex
CREATE INDEX "bank_reconciliation_items_reconciliationId_idx" ON "bank_reconciliation_items"("reconciliationId");

-- CreateIndex
CREATE INDEX "bank_reconciliation_items_itemType_idx" ON "bank_reconciliation_items"("itemType");

-- CreateIndex
CREATE INDEX "bank_reconciliation_items_isMatched_idx" ON "bank_reconciliation_items"("isMatched");

-- CreateIndex
CREATE INDEX "bank_reconciliation_items_status_idx" ON "bank_reconciliation_items"("status");

-- CreateIndex
CREATE INDEX "bank_reconciliation_items_itemDate_idx" ON "bank_reconciliation_items"("itemDate");

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
CREATE INDEX "payment_milestones_quotationId_idx" ON "payment_milestones"("quotationId");

-- CreateIndex
CREATE INDEX "payment_milestones_projectMilestoneId_idx" ON "payment_milestones"("projectMilestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_milestones_quotationId_milestoneNumber_key" ON "payment_milestones"("quotationId", "milestoneNumber");

-- CreateIndex
CREATE INDEX "project_milestones_projectId_idx" ON "project_milestones"("projectId");

-- CreateIndex
CREATE INDEX "project_milestones_status_idx" ON "project_milestones"("status");

-- CreateIndex
CREATE INDEX "project_milestones_completionPercentage_idx" ON "project_milestones"("completionPercentage");

-- CreateIndex
CREATE INDEX "project_milestones_milestoneNumber_idx" ON "project_milestones"("milestoneNumber");

-- CreateIndex
CREATE INDEX "project_milestones_projectId_plannedStartDate_idx" ON "project_milestones"("projectId", "plannedStartDate");

-- CreateIndex
CREATE INDEX "project_milestones_status_plannedEndDate_idx" ON "project_milestones"("status", "plannedEndDate");

-- CreateIndex
CREATE INDEX "project_milestones_priority_idx" ON "project_milestones"("priority");

-- CreateIndex
CREATE INDEX "project_milestones_predecessorId_idx" ON "project_milestones"("predecessorId");

-- CreateIndex
CREATE UNIQUE INDEX "project_milestones_projectId_milestoneNumber_key" ON "project_milestones"("projectId", "milestoneNumber");

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

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendorCode_key" ON "vendors"("vendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_npwp_key" ON "vendors"("npwp");

-- CreateIndex
CREATE INDEX "vendors_vendorCode_idx" ON "vendors"("vendorCode");

-- CreateIndex
CREATE INDEX "vendors_npwp_idx" ON "vendors"("npwp");

-- CreateIndex
CREATE INDEX "vendors_isActive_idx" ON "vendors"("isActive");

-- CreateIndex
CREATE INDEX "vendors_vendorType_idx" ON "vendors"("vendorType");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_poNumber_idx" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_vendorId_idx" ON "purchase_orders"("vendorId");

-- CreateIndex
CREATE INDEX "purchase_orders_projectId_idx" ON "purchase_orders"("projectId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_poDate_idx" ON "purchase_orders"("poDate");

-- CreateIndex
CREATE INDEX "purchase_orders_approvalStatus_idx" ON "purchase_orders"("approvalStatus");

-- CreateIndex
CREATE INDEX "purchase_orders_requestedBy_idx" ON "purchase_orders"("requestedBy");

-- CreateIndex
CREATE INDEX "purchase_order_items_poId_idx" ON "purchase_order_items"("poId");

-- CreateIndex
CREATE INDEX "purchase_order_items_assetId_idx" ON "purchase_order_items"("assetId");

-- CreateIndex
CREATE INDEX "purchase_order_items_expenseCategoryId_idx" ON "purchase_order_items"("expenseCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_grNumber_key" ON "goods_receipts"("grNumber");

-- CreateIndex
CREATE INDEX "goods_receipts_grNumber_idx" ON "goods_receipts"("grNumber");

-- CreateIndex
CREATE INDEX "goods_receipts_poId_idx" ON "goods_receipts"("poId");

-- CreateIndex
CREATE INDEX "goods_receipts_vendorId_idx" ON "goods_receipts"("vendorId");

-- CreateIndex
CREATE INDEX "goods_receipts_grDate_idx" ON "goods_receipts"("grDate");

-- CreateIndex
CREATE INDEX "goods_receipts_status_idx" ON "goods_receipts"("status");

-- CreateIndex
CREATE INDEX "goods_receipt_items_grId_idx" ON "goods_receipt_items"("grId");

-- CreateIndex
CREATE INDEX "goods_receipt_items_poItemId_idx" ON "goods_receipt_items"("poItemId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_internalNumber_key" ON "vendor_invoices"("internalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_eFakturNSFP_key" ON "vendor_invoices"("eFakturNSFP");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_accountsPayableId_key" ON "vendor_invoices"("accountsPayableId");

-- CreateIndex
CREATE INDEX "vendor_invoices_vendorId_idx" ON "vendor_invoices"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_invoices_poId_idx" ON "vendor_invoices"("poId");

-- CreateIndex
CREATE INDEX "vendor_invoices_grId_idx" ON "vendor_invoices"("grId");

-- CreateIndex
CREATE INDEX "vendor_invoices_internalNumber_idx" ON "vendor_invoices"("internalNumber");

-- CreateIndex
CREATE INDEX "vendor_invoices_eFakturNSFP_idx" ON "vendor_invoices"("eFakturNSFP");

-- CreateIndex
CREATE INDEX "vendor_invoices_status_idx" ON "vendor_invoices"("status");

-- CreateIndex
CREATE INDEX "vendor_invoices_matchingStatus_idx" ON "vendor_invoices"("matchingStatus");

-- CreateIndex
CREATE INDEX "vendor_invoices_invoiceDate_idx" ON "vendor_invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "vendor_invoices_dueDate_idx" ON "vendor_invoices"("dueDate");

-- CreateIndex
CREATE INDEX "vendor_invoice_items_viId_idx" ON "vendor_invoice_items"("viId");

-- CreateIndex
CREATE INDEX "vendor_invoice_items_poItemId_idx" ON "vendor_invoice_items"("poItemId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_apNumber_key" ON "accounts_payable"("apNumber");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_vendorInvoiceId_key" ON "accounts_payable"("vendorInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_expenseId_key" ON "accounts_payable"("expenseId");

-- CreateIndex
CREATE INDEX "accounts_payable_vendorId_idx" ON "accounts_payable"("vendorId");

-- CreateIndex
CREATE INDEX "accounts_payable_paymentStatus_idx" ON "accounts_payable"("paymentStatus");

-- CreateIndex
CREATE INDEX "accounts_payable_dueDate_idx" ON "accounts_payable"("dueDate");

-- CreateIndex
CREATE INDEX "accounts_payable_agingBucket_idx" ON "accounts_payable"("agingBucket");

-- CreateIndex
CREATE INDEX "accounts_payable_apNumber_idx" ON "accounts_payable"("apNumber");

-- CreateIndex
CREATE INDEX "accounts_payable_invoiceDate_idx" ON "accounts_payable"("invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payments_paymentNumber_key" ON "vendor_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "vendor_payments_vendorId_idx" ON "vendor_payments"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_payments_paymentDate_idx" ON "vendor_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "vendor_payments_status_idx" ON "vendor_payments"("status");

-- CreateIndex
CREATE INDEX "vendor_payments_paymentNumber_idx" ON "vendor_payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "vendor_payment_allocations_paymentId_idx" ON "vendor_payment_allocations"("paymentId");

-- CreateIndex
CREATE INDEX "vendor_payment_allocations_apId_idx" ON "vendor_payment_allocations"("apId");

-- CreateIndex
CREATE INDEX "project_team_members_projectId_idx" ON "project_team_members"("projectId");

-- CreateIndex
CREATE INDEX "project_team_members_userId_idx" ON "project_team_members"("userId");

-- CreateIndex
CREATE INDEX "project_team_members_isActive_idx" ON "project_team_members"("isActive");

-- CreateIndex
CREATE INDEX "project_team_members_startDate_idx" ON "project_team_members"("startDate");

-- CreateIndex
CREATE INDEX "project_team_members_endDate_idx" ON "project_team_members"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_projectId_userId_assignedDate_key" ON "project_team_members"("projectId", "userId", "assignedDate");

-- CreateIndex
CREATE INDEX "labor_entries_projectId_idx" ON "labor_entries"("projectId");

-- CreateIndex
CREATE INDEX "labor_entries_userId_idx" ON "labor_entries"("userId");

-- CreateIndex
CREATE INDEX "labor_entries_workDate_idx" ON "labor_entries"("workDate");

-- CreateIndex
CREATE INDEX "labor_entries_status_idx" ON "labor_entries"("status");

-- CreateIndex
CREATE INDEX "labor_entries_teamMemberId_idx" ON "labor_entries"("teamMemberId");

-- CreateIndex
CREATE INDEX "labor_entries_expenseId_idx" ON "labor_entries"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "labor_entries_teamMemberId_workDate_key" ON "labor_entries"("teamMemberId", "workDate");

-- CreateIndex
CREATE INDEX "indonesian_holidays_date_idx" ON "indonesian_holidays"("date");

-- CreateIndex
CREATE INDEX "indonesian_holidays_year_idx" ON "indonesian_holidays"("year");

-- CreateIndex
CREATE INDEX "indonesian_holidays_type_idx" ON "indonesian_holidays"("type");

-- CreateIndex
CREATE INDEX "indonesian_holidays_region_idx" ON "indonesian_holidays"("region");

-- CreateIndex
CREATE UNIQUE INDEX "indonesian_holidays_date_region_key" ON "indonesian_holidays"("date", "region");

-- CreateIndex
CREATE INDEX "invoice_counters_year_month_idx" ON "invoice_counters"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_counters_year_month_key" ON "invoice_counters"("year", "month");

-- CreateIndex
CREATE INDEX "quotation_counters_year_month_idx" ON "quotation_counters"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_counters_year_month_key" ON "quotation_counters"("year", "month");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "project_type_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_markedPaidBy_fkey" FOREIGN KEY ("markedPaidBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentMilestoneId_fkey" FOREIGN KEY ("paymentMilestoneId") REFERENCES "payment_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_events" ADD CONSTRAINT "business_journey_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_events" ADD CONSTRAINT "business_journey_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_events" ADD CONSTRAINT "business_journey_events_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_events" ADD CONSTRAINT "business_journey_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_events" ADD CONSTRAINT "business_journey_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_events" ADD CONSTRAINT "business_journey_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_journey_event_metadata" ADD CONSTRAINT "business_journey_event_metadata_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "business_journey_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_events" ADD CONSTRAINT "feature_flag_events_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "feature_flags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_vendorInvoiceId_fkey" FOREIGN KEY ("vendorInvoiceId") REFERENCES "vendor_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_kit_items" ADD CONSTRAINT "asset_kit_items_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "asset_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_kit_items" ADD CONSTRAINT "asset_kit_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_equipment_usage" ADD CONSTRAINT "project_equipment_usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_equipment_usage" ADD CONSTRAINT "project_equipment_usage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendorInvoiceId_fkey" FOREIGN KEY ("vendorInvoiceId") REFERENCES "vendor_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_approval_history" ADD CONSTRAINT "expense_approval_history_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_approval_history" ADD CONSTRAINT "expense_approval_history_actionBy_fkey" FOREIGN KEY ("actionBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_documents" ADD CONSTRAINT "expense_documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_offsetAccountId_fkey" FOREIGN KEY ("offsetAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "bank_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "deferred_revenue" ADD CONSTRAINT "deferred_revenue_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deferred_revenue" ADD CONSTRAINT "deferred_revenue_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_in_progress" ADD CONSTRAINT "work_in_progress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_in_progress" ADD CONSTRAINT "work_in_progress_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cost_allocations" ADD CONSTRAINT "project_cost_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cost_allocations" ADD CONSTRAINT "project_cost_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_grId_fkey" FOREIGN KEY ("grId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_grId_fkey" FOREIGN KEY ("grId") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES "accounts_payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_viId_fkey" FOREIGN KEY ("viId") REFERENCES "vendor_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payment_allocations" ADD CONSTRAINT "vendor_payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "vendor_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payment_allocations" ADD CONSTRAINT "vendor_payment_allocations_apId_fkey" FOREIGN KEY ("apId") REFERENCES "accounts_payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "project_team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_costAllocationId_fkey" FOREIGN KEY ("costAllocationId") REFERENCES "project_cost_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
