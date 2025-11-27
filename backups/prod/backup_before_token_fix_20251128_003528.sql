--
-- PostgreSQL database dump
--

\restrict 1IiOLVTxFy2c4PZHFbeaHi4iUEnE301t4CF4k0h23gqop552GmG2q2wxTFEqD8H

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: APPaymentStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."APPaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'WRITTEN_OFF'
);


ALTER TYPE public."APPaymentStatus" OWNER TO invoiceuser;

--
-- Name: APSourceType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."APSourceType" AS ENUM (
    'VENDOR_INVOICE',
    'EXPENSE',
    'MANUAL_ENTRY'
);


ALTER TYPE public."APSourceType" OWNER TO invoiceuser;

--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."AccountType" AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE'
);


ALTER TYPE public."AccountType" OWNER TO invoiceuser;

--
-- Name: AllocationMethod; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."AllocationMethod" AS ENUM (
    'PERCENTAGE',
    'HOURS',
    'DIRECT',
    'SQUARE_METER',
    'HEADCOUNT'
);


ALTER TYPE public."AllocationMethod" OWNER TO invoiceuser;

--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO invoiceuser;

--
-- Name: AssetCondition; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."AssetCondition" AS ENUM (
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR',
    'BROKEN'
);


ALTER TYPE public."AssetCondition" OWNER TO invoiceuser;

--
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'CHECKED_OUT',
    'IN_MAINTENANCE',
    'BROKEN',
    'RETIRED'
);


ALTER TYPE public."AssetStatus" OWNER TO invoiceuser;

--
-- Name: BalanceType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BalanceType" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE public."BalanceType" OWNER TO invoiceuser;

--
-- Name: BankRecItemStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BankRecItemStatus" AS ENUM (
    'PENDING',
    'MATCHED',
    'ADJUSTED',
    'CLEARED',
    'UNRESOLVED'
);


ALTER TYPE public."BankRecItemStatus" OWNER TO invoiceuser;

--
-- Name: BankRecItemType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BankRecItemType" AS ENUM (
    'DEPOSIT_IN_TRANSIT',
    'OUTSTANDING_CHECK',
    'BANK_CHARGE',
    'BANK_INTEREST',
    'NSF_CHECK',
    'AUTOMATIC_PAYMENT',
    'DIRECT_DEPOSIT',
    'BANK_ERROR',
    'BOOK_ERROR',
    'OTHER_ADJUSTMENT'
);


ALTER TYPE public."BankRecItemType" OWNER TO invoiceuser;

--
-- Name: BankRecStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BankRecStatus" AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'REVIEWED',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
);


ALTER TYPE public."BankRecStatus" OWNER TO invoiceuser;

--
-- Name: BankTransferStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BankTransferStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."BankTransferStatus" OWNER TO invoiceuser;

--
-- Name: BudgetPeriod; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BudgetPeriod" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY',
    'CUSTOM'
);


ALTER TYPE public."BudgetPeriod" OWNER TO invoiceuser;

--
-- Name: BusinessJourneyEventSource; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BusinessJourneyEventSource" AS ENUM (
    'SYSTEM',
    'USER',
    'API',
    'WEBHOOK'
);


ALTER TYPE public."BusinessJourneyEventSource" OWNER TO invoiceuser;

--
-- Name: BusinessJourneyEventStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BusinessJourneyEventStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'REQUIRES_ATTENTION'
);


ALTER TYPE public."BusinessJourneyEventStatus" OWNER TO invoiceuser;

--
-- Name: BusinessJourneyEventType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BusinessJourneyEventType" AS ENUM (
    'CLIENT_CREATED',
    'PROJECT_STARTED',
    'QUOTATION_DRAFT',
    'QUOTATION_SENT',
    'QUOTATION_APPROVED',
    'QUOTATION_DECLINED',
    'QUOTATION_REVISED',
    'INVOICE_GENERATED',
    'INVOICE_SENT',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'MATERAI_REQUIRED',
    'MATERAI_APPLIED'
);


ALTER TYPE public."BusinessJourneyEventType" OWNER TO invoiceuser;

--
-- Name: BusinessJourneyPriority; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."BusinessJourneyPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."BusinessJourneyPriority" OWNER TO invoiceuser;

--
-- Name: CashCategory; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."CashCategory" AS ENUM (
    'SALES_REVENUE',
    'SERVICE_REVENUE',
    'OTHER_INCOME',
    'OPERATING_EXPENSE',
    'ASSET_PURCHASE',
    'LOAN_REPAYMENT',
    'OTHER_EXPENSE'
);


ALTER TYPE public."CashCategory" OWNER TO invoiceuser;

--
-- Name: CashTransactionStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."CashTransactionStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'POSTED',
    'REJECTED',
    'VOID'
);


ALTER TYPE public."CashTransactionStatus" OWNER TO invoiceuser;

--
-- Name: CashTransactionType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."CashTransactionType" AS ENUM (
    'RECEIPT',
    'DISBURSEMENT'
);


ALTER TYPE public."CashTransactionType" OWNER TO invoiceuser;

--
-- Name: CollaboratorRole; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."CollaboratorRole" AS ENUM (
    'OWNER',
    'EDITOR',
    'COMMENTER',
    'VIEWER'
);


ALTER TYPE public."CollaboratorRole" OWNER TO invoiceuser;

--
-- Name: ContentPlatform; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ContentPlatform" AS ENUM (
    'INSTAGRAM',
    'TIKTOK',
    'FACEBOOK',
    'TWITTER',
    'LINKEDIN',
    'YOUTUBE'
);


ALTER TYPE public."ContentPlatform" OWNER TO invoiceuser;

--
-- Name: ContentStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ContentStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'PUBLISHED',
    'FAILED',
    'ARCHIVED'
);


ALTER TYPE public."ContentStatus" OWNER TO invoiceuser;

--
-- Name: CostType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."CostType" AS ENUM (
    'MATERIAL',
    'LABOR',
    'OVERHEAD',
    'SUBCONTRACTOR',
    'EQUIPMENT'
);


ALTER TYPE public."CostType" OWNER TO invoiceuser;

--
-- Name: Currency; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."Currency" AS ENUM (
    'IDR',
    'USD',
    'USDT'
);


ALTER TYPE public."Currency" OWNER TO invoiceuser;

--
-- Name: DeferredRevenueStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."DeferredRevenueStatus" AS ENUM (
    'DEFERRED',
    'PARTIALLY_RECOGNIZED',
    'FULLY_RECOGNIZED',
    'REFUNDED'
);


ALTER TYPE public."DeferredRevenueStatus" OWNER TO invoiceuser;

--
-- Name: DepreciationMethod; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."DepreciationMethod" AS ENUM (
    'STRAIGHT_LINE',
    'DECLINING_BALANCE',
    'DOUBLE_DECLINING',
    'SUM_OF_YEARS_DIGITS',
    'UNITS_OF_PRODUCTION'
);


ALTER TYPE public."DepreciationMethod" OWNER TO invoiceuser;

--
-- Name: DepreciationStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."DepreciationStatus" AS ENUM (
    'CALCULATED',
    'POSTED',
    'REVERSED',
    'ADJUSTED'
);


ALTER TYPE public."DepreciationStatus" OWNER TO invoiceuser;

--
-- Name: DocumentCategory; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."DocumentCategory" AS ENUM (
    'SUPPORTING_DOCUMENT',
    'CONTRACT',
    'RECEIPT',
    'INVOICE_ATTACHMENT',
    'OTHER'
);


ALTER TYPE public."DocumentCategory" OWNER TO invoiceuser;

--
-- Name: DrawingType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."DrawingType" AS ENUM (
    'ARROW',
    'CIRCLE',
    'RECTANGLE',
    'FREEHAND',
    'TEXT'
);


ALTER TYPE public."DrawingType" OWNER TO invoiceuser;

--
-- Name: ECLProvisionStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ECLProvisionStatus" AS ENUM (
    'ACTIVE',
    'WRITTEN_OFF',
    'RECOVERED',
    'REVERSED'
);


ALTER TYPE public."ECLProvisionStatus" OWNER TO invoiceuser;

--
-- Name: EFakturStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."EFakturStatus" AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'UPLOADED',
    'VALID',
    'INVALID',
    'EXPIRED'
);


ALTER TYPE public."EFakturStatus" OWNER TO invoiceuser;

--
-- Name: ExpenseApprovalAction; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ExpenseApprovalAction" AS ENUM (
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'RECALLED',
    'PAYMENT_REQUESTED',
    'PAYMENT_COMPLETED'
);


ALTER TYPE public."ExpenseApprovalAction" OWNER TO invoiceuser;

--
-- Name: ExpenseClass; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ExpenseClass" AS ENUM (
    'SELLING',
    'GENERAL_ADMIN',
    'OTHER',
    'LABOR_COST',
    'COGS'
);


ALTER TYPE public."ExpenseClass" OWNER TO invoiceuser;

--
-- Name: ExpenseDocumentCategory; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ExpenseDocumentCategory" AS ENUM (
    'RECEIPT',
    'SUPPORTING_DOC',
    'CONTRACT',
    'BUKTI_POTONG',
    'OTHER'
);


ALTER TYPE public."ExpenseDocumentCategory" OWNER TO invoiceuser;

--
-- Name: ExpensePaymentStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ExpensePaymentStatus" AS ENUM (
    'UNPAID',
    'PENDING',
    'PAID',
    'PARTIAL'
);


ALTER TYPE public."ExpensePaymentStatus" OWNER TO invoiceuser;

--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public."ExpenseStatus" OWNER TO invoiceuser;

--
-- Name: GRStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."GRStatus" AS ENUM (
    'DRAFT',
    'RECEIVED',
    'INSPECTED',
    'POSTED',
    'CANCELLED'
);


ALTER TYPE public."GRStatus" OWNER TO invoiceuser;

--
-- Name: HolidayType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."HolidayType" AS ENUM (
    'NATIONAL',
    'RELIGIOUS',
    'REGIONAL',
    'SUBSTITUTE'
);


ALTER TYPE public."HolidayType" OWNER TO invoiceuser;

--
-- Name: InspectionStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."InspectionStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'PASSED',
    'FAILED',
    'PARTIAL'
);


ALTER TYPE public."InspectionStatus" OWNER TO invoiceuser;

--
-- Name: InviteStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."InviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED'
);


ALTER TYPE public."InviteStatus" OWNER TO invoiceuser;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


ALTER TYPE public."InvoiceStatus" OWNER TO invoiceuser;

--
-- Name: JournalStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."JournalStatus" AS ENUM (
    'DRAFT',
    'POSTED',
    'VOID',
    'REVERSED'
);


ALTER TYPE public."JournalStatus" OWNER TO invoiceuser;

--
-- Name: LaborEntryStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."LaborEntryStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'BILLED'
);


ALTER TYPE public."LaborEntryStatus" OWNER TO invoiceuser;

--
-- Name: LaborType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."LaborType" AS ENUM (
    'REGULAR',
    'OVERTIME',
    'HOLIDAY',
    'WEEKEND'
);


ALTER TYPE public."LaborType" OWNER TO invoiceuser;

--
-- Name: MaintenanceFrequency; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MaintenanceFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'SEMI_ANNUAL',
    'ANNUAL',
    'AS_NEEDED'
);


ALTER TYPE public."MaintenanceFrequency" OWNER TO invoiceuser;

--
-- Name: MatchingStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MatchingStatus" AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'PARTIAL_MATCH',
    'VARIANCE',
    'FAILED'
);


ALTER TYPE public."MatchingStatus" OWNER TO invoiceuser;

--
-- Name: MediaAssetType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MediaAssetType" AS ENUM (
    'VIDEO',
    'IMAGE',
    'RAW_IMAGE'
);


ALTER TYPE public."MediaAssetType" OWNER TO invoiceuser;

--
-- Name: MediaReviewStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MediaReviewStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'NEEDS_CHANGES',
    'APPROVED',
    'ARCHIVED'
);


ALTER TYPE public."MediaReviewStatus" OWNER TO invoiceuser;

--
-- Name: MediaType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MediaType" AS ENUM (
    'IMAGE',
    'VIDEO',
    'CAROUSEL'
);


ALTER TYPE public."MediaType" OWNER TO invoiceuser;

--
-- Name: MilestonePriority; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MilestonePriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."MilestonePriority" OWNER TO invoiceuser;

--
-- Name: MilestoneStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'ACCEPTED',
    'BILLED',
    'CANCELLED'
);


ALTER TYPE public."MilestoneStatus" OWNER TO invoiceuser;

--
-- Name: PKPStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PKPStatus" AS ENUM (
    'PKP',
    'NON_PKP',
    'GOVERNMENT'
);


ALTER TYPE public."PKPStatus" OWNER TO invoiceuser;

--
-- Name: POItemType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."POItemType" AS ENUM (
    'GOODS',
    'SERVICE',
    'ASSET',
    'EXPENSE'
);


ALTER TYPE public."POItemType" OWNER TO invoiceuser;

--
-- Name: POStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."POStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'SENT',
    'PARTIAL',
    'COMPLETED',
    'CANCELLED',
    'CLOSED'
);


ALTER TYPE public."POStatus" OWNER TO invoiceuser;

--
-- Name: PPNCategory; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PPNCategory" AS ENUM (
    'CREDITABLE',
    'NON_CREDITABLE',
    'EXEMPT',
    'ZERO_RATED'
);


ALTER TYPE public."PPNCategory" OWNER TO invoiceuser;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'BANK_TRANSFER',
    'CASH',
    'OTHER'
);


ALTER TYPE public."PaymentMethod" OWNER TO invoiceuser;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO invoiceuser;

--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PaymentType" AS ENUM (
    'FULL_PAYMENT',
    'MILESTONE_BASED',
    'ADVANCE_PAYMENT',
    'CUSTOM'
);


ALTER TYPE public."PaymentType" OWNER TO invoiceuser;

--
-- Name: PeriodStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PeriodStatus" AS ENUM (
    'OPEN',
    'CLOSED',
    'LOCKED'
);


ALTER TYPE public."PeriodStatus" OWNER TO invoiceuser;

--
-- Name: PeriodType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PeriodType" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
);


ALTER TYPE public."PeriodType" OWNER TO invoiceuser;

--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'PLANNING',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ProjectStatus" OWNER TO invoiceuser;

--
-- Name: PublicAccessLevel; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PublicAccessLevel" AS ENUM (
    'VIEW_ONLY',
    'DOWNLOAD',
    'COMMENT'
);


ALTER TYPE public."PublicAccessLevel" OWNER TO invoiceuser;

--
-- Name: PurchaseSource; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PurchaseSource" AS ENUM (
    'MANUAL',
    'FROM_PO',
    'FROM_VENDOR_INVOICE'
);


ALTER TYPE public."PurchaseSource" OWNER TO invoiceuser;

--
-- Name: PurchaseType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."PurchaseType" AS ENUM (
    'DIRECT',
    'CREDIT',
    'FROM_PO'
);


ALTER TYPE public."PurchaseType" OWNER TO invoiceuser;

--
-- Name: QualityStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."QualityStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CONDITIONAL'
);


ALTER TYPE public."QualityStatus" OWNER TO invoiceuser;

--
-- Name: QuotationStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."QuotationStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVED',
    'DECLINED',
    'REVISED'
);


ALTER TYPE public."QuotationStatus" OWNER TO invoiceuser;

--
-- Name: ReportStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ReportStatus" AS ENUM (
    'DRAFT',
    'COMPLETED',
    'SENT'
);


ALTER TYPE public."ReportStatus" OWNER TO invoiceuser;

--
-- Name: ReservationStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."ReservationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE public."ReservationStatus" OWNER TO invoiceuser;

--
-- Name: SortOrder; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."SortOrder" AS ENUM (
    'ASC',
    'DESC'
);


ALTER TYPE public."SortOrder" OWNER TO invoiceuser;

--
-- Name: StatementType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."StatementType" AS ENUM (
    'INCOME_STATEMENT',
    'BALANCE_SHEET',
    'CASH_FLOW',
    'TRIAL_BALANCE',
    'ACCOUNTS_RECEIVABLE',
    'ACCOUNTS_PAYABLE'
);


ALTER TYPE public."StatementType" OWNER TO invoiceuser;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."TransactionType" AS ENUM (
    'INVOICE_SENT',
    'INVOICE_PAID',
    'EXPENSE_SUBMITTED',
    'EXPENSE_PAID',
    'PAYMENT_RECEIVED',
    'PAYMENT_MADE',
    'DEPRECIATION',
    'ADJUSTMENT',
    'CLOSING',
    'OPENING',
    'CASH_RECEIPT',
    'CASH_DISBURSEMENT',
    'BANK_TRANSFER',
    'CAPITAL_CONTRIBUTION',
    'OWNER_DRAWING',
    'PO_APPROVED',
    'PO_CANCELLED',
    'GOODS_RECEIVED',
    'VENDOR_INVOICE_APPROVED',
    'VENDOR_PAYMENT_MADE',
    'PURCHASE_RETURN',
    'BANK_RECONCILIATION'
);


ALTER TYPE public."TransactionType" OWNER TO invoiceuser;

--
-- Name: TransferMethod; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."TransferMethod" AS ENUM (
    'INTERNAL',
    'INTERBANK',
    'RTGS',
    'CLEARING',
    'SKN',
    'BIFAST',
    'OTHER'
);


ALTER TYPE public."TransferMethod" OWNER TO invoiceuser;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'FINANCE_MANAGER',
    'ACCOUNTANT',
    'PROJECT_MANAGER',
    'STAFF',
    'VIEWER',
    'ADMIN',
    'USER'
);


ALTER TYPE public."UserRole" OWNER TO invoiceuser;

--
-- Name: VIStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."VIStatus" AS ENUM (
    'DRAFT',
    'PENDING_MATCH',
    'MATCHED',
    'APPROVED',
    'POSTED',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public."VIStatus" OWNER TO invoiceuser;

--
-- Name: VendorPaymentStatus; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."VendorPaymentStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'POSTED',
    'CLEARED',
    'CANCELLED',
    'REVERSED'
);


ALTER TYPE public."VendorPaymentStatus" OWNER TO invoiceuser;

--
-- Name: VendorType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."VendorType" AS ENUM (
    'SUPPLIER',
    'SERVICE_PROVIDER',
    'CONTRACTOR',
    'CONSULTANT',
    'UTILITY',
    'GOVERNMENT',
    'OTHER'
);


ALTER TYPE public."VendorType" OWNER TO invoiceuser;

--
-- Name: WithholdingTaxType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."WithholdingTaxType" AS ENUM (
    'PPH23',
    'PPH4_2',
    'PPH15',
    'NONE'
);


ALTER TYPE public."WithholdingTaxType" OWNER TO invoiceuser;

--
-- Name: auto_create_expense_category(); Type: FUNCTION; Schema: public; Owner: invoiceuser
--

CREATE FUNCTION public.auto_create_expense_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_expense_class "ExpenseClass";
  v_code_prefix TEXT;
  v_category_code TEXT;
  v_existing_id TEXT;
BEGIN
  -- Only process if this is an EXPENSE account starting with 5- or 6-
  IF NEW."accountType" = 'EXPENSE' AND (NEW.code LIKE '5-%' OR NEW.code LIKE '6-%') THEN
    
    -- Generate category code from account code (replace - with _)
    v_category_code := UPPER(REPLACE(NEW.code, '-', '_'));
    
    -- Determine expense class based on account code pattern
    v_code_prefix := substring(NEW.code from 1 for 2);
    
    CASE 
      -- 5-xxxx: COGS (Cost of Goods Sold)
      WHEN v_code_prefix = '5-' THEN
        v_expense_class := 'COGS';
      
      -- 6-1xxx: SELLING (Sales Expenses)
      WHEN NEW.code LIKE '6-1%' THEN
        v_expense_class := 'SELLING';
      
      -- 6-2010: LABOR_COST (Special case)
      WHEN NEW.code = '6-2010' THEN
        v_expense_class := 'LABOR_COST';
      
      -- 6-2xxx: GENERAL_ADMIN (General & Administrative Expenses)
      WHEN NEW.code LIKE '6-2%' THEN
        v_expense_class := 'GENERAL_ADMIN';
      
      -- Other 6-xxxx: Default to OTHER
      ELSE
        v_expense_class := 'OTHER';
    END CASE;
    
    -- Check if expense category already exists for this accountCode
    SELECT id INTO v_existing_id
    FROM expense_categories
    WHERE "accountCode" = NEW.code
    LIMIT 1;
    
    IF v_existing_id IS NULL THEN
      -- Insert new expense category
      INSERT INTO expense_categories (
        id,
        code,
        "accountCode",
        "expenseClass",
        name,
        "nameId",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        v_category_code,
        NEW.code,
        v_expense_class,
        NEW.name,
        NEW."nameId",
        NEW."isActive",
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO UPDATE SET
        "accountCode" = EXCLUDED."accountCode",
        name = EXCLUDED.name,
        "nameId" = EXCLUDED."nameId",
        "isActive" = EXCLUDED."isActive",
        "updatedAt" = NOW();
      
      RAISE NOTICE 'Auto-created expense category: % for account code: %', v_category_code, NEW.code;
    ELSE
      -- Update existing expense category
      UPDATE expense_categories SET
        name = NEW.name,
        "nameId" = NEW."nameId",
        "isActive" = NEW."isActive",
        "updatedAt" = NOW()
      WHERE id = v_existing_id;
      
      RAISE NOTICE 'Updated existing expense category for account code: %', NEW.code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_create_expense_category() OWNER TO invoiceuser;

--
-- Name: FUNCTION auto_create_expense_category(); Type: COMMENT; Schema: public; Owner: invoiceuser
--

COMMENT ON FUNCTION public.auto_create_expense_category() IS 'Automatically creates or updates expense_categories when new expense accounts (5-xxxx or 6-xxxx) are added to chart_of_accounts';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO invoiceuser;

--
-- Name: account_balances; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.account_balances (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "fiscalPeriodId" text NOT NULL,
    "beginningBalance" numeric(15,2) DEFAULT 0 NOT NULL,
    "debitTotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "creditTotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "endingBalance" numeric(15,2) DEFAULT 0 NOT NULL,
    "isClosed" boolean DEFAULT false NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "lastUpdated" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.account_balances OWNER TO invoiceuser;

--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.accounts_payable (
    id text NOT NULL,
    "apNumber" text NOT NULL,
    "vendorId" text NOT NULL,
    "sourceType" public."APSourceType" NOT NULL,
    "vendorInvoiceId" text,
    "expenseId" text,
    "originalAmount" numeric(15,2) NOT NULL,
    "paidAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "outstandingAmount" numeric(15,2) NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paymentStatus" public."APPaymentStatus" DEFAULT 'UNPAID'::public."APPaymentStatus" NOT NULL,
    "daysOutstanding" integer,
    "agingBucket" text,
    "journalEntryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


ALTER TABLE public.accounts_payable OWNER TO invoiceuser;

--
-- Name: allowance_for_doubtful_accounts; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.allowance_for_doubtful_accounts (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "calculationDate" timestamp(3) without time zone NOT NULL,
    "fiscalPeriodId" text,
    "agingBucket" text NOT NULL,
    "daysPastDue" integer DEFAULT 0 NOT NULL,
    "outstandingAmount" numeric(15,2) NOT NULL,
    "eclRate" numeric(5,4) NOT NULL,
    "eclAmount" numeric(15,2) NOT NULL,
    "previousEclAmount" numeric(15,2),
    "adjustmentAmount" numeric(15,2),
    "eclModel" text DEFAULT '12_MONTH'::text NOT NULL,
    "lossRateSource" text,
    "provisionStatus" public."ECLProvisionStatus" DEFAULT 'ACTIVE'::public."ECLProvisionStatus" NOT NULL,
    "journalEntryId" text,
    "writtenOffAt" timestamp(3) without time zone,
    "writtenOffBy" text,
    "writeOffReason" text,
    "writeOffAmount" numeric(15,2),
    "recoveredAt" timestamp(3) without time zone,
    "recoveredAmount" numeric(15,2),
    "recoveryJournalId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


ALTER TABLE public.allowance_for_doubtful_accounts OWNER TO invoiceuser;

--
-- Name: asset_kit_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.asset_kit_items (
    id text NOT NULL,
    "kitId" text NOT NULL,
    "assetId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.asset_kit_items OWNER TO invoiceuser;

--
-- Name: asset_kits; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.asset_kits (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.asset_kits OWNER TO invoiceuser;

--
-- Name: asset_metadata; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.asset_metadata (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "assigneeId" text,
    "dueDate" timestamp(3) without time zone,
    platforms public."ContentPlatform"[],
    tags text[],
    "customFields" jsonb,
    "cameraModel" text,
    "cameraMake" text,
    lens text,
    iso integer,
    aperture numeric(4,2),
    "shutterSpeed" text,
    "focalLength" integer,
    "capturedAt" timestamp(3) without time zone,
    "gpsLatitude" numeric(10,8),
    "gpsLongitude" numeric(11,8),
    copyright text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.asset_metadata OWNER TO invoiceuser;

--
-- Name: asset_reservations; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.asset_reservations (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "userId" text NOT NULL,
    "projectId" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    purpose text NOT NULL,
    status public."ReservationStatus" DEFAULT 'PENDING'::public."ReservationStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.asset_reservations OWNER TO invoiceuser;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.assets (
    id text NOT NULL,
    "assetCode" text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    subcategory text,
    manufacturer text,
    model text,
    "serialNumber" text,
    specifications jsonb,
    "purchaseDate" timestamp(3) without time zone NOT NULL,
    "purchasePrice" numeric(15,2) NOT NULL,
    supplier text,
    "invoiceNumber" text,
    "warrantyExpiration" timestamp(3) without time zone,
    "currentValue" numeric(15,2),
    "notesFinancial" text,
    status public."AssetStatus" DEFAULT 'AVAILABLE'::public."AssetStatus" NOT NULL,
    condition public."AssetCondition" DEFAULT 'GOOD'::public."AssetCondition" NOT NULL,
    location text,
    photos text[],
    documents text[],
    "qrCode" text,
    "rfidTag" text,
    tags text[],
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text,
    "vendorId" text,
    "purchaseOrderId" text,
    "goodsReceiptId" text,
    "vendorInvoiceId" text,
    "residualValue" numeric(15,2),
    "usefulLifeYears" integer
);


ALTER TABLE public.assets OWNER TO invoiceuser;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    "userId" text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO invoiceuser;

--
-- Name: bank_reconciliation_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.bank_reconciliation_items (
    id text NOT NULL,
    "reconciliationId" text NOT NULL,
    "itemDate" timestamp(3) without time zone NOT NULL,
    "itemType" public."BankRecItemType" NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    amount numeric(15,2) NOT NULL,
    "isMatched" boolean DEFAULT false NOT NULL,
    "matchedTransactionId" text,
    "matchedAt" timestamp(3) without time zone,
    "matchedBy" text,
    status public."BankRecItemStatus" DEFAULT 'PENDING'::public."BankRecItemStatus" NOT NULL,
    "requiresAdjustment" boolean DEFAULT false NOT NULL,
    "adjustmentJournalId" text,
    "adjustedAt" timestamp(3) without time zone,
    "checkNumber" text,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    notes text
);


ALTER TABLE public.bank_reconciliation_items OWNER TO invoiceuser;

--
-- Name: bank_reconciliations; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.bank_reconciliations (
    id text NOT NULL,
    "reconciliationNumber" text NOT NULL,
    "bankAccountId" text NOT NULL,
    "statementDate" timestamp(3) without time zone NOT NULL,
    "periodStartDate" timestamp(3) without time zone NOT NULL,
    "periodEndDate" timestamp(3) without time zone NOT NULL,
    "bookBalanceStart" numeric(15,2) NOT NULL,
    "bookBalanceEnd" numeric(15,2) NOT NULL,
    "statementBalance" numeric(15,2) NOT NULL,
    "depositsInTransit" numeric(15,2) DEFAULT 0 NOT NULL,
    "outstandingChecks" numeric(15,2) DEFAULT 0 NOT NULL,
    "bankCharges" numeric(15,2) DEFAULT 0 NOT NULL,
    "bankInterest" numeric(15,2) DEFAULT 0 NOT NULL,
    "otherAdjustments" numeric(15,2) DEFAULT 0 NOT NULL,
    "adjustedBookBalance" numeric(15,2) NOT NULL,
    "adjustedBankBalance" numeric(15,2) NOT NULL,
    difference numeric(15,2) DEFAULT 0 NOT NULL,
    "isBalanced" boolean DEFAULT false NOT NULL,
    "statementReference" text,
    "statementFilePath" text,
    status public."BankRecStatus" DEFAULT 'DRAFT'::public."BankRecStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "adjustmentJournalId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    notes text,
    "notesId" text
);


ALTER TABLE public.bank_reconciliations OWNER TO invoiceuser;

--
-- Name: bank_transfers; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.bank_transfers (
    id text NOT NULL,
    "transferNumber" text NOT NULL,
    "transferDate" timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    "originalAmount" numeric(18,2),
    "exchangeRate" numeric(18,8),
    "idrAmount" numeric(15,2) NOT NULL,
    "fromAccountId" text NOT NULL,
    "toAccountId" text NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    reference text,
    "transferFee" numeric(12,2),
    "feeAccountId" text,
    "feePaymentMethod" text,
    "transferMethod" public."TransferMethod" DEFAULT 'INTERNAL'::public."TransferMethod" NOT NULL,
    "bankReference" text,
    "confirmationCode" text,
    "projectId" text,
    "clientId" text,
    "journalEntryId" text,
    status public."BankTransferStatus" DEFAULT 'PENDING'::public."BankTransferStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "completedAt" timestamp(3) without time zone,
    "completedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    notes text,
    "notesId" text
);


ALTER TABLE public.bank_transfers OWNER TO invoiceuser;

--
-- Name: business_journey_event_metadata; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.business_journey_event_metadata (
    id text NOT NULL,
    "eventId" text NOT NULL,
    "userCreated" text NOT NULL,
    "userModified" text,
    source public."BusinessJourneyEventSource" DEFAULT 'SYSTEM'::public."BusinessJourneyEventSource" NOT NULL,
    priority public."BusinessJourneyPriority" DEFAULT 'MEDIUM'::public."BusinessJourneyPriority" NOT NULL,
    tags text[],
    "relatedDocuments" text[],
    notes text,
    "ipAddress" text,
    "userAgent" text,
    "materaiRequired" boolean DEFAULT false NOT NULL,
    "materaiAmount" numeric(12,2),
    "complianceStatus" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_journey_event_metadata OWNER TO invoiceuser;

--
-- Name: business_journey_events; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.business_journey_events (
    id text NOT NULL,
    type public."BusinessJourneyEventType" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status public."BusinessJourneyEventStatus" DEFAULT 'PENDING'::public."BusinessJourneyEventStatus" NOT NULL,
    amount numeric(12,2),
    "clientId" text,
    "projectId" text,
    "quotationId" text,
    "invoiceId" text,
    "paymentId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.business_journey_events OWNER TO invoiceuser;

--
-- Name: cash_bank_balances; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.cash_bank_balances (
    id text NOT NULL,
    period character varying(100) NOT NULL,
    "periodDate" timestamp(3) without time zone NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    "openingBalance" numeric(15,2) NOT NULL,
    "closingBalance" numeric(15,2) NOT NULL,
    "totalInflow" numeric(15,2) NOT NULL,
    "totalOutflow" numeric(15,2) NOT NULL,
    "netChange" numeric(15,2) NOT NULL,
    "calculatedAt" timestamp(3) without time zone,
    "calculatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text,
    notes text
);


ALTER TABLE public.cash_bank_balances OWNER TO invoiceuser;

--
-- Name: cash_transactions; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.cash_transactions (
    id text NOT NULL,
    "transactionNumber" text NOT NULL,
    "transactionType" public."CashTransactionType" NOT NULL,
    category public."CashCategory" NOT NULL,
    "transactionDate" timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    "originalAmount" numeric(18,2),
    "exchangeRate" numeric(18,8),
    "idrAmount" numeric(15,2) NOT NULL,
    "cashAccountId" text NOT NULL,
    "offsetAccountId" text NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    reference text,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    "checkNumber" text,
    "bankReference" text,
    "projectId" text,
    "clientId" text,
    "journalEntryId" text,
    status public."CashTransactionStatus" DEFAULT 'DRAFT'::public."CashTransactionStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    notes text,
    "notesId" text
);


ALTER TABLE public.cash_transactions OWNER TO invoiceuser;

--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.chart_of_accounts (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "nameId" text NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    "accountSubType" text NOT NULL,
    "normalBalance" public."BalanceType" NOT NULL,
    "parentId" text,
    "isControlAccount" boolean DEFAULT false NOT NULL,
    "isTaxAccount" boolean DEFAULT false NOT NULL,
    "taxType" text,
    currency public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    "isCurrencyAccount" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isSystemAccount" boolean DEFAULT false NOT NULL,
    description text,
    "descriptionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.chart_of_accounts OWNER TO invoiceuser;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.clients (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    company text,
    "contactPerson" text,
    "paymentTerms" text,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "taxNumber" text,
    "bankAccount" text,
    notes text
);


ALTER TABLE public.clients OWNER TO invoiceuser;

--
-- Name: collection_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.collection_items (
    id text NOT NULL,
    "collectionId" text NOT NULL,
    "assetId" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.collection_items OWNER TO invoiceuser;

--
-- Name: collections; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.collections (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    description text,
    "isDynamic" boolean DEFAULT true NOT NULL,
    filters jsonb,
    "groupBy" text,
    "sortBy" text DEFAULT 'uploadedAt'::text NOT NULL,
    "sortOrder" public."SortOrder" DEFAULT 'DESC'::public."SortOrder" NOT NULL,
    "isShared" boolean DEFAULT false NOT NULL,
    "shareToken" text,
    "sharePassword" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.collections OWNER TO invoiceuser;

--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.company_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "companyName" text DEFAULT 'PT Teknologi Indonesia'::text NOT NULL,
    address text,
    phone text,
    email text,
    website text,
    "taxNumber" text,
    currency text DEFAULT 'IDR'::text NOT NULL,
    "bankBCA" text,
    "bankMandiri" text,
    "bankBNI" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.company_settings OWNER TO invoiceuser;

--
-- Name: content_calendar_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.content_calendar_items (
    id text NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    status public."ContentStatus" DEFAULT 'DRAFT'::public."ContentStatus" NOT NULL,
    platforms public."ContentPlatform"[],
    "clientId" text,
    "projectId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    caption text NOT NULL
);


ALTER TABLE public.content_calendar_items OWNER TO invoiceuser;

--
-- Name: COLUMN content_calendar_items.caption; Type: COMMENT; Schema: public; Owner: invoiceuser
--

COMMENT ON COLUMN public.content_calendar_items.caption IS 'Social media caption/post text (replaces title & description)';


--
-- Name: content_media; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.content_media (
    id text NOT NULL,
    url text NOT NULL,
    key text NOT NULL,
    type public."MediaType" NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    width integer,
    height integer,
    duration integer,
    "originalName" text,
    "contentId" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "thumbnailKey" text,
    "thumbnailUrl" text,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.content_media OWNER TO invoiceuser;

--
-- Name: COLUMN content_media."order"; Type: COMMENT; Schema: public; Owner: invoiceuser
--

COMMENT ON COLUMN public.content_media."order" IS 'Carousel order (0 = first, 1 = second, etc.)';


--
-- Name: deferred_revenue; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.deferred_revenue (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "recognitionDate" timestamp(3) without time zone NOT NULL,
    "recognizedAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "remainingAmount" numeric(15,2) NOT NULL,
    status public."DeferredRevenueStatus" DEFAULT 'DEFERRED'::public."DeferredRevenueStatus" NOT NULL,
    "performanceObligation" text,
    "completionPercentage" numeric(5,2),
    "initialJournalId" text,
    "recognitionJournalId" text,
    "fiscalPeriodId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "recognizedAt" timestamp(3) without time zone,
    "recognizedBy" text
);


ALTER TABLE public.deferred_revenue OWNER TO invoiceuser;

--
-- Name: depreciation_entries; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.depreciation_entries (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "scheduleId" text NOT NULL,
    "periodDate" timestamp(3) without time zone NOT NULL,
    "fiscalPeriodId" text,
    "depreciationAmount" numeric(15,2) NOT NULL,
    "accumulatedDepreciation" numeric(15,2) NOT NULL,
    "bookValue" numeric(15,2) NOT NULL,
    "journalEntryId" text,
    status public."DepreciationStatus" DEFAULT 'CALCULATED'::public."DepreciationStatus" NOT NULL,
    "calculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "postedAt" timestamp(3) without time zone,
    "postedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.depreciation_entries OWNER TO invoiceuser;

--
-- Name: depreciation_schedules; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.depreciation_schedules (
    id text NOT NULL,
    "assetId" text NOT NULL,
    method public."DepreciationMethod" NOT NULL,
    "depreciableAmount" numeric(15,2) NOT NULL,
    "residualValue" numeric(15,2) DEFAULT 0 NOT NULL,
    "usefulLifeMonths" integer NOT NULL,
    "usefulLifeYears" numeric(5,2) NOT NULL,
    "depreciationPerMonth" numeric(15,2) NOT NULL,
    "depreciationPerYear" numeric(15,2) NOT NULL,
    "annualRate" numeric(5,4) NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFulfilled" boolean DEFAULT false NOT NULL,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.depreciation_schedules OWNER TO invoiceuser;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.documents (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "originalFileName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    category public."DocumentCategory" DEFAULT 'OTHER'::public."DocumentCategory" NOT NULL,
    description text,
    "invoiceId" text,
    "quotationId" text,
    "projectId" text,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.documents OWNER TO invoiceuser;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.exchange_rates (
    id text NOT NULL,
    "fromCurrency" public."Currency" NOT NULL,
    "toCurrency" public."Currency" DEFAULT 'IDR'::public."Currency" NOT NULL,
    rate numeric(18,8) NOT NULL,
    "effectiveDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    source text,
    "isAutomatic" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


ALTER TABLE public.exchange_rates OWNER TO invoiceuser;

--
-- Name: expense_approval_history; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.expense_approval_history (
    id text NOT NULL,
    "expenseId" text NOT NULL,
    action public."ExpenseApprovalAction" NOT NULL,
    "actionBy" text NOT NULL,
    "previousStatus" public."ExpenseStatus" NOT NULL,
    "newStatus" public."ExpenseStatus" NOT NULL,
    comments text,
    "commentsId" text,
    "commentsEn" text,
    "actionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.expense_approval_history OWNER TO invoiceuser;

--
-- Name: expense_budgets; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.expense_budgets (
    id text NOT NULL,
    name text NOT NULL,
    "nameId" text,
    description text,
    "descriptionId" text,
    "categoryId" text,
    "projectId" text,
    "userId" text,
    amount numeric(12,2) NOT NULL,
    period public."BudgetPeriod" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    spent numeric(12,2) DEFAULT 0 NOT NULL,
    remaining numeric(12,2) NOT NULL,
    "alertThreshold" integer DEFAULT 80 NOT NULL,
    "alertSent" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expense_budgets OWNER TO invoiceuser;

--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.expense_categories (
    id text NOT NULL,
    code text NOT NULL,
    "accountCode" text NOT NULL,
    "expenseClass" public."ExpenseClass" NOT NULL,
    name text NOT NULL,
    "nameId" text NOT NULL,
    description text,
    "descriptionId" text,
    "parentId" text,
    "defaultPPNRate" numeric(5,4) DEFAULT 0.1200 NOT NULL,
    "isLuxuryGoods" boolean DEFAULT false NOT NULL,
    "withholdingTaxType" public."WithholdingTaxType" DEFAULT 'NONE'::public."WithholdingTaxType",
    "withholdingTaxRate" numeric(5,4),
    icon text,
    color text DEFAULT '#1890ff'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isBillable" boolean DEFAULT false NOT NULL,
    "requiresReceipt" boolean DEFAULT true NOT NULL,
    "requiresEFaktur" boolean DEFAULT true NOT NULL,
    "approvalRequired" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expense_categories OWNER TO invoiceuser;

--
-- Name: expense_comments; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.expense_comments (
    id text NOT NULL,
    "expenseId" text NOT NULL,
    "userId" text NOT NULL,
    comment text NOT NULL,
    "commentId" text,
    "commentEn" text,
    "isInternal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expense_comments OWNER TO invoiceuser;

--
-- Name: expense_documents; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.expense_documents (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "originalFileName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    category public."ExpenseDocumentCategory" DEFAULT 'OTHER'::public."ExpenseDocumentCategory" NOT NULL,
    description text,
    "expenseId" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.expense_documents OWNER TO invoiceuser;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    "expenseNumber" text NOT NULL,
    "buktiPengeluaranNumber" text NOT NULL,
    "accountCode" text NOT NULL,
    "accountName" text NOT NULL,
    "accountNameEn" text,
    "expenseClass" public."ExpenseClass" NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    "ppnRate" numeric(5,4) DEFAULT 0.1200 NOT NULL,
    "ppnAmount" numeric(12,2) NOT NULL,
    "ppnCategory" public."PPNCategory" DEFAULT 'CREDITABLE'::public."PPNCategory" NOT NULL,
    "isLuxuryGoods" boolean DEFAULT false NOT NULL,
    "eFakturNSFP" text,
    "eFakturQRCode" text,
    "eFakturApprovalCode" text,
    "eFakturStatus" public."EFakturStatus" DEFAULT 'NOT_REQUIRED'::public."EFakturStatus" NOT NULL,
    "eFakturValidatedAt" timestamp(3) without time zone,
    "withholdingTaxType" public."WithholdingTaxType",
    "withholdingTaxRate" numeric(5,4),
    "withholdingTaxAmount" numeric(12,2),
    "buktiPotongNumber" text,
    "buktiPotongDate" timestamp(3) without time zone,
    "vendorName" text NOT NULL,
    "vendorNPWP" text,
    "vendorAddress" text,
    "vendorPhone" text,
    "vendorBank" text,
    "vendorAccountNo" text,
    "vendorAccountName" text,
    "grossAmount" numeric(12,2) NOT NULL,
    "withholdingAmount" numeric(12,2),
    "netAmount" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    "categoryId" text NOT NULL,
    tags text[],
    "isTaxDeductible" boolean DEFAULT true NOT NULL,
    "userId" text NOT NULL,
    "projectId" text,
    "clientId" text,
    "isBillable" boolean DEFAULT false NOT NULL,
    "billableAmount" numeric(12,2),
    "invoiceId" text,
    status public."ExpenseStatus" DEFAULT 'DRAFT'::public."ExpenseStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "paymentStatus" public."ExpensePaymentStatus" DEFAULT 'UNPAID'::public."ExpensePaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paymentMethod" text,
    "paymentReference" text,
    "paymentId" text,
    "journalEntryId" text,
    "paymentJournalId" text,
    notes text,
    "notesId" text,
    "notesEn" text,
    "receiptNumber" text,
    "merchantName" text,
    location text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text,
    "purchaseType" public."PurchaseType" DEFAULT 'DIRECT'::public."PurchaseType" NOT NULL,
    "purchaseSource" public."PurchaseSource" DEFAULT 'MANUAL'::public."PurchaseSource" NOT NULL,
    "vendorId" text,
    "purchaseOrderId" text,
    "vendorInvoiceId" text,
    "accountsPayableId" text,
    "dueDate" timestamp(3) without time zone
);


ALTER TABLE public.expenses OWNER TO invoiceuser;

--
-- Name: feature_flag_events; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.feature_flag_events (
    id text NOT NULL,
    "flagId" text NOT NULL,
    "userId" text,
    "eventType" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.feature_flag_events OWNER TO invoiceuser;

--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.feature_flags (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    "globalEnabled" boolean DEFAULT false NOT NULL,
    "targetUsers" text[],
    "targetGroups" text[],
    rules jsonb,
    "expiresAt" timestamp(3) without time zone,
    "disabledReason" text,
    "disabledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.feature_flags OWNER TO invoiceuser;

--
-- Name: financial_statements; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.financial_statements (
    id text NOT NULL,
    "statementType" public."StatementType" NOT NULL,
    "fiscalPeriodId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    data jsonb NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "generatedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.financial_statements OWNER TO invoiceuser;

--
-- Name: fiscal_periods; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.fiscal_periods (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "periodType" public."PeriodType" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."PeriodStatus" DEFAULT 'OPEN'::public."PeriodStatus" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    "closingNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fiscal_periods OWNER TO invoiceuser;

--
-- Name: frame_comments; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.frame_comments (
    id text NOT NULL,
    "frameId" text NOT NULL,
    text text NOT NULL,
    x numeric(5,2),
    y numeric(5,2),
    "parentId" text,
    "authorId" text NOT NULL,
    mentions text[],
    resolved boolean DEFAULT false NOT NULL,
    "resolvedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.frame_comments OWNER TO invoiceuser;

--
-- Name: frame_drawings; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.frame_drawings (
    id text NOT NULL,
    "frameId" text NOT NULL,
    type public."DrawingType" NOT NULL,
    data jsonb NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.frame_drawings OWNER TO invoiceuser;

--
-- Name: general_ledger; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.general_ledger (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    "postingDate" timestamp(3) without time zone NOT NULL,
    "journalEntryId" text NOT NULL,
    "journalEntryNumber" text NOT NULL,
    "lineNumber" integer NOT NULL,
    debit numeric(15,2) DEFAULT 0 NOT NULL,
    credit numeric(15,2) DEFAULT 0 NOT NULL,
    balance numeric(15,2) NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    "transactionType" public."TransactionType" NOT NULL,
    "transactionId" text NOT NULL,
    "documentNumber" text,
    "projectId" text,
    "clientId" text,
    "fiscalPeriodId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.general_ledger OWNER TO invoiceuser;

--
-- Name: goods_receipt_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.goods_receipt_items (
    id text NOT NULL,
    "grId" text NOT NULL,
    "poItemId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "orderedQuantity" numeric(15,3) NOT NULL,
    "receivedQuantity" numeric(15,3) NOT NULL,
    "acceptedQuantity" numeric(15,3) NOT NULL,
    "rejectedQuantity" numeric(15,3) DEFAULT 0 NOT NULL,
    "qualityStatus" public."QualityStatus" DEFAULT 'PENDING'::public."QualityStatus" NOT NULL,
    "rejectionReason" text,
    "unitPrice" numeric(15,2) NOT NULL,
    "lineTotal" numeric(15,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.goods_receipt_items OWNER TO invoiceuser;

--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.goods_receipts (
    id text NOT NULL,
    "grNumber" text NOT NULL,
    "grDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "poId" text NOT NULL,
    "vendorId" text NOT NULL,
    "deliveryNoteNumber" text,
    "receivedBy" text NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "warehouseLocation" text,
    "inspectionStatus" public."InspectionStatus" DEFAULT 'PENDING'::public."InspectionStatus" NOT NULL,
    "inspectedBy" text,
    "inspectedAt" timestamp(3) without time zone,
    "inspectionNotes" text,
    status public."GRStatus" DEFAULT 'DRAFT'::public."GRStatus" NOT NULL,
    "isPosted" boolean DEFAULT false NOT NULL,
    "postedAt" timestamp(3) without time zone,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "journalEntryId" text
);


ALTER TABLE public.goods_receipts OWNER TO invoiceuser;

--
-- Name: indonesian_holidays; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.indonesian_holidays (
    id text NOT NULL,
    date date NOT NULL,
    year integer NOT NULL,
    name text NOT NULL,
    "nameIndonesian" text NOT NULL,
    description text,
    type public."HolidayType" DEFAULT 'NATIONAL'::public."HolidayType" NOT NULL,
    region text,
    "isLunarBased" boolean DEFAULT false NOT NULL,
    "isSubstitute" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.indonesian_holidays OWNER TO invoiceuser;

--
-- Name: invoice_counters; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.invoice_counters (
    id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    sequence integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invoice_counters OWNER TO invoiceuser;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "creationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "quotationId" text,
    "clientId" text NOT NULL,
    "projectId" text NOT NULL,
    "amountPerProject" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "subtotalAmount" numeric(15,2),
    "taxRate" numeric(5,2),
    "taxAmount" numeric(15,2),
    "includeTax" boolean DEFAULT false NOT NULL,
    "scopeOfWork" text,
    "priceBreakdown" jsonb,
    "paymentInfo" text NOT NULL,
    "materaiRequired" boolean DEFAULT false NOT NULL,
    "materaiApplied" boolean DEFAULT false NOT NULL,
    "materaiAppliedAt" timestamp(3) without time zone,
    "materaiAppliedBy" text,
    "materaiAmount" numeric(12,2),
    terms text,
    signature text,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "markedPaidBy" text,
    "markedPaidAt" timestamp(3) without time zone,
    "journalEntryId" text,
    "paymentJournalId" text,
    "paymentMilestoneId" text,
    "projectMilestoneId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invoices OWNER TO invoiceuser;

--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.journal_entries (
    id text NOT NULL,
    "entryNumber" text NOT NULL,
    "entryDate" timestamp(3) without time zone NOT NULL,
    "postingDate" timestamp(3) without time zone,
    description text NOT NULL,
    "descriptionId" text,
    "descriptionEn" text,
    "transactionType" public."TransactionType" NOT NULL,
    "transactionId" text NOT NULL,
    "documentNumber" text,
    "documentDate" timestamp(3) without time zone,
    status public."JournalStatus" DEFAULT 'DRAFT'::public."JournalStatus" NOT NULL,
    "isPosted" boolean DEFAULT false NOT NULL,
    "postedAt" timestamp(3) without time zone,
    "postedBy" text,
    "fiscalPeriodId" text,
    "isReversing" boolean DEFAULT false NOT NULL,
    "reversedEntryId" text,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.journal_entries OWNER TO invoiceuser;

--
-- Name: journal_line_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.journal_line_items (
    id text NOT NULL,
    "journalEntryId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "accountId" text NOT NULL,
    debit numeric(15,2) DEFAULT 0 NOT NULL,
    credit numeric(15,2) DEFAULT 0 NOT NULL,
    description text,
    "descriptionId" text,
    "projectId" text,
    "clientId" text,
    "departmentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.journal_line_items OWNER TO invoiceuser;

--
-- Name: labor_entries; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.labor_entries (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "teamMemberId" text NOT NULL,
    "userId" text NOT NULL,
    "workDate" date NOT NULL,
    "hoursWorked" numeric(5,2) NOT NULL,
    "laborType" public."LaborType" DEFAULT 'REGULAR'::public."LaborType" NOT NULL,
    "laborTypeRate" numeric(3,2) NOT NULL,
    "hourlyRate" numeric(12,2) NOT NULL,
    "laborCost" numeric(15,2) NOT NULL,
    "costType" public."CostType" DEFAULT 'LABOR'::public."CostType" NOT NULL,
    "isDirect" boolean DEFAULT true NOT NULL,
    description text,
    "descriptionId" text,
    "taskPerformed" text,
    status public."LaborEntryStatus" DEFAULT 'DRAFT'::public."LaborEntryStatus" NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    "expenseId" text,
    "journalEntryId" text,
    "costAllocationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public.labor_entries OWNER TO invoiceuser;

--
-- Name: maintenance_records; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.maintenance_records (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "maintenanceType" text NOT NULL,
    "performedDate" timestamp(3) without time zone NOT NULL,
    "performedBy" text,
    cost numeric(15,2),
    description text NOT NULL,
    "partsReplaced" jsonb,
    "nextMaintenanceDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.maintenance_records OWNER TO invoiceuser;

--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.maintenance_schedules (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "maintenanceType" text NOT NULL,
    frequency public."MaintenanceFrequency" NOT NULL,
    "lastMaintenanceDate" timestamp(3) without time zone,
    "nextMaintenanceDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.maintenance_schedules OWNER TO invoiceuser;

--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.media_assets (
    id text NOT NULL,
    "projectId" text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    description text,
    url text NOT NULL,
    key text NOT NULL,
    "thumbnailUrl" text,
    "mediaType" public."MediaAssetType" NOT NULL,
    "mimeType" text NOT NULL,
    size bigint NOT NULL,
    duration numeric(10,3),
    fps numeric(6,2),
    codec text,
    bitrate integer,
    width integer,
    height integer,
    status public."MediaReviewStatus" DEFAULT 'DRAFT'::public."MediaReviewStatus" NOT NULL,
    "starRating" integer,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "folderId" text
);


ALTER TABLE public.media_assets OWNER TO invoiceuser;

--
-- Name: media_collaborators; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.media_collaborators (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "userId" text,
    role public."CollaboratorRole" DEFAULT 'VIEWER'::public."CollaboratorRole" NOT NULL,
    "invitedBy" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "guestEmail" text,
    "guestName" text,
    "inviteToken" text,
    status public."InviteStatus" DEFAULT 'PENDING'::public."InviteStatus" NOT NULL,
    "lastAccessAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.media_collaborators OWNER TO invoiceuser;

--
-- Name: media_folders; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.media_folders (
    id text NOT NULL,
    name text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text NOT NULL,
    description text,
    "projectId" text NOT NULL
);


ALTER TABLE public.media_folders OWNER TO invoiceuser;

--
-- Name: media_frames; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.media_frames (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "timestamp" numeric(10,3),
    "frameNumber" integer,
    x numeric(5,2),
    y numeric(5,2),
    "thumbnailUrl" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.media_frames OWNER TO invoiceuser;

--
-- Name: media_projects; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.media_projects (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "clientId" text,
    "projectId" text,
    "folderId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "publicShareToken" text,
    "publicShareUrl" text,
    "publicViewCount" integer DEFAULT 0 NOT NULL,
    "publicSharedAt" timestamp(3) without time zone,
    "publicAccessLevel" public."PublicAccessLevel" DEFAULT 'VIEW_ONLY'::public."PublicAccessLevel" NOT NULL
);


ALTER TABLE public.media_projects OWNER TO invoiceuser;

--
-- Name: media_versions; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.media_versions (
    id text NOT NULL,
    "assetId" text NOT NULL,
    "versionNumber" integer NOT NULL,
    filename text NOT NULL,
    url text NOT NULL,
    key text NOT NULL,
    "thumbnailUrl" text,
    size bigint NOT NULL,
    duration numeric(10,3),
    width integer,
    height integer,
    "changeNotes" text,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.media_versions OWNER TO invoiceuser;

--
-- Name: payment_milestones; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.payment_milestones (
    id text NOT NULL,
    "quotationId" text NOT NULL,
    "milestoneNumber" integer NOT NULL,
    name text NOT NULL,
    "nameId" text,
    description text,
    "descriptionId" text,
    "paymentPercentage" numeric(5,2) NOT NULL,
    "paymentAmount" numeric(12,2) NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "dueDaysFromPrev" integer,
    deliverables jsonb,
    "isInvoiced" boolean DEFAULT false NOT NULL,
    "projectMilestoneId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payment_milestones OWNER TO invoiceuser;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "transactionRef" text,
    "bankDetails" text,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "confirmedAt" timestamp(3) without time zone,
    "journalEntryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO invoiceuser;

--
-- Name: project_cost_allocations; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.project_cost_allocations (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "expenseId" text NOT NULL,
    "allocationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "allocationMethod" public."AllocationMethod" NOT NULL,
    "allocationPercentage" numeric(5,2),
    "allocatedAmount" numeric(15,2) NOT NULL,
    "journalEntryId" text,
    "costType" public."CostType" NOT NULL,
    "isDirect" boolean DEFAULT true NOT NULL,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


ALTER TABLE public.project_cost_allocations OWNER TO invoiceuser;

--
-- Name: project_equipment_usage; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.project_equipment_usage (
    id text NOT NULL,
    "projectId" text,
    "assetId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "returnDate" timestamp(3) without time zone,
    condition text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.project_equipment_usage OWNER TO invoiceuser;

--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.project_milestones (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "milestoneNumber" integer NOT NULL,
    name text NOT NULL,
    "nameId" text,
    description text,
    "descriptionId" text,
    "plannedStartDate" timestamp(3) without time zone,
    "plannedEndDate" timestamp(3) without time zone,
    "actualStartDate" timestamp(3) without time zone,
    "actualEndDate" timestamp(3) without time zone,
    "completionPercentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "plannedRevenue" numeric(15,2) NOT NULL,
    "recognizedRevenue" numeric(15,2) DEFAULT 0 NOT NULL,
    "remainingRevenue" numeric(15,2) NOT NULL,
    "estimatedCost" numeric(15,2),
    "actualCost" numeric(15,2) DEFAULT 0,
    status public."MilestoneStatus" DEFAULT 'PENDING'::public."MilestoneStatus" NOT NULL,
    deliverables jsonb,
    "acceptedBy" text,
    "acceptedAt" timestamp(3) without time zone,
    "journalEntryId" text,
    notes text,
    "notesId" text,
    priority public."MilestonePriority" DEFAULT 'MEDIUM'::public."MilestonePriority" NOT NULL,
    "predecessorId" text,
    "delayDays" integer DEFAULT 0,
    "delayReason" text,
    "materaiRequired" boolean DEFAULT false NOT NULL,
    "taxTreatment" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


ALTER TABLE public.project_milestones OWNER TO invoiceuser;

--
-- Name: project_team_members; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.project_team_members (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    "roleId" text,
    "allocationPercent" numeric(5,2) DEFAULT 100 NOT NULL,
    "hourlyRate" numeric(12,2) NOT NULL,
    "hourlyRateCurrency" text DEFAULT 'IDR'::text NOT NULL,
    "assignedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public.project_team_members OWNER TO invoiceuser;

--
-- Name: project_type_configs; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.project_type_configs (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    prefix text NOT NULL,
    color text DEFAULT '#1890ff'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.project_type_configs OWNER TO invoiceuser;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.projects (
    id text NOT NULL,
    number text NOT NULL,
    description text NOT NULL,
    "scopeOfWork" text,
    output text NOT NULL,
    "projectTypeId" text NOT NULL,
    "clientId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "estimatedBudget" numeric(12,2),
    "basePrice" numeric(12,2),
    "priceBreakdown" jsonb,
    "estimatedExpenses" jsonb,
    "projectedGrossMargin" numeric(5,2),
    "projectedNetMargin" numeric(5,2),
    "projectedProfit" numeric(15,2),
    "totalDirectCosts" numeric(15,2) DEFAULT 0,
    "totalIndirectCosts" numeric(15,2) DEFAULT 0,
    "totalAllocatedCosts" numeric(15,2) DEFAULT 0,
    "totalInvoicedAmount" numeric(15,2) DEFAULT 0,
    "totalPaidAmount" numeric(15,2) DEFAULT 0,
    "grossProfit" numeric(15,2),
    "netProfit" numeric(15,2),
    "grossMarginPercent" numeric(5,2),
    "netMarginPercent" numeric(5,2),
    "budgetVariance" numeric(15,2),
    "budgetVariancePercent" numeric(5,2),
    "profitCalculatedAt" timestamp(3) without time zone,
    "profitCalculatedBy" text,
    status public."ProjectStatus" DEFAULT 'PLANNING'::public."ProjectStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.projects OWNER TO invoiceuser;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.purchase_order_items (
    id text NOT NULL,
    "poId" text NOT NULL,
    "lineNumber" integer NOT NULL,
    "itemType" public."POItemType" NOT NULL,
    "itemCode" text,
    description text NOT NULL,
    "descriptionId" text,
    quantity numeric(15,3) NOT NULL,
    unit text NOT NULL,
    "unitPrice" numeric(15,2) NOT NULL,
    "discountPercent" numeric(5,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(15,2) NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "quantityReceived" numeric(15,3) DEFAULT 0 NOT NULL,
    "quantityInvoiced" numeric(15,3) DEFAULT 0 NOT NULL,
    "quantityOutstanding" numeric(15,3) NOT NULL,
    "assetId" text,
    "expenseCategoryId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.purchase_order_items OWNER TO invoiceuser;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.purchase_orders (
    id text NOT NULL,
    "poNumber" text NOT NULL,
    "poDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "vendorId" text NOT NULL,
    "projectId" text,
    subtotal numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "pphAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "isPPNIncluded" boolean DEFAULT true NOT NULL,
    "ppnRate" numeric(5,2) DEFAULT 12 NOT NULL,
    "withholdingTaxType" public."WithholdingTaxType" DEFAULT 'NONE'::public."WithholdingTaxType" NOT NULL,
    "withholdingTaxRate" numeric(5,2),
    "deliveryAddress" text,
    "deliveryDate" timestamp(3) without time zone,
    "paymentTerms" text DEFAULT 'NET 30'::text NOT NULL,
    "dueDate" timestamp(3) without time zone,
    status public."POStatus" DEFAULT 'DRAFT'::public."POStatus" NOT NULL,
    "approvalStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "requestedBy" text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "totalReceived" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalInvoiced" numeric(15,2) DEFAULT 0 NOT NULL,
    "isClosed" boolean DEFAULT false NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    "closureReason" text,
    description text,
    "descriptionId" text,
    notes text,
    "termsConditions" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text,
    "journalEntryId" text
);


ALTER TABLE public.purchase_orders OWNER TO invoiceuser;

--
-- Name: quotation_counters; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.quotation_counters (
    id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    sequence integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.quotation_counters OWNER TO invoiceuser;

--
-- Name: quotations; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.quotations (
    id text NOT NULL,
    "quotationNumber" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "validUntil" timestamp(3) without time zone NOT NULL,
    "clientId" text NOT NULL,
    "projectId" text NOT NULL,
    "amountPerProject" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "scopeOfWork" text,
    "priceBreakdown" jsonb,
    terms text,
    "paymentType" public."PaymentType" DEFAULT 'FULL_PAYMENT'::public."PaymentType" NOT NULL,
    "paymentTermsText" text,
    status public."QuotationStatus" DEFAULT 'DRAFT'::public."QuotationStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.quotations OWNER TO invoiceuser;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isRevoked" boolean DEFAULT false NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokedReason" text,
    "userAgent" text,
    "ipAddress" text,
    "deviceId" text,
    "replacedBy" text
);


ALTER TABLE public.refresh_tokens OWNER TO invoiceuser;

--
-- Name: report_sections; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.report_sections (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "order" integer NOT NULL,
    title text NOT NULL,
    description text,
    "csvFileName" text NOT NULL,
    "csvFilePath" text,
    "importedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "columnTypes" jsonb NOT NULL,
    "rawData" jsonb NOT NULL,
    "rowCount" integer NOT NULL,
    visualizations jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    layout jsonb,
    "layoutVersion" integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.report_sections OWNER TO invoiceuser;

--
-- Name: COLUMN report_sections.layout; Type: COMMENT; Schema: public; Owner: invoiceuser
--

COMMENT ON COLUMN public.report_sections.layout IS 'Widget-based layout for visual report builder';


--
-- Name: COLUMN report_sections."layoutVersion"; Type: COMMENT; Schema: public; Owner: invoiceuser
--

COMMENT ON COLUMN public.report_sections."layoutVersion" IS 'Track layout schema version';


--
-- Name: social_media_reports; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.social_media_reports (
    id text NOT NULL,
    "projectId" text NOT NULL,
    title text NOT NULL,
    description text,
    month integer NOT NULL,
    year integer NOT NULL,
    status public."ReportStatus" DEFAULT 'DRAFT'::public."ReportStatus" NOT NULL,
    "pdfUrl" text,
    "pdfGeneratedAt" timestamp(3) without time zone,
    "pdfVersion" integer DEFAULT 1 NOT NULL,
    "emailedAt" timestamp(3) without time zone,
    "emailedTo" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public.social_media_reports OWNER TO invoiceuser;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.system_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "defaultPaymentTerms" text DEFAULT 'NET 30'::text NOT NULL,
    "materaiThreshold" integer DEFAULT 5000000 NOT NULL,
    "invoicePrefix" text DEFAULT 'INV-'::text NOT NULL,
    "quotationPrefix" text DEFAULT 'QT-'::text NOT NULL,
    "autoBackup" boolean DEFAULT true NOT NULL,
    "backupFrequency" text DEFAULT 'daily'::text NOT NULL,
    "backupTime" text DEFAULT '02:00'::text NOT NULL,
    "autoMateraiReminder" boolean DEFAULT true NOT NULL,
    "defaultCurrency" text DEFAULT 'IDR'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO invoiceuser;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.user_preferences (
    id text NOT NULL,
    "userId" text NOT NULL,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    language text DEFAULT 'id-ID'::text NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_preferences OWNER TO invoiceuser;

--
-- Name: users; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'STAFF'::public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO invoiceuser;

--
-- Name: ux_metrics; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.ux_metrics (
    id text NOT NULL,
    "componentName" text NOT NULL,
    "eventType" text NOT NULL,
    "metricName" text NOT NULL,
    value double precision NOT NULL,
    "userId" text,
    "sessionId" text,
    "clientId" text,
    url text,
    "userAgent" text,
    "performanceData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ux_metrics OWNER TO invoiceuser;

--
-- Name: vendor_invoice_items; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.vendor_invoice_items (
    id text NOT NULL,
    "viId" text NOT NULL,
    "poItemId" text,
    "lineNumber" integer NOT NULL,
    description text NOT NULL,
    "descriptionId" text,
    quantity numeric(15,3) NOT NULL,
    unit text NOT NULL,
    "unitPrice" numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(15,2) NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "isMatched" boolean DEFAULT false NOT NULL,
    "varianceReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vendor_invoice_items OWNER TO invoiceuser;

--
-- Name: vendor_invoices; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.vendor_invoices (
    id text NOT NULL,
    "vendorInvoiceNumber" text NOT NULL,
    "internalNumber" text NOT NULL,
    "invoiceDate" timestamp(3) without time zone NOT NULL,
    "vendorId" text NOT NULL,
    "poId" text,
    "grId" text,
    subtotal numeric(15,2) NOT NULL,
    "discountAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "ppnAmount" numeric(15,2) NOT NULL,
    "pphAmount" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    "eFakturNSFP" text,
    "eFakturQRCode" text,
    "eFakturStatus" public."EFakturStatus" DEFAULT 'NOT_REQUIRED'::public."EFakturStatus" NOT NULL,
    "eFakturUploadDate" timestamp(3) without time zone,
    "paymentTerms" text NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "matchingStatus" public."MatchingStatus" DEFAULT 'UNMATCHED'::public."MatchingStatus" NOT NULL,
    "matchedBy" text,
    "matchedAt" timestamp(3) without time zone,
    "matchingNotes" text,
    "priceVariance" numeric(15,2),
    "quantityVariance" numeric(15,3),
    "withinTolerance" boolean DEFAULT false NOT NULL,
    status public."VIStatus" DEFAULT 'DRAFT'::public."VIStatus" NOT NULL,
    "approvalStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "accountsPayableId" text,
    "journalEntryId" text,
    description text,
    "descriptionId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


ALTER TABLE public.vendor_invoices OWNER TO invoiceuser;

--
-- Name: vendor_payment_allocations; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.vendor_payment_allocations (
    id text NOT NULL,
    "paymentId" text NOT NULL,
    "apId" text NOT NULL,
    "allocatedAmount" numeric(15,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.vendor_payment_allocations OWNER TO invoiceuser;

--
-- Name: vendor_payments; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.vendor_payments (
    id text NOT NULL,
    "paymentNumber" text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "vendorId" text NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "referenceNumber" text,
    "bankAccountId" text,
    "totalAmount" numeric(15,2) NOT NULL,
    status public."VendorPaymentStatus" DEFAULT 'DRAFT'::public."VendorPaymentStatus" NOT NULL,
    "clearedAt" timestamp(3) without time zone,
    "journalEntryId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


ALTER TABLE public.vendor_payments OWNER TO invoiceuser;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.vendors (
    id text NOT NULL,
    "vendorCode" text NOT NULL,
    name text NOT NULL,
    "nameId" text,
    "vendorType" public."VendorType" NOT NULL,
    "industryType" text,
    "contactPerson" text,
    email text,
    phone text,
    address text,
    city text,
    province text,
    "postalCode" text,
    country text DEFAULT 'Indonesia'::text NOT NULL,
    npwp text,
    "pkpStatus" public."PKPStatus" DEFAULT 'NON_PKP'::public."PKPStatus" NOT NULL,
    "taxAddress" text,
    "bankName" text,
    "bankAccountNumber" text,
    "bankAccountName" text,
    "bankBranch" text,
    "swiftCode" text,
    "paymentTerms" text DEFAULT 'NET 30'::text NOT NULL,
    "creditLimit" numeric(15,2),
    currency text DEFAULT 'IDR'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPKP" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


ALTER TABLE public.vendors OWNER TO invoiceuser;

--
-- Name: work_in_progress; Type: TABLE; Schema: public; Owner: invoiceuser
--

CREATE TABLE public.work_in_progress (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "periodDate" timestamp(3) without time zone NOT NULL,
    "fiscalPeriodId" text,
    "directMaterialCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "directLaborCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "directExpenses" numeric(15,2) DEFAULT 0 NOT NULL,
    "allocatedOverhead" numeric(15,2) DEFAULT 0 NOT NULL,
    "totalCost" numeric(15,2) DEFAULT 0 NOT NULL,
    "billedToDate" numeric(15,2) DEFAULT 0 NOT NULL,
    "recognizedRevenue" numeric(15,2) DEFAULT 0 NOT NULL,
    "unbilledRevenue" numeric(15,2) DEFAULT 0 NOT NULL,
    "completionPercentage" numeric(5,2) DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "costJournalId" text,
    "revenueJournalId" text,
    notes text,
    "notesId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


ALTER TABLE public.work_in_progress OWNER TO invoiceuser;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
64c3fe8a-e948-433a-a8a7-9b32f94d6e5d	70a0150d9e7685f2e55a4b05efe1665cd153b3ff4f920317345123395d63ff10	2025-11-08 09:13:18.710068+00	20251107173854_init_baseline	\N	\N	2025-11-08 09:13:14.195963+00	1
df9f5352-b89d-46a6-bb2f-f11e3378acde	8f46bbd65151fbf9cf849b61b6cc66d1a22eb3418520d3e6beebb6eb666118ff	2025-11-08 09:13:18.764145+00	20251108060706_add_performance_indexes	\N	\N	2025-11-08 09:13:18.713819+00	1
ce37a504-79f8-422a-a62b-eacd89f71173	f41cd0f4d7078402e66e05b6e07a55b52e7bad16d7784aedd0ddcb826d34ab16	2025-11-08 09:13:18.790247+00	20251108061200_fix_milestone_invoice_race_condition	\N	\N	2025-11-08 09:13:18.767575+00	1
a0094fe5-7319-4eba-8d10-d43e84d6d6d7	8e9475ca1cc6b5167800f17fca072a913e1dd41b74b3df59defdacf1180d308b	2025-11-02 16:33:02.424171+00	20251017181807_change_user_default_role	\N	\N	2025-11-02 16:33:02.412424+00	1
f0be3c8f-0d64-4cb4-a577-1cd188ff2b72	6342bf8ae43183e5a089a6e6ba3f6228bac2265c7094e99d515b36296c1bca63	2025-11-02 16:33:01.87032+00	20250714154132_init	\N	\N	2025-11-02 16:33:01.588956+00	1
d8ea13bf-20d1-4383-8a51-4c355be3483e	a30bbafacd9b28387d8a25a08086845a302ea7d0de31e9435121c6b20bfa1b01	2025-11-02 16:33:01.875095+00	20251015115521_add_scope_of_work_to_quotations_and_invoices	\N	\N	2025-11-02 16:33:01.871344+00	1
27243d94-13f1-4ab8-b709-6665818efe99	34deb674b981dc684b7747e7472781d9da3adb27504f92ec484d0b0c93a4d421	2025-11-02 16:33:02.514869+00	20251025162000_add_payment_type_to_quotations	\N	\N	2025-11-02 16:33:02.511236+00	1
13270c0b-5836-4463-a4da-2441a57a6b06	ab4f64abb6f9b9b586b8808c61fa4f6369ea4105cff6ce2f5a456d91dfcfba0d	2025-11-02 16:33:01.879392+00	20251015130218_add_scope_of_work_narrative_field	\N	\N	2025-11-02 16:33:01.875991+00	1
87aaf937-83df-4ca7-adb3-59ab19df9494	034844e07a404a2a4ead7ae076f1eb105d66b8ffc24b4c690d1a88fd6b7f60f3	2025-11-02 16:33:02.466943+00	20251020212228_add_project_profit_margin_tracking	\N	\N	2025-11-02 16:33:02.426723+00	1
edde05d7-f7b5-49b6-af12-e06268ecac63	20d94a605536b2d83b2d02bdae422289a2d7f532a95bcfee0f466d169e2578c8	2025-11-02 16:33:01.991775+00	20251016152623_add_property_management	\N	\N	2025-11-02 16:33:01.880415+00	1
bdbeef81-16e9-47b2-a3e3-e315a0d8d31f	16e1683f779403f610665f071c6181a588b7b71ecd25b7759ecd8037ed9e37b4	2025-11-02 16:33:01.995883+00	20251016154515_make_project_id_optional_in_equipment_usage	\N	\N	2025-11-02 16:33:01.992666+00	1
a87c0c7c-77cf-4a5e-9fae-e39f0c4ca512	d278b82ab18796147d25b32c6c5dfb2e230761c70795fbbecef8650c5f12403f	2025-11-02 16:33:02.123689+00	20251016160049_add_expense_management	\N	\N	2025-11-02 16:33:01.996978+00	1
8c1fdf25-d79d-47f5-8274-c0d07e10edf5	47096042c76b1dc9576512b131ec78b94d74b90b6ea1797dc5ee6ea92a77370b	2025-11-02 16:33:02.474382+00	20251024001000_add_labor_cost_to_expense_class	\N	\N	2025-11-02 16:33:02.468346+00	1
0139a30a-c190-496e-ad88-20c476f77686	26d0c4f0bd6c66d02a478efd6630b0d7186c1b156431087ab8b253744e9d3c03	2025-11-02 16:33:02.243103+00	20251016201135_add_accounting_system	\N	\N	2025-11-02 16:33:02.124835+00	1
7cc3c75e-0f4c-4f43-bc71-453111feaa1e	24a5a6784225c2b88bf28c2a07e1bcbf44851491d0f311b10c0af85409d92461	2025-11-02 16:33:02.313693+00	20251017064702_add_psak_16_71_compliance	\N	\N	2025-11-02 16:33:02.244041+00	1
b0ef12b7-7190-4d87-a00a-5589d410c415	ea49d17b9746b6cfd6ac54a2562048b4b2227b9cb96ecbde1ee7825593428bc5	2025-11-02 16:33:02.349596+00	20251017075147_add_psak72_revenue_recognition	\N	\N	2025-11-02 16:33:02.314583+00	1
d2c3442e-61d8-481c-81dc-a6de3638edf4	fa1a070aedb4d27b67728c3063a6cecc32bc646a7075d3f17871cfd931e023b3	2025-11-02 16:33:02.481706+00	20251024180000_add_missing_chart_of_accounts_columns	\N	\N	2025-11-02 16:33:02.475642+00	1
feb8c787-10f6-4483-b8f8-5c90593e6123	f671082f38ea735e69608a2c54ceebbfb59b77cf99a631c3ebee005e5e013704	2025-11-02 16:33:02.386378+00	20251017081132_add_psak57_wip_tracking	\N	\N	2025-11-02 16:33:02.350582+00	1
b8bdcc74-e020-491a-aced-b7d4c86194f0	2c3059b9d10935ef9814e96679215490dfae1d94a2488be316f82e34e5f68a88	2025-11-02 16:33:02.399019+00	20251017122526_add_rbac_audit_fields	\N	\N	2025-11-02 16:33:02.387727+00	1
4766a42e-2691-4bf1-9a04-4edd459b79ac	dd297637770d343542493d213b202b07e8011523945ec3c8b4a7c5578e98307a	2025-11-02 16:33:02.520803+00	20251025162100_add_payment_milestone_to_invoices	\N	\N	2025-11-02 16:33:02.515769+00	1
d23a8916-5e1d-4194-b85a-21457badb169	b4b172d3c74ecee37865898a36b15756dd36bc350d8c5b70cb7c81b14b0c9203	2025-11-02 16:33:02.410019+00	20251017181703_add_new_user_roles	\N	\N	2025-11-02 16:33:02.401516+00	1
72658b3a-08b5-45d6-bab9-a145d9cc39ca	a66a13d60dbb2670efba3656b0bb4b7bef4a2661e9fb57012a238ee7500a6e67	2025-11-02 16:33:02.486732+00	20251024190000_add_projected_gross_margin	\N	\N	2025-11-02 16:33:02.482809+00	1
6553ba8b-b48b-483c-86fd-51dbcae16323	f72a2452b5cb088bf6fcffe9aec7d42c1c43a55914f407fdd07d3ea5523a9197	2025-11-02 16:33:02.491483+00	20251024200000_add_asset_purchase_integration	\N	\N	2025-11-02 16:33:02.487759+00	1
1bf9390e-f37c-48b6-8bcd-e9bb10dd923d	0d8093f9afbb73b58452d8f0aad80dbf029e6fe7aa1a074a38f39d83ab8b2d5d	2025-11-02 16:33:02.52497+00	20251025162200_add_payment_terms_text_to_quotations	\N	\N	2025-11-02 16:33:02.521756+00	1
3bba5ffa-5acc-414d-9c3d-6eaa3d65becb	9620f3673a810d21f0598980d630d380562c59b0c61ee7d29e21fcd928ccdf1b	2025-11-02 16:33:02.500558+00	20251024210000_add_expense_purchase_integration	\N	\N	2025-11-02 16:33:02.49237+00	1
bf28084e-dc1a-405d-82ac-b630a66ec1cc	2363e12dc99b5aa187b858ff7dd5835014f391b96f754cb14e29069629174161	2025-11-02 16:33:02.510254+00	20251025110000_add_priority_to_milestones	\N	\N	2025-11-02 16:33:02.501388+00	1
ac609765-911f-4210-88f4-6059e547b5df	trigger_auto_expense_category	2025-11-08 09:52:45.67323+00	20251108095500_auto_expense_category_trigger	\N	\N	2025-11-08 09:52:45.67323+00	1
c11fe33b-8d87-4cdf-9bcc-8061e4818a24	6b9a2b6e8d9c5f4a3b2c1d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8	2025-11-08 12:33:41.643741+00	20251108094802_add_cogs_expense_class	\N	\N	2025-11-08 12:33:41.643741+00	1
79be7522-b35c-4d9a-816d-c6c3cd323620	f5fddc1a1521c7d29cf9a897b187d224526d6ae2bbd8141301886f5159a0fe1a	2025-11-08 12:32:00.136443+00	20251108094336_add_social_media_ads_reporting	\N	\N	2025-11-08 12:31:59.727751+00	1
86479342-a0ec-4e53-8375-2311da93b6b8	e7ec736f6a11a027478d66b09a1aa8008106e801e0883372c5cc8c2b282c99ee	2025-11-08 12:33:49.4989+00	20251108103500_add_content_planning_calendar	\N	\N	2025-11-08 12:33:49.408616+00	1
2530a8cf-cc69-4ff1-b3a1-167855c088c0	bc2ba684ed04f3a1060cd9e57111957aa5b541df4f4bb4fbddf2a151b5b6f3e4	2025-11-17 17:17:56.576649+00	20251116174120_add_cogs_to_expense_class_enum	Manually resolved	\N	2025-11-17 17:17:38.74926+00	0
dc652400-739a-4e5b-944b-d6f8206c2ca0	6fbba960d9630863d16761187fd4f9ea0d1e9bc36b907596526311b06f329666	2025-11-09 06:53:18.258543+00	20251108120000_add_tax_fields_to_quotations	\N	\N	2025-11-09 06:53:18.242102+00	1
763086a9-1d74-4d31-a95d-c1a9520eb9ea	75ea442230f60240eda51cc18008a21a16e0262ad0f8c5f22738c6d083af2ab6	2025-11-14 15:07:01.615651+00	20251111111000_add_asset_useful_life_years	\N	\N	2025-11-14 15:07:01.600031+00	1
c1300214-a03e-43fc-95e1-030b807f9354	0bfc7c1d287c7e803aadad3d93fb60c0cd047b25c245d91892c73590adf75940	2025-11-14 15:07:01.401047+00	20251109140923_add_universal_social_media_reporting	\N	\N	2025-11-14 15:07:01.247038+00	1
caa83bf1-30db-4fef-84f1-1164087e2b19	088269ca1035c9c7911978bcc3e6daa9641343f8539417cf7e9fd39fff75ec81	2025-11-14 15:07:01.488632+00	20251109142637_remove_campaign_system	\N	\N	2025-11-14 15:07:01.404879+00	1
ccea68f6-fcf2-4d33-80db-e9b73f85efc8	625059fb9411a78cb54b225cd6211c2056b16af3b10d00aae2b70ccb898dd889	2025-11-14 15:07:01.545927+00	20251109233000_add_cash_bank_balance_table	\N	\N	2025-11-14 15:07:01.492193+00	1
5d760435-9adb-46dc-860b-f2bdb4f0c662	13603074c615243da91f72eda42decca1fcdc1de1555e5efe43612127eaf2fb9	2025-11-14 15:07:01.632141+00	20251111185555_add_video_thumbnails	\N	\N	2025-11-14 15:07:01.619834+00	1
2c3bd358-c7db-4233-9a31-05a519380e20	0e7138479282526d65d8a4746fcc1f1a39cd932150da8b10787f4babbc031a86	2025-11-14 15:07:01.565497+00	20251111100000_add_layout_and_default_values	\N	\N	2025-11-14 15:07:01.54963+00	1
33814f7c-40a4-4cfd-b6c4-f4ac1e9aada5	46d4f4f346c21fe4ea021eb702e6bd612619b1e991f769324f066c16bf191350	2025-11-14 15:07:01.595314+00	20251111110000_fix_schema_defaults_and_nullables	\N	\N	2025-11-14 15:07:01.569949+00	1
cb22a9f1-977c-4883-91c1-713faff03149	510b4c8a26b17f43f2069775b184335f2b7bedd564c682b35dfaccb87e1b7e6e	2025-11-17 17:18:48.001399+00	20251117000001_add_public_sharing_to_media_projects	Manually resolved	\N	2025-11-17 17:18:40.124935+00	0
52dc7de5-34c2-4c82-8f50-aed1c0ffa866	0c2173a5867589f749205d2ddcfe4b349f66e6947a873e1ced7d17b8e3f514ad	2025-11-14 15:07:01.658365+00	20251111200000_add_media_order_for_carousel	\N	\N	2025-11-14 15:07:01.635703+00	1
ff753f52-f241-4504-a636-a6f91a19a010	0af6ad1bd53f872e63ad9ac92de5ffe9e731245e45af7e482b1d6ae1e86563cd	2025-11-17 17:18:34.767264+00	20251117000000_add_guest_collaboration_support	Manually resolved	\N	2025-11-17 17:18:00.673519+00	0
66e2ebbc-cf75-49e0-b49d-5b9840cc869a	fc4fb46d1d762793f776d82975ba24f8b8127e7bb1fa57233cd58acae6ec9bae	2025-11-14 15:07:01.676739+00	20251111230000_replace_title_description_with_caption	\N	\N	2025-11-14 15:07:01.662073+00	1
a78a13f8-3ebb-48d5-b470-b8734518a9c9	9b65953879d350c46de7a432569f658a9625e5d3f00862a7e3a687f67f856681	2025-11-14 15:07:26.339211+00	20251114125600_add_cogs_to_expense_class	\N	\N	2025-11-14 15:07:01.680234+00	0
0f606237-9129-4ba9-a8c3-70ad605962df	fe52def446f4b1919f5c53e50cff79b8bf9b8a2b5bff7c23c0722e1642f12f3f	2025-11-16 13:21:07.713733+00	20251116100000_add_client_tax_bank_notes_fields	\N	\N	2025-11-16 13:21:07.692288+00	1
39a7213a-b9f5-4da2-a8c9-97222ce2e97c	95e6ad7aaceffe0ca9d70ef2bf9ae9c6ff3599d4671de220933e3af362843115	2025-11-17 17:20:00.857619+00	20251117091020_add_folders_to_media_assets	Manually resolved - orphan cleanup deployment	\N	2025-11-17 17:19:02.312363+00	0
d8f75e8b-d223-45e3-844b-ed1a1fe30c14	cc391b9582b8140ad22c5b89936d4cf70ae4cc8dbaca3d5fd7c73ad437fcbdf2	2025-11-18 14:42:06.051138+00	20251118130058_add_cascade_delete_to_payments	\N	\N	2025-11-18 14:42:05.983766+00	1
e9829cd9-8327-44ae-9c26-e9490c8ea756	d51c30b1dc93f5fcee1e0ac2ad4c9b84c29faf83b7c79ee17485d49b5c12a8b1	2025-11-20 15:01:47.707231+00	20251120144618_add_refresh_tokens	\N	\N	2025-11-20 15:01:47.707231+00	1
\.


--
-- Data for Name: account_balances; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.account_balances (id, "accountId", "fiscalPeriodId", "beginningBalance", "debitTotal", "creditTotal", "endingBalance", "isClosed", "closedAt", "lastUpdated") FROM stdin;
\.


--
-- Data for Name: accounts_payable; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.accounts_payable (id, "apNumber", "vendorId", "sourceType", "vendorInvoiceId", "expenseId", "originalAmount", "paidAmount", "outstandingAmount", "invoiceDate", "dueDate", "paymentStatus", "daysOutstanding", "agingBucket", "journalEntryId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: allowance_for_doubtful_accounts; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.allowance_for_doubtful_accounts (id, "invoiceId", "calculationDate", "fiscalPeriodId", "agingBucket", "daysPastDue", "outstandingAmount", "eclRate", "eclAmount", "previousEclAmount", "adjustmentAmount", "eclModel", "lossRateSource", "provisionStatus", "journalEntryId", "writtenOffAt", "writtenOffBy", "writeOffReason", "writeOffAmount", "recoveredAt", "recoveredAmount", "recoveryJournalId", notes, "notesId", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: asset_kit_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.asset_kit_items (id, "kitId", "assetId", quantity) FROM stdin;
\.


--
-- Data for Name: asset_kits; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.asset_kits (id, name, description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: asset_metadata; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.asset_metadata (id, "assetId", "assigneeId", "dueDate", platforms, tags, "customFields", "cameraModel", "cameraMake", lens, iso, aperture, "shutterSpeed", "focalLength", "capturedAt", "gpsLatitude", "gpsLongitude", copyright, "createdAt", "updatedAt") FROM stdin;
cmi7j8nbh0003106usz352bnp	cmi7j8nay0001106u6xh885we	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:11	\N	\N	    	2025-11-20 14:34:31.565	2025-11-20 14:34:31.565
cmi7j8nhd0007106ubtgxhj5g	cmi7j8nh90005106u9d3qk54a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:17	\N	\N	    	2025-11-20 14:34:31.777	2025-11-20 14:34:31.777
cmi7j8ntq000b106u1sqtr3w7	cmi7j8ntl0009106um8mq9sg2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 08:59:42	\N	\N	    	2025-11-20 14:34:32.222	2025-11-20 14:34:32.222
cmi7j8oh1000f106udci0iqjp	cmi7j8ogp000d106uvglg1mqn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:03:18	\N	\N	    	2025-11-20 14:34:33.061	2025-11-20 14:34:33.061
cmi7j8qwb000j106u2ft6b2ru	cmi7j8qw6000h106us092p3mw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:02	\N	\N	    	2025-11-20 14:34:36.203	2025-11-20 14:34:36.203
cmi7j8qxd000n106ux0dbn5sx	cmi7j8qx9000l106uddcws1w9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:03:42	\N	\N	    	2025-11-20 14:34:36.241	2025-11-20 14:34:36.241
cmi7j8qy8000r106u2tv0t522	cmi7j8qxz000p106umitvy30a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:06	\N	\N	    	2025-11-20 14:34:36.272	2025-11-20 14:34:36.272
cmi7j8ryt000v106u2prn7e1i	cmi7j8ryk000t106ulczpjjoj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:09	\N	\N	    	2025-11-20 14:34:37.589	2025-11-20 14:34:37.589
cmi7j8v3j000z106uafum1c7j	cmi7j8v3e000x106uerb5amuc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:18	\N	\N	    	2025-11-20 14:34:41.647	2025-11-20 14:34:41.647
cmi7j8vpa0013106ubthpgauw	cmi7j8voy0011106u9wdq7fdv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:27	\N	\N	    	2025-11-20 14:34:42.43	2025-11-20 14:34:42.43
cmi7j8wh90019106uyd9lx21t	cmi7j8wh20015106u8b8wssta	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	25	2025-11-19 09:04:54	\N	\N	    	2025-11-20 14:34:43.437	2025-11-20 14:34:43.437
cmi7j8whb001b106ulvgrmqmp	cmi7j8wh60017106un416hdjn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:23	\N	\N	    	2025-11-20 14:34:43.439	2025-11-20 14:34:43.439
cmi7j8z3e001f106u6ycargg9	cmi7j8z33001d106ugnx6j72g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:22	\N	\N	    	2025-11-20 14:34:46.826	2025-11-20 14:34:46.826
cmi7j8z5o001j106uisvqxqyv	cmi7j8z5h001h106up6lmx9od	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:03	\N	\N	    	2025-11-20 14:34:46.909	2025-11-20 14:34:46.909
cmi7j907z001n106u40crd732	cmi7j907q001l106u1j3xt6bq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:26	\N	\N	    	2025-11-20 14:34:48.287	2025-11-20 14:34:48.287
cmi7j913y001r106ullop7ene	cmi7j913l001p106uw6t5043p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:29	\N	\N	    	2025-11-20 14:34:49.439	2025-11-20 14:34:49.439
cmi7j92un001v106utony6ows	cmi7j92u3001t106uq82ethfx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:58	\N	\N	    	2025-11-20 14:34:51.695	2025-11-20 14:34:51.695
cmi7j93mt001z106ucuvkn2gd	cmi7j93md001x106ulv5x5vao	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:06:47	\N	\N	    	2025-11-20 14:34:52.709	2025-11-20 14:34:52.709
cmi7j947d0023106ugfzckbum	cmi7j946z0021106u8h4hbujl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:54	\N	\N	    	2025-11-20 14:34:53.449	2025-11-20 14:34:53.449
cmi7j94gu0027106ux36sg5ui	cmi7j94g90025106upt8xzr0p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:08:45	\N	\N	    	2025-11-20 14:34:53.789	2025-11-20 14:34:53.789
cmi7j9756002b106ule00akrs	cmi7j974w0029106u4thr3uoy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:09:30	\N	\N	    	2025-11-20 14:34:57.258	2025-11-20 14:34:57.258
cmi7j986h002f106uf5iz5eix	cmi7j9866002d106um88w8d20	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:09	\N	\N	    	2025-11-20 14:34:58.6	2025-11-20 14:34:58.6
cmi7j98qn002j106uzqasmm7y	cmi7j98qe002h106ub90ocbvz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:11:43	\N	\N	    	2025-11-20 14:34:59.327	2025-11-20 14:34:59.327
cmi7j9960002n106u85l9uhed	cmi7j995o002l106u37naoldl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:21	\N	\N	    	2025-11-20 14:34:59.88	2025-11-20 14:34:59.88
cmi7j9a2d002r106uyi113jk5	cmi7j9a22002p106ut88y6wmf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:25	\N	\N	    	2025-11-20 14:35:01.045	2025-11-20 14:35:01.045
cmi7j9b52002v106uwhmywtdf	cmi7j9b4l002t106ufz4md4sy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	17	2025-11-19 09:12:31	\N	\N	    	2025-11-20 14:35:02.438	2025-11-20 14:35:02.438
cmi7j9bxp002z106uwsor0wql	cmi7j9bxh002x106uen0si6f9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:44	\N	\N	    	2025-11-20 14:35:03.47	2025-11-20 14:35:03.47
cmi7j9dh80033106ufb3huso6	cmi7j9dgu0031106uk093jiqr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:47	\N	\N	    	2025-11-20 14:35:05.468	2025-11-20 14:35:05.468
cmi7j9dmj0037106uese5yxoj	cmi7j9dm50035106uvm5tlnz6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:13:07	\N	\N	    	2025-11-20 14:35:05.659	2025-11-20 14:35:05.659
cmi7j9elb003b106uysej182j	cmi7j9el70039106ux5k83rah	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:13:20	\N	\N	    	2025-11-20 14:35:06.911	2025-11-20 14:35:06.911
cmi7j9fi4003f106uf8j4ja78	cmi7j9fhq003d106u4zlz0uhy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:09	\N	\N	    	2025-11-20 14:35:08.092	2025-11-20 14:35:08.092
cmi7j9h2l003j106uan5b23vv	cmi7j9h28003h106u7a9a88ij	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:15	\N	\N	    	2025-11-20 14:35:10.125	2025-11-20 14:35:10.125
cmi7j9h6p003n106uglr1y44l	cmi7j9h5w003l106uaoui49bm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:13	\N	\N	    	2025-11-20 14:35:10.273	2025-11-20 14:35:10.273
cmi7j9hvw003r106u63zoac85	cmi7j9hvr003p106uo6l5aw2b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:42	\N	\N	    	2025-11-20 14:35:11.181	2025-11-20 14:35:11.181
cmi7j9jha003v106uw7d6bmal	cmi7j9jgv003t106ux4nm0jky	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:46	\N	\N	    	2025-11-20 14:35:13.247	2025-11-20 14:35:13.247
cmi7j9kdx003z106uj9co3g7l	cmi7j9kdd003x106u0y5h2w95	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:49	\N	\N	    	2025-11-20 14:35:14.42	2025-11-20 14:35:14.42
cmi7j9kpe0043106u0rhbbqn4	cmi7j9koy0041106un0ww1ins	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	16	2025-11-19 09:20:25	\N	\N	    	2025-11-20 14:35:14.834	2025-11-20 14:35:14.834
cmi7j9lq40047106ujxgk9764	cmi7j9lpr0045106u707tgdem	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 09:20:50	\N	\N	    	2025-11-20 14:35:16.156	2025-11-20 14:35:16.156
cmi7j9mq1004b106u6ewvners	cmi7j9mpm0049106ul9xy6tgz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:21:17	\N	\N	    	2025-11-20 14:35:17.449	2025-11-20 14:35:17.449
cmi7j9myo004f106u28ylxve7	cmi7j9myb004d106um2fnzjm3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:21:21	\N	\N	    	2025-11-20 14:35:17.76	2025-11-20 14:35:17.76
cmi7j9n63004j106unj89768m	cmi7j9n5x004h106uqpfkfxtq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	19	2025-11-19 09:25:57	\N	\N	    	2025-11-20 14:35:18.027	2025-11-20 14:35:18.027
cmi7j9ojm004n106u2qigeo81	cmi7j9ojg004l106u9qvqq840	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:43	\N	\N	    	2025-11-20 14:35:19.81	2025-11-20 14:35:19.81
cmi7j9pt3004r106uex0g2khe	cmi7j9pss004p106ucpk87sp5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:48	\N	\N	    	2025-11-20 14:35:21.447	2025-11-20 14:35:21.447
cmi7j9pxm004v106usash3mqn	cmi7j9px7004t106ury1zuqdj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:53	\N	\N	    	2025-11-20 14:35:21.609	2025-11-20 14:35:21.609
cmi7j9rwd004z106uu9mcang9	cmi7j9rw0004x106u4qahh2fd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:28	\N	\N	    	2025-11-20 14:35:24.157	2025-11-20 14:35:24.157
cmi7j9t2u0053106ug6an175q	cmi7j9t2e0051106uplyn5z0o	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:23	\N	\N	    	2025-11-20 14:35:25.686	2025-11-20 14:35:25.686
cmi7j9ux50057106uxm5ytoho	cmi7j9ux10055106uemq0dbu7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:33	\N	\N	    	2025-11-20 14:35:28.073	2025-11-20 14:35:28.073
cmi7j9v85005b106u4mm1hfzw	cmi7j9v7v0059106u1mu0o3mt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:49	\N	\N	    	2025-11-20 14:35:28.468	2025-11-20 14:35:28.468
cmi7j9vw8005f106uucf0m6p6	cmi7j9vvu005d106up5mzagag	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:53	\N	\N	    	2025-11-20 14:35:29.336	2025-11-20 14:35:29.336
cmi7j9was005j106umrt5lyrj	cmi7j9wai005h106ug86yyo7k	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:56	\N	\N	    	2025-11-20 14:35:29.859	2025-11-20 14:35:29.859
cmi7j9ye0005n106ufmu4wjwe	cmi7j9ydq005l106ux0pmh436	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:59	\N	\N	    	2025-11-20 14:35:32.568	2025-11-20 14:35:32.568
cmi7j9yue005r106ubopnlvpj	cmi7j9yu4005p106urn6gaqon	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:11	\N	\N	    	2025-11-20 14:35:33.158	2025-11-20 14:35:33.158
cmi7j9zwl005v106u83qs7nl2	cmi7j9zwc005t106uqla1iz8w	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:19	\N	\N	    	2025-11-20 14:35:34.533	2025-11-20 14:35:34.533
cmi7j9zyj005z106uur3oo1xp	cmi7j9zya005x106ucsxdfn4q	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:16	\N	\N	    	2025-11-20 14:35:34.603	2025-11-20 14:35:34.603
cmi7ja1ti0063106ugbq2nvie	cmi7ja1t80061106urgaal75g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:24	\N	\N	    	2025-11-20 14:35:37.014	2025-11-20 14:35:37.014
cmi7ja2f10067106uwdd2qnpx	cmi7ja2ew0065106urfyxjrmn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:21	\N	\N	    	2025-11-20 14:35:37.789	2025-11-20 14:35:37.789
cmi7ja3b4006b106uk8orx66o	cmi7ja3b10069106uxcj7f258	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	29	2025-11-19 09:40:03	\N	\N	    	2025-11-20 14:35:38.944	2025-11-20 14:35:38.944
cmi7ja4xs006f106u6jv9b7us	cmi7ja4xi006d106uy7o0l1qn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	33	2025-11-19 09:36:31	\N	\N	    	2025-11-20 14:35:41.055	2025-11-20 14:35:41.055
cmi7ja5dw006j106uirk1k7t9	cmi7ja5ds006h106upl50x5de	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:40:40	\N	\N	    	2025-11-20 14:35:41.636	2025-11-20 14:35:41.636
cmi7ja62o006n106ue3shiqe8	cmi7ja62i006l106uw66oalci	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	24	2025-11-19 09:40:54	\N	\N	    	2025-11-20 14:35:42.528	2025-11-20 14:35:42.528
cmi7ja6dy006r106uybkoqpjq	cmi7ja6ds006p106ucovxo2wq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:41:53	\N	\N	    	2025-11-20 14:35:42.934	2025-11-20 14:35:42.934
cmi7ja8ha006v106ugilnz4m4	cmi7ja8h0006t106um4h8fkst	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	32	2025-11-19 09:42:06	\N	\N	    	2025-11-20 14:35:45.646	2025-11-20 14:35:45.646
cmi7ja9yo006z106u4q43ocfd	cmi7ja9yf006x106u0ficy8e8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:43:43	\N	\N	    	2025-11-20 14:35:47.568	2025-11-20 14:35:47.568
cmi7jaa2h0073106u64ho6wj2	cmi7jaa2c0071106us7v0eeqz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:42:54	\N	\N	    	2025-11-20 14:35:47.705	2025-11-20 14:35:47.705
cmi7jaax20077106udjw2z82s	cmi7jaaws0075106u8ahk0vpv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:43:53	\N	\N	    	2025-11-20 14:35:48.806	2025-11-20 14:35:48.806
cmi7jabfb007b106ufrhsb700	cmi7jabf20079106u2roifl65	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:05	\N	\N	    	2025-11-20 14:35:49.463	2025-11-20 14:35:49.463
cmi7jadcq007f106ul1dkv0ul	cmi7jadck007d106ufkkoal8k	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:08	\N	\N	    	2025-11-20 14:35:51.961	2025-11-20 14:35:51.961
cmi7jaeu6007j106u77d0vaxf	cmi7jaetx007h106ubllqqdlv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:14	\N	\N	    	2025-11-20 14:35:53.886	2025-11-20 14:35:53.886
cmi7jaews007n106unid09a0d	cmi7jaewi007l106u10ctr3tc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:17	\N	\N	    	2025-11-20 14:35:53.979	2025-11-20 14:35:53.979
cmi7jaeyn007r106utv0enxiw	cmi7jaeya007p106uasghtqoz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:10	\N	\N	    	2025-11-20 14:35:54.047	2025-11-20 14:35:54.047
cmi7jaglo007v106ulk0b0qmw	cmi7jaglk007t106u92rf4rpd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:19	\N	\N	    	2025-11-20 14:35:56.172	2025-11-20 14:35:56.172
cmi7kpcfu007z106uost4gplv	cmi7kpcfb007x106ujanjwbde	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 08:59:42	\N	\N	    	2025-11-20 15:15:30.233	2025-11-20 15:15:30.233
cmi7kpd1v0083106u5hyy8lc4	cmi7kpd1j0081106ul5hnd3xw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:03:18	\N	\N	    	2025-11-20 15:15:31.027	2025-11-20 15:15:31.027
cmi7kpd810087106u8oslr5qu	cmi7kpd7p0085106uckp9bklo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:17	\N	\N	    	2025-11-20 15:15:31.249	2025-11-20 15:15:31.249
cmi7kpdhf008b106un3hnbcaf	cmi7kpdh90089106uso5zindf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:11	\N	\N	    	2025-11-20 15:15:31.587	2025-11-20 15:15:31.587
cmi7kpeub008f106ub8udynrz	cmi7kpetz008d106uz43wk743	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:03:42	\N	\N	    	2025-11-20 15:15:33.347	2025-11-20 15:15:33.347
cmi7kpfbe008j106uarr4f5zw	cmi7kpfb7008h106ue4kdc1f7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:02	\N	\N	    	2025-11-20 15:15:33.962	2025-11-20 15:15:33.962
cmi7kpg80008n106ui1cndfx8	cmi7kpg7t008l106uuupuckm8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:06	\N	\N	    	2025-11-20 15:15:35.136	2025-11-20 15:15:35.136
cmi7kphj1008r106u049qh3g8	cmi7kphiv008p106udlmeh8n4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:09	\N	\N	    	2025-11-20 15:15:36.83	2025-11-20 15:15:36.83
cmi7kphtx008v106u1m04a4oi	cmi7kphtl008t106uy5pav7ah	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:18	\N	\N	    	2025-11-20 15:15:37.22	2025-11-20 15:15:37.22
cmi7kpiih008z106u223soh3d	cmi7kpii5008x106ubcd6drr4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:23	\N	\N	    	2025-11-20 15:15:38.105	2025-11-20 15:15:38.105
cmi7kpjq50093106uuf2niai9	cmi7kpjpu0091106uoo72e5u0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:27	\N	\N	    	2025-11-20 15:15:39.677	2025-11-20 15:15:39.677
cmi7kplxh0097106u6hnrffs3	cmi7kplxc0095106u5yiodwrg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:03	\N	\N	    	2025-11-20 15:15:42.533	2025-11-20 15:15:42.533
cmi7kplzc009b106ums68f17o	cmi7kplz90099106utcvsa4z2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	25	2025-11-19 09:04:54	\N	\N	    	2025-11-20 15:15:42.6	2025-11-20 15:15:42.6
cmi7kpmgj009f106ulf41o6fo	cmi7kpmg7009d106uj08a7nt2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:22	\N	\N	    	2025-11-20 15:15:43.219	2025-11-20 15:15:43.219
cmi7kpmpo009j106u6wmelgje	cmi7kpmpc009h106ua94r8o5x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:26	\N	\N	    	2025-11-20 15:15:43.548	2025-11-20 15:15:43.548
cmi7kpphs009n106uqjtsrk1z	cmi7kpphn009l106u73i7fan3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:29	\N	\N	    	2025-11-20 15:15:47.153	2025-11-20 15:15:47.153
cmi7kpqyd009r106upup7fqkq	cmi7kpqy0009p106u4t2jj9qu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:54	\N	\N	    	2025-11-20 15:15:49.044	2025-11-20 15:15:49.044
cmi7kprcj009v106u43ie9ec6	cmi7kprce009t106umd6y11zx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:58	\N	\N	    	2025-11-20 15:15:49.555	2025-11-20 15:15:49.555
cmi7kprx5009z106u8qpyby10	cmi7kprx0009x106uy9mcy8pv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:06:47	\N	\N	    	2025-11-20 15:15:50.298	2025-11-20 15:15:50.298
cmi7kptk900a3106u4y77h8uj	cmi7kptk400a1106umh5f72eo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:08:45	\N	\N	    	2025-11-20 15:15:52.425	2025-11-20 15:15:52.425
cmi7kpxy200a7106uu3r5s5yh	cmi7kpxxx00a5106ulwa3088n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:11:43	\N	\N	    	2025-11-20 15:15:58.106	2025-11-20 15:15:58.106
cmi7kpy0c00ab106uvwti6spf	cmi7kpy0800a9106uulkz54o9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:09:30	\N	\N	    	2025-11-20 15:15:58.188	2025-11-20 15:15:58.188
cmi7kpy3c00af106upths2aab	cmi7kpy3100ad106u478wxfrt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:09	\N	\N	    	2025-11-20 15:15:58.296	2025-11-20 15:15:58.296
cmi7kpygw00aj106u6mu63428	cmi7kpygp00ah106uemqph2ul	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:21	\N	\N	    	2025-11-20 15:15:58.784	2025-11-20 15:15:58.784
cmi7kq1g000an106uh5qo2fy9	cmi7kq1fv00al106u3yl639mj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:25	\N	\N	    	2025-11-20 15:16:02.641	2025-11-20 15:16:02.641
cmi7kq3fp00ar106ub589a5dc	cmi7kq3fk00ap106ubqahi8ga	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	17	2025-11-19 09:12:31	\N	\N	    	2025-11-20 15:16:05.221	2025-11-20 15:16:05.221
cmi7kq45j00av106u056f9jz8	cmi7kq45e00at106uaw5rjxne	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:47	\N	\N	    	2025-11-20 15:16:06.151	2025-11-20 15:16:06.151
cmi7kq46k00az106u2sybmq0a	cmi7kq46b00ax106uoshkydxj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:44	\N	\N	    	2025-11-20 15:16:06.189	2025-11-20 15:16:06.189
cmi7kq5fr00b3106u2e4o4pct	cmi7kq5fg00b1106u9xj4jt2v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:13:07	\N	\N	    	2025-11-20 15:16:07.814	2025-11-20 15:16:07.814
cmi7kq8hf00b7106uprvkcflf	cmi7kq8ha00b5106ub9sd06zu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:09	\N	\N	    	2025-11-20 15:16:11.763	2025-11-20 15:16:11.763
cmi7kq8mw00bb106ub5u42m53	cmi7kq8mm00b9106uy5prdzdj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:13	\N	\N	    	2025-11-20 15:16:11.96	2025-11-20 15:16:11.96
cmi7kq9an00bf106u14z9smlx	cmi7kq9ai00bd106uhu3w1z83	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:13:20	\N	\N	    	2025-11-20 15:16:12.815	2025-11-20 15:16:12.815
cmi7kq9l500bj106u509xkzkz	cmi7kq9kt00bh106ui8dx0qv0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:15	\N	\N	    	2025-11-20 15:16:13.192	2025-11-20 15:16:13.192
cmi7kqc1n00bn106umuek5v5z	cmi7kqc1j00bl106usdoh06sk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:42	\N	\N	    	2025-11-20 15:16:16.38	2025-11-20 15:16:16.38
cmi7kqe4t00br106u2ayr7zae	cmi7kqe4n00bp106ug6qzugek	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:49	\N	\N	    	2025-11-20 15:16:19.085	2025-11-20 15:16:19.085
cmi7kqe8e00bv106u2kzraaca	cmi7kqe8900bt106uvact5adl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:46	\N	\N	    	2025-11-20 15:16:19.214	2025-11-20 15:16:19.214
cmi7kqejl00bz106ucf54o0f0	cmi7kqejg00bx106usrelv1z3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	16	2025-11-19 09:20:25	\N	\N	    	2025-11-20 15:16:19.617	2025-11-20 15:16:19.617
cmi7kqg3r00c3106u7fpn89a3	cmi7kqg3e00c1106uya9x0cb3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 09:20:50	\N	\N	    	2025-11-20 15:16:21.638	2025-11-20 15:16:21.638
cmi7kqimx00c7106ulwyayk3p	cmi7kqimr00c5106u5vi9ynn0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:21:17	\N	\N	    	2025-11-20 15:16:24.922	2025-11-20 15:16:24.922
cmi7kqj7f00cb106us87bxu0h	cmi7kqj7a00c9106uudhf641b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:21:21	\N	\N	    	2025-11-20 15:16:25.659	2025-11-20 15:16:25.659
cmi7kqjqw00cf106uwehxlbcx	cmi7kqjql00cd106u5uyxtxzc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	19	2025-11-19 09:25:57	\N	\N	    	2025-11-20 15:16:26.36	2025-11-20 15:16:26.36
cmi7kqk0700cj106ur6mu11yj	cmi7kqk0100ch106u0gvnpi4e	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:43	\N	\N	    	2025-11-20 15:16:26.695	2025-11-20 15:16:26.695
cmi7kqmr900cn106ucn3jmvyw	cmi7kqmr400cl106uwcb72sbv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:48	\N	\N	    	2025-11-20 15:16:30.261	2025-11-20 15:16:30.261
cmi7kqo0s00cr106um9bgy1f2	cmi7kqo0d00cp106u971ytpdw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:53	\N	\N	    	2025-11-20 15:16:31.9	2025-11-20 15:16:31.9
cmi7kqpmn00cv106u7gmct2hk	cmi7kqpmg00ct106udtdld8be	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:23	\N	\N	    	2025-11-20 15:16:33.984	2025-11-20 15:16:33.984
cmi7kqpzz00cz106ukgwcobd6	cmi7kqpzo00cx106u4zt1aviq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:33	\N	\N	    	2025-11-20 15:16:34.463	2025-11-20 15:16:34.463
cmi7kqqf200d3106u9d35nzf5	cmi7kqqex00d1106ux40aexwd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:28	\N	\N	    	2025-11-20 15:16:35.007	2025-11-20 15:16:35.007
cmi7kqqwz00d7106u6e6ixe9w	cmi7kqqwo00d5106u90k9dub9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:49	\N	\N	    	2025-11-20 15:16:35.65	2025-11-20 15:16:35.65
cmi7kqt3o00db106ujhopg0t7	cmi7kqt3i00d9106udgnxtih9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:53	\N	\N	    	2025-11-20 15:16:38.484	2025-11-20 15:16:38.484
cmi7kqu8o00df106u15p47j40	cmi7kqu8i00dd106uqdpetarn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:56	\N	\N	    	2025-11-20 15:16:39.96	2025-11-20 15:16:39.96
cmi7kqucn00dj106um7eii9jl	cmi7kqucc00dh106uaq75jqe4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:59	\N	\N	    	2025-11-20 15:16:40.103	2025-11-20 15:16:40.103
cmi7kqvho00dn106uwvzwlxxc	cmi7kqvhj00dl106umph1u9u3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:11	\N	\N	    	2025-11-20 15:16:41.581	2025-11-20 15:16:41.581
cmi7kqzjb00dr106uymgypsws	cmi7kqzj700dp106u0d6gkxmc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:16	\N	\N	    	2025-11-20 15:16:46.824	2025-11-20 15:16:46.824
cmi7kr1wy00dv106ub3strk48	cmi7kr1ws00dt106ub93u36tc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:19	\N	\N	    	2025-11-20 15:16:49.907	2025-11-20 15:16:49.907
cmi7kr2au00dz106uxujvrvcs	cmi7kr2ao00dx106uti6a1xga	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:24	\N	\N	    	2025-11-20 15:16:50.406	2025-11-20 15:16:50.406
cmi7kr2il00e3106uyk8b2uph	cmi7kr2i900e1106ufzlay82a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:21	\N	\N	    	2025-11-20 15:16:50.684	2025-11-20 15:16:50.684
cmi7kr32d00e7106uoixgq36j	cmi7kr32700e5106usq0i761b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	33	2025-11-19 09:36:31	\N	\N	    	2025-11-20 15:16:51.398	2025-11-20 15:16:51.398
cmi7kr5x900eb106uzrnwc0vs	cmi7kr5wz00e9106ua1bdrbrm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	29	2025-11-19 09:40:03	\N	\N	    	2025-11-20 15:16:55.1	2025-11-20 15:16:55.1
cmi7kr8jl00ef106utgawaq5h	cmi7kr8jf00ed106ukvv049sm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:40:40	\N	\N	    	2025-11-20 15:16:58.498	2025-11-20 15:16:58.498
cmi7kr8rf00ej106ulrjfwwvd	cmi7kr8r400eh106uqd7gcqj3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	24	2025-11-19 09:40:54	\N	\N	    	2025-11-20 15:16:58.779	2025-11-20 15:16:58.779
cmi7kr9b300en106usmjtzu8z	cmi7kr9as00el106u31uu1vq9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:41:53	\N	\N	    	2025-11-20 15:16:59.487	2025-11-20 15:16:59.487
cmi7kr9kc00er106uc8yqtko5	cmi7kr9k100ep106ua51xp73g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	32	2025-11-19 09:42:06	\N	\N	    	2025-11-20 15:16:59.819	2025-11-20 15:16:59.819
cmi7krcdd00ev106uhzzw47ug	cmi7krcd200et106ues0ysd13	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:42:54	\N	\N	    	2025-11-20 15:17:03.457	2025-11-20 15:17:03.457
cmi7krdbm00ez106uyibquwn9	cmi7krdbb00ex106u06ou1q05	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:43:43	\N	\N	    	2025-11-20 15:17:04.69	2025-11-20 15:17:04.69
cmi7kre7z00f3106ueau4q1vp	cmi7kre7n00f1106u5raf5968	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:43:53	\N	\N	    	2025-11-20 15:17:05.854	2025-11-20 15:17:05.854
cmi7krf2y00f7106uwftnhfks	cmi7krf2m00f5106uiyaj0kwf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:05	\N	\N	    	2025-11-20 15:17:06.97	2025-11-20 15:17:06.97
cmi7krgc300fb106urglzx427	cmi7krgbr00f9106ucqamgrq5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:08	\N	\N	    	2025-11-20 15:17:08.595	2025-11-20 15:17:08.595
cmi7krh9b00ff106ukyk2y0eo	cmi7krh8z00fd106uy9p8u7vz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:10	\N	\N	    	2025-11-20 15:17:09.791	2025-11-20 15:17:09.791
cmi7krj4400fj106ujw852vcc	cmi7krj3s00fh106uh4q31wjr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:14	\N	\N	    	2025-11-20 15:17:12.195	2025-11-20 15:17:12.195
cmi7krjmz00fn106u0y44szak	cmi7krjmo00fl106u4jmy8fw1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:17	\N	\N	    	2025-11-20 15:17:12.874	2025-11-20 15:17:12.874
cmi7krk9m00fr106uwjyp8y8p	cmi7krk9a00fp106upgo9k901	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:19	\N	\N	    	2025-11-20 15:17:13.69	2025-11-20 15:17:13.69
cmi7krlkj00fv106uxpunwa6k	cmi7krlk800ft106uygnj42vr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:21	\N	\N	    	2025-11-20 15:17:15.379	2025-11-20 15:17:15.379
cmi7krmw500fz106uc9ws0k47	cmi7krmw000fx106ukow8a803	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:44	\N	\N	    	2025-11-20 15:17:17.093	2025-11-20 15:17:17.093
cmi7krnxm00g3106usleswor2	cmi7krnxa00g1106ukuaf2d0t	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:47	\N	\N	    	2025-11-20 15:17:18.442	2025-11-20 15:17:18.442
cmi7krovv00g7106u4xmg5yds	cmi7krovk00g5106uekgwbzjq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:50	\N	\N	    	2025-11-20 15:17:19.676	2025-11-20 15:17:19.676
cmi7krrtz00gb106uzz6ehh4r	cmi7krrtu00g9106umxgjmad1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:53	\N	\N	    	2025-11-20 15:17:23.496	2025-11-20 15:17:23.496
cmi7krslk00gf106udqiavr7b	cmi7krsl800gd106uxzr90fop	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:57	\N	\N	    	2025-11-20 15:17:24.487	2025-11-20 15:17:24.487
cmi7krt6r00gj106uu2mwtg09	cmi7krt6l00gh106uzq4jwtxj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:04	\N	\N	    	2025-11-20 15:17:25.251	2025-11-20 15:17:25.251
cmi7krtjd00gn106uvtro2xju	cmi7krtj100gl106uvvb0ps4u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:01	\N	\N	    	2025-11-20 15:17:25.704	2025-11-20 15:17:25.704
cmi7krw5v00gr106uzolymjz6	cmi7krw5s00gp106uwi5u9atl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:06	\N	\N	    	2025-11-20 15:17:29.107	2025-11-20 15:17:29.107
cmi7krxk800gv106uzm93b6o4	cmi7krxk200gt106ufqy284at	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:08	\N	\N	    	2025-11-20 15:17:30.92	2025-11-20 15:17:30.92
cmi7krz9g00gz106urqrly32q	cmi7krz9600gx106u6kpsj2up	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:11	\N	\N	    	2025-11-20 15:17:33.124	2025-11-20 15:17:33.124
cmi7krzfn00h3106unjcwzjmj	cmi7krzfk00h1106utrb5rbf4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:13	\N	\N	    	2025-11-20 15:17:33.347	2025-11-20 15:17:33.347
cmi7krzn700h7106ulfna6y77	cmi7krzmw00h5106umr7of23m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:17	\N	\N	    	2025-11-20 15:17:33.618	2025-11-20 15:17:33.618
cmi7ks0rx00hb106umid8mnpy	cmi7ks0rs00h9106uha1ji99k	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:19	\N	\N	    	2025-11-20 15:17:35.085	2025-11-20 15:17:35.085
cmi7ks60v00hf106urgw1eb2d	cmi7ks60l00hd106uodyn8u7u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:22	\N	\N	    	2025-11-20 15:17:41.888	2025-11-20 15:17:41.888
cmi7ks6qu00hj106ueo1hw71e	cmi7ks6qo00hh106u942vov0j	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:24	\N	\N	    	2025-11-20 15:17:42.823	2025-11-20 15:17:42.823
cmi7ks72h00hn106uqp9z6clg	cmi7ks72c00hl106u10uczfjv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:01:02	\N	\N	    	2025-11-20 15:17:43.241	2025-11-20 15:17:43.241
cmi7ks73n00hr106utcm06xzb	cmi7ks73j00hp106u1olzavzt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:00:49	\N	\N	    	2025-11-20 15:17:43.283	2025-11-20 15:17:43.283
cmi7ksa6900hv106uvfng8jvb	cmi7ksa5z00ht106ut68f3n78	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:01:06	\N	\N	    	2025-11-20 15:17:47.265	2025-11-20 15:17:47.265
cmi7ksckp00hz106u3lsz3x4b	cmi7ksckl00hx106u3lti0ty2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:01:12	\N	\N	    	2025-11-20 15:17:50.377	2025-11-20 15:17:50.377
cmi7ksdlw00i3106un6z5qtgm	cmi7ksdlr00i1106uveai9w7a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:01:14	\N	\N	    	2025-11-20 15:17:51.716	2025-11-20 15:17:51.716
cmi7ksej200i7106u5ob7x3jg	cmi7kseir00i5106u6d1e9hyb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:01:10	\N	\N	    	2025-11-20 15:17:52.91	2025-11-20 15:17:52.91
cmi7kseo500ib106uh8d4g87e	cmi7ksens00i9106uy933n95q	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:03:03	\N	\N	    	2025-11-20 15:17:53.092	2025-11-20 15:17:53.092
cmi7ksgy800if106u8ct314qh	cmi7ksgy300id106uuqa795jn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:03:17	\N	\N	    	2025-11-20 15:17:56.049	2025-11-20 15:17:56.049
cmi7ksi1200ij106ux2thi0xk	cmi7ksi0x00ih106u5bx9dbqm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:03:14	\N	\N	    	2025-11-20 15:17:57.446	2025-11-20 15:17:57.446
cmi7ksjuf00in106ui9ib2meh	cmi7ksjua00il106u7xk4d9dw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:03:41	\N	\N	    	2025-11-20 15:17:59.8	2025-11-20 15:17:59.8
cmi7ksl7k00ir106uo3ap6xlx	cmi7ksl7900ip106u8uiebcdk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:03:22	\N	\N	    	2025-11-20 15:18:01.568	2025-11-20 15:18:01.568
cmi7kslfk00iv106u0ao7t04u	cmi7kslf600it106unhssajee	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:03:45	\N	\N	    	2025-11-20 15:18:01.855	2025-11-20 15:18:01.855
cmi7kslx900iz106uo4kh1it4	cmi7kslwr00ix106uta1fr0jd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:03:48	\N	\N	    	2025-11-20 15:18:02.493	2025-11-20 15:18:02.493
cmi7ksoha00j3106uhhwwlb6m	cmi7ksogr00j1106u9smzx6mt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:03:50	\N	\N	    	2025-11-20 15:18:05.805	2025-11-20 15:18:05.805
cmi7kssmh00j7106udcfmqm5u	cmi7ksslr00j5106utsbnnyjb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:04:09	\N	\N	    	2025-11-20 15:18:11.177	2025-11-20 15:18:11.177
cmi7ksstv00jb106ugwgzdh5e	cmi7ksstb00j9106u0440jnlm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:04:06	\N	\N	    	2025-11-20 15:18:11.443	2025-11-20 15:18:11.443
cmi7kst9100jf106u3iels5ax	cmi7kst8q00jd106ubhg56hin	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	19	2025-11-19 10:04:22	\N	\N	    	2025-11-20 15:18:11.989	2025-11-20 15:18:11.989
cmi7ksu6300jj106uzd20zprp	cmi7ksu5j00jh106u1vjv0xru	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	19	2025-11-19 10:04:28	\N	\N	    	2025-11-20 15:18:13.179	2025-11-20 15:18:13.179
cmi7ktgc200jn106uv8j0ojmw	cmi7ktgbx00jl106uoi792qiz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:11	\N	\N	    	2025-11-20 15:18:41.906	2025-11-20 15:18:41.906
cmi7kth3c00jr106upy4fj73i	cmi7kth3700jp106u2gm499ch	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:06	\N	\N	    	2025-11-20 15:18:42.888	2025-11-20 15:18:42.888
cmi7kthh100jv106ugyyb84k0	cmi7kthgs00jt106u7ktapkl1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:09	\N	\N	    	2025-11-20 15:18:43.381	2025-11-20 15:18:43.381
cmi7kthpp00jz106u5ph5z887	cmi7kthpg00jx106uo0wib2ib	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:13	\N	\N	    	2025-11-20 15:18:43.693	2025-11-20 15:18:43.693
cmi7ktkt000k3106urtuzze37	cmi7ktksx00k1106uy919reem	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:16	\N	\N	    	2025-11-20 15:18:47.7	2025-11-20 15:18:47.7
cmi7ktlvf00k7106ua8isfx41	cmi7ktlvb00k5106uttyc2kd5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:18	\N	\N	    	2025-11-20 15:18:49.084	2025-11-20 15:18:49.084
cmi7ktndn00kb106u2qvbpoh8	cmi7ktndj00k9106ubrzli381	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:05:21	\N	\N	    	2025-11-20 15:18:51.035	2025-11-20 15:18:51.035
cmi7ktnjj00kf106uqbb4xxe2	cmi7ktnjg00kd106uitc2y58g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:06:19	\N	\N	    	2025-11-20 15:18:51.248	2025-11-20 15:18:51.248
cmi7kto6b00kj106ux6ps5j11	cmi7kto6600kh106uzuqsdtvo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:06:22	\N	\N	    	2025-11-20 15:18:52.067	2025-11-20 15:18:52.067
cmi7ktp9c00kn106uc426fopl	cmi7ktp9200kl106usinqv3ca	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:06:26	\N	\N	    	2025-11-20 15:18:53.472	2025-11-20 15:18:53.472
cmi7ktriu00kr106unvp6h72a	cmi7ktrip00kp106u3hym9je3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:06:30	\N	\N	    	2025-11-20 15:18:56.407	2025-11-20 15:18:56.407
cmi7ktv4f00kv106uuiupl3fm	cmi7ktv4a00kt106u0jjgvt8v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:06:46	\N	\N	    	2025-11-20 15:19:01.071	2025-11-20 15:19:01.071
cmi7ktw4n00kz106ualajg3ws	cmi7ktw4e00kx106upqx9cl4h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:06:49	\N	\N	    	2025-11-20 15:19:02.375	2025-11-20 15:19:02.375
cmi7ktyr800l3106uinsqpld3	cmi7ktyr300l1106u0zlwi09u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 10:06:52	\N	\N	    	2025-11-20 15:19:05.78	2025-11-20 15:19:05.78
cmi7ktyv800l7106ue1wmy3nl	cmi7ktyv400l5106u18bajpy9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:07:14	\N	\N	    	2025-11-20 15:19:05.924	2025-11-20 15:19:05.924
cmi7ktztz00ld106ubazz9vgf	cmi7ktztt00l9106uuqoeos6i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:07:23	\N	\N	    	2025-11-20 15:19:07.175	2025-11-20 15:19:07.175
cmi7ktzu200lf106uwh929epb	cmi7ktzty00lb106uiw388iin	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:07:20	\N	\N	    	2025-11-20 15:19:07.178	2025-11-20 15:19:07.178
cmi7ku0ne00lj106utty5ale1	cmi7ku0n800lh106uuqh0vxjg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:07:26	\N	\N	    	2025-11-20 15:19:08.234	2025-11-20 15:19:08.234
cmi7ku3m000ln106uyvnx27ua	cmi7ku3lx00ll106uikz7omg7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	17	2025-11-19 10:07:29	\N	\N	    	2025-11-20 15:19:12.073	2025-11-20 15:19:12.073
cmi7ku4kg00lr106uhsgruio5	cmi7ku4k200lp106uzwcy1gq5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	20	2025-11-19 10:16:05	\N	\N	    	2025-11-20 15:19:13.311	2025-11-20 15:19:13.311
cmi7ku5cn00lv106ub1f38h3d	cmi7ku5c300lt106uvunwaepe	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	20	2025-11-19 10:16:11	\N	\N	    	2025-11-20 15:19:14.321	2025-11-20 15:19:14.321
cmi7ku5dn00lz106ud40cxajj	cmi7ku5cy00lx106ujg9l5xum	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	20	2025-11-19 10:16:08	\N	\N	    	2025-11-20 15:19:14.361	2025-11-20 15:19:14.361
cmi7ku8qi00m3106uhby8zbi8	cmi7ku8qa00m1106ukspwshw0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	22	2025-11-19 10:16:14	\N	\N	    	2025-11-20 15:19:18.714	2025-11-20 15:19:18.714
cmi7ku9ex00m7106ufzena5kl	cmi7ku9eu00m5106uscaa3xvo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	22	2025-11-19 10:16:17	\N	\N	    	2025-11-20 15:19:19.593	2025-11-20 15:19:19.593
cmi7kua1l00mb106un1izqkt2	cmi7kua1c00m9106uyphlugbp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:16:51	\N	\N	    	2025-11-20 15:19:20.409	2025-11-20 15:19:20.409
cmi7kub7t00mf106uwa0j1znz	cmi7kub7j00md106u2oe5gcb8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:16:56	\N	\N	    	2025-11-20 15:19:21.928	2025-11-20 15:19:21.928
cmi7kudcc00mj106usilp4r1a	cmi7kudc300mh106ub55fwjyw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:17:07	\N	\N	    	2025-11-20 15:19:24.684	2025-11-20 15:19:24.684
cmi7kuek700mn106uq12zna74	cmi7kuejy00ml106u95h20lmv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:17:10	\N	\N	    	2025-11-20 15:19:26.262	2025-11-20 15:19:26.262
cmi7kuf8d00mr106upzjq2d1z	cmi7kuf8400mp106udqjf5tmq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	17	2025-11-19 10:18:03	\N	\N	    	2025-11-20 15:19:27.133	2025-11-20 15:19:27.133
cmi7kuf9p00mv106u9kk9f5nu	cmi7kuf9m00mt106u6an25q05	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 10:17:00	\N	\N	    	2025-11-20 15:19:27.182	2025-11-20 15:19:27.182
cmi7kumwe00mz106uis9z0465	cmi7kumw200mx106uuke2bxna	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	17	2025-11-19 10:18:13	\N	\N	    	2025-11-20 15:19:37.07	2025-11-20 15:19:37.07
cmi7kuop400n3106ujmujam33	cmi7kuoov00n1106u7q819pr7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	17	2025-11-19 10:18:15	\N	\N	    	2025-11-20 15:19:39.399	2025-11-20 15:19:39.399
cmi7kupdk00n7106ur7wuva3p	cmi7kupda00n5106ua6pdaudd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	17	2025-11-19 10:18:18	\N	\N	    	2025-11-20 15:19:40.279	2025-11-20 15:19:40.279
cmi7kupe400nb106uidfs2asz	cmi7kupds00n9106uznp964n9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	17	2025-11-19 10:18:22	\N	\N	    	2025-11-20 15:19:40.299	2025-11-20 15:19:40.299
cmi7kurh000nf106ue6af9t8m	cmi7kurgu00nd106udizd3ojn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	18	2025-11-19 10:18:30	\N	\N	    	2025-11-20 15:19:42.996	2025-11-20 15:19:42.996
cmi7kurkm00nj106uf0l3i2sd	cmi7kurkd00nh106u675brblp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	18	2025-11-19 10:18:32	\N	\N	    	2025-11-20 15:19:43.126	2025-11-20 15:19:43.126
cmi7kuron00nn106u3xkjg2pw	cmi7kuroi00nl106u89385jia	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	18	2025-11-19 10:18:27	\N	\N	    	2025-11-20 15:19:43.271	2025-11-20 15:19:43.271
cmi7kurxi00nr106u8d4jjqbx	cmi7kurxd00np106ua1c9hy9d	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	18	2025-11-19 10:18:34	\N	\N	    	2025-11-20 15:19:43.591	2025-11-20 15:19:43.591
cmi7kuwv500nv106ukyj4we2e	cmi7kuwv200nt106u41hc764z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	18	2025-11-19 10:18:37	\N	\N	    	2025-11-20 15:19:49.986	2025-11-20 15:19:49.986
cmi7kuz8c00nz106u9fanukry	cmi7kuz8300nx106ufa7m47tl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:18:59	\N	\N	    	2025-11-20 15:19:53.052	2025-11-20 15:19:53.052
cmi7kuzbb00o3106u0xwm6k8u	cmi7kuzb800o1106umyzwr9pg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:18:54	\N	\N	    	2025-11-20 15:19:53.159	2025-11-20 15:19:53.159
cmi7kuzeh00o7106usqxmrskk	cmi7kuzed00o5106uqx0k0cf2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:18:57	\N	\N	    	2025-11-20 15:19:53.273	2025-11-20 15:19:53.273
cmi7kuzpk00ob106uds0rauzp	cmi7kuzpf00o9106u6od9v77u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:19:01	\N	\N	    	2025-11-20 15:19:53.672	2025-11-20 15:19:53.672
cmi7kv6ax00of106ul2x2jd12	cmi7kv6au00od106u6id4mfgt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:19:04	\N	\N	    	2025-11-20 15:20:02.217	2025-11-20 15:20:02.217
cmi7kv6x000oj106u6u23h5f9	cmi7kv6wr00oh106us4qgg3c3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	17	2025-11-19 10:23:01	\N	\N	    	2025-11-20 15:20:03.012	2025-11-20 15:20:03.012
cmi7kv6xr00on106uxr6afpfx	cmi7kv6xm00ol106uwdf6chbo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:19:08	\N	\N	    	2025-11-20 15:20:03.04	2025-11-20 15:20:03.04
cmi7kv70p00or106ux2xyzrgb	cmi7kv70h00op106udvlr56ol	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:19:06	\N	\N	    	2025-11-20 15:20:03.145	2025-11-20 15:20:03.145
cmi7kvcl200ov106ut5e0gr1n	cmi7kvckw00ot106uy75w2yuk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:23:09	\N	\N	    	2025-11-20 15:20:10.358	2025-11-20 15:20:10.358
cmi7kve1h00oz106ukwv3e0bi	cmi7kve1700ox106uvlg2z1a3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:24:03	\N	\N	    	2025-11-20 15:20:12.245	2025-11-20 15:20:12.245
cmi7kvebg00p3106ucihthvib	cmi7kveb700p1106u4of63d5t	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:24:07	\N	\N	    	2025-11-20 15:20:12.603	2025-11-20 15:20:12.603
cmi7kvens00p7106uwa3w7jvi	cmi7kvenk00p5106uf7eiz71z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:23:12	\N	\N	    	2025-11-20 15:20:13.048	2025-11-20 15:20:13.048
cmi7kvftg00pb106uuyr6cjpe	cmi7kvft700p9106uukxo7379	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:24:10	\N	\N	    	2025-11-20 15:20:14.548	2025-11-20 15:20:14.548
cmi7kvkwm00ph106uerlrs5nr	cmi7kvkw900pd106uvhjdc9gr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:24:29	\N	\N	    	2025-11-20 15:20:21.142	2025-11-20 15:20:21.142
cmi7kwl0800rb106uf85m6gfb	cmi7kwkzm00r9106u18a0gjhe	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:15:27	\N	\N	    	2025-11-20 15:21:07.927	2025-11-20 15:21:07.927
cmi7kwlbw00rf106uo4325eir	cmi7kwlbr00rd106u1a3th8gt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:15:32	\N	\N	    	2025-11-20 15:21:08.348	2025-11-20 15:21:08.348
cmi7kwllj00rj106u0bpcf3kn	cmi7kwlle00rh106uyrlg8a47	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:15:29	\N	\N	    	2025-11-20 15:21:08.695	2025-11-20 15:21:08.695
cmi7kwmx100rn106u410cxewm	cmi7kwmwr00rl106ucuys8ydb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:15:40	\N	\N	    	2025-11-20 15:21:10.405	2025-11-20 15:21:10.405
cmi7kwp8f00rr106un0k3hp4t	cmi7kwp8600rp106u92a3ubea	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:15:59	\N	\N	    	2025-11-20 15:21:13.407	2025-11-20 15:21:13.407
cmi7kwqvc00rv106u87hodt82	cmi7kwqv700rt106ujqrb4fil	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:16:34	\N	\N	    	2025-11-20 15:21:15.528	2025-11-20 15:21:15.528
cmi7kwr2200rz106un3b2uoky	cmi7kwr1w00rx106u4qug0pzj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:16:30	\N	\N	    	2025-11-20 15:21:15.77	2025-11-20 15:21:15.77
cmi7kwrx000s3106uamnk1ivz	cmi7kwrwx00s1106uf12tzket	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:16:37	\N	\N	    	2025-11-20 15:21:16.885	2025-11-20 15:21:16.885
cmi7kwumq00s7106upekc1etu	cmi7kwuml00s5106up44mqa05	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:16:42	\N	\N	    	2025-11-20 15:21:20.402	2025-11-20 15:21:20.402
cmi7kvkwn00pj106uwujoz4ha	cmi7kvkwc00pf106uppuhd9lw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	22	2025-11-19 10:24:16	\N	\N	    	2025-11-20 15:20:21.143	2025-11-20 15:20:21.143
cmi7kvl5n00pn106ucalwvmc5	cmi7kvl5j00pl106u8aa1k396	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:24:12	\N	\N	    	2025-11-20 15:20:21.468	2025-11-20 15:20:21.468
cmi7kvlmp00pr106uyls9zuq8	cmi7kvlml00pp106uqfb76szy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	22	2025-11-19 10:24:19	\N	\N	    	2025-11-20 15:20:22.081	2025-11-20 15:20:22.081
cmi7kvs6t00pv106uj6azkxjn	cmi7kvs6o00pt106u4zvh0d16	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	18	2025-11-19 10:24:33	\N	\N	    	2025-11-20 15:20:30.582	2025-11-20 15:20:30.582
cmi7kvt7z00pz106u14ddgw0j	cmi7kvt7u00px106uk7x2bykh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	20	2025-11-19 10:24:51	\N	\N	    	2025-11-20 15:20:31.919	2025-11-20 15:20:31.919
cmi7kvtiz00q3106uznow13do	cmi7kvtiu00q1106uen4ekwlc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	28	2025-11-19 10:24:47	\N	\N	    	2025-11-20 15:20:32.316	2025-11-20 15:20:32.316
cmi7kvtj700q7106u4lelks1x	cmi7kvtj300q5106ufet5inn2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	22	2025-11-19 10:24:42	\N	\N	    	2025-11-20 15:20:32.323	2025-11-20 15:20:32.323
cmi7kvzgf00qb106u1j4fapgy	cmi7kvzgc00q9106ufvfxvhmz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	17	2025-11-19 10:25:08	\N	\N	    	2025-11-20 15:20:39.999	2025-11-20 15:20:39.999
cmi7kw1cp00qf106uusywiiqo	cmi7kw1ck00qd106u89d1ulgy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	17	2025-11-19 10:25:13	\N	\N	    	2025-11-20 15:20:42.457	2025-11-20 15:20:42.457
cmi7kw1jl00qj106u9zvxuevf	cmi7kw1jh00qh106u0pgfjbiz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	17	2025-11-19 10:25:15	\N	\N	    	2025-11-20 15:20:42.705	2025-11-20 15:20:42.705
cmi7kw1pq00qn106uurhf1l33	cmi7kw1ph00ql106ujq7yo0nt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	17	2025-11-19 10:25:11	\N	\N	    	2025-11-20 15:20:42.925	2025-11-20 15:20:42.925
cmi7kwgh900qr106u3kljqibp	cmi7kwgh500qp106uo9w4wwol	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 11:14:57	\N	\N	    	2025-11-20 15:21:02.061	2025-11-20 15:21:02.061
cmi7kwgr700qv106u392ds15q	cmi7kwgqx00qt106uzebegbfv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	27	2025-11-19 11:14:29	\N	\N	    	2025-11-20 15:21:02.418	2025-11-20 15:21:02.418
cmi7kwhrs00qz106u60ao1rk7	cmi7kwhrp00qx106uyrmp0atm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:15:21	\N	\N	    	2025-11-20 15:21:03.736	2025-11-20 15:21:03.736
cmi7kwi9k00r3106ulxc4hf39	cmi7kwi9900r1106u29xm44bu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 10:25:43	\N	\N	    	2025-11-20 15:21:04.375	2025-11-20 15:21:04.375
cmi7kwj9m00r7106ukc0qseog	cmi7kwj9c00r5106utua1qwtr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:15:24	\N	\N	    	2025-11-20 15:21:05.674	2025-11-20 15:21:05.674
cmi7kww6h00sb106u50el9hcg	cmi7kww6b00s9106uwcwrc8v7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:16:52	\N	\N	    	2025-11-20 15:21:22.409	2025-11-20 15:21:22.409
cmi7kwwb100sf106u9lw7w4lb	cmi7kwwat00sd106ub63yz35b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:16:47	\N	\N	    	2025-11-20 15:21:22.573	2025-11-20 15:21:22.573
cmi7kwy6i00sj106ukaoyax9o	cmi7kwy6f00sh106uiktgkdll	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:16:59	\N	\N	    	2025-11-20 15:21:25.002	2025-11-20 15:21:25.002
cmi7kwy8600sn106unxux086k	cmi7kwy8200sl106uw8chwmbs	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:16:56	\N	\N	    	2025-11-20 15:21:25.062	2025-11-20 15:21:25.062
cmi7kx3pe00sr106ubcr9lslq	cmi7kx3p900sp106ux3y0fhsr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 11:17:09	\N	\N	    	2025-11-20 15:21:32.162	2025-11-20 15:21:32.162
cmi7kx3v300sv106u1f6i3s2h	cmi7kx3us00st106uyoabn2sr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 11:17:05	\N	\N	    	2025-11-20 15:21:32.367	2025-11-20 15:21:32.367
cmi7kx4of00sz106ure3g4dki	cmi7kx4ob00sx106u1i2ets04	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 11:17:15	\N	\N	    	2025-11-20 15:21:33.423	2025-11-20 15:21:33.423
cmi7kx5i000t3106uh04513zw	cmi7kx5hq00t1106uwfvudp5d	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 11:17:12	\N	\N	    	2025-11-20 15:21:34.488	2025-11-20 15:21:34.488
cmi7kx8c300t7106uttc3x37h	cmi7kx8bu00t5106u9ce51my9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	32	2025-11-19 11:17:18	\N	\N	    	2025-11-20 15:21:38.163	2025-11-20 15:21:38.163
cmi7kx8fo00tb106ud8w59ct3	cmi7kx8fl00t9106upw6aa0em	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	32	2025-11-19 11:17:21	\N	\N	    	2025-11-20 15:21:38.292	2025-11-20 15:21:38.292
cmi7kx91r00tf106ue0uex9fd	cmi7kx91n00td106u4vdyyy36	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:17:37	\N	\N	    	2025-11-20 15:21:39.087	2025-11-20 15:21:39.087
cmi7kx9jy00tj106uw337ups7	cmi7kx9jt00th106umqq5bras	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	47	2025-11-19 11:17:42	\N	\N	    	2025-11-20 15:21:39.742	2025-11-20 15:21:39.742
cmi7kxcct00tn106u1u4vvca9	cmi7kxccq00tl106u0lwz998g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:17:46	\N	\N	    	2025-11-20 15:21:43.373	2025-11-20 15:21:43.373
cmi7kxduy00tr106uvy7f0g6l	cmi7kxdut00tp106uxrd0o7ze	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:18:17	\N	\N	    	2025-11-20 15:21:45.322	2025-11-20 15:21:45.322
cmi7kxead00tv106ugaxl8uq0	cmi7kxeaa00tt106uqdlpctsa	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:17:49	\N	\N	    	2025-11-20 15:21:45.877	2025-11-20 15:21:45.877
cmi7kxfgy00tz106uy2wmfnw8	cmi7kxfgu00tx106u32q5kjmv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:18:12	\N	\N	    	2025-11-20 15:21:47.41	2025-11-20 15:21:47.41
cmi7kxfmr00u3106ul0u95y4s	cmi7kxfmm00u1106urenxkm07	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:18:20	\N	\N	    	2025-11-20 15:21:47.619	2025-11-20 15:21:47.619
cmi7kxhad00u7106uirkh7rzn	cmi7kxha900u5106uqgn6ypom	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 11:18:22	\N	\N	    	2025-11-20 15:21:49.765	2025-11-20 15:21:49.765
cmi7kxidv00ub106usd6xg85j	cmi7kxids00u9106u0aptfu5h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	48	2025-11-19 11:18:28	\N	\N	    	2025-11-20 15:21:51.187	2025-11-20 15:21:51.187
cmi7kxk8800uf106u8gchvjvx	cmi7kxk8500ud106ukp8ykyl3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:18:51	\N	\N	    	2025-11-20 15:21:53.576	2025-11-20 15:21:53.576
cmi7kxkah00uj106ug41rxwf3	cmi7kxkac00uh106ude431m5n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:19:03	\N	\N	    	2025-11-20 15:21:53.657	2025-11-20 15:21:53.657
cmi7kxkxb00un106ugfhvvz5w	cmi7kxkx700ul106u8fw5za4w	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:19:06	\N	\N	    	2025-11-20 15:21:54.479	2025-11-20 15:21:54.479
cmi7kxlw400ur106u1lck8hup	cmi7kxlvu00up106upquraz34	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:19:08	\N	\N	    	2025-11-20 15:21:55.731	2025-11-20 15:21:55.731
cmi7kxnzf00uv106ue46riw6i	cmi7kxnzb00ut106uzfyi13n2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:19:26	\N	\N	    	2025-11-20 15:21:58.443	2025-11-20 15:21:58.443
cmi7kxo7t00uz106uv5hvnqf2	cmi7kxo7k00ux106un4icoop6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	45	2025-11-19 11:19:17	\N	\N	    	2025-11-20 15:21:58.744	2025-11-20 15:21:58.744
cmi7kxp5500v3106uavki15j8	cmi7kxp5100v1106ubjw7e9rt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:19:31	\N	\N	    	2025-11-20 15:21:59.945	2025-11-20 15:21:59.945
cmi7kxqus00v7106uh12c3z5e	cmi7kxquo00v5106un0w60hgg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:20:17	\N	\N	    	2025-11-20 15:22:02.164	2025-11-20 15:22:02.164
cmi7kxqxn00vb106u7x93ooz5	cmi7kxqxi00v9106undchfvwu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	31	2025-11-19 11:20:22	\N	\N	    	2025-11-20 15:22:02.267	2025-11-20 15:22:02.267
cmi7kxsp700vf106u3udm8zwv	cmi7kxsp300vd106u8vui5zjj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:20:25	\N	\N	    	2025-11-20 15:22:04.556	2025-11-20 15:22:04.556
cmi7kxu7700vj106u2nt2kg09	cmi7kxu7300vh106u4sga58q8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:20:30	\N	\N	    	2025-11-20 15:22:06.499	2025-11-20 15:22:06.499
cmi7kxu9300vn106urbfibh9t	cmi7kxu8w00vl106uq8wb2y3j	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:20:28	\N	\N	    	2025-11-20 15:22:06.567	2025-11-20 15:22:06.567
cmi7kxv5r00vr106u7ah0w0c8	cmi7kxv5i00vp106udtwba7lp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:19:29	\N	\N	    	2025-11-20 15:22:07.743	2025-11-20 15:22:07.743
cmi7kxwhv00vv106uqlkdljrt	cmi7kxwhr00vt106u0t0vxpzh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:20:35	\N	\N	    	2025-11-20 15:22:09.475	2025-11-20 15:22:09.475
cmi7kxy4k00vz106uhrrchhqv	cmi7kxy4a00vx106uggs4h2ue	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:21:03	\N	\N	    	2025-11-20 15:22:11.587	2025-11-20 15:22:11.587
cmi7kxy7f00w3106uhspripcf	cmi7kxy7a00w1106uwiqa2tq9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:20:33	\N	\N	    	2025-11-20 15:22:11.691	2025-11-20 15:22:11.691
cmi7ky05e00w7106u0sny4azt	cmi7ky05400w5106upuselm6o	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:21:00	\N	\N	    	2025-11-20 15:22:14.21	2025-11-20 15:22:14.21
cmi7ky0kz00wb106u5rnasjon	cmi7ky0kw00w9106ufyqylb84	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:21:05	\N	\N	    	2025-11-20 15:22:14.771	2025-11-20 15:22:14.771
cmi7ky22000wf106ul1k42iu0	cmi7ky21q00wd106uyj0d9ihu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:21:10	\N	\N	    	2025-11-20 15:22:16.679	2025-11-20 15:22:16.679
cmi7ky2hf00wj106urjw23bkx	cmi7ky2gv00wh106uu1skks20	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:21:08	\N	\N	    	2025-11-20 15:22:17.221	2025-11-20 15:22:17.221
cmi7ky4zf00wn106u2vhqi3qv	cmi7ky4z900wl106uy7ozg7zo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 11:21:58	\N	\N	    	2025-11-20 15:22:20.475	2025-11-20 15:22:20.475
cmi7ky55d00wr106ud4xsxmce	cmi7ky55600wp106ukyri1ig9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 11:22:01	\N	\N	    	2025-11-20 15:22:20.687	2025-11-20 15:22:20.687
cmi7ky5vu00wv106u82ida0x4	cmi7ky5vj00wt106ucquitbuz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:22:24	\N	\N	    	2025-11-20 15:22:21.641	2025-11-20 15:22:21.641
cmi7ky6aj00wz106u517kxh1f	cmi7ky6a900wx106uahjwzhnu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 11:22:54	\N	\N	    	2025-11-20 15:22:22.171	2025-11-20 15:22:22.171
cmi7ky88r00x3106ucgprfvwj	cmi7ky88h00x1106uatjaldlx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 11:23:17	\N	\N	    	2025-11-20 15:22:24.698	2025-11-20 15:22:24.698
cmi7ky8tk00x7106ucveex0kl	cmi7ky8tb00x5106upb8eoj9a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 11:23:20	\N	\N	    	2025-11-20 15:22:25.448	2025-11-20 15:22:25.448
cmi7ky9wl00xb106udnr43c50	cmi7ky9wg00x9106u0j0on7rl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 11:23:22	\N	\N	    	2025-11-20 15:22:26.853	2025-11-20 15:22:26.853
cmi7ky9yg00xf106uv4iurast	cmi7ky9y700xd106u7eu0w728	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 11:23:25	\N	\N	    	2025-11-20 15:22:26.92	2025-11-20 15:22:26.92
cmi7kycjs00xj106ufewb3m0i	cmi7kycjn00xh106ub11383ub	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:23:29	\N	\N	    	2025-11-20 15:22:30.28	2025-11-20 15:22:30.28
cmi7kyd2a00xn106u5sdh0dq5	cmi7kyd2500xl106u26tk0tp6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:23:35	\N	\N	    	2025-11-20 15:22:30.947	2025-11-20 15:22:30.947
cmi7kyd5500xr106uobjz59jh	cmi7kyd4v00xp106unsvlbire	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:23:39	\N	\N	    	2025-11-20 15:22:31.047	2025-11-20 15:22:31.047
cmi7kyeep00xv106uf2px3zda	cmi7kyeee00xt106u0rrvzhst	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	47	2025-11-19 11:23:43	\N	\N	    	2025-11-20 15:22:32.689	2025-11-20 15:22:32.689
cmi7kyggj00xz106udjqq5qqz	cmi7kyggf00xx106u7i7gzp7n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	47	2025-11-19 11:23:45	\N	\N	    	2025-11-20 15:22:35.347	2025-11-20 15:22:35.347
cmi7kyhdu00y3106upjouuzqt	cmi7kyhdj00y1106us2q8lsd5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:24:43	\N	\N	    	2025-11-20 15:22:36.546	2025-11-20 15:22:36.546
cmi7kyhsa00y7106ug05w345q	cmi7kyhs500y5106u9h138lw0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	47	2025-11-19 11:23:48	\N	\N	    	2025-11-20 15:22:37.066	2025-11-20 15:22:37.066
cmi7kyhua00yb106uq8pgsest	cmi7kyhu700y9106u4ov4avta	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:24:47	\N	\N	    	2025-11-20 15:22:37.138	2025-11-20 15:22:37.138
cmi7kyj6l00yf106uro3on53c	cmi7kyj6g00yd106uc81mhsnl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:24:51	\N	\N	    	2025-11-20 15:22:38.877	2025-11-20 15:22:38.877
cmi7kyjyp00yj106uur238vlz	cmi7kyjyl00yh106u7rc8jq12	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:24:54	\N	\N	    	2025-11-20 15:22:39.89	2025-11-20 15:22:39.89
cmi7kynvq00yn106ut5arn8q9	cmi7kynvm00yl106u8f822tn8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:25:23	\N	\N	    	2025-11-20 15:22:44.967	2025-11-20 15:22:44.967
cmi7kyo7j00yr106u7os52jhz	cmi7kyo7d00yp106uu0ag1rbq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 11:25:19	\N	\N	    	2025-11-20 15:22:45.391	2025-11-20 15:22:45.391
cmi7kyopw00yv106ubn8exeli	cmi7kyopn00yt106uucpbxkr8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 11:26:34	\N	\N	    	2025-11-20 15:22:46.052	2025-11-20 15:22:46.052
cmi7kypj800yz106ucbinvxn1	cmi7kypix00yx106uo3yw2t14	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:25:28	\N	\N	    	2025-11-20 15:22:47.107	2025-11-20 15:22:47.107
cmi7kyrqj00z3106u5loijq1k	cmi7kyrqg00z1106u91bof1lp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:26:43	\N	\N	    	2025-11-20 15:22:49.964	2025-11-20 15:22:49.964
cmi7kyt3400z7106uo8feonb8	cmi7kyt3100z5106u5rt7zpt6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 11:26:36	\N	\N	    	2025-11-20 15:22:51.713	2025-11-20 15:22:51.713
cmi7kyt3x00zb106urcodgr87	cmi7kyt3u00z9106uo8d5zvx2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 11:33:15	\N	\N	    	2025-11-20 15:22:51.742	2025-11-20 15:22:51.742
cmi7kytuh00zf106uq1ltq5bs	cmi7kytuc00zd106u58zhw67i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 11:33:24	\N	\N	    	2025-11-20 15:22:52.697	2025-11-20 15:22:52.697
cmi7kyv8m00zj106ucwuwc162	cmi7kyv8j00zh106uattd1y7n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 11:33:26	\N	\N	    	2025-11-20 15:22:54.503	2025-11-20 15:22:54.503
cmi7kyxxa00zn106u9o4s8zfm	cmi7kyxwy00zl106uwtec26ov	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 11:33:30	\N	\N	    	2025-11-20 15:22:57.981	2025-11-20 15:22:57.981
cmi7kyyf100zr106uimdqmos1	cmi7kyyeq00zp106u3yhovc3s	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 11:33:51	\N	\N	    	2025-11-20 15:22:58.621	2025-11-20 15:22:58.621
cmi7kyypw00zv106ugxvyddzv	cmi7kyypn00zt106uz7wxh7zr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 11:34:01	\N	\N	    	2025-11-20 15:22:59.012	2025-11-20 15:22:59.012
cmi7kyzbz00zz106uuu0tgbe0	cmi7kyzbq00zx106u32yzeazt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 11:33:58	\N	\N	    	2025-11-20 15:22:59.807	2025-11-20 15:22:59.807
cmi7kz1fj0103106ud0ezn99g	cmi7kz1fe0101106u5j67v07a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 11:34:04	\N	\N	    	2025-11-20 15:23:02.527	2025-11-20 15:23:02.527
cmi7kz2ma0107106u1owsnlz9	cmi7kz2m00105106uginc5la9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 11:34:06	\N	\N	    	2025-11-20 15:23:04.066	2025-11-20 15:23:04.066
cmi7kz2yf010b106ub0lbqzml	cmi7kz2y50109106ueihxywfg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 11:34:09	\N	\N	    	2025-11-20 15:23:04.503	2025-11-20 15:23:04.503
cmi7kz3lb010f106uwjg84kdp	cmi7kz3l8010d106u6r8ii9bh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:34:13	\N	\N	    	2025-11-20 15:23:05.327	2025-11-20 15:23:05.327
cmi7kz49i010j106ulu38vq2p	cmi7kz49f010h106upu3bsdso	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:34:28	\N	\N	    	2025-11-20 15:23:06.198	2025-11-20 15:23:06.198
cmi7kz6rk010n106uc6ujbvm7	cmi7kz6rg010l106utjm8p8jt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:34:30	\N	\N	    	2025-11-20 15:23:09.44	2025-11-20 15:23:09.44
cmi7kz7uh010r106ue23yxicg	cmi7kz7u7010p106ufpymmve0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:34:33	\N	\N	    	2025-11-20 15:23:10.84	2025-11-20 15:23:10.84
cmi7kz7x3010v106umth2oz9e	cmi7kz7x0010t106ua3ilujgq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:34:35	\N	\N	    	2025-11-20 15:23:10.936	2025-11-20 15:23:10.936
cmi7kz824010z106uzac8yodv	cmi7kz821010x106un9zbtny9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:34:38	\N	\N	    	2025-11-20 15:23:11.116	2025-11-20 15:23:11.116
cmi7kzasa0113106u2chttre5	cmi7kzas60111106urqwdavao	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:34:41	\N	\N	    	2025-11-20 15:23:14.651	2025-11-20 15:23:14.651
cmi7kzc2r0117106u8nn2qkol	cmi7kzc2l0115106uh99ddgs3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:34:43	\N	\N	    	2025-11-20 15:23:16.322	2025-11-20 15:23:16.322
cmi7kzd5r011b106uu7rz4a82	cmi7kzd5n0119106ufkarbv7l	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:34:45	\N	\N	    	2025-11-20 15:23:17.727	2025-11-20 15:23:17.727
cmi7kzd9r011f106uzhultf85	cmi7kzd9i011d106uqcgniie0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:34:49	\N	\N	    	2025-11-20 15:23:17.871	2025-11-20 15:23:17.871
cmi7kzehd011j106uw5tyn6f3	cmi7kzeh3011h106u80azvlch	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:04	\N	\N	    	2025-11-20 15:23:19.44	2025-11-20 15:23:19.44
cmi7kzieg011n106ubgcfpwtp	cmi7kzie2011l106u8gvrebqn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:09	\N	\N	    	2025-11-20 15:23:24.52	2025-11-20 15:23:24.52
cmi7kzj81011r106ugfh0bkig	cmi7kzj7w011p106uapmvt8it	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:16	\N	\N	    	2025-11-20 15:23:25.585	2025-11-20 15:23:25.585
cmi7kzj9z011v106ufj7wsjgr	cmi7kzj9w011t106u73aaj4ts	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:14	\N	\N	    	2025-11-20 15:23:25.656	2025-11-20 15:23:25.656
cmi7kzje4011z106u7m7wvqzg	cmi7kzjdw011x106ui4dc5o1m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:11	\N	\N	    	2025-11-20 15:23:25.804	2025-11-20 15:23:25.804
cmi7kzmn60123106uvyvyx61h	cmi7kzmn10121106uvvv54brl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:19	\N	\N	    	2025-11-20 15:23:30.018	2025-11-20 15:23:30.018
cmi7kzor70127106u8qjgdp3w	cmi7kzor40125106uyxjgb1u6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:22	\N	\N	    	2025-11-20 15:23:32.756	2025-11-20 15:23:32.756
cmi7kzp6t012b106ucsmdeccv	cmi7kzp6q0129106u0668q31u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:37:25	\N	\N	    	2025-11-20 15:23:33.317	2025-11-20 15:23:33.317
cmi7kzpf8012f106ujr5nlbns	cmi7kzpf5012d106uwi04gu6f	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:37:28	\N	\N	    	2025-11-20 15:23:33.621	2025-11-20 15:23:33.621
cmi7kzqbm012j106uya1d35sg	cmi7kzqbe012h106ui4o4xe87	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 11:37:33	\N	\N	    	2025-11-20 15:23:34.786	2025-11-20 15:23:34.786
cmi7kzudj012n106uddp0kpgg	cmi7kzudf012l106ub09wrp7c	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:37:37	\N	\N	    	2025-11-20 15:23:40.039	2025-11-20 15:23:40.039
cmi7kzv88012r106u0hlj92ik	cmi7kzv85012p106uz8vmyejn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:37:45	\N	\N	    	2025-11-20 15:23:41.145	2025-11-20 15:23:41.145
cmi7kzva1012v106utsfd5515	cmi7kzv9u012t106unmcuctci	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:37:54	\N	\N	    	2025-11-20 15:23:41.209	2025-11-20 15:23:41.209
cmi7kzvwt012z106u4q8rxgup	cmi7kzvwp012x106u8erh2ms1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:37:48	\N	\N	    	2025-11-20 15:23:42.029	2025-11-20 15:23:42.029
cmi7kzxk90133106uulan3z4c	cmi7kzxk00131106uziqv97a4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:37:58	\N	\N	    	2025-11-20 15:23:44.169	2025-11-20 15:23:44.169
cmi7kzz670137106u7ij2qjpz	cmi7kzz600135106u8f20w4va	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:38:32	\N	\N	    	2025-11-20 15:23:46.255	2025-11-20 15:23:46.255
cmi7kzzwu013b106unab6iuvt	cmi7kzzwq0139106ugxbrzvj9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 11:38:35	\N	\N	    	2025-11-20 15:23:47.214	2025-11-20 15:23:47.214
cmi7l001b013f106utel8lrfx	cmi7l0012013d106ua15gyn62	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:38:47	\N	\N	    	2025-11-20 15:23:47.374	2025-11-20 15:23:47.374
cmi7l01ii013j106uwhqshua8	cmi7l01if013h106uc4v0xvqb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:38:50	\N	\N	    	2025-11-20 15:23:49.29	2025-11-20 15:23:49.29
cmi7l02ia013n106uzt9klhxf	cmi7l02i7013l106usxfjeod5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:38:52	\N	\N	    	2025-11-20 15:23:50.579	2025-11-20 15:23:50.579
cmi7l04tt013r106ucjgs0jpd	cmi7l04tp013p106usqj3etem	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:39:00	\N	\N	    	2025-11-20 15:23:53.585	2025-11-20 15:23:53.585
cmi7l04z3013v106u8wu0b5g9	cmi7l04yx013t106u9bf3iwln	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:38:55	\N	\N	    	2025-11-20 15:23:53.775	2025-11-20 15:23:53.775
cmi7l050t013z106ubujm87nx	cmi7l050p013x106uaq4yuin5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 11:38:57	\N	\N	    	2025-11-20 15:23:53.837	2025-11-20 15:23:53.837
cmi7l06gm0143106u1826ntiy	cmi7l06gc0141106uee17eqqs	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:39:56	\N	\N	    	2025-11-20 15:23:55.702	2025-11-20 15:23:55.702
cmi7l07xx0147106u2qcwg1b8	cmi7l07xo0145106urkwkdcea	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	32	2025-11-19 11:40:00	\N	\N	    	2025-11-20 15:23:57.621	2025-11-20 15:23:57.621
cmi7l08mq014b106uf0qtqwmg	cmi7l08mh0149106urm8waion	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	32	2025-11-19 11:40:05	\N	\N	    	2025-11-20 15:23:58.514	2025-11-20 15:23:58.514
cmi7l098b014f106uw0hwlh0t	cmi7l0988014d106u08g2kt9t	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	32	2025-11-19 11:40:02	\N	\N	    	2025-11-20 15:23:59.292	2025-11-20 15:23:59.292
cmi7l0a0v014j106uob5r10sj	cmi7l0a0l014h106unsrqua6y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:40:09	\N	\N	    	2025-11-20 15:24:00.318	2025-11-20 15:24:00.318
cmi7l0bvz014n106uv6fu9ebt	cmi7l0bvq014l106uaw0tuzve	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 11:40:18	\N	\N	    	2025-11-20 15:24:02.735	2025-11-20 15:24:02.735
cmi7l0cas014r106uak8kuj8k	cmi7l0cai014p106u8ym6riv3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:40:12	\N	\N	    	2025-11-20 15:24:03.267	2025-11-20 15:24:03.267
cmi7l0dl9014v106uu5askkgx	cmi7l0dl6014t106uq34k6c81	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 11:40:28	\N	\N	    	2025-11-20 15:24:04.941	2025-11-20 15:24:04.941
cmi7l0f43014z106u1r9o3do6	cmi7l0f3t014x106uw3lfejhf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 11:41:23	\N	\N	    	2025-11-20 15:24:06.914	2025-11-20 15:24:06.914
cmi7l0fe50153106u7yhoi7l7	cmi7l0fdw0151106ujcwyruhe	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	50	2025-11-19 11:40:35	\N	\N	    	2025-11-20 15:24:07.277	2025-11-20 15:24:07.277
cmi7l0h0p0157106udcoqkigh	cmi7l0h0g0155106ue2gw9phv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	50	2025-11-19 11:41:38	\N	\N	    	2025-11-20 15:24:09.385	2025-11-20 15:24:09.385
cmi7l0h3i015b106u9hb4cmfu	cmi7l0h3f0159106u0ckhwu80	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 11:41:27	\N	\N	    	2025-11-20 15:24:09.486	2025-11-20 15:24:09.486
cmi7l0ida015f106ufe8c5lfn	cmi7l0id0015d106u72dtdio3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	42	2025-11-19 11:41:46	\N	\N	    	2025-11-20 15:24:11.133	2025-11-20 15:24:11.133
cmi7l0iv3015j106ue8ev6zvj	cmi7l0ius015h106usz47slsu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	42	2025-11-19 11:41:49	\N	\N	    	2025-11-20 15:24:11.774	2025-11-20 15:24:11.774
cmi7l0kq5015n106ug77q2cm1	cmi7l0kq2015l106u5rtgjusv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	42	2025-11-19 11:41:52	\N	\N	    	2025-11-20 15:24:14.189	2025-11-20 15:24:14.189
cmi7l0mit015r106uphh2c2co	cmi7l0mip015p106urjdxj6os	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:42:01	\N	\N	    	2025-11-20 15:24:16.517	2025-11-20 15:24:16.517
cmi7l0nad015v106uxo693vsm	cmi7l0na3015t106u0cvjgccw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:42:12	\N	\N	    	2025-11-20 15:24:17.509	2025-11-20 15:24:17.509
cmi7l0ocm015z106ush78koeo	cmi7l0ocd015x106urgmd4odw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:42:07	\N	\N	    	2025-11-20 15:24:18.885	2025-11-20 15:24:18.885
cmi7l0p4k0163106u6o0375zn	cmi7l0p4a0161106uju1o8z1p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:42:18	\N	\N	    	2025-11-20 15:24:19.892	2025-11-20 15:24:19.892
cmi7l0qlw0167106uwe9yhb5n	cmi7l0qls0165106ur437valr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 11:42:21	\N	\N	    	2025-11-20 15:24:21.812	2025-11-20 15:24:21.812
cmi7l0rxa016b106ueg2ame8k	cmi7l0rx70169106u3643d7ms	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	31	2025-11-19 11:43:49	\N	\N	    	2025-11-20 15:24:23.518	2025-11-20 15:24:23.518
cmi7l0slz016f106ue7jmim5d	cmi7l0slq016d106u0k3ae2en	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	48	2025-11-19 11:42:26	\N	\N	    	2025-11-20 15:24:24.407	2025-11-20 15:24:24.407
cmi7l0sy9016j106u0ww27xkr	cmi7l0sy4016h106u5aj62nwn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	31	2025-11-19 11:44:03	\N	\N	    	2025-11-20 15:24:24.849	2025-11-20 15:24:24.849
cmi7l0tv2016n106uz9fhsqdf	cmi7l0tuz016l106uuldzbs44	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:07	\N	\N	    	2025-11-20 15:24:26.03	2025-11-20 15:24:26.03
cmi7l0vk6016r106uft2ghons	cmi7l0vjx016p106ucp6ladzl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:10	\N	\N	    	2025-11-20 15:24:28.23	2025-11-20 15:24:28.23
cmi7l0vx6016v106ur0gyg2he	cmi7l0vwx016t106uawvs1xfj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:13	\N	\N	    	2025-11-20 15:24:28.698	2025-11-20 15:24:28.698
cmi7l0wba016z106ufvtdo87n	cmi7l0wb7016x106ui2qk3bbq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:15	\N	\N	    	2025-11-20 15:24:29.206	2025-11-20 15:24:29.206
cmi7l0xdb0173106uede1ws5y	cmi7l0xd60171106uqjypw9jo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:18	\N	\N	    	2025-11-20 15:24:30.575	2025-11-20 15:24:30.575
cmi7l0yxh0177106uz653jtmj	cmi7l0yxe0175106u76xy3d0y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:20	\N	\N	    	2025-11-20 15:24:32.598	2025-11-20 15:24:32.598
cmi7l0zkr017b106ujfuim9dz	cmi7l0zko0179106u6rx8byul	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:30	\N	\N	    	2025-11-20 15:24:33.435	2025-11-20 15:24:33.435
cmi7l10e3017f106ukmw70n6h	cmi7l10dq017d106ubhvsyz4p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:35	\N	\N	    	2025-11-20 15:24:34.491	2025-11-20 15:24:34.491
cmi7l11hw017j106ut1kk35q1	cmi7l11hs017h106uoaptf27r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:39	\N	\N	    	2025-11-20 15:24:35.924	2025-11-20 15:24:35.924
cmi7l12nv017n106ult2zq5y5	cmi7l12nj017l106u48672dwq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:44	\N	\N	    	2025-11-20 15:24:37.435	2025-11-20 15:24:37.435
cmi7l12qi017r106urvcitov7	cmi7l12qf017p106uupuyrl15	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:42	\N	\N	    	2025-11-20 15:24:37.531	2025-11-20 15:24:37.531
cmi7l13g2017v106ul8i0r1al	cmi7l13ft017t106uzmvcqwbo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 11:44:50	\N	\N	    	2025-11-20 15:24:38.45	2025-11-20 15:24:38.45
cmi7l15i0017z106uf3icimkr	cmi7l15hv017x106ua14vnpbr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:44:52	\N	\N	    	2025-11-20 15:24:41.112	2025-11-20 15:24:41.112
cmi7l176o0183106u5ya7v7qi	cmi7l176l0181106urwrezj5x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:14	\N	\N	    	2025-11-20 15:24:43.297	2025-11-20 15:24:43.297
cmi7l17b00187106uv0tytjrx	cmi7l17au0185106u1rssuzju	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:08	\N	\N	    	2025-11-20 15:24:43.452	2025-11-20 15:24:43.452
cmi7l17f0018b106uvaj4sph8	cmi7l17er0189106uuxpnybz5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:12	\N	\N	    	2025-11-20 15:24:43.596	2025-11-20 15:24:43.596
cmi7l18va018f106udyp2swyq	cmi7l18uy018d106u81zewuku	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:17	\N	\N	    	2025-11-20 15:24:45.477	2025-11-20 15:24:45.477
cmi7l1b8t018j106uzvkn38nj	cmi7l1b8q018h106u7c70ae9m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:22	\N	\N	    	2025-11-20 15:24:48.558	2025-11-20 15:24:48.558
cmi7l1bfb018n106uu5hsamae	cmi7l1bf7018l106um6e2lsso	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:27	\N	\N	    	2025-11-20 15:24:48.791	2025-11-20 15:24:48.791
cmi7l1c44018r106utzzzhio8	cmi7l1c3v018p106uxyasij49	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:45:24	\N	\N	    	2025-11-20 15:24:49.684	2025-11-20 15:24:49.684
cmi7l1d61018v106ue2q8b6s1	cmi7l1d5s018t106u1wbqfax9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	45	2025-11-19 11:45:30	\N	\N	    	2025-11-20 15:24:51.049	2025-11-20 15:24:51.049
cmi7l1fvr018z106u4oh6vdge	cmi7l1fvp018x106uvln6nzl1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	45	2025-11-19 11:45:33	\N	\N	    	2025-11-20 15:24:54.568	2025-11-20 15:24:54.568
cmi7l1fy70193106uugz6x8l0	cmi7l1fy40191106ukualwssc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	50	2025-11-19 11:45:40	\N	\N	    	2025-11-20 15:24:54.655	2025-11-20 15:24:54.655
cmi7l1gbd0197106upb6xchdp	cmi7l1gb40195106u1591aa0r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	53	2025-11-19 11:45:46	\N	\N	    	2025-11-20 15:24:55.128	2025-11-20 15:24:55.128
cmi7l1h5v019b106u0rrtg4os	cmi7l1h5r0199106uu6bi5ari	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:45:52	\N	\N	    	2025-11-20 15:24:56.227	2025-11-20 15:24:56.227
cmi7l1l3l019f106ui21fd0lj	cmi7l1l3c019d106uxquxun8b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	47	2025-11-19 11:46:03	\N	\N	    	2025-11-20 15:25:01.329	2025-11-20 15:25:01.329
cmi7l1lc7019j106uhfk3cxap	cmi7l1lc3019h106us0cdntm0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	47	2025-11-19 11:46:06	\N	\N	    	2025-11-20 15:25:01.639	2025-11-20 15:25:01.639
cmi7l1lxd019n106ujvgrjaek	cmi7l1lx5019l106uemr2sews	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:46:42	\N	\N	    	2025-11-20 15:25:02.401	2025-11-20 15:25:02.401
cmi7l1mik019r106ufsnhp90a	cmi7l1mib019p106uxrm81to0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:45:59	\N	\N	    	2025-11-20 15:25:03.164	2025-11-20 15:25:03.164
cmi7l1p5y019v106ugy3h2wo5	cmi7l1p5t019t106uhc88j0xk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	28	2025-11-19 11:46:46	\N	\N	    	2025-11-20 15:25:06.598	2025-11-20 15:25:06.598
cmi7l1ps4019z106up64pwprd	cmi7l1ps1019x106ua5b7zcdl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	28	2025-11-19 11:46:52	\N	\N	    	2025-11-20 15:25:07.396	2025-11-20 15:25:07.396
cmi7l1pvq01a3106uclwr74gj	cmi7l1pvg01a1106ugj70jcf8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	28	2025-11-19 11:46:49	\N	\N	    	2025-11-20 15:25:07.525	2025-11-20 15:25:07.525
cmi7l1q3o01a7106uzr5oi8nz	cmi7l1q3f01a5106u0h977jxg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 11:46:59	\N	\N	    	2025-11-20 15:25:07.811	2025-11-20 15:25:07.811
cmi7l1sd001ab106urz5ewrze	cmi7l1scw01a9106udszq2j0m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 11:47:02	\N	\N	    	2025-11-20 15:25:10.74	2025-11-20 15:25:10.74
cmi7l1tdo01af106uyifhivlo	cmi7l1tdf01ad106u12o958wf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 11:47:11	\N	\N	    	2025-11-20 15:25:12.06	2025-11-20 15:25:12.06
cmi7l1u3n01aj106ukv3gead4	cmi7l1u3e01ah106utfr2dqg6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	31	2025-11-19 11:47:14	\N	\N	    	2025-11-20 15:25:12.995	2025-11-20 15:25:12.995
cmi7l1uu001an106u00doyoeq	cmi7l1utq01al106uytk35c4i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 11:47:24	\N	\N	    	2025-11-20 15:25:13.943	2025-11-20 15:25:13.943
cmi7l1vqz01ar106utfczzzpc	cmi7l1vqp01ap106ujtsvw39b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 11:47:27	\N	\N	    	2025-11-20 15:25:15.13	2025-11-20 15:25:15.13
cmi7l1xvy01av106uxqb243ju	cmi7l1xvt01at106uudhk0iuw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 11:48:59	\N	\N	    	2025-11-20 15:25:17.902	2025-11-20 15:25:17.902
cmi7l1ytb01az106uq03y288f	cmi7l1ysu01ax106uz0iad3f7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	55	2025-11-19 11:47:37	\N	\N	    	2025-11-20 15:25:19.092	2025-11-20 15:25:19.092
cmi7l212p01b3106uer1grcbn	cmi7l212j01b1106uyxlgu1gk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:49:34	\N	\N	    	2025-11-20 15:25:22.034	2025-11-20 15:25:22.034
cmi7l213s01b7106urnf15x8a	cmi7l213o01b5106ueb9my0em	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:49:30	\N	\N	    	2025-11-20 15:25:22.073	2025-11-20 15:25:22.073
cmi7l22lm01bb106uqbuqt0pm	cmi7l22lg01b9106uj9czwujt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:49:39	\N	\N	    	2025-11-20 15:25:24.01	2025-11-20 15:25:24.01
cmi7l23kg01bf106uy28e9ela	cmi7l23k601bd106uu7hi35ss	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:49:36	\N	\N	    	2025-11-20 15:25:25.263	2025-11-20 15:25:25.263
cmi7l26ie01bj106u4cpyqtdx	cmi7l26i501bh106uva8z82wv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:50:32	\N	\N	    	2025-11-20 15:25:29.078	2025-11-20 15:25:29.078
cmi7l27cq01bn106u7dv848t2	cmi7l27cl01bl106uue1bpxnc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 11:50:10	\N	\N	    	2025-11-20 15:25:30.17	2025-11-20 15:25:30.17
cmi7l27ym01br106u29ny70lo	cmi7l27yd01bp106uiutx2e4c	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:50:39	\N	\N	    	2025-11-20 15:25:30.957	2025-11-20 15:25:30.957
cmi7l288501bv106ukgkf2hpn	cmi7l288101bt106uxzy3djzg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:50:35	\N	\N	    	2025-11-20 15:25:31.301	2025-11-20 15:25:31.301
cmi7l2avx01bz106u14mht9cj	cmi7l2avt01bx106u5t72kt8g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:50:43	\N	\N	    	2025-11-20 15:25:34.749	2025-11-20 15:25:34.749
cmi7l2b0501c3106ud5c6jpuj	cmi7l2azw01c1106u2952kkgj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:50:46	\N	\N	    	2025-11-20 15:25:34.901	2025-11-20 15:25:34.901
cmi7l2c1g01c7106uznvkltzj	cmi7l2c1901c5106upw3bwqhj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:50:48	\N	\N	    	2025-11-20 15:25:36.244	2025-11-20 15:25:36.244
cmi7l2dyr01cb106u8e68zqle	cmi7l2dy201c9106ubxqzjdap	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:50:52	\N	\N	    	2025-11-20 15:25:38.735	2025-11-20 15:25:38.735
cmi7l2g6901cf106uod0s4qsl	cmi7l2g6101cd106urgte0nl3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:50:59	\N	\N	    	2025-11-20 15:25:41.601	2025-11-20 15:25:41.601
cmi7l2gib01cj106u1tz5ndlt	cmi7l2gi701ch106uo9etz9rh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:50:56	\N	\N	    	2025-11-20 15:25:42.035	2025-11-20 15:25:42.035
cmi7l2inf01cn106ug9smqphk	cmi7l2inb01cl106uw6ds4ut8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	42	2025-11-19 11:51:09	\N	\N	    	2025-11-20 15:25:44.811	2025-11-20 15:25:44.811
cmi7l2j6t01cr106ubnba7jc8	cmi7l2j6i01cp106u76od9pra	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:51:01	\N	\N	    	2025-11-20 15:25:45.509	2025-11-20 15:25:45.509
cmi7l2kts01cv106uxjssp716	cmi7l2kti01ct106u0smv9tci	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 11:51:12	\N	\N	    	2025-11-20 15:25:47.632	2025-11-20 15:25:47.632
cmi7l2l0701cz106ufrmz1dwm	cmi7l2kzy01cx106uq6ne7u6r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 11:51:22	\N	\N	    	2025-11-20 15:25:47.863	2025-11-20 15:25:47.863
cmi7l2mgy01d3106uveder415	cmi7l2mgv01d1106upqqfhpe7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 11:51:24	\N	\N	    	2025-11-20 15:25:49.763	2025-11-20 15:25:49.763
cmi7l2njw01d7106ujes799jv	cmi7l2njn01d5106ur9r4nj3d	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 11:51:27	\N	\N	    	2025-11-20 15:25:51.164	2025-11-20 15:25:51.164
cmi7l2pml01db106u4qvzwe8l	cmi7l2pmh01d9106utm33wh3h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 11:51:34	\N	\N	    	2025-11-20 15:25:53.853	2025-11-20 15:25:53.853
cmi7l2q3n01df106umd680v16	cmi7l2q3k01dd106ufgu5j0ji	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 11:51:30	\N	\N	    	2025-11-20 15:25:54.467	2025-11-20 15:25:54.467
cmi7l2rvm01dj106u6l3ovv0t	cmi7l2rvj01dh106up81oyozz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:51:44	\N	\N	    	2025-11-20 15:25:56.771	2025-11-20 15:25:56.771
cmi7l2spe01dn106ui0b1gss5	cmi7l2sp501dl106ujbw9vz4p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:51:40	\N	\N	    	2025-11-20 15:25:57.842	2025-11-20 15:25:57.842
cmi7l2tl701dr106uyti4q7gj	cmi7l2tl201dp106uwtemk2kz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:56:25	\N	\N	    	2025-11-20 15:25:58.987	2025-11-20 15:25:58.987
cmi7l2tmm01dv106um4ney1ju	cmi7l2tmh01dt106ud6ih12mb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	44	2025-11-19 11:51:48	\N	\N	    	2025-11-20 15:25:59.038	2025-11-20 15:25:59.038
cmi7l2xyv01dz106umh84mtgs	cmi7l2xyn01dx106u6cyz4xec	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 11:56:58	\N	\N	    	2025-11-20 15:26:04.663	2025-11-20 15:26:04.663
cmi7l2zwc01e3106uksuwvhau	cmi7l2zw901e1106u7tzifsxo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	18	2025-11-19 11:57:45	\N	\N	    	2025-11-20 15:26:07.164	2025-11-20 15:26:07.164
cmi7l30lw01e7106umq7lqrxs	cmi7l30lr01e5106ugzqngsm8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	29	2025-11-19 11:58:29	\N	\N	    	2025-11-20 15:26:08.084	2025-11-20 15:26:08.084
cmi7l313x01eb106uykzkvmz0	cmi7l313n01e9106ucewk2qfd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	29	2025-11-19 11:59:00	\N	\N	    	2025-11-20 15:26:08.733	2025-11-20 15:26:08.733
cmi7l32t001ef106ucyv9b0wv	cmi7l32so01ed106ugl3ore9g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	29	2025-11-19 11:59:32	\N	\N	    	2025-11-20 15:26:10.932	2025-11-20 15:26:10.932
cmi7l338u01ej106uxqjinbkz	cmi7l338o01eh106un28b5lpi	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 11:59:41	\N	\N	    	2025-11-20 15:26:11.502	2025-11-20 15:26:11.502
cmi7l36wc01en106uuvp2ewn0	cmi7l36w701el106uz42wovcr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 11:59:44	\N	\N	    	2025-11-20 15:26:16.236	2025-11-20 15:26:16.236
cmi7l418301er106uf019ryvx	cmi7l417y01ep106ukjy2h8o2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	22	2025-11-19 12:03:59	\N	\N	    	2025-11-20 15:26:55.539	2025-11-20 15:26:55.539
cmi7l41al01ev106ue69yan5f	cmi7l41ai01et106u7g9gjvfu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	25	2025-11-19 12:04:02	\N	\N	    	2025-11-20 15:26:55.629	2025-11-20 15:26:55.629
cmi7l41r201ez106uv20mlwnv	cmi7l41qr01ex106ulzm3h0l9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	42	2025-11-19 12:03:16	\N	\N	    	2025-11-20 15:26:56.221	2025-11-20 15:26:56.221
cmi7l421a01f3106uwh03xe4a	cmi7l421501f1106uncnlgvyc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	42	2025-11-19 12:03:10	\N	\N	    	2025-11-20 15:26:56.591	2025-11-20 15:26:56.591
cmi7l42aa01f7106uaucuofq9	cmi7l429z01f5106uxngn7vb6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	25	2025-11-19 12:04:16	\N	\N	    	2025-11-20 15:26:56.914	2025-11-20 15:26:56.914
cmi7l42jg01fb106u5majcq5y	cmi7l42j601f9106uphlmoa3i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	25	2025-11-19 12:04:05	\N	\N	    	2025-11-20 15:26:57.244	2025-11-20 15:26:57.244
cmi7l45mg01ff106ug4od047k	cmi7l45ma01fd106up6xyve6v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	25	2025-11-19 12:04:19	\N	\N	    	2025-11-20 15:27:01.241	2025-11-20 15:27:01.241
cmi7l45os01fj106ue1o10zje	cmi7l45oo01fh106uhdnfki7y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:30	\N	\N	    	2025-11-20 15:27:01.324	2025-11-20 15:27:01.324
cmi7l46tn01fn106u6gyfgzby	cmi7l46tg01fl106u6nuwx5sh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:32	\N	\N	    	2025-11-20 15:27:02.795	2025-11-20 15:27:02.795
cmi7l48zu01fr106uqc3egnbw	cmi7l48zj01fp106ufj9wrwk5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	24	2025-11-19 12:04:26	\N	\N	    	2025-11-20 15:27:05.609	2025-11-20 15:27:05.609
cmi7l4bkt01fv106umf93pdkz	cmi7l4bki01ft106uw9k5x4av	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:36	\N	\N	    	2025-11-20 15:27:08.957	2025-11-20 15:27:08.957
cmi7l4bzi01fz106uds0mld43	cmi7l4bzd01fx106urovx5id4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:34	\N	\N	    	2025-11-20 15:27:09.487	2025-11-20 15:27:09.487
cmi7l4f6e01g3106uwx1442pi	cmi7l4f6a01g1106u4ml4lwwn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:41	\N	\N	    	2025-11-20 15:27:13.623	2025-11-20 15:27:13.623
cmi7l4f6l01g7106uhyxupw3f	cmi7l4f6i01g5106udwk759ps	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:39	\N	\N	    	2025-11-20 15:27:13.629	2025-11-20 15:27:13.629
cmi7l4fbu01gb106u7k6d8mty	cmi7l4fbq01g9106usii8zjek	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:04:44	\N	\N	    	2025-11-20 15:27:13.819	2025-11-20 15:27:13.819
cmi7l4hec01gf106u5aktw3j9	cmi7l4he101gd106udondvo4g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	50	2025-11-19 12:04:47	\N	\N	    	2025-11-20 15:27:16.499	2025-11-20 15:27:16.499
cmi7l4j7c01gj106uly4l4siu	cmi7l4j7701gh106uco3w8yw4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	50	2025-11-19 12:04:50	\N	\N	    	2025-11-20 15:27:18.84	2025-11-20 15:27:18.84
cmi7l4kr801gn106uskz919h8	cmi7l4kqw01gl106ufziy2gjn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	37	2025-11-19 12:05:00	\N	\N	    	2025-11-20 15:27:20.851	2025-11-20 15:27:20.851
cmi7l4kta01gr106u6c5195py	cmi7l4kt701gp106uq1m9qhux	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	37	2025-11-19 12:05:14	\N	\N	    	2025-11-20 15:27:20.927	2025-11-20 15:27:20.927
cmi7l4mei01gv106uhcf5qo2a	cmi7l4me901gt106uik8823f2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	47	2025-11-19 12:05:19	\N	\N	    	2025-11-20 15:27:22.986	2025-11-20 15:27:22.986
cmi7l4nc601gz106uw39rog60	cmi7l4nbw01gx106urwvcuqaj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	47	2025-11-19 12:05:33	\N	\N	    	2025-11-20 15:27:24.197	2025-11-20 15:27:24.197
cmi7l4qiw01h3106uizbog6jl	cmi7l4qim01h1106uxqozf4lr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	33	2025-11-19 12:05:41	\N	\N	    	2025-11-20 15:27:28.327	2025-11-20 15:27:28.327
cmi7l4qmk01h7106um1vstmvz	cmi7l4qmf01h5106uw7f0k8ty	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	45	2025-11-19 12:05:37	\N	\N	    	2025-11-20 15:27:28.46	2025-11-20 15:27:28.46
cmi7l4sev01hb106ufls6sd9h	cmi7l4sel01h9106uq2soc7je	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	25	2025-11-19 12:06:04	\N	\N	    	2025-11-20 15:27:30.774	2025-11-20 15:27:30.774
cmi7l4srn01hf106u39bl7j6o	cmi7l4sre01hd106ukcbeh61e	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	42	2025-11-19 12:05:44	\N	\N	    	2025-11-20 15:27:31.235	2025-11-20 15:27:31.235
cmi7l4vdn01hj106us8wx2hze	cmi7l4vdk01hh106uvct5p0jw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:06	\N	\N	    	2025-11-20 15:27:34.62	2025-11-20 15:27:34.62
cmi7l4vh601hn106u1fxtq7xc	cmi7l4vh301hl106u19fqaf4t	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:10	\N	\N	    	2025-11-20 15:27:34.746	2025-11-20 15:27:34.746
cmi7l4x0h01hr106ugzc8yvmm	cmi7l4x0801hp106uwfnas6w1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:28	\N	\N	    	2025-11-20 15:27:36.737	2025-11-20 15:27:36.737
cmi7l4x5601hv106ur1jjxgit	cmi7l4x4x01ht106u0nb5ug2b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:19	\N	\N	    	2025-11-20 15:27:36.906	2025-11-20 15:27:36.906
cmi7l4yy201hz106ufvvzkrgu	cmi7l4yxz01hx106ueb63w8c8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:31	\N	\N	    	2025-11-20 15:27:39.242	2025-11-20 15:27:39.242
cmi7l4zpw01i3106uhuihwq2j	cmi7l4zpn01i1106uya3t2gx6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:36	\N	\N	    	2025-11-20 15:27:40.244	2025-11-20 15:27:40.244
cmi7l50b001i7106u0ingbt0c	cmi7l50ar01i5106uo9rd4nzz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:39	\N	\N	    	2025-11-20 15:27:41.004	2025-11-20 15:27:41.004
cmi7l50th01ib106uw3c276wo	cmi7l50te01i9106us8o4j0ca	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	26	2025-11-19 12:06:51	\N	\N	    	2025-11-20 15:27:41.669	2025-11-20 15:27:41.669
cmi7l5bb901if106u01h2k3ri	cmi7l5bb601id106u820gi3yt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:07:53	\N	\N	    	2025-11-20 15:27:55.269	2025-11-20 15:27:55.269
cmi7l5blv01ij106ueagg1cfo	cmi7l5blp01ih106u397q2j1o	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:09	\N	\N	    	2025-11-20 15:27:55.651	2025-11-20 15:27:55.651
cmi7l5mxu01in106ulp6qctoc	cmi7l5mxr01il106uw1tpg3l6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:24	\N	\N	    	2025-11-20 15:28:10.338	2025-11-20 15:28:10.338
cmi7l5nen01ir106uo7stb4jm	cmi7l5nej01ip106u1jo0s9sy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:22	\N	\N	    	2025-11-20 15:28:10.943	2025-11-20 15:28:10.943
cmi7l5nhj01iv106u8egfv73j	cmi7l5nhe01it106u5h7cfyk7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:26	\N	\N	    	2025-11-20 15:28:11.047	2025-11-20 15:28:11.047
cmi7l5nr001iz106uhnsxzvjd	cmi7l5nqq01ix106ua9scrq5m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:29	\N	\N	    	2025-11-20 15:28:11.388	2025-11-20 15:28:11.388
cmi7l5qje01j3106ux8icknky	cmi7l5qj801j1106uxt2lyr31	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:32	\N	\N	    	2025-11-20 15:28:15.002	2025-11-20 15:28:15.002
cmi7l5rnu01j7106uy10rjl6k	cmi7l5rnr01j5106uw643uc29	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:34	\N	\N	    	2025-11-20 15:28:16.458	2025-11-20 15:28:16.458
cmi7l5sg801jb106um00s2nwb	cmi7l5sg401j9106u74cwayhw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	32	2025-11-19 12:08:46	\N	\N	    	2025-11-20 15:28:17.48	2025-11-20 15:28:17.48
cmi7l5smn01jf106uh786eb7d	cmi7l5sme01jd106u9zm4e5fx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	28	2025-11-19 12:08:41	\N	\N	    	2025-11-20 15:28:17.711	2025-11-20 15:28:17.711
cmi7l5vh001jj106u3sg7ul4a	cmi7l5vgv01jh106uuq70xuix	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	32	2025-11-19 12:08:48	\N	\N	    	2025-11-20 15:28:21.396	2025-11-20 15:28:21.396
cmi7l60th01jn106uhyyryxzu	cmi7l60te01jl106uldkguj2v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	32	2025-11-19 12:08:53	\N	\N	    	2025-11-20 15:28:28.325	2025-11-20 15:28:28.325
cmi7l62rc01jr106up59cn7rq	cmi7l62r801jp106uu4g1qmwm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	320	22.00	1/125	32	2025-11-19 12:08:57	\N	\N	    	2025-11-20 15:28:30.841	2025-11-20 15:28:30.841
cmi7l63t001jv106uxnti9mqd	cmi7l63sp01jt106up8iiz770	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:09:17	\N	\N	    	2025-11-20 15:28:32.195	2025-11-20 15:28:32.195
cmi7l63ux01jz106ulbk4ecrd	cmi7l63un01jx106u0pk96qs5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:09:27	\N	\N	    	2025-11-20 15:28:32.265	2025-11-20 15:28:32.265
cmi7l63xw01k3106urfg0esum	cmi7l63xj01k1106ul2ixx2ds	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:09:24	\N	\N	    	2025-11-20 15:28:32.372	2025-11-20 15:28:32.372
cmi7l66hy01k7106u1y4cofpy	cmi7l66hr01k5106ux0k92nls	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 12:09:36	\N	\N	    	2025-11-20 15:28:35.686	2025-11-20 15:28:35.686
cmi7l66nj01kb106u2bzdowma	cmi7l66n801k9106uodg8xd76	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	48	2025-11-19 12:09:30	\N	\N	    	2025-11-20 15:28:35.887	2025-11-20 15:28:35.887
cmi7l677a01kf106unin8s0jo	cmi7l676y01kd106u23lc4fui	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 12:09:40	\N	\N	    	2025-11-20 15:28:36.597	2025-11-20 15:28:36.597
cmi7l679301kj106un8boq7me	cmi7l679001kh106u0lwday6c	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:09:55	\N	\N	    	2025-11-20 15:28:36.663	2025-11-20 15:28:36.663
cmi7l6d9q01kn106ueme9dsed	cmi7l6d9i01kl106uulnki8vq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:09:58	\N	\N	    	2025-11-20 15:28:44.463	2025-11-20 15:28:44.463
cmi7l6eii01kr106uqxs6pba6	cmi7l6ei701kp106uz3c5gn53	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	26	2025-11-19 12:10:10	\N	\N	    	2025-11-20 15:28:46.074	2025-11-20 15:28:46.074
cmi7l6ev901kv106u0f3xrwx9	cmi7l6ev401kt106uole9getx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:10:07	\N	\N	    	2025-11-20 15:28:46.534	2025-11-20 15:28:46.534
cmi7l6fw701kz106u0labpu36	cmi7l6fw201kx106ui6kvwdrt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 12:10:15	\N	\N	    	2025-11-20 15:28:47.863	2025-11-20 15:28:47.863
cmi7l6gog01l3106u8mcdz51i	cmi7l6gob01l1106us8eswjm1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 12:10:22	\N	\N	    	2025-11-20 15:28:48.88	2025-11-20 15:28:48.88
cmi7l6vj201l7106uful12osi	cmi7l6vix01l5106uwzqrprbq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:14	\N	\N	    	2025-11-20 15:29:08.126	2025-11-20 15:29:08.126
cmi7l6w7901lb106uufycj9p8	cmi7l6w6z01l9106urwn70bgi	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:03	\N	\N	    	2025-11-20 15:29:08.997	2025-11-20 15:29:08.997
cmi7l6wm301lf106ugm7d6m2r	cmi7l6wlu01ld106un7cstxg0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:18	\N	\N	    	2025-11-20 15:29:09.531	2025-11-20 15:29:09.531
cmi7l6xly01lj106um704n349	cmi7l6xlv01lh106us1kpaf0b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:21	\N	\N	    	2025-11-20 15:29:10.822	2025-11-20 15:29:10.822
cmi7l6y9c01ln106uo7kshy4o	cmi7l6y9801ll106ugqqrpp0x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:36	\N	\N	    	2025-11-20 15:29:11.664	2025-11-20 15:29:11.664
cmi7l6z6401lr106ukg2m0weg	cmi7l6z5u01lp106uszf8x79k	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:33	\N	\N	    	2025-11-20 15:29:12.843	2025-11-20 15:29:12.843
cmi7l6zsa01lv106u18o2tuua	cmi7l6zs001lt106urasorpj6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:13:40	\N	\N	    	2025-11-20 15:29:13.641	2025-11-20 15:29:13.641
cmi7l6zt501lz106utue9zpg1	cmi7l6zt001lx106unvidy9fo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:11:39	\N	\N	    	2025-11-20 15:29:13.673	2025-11-20 15:29:13.673
cmi7l70zk01m3106ugi29p95e	cmi7l70zh01m1106uuiqmxm9x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:13:54	\N	\N	    	2025-11-20 15:29:15.201	2025-11-20 15:29:15.201
cmi7l71se01m7106urlsas80x	cmi7l71sa01m5106ufcca8jkz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:13:57	\N	\N	    	2025-11-20 15:29:16.238	2025-11-20 15:29:16.238
cmi7l73u501mb106ukdwu1hui	cmi7l73u101m9106ukuudnp8f	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:24	\N	\N	    	2025-11-20 15:29:18.893	2025-11-20 15:29:18.893
cmi7l73wt01mf106u4eev2ej3	cmi7l73wq01md106u6899kzt0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:01	\N	\N	    	2025-11-20 15:29:18.989	2025-11-20 15:29:18.989
cmi7l74d901mj106uzdhgy130	cmi7l74d501mh106ud1znitkg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:27	\N	\N	    	2025-11-20 15:29:19.582	2025-11-20 15:29:19.582
cmi7l74ka01mn106u8orxdhil	cmi7l74k001ml106uhb9si6mp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:07	\N	\N	    	2025-11-20 15:29:19.833	2025-11-20 15:29:19.833
cmi7l76xc01mr106u04i1yawv	cmi7l76wy01mp106u5wd7ukbl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:30	\N	\N	    	2025-11-20 15:29:22.896	2025-11-20 15:29:22.896
cmi7l772501mv106ue13e1rzc	cmi7l771x01mt106u0hkbnkgu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:34	\N	\N	    	2025-11-20 15:29:23.069	2025-11-20 15:29:23.069
cmi7l77aw01mz106uwmvhwjwo	cmi7l77ar01mx106uqy4dnqwp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:14:43	\N	\N	    	2025-11-20 15:29:23.384	2025-11-20 15:29:23.384
cmi7l77pa01n3106uhupivhz1	cmi7l77p601n1106uwzetdnco	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:14:39	\N	\N	    	2025-11-20 15:29:23.902	2025-11-20 15:29:23.902
cmi7l79vp01n7106uk27x8bqb	cmi7l79vk01n5106u8ntqr59k	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:15:29	\N	\N	    	2025-11-20 15:29:26.725	2025-11-20 15:29:26.725
cmi7l7hyb01nb106u0oj09f0s	cmi7l7hy201n9106umk3ikah8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:15:33	\N	\N	    	2025-11-20 15:29:37.187	2025-11-20 15:29:37.187
cmi7l7l2l01nf106ugq4jadeb	cmi7l7l2g01nd106u24hkko6z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:16:18	\N	\N	    	2025-11-20 15:29:41.229	2025-11-20 15:29:41.229
cmi7l7l7g01nj106uiaf90sh4	cmi7l7l7d01nh106uoc6smqd3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:16:25	\N	\N	    	2025-11-20 15:29:41.405	2025-11-20 15:29:41.405
cmi7l7liu01nn106u11j4zc2w	cmi7l7lir01nl106uzmk6wuky	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:16:54	\N	\N	    	2025-11-20 15:29:41.815	2025-11-20 15:29:41.815
cmi7l7lmo01nr106u49b9biv3	cmi7l7lmj01np106ue53elcx7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:16:21	\N	\N	    	2025-11-20 15:29:41.953	2025-11-20 15:29:41.953
cmi7l7peo01nv106utsk34tgq	cmi7l7pel01nt106ud37p80l4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:17:04	\N	\N	    	2025-11-20 15:29:46.849	2025-11-20 15:29:46.849
cmi7l7qs001nz106ufdz0uzg1	cmi7l7qrv01nx106u6bdzhiof	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:17:07	\N	\N	    	2025-11-20 15:29:48.624	2025-11-20 15:29:48.624
cmi7l7r6j01o3106u7bgczks8	cmi7l7r6901o1106uww6scpxb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:17:10	\N	\N	    	2025-11-20 15:29:49.146	2025-11-20 15:29:49.146
cmi7l7rtf01o7106ubvvip4ef	cmi7l7rt601o5106uo5iuh5yu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:17:17	\N	\N	    	2025-11-20 15:29:49.971	2025-11-20 15:29:49.971
cmi7l7saz01ob106umn7h312k	cmi7l7saq01o9106u3t3zur70	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:17:36	\N	\N	    	2025-11-20 15:29:50.603	2025-11-20 15:29:50.603
cmi7l7u4k01of106uuqo0r0ul	cmi7l7u4d01od106u822r6yoj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	53	2025-11-19 12:18:07	\N	\N	    	2025-11-20 15:29:52.964	2025-11-20 15:29:52.964
cmi7l7u9n01oj106ukel7rwr3	cmi7l7u9k01oh106uousy0kqy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 12:18:11	\N	\N	    	2025-11-20 15:29:53.148	2025-11-20 15:29:53.148
cmi7l7v0o01on106uoebn57on	cmi7l7v0k01ol106uigmwpoqh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 12:18:14	\N	\N	    	2025-11-20 15:29:54.12	2025-11-20 15:29:54.12
cmi7l7vzd01or106uuwge5a76	cmi7l7vz401op106ucpxybm10	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 12:18:19	\N	\N	    	2025-11-20 15:29:55.369	2025-11-20 15:29:55.369
cmi7l7xcx01ov106uoenhp3jh	cmi7l7xcm01ot106u9o0hnpog	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:10	\N	\N	    	2025-11-20 15:29:57.152	2025-11-20 15:29:57.152
cmi7l7yce01oz106uo53m1ter	cmi7l7ycc01ox106uy1xugmce	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:27	\N	\N	    	2025-11-20 15:29:58.431	2025-11-20 15:29:58.431
cmi7l7z7s01p3106uij7z9qlg	cmi7l7z7n01p1106uj7m9pgft	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:35	\N	\N	    	2025-11-20 15:29:59.56	2025-11-20 15:29:59.56
cmi7l7za001p7106u0p7qr6ze	cmi7l7z9x01p5106ux3ctm0ce	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:18	\N	\N	    	2025-11-20 15:29:59.64	2025-11-20 15:29:59.64
cmi7l80ou01pb106u6xwlqvw5	cmi7l80op01p9106ulh6bbwej	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:39	\N	\N	    	2025-11-20 15:30:01.471	2025-11-20 15:30:01.471
cmi7l839b01pf106uzm2nfuj4	cmi7l839101pd106ukh5mhdzy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:49	\N	\N	    	2025-11-20 15:30:04.798	2025-11-20 15:30:04.798
cmi7l85db01pj106urujhrkge	cmi7l85d601ph106ukmtpcn6j	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:58	\N	\N	    	2025-11-20 15:30:07.536	2025-11-20 15:30:07.536
cmi7l85yd01pn106uubz6rj15	cmi7l85y901pl106ujq0wj4wd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 12:22:04	\N	\N	    	2025-11-20 15:30:08.294	2025-11-20 15:30:08.294
cmi7l866z01pr106uyj9ron0l	cmi7l866w01pp106ummn463f2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:21:53	\N	\N	    	2025-11-20 15:30:08.603	2025-11-20 15:30:08.603
cmi7l87gx01pv106ushokb6x9	cmi7l87gu01pt106ueq6q6xrj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 12:22:20	\N	\N	    	2025-11-20 15:30:10.257	2025-11-20 15:30:10.257
cmi7l888n01pz106ujvzdxolb	cmi7l888e01px106uimm4ko7z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 12:22:25	\N	\N	    	2025-11-20 15:30:11.255	2025-11-20 15:30:11.255
cmi7l89cx01q3106ulfwsktbd	cmi7l89ct01q1106uieoqfilx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:22:39	\N	\N	    	2025-11-20 15:30:12.705	2025-11-20 15:30:12.705
cmi7l89gw01q7106ubnmnhy7l	cmi7l89gn01q5106u8fnensxg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:22:35	\N	\N	    	2025-11-20 15:30:12.848	2025-11-20 15:30:12.848
cmi7l8ajd01qb106u4uxw05p8	cmi7l8aja01q9106upyso13yf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:23:13	\N	\N	    	2025-11-20 15:30:14.233	2025-11-20 15:30:14.233
cmi7l8bz401qf106ugpac1zad	cmi7l8byv01qd106ur4mudb9h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:23:17	\N	\N	    	2025-11-20 15:30:16.096	2025-11-20 15:30:16.096
cmi7l8ekk01qj106ux969p4w0	cmi7l8ekb01qh106u3vbj2kb8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	29	2025-11-19 12:23:21	\N	\N	    	2025-11-20 15:30:19.459	2025-11-20 15:30:19.459
cmi7l8fq401qn106us2eo9j1n	cmi7l8fpz01ql106uzj9q01yp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 12:23:38	\N	\N	    	2025-11-20 15:30:20.956	2025-11-20 15:30:20.956
cmi7l8fqb01qr106u0ris297c	cmi7l8fq801qp106uzfkz6cuu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	25	2025-11-19 12:23:32	\N	\N	    	2025-11-20 15:30:20.963	2025-11-20 15:30:20.963
cmi7l8gvp01qv106umamqu0jw	cmi7l8gvm01qt106uwuyjv0fx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 12:24:16	\N	\N	    	2025-11-20 15:30:22.453	2025-11-20 15:30:22.453
cmi7l8jl001qz106udencmn4y	cmi7l8jkv01qx106ulthv8oz3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 12:24:20	\N	\N	    	2025-11-20 15:30:25.956	2025-11-20 15:30:25.956
cmi7l8jyq01r3106uwe147gur	cmi7l8jyg01r1106urup8ih7o	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:24:54	\N	\N	    	2025-11-20 15:30:26.45	2025-11-20 15:30:26.45
cmi7l8kky01r7106u236dp0ot	cmi7l8kks01r5106uhz894jb0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 12:24:29	\N	\N	    	2025-11-20 15:30:27.25	2025-11-20 15:30:27.25
cmi7l8l8501rb106u185g6qzl	cmi7l8l7v01r9106utwdee5a2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:24:49	\N	\N	    	2025-11-20 15:30:28.085	2025-11-20 15:30:28.085
cmi7l8m7o01rf106um3zc5r0v	cmi7l8m7j01rd106uo6wa6vsf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:25:01	\N	\N	    	2025-11-20 15:30:29.364	2025-11-20 15:30:29.364
cmi7l8myl01rj106u7ijedxeg	cmi7l8mya01rh106ufq2lu6t1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:25:19	\N	\N	    	2025-11-20 15:30:30.332	2025-11-20 15:30:30.332
cmi7l8n7701rn106uf7do0bid	cmi7l8n7101rl106u5q2c9hx5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:25:05	\N	\N	    	2025-11-20 15:30:30.643	2025-11-20 15:30:30.643
cmi7l8tkn01rr106udcbifnfx	cmi7l8tkd01rp106ukb7lghn6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	33	2025-11-19 12:25:22	\N	\N	    	2025-11-20 15:30:38.903	2025-11-20 15:30:38.903
cmi7l8uaq01rv106u9t8kscv7	cmi7l8uaj01rt106uc60d83qt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:25:53	\N	\N	    	2025-11-20 15:30:39.842	2025-11-20 15:30:39.842
cmi7l8uba01rz106u709rbtde	cmi7l8ub701rx106ugrsux93d	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	28	2025-11-19 12:25:25	\N	\N	    	2025-11-20 15:30:39.862	2025-11-20 15:30:39.862
cmi7l8v1q01s3106u0hn0f52x	cmi7l8v1k01s1106uq4huv2fh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	45	2025-11-19 12:25:31	\N	\N	    	2025-11-20 15:30:40.815	2025-11-20 15:30:40.815
cmi7l8w7201s7106ue7zog5ay	cmi7l8w6w01s5106ut6t8jt5q	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	17	2025-11-19 12:26:25	\N	\N	    	2025-11-20 15:30:42.303	2025-11-20 15:30:42.303
cmi7l8x1401sb106u3xchemk4	cmi7l8x0y01s9106unh1q7k93	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:26:29	\N	\N	    	2025-11-20 15:30:43.384	2025-11-20 15:30:43.384
cmi7l8x4d01sf106ut6guxn42	cmi7l8x4801sd106ue61jcq8v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:26:36	\N	\N	    	2025-11-20 15:30:43.501	2025-11-20 15:30:43.501
cmi7l8yi101sj106uduqilxt8	cmi7l8yhs01sh106ur17jzvu6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	20	2025-11-19 12:26:42	\N	\N	    	2025-11-20 15:30:45.289	2025-11-20 15:30:45.289
cmi7l90vi01sn106ufcijvh95	cmi7l90vd01sl106ubdkbgfij	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:27:12	\N	\N	    	2025-11-20 15:30:48.366	2025-11-20 15:30:48.366
cmi7l916r01sr106uw9sqygee	cmi7l916l01sp106u3zzd0nvl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	19	2025-11-19 12:27:48	\N	\N	    	2025-11-20 15:30:48.771	2025-11-20 15:30:48.771
cmi7l91bn01sv106un1vs908c	cmi7l91bc01st106u16fui7ks	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:27:18	\N	\N	    	2025-11-20 15:30:48.946	2025-11-20 15:30:48.946
cmi7l91cb01sz106ub153xlf3	cmi7l91c401sx106upntiu13i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:27:07	\N	\N	    	2025-11-20 15:30:48.971	2025-11-20 15:30:48.971
cmi7l94yh01t3106ufawo5n96	cmi7l94y801t1106uscqi4ah0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	19	2025-11-19 12:27:54	\N	\N	    	2025-11-20 15:30:53.657	2025-11-20 15:30:53.657
cmi7l95gg01t7106uog4zldsq	cmi7l95gd01t5106ucjyerpfl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	19	2025-11-19 12:28:26	\N	\N	    	2025-11-20 15:30:54.304	2025-11-20 15:30:54.304
cmi7l95sm01tb106u8v733bma	cmi7l95sj01t9106utm6iwf2z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	19	2025-11-19 12:27:51	\N	\N	    	2025-11-20 15:30:54.742	2025-11-20 15:30:54.742
cmi7l96ph01tf106uoumf8wwq	cmi7l96pc01td106ubh30yr9e	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	19	2025-11-19 12:27:57	\N	\N	    	2025-11-20 15:30:55.925	2025-11-20 15:30:55.925
cmi7l97ma01tj106uu60di5qw	cmi7l97m601th106up8u9oymt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	19	2025-11-19 12:28:35	\N	\N	    	2025-11-20 15:30:57.107	2025-11-20 15:30:57.107
cmi7l983w01tn106uq84j6k5r	cmi7l983n01tl106u99365vpx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	19	2025-11-19 12:28:40	\N	\N	    	2025-11-20 15:30:57.74	2025-11-20 15:30:57.74
cmi7l98pf01tr106u85rje910	cmi7l98pc01tp106uwt7xzexw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	19	2025-11-19 12:28:38	\N	\N	    	2025-11-20 15:30:58.515	2025-11-20 15:30:58.515
cmi7l99ov01tv106u7n63khn8	cmi7l99oq01tt106u0fr9wkhy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	17	2025-11-19 12:28:48	\N	\N	    	2025-11-20 15:30:59.792	2025-11-20 15:30:59.792
cmi7l99vy01tz106uztqjvqxy	cmi7l99vg01tx106u9cbni6pp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	19	2025-11-19 12:28:43	\N	\N	    	2025-11-20 15:31:00.032	2025-11-20 15:31:00.032
cmi7l9b7e01u3106ut33psxty	cmi7l9b7701u1106uvaudkju2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	18	2025-11-19 12:28:54	\N	\N	    	2025-11-20 15:31:01.755	2025-11-20 15:31:01.755
cmi7l9bvq01u7106ui4rlzuis	cmi7l9bvg01u5106ugo1na2lj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	17	2025-11-19 12:28:51	\N	\N	    	2025-11-20 15:31:02.63	2025-11-20 15:31:02.63
cmi7l9cr001ub106ulaey82a7	cmi7l9cqx01u9106unmf2usqy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	18	2025-11-19 12:29:06	\N	\N	    	2025-11-20 15:31:03.756	2025-11-20 15:31:03.756
cmi7l9dl201uf106udeqg8h88	cmi7l9dkr01ud106unlgjkoaf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	18	2025-11-19 12:29:10	\N	\N	    	2025-11-20 15:31:04.838	2025-11-20 15:31:04.838
cmi7l9dny01uj106u36twrqdk	cmi7l9dnr01uh106ug30m5dym	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	20	2025-11-19 12:29:12	\N	\N	    	2025-11-20 15:31:04.942	2025-11-20 15:31:04.942
cmi7l9en001un106uv5t8qsre	cmi7l9emw01ul106uodyfr0k7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	20	2025-11-19 12:29:31	\N	\N	    	2025-11-20 15:31:06.205	2025-11-20 15:31:06.205
cmi7l9fid01ur106u9el4752h	cmi7l9fib01up106u5f72d9jm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	20	2025-11-19 12:29:34	\N	\N	    	2025-11-20 15:31:07.334	2025-11-20 15:31:07.334
cmi7l9gcn01uv106utmxftccj	cmi7l9gcd01ut106u96a8onwt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	20	2025-11-19 12:29:36	\N	\N	    	2025-11-20 15:31:08.422	2025-11-20 15:31:08.422
cmi7l9ibu01uz106uz0r4k8pv	cmi7l9ibl01ux106u9yiqctcn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	31	2025-11-19 12:29:42	\N	\N	    	2025-11-20 15:31:10.985	2025-11-20 15:31:10.985
cmi7l9jh301v3106ugewl6lxg	cmi7l9jgt01v1106u3cg0unyk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	20	2025-11-19 12:29:39	\N	\N	    	2025-11-20 15:31:12.47	2025-11-20 15:31:12.47
cmi7l9jhq01v7106uo0fje0by	cmi7l9jhk01v5106udhn5sqfl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:29:47	\N	\N	    	2025-11-20 15:31:12.494	2025-11-20 15:31:12.494
cmi7l9kwf01vd106u04hn4hob	cmi7l9kwa01v9106u7a1070zp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:29:50	\N	\N	    	2025-11-20 15:31:14.319	2025-11-20 15:31:14.319
cmi7l9kwg01vf106u6cp965rb	cmi7l9kwd01vb106u6w6lsstr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:29:55	\N	\N	    	2025-11-20 15:31:14.32	2025-11-20 15:31:14.32
cmi7l9nkk01vj106uvliked0i	cmi7l9nkf01vh106ut6zg0ji7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:30:01	\N	\N	    	2025-11-20 15:31:17.78	2025-11-20 15:31:17.78
cmi7l9nmr01vn106usclxcot2	cmi7l9nmo01vl106umva4co5a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:29:57	\N	\N	    	2025-11-20 15:31:17.859	2025-11-20 15:31:17.859
cmi7l9ntm01vr106u3ek3dmsx	cmi7l9ntc01vp106u4jcv9w8y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	16	2025-11-19 12:30:28	\N	\N	    	2025-11-20 15:31:18.105	2025-11-20 15:31:18.105
cmi7l9o6601vv106ua7io31jo	cmi7l9o6101vt106uyrel3g0t	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 12:30:33	\N	\N	    	2025-11-20 15:31:18.558	2025-11-20 15:31:18.558
cmi7l9rje01vz106utyqnus4x	cmi7l9rj901vx106u3gmry6z3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 12:30:56	\N	\N	    	2025-11-20 15:31:22.923	2025-11-20 15:31:22.923
cmi7l9rng01w3106uqftg2k6c	cmi7l9rn601w1106u523vna1d	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 12:30:36	\N	\N	    	2025-11-20 15:31:23.067	2025-11-20 15:31:23.067
cmi7l9s0p01w7106uwtxypjcp	cmi7l9s0k01w5106u86h6vmq7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 12:30:51	\N	\N	    	2025-11-20 15:31:23.545	2025-11-20 15:31:23.545
cmi7l9s4j01wb106u7a22prcd	cmi7l9s4801w9106uu6nnbo0r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	34	2025-11-19 12:30:59	\N	\N	    	2025-11-20 15:31:23.683	2025-11-20 15:31:23.683
cmi7la01k01wf106u56visn5w	cmi7la01b01wd106uqbdnzoov	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	34	2025-11-19 12:31:02	\N	\N	    	2025-11-20 15:31:33.944	2025-11-20 15:31:33.944
cmi7la0dj01wj106umvi33h6t	cmi7la0da01wh106uswvrfoqx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	34	2025-11-19 12:31:04	\N	\N	    	2025-11-20 15:31:34.375	2025-11-20 15:31:34.375
cmi7la0ez01wn106uv2xqrdjr	cmi7la0ew01wl106uxeuyomhg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	16	2025-11-19 12:31:31	\N	\N	    	2025-11-20 15:31:34.427	2025-11-20 15:31:34.427
cmi7la10t01wr106u3hn409um	cmi7la10o01wp106uz7sl2sj7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:32:00	\N	\N	    	2025-11-20 15:31:35.213	2025-11-20 15:31:35.213
cmi7la3d801wv106uvvhins01	cmi7la3d501wt106u2j5jzuxy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:32:07	\N	\N	    	2025-11-20 15:31:38.253	2025-11-20 15:31:38.253
cmi7la3te01wz106u3sow7ttr	cmi7la3t501wx106upbcvh1ff	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:32:10	\N	\N	    	2025-11-20 15:31:38.833	2025-11-20 15:31:38.833
cmi7la4lz01x3106ufce0di6c	cmi7la4lq01x1106urldhszfi	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	28	2025-11-19 12:32:46	\N	\N	    	2025-11-20 15:31:39.862	2025-11-20 15:31:39.862
cmi7la4rq01x7106uegsjdivl	cmi7la4rg01x5106u99rzgrr1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	28	2025-11-19 12:32:14	\N	\N	    	2025-11-20 15:31:40.069	2025-11-20 15:31:40.069
cmi7la6oj01xb106ub4pqv14y	cmi7la6o801x9106u43tuicnd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	16	2025-11-19 12:32:52	\N	\N	    	2025-11-20 15:31:42.546	2025-11-20 15:31:42.546
cmi7la6ru01xf106u43riy65k	cmi7la6rr01xd106uobssyul0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	16	2025-11-19 12:32:49	\N	\N	    	2025-11-20 15:31:42.666	2025-11-20 15:31:42.666
cmi7la6ur01xj106u1f0vn93y	cmi7la6ui01xh106ud3opan3z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	16	2025-11-19 12:32:59	\N	\N	    	2025-11-20 15:31:42.771	2025-11-20 15:31:42.771
cmi7la7zu01xn106umve3wngv	cmi7la7zp01xl106ubxy5v9v9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	16	2025-11-19 12:33:02	\N	\N	    	2025-11-20 15:31:44.25	2025-11-20 15:31:44.25
cmi7laaxb01xr106uoax06sby	cmi7laax001xp106u1x8k30ws	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	31	2025-11-19 12:34:05	\N	\N	    	2025-11-20 15:31:48.046	2025-11-20 15:31:48.046
cmi7ladeq01xv106uwf8vh3fq	cmi7ladeg01xt106uoafad343	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	31	2025-11-19 12:34:10	\N	\N	    	2025-11-20 15:31:51.266	2025-11-20 15:31:51.266
cmi7laee501xz106uhn6fmppo	cmi7laedw01xx106uw0mp9hsv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	31	2025-11-19 12:34:19	\N	\N	    	2025-11-20 15:31:52.541	2025-11-20 15:31:52.541
cmi7laei101y3106ufcajvzhj	cmi7laehx01y1106u0czijcf5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	31	2025-11-19 12:34:13	\N	\N	    	2025-11-20 15:31:52.681	2025-11-20 15:31:52.681
cmi7laeqw01y7106umf78odvp	cmi7laeqq01y5106up1ugn6v5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	31	2025-11-19 12:34:22	\N	\N	    	2025-11-20 15:31:53	2025-11-20 15:31:53
cmi7lah2901yb106u4ymqkb6d	cmi7lah2501y9106uh8ovgs60	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	28	2025-11-19 12:34:30	\N	\N	    	2025-11-20 15:31:56.001	2025-11-20 15:31:56.001
cmi7laib201yf106utethlca1	cmi7laiax01yd106umgjudp0p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	19	2025-11-19 12:34:33	\N	\N	    	2025-11-20 15:31:57.614	2025-11-20 15:31:57.614
cmi7laixf01yj106u7lqq1xpg	cmi7laix601yh106u8t8kjvee	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	37	2025-11-19 12:34:27	\N	\N	    	2025-11-20 15:31:58.419	2025-11-20 15:31:58.419
cmi7lajpf01yn106u4wbt9x0r	cmi7lajp701yl106ud1thed5y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	29	2025-11-19 12:35:07	\N	\N	    	2025-11-20 15:31:59.427	2025-11-20 15:31:59.427
cmi7lakte01yr106u4rgvwmdt	cmi7laktb01yp106ukwxrsmcr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	28	2025-11-19 12:35:04	\N	\N	    	2025-11-20 15:32:00.866	2025-11-20 15:32:00.866
cmi7lamqb01yv106ujjqfbj8t	cmi7lamq701yt106uhq0zaw2u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	29	2025-11-19 12:35:10	\N	\N	    	2025-11-20 15:32:03.347	2025-11-20 15:32:03.347
cmi7lamvr01yz106ura7ktt9h	cmi7lamvi01yx106uj2nt2da1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	29	2025-11-19 12:35:13	\N	\N	    	2025-11-20 15:32:03.543	2025-11-20 15:32:03.543
cmi7lanoq01z3106ugfb8jud8	cmi7lanoh01z1106uiugshaq0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:35:37	\N	\N	    	2025-11-20 15:32:04.586	2025-11-20 15:32:04.586
cmi7lanpb01z7106u602pwf55	cmi7lanp201z5106u31jivbce	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:35:46	\N	\N	    	2025-11-20 15:32:04.607	2025-11-20 15:32:04.607
cmi7larod01zb106u3u322fba	cmi7laro901z9106upkhelftm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:35:54	\N	\N	    	2025-11-20 15:32:09.757	2025-11-20 15:32:09.757
cmi7las1501zf106u8m74pup9	cmi7las1001zd106uibqvih4a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:36:00	\N	\N	    	2025-11-20 15:32:10.217	2025-11-20 15:32:10.217
cmi7las2n01zj106uocqemhiv	cmi7las2k01zh106upvghmapo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:35:52	\N	\N	    	2025-11-20 15:32:10.271	2025-11-20 15:32:10.271
cmi7las5b01zn106uoedvfrql	cmi7las5801zl106unrrb2xqx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	27	2025-11-19 12:35:57	\N	\N	    	2025-11-20 15:32:10.367	2025-11-20 15:32:10.367
cmi7lavmv01zr106ue6bpq2qe	cmi7lavml01zp106ucs6up4i8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 12:36:11	\N	\N	    	2025-11-20 15:32:14.886	2025-11-20 15:32:14.886
cmi7lawaq01zv106uyqvx9uzx	cmi7lawag01zt106upgo40mao	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 12:36:24	\N	\N	    	2025-11-20 15:32:15.745	2025-11-20 15:32:15.745
cmi7lawel01zz106u5q2jhfiz	cmi7lawei01zx106ueklquj3g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 12:36:19	\N	\N	    	2025-11-20 15:32:15.885	2025-11-20 15:32:15.885
cmi7laxua0203106uepx3ezyr	cmi7laxtv0201106usje5lu8i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	24	2025-11-19 12:36:15	\N	\N	    	2025-11-20 15:32:17.745	2025-11-20 15:32:17.745
cmi7layp50207106uhuqxwvdj	cmi7layp00205106u8kybjs22	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	35	2025-11-19 12:36:30	\N	\N	    	2025-11-20 15:32:18.857	2025-11-20 15:32:18.857
cmi7laz36020b106uc6mcok9l	cmi7laz300209106ukuv4q8oc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	22	2025-11-19 12:38:30	\N	\N	    	2025-11-20 15:32:19.362	2025-11-20 15:32:19.362
cmi7lazj5020f106unuufwb88	cmi7laziw020d106uz5dk6up5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	23	2025-11-19 12:38:43	\N	\N	    	2025-11-20 15:32:19.936	2025-11-20 15:32:19.936
cmi7lb1ja020j106ue933i8a3	cmi7lb1j4020h106ub3uqefoq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	22.00	1/125	23	2025-11-19 12:39:23	\N	\N	    	2025-11-20 15:32:22.534	2025-11-20 15:32:22.534
cmi7lb1l9020n106uf3jin4jc	cmi7lb1kv020l106ur7u349pi	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:39:39	\N	\N	    	2025-11-20 15:32:22.604	2025-11-20 15:32:22.604
cmi7lb3wm020r106ue0b3medn	cmi7lb3wd020p106uwhc7xejh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:39:53	\N	\N	    	2025-11-20 15:32:25.606	2025-11-20 15:32:25.606
cmi7lb4pn020v106uouykpugs	cmi7lb4pk020t106utkhx39si	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:39:50	\N	\N	    	2025-11-20 15:32:26.651	2025-11-20 15:32:26.651
cmi7lb79u020z106umjq5iqtd	cmi7lb79o020x106uqjrvosho	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:40:04	\N	\N	    	2025-11-20 15:32:29.971	2025-11-20 15:32:29.971
cmi7lb7at0213106umq3bcxml	cmi7lb7aq0211106ueqn9x7dp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:40:16	\N	\N	    	2025-11-20 15:32:30.005	2025-11-20 15:32:30.005
cmi7lb7nx0217106uhjme1szk	cmi7lb7no0215106ufv2wq5yg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:40:18	\N	\N	    	2025-11-20 15:32:30.477	2025-11-20 15:32:30.477
cmi7lb7th021b106uk058edgd	cmi7lb7t70219106uxb6ytd1n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 12:40:22	\N	\N	    	2025-11-20 15:32:30.677	2025-11-20 15:32:30.677
cmi7lbais021f106urr7byuj3	cmi7lbaij021d106u6240g1m5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:40:33	\N	\N	    	2025-11-20 15:32:34.18	2025-11-20 15:32:34.18
cmi7lbar2021j106uk1u1mpsl	cmi7lbaqt021h106uppuvisty	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:41:04	\N	\N	    	2025-11-20 15:32:34.478	2025-11-20 15:32:34.478
cmi7lbbbg021n106uk6ggsjla	cmi7lbbbc021l106u1l89ldss	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 12:40:30	\N	\N	    	2025-11-20 15:32:35.213	2025-11-20 15:32:35.213
cmi7lbbik021r106ud61i26q1	cmi7lbbig021p106utjg1b2hk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:41:07	\N	\N	    	2025-11-20 15:32:35.468	2025-11-20 15:32:35.468
cmi7lbdhz021v106uohv9aeoq	cmi7lbdhw021t106up5vslgyz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 12:41:10	\N	\N	    	2025-11-20 15:32:38.039	2025-11-20 15:32:38.039
cmi7lbfmn021z106u703zhl2l	cmi7lbfmk021x106urywkgw9y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:41:13	\N	\N	    	2025-11-20 15:32:40.8	2025-11-20 15:32:40.8
cmi7lbhh90223106u4bixl8e5	cmi7lbhh50221106uiz325fcu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:42:35	\N	\N	    	2025-11-20 15:32:43.197	2025-11-20 15:32:43.197
cmi7lbhrz0227106udqwfpe5k	cmi7lbhrq0225106ukrgjep1v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:41:49	\N	\N	    	2025-11-20 15:32:43.583	2025-11-20 15:32:43.583
cmi7lbhvt022b106ukqlpe9wv	cmi7lbhvp0229106uekere214	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:42:29	\N	\N	    	2025-11-20 15:32:43.721	2025-11-20 15:32:43.721
cmi7lbi69022f106uid8t65ha	cmi7lbi5z022d106usa7cr5f0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:42:40	\N	\N	    	2025-11-20 15:32:44.096	2025-11-20 15:32:44.096
cmi7lbl4a022j106uk9jppsbp	cmi7lbl45022h106uoufheh2y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:43:32	\N	\N	    	2025-11-20 15:32:47.913	2025-11-20 15:32:47.913
cmi7lbpko022n106ujwl8rzq9	cmi7lbpkk022l106ubn141ci3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	40	2025-11-19 12:43:42	\N	\N	    	2025-11-20 15:32:53.688	2025-11-20 15:32:53.688
cmi7lbptg022r106ua3t1e3nb	cmi7lbpt7022p106uyoic9met	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 12:43:57	\N	\N	    	2025-11-20 15:32:54.004	2025-11-20 15:32:54.004
cmi7lbpuf022v106u1e7elslz	cmi7lbpua022t106u2rhhdjic	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	17	2025-11-19 12:43:37	\N	\N	    	2025-11-20 15:32:54.039	2025-11-20 15:32:54.039
cmi7lbqat022z106ukhxigkss	cmi7lbqap022x106ukoqxvgce	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 12:43:54	\N	\N	    	2025-11-20 15:32:54.63	2025-11-20 15:32:54.63
cmi7lbwr40233106u9uraatpw	cmi7lbwqx0231106uvb19tfl1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:44:25	\N	\N	    	2025-11-20 15:33:02.992	2025-11-20 15:33:02.992
cmi7lbx600237106u3p65ywui	cmi7lbx5r0235106urncppr3x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:44:16	\N	\N	    	2025-11-20 15:33:03.528	2025-11-20 15:33:03.528
cmi7lbxc1023b106uu4t6ss85	cmi7lbxbr0239106uhl8mbnw5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:44:29	\N	\N	    	2025-11-20 15:33:03.745	2025-11-20 15:33:03.745
cmi7lbxm7023f106uhe9z9h65	cmi7lbxm4023d106uryxvs8r5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	41	2025-11-19 12:44:00	\N	\N	    	2025-11-20 15:33:04.112	2025-11-20 15:33:04.112
cmi7lc7rq023j106u76xk4dob	cmi7lc7rg023h106u2x55w7br	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:46:19	\N	\N	    	2025-11-20 15:33:17.269	2025-11-20 15:33:17.269
cmi7lc8zf023n106ujkjxjx0a	cmi7lc8z6023l106usp5zuh87	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:46:02	\N	\N	    	2025-11-20 15:33:18.843	2025-11-20 15:33:18.843
cmi7lcad8023r106uk96qktdd	cmi7lcacz023p106u9cz8c6ns	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	16	2025-11-19 12:46:56	\N	\N	    	2025-11-20 15:33:20.635	2025-11-20 15:33:20.635
cmi7lcb5r023v106u7pobtsky	cmi7lcb5i023t106u53kmdbsd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:46:23	\N	\N	    	2025-11-20 15:33:21.662	2025-11-20 15:33:21.662
cmi7lcbir023z106ue5l46b7w	cmi7lcbii023x106umjcksgyr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:46:52	\N	\N	    	2025-11-20 15:33:22.131	2025-11-20 15:33:22.131
cmi7lcbnu0243106ujfrn1s6x	cmi7lcbnm0241106uw6enz836	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	34	2025-11-19 12:46:32	\N	\N	    	2025-11-20 15:33:22.314	2025-11-20 15:33:22.314
cmi7lcd130247106uhp8f9yoo	cmi7lcd0y0245106uu5yimdpn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 12:47:11	\N	\N	    	2025-11-20 15:33:24.087	2025-11-20 15:33:24.087
cmi7lcge5024b106u14yeutw0	cmi7lcge00249106ur7mwbvyq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	36	2025-11-19 12:47:16	\N	\N	    	2025-11-20 15:33:28.445	2025-11-20 15:33:28.445
cmi7lcgyi024f106usdxwgqhk	cmi7lcgyf024d106um6piukjc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:47:20	\N	\N	    	2025-11-20 15:33:29.178	2025-11-20 15:33:29.178
cmi7lch4n024j106u06072gke	cmi7lch4b024h106ubphx1nrg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:47:28	\N	\N	    	2025-11-20 15:33:29.398	2025-11-20 15:33:29.398
cmi7lchn5024n106u6k3si313	cmi7lchn1024l106ue0h9l8cy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:47:23	\N	\N	    	2025-11-20 15:33:30.065	2025-11-20 15:33:30.065
cmi7lcimi024r106u1gequ08w	cmi7lcim8024p106ubhgbjcpw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:47:31	\N	\N	    	2025-11-20 15:33:31.337	2025-11-20 15:33:31.337
cmi7lclc6024v106uit7docrg	cmi7lclc1024t106uezmv2zkv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	22	2025-11-19 12:48:05	\N	\N	    	2025-11-20 15:33:34.854	2025-11-20 15:33:34.854
cmi7lclv1024z106uzoilr6lj	cmi7lcluy024x106uc301oxkc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	31	2025-11-19 12:47:36	\N	\N	    	2025-11-20 15:33:35.534	2025-11-20 15:33:35.534
cmi7lclwy0253106ug6vlf7e9	cmi7lclwi0251106usakzjrew	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:48:22	\N	\N	    	2025-11-20 15:33:35.591	2025-11-20 15:33:35.591
cmi7lcm6i0257106uzrx3gsy7	cmi7lcm600255106uyv0c89h3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:48:15	\N	\N	    	2025-11-20 15:33:35.946	2025-11-20 15:33:35.946
cmi7lco8n025b106udtmbugew	cmi7lco8j0259106uenu4yp99	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	21	2025-11-19 12:48:35	\N	\N	    	2025-11-20 15:33:38.616	2025-11-20 15:33:38.616
cmi7lcov8025f106u7c5260mj	cmi7lcov5025d106u2f18txxp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:48:41	\N	\N	    	2025-11-20 15:33:39.428	2025-11-20 15:33:39.428
cmi7lcpd0025j106umsw5lo7o	cmi7lcpcv025h106ue89dwj0c	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	32	2025-11-19 12:48:38	\N	\N	    	2025-11-20 15:33:40.068	2025-11-20 15:33:40.068
cmi7lcps4025n106uulad5b0z	cmi7lcprz025l106u89ibfm3f	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:48:45	\N	\N	    	2025-11-20 15:33:40.612	2025-11-20 15:33:40.612
cmi7lcrb9025r106u9p4t4n7s	cmi7lcrb4025p106u71g1gzt2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:48:47	\N	\N	    	2025-11-20 15:33:42.598	2025-11-20 15:33:42.598
cmi7lcsdv025v106uqh6uo2my	cmi7lcsdm025t106ubu4uo8uj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:49:01	\N	\N	    	2025-11-20 15:33:43.986	2025-11-20 15:33:43.986
cmi7lctjp025z106uoqi53kfp	cmi7lctjf025x106ue53qpwzx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:49:14	\N	\N	    	2025-11-20 15:33:45.492	2025-11-20 15:33:45.492
cmi7lcuih0263106ubuq97jag	cmi7lcuib0261106unie5l3e1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	37	2025-11-19 12:49:06	\N	\N	    	2025-11-20 15:33:46.745	2025-11-20 15:33:46.745
cmi7lcun60267106u3rovqczb	cmi7lcumy0265106ub7etb872	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:49:35	\N	\N	    	2025-11-20 15:33:46.914	2025-11-20 15:33:46.914
cmi7lcw83026b106ulrnyp4ey	cmi7lcw7z0269106ucvu74c08	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	18	2025-11-19 12:49:57	\N	\N	    	2025-11-20 15:33:48.963	2025-11-20 15:33:48.963
cmi7lcx24026f106ugo7cwlte	cmi7lcx1v026d106u31l2akty	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	24	2025-11-19 12:50:20	\N	\N	    	2025-11-20 15:33:50.044	2025-11-20 15:33:50.044
cmi7lcxit026j106uibvr2cqz	cmi7lcxij026h106ujloz8340	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:50:30	\N	\N	    	2025-11-20 15:33:50.645	2025-11-20 15:33:50.645
cmi7lcy5p026n106uqpnx7bx4	cmi7lcy5k026l106uqibu03ud	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:50:26	\N	\N	    	2025-11-20 15:33:51.469	2025-11-20 15:33:51.469
cmi7lcypm026r106us7uqipr5	cmi7lcypc026p106un0ouly9v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:50:35	\N	\N	    	2025-11-20 15:33:52.186	2025-11-20 15:33:52.186
cmi7ld0ej026v106u2qo2xevu	cmi7ld0eg026t106ufeg9v5hc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	23	2025-11-19 12:50:39	\N	\N	    	2025-11-20 15:33:54.38	2025-11-20 15:33:54.38
cmi7ld17t026z106uk6eir2vb	cmi7ld17q026x106uise3dyhu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:50:56	\N	\N	    	2025-11-20 15:33:55.433	2025-11-20 15:33:55.433
cmi7ld2id0273106u50j2ngt3	cmi7ld2i40271106uswxeoo1x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	38	2025-11-19 12:51:00	\N	\N	    	2025-11-20 15:33:57.109	2025-11-20 15:33:57.109
cmi7ld2nw0277106u0ay2nbda	cmi7ld2nn0275106u61razo8w	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:51:11	\N	\N	    	2025-11-20 15:33:57.308	2025-11-20 15:33:57.308
cmi7ld42r027b106uzsb6uzgt	cmi7ld42h0279106u5aoi9428	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:52:45	\N	\N	    	2025-11-20 15:33:59.138	2025-11-20 15:33:59.138
cmi7ld4pc027f106umzh7ph8j	cmi7ld4p9027d106ucgpd2ofc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:53:22	\N	\N	    	2025-11-20 15:33:59.952	2025-11-20 15:33:59.952
cmi7ld5gm027j106ue8k1cxy7	cmi7ld5gc027h106uzjqc323r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:53:28	\N	\N	    	2025-11-20 15:34:00.934	2025-11-20 15:34:00.934
cmi7ld6ac027n106u1nasgvdl	cmi7ld6a7027l106ugefy3dvi	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:53:34	\N	\N	    	2025-11-20 15:34:02.004	2025-11-20 15:34:02.004
cmi7ld6ks027r106uyn9k89us	cmi7ld6ko027p106uhivnrpv3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:54:36	\N	\N	    	2025-11-20 15:34:02.38	2025-11-20 15:34:02.38
cmi7ld7wf027x106ug1ieptql	cmi7ld7wb027t106ugsxalhez	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:54:41	\N	\N	    	2025-11-20 15:34:04.096	2025-11-20 15:34:04.096
cmi7ld7wh027z106uue2auyt4	cmi7ld7we027v106uphj7lh9r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:55:18	\N	\N	    	2025-11-20 15:34:04.097	2025-11-20 15:34:04.097
cmi7ld9bc0283106u8t640pjs	cmi7ld9b80281106uch299xx8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:55:22	\N	\N	    	2025-11-20 15:34:05.928	2025-11-20 15:34:05.928
cmi7ld9pa0287106ufdeopnbm	cmi7ld9p30285106ubgv9fnts	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:55:27	\N	\N	    	2025-11-20 15:34:06.43	2025-11-20 15:34:06.43
cmi7ldb31028b106urf9nwgpp	cmi7ldb2y0289106u3zoft9yh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:55:55	\N	\N	    	2025-11-20 15:34:08.221	2025-11-20 15:34:08.221
cmi7ldb58028f106u3nm0lul4	cmi7ldb54028d106ulgk38m1b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:55:48	\N	\N	    	2025-11-20 15:34:08.3	2025-11-20 15:34:08.3
cmi7ldcdq028j106u7h6a4bvh	cmi7ldcdk028h106uwu6kyx7w	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:56:03	\N	\N	    	2025-11-20 15:34:09.902	2025-11-20 15:34:09.902
cmi7ldcfo028n106uygsc4oc3	cmi7ldcfl028l106uep8g43gl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:55:59	\N	\N	    	2025-11-20 15:34:09.972	2025-11-20 15:34:09.972
cmi7ldf4h028r106u75h6jtxe	cmi7ldf4d028p106ur9ycku07	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:56:36	\N	\N	    	2025-11-20 15:34:13.457	2025-11-20 15:34:13.457
cmi7ldg4p028v106uu14ziunr	cmi7ldg4c028t106ui4fayc8g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:56:48	\N	\N	    	2025-11-20 15:34:14.759	2025-11-20 15:34:14.759
cmi7ldghj028z106utbysupxw	cmi7ldghf028x106ugcxzewme	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:56:41	\N	\N	    	2025-11-20 15:34:15.223	2025-11-20 15:34:15.223
cmi7ldh150293106u0r0pii58	cmi7ldh120291106umfd1631t	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:56:10	\N	\N	    	2025-11-20 15:34:15.93	2025-11-20 15:34:15.93
cmi7ldjde0297106u1efdxvk1	cmi7ldjd50295106uje470saf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:56:52	\N	\N	    	2025-11-20 15:34:18.962	2025-11-20 15:34:18.962
cmi7ldjqm029b106ut3z28x63	cmi7ldjqe0299106uu8pl5zie	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:57:01	\N	\N	    	2025-11-20 15:34:19.438	2025-11-20 15:34:19.438
cmi7ldkaw029f106uzouxtuap	cmi7ldkam029d106u3ksd8xc3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:57:07	\N	\N	    	2025-11-20 15:34:20.167	2025-11-20 15:34:20.167
cmi7ldlcm029j106u4ekwfrb1	cmi7ldlcj029h106ub7cnepdv	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:57:43	\N	\N	    	2025-11-20 15:34:21.526	2025-11-20 15:34:21.526
cmi7ldm0y029n106u99cipjz2	cmi7ldm0q029l106ugnqae5vs	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:58:15	\N	\N	    	2025-11-20 15:34:22.402	2025-11-20 15:34:22.402
cmi7ldn6h029r106uptokbzlj	cmi7ldn68029p106ueb1dafau	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:58:19	\N	\N	    	2025-11-20 15:34:23.897	2025-11-20 15:34:23.897
cmi7ldoqn029v106uu4k1de88	cmi7ldoqe029t106ulxqyk27x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:58:29	\N	\N	    	2025-11-20 15:34:25.919	2025-11-20 15:34:25.919
cmi7ldpxu029z106u7slt9i58	cmi7ldpxl029x106uewl72zbc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:58:46	\N	\N	    	2025-11-20 15:34:27.474	2025-11-20 15:34:27.474
cmi7ldqdh02a3106umirqxpws	cmi7ldqdc02a1106ucoyo43k4	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:59:00	\N	\N	    	2025-11-20 15:34:28.038	2025-11-20 15:34:28.038
cmi7ldqk602a7106u0dnzhvgs	cmi7ldqk302a5106u42o9dc9s	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:59:03	\N	\N	    	2025-11-20 15:34:28.279	2025-11-20 15:34:28.279
cmi7ldsed02ab106uyndqu5cq	cmi7ldse402a9106uuyzbiuao	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:59:22	\N	\N	    	2025-11-20 15:34:30.66	2025-11-20 15:34:30.66
cmi7ldv8d02af106uc98czl98	cmi7ldv8702ad106uz1m46u9p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 12:59:48	\N	\N	    	2025-11-20 15:34:34.333	2025-11-20 15:34:34.333
cmi7ldwud02aj106ugy0z45t8	cmi7ldwu402ah106uvcjd32rm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:00:07	\N	\N	    	2025-11-20 15:34:36.421	2025-11-20 15:34:36.421
cmi7ldx9h02an106ux58dzlm8	cmi7ldx9c02al106uyljd0as7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:00:17	\N	\N	    	2025-11-20 15:34:36.966	2025-11-20 15:34:36.966
cmi7ldyce02ar106ulqyvnkxq	cmi7ldycb02ap106ul0ir3y16	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:00:01	\N	\N	    	2025-11-20 15:34:38.366	2025-11-20 15:34:38.366
cmi7ldytn02av106unnq9zigg	cmi7ldyti02at106uggekvjwj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:00:22	\N	\N	    	2025-11-20 15:34:38.987	2025-11-20 15:34:38.987
cmi7le47302az106u26po8qf2	cmi7le46z02ax106uv8rvsqsa	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:01:47	\N	\N	    	2025-11-20 15:34:45.951	2025-11-20 15:34:45.951
cmi7le4uc02b3106u5r8xtmlc	cmi7le4u802b1106u77jjf50m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:01:31	\N	\N	    	2025-11-20 15:34:46.788	2025-11-20 15:34:46.788
cmi7le5ww02b7106uunladtpy	cmi7le5wo02b5106u392x0yoo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:02:13	\N	\N	    	2025-11-20 15:34:48.176	2025-11-20 15:34:48.176
cmi7le6mk02bb106usj1x35rq	cmi7le6mh02b9106ufo3dabfc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:01:51	\N	\N	    	2025-11-20 15:34:49.1	2025-11-20 15:34:49.1
cmi7le83i02bf106u4w6qn5tu	cmi7le83f02bd106utdrku7u5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:02:18	\N	\N	    	2025-11-20 15:34:51.006	2025-11-20 15:34:51.006
cmi7le8ja02bj106ujcqps0xo	cmi7le8j502bh106ulvank65w	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:02:22	\N	\N	    	2025-11-20 15:34:51.574	2025-11-20 15:34:51.574
cmi7lef8402bn106uhnk5kzwh	cmi7lef8102bl106uqmnrq0wp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:02:26	\N	\N	    	2025-11-20 15:35:00.245	2025-11-20 15:35:00.245
cmi7leffx02br106ut93tb2vp	cmi7leffo02bp106uxe52q1ke	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:03:23	\N	\N	    	2025-11-20 15:35:00.525	2025-11-20 15:35:00.525
cmi7legir02bv106uf2uqs4ar	cmi7legih02bt106ueq4ovor7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:04:02	\N	\N	    	2025-11-20 15:35:01.922	2025-11-20 15:35:01.922
cmi7lei7602bz106ur80wpwch	cmi7lei7102bx106un3o3yu1s	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:03:27	\N	\N	    	2025-11-20 15:35:04.098	2025-11-20 15:35:04.098
cmi7lej7t02c3106uh3m9rag5	cmi7lej7q02c1106uc1ytdjen	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:04:39	\N	\N	    	2025-11-20 15:35:05.417	2025-11-20 15:35:05.417
cmi7lek5l02c7106uebhe35qy	cmi7lek5g02c5106u907kc669	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:04:07	\N	\N	    	2025-11-20 15:35:06.633	2025-11-20 15:35:06.633
cmi7leksk02cb106u19esnct2	cmi7lekse02c9106uz5t7neyp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:04:14	\N	\N	    	2025-11-20 15:35:07.46	2025-11-20 15:35:07.46
cmi7lew4p02dj106umvg987tv	cmi7lew4l02dh106uhvk98ew5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:07:33	\N	\N	    	2025-11-20 15:35:22.153	2025-11-20 15:35:22.153
cmi7lel9a02cf106u4l1c50uc	cmi7lel8i02cd106uywt15vv2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:04:30	\N	\N	    	2025-11-20 15:35:08.06	2025-11-20 15:35:08.06
cmi7lemuw02cj106unc0kviv4	cmi7lemum02ch106uatj3wytk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:04:50	\N	\N	    	2025-11-20 15:35:10.136	2025-11-20 15:35:10.136
cmi7leo8b02cn106un6j6e459	cmi7leo8602cl106undb7dlrh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:05:25	\N	\N	    	2025-11-20 15:35:11.916	2025-11-20 15:35:11.916
cmi7leoj902cr106utlsppiw4	cmi7leoj602cp106uyi4ogs8z	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:05:34	\N	\N	    	2025-11-20 15:35:12.309	2025-11-20 15:35:12.309
cmi7leqkn02cv106ugajye7fw	cmi7leqke02ct106uqmr0jfk6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:05:50	\N	\N	    	2025-11-20 15:35:14.951	2025-11-20 15:35:14.951
cmi7leqm902cz106uizi3qiai	cmi7leqm602cx106uw080snig	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:05:44	\N	\N	    	2025-11-20 15:35:15.009	2025-11-20 15:35:15.009
cmi7lermo02d3106uuwzzdk41	cmi7lerml02d1106u76iieys8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:05:55	\N	\N	    	2025-11-20 15:35:16.32	2025-11-20 15:35:16.32
cmi7lesii02d7106ut5k5sfi0	cmi7lesic02d5106u0zhvk4a9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:06:49	\N	\N	    	2025-11-20 15:35:17.466	2025-11-20 15:35:17.466
cmi7leulq02db106unzcyqjxl	cmi7leulg02d9106u7p6brhav	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:07:28	\N	\N	    	2025-11-20 15:35:20.174	2025-11-20 15:35:20.174
cmi7lew3v02df106uwviu9k1j	cmi7lew3q02dd106ubtsr5sm1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:07:49	\N	\N	    	2025-11-20 15:35:22.123	2025-11-20 15:35:22.123
cmi7lexa002dn106udkz3ub52	cmi7lex9x02dl106uqunhwmhr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:07:53	\N	\N	    	2025-11-20 15:35:23.64	2025-11-20 15:35:23.64
cmi7lexc902dr106ulfkxi8x2	cmi7lexc602dp106u63sdxh5m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:07:37	\N	\N	    	2025-11-20 15:35:23.721	2025-11-20 15:35:23.721
cmi7lf09p02dv106uu18bpwr8	cmi7lf09l02dt106uxrctyn60	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:08:09	\N	\N	    	2025-11-20 15:35:27.517	2025-11-20 15:35:27.517
cmi7lf2bo02dz106upr1yc5ag	cmi7lf2bl02dx106umzye36l3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:09:04	\N	\N	    	2025-11-20 15:35:30.18	2025-11-20 15:35:30.18
cmi7lf2q602e3106uii0wcsxb	cmi7lf2pv02e1106uk2e5royj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:07:56	\N	\N	    	2025-11-20 15:35:30.701	2025-11-20 15:35:30.701
cmi7lf30f02e7106uo93a97p3	cmi7lf30402e5106ul2l2wp10	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:08:12	\N	\N	    	2025-11-20 15:35:31.071	2025-11-20 15:35:31.071
cmi7lf3is02eb106u7i7o3bfk	cmi7lf3il02e9106upfu8904h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:09:09	\N	\N	    	2025-11-20 15:35:31.732	2025-11-20 15:35:31.732
cmi7lf63602ef106u56hlkfh2	cmi7lf63002ed106u16ft6oel	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:09:50	\N	\N	    	2025-11-20 15:35:35.058	2025-11-20 15:35:35.058
cmi7lf6di02ej106usm6im6c3	cmi7lf6df02eh106u1d6pq8xs	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:09:39	\N	\N	    	2025-11-20 15:35:35.431	2025-11-20 15:35:35.431
cmi7lf6kv02en106unhnzcsoh	cmi7lf6kk02el106uyjd3966o	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:09:27	\N	\N	    	2025-11-20 15:35:35.695	2025-11-20 15:35:35.695
cmi7lf7k002er106u4u78oa01	cmi7lf7jt02ep106ueniiksmb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:09:54	\N	\N	    	2025-11-20 15:35:36.96	2025-11-20 15:35:36.96
cmi7lfae302ev106uyeg32mqs	cmi7lfadw02et106ubr0wzg1a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:10:09	\N	\N	    	2025-11-20 15:35:40.635	2025-11-20 15:35:40.635
cmi7lfal202ez106usveridc2	cmi7lfakv02ex106uo032zaz3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:11:44	\N	\N	    	2025-11-20 15:35:40.886	2025-11-20 15:35:40.886
cmi7lfawx02f3106u1j022hej	cmi7lfawq02f1106uwpp7hm8h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	35	2025-11-19 13:10:14	\N	\N	    	2025-11-20 15:35:41.313	2025-11-20 15:35:41.313
cmi7lfb3x02f7106u5g2lpfax	cmi7lfb3p02f5106u5o8807s5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	30	2025-11-19 13:11:23	\N	\N	    	2025-11-20 15:35:41.565	2025-11-20 15:35:41.565
cmi7lfelb02fb106u1xrkpct6	cmi7lfel602f9106ubypnoeu2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	28	2025-11-19 13:12:03	\N	\N	    	2025-11-20 15:35:46.08	2025-11-20 15:35:46.08
cmi7lfeu402ff106u52luqtjn	cmi7lfett02fd106urjn89lzy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:12:43	\N	\N	    	2025-11-20 15:35:46.395	2025-11-20 15:35:46.395
cmi7lfeun02fj106u5c7l4dtx	cmi7lfeue02fh106uzn5dtdxl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:12:48	\N	\N	    	2025-11-20 15:35:46.415	2025-11-20 15:35:46.415
cmi7lfey202fn106unoi1c3sx	cmi7lfexr02fl106u1njg3ha3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	28	2025-11-19 13:12:13	\N	\N	    	2025-11-20 15:35:46.538	2025-11-20 15:35:46.538
cmi7lfktt02fr106ufv6c4vb9	cmi7lfkto02fp106u2t63xo1l	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:12:51	\N	\N	    	2025-11-20 15:35:54.162	2025-11-20 15:35:54.162
cmi7lfl4102fv106uphy9tsa8	cmi7lfl3w02ft106uuuvgy9ts	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:13:15	\N	\N	    	2025-11-20 15:35:54.529	2025-11-20 15:35:54.529
cmi7lfl5m02fz106uuipccfb3	cmi7lfl5k02fx106usu4qztij	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:13:46	\N	\N	    	2025-11-20 15:35:54.587	2025-11-20 15:35:54.587
cmi7lfl6202g3106u3e3qc8jy	cmi7lfl5z02g1106ums8u2pbk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:13:18	\N	\N	    	2025-11-20 15:35:54.602	2025-11-20 15:35:54.602
cmi7lfo6602g7106ufdcfec7q	cmi7lfo6102g5106uftc3llvm	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:13:49	\N	\N	    	2025-11-20 15:35:58.494	2025-11-20 15:35:58.494
cmi7lfotm02gb106ubhaelson	cmi7lfotb02g9106upi38ur9i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:13:54	\N	\N	    	2025-11-20 15:35:59.337	2025-11-20 15:35:59.337
cmi7lfprd02gf106u8qy3kewe	cmi7lfpqv02gd106u983mc4hw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:14:20	\N	\N	    	2025-11-20 15:36:00.554	2025-11-20 15:36:00.554
cmi7lfq2602gj106u5ibon461	cmi7lfq1x02gh106uv95amv3h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:13:58	\N	\N	    	2025-11-20 15:36:00.942	2025-11-20 15:36:00.942
cmi7lfrhu02gn106uuxnrmesp	cmi7lfrhg02gl106uaeiadyth	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:14:35	\N	\N	    	2025-11-20 15:36:02.802	2025-11-20 15:36:02.802
cmi7lfs7q02gr106usrq0awxh	cmi7lfs7i02gp106uffx2426e	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:14:39	\N	\N	    	2025-11-20 15:36:03.734	2025-11-20 15:36:03.734
cmi7lfsvt02gv106uybx0e7vu	cmi7lfsvl02gt106u3jimukb7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:14:43	\N	\N	    	2025-11-20 15:36:04.601	2025-11-20 15:36:04.601
cmi7lfubf02gz106ua1574pnd	cmi7lfub702gx106uo5lmajrt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:14:47	\N	\N	    	2025-11-20 15:36:06.459	2025-11-20 15:36:06.459
cmi7lfv9002h3106u9mcm9dsb	cmi7lfv8r02h1106uog4eiuhq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:15:15	\N	\N	    	2025-11-20 15:36:07.669	2025-11-20 15:36:07.669
cmi7lfvi502h7106ucaacml2a	cmi7lfvhx02h5106uqu7ptx7b	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:15:11	\N	\N	    	2025-11-20 15:36:07.997	2025-11-20 15:36:07.997
cmi7lfw6r02hb106uu3linotu	cmi7lfw6e02h9106urxmbzcxb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:15:18	\N	\N	    	2025-11-20 15:36:08.883	2025-11-20 15:36:08.883
cmi7lfxwa02hf106uuwgemudp	cmi7lfxvx02hd106u114cx93l	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:15:51	\N	\N	    	2025-11-20 15:36:11.098	2025-11-20 15:36:11.098
cmi7lfy2j02hj106uaesgxb1b	cmi7lfy2602hh106ul6osnevy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:15:45	\N	\N	    	2025-11-20 15:36:11.323	2025-11-20 15:36:11.323
cmi7lfyfb02hn106u6n6wyh4b	cmi7lfyf202hl106urplflniq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:15:55	\N	\N	    	2025-11-20 15:36:11.784	2025-11-20 15:36:11.784
cmi7lfzrt02hr106uw7vt0lo9	cmi7lfzrl02hp106u7om0d88m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:01	\N	\N	    	2025-11-20 15:36:13.53	2025-11-20 15:36:13.53
cmi7lg0f302hv106ug12r381h	cmi7lg0ev02ht106uxygmimnd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:05	\N	\N	    	2025-11-20 15:36:14.367	2025-11-20 15:36:14.367
cmi7lg28602hz106uonkhbmea	cmi7lg27y02hx106up2tlz8ug	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:08	\N	\N	    	2025-11-20 15:36:16.71	2025-11-20 15:36:16.71
cmi7lg2j702i3106u5nfvf54y	cmi7lg2iu02i1106u5zw59jlc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:21	\N	\N	    	2025-11-20 15:36:17.106	2025-11-20 15:36:17.106
cmi7lg34q02i7106ugt863pf9	cmi7lg34d02i5106uy7pbl1h1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:47	\N	\N	    	2025-11-20 15:36:17.882	2025-11-20 15:36:17.882
cmi7lg3vs02ib106u8wiliowp	cmi7lg3vj02i9106ugfhj3oj7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:27	\N	\N	    	2025-11-20 15:36:18.856	2025-11-20 15:36:18.856
cmi7lg5me02if106ussaj2d5f	cmi7lg5m502id106uwfusg2es	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	250	22.00	1/125	27	2025-11-19 13:16:50	\N	\N	    	2025-11-20 15:36:21.11	2025-11-20 15:36:21.11
cmi7m9nms02ij106uyq6hy2tj	cmi7m9nm902ih106uo07pp3yl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 08:59:42	\N	\N	    	2025-11-20 15:59:17.476	2025-11-20 15:59:17.476
cmi7m9nwk02in106ukywgz5ih	cmi7m9nwf02il106u84ii4une	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:17	\N	\N	    	2025-11-20 15:59:17.829	2025-11-20 15:59:17.829
cmi7m9o2y02ir106u5vmc03ii	cmi7m9o2l02ip106u3f0v8zjn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:03:18	\N	\N	    	2025-11-20 15:59:18.058	2025-11-20 15:59:18.058
cmi7m9o3i02iv106uubjbxn4w	cmi7m9o3f02it106u4vr1e8oy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:11	\N	\N	    	2025-11-20 15:59:18.078	2025-11-20 15:59:18.078
cmi7m9tw002iz106uiade8qd8	cmi7m9tvo02ix106u327arvpn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:03:42	\N	\N	    	2025-11-20 15:59:25.583	2025-11-20 15:59:25.583
cmi7m9ue102j3106udd7bv5tu	cmi7m9udw02j1106u9jyw65e5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:06	\N	\N	    	2025-11-20 15:59:26.233	2025-11-20 15:59:26.233
cmi7m9uxi02j7106uhdarkmze	cmi7m9uxd02j5106u3a47m9ga	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:09	\N	\N	    	2025-11-20 15:59:26.934	2025-11-20 15:59:26.934
cmi7m9uzq02jb106u4b80zt0s	cmi7m9uzn02j9106uq4sg9aud	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:02	\N	\N	    	2025-11-20 15:59:27.014	2025-11-20 15:59:27.014
\.


--
-- Data for Name: asset_reservations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.asset_reservations (id, "assetId", "userId", "projectId", "startDate", "endDate", purpose, status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.assets (id, "assetCode", name, category, subcategory, manufacturer, model, "serialNumber", specifications, "purchaseDate", "purchasePrice", supplier, "invoiceNumber", "warrantyExpiration", "currentValue", "notesFinancial", status, condition, location, photos, documents, "qrCode", "rfidTag", tags, notes, "createdAt", "updatedAt", "createdById", "vendorId", "purchaseOrderId", "goodsReceiptId", "vendorInvoiceId", "residualValue", "usefulLifeYears") FROM stdin;
cmhq2nnnw0051nc8tz7435v1w	CAM-202501-001	Sony A7S III	Camera	Mirrorless	Sony	A7S III	SN-A7S3-12345	\N	2024-03-15 00:00:00	55000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Kamera utama untuk produksi video 4K	2025-11-08 09:18:13.388	2025-11-08 09:18:13.388	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nno20053nc8t9o9a1etf	CAM-202501-002	Canon EOS R5	Camera	Mirrorless	Canon	EOS R5	SN-R5-67890	\N	2024-05-10 00:00:00	65000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	CHECKED_OUT	EXCELLENT	Out - Project SM-001	\N	\N	\N	\N	\N	Sedang digunakan untuk project social media	2025-11-08 09:18:13.394	2025-11-08 09:18:13.394	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nno60055nc8t2dsceyui	LEN-202501-001	Sony FE 24-70mm f/2.8 GM II	Lens	Zoom Lens	Sony	SEL2470GM2	SN-LENS-11111	\N	2024-03-15 00:00:00	32000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Lensa zoom serbaguna untuk Sony A7S III	2025-11-08 09:18:13.398	2025-11-08 09:18:13.398	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nno90057nc8tdkokgar8	LEN-202501-002	Canon RF 70-200mm f/2.8L	Lens	Telephoto Lens	Canon	RF70200F28L	SN-LENS-22222	\N	2024-05-10 00:00:00	42000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	AVAILABLE	GOOD	Equipment Room A	\N	\N	\N	\N	\N	Lensa telephoto untuk Canon R5	2025-11-08 09:18:13.401	2025-11-08 09:18:13.401	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nnod0059nc8t03a30abu	LIG-202501-001	Godox SL-60W LED Light	Lighting	LED Panel	Godox	SL-60W	SN-LIGHT-33333	\N	2024-06-20 00:00:00	3500000.00	Toko Lighting Jakarta	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Studio B	\N	\N	\N	\N	\N	Lampu LED untuk studio photography	2025-11-08 09:18:13.405	2025-11-08 09:18:13.405	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nnoh005bnc8tj4cajsi3	LIG-202501-002	Aputure 300D Mark II	Lighting	LED Light	Aputure	300D Mark II	SN-APU-44444	\N	2024-07-15 00:00:00	12000000.00	Toko Lighting Jakarta	\N	\N	\N	\N	IN_MAINTENANCE	FAIR	Maintenance Workshop	\N	\N	\N	\N	\N	Dalam perbaikan - mounting bracket rusak	2025-11-08 09:18:13.409	2025-11-08 09:18:13.409	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nnol005dnc8tasmwnato	AUD-202501-001	Rode VideoMic Pro Plus	Audio	Microphone	Rode	VideoMic Pro+	SN-RODE-55555	\N	2024-04-10 00:00:00	4500000.00	Audio Equipment Store	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Microphone shotgun untuk video production	2025-11-08 09:18:13.413	2025-11-08 09:18:13.413	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nnop005fnc8t8go60nw9	COM-202501-001	MacBook Pro 16" M2 Max	Computer	Laptop	Apple	MacBook Pro 16 M2 Max	SN-MAC-66666	\N	2024-02-01 00:00:00	48000000.00	iStore Jakarta	\N	\N	\N	\N	RESERVED	EXCELLENT	Editor Desk 1	\N	\N	\N	\N	\N	Reserved untuk video editing project besar	2025-11-08 09:18:13.417	2025-11-08 09:18:13.417	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nnot005hnc8tvc1fynjo	ACC-202501-001	DJI Ronin RSC 2	Accessories	Gimbal	DJI	Ronin RSC 2	SN-DJI-77777	\N	2024-08-05 00:00:00	8500000.00	DJI Store Jakarta	\N	\N	\N	\N	AVAILABLE	GOOD	Equipment Room B	\N	\N	\N	\N	\N	Gimbal 3-axis untuk camera mirrorless	2025-11-08 09:18:13.421	2025-11-08 09:18:13.421	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
cmhq2nnox005jnc8tr0433kyb	ACC-202501-002	Manfrotto MT055XPRO3 Tripod	Accessories	Tripod	Manfrotto	MT055XPRO3	SN-MAN-88888	\N	2024-01-20 00:00:00	6500000.00	Photography Equipment Store	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Tripod aluminum professional untuk camera berat	2025-11-08 09:18:13.425	2025-11-08 09:18:13.425	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.audit_logs (id, action, "entityType", "entityId", "oldValues", "newValues", "userId", "ipAddress", "userAgent", "createdAt") FROM stdin;
cmhq2nnnt004wnc8t844pvihr	CREATE	quotation	quotation-1	\N	{"status": "DRAFT", "totalAmount": 75000000.0, "quotationNumber": "QT-202501-001"}	cmhq2nmjq0000nc8t77189wtn	127.0.0.1	Seed Script	2025-11-08 09:18:13.386
cmhq2nnnt004xnc8tu5qp18lr	UPDATE	quotation	quotation-1	{"status": "DRAFT"}	{"status": "APPROVED"}	cmhq2nmjq0000nc8t77189wtn	127.0.0.1	Seed Script	2025-11-08 09:18:13.386
cmhq2nnnt004ync8tvvdu9k4p	CREATE	invoice	invoice-1	\N	{"status": "DRAFT", "totalAmount": 75000000.0, "invoiceNumber": "INV-202501-001"}	cmhq2nmjq0000nc8t77189wtn	127.0.0.1	Seed Script	2025-11-08 09:18:13.386
cmhq2nnnt004znc8t89z38ywr	UPDATE	invoice	invoice-2	{"status": "SENT"}	{"status": "PAID"}	cmhq2nmjq0000nc8t77189wtn	127.0.0.1	Seed Script	2025-11-08 09:18:13.386
cmi5xh8xc000p67opqu2c50it	CREATE	invoice	cmi5xh8x5000n67op3ebprhqn	\N	{"id": "cmi5xh8x5000n67op3ebprhqn", "user": {"id": "cmhq2nmjq0000nc8t77189wtn", "name": "Admin Sistem (Legacy)", "email": "admin@monomi.id"}, "terms": "1. Payment Terms: Net 1 day from invoice date\\n2. Project Timeline: 19 Nov 2025 - 20 Nov 2025\\n3. Scope: Lighting Rent \\n4. Deliverables: As specified in project requirements\\nPembayaran paling lambat pada tanggal jatuh tempo.\\nKeterlambatan pembayaran dikenakan denda 2% per bulan.\\nBarang yang telah dibeli tidak dapat dikembalikan.\\nHarga sudah termasuk PPN 11%.\\nSyarat Pembayaran: Net 7", "client": {"id": "cmi4qqce20002380fj2rukkfc", "name": "Alloysius BN", "email": null, "notes": null, "phone": null, "status": "active", "address": null, "company": "SMA Santo Aloysius Batununggal", "createdAt": "2025-11-18T15:40:55.995Z", "taxNumber": null, "updatedAt": "2025-11-19T10:53:31.184Z", "bankAccount": null, "paymentTerms": "Net 7", "contactPerson": "Belinda"}, "status": "DRAFT", "dueDate": "2025-12-31T11:37:35.065Z", "project": {"id": "cmi4r3vpu0003380f03pzncjw", "number": "PRJ-OT-202511-001", "output": "", "status": "PLANNING", "endDate": "2025-11-19T17:00:00.000Z", "clientId": "cmi4qqce20002380fj2rukkfc", "basePrice": 2150000.0, "createdAt": "2025-11-18T15:51:27.570Z", "netProfit": 0.0, "startDate": "2025-11-18T17:00:00.000Z", "updatedAt": "2025-11-19T11:34:30.139Z", "description": "Lighting Rent ", "grossProfit": 0.0, "scopeOfWork": "", "projectTypeId": "cmhq2nmoq000cnc8throx3abx", "budgetVariance": -2050000.0, "priceBreakdown": {"total": 2150000, "products": [{"name": "Aputure Lighting Equipment Rent", "price": 350000, "quantity": 3, "subtotal": 1050000, "description": "Aputure C300D Mark II"}, {"name": "Godox RGB Lighting", "price": 250000, "quantity": 2, "subtotal": 500000, "description": "Godox SZ 150R RGB"}, {"name": "Gaffer ", "price": 500000, "quantity": 1, "subtotal": 500000, "description": "Hiring 1 Gaffer for 1 Day Shooting"}, {"name": "Accommodation ", "price": 100000, "quantity": 1, "subtotal": 100000, "description": "Transport Rent Items "}], "calculatedAt": "2025-11-19T11:34:30.132Z"}, "estimatedBudget": 1988000.0, "projectedProfit": 162000.0, "totalPaidAmount": 0.0, "netMarginPercent": 0.0, "totalDirectCosts": 0.0, "estimatedExpenses": {"direct": [{"notes": "Rent Aputure", "amount": 950000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Rent Godox", "amount": 444000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Rent Lens", "amount": 194000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Hire Gaffer", "amount": 300000, "categoryId": "883f81b9-3f4f-4c8c-bb09-26698f17cf8f", "categoryName": "Freelancer - Social Media Specialist", "categoryNameId": "Freelancer Spesialis Media Sosial"}, {"notes": "Gocar", "amount": 100000, "categoryId": "cmhq3kf9g0006e626hyckgry5", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 1988000, "calculatedAt": "2025-11-19T11:34:30.136Z", "totalIndirect": 0, "totalEstimated": 1988000}, "grossMarginPercent": 0.0, "profitCalculatedAt": "2025-11-18T15:51:27.712Z", "profitCalculatedBy": null, "projectedNetMargin": 7.53, "totalIndirectCosts": 0.0, "totalAllocatedCosts": 0.0, "totalInvoicedAmount": 0.0, "projectedGrossMargin": 7.53, "budgetVariancePercent": -100.0}, "taxRate": null, "clientId": "cmi4qqce20002380fj2rukkfc", "createdAt": "2025-11-19T11:37:35.081Z", "createdBy": "cmhq2nmjq0000nc8t77189wtn", "projectId": "cmi4r3vpu0003380f03pzncjw", "signature": null, "taxAmount": null, "updatedAt": "2025-11-19T11:37:35.081Z", "includeTax": false, "paymentInfo": "Bank BCA Digital (Blu): 3462676350 a.n. Monomi Agency\\n\\nPembayaran dapat dilakukan melalui transfer bank atau tunai.\\nKonfirmasi pembayaran dapat dikirim melalui WhatsApp atau email.", "quotationId": "cmi5xg98g000d67opqghldbrq", "scopeOfWork": null, "totalAmount": 2150000.0, "creationDate": "2025-11-19T11:37:35.081Z", "markedPaidAt": null, "markedPaidBy": null, "invoiceNumber": "INV-2025/11/0001", "materaiAmount": null, "journalEntryId": null, "materaiApplied": false, "priceBreakdown": {"total": 2150000, "products": [{"name": "Aputure Lighting Equipment Rent", "price": 350000, "quantity": 3, "subtotal": 1050000, "description": "Aputure C300D Mark II"}, {"name": "Godox RGB Lighting", "price": 250000, "quantity": 2, "subtotal": 500000, "description": "Godox SZ 150R RGB"}, {"name": "Gaffer ", "price": 500000, "quantity": 1, "subtotal": 500000, "description": "Hiring 1 Gaffer for 1 Day Shooting"}, {"name": "Accommodation ", "price": 100000, "quantity": 1, "subtotal": 100000, "description": "Transport Rent Items "}], "calculatedAt": "2025-11-19T11:34:30.132Z"}, "subtotalAmount": null, "materaiRequired": false, "amountPerProject": 2150000.0, "materaiAppliedAt": null, "materaiAppliedBy": null, "paymentJournalId": null, "paymentMilestone": null, "paymentMilestoneId": null, "projectMilestoneId": null}	cmhq2nmjq0000nc8t77189wtn	\N	\N	2025-11-19 11:37:35.088
\.


--
-- Data for Name: bank_reconciliation_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.bank_reconciliation_items (id, "reconciliationId", "itemDate", "itemType", description, "descriptionId", amount, "isMatched", "matchedTransactionId", "matchedAt", "matchedBy", status, "requiresAdjustment", "adjustmentJournalId", "adjustedAt", "checkNumber", reference, "createdAt", "updatedAt", "createdBy", notes) FROM stdin;
\.


--
-- Data for Name: bank_reconciliations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.bank_reconciliations (id, "reconciliationNumber", "bankAccountId", "statementDate", "periodStartDate", "periodEndDate", "bookBalanceStart", "bookBalanceEnd", "statementBalance", "depositsInTransit", "outstandingChecks", "bankCharges", "bankInterest", "otherAdjustments", "adjustedBookBalance", "adjustedBankBalance", difference, "isBalanced", "statementReference", "statementFilePath", status, "reviewedBy", "reviewedAt", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "adjustmentJournalId", "createdAt", "updatedAt", "createdBy", "updatedBy", notes, "notesId") FROM stdin;
\.


--
-- Data for Name: bank_transfers; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.bank_transfers (id, "transferNumber", "transferDate", amount, currency, "originalAmount", "exchangeRate", "idrAmount", "fromAccountId", "toAccountId", description, "descriptionId", "descriptionEn", reference, "transferFee", "feeAccountId", "feePaymentMethod", "transferMethod", "bankReference", "confirmationCode", "projectId", "clientId", "journalEntryId", status, "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "completedAt", "completedBy", "createdAt", "updatedAt", "createdBy", "updatedBy", notes, "notesId") FROM stdin;
\.


--
-- Data for Name: business_journey_event_metadata; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.business_journey_event_metadata (id, "eventId", "userCreated", "userModified", source, priority, tags, "relatedDocuments", notes, "ipAddress", "userAgent", "materaiRequired", "materaiAmount", "complianceStatus", "createdAt", "updatedAt") FROM stdin;
cmi5xh8xm000t67opjk70ewv6	cmi5xh8xh000r67opnl6cz75h	cmhq2nmjq0000nc8t77189wtn	\N	SYSTEM	MEDIUM	{automation,invoice_generation}	{}	\N	\N	\N	f	\N	COMPLIANT	2025-11-19 11:37:35.099	2025-11-19 11:37:35.099
\.


--
-- Data for Name: business_journey_events; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.business_journey_events (id, type, title, description, status, amount, "clientId", "projectId", "quotationId", "invoiceId", "paymentId", "createdBy", "createdAt", "updatedAt") FROM stdin;
cmi5xh8xh000r67opnl6cz75h	INVOICE_GENERATED	Invoice Dibuat Otomatis	Invoice otomatis dibuat dari quotation cmi5xg98g000d67opqghldbrq. Total: Rp 2.150.000. 	COMPLETED	2150000.00	cmi4qqce20002380fj2rukkfc	cmi4r3vpu0003380f03pzncjw	cmi5xg98g000d67opqghldbrq	cmi5xh8x5000n67op3ebprhqn	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 11:37:35.094	2025-11-19 11:37:35.094
\.


--
-- Data for Name: cash_bank_balances; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.cash_bank_balances (id, period, "periodDate", year, month, "openingBalance", "closingBalance", "totalInflow", "totalOutflow", "netChange", "calculatedAt", "calculatedBy", "createdAt", "updatedAt", "createdBy", "updatedBy", notes) FROM stdin;
\.


--
-- Data for Name: cash_transactions; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.cash_transactions (id, "transactionNumber", "transactionType", category, "transactionDate", amount, currency, "originalAmount", "exchangeRate", "idrAmount", "cashAccountId", "offsetAccountId", description, "descriptionId", "descriptionEn", reference, "paymentMethod", "checkNumber", "bankReference", "projectId", "clientId", "journalEntryId", status, "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "createdAt", "updatedAt", "createdBy", "updatedBy", notes, "notesId") FROM stdin;
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.chart_of_accounts (id, code, name, "nameId", "accountType", "accountSubType", "normalBalance", "parentId", "isControlAccount", "isTaxAccount", "taxType", currency, "isCurrencyAccount", "isActive", "isSystemAccount", description, "descriptionId", "createdAt", "updatedAt") FROM stdin;
cmhq2nmsy000onc8tmmnmrwb7	1-1010	Cash	Kas	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	t	t	t	Cash on hand	Kas ditangan	2025-11-08 09:18:12.274	2025-11-08 09:18:12.274
cmhq2nmtj000pnc8tjg5t42t1	1-1020	Bank Account	Rekening Bank	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	t	t	t	Bank accounts (BCA, Mandiri, BNI)	Rekening bank (BCA, Mandiri, BNI)	2025-11-08 09:18:12.295	2025-11-08 09:18:12.295
cmhq2nmtw000qnc8t7dd7q066	1-1021	USD Bank Account	Rekening Bank USD	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	USD	t	t	f	USD denominated bank accounts	Rekening bank dalam mata uang USD	2025-11-08 09:18:12.308	2025-11-08 09:18:12.308
cmhq2nmue000rnc8t4syhnda2	1-1022	USDT Crypto Wallet	Dompet Kripto USDT	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	USDT	t	t	f	USDT (Tether) cryptocurrency wallet - FASB ASU 2023-08 compliant	Dompet cryptocurrency USDT (Tether) - Sesuai FASB ASU 2023-08	2025-11-08 09:18:12.326	2025-11-08 09:18:12.326
cmhq2nmuq000snc8tpejic79x	1-2010	Accounts Receivable	Piutang Usaha	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	f	t	t	Accounts receivable from customers	Piutang dari pelanggan	2025-11-08 09:18:12.338	2025-11-08 09:18:12.338
cmhq2nmv4000tnc8tmgj9h9gj	1-3010	Prepaid Expenses	Biaya Dibayar Dimuka	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Prepaid rent, insurance, etc.	Sewa, asuransi, dll yang dibayar dimuka	2025-11-08 09:18:12.352	2025-11-08 09:18:12.352
cmhq2nmvn000unc8tvef32u2t	1-4010	Equipment	Peralatan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Computer equipment, furniture, etc.	Komputer, mebel, dll	2025-11-08 09:18:12.371	2025-11-08 09:18:12.371
cmhq2nmw4000vnc8tg5n6ywx7	1-4020	Accumulated Depreciation	Akumulasi Penyusutan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	t	Accumulated depreciation on equipment (PSAK 16)	Akumulasi penyusutan peralatan (PSAK 16)	2025-11-08 09:18:12.388	2025-11-08 09:18:12.388
cmhq2nmwo000wnc8tj1th9aaa	1-2015	Allowance for Doubtful Accounts	Penyisihan Piutang Tak Tertagih	ASSET	CURRENT_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	t	Expected credit loss provision for accounts receivable (PSAK 71)	Penyisihan kerugian kredit ekspektasian untuk piutang usaha (PSAK 71)	2025-11-08 09:18:12.408	2025-11-08 09:18:12.408
cmhq2nmx9000xnc8tt4hqpfvd	2-1010	Accounts Payable	Hutang Usaha	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	t	f	\N	IDR	f	t	t	Accounts payable to vendors	Hutang kepada vendor	2025-11-08 09:18:12.429	2025-11-08 09:18:12.429
cmhq2nmxe000ync8taqnosmyr	2-2010	PPN Payable	Hutang PPN	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPN_OUT	IDR	f	t	t	VAT payable to tax authority	PPN yang harus dibayar ke DJP	2025-11-08 09:18:12.434	2025-11-08 09:18:12.434
cmhq2nmy6000znc8tvtvugey4	2-2020	PPh Payable	Hutang PPh	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPH23	IDR	f	t	t	Withholding tax payable	PPh yang harus dibayar	2025-11-08 09:18:12.462	2025-11-08 09:18:12.462
cmhq2nmyk0010nc8taf5dbm3s	3-1010	Owner Capital	Modal Pemilik	EQUITY	CAPITAL	CREDIT	\N	f	f	\N	IDR	f	t	t	Owner's capital investment	Modal yang disetorkan pemilik	2025-11-08 09:18:12.476	2025-11-08 09:18:12.476
cmhq2nmyy0011nc8tysxep2n8	3-2010	Retained Earnings	Laba Ditahan	EQUITY	RETAINED_EARNINGS	CREDIT	\N	f	f	\N	IDR	f	t	t	Accumulated retained earnings	Akumulasi laba yang ditahan	2025-11-08 09:18:12.489	2025-11-08 09:18:12.489
cmhq2nmzf0012nc8t8xjye4hz	3-3010	Current Year Profit/Loss	Laba/Rugi Tahun Berjalan	EQUITY	CURRENT_EARNINGS	CREDIT	\N	f	f	\N	IDR	f	t	t	Current year profit or loss	Laba/rugi tahun berjalan	2025-11-08 09:18:12.507	2025-11-08 09:18:12.507
cmhq2nmzq0013nc8t7g5r15xp	3-4010	Owner's Drawing	Prive Pemilik	EQUITY	DRAWING	DEBIT	\N	f	f	\N	IDR	f	t	t	Owner withdrawals	Pengambilan pemilik	2025-11-08 09:18:12.518	2025-11-08 09:18:12.518
cmhq2nn060014nc8t06xfq0oe	4-1010	Service Revenue	Pendapatan Jasa	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	t	Revenue from services rendered	Pendapatan dari jasa yang diberikan	2025-11-08 09:18:12.534	2025-11-08 09:18:12.534
cmhq2nn0h0015nc8tn11fp7l9	4-2010	Sales Revenue	Pendapatan Penjualan	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from sales	Pendapatan dari penjualan	2025-11-08 09:18:12.545	2025-11-08 09:18:12.545
cmhq2nn0v0016nc8tl8mggjts	4-9010	Other Income	Pendapatan Lain-Lain	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	t	Other income from non-operating activities	Pendapatan lain-lain dari aktivitas non-operasional	2025-11-08 09:18:12.559	2025-11-08 09:18:12.559
cmhq2nn180017nc8tbs4dc4u6	6-1010	Sales Salaries	Gaji Penjualan	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Salaries and allowances for sales staff	Gaji dan tunjangan karyawan penjualan	2025-11-08 09:18:12.572	2025-11-08 09:18:12.572
cmhq2nn1o0018nc8th48n6mst	6-1030	Advertising & Promotion	Iklan dan Promosi	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising, promotion, and marketing costs	Biaya iklan, promosi, dan marketing	2025-11-08 09:18:12.588	2025-11-08 09:18:12.588
cmhq2nn1z0019nc8tix6u5f1e	6-1070	Digital Marketing	Marketing Digital	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Online marketing costs	Biaya marketing online	2025-11-08 09:18:12.6	2025-11-08 09:18:12.6
cmhq2nn2e001anc8t2f2eyjpm	6-2020	Office Rent	Sewa Kantor	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Office rental costs	Biaya sewa kantor	2025-11-08 09:18:12.614	2025-11-08 09:18:12.614
cmhq2nn2t001bnc8twnp54g5l	6-2030	Electricity & Water	Listrik dan Air	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Electricity and water costs	Biaya listrik dan air	2025-11-08 09:18:12.629	2025-11-08 09:18:12.629
cmhq2nn38001cnc8tiwgp49u0	6-2050	Office Supplies	Perlengkapan Kantor	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Stationery and office supplies	Alat tulis dan perlengkapan kantor	2025-11-08 09:18:12.644	2025-11-08 09:18:12.644
cmhq2nn3j001dnc8tgu7wzq3i	6-2070	Professional Services	Jasa Profesional	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Professional service fees	Biaya jasa profesional	2025-11-08 09:18:12.655	2025-11-08 09:18:12.655
cmhq2nn3x001enc8t6e80t3h4	6-2130	Software & Licenses	Software dan Lisensi	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Software and license costs	Biaya software dan lisensi	2025-11-08 09:18:12.669	2025-11-08 09:18:12.669
cmhq2nn4b001fnc8t02ahzyfj	6-2160	Bank Charges	Biaya Bank	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Bank fees and charges	Biaya administrasi bank	2025-11-08 09:18:12.683	2025-11-08 09:18:12.683
cmhq2nn4q001gnc8t0sw1ahee	6-2190	Miscellaneous Expenses	Biaya Lain-Lain	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Miscellaneous expenses	Biaya lain-lain	2025-11-08 09:18:12.699	2025-11-08 09:18:12.699
cmhq2nn51001hnc8t3xxlv2yt	6-3010	Depreciation Expense	Beban Penyusutan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	t	Depreciation expense on fixed assets (PSAK 16)	Beban penyusutan aset tetap (PSAK 16)	2025-11-08 09:18:12.71	2025-11-08 09:18:12.71
cmhq2nn5h001inc8tjce05bzq	8-1010	Bad Debt Expense	Beban Piutang Tak Tertagih	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	t	Bad debt expense and ECL provision (PSAK 71)	Beban piutang tak tertagih dan penyisihan kerugian kredit (PSAK 71)	2025-11-08 09:18:12.725	2025-11-08 09:18:12.725
cmhq2nn5w001jnc8tvq5h8urw	8-2010	Other Expenses	Beban Lain-Lain	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Other non-operating expenses	Beban lain-lain diluar operasional	2025-11-08 09:18:12.74	2025-11-08 09:18:12.74
cmhq2nn6e001knc8tivzrxcu4	1-1510	Inventory - Raw Materials	Persediaan Bahan Baku	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	f	t	f	Raw materials inventory	Persediaan bahan baku untuk produksi	2025-11-08 09:18:12.758	2025-11-08 09:18:12.758
cmhq2nn6s001lnc8tsaptirnf	1-1520	Inventory - Work in Progress	Persediaan Barang Dalam Proses	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Work in progress inventory	Persediaan barang yang masih dalam proses produksi	2025-11-08 09:18:12.771	2025-11-08 09:18:12.771
cmhq2nn76001mnc8tcu9s4yt8	1-1530	Inventory - Finished Goods	Persediaan Barang Jadi	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	f	t	f	Finished goods inventory	Persediaan barang jadi siap dijual	2025-11-08 09:18:12.786	2025-11-08 09:18:12.786
cmhq2nn7l001nnc8taj9ckbr9	1-2510	Prepaid PPh 23	PPh Pasal 23 Dibayar Dimuka	ASSET	CURRENT_ASSET	DEBIT	\N	f	t	PPh_23	IDR	f	t	f	Prepaid income tax article 23	Pajak penghasilan pasal 23 yang dibayar dimuka	2025-11-08 09:18:12.801	2025-11-08 09:18:12.801
cmhq2nn84001onc8tq6neicwn	1-2520	Prepaid PPh 25	PPh Pasal 25 Dibayar Dimuka	ASSET	CURRENT_ASSET	DEBIT	\N	f	t	PPh_25	IDR	f	t	f	Prepaid income tax article 25 (monthly installment)	Pajak penghasilan pasal 25 (angsuran bulanan)	2025-11-08 09:18:12.82	2025-11-08 09:18:12.82
cmhq2nn8h001pnc8t5kwfh8kp	1-2530	Prepaid PPN	PPN Masukan	ASSET	CURRENT_ASSET	DEBIT	\N	f	t	VAT_IN	IDR	f	t	f	Prepaid VAT (input VAT)	PPN yang dibayar saat pembelian (PPN Masukan)	2025-11-08 09:18:12.833	2025-11-08 09:18:12.833
cmhq2nn8w001qnc8tc3taudh2	1-4110	Land	Tanah	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Land (not depreciated)	Tanah (tidak disusutkan)	2025-11-08 09:18:12.847	2025-11-08 09:18:12.847
cmhq2nn9c001rnc8t8arx83v6	1-4210	Buildings	Bangunan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Buildings and structures	Bangunan dan gedung	2025-11-08 09:18:12.864	2025-11-08 09:18:12.864
cmhq2nn9t001snc8tlbtgl6ig	1-4220	Accumulated Depreciation - Buildings	Akumulasi Penyusutan Bangunan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for buildings	Akumulasi penyusutan bangunan	2025-11-08 09:18:12.881	2025-11-08 09:18:12.881
cmhq2nna3001tnc8t2326amqj	1-4310	Vehicles	Kendaraan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Vehicles and transportation equipment	Kendaraan dan alat transportasi	2025-11-08 09:18:12.891	2025-11-08 09:18:12.891
cmhq2nnai001unc8tymx2zzxw	1-4320	Accumulated Depreciation - Vehicles	Akumulasi Penyusutan Kendaraan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for vehicles	Akumulasi penyusutan kendaraan	2025-11-08 09:18:12.907	2025-11-08 09:18:12.907
cmhq2nnay001vnc8t8tzyx7jz	1-4410	Furniture & Fixtures	Perabotan Kantor	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Office furniture and fixtures	Perabotan dan perlengkapan kantor	2025-11-08 09:18:12.922	2025-11-08 09:18:12.922
cmhq2nnb1001wnc8tqjch9a3m	1-4420	Accumulated Depreciation - Furniture	Akumulasi Penyusutan Perabotan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for furniture	Akumulasi penyusutan perabotan	2025-11-08 09:18:12.926	2025-11-08 09:18:12.926
cmhq2nnb5001xnc8tj73ew7cj	1-5010	Goodwill	Goodwill	ASSET	INTANGIBLE_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Goodwill and brand value	Goodwill dan nilai merek	2025-11-08 09:18:12.929	2025-11-08 09:18:12.929
cmhq2nnb8001ync8tgzz5nvtu	1-5020	Patents & Trademarks	Hak Paten dan Merek Dagang	ASSET	INTANGIBLE_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Patents, trademarks, and intellectual property	Hak paten, merek dagang, dan kekayaan intelektual	2025-11-08 09:18:12.932	2025-11-08 09:18:12.932
cmhq2nnbb001znc8tv3pjddre	1-5030	Software Licenses	Lisensi Perangkat Lunak	ASSET	INTANGIBLE_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Long-term software licenses	Lisensi perangkat lunak jangka panjang	2025-11-08 09:18:12.935	2025-11-08 09:18:12.935
cmhq2nnbd0020nc8t1vg5djlh	2-1110	Wages Payable	Hutang Gaji	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	t	f	\N	IDR	f	t	f	Accrued wages and salaries payable	Hutang gaji dan upah karyawan	2025-11-08 09:18:12.938	2025-11-08 09:18:12.938
cmhq2nnbg0021nc8tg5n87h3a	2-1120	Accrued Expenses	Biaya Yang Masih Harus Dibayar	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Accrued expenses not yet paid	Biaya yang sudah terjadi tetapi belum dibayar	2025-11-08 09:18:12.941	2025-11-08 09:18:12.941
cmhq2nnbj0022nc8tkrzr45kf	2-1130	Customer Deposits	Uang Muka Pelanggan	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Advance payments from customers	Uang muka yang diterima dari pelanggan	2025-11-08 09:18:12.943	2025-11-08 09:18:12.943
cmhq2nnbm0023nc8tyzej6zrr	2-2110	PPh 21 Payable	Hutang PPh Pasal 21	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_21	IDR	f	t	f	Income tax article 21 (employee withholding) payable	Hutang pajak penghasilan pasal 21 (pemotongan gaji karyawan)	2025-11-08 09:18:12.946	2025-11-08 09:18:12.946
cmhq2nnbp0024nc8thprcbdc4	2-2120	PPh 23 Payable	Hutang PPh Pasal 23	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_23	IDR	f	t	f	Income tax article 23 (service withholding) payable	Hutang pajak penghasilan pasal 23 (pemotongan jasa)	2025-11-08 09:18:12.949	2025-11-08 09:18:12.949
cmhq2nnbs0025nc8tz6kwzf6y	2-2130	PPh 25 Payable	Hutang PPh Pasal 25	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_25	IDR	f	t	f	Income tax article 25 (monthly corporate tax) payable	Hutang pajak penghasilan pasal 25 (angsuran pajak badan)	2025-11-08 09:18:12.952	2025-11-08 09:18:12.952
cmhq2nnbu0026nc8twwj8xh7q	2-2140	PPh 29 Payable	Hutang PPh Pasal 29	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_29	IDR	f	t	f	Income tax article 29 (final annual tax) payable	Hutang pajak penghasilan pasal 29 (kurang bayar tahunan)	2025-11-08 09:18:12.955	2025-11-08 09:18:12.955
cmhq2nnbx0027nc8tag16o0pm	2-2150	PPN Output	PPN Keluaran	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	VAT_OUT	IDR	f	t	f	VAT collected from sales (output VAT)	PPN yang dipungut dari penjualan (PPN Keluaran)	2025-11-08 09:18:12.957	2025-11-08 09:18:12.957
cmhq2nnc00028nc8tnpe0er1o	2-3010	Bank Loans	Pinjaman Bank	LIABILITY	LONG_TERM_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Long-term bank loans	Pinjaman bank jangka panjang	2025-11-08 09:18:12.96	2025-11-08 09:18:12.96
cmhq2nnc20029nc8tzwm9w35x	2-3020	Bonds Payable	Hutang Obligasi	LIABILITY	LONG_TERM_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Bonds and debentures payable	Hutang obligasi dan surat utang	2025-11-08 09:18:12.963	2025-11-08 09:18:12.963
cmhq2nnc5002anc8tszd4478r	4-1020	Product Sales	Penjualan Produk	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from product sales	Pendapatan dari penjualan produk	2025-11-08 09:18:12.965	2025-11-08 09:18:12.965
cmhq2nnc8002bnc8t8duj0ms3	4-1030	Consulting Revenue	Pendapatan Konsultasi	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from consulting services	Pendapatan dari jasa konsultasi	2025-11-08 09:18:12.968	2025-11-08 09:18:12.968
cmhq2nncb002cnc8tljdthx03	4-1040	Training Revenue	Pendapatan Pelatihan	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from training services	Pendapatan dari jasa pelatihan	2025-11-08 09:18:12.971	2025-11-08 09:18:12.971
cmhq2nncd002dnc8t19i9idko	4-8010	Interest Income	Pendapatan Bunga	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	f	Interest income from deposits	Pendapatan bunga dari deposito	2025-11-08 09:18:12.974	2025-11-08 09:18:12.974
cmhq2nncg002enc8t45j64gq5	4-8020	Foreign Exchange Gain	Keuntungan Selisih Kurs	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	f	Realized foreign exchange gains	Keuntungan selisih kurs yang terealisasi	2025-11-08 09:18:12.976	2025-11-08 09:18:12.976
cmhq2nncj002fnc8t3394q5jz	4-8030	Gain on Asset Sales	Keuntungan Penjualan Aset	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	f	Gains from sale of fixed assets	Keuntungan dari penjualan aset tetap	2025-11-08 09:18:12.979	2025-11-08 09:18:12.979
cmhq2nncl002gnc8tv3q6qa32	5-1010	Cost of Goods Sold	Harga Pokok Penjualan	EXPENSE	COGS	DEBIT	\N	t	f	\N	IDR	f	t	f	Cost of goods sold	Harga pokok barang yang terjual	2025-11-08 09:18:12.982	2025-11-08 09:18:12.982
cmhq2nnco002hnc8t0nbd9xy7	5-1020	Direct Labor	Biaya Tenaga Kerja Langsung	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Direct labor costs for production	Biaya tenaga kerja langsung untuk produksi	2025-11-08 09:18:12.985	2025-11-08 09:18:12.985
cmhq2nncr002inc8t6ho05kbo	5-1030	Manufacturing Overhead	Biaya Overhead Pabrik	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Manufacturing overhead costs	Biaya overhead produksi	2025-11-08 09:18:12.987	2025-11-08 09:18:12.987
cmhq2nncu002jnc8tiwwqdqjz	6-5010	Salaries - Management	Gaji Manajemen	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Management salaries and compensation	Gaji dan kompensasi manajemen	2025-11-08 09:18:12.99	2025-11-08 09:18:12.99
cmhq2nncx002knc8tu1ibv3sf	6-5020	Salaries - Administrative	Gaji Administrasi	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Administrative staff salaries	Gaji karyawan administrasi	2025-11-08 09:18:12.993	2025-11-08 09:18:12.993
cmhq2nncz002lnc8teqnai89j	6-5030	Employee Benefits	Tunjangan Karyawan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Employee benefits (BPJS, insurance, allowances)	Tunjangan karyawan (BPJS, asuransi, tunjangan)	2025-11-08 09:18:12.996	2025-11-08 09:18:12.996
cmhq2nnd2002mnc8tlhbjsd81	6-5040	Severance Pay	Pesangon	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Employee severance and termination benefits	Pesangon dan uang pisah karyawan	2025-11-08 09:18:12.999	2025-11-08 09:18:12.999
cmhq2nnd5002nnc8tx2hx1y0d	6-4010	Income Tax Expense	Beban Pajak Penghasilan	EXPENSE	TAX_EXPENSE	DEBIT	\N	f	t	\N	IDR	f	t	f	Corporate income tax expense	Beban pajak penghasilan badan	2025-11-08 09:18:13.002	2025-11-08 09:18:13.002
cmhq2nnd8002onc8tfl0a63c2	6-4020	Property Tax	Pajak Bumi dan Bangunan (PBB)	EXPENSE	TAX_EXPENSE	DEBIT	\N	f	t	\N	IDR	f	t	f	Property tax (PBB)	Pajak bumi dan bangunan	2025-11-08 09:18:13.005	2025-11-08 09:18:13.005
cmhq2nndb002pnc8tvuq7p2e4	8-3010	Interest Expense	Beban Bunga	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Interest expense on loans	Beban bunga pinjaman	2025-11-08 09:18:13.008	2025-11-08 09:18:13.008
cmhq2nnde002qnc8tx9in3cq9	8-3020	Foreign Exchange Loss	Rugi Selisih Kurs	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Realized foreign exchange losses	Kerugian selisih kurs yang terealisasi	2025-11-08 09:18:13.01	2025-11-08 09:18:13.01
cmhq2nndh002rnc8tyj5eo35p	8-3030	Loss on Asset Sales	Kerugian Penjualan Aset	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Losses from sale of fixed assets	Kerugian dari penjualan aset tetap	2025-11-08 09:18:13.013	2025-11-08 09:18:13.013
cmhq2nndo002tnc8tyeln24et	4-2020	Photography Revenue	Pendapatan Fotografi	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from photography services	Pendapatan dari jasa fotografi	2025-11-08 09:18:13.02	2025-11-08 09:18:13.02
cmhq2nndr002unc8tr2mnkkoa	4-2030	Graphic Design Revenue	Pendapatan Desain Grafis	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from graphic design services	Pendapatan dari jasa desain grafis	2025-11-08 09:18:13.023	2025-11-08 09:18:13.023
cmhq2nndu002vnc8t9596a8cx	4-2040	Web Development Revenue	Pendapatan Pengembangan Website	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from web development services	Pendapatan dari jasa pembuatan website	2025-11-08 09:18:13.027	2025-11-08 09:18:13.027
cmhq2nndy002wnc8t4a5l23hx	4-2050	Social Media Management Revenue	Pendapatan Manajemen Media Sosial	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from social media management services	Pendapatan dari jasa manajemen media sosial	2025-11-08 09:18:13.03	2025-11-08 09:18:13.03
cmhq2nne2002xnc8tsphqogps	4-2060	Content Creation Revenue	Pendapatan Pembuatan Konten	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from content creation services	Pendapatan dari jasa pembuatan konten	2025-11-08 09:18:13.034	2025-11-08 09:18:13.034
cmhq2nne5002ync8twwzc4mcg	4-2070	Video Editing Revenue	Pendapatan Editing Video	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from video editing services	Pendapatan dari jasa editing video	2025-11-08 09:18:13.038	2025-11-08 09:18:13.038
cmhq2nne9002znc8tguhzfc64	4-2080	Animation Revenue	Pendapatan Animasi	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from animation services	Pendapatan dari jasa animasi	2025-11-08 09:18:13.041	2025-11-08 09:18:13.041
cmhq2nnec0030nc8t2qwrm85e	4-2090	Branding & Identity Revenue	Pendapatan Branding & Identitas	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from branding and corporate identity services	Pendapatan dari jasa branding dan identitas korporat	2025-11-08 09:18:13.044	2025-11-08 09:18:13.044
cmhq2nnef0031nc8t6nki8ctr	5-2010	Freelancer - Videographer	Freelancer Videografer	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance videographer costs	Biaya videografer freelance	2025-11-08 09:18:13.048	2025-11-08 09:18:13.048
cmhq2nnej0032nc8t428tqea5	5-2020	Freelancer - Photographer	Freelancer Fotografer	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance photographer costs	Biaya fotografer freelance	2025-11-08 09:18:13.051	2025-11-08 09:18:13.051
cmhq2nnem0033nc8tg06uoxk7	5-2030	Freelancer - Graphic Designer	Freelancer Desainer Grafis	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance graphic designer costs	Biaya desainer grafis freelance	2025-11-08 09:18:13.055	2025-11-08 09:18:13.055
cmhq2nneq0034nc8tzp4i6w3r	5-2040	Freelancer - Web Developer	Freelancer Developer Website	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance web developer costs	Biaya developer website freelance	2025-11-08 09:18:13.059	2025-11-08 09:18:13.059
cmhq2nneu0035nc8t3wpdxynp	5-2050	Freelancer - Video Editor	Freelancer Editor Video	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance video editor costs	Biaya editor video freelance	2025-11-08 09:18:13.062	2025-11-08 09:18:13.062
cmhq2nnex0036nc8td34rqqi1	5-2060	Freelancer - Content Writer	Freelancer Penulis Konten	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance content writer costs	Biaya penulis konten freelance	2025-11-08 09:18:13.066	2025-11-08 09:18:13.066
cmhq2nnf10037nc8tvlnkoyjs	5-3010	Stock Footage & Music	Footage & Musik Stok	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Stock footage, music, and media assets	Biaya footage, musik, dan aset media stok	2025-11-08 09:18:13.069	2025-11-08 09:18:13.069
cmhq2nnf50038nc8tzxe3f7m8	5-3020	Props & Equipment Rental	Sewa Properti & Peralatan	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Props and equipment rental for productions	Biaya sewa properti dan peralatan untuk produksi	2025-11-08 09:18:13.073	2025-11-08 09:18:13.073
cmhq2nnf80039nc8tdlt9wjvv	5-3030	Location Rental	Sewa Lokasi	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Location rental for shoots	Biaya sewa lokasi untuk pengambilan gambar	2025-11-08 09:18:13.077	2025-11-08 09:18:13.077
cmhq2nnfc003anc8tr1kiik4d	5-3040	Talent & Models	Talent & Model	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Talent and model fees	Biaya talent dan model	2025-11-08 09:18:13.08	2025-11-08 09:18:13.08
cmhq2nnfi003cnc8t0xdlvqnn	6-3020	Cloud Storage (Dropbox/Google)	Penyimpanan Cloud	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Cloud storage subscription for project files	Langganan penyimpanan cloud untuk file proyek	2025-11-08 09:18:13.087	2025-11-08 09:18:13.087
cmhq2nnfm003dnc8thq36o5jl	6-3030	Project Management Software	Software Manajemen Proyek	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Project management tools (Asana, Trello, Monday)	Tools manajemen proyek (Asana, Trello, Monday)	2025-11-08 09:18:13.09	2025-11-08 09:18:13.09
cmhq2nnfp003enc8t6emgq8nv	6-3040	Stock Photo Subscriptions	Langganan Foto Stok	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Stock photo subscriptions (Shutterstock, Unsplash Pro)	Langganan foto stok (Shutterstock, Unsplash Pro)	2025-11-08 09:18:13.094	2025-11-08 09:18:13.094
cmhq2nnft003fnc8t6rzlkwri	6-3050	Video Hosting & Streaming	Hosting & Streaming Video	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Video hosting services (Vimeo Pro, YouTube Premium)	Layanan hosting video (Vimeo Pro, YouTube Premium)	2025-11-08 09:18:13.097	2025-11-08 09:18:13.097
cmhq2nnfw003gnc8t3xgd5nqu	6-3060	Equipment Maintenance & Repair	Pemeliharaan & Perbaikan Peralatan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Camera, lens, and equipment maintenance	Pemeliharaan kamera, lensa, dan peralatan	2025-11-08 09:18:13.101	2025-11-08 09:18:13.101
cmhq2nng0003hnc8t2xb20btu	6-3070	Internet & Bandwidth	Internet & Bandwidth	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	High-speed internet for uploads and downloads	Internet berkecepatan tinggi untuk upload dan download	2025-11-08 09:18:13.104	2025-11-08 09:18:13.104
cmhq2nng4003inc8ta9ygs7mr	6-3080	Portfolio Website Hosting	Hosting Website Portfolio	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Portfolio website hosting and domain	Hosting dan domain website portfolio	2025-11-08 09:18:13.108	2025-11-08 09:18:13.108
cmhq2nng8003jnc8tmp4eitm7	4-3010	SEO & SEM Services Revenue	Pendapatan Layanan SEO & SEM	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from SEO and search engine marketing services	Pendapatan dari layanan SEO dan marketing mesin pencari	2025-11-08 09:18:13.112	2025-11-08 09:18:13.112
cmhq2nngb003knc8tab934zcs	4-3020	UI/UX Design Revenue	Pendapatan Desain UI/UX	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from user interface and experience design	Pendapatan dari desain antarmuka dan pengalaman pengguna	2025-11-08 09:18:13.116	2025-11-08 09:18:13.116
cmhq2nngf003lnc8tfy54itp1	4-3030	Mobile App Development Revenue	Pendapatan Pengembangan Aplikasi Mobile	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from mobile application development	Pendapatan dari pembuatan aplikasi mobile (iOS/Android)	2025-11-08 09:18:13.12	2025-11-08 09:18:13.12
cmhq2nngj003mnc8t1n9do81f	4-3040	Influencer Marketing Revenue	Pendapatan Marketing Influencer	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from influencer marketing campaign management	Pendapatan dari manajemen kampanye influencer marketing	2025-11-08 09:18:13.124	2025-11-08 09:18:13.124
cmhq2nngn003nnc8t744vki3t	4-3050	Podcast Production Revenue	Pendapatan Produksi Podcast	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from podcast recording and production services	Pendapatan dari jasa rekaman dan produksi podcast	2025-11-08 09:18:13.127	2025-11-08 09:18:13.127
cmhq2nngr003onc8tbhc8nph1	4-3060	Livestreaming Services Revenue	Pendapatan Jasa Livestreaming	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from live event streaming services	Pendapatan dari jasa siaran langsung acara	2025-11-08 09:18:13.131	2025-11-08 09:18:13.131
cmhq2nngu003pnc8tlvnn7nln	4-3070	3D Modeling & Rendering Revenue	Pendapatan Modeling & Rendering 3D	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from 3D modeling and rendering services	Pendapatan dari jasa modeling dan rendering 3D	2025-11-08 09:18:13.135	2025-11-08 09:18:13.135
cmhq2nngy003qnc8t1x9iio0x	4-3080	Email Marketing Services Revenue	Pendapatan Jasa Email Marketing	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from email marketing campaign management	Pendapatan dari manajemen kampanye email marketing	2025-11-08 09:18:13.138	2025-11-08 09:18:13.138
cmhq2nnh2003rnc8tzhglf0lx	1-4510	Camera & Photography Equipment	Kamera & Peralatan Fotografi	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Cameras, lenses, tripods, and photography accessories	Kamera, lensa, tripod, dan aksesoris fotografi	2025-11-08 09:18:13.142	2025-11-08 09:18:13.142
cmhq2nnh5003snc8tqgbrljx0	1-4520	Accumulated Depreciation - Camera Equipment	Akumulasi Penyusutan Peralatan Kamera	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for camera equipment	Akumulasi penyusutan peralatan kamera	2025-11-08 09:18:13.146	2025-11-08 09:18:13.146
cmhq2nnh9003tnc8tlmb1b68g	1-4530	Video & Audio Production Equipment	Peralatan Produksi Video & Audio	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Video cameras, microphones, audio recorders, mixers	Kamera video, mikrofon, perekam audio, mixer	2025-11-08 09:18:13.149	2025-11-08 09:18:13.149
cmhq2nnhd003unc8tyacgwe3o	1-4540	Accumulated Depreciation - Video/Audio Equipment	Akumulasi Penyusutan Peralatan Video/Audio	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for video and audio equipment	Akumulasi penyusutan peralatan video dan audio	2025-11-08 09:18:13.153	2025-11-08 09:18:13.153
cmhq2nnhh003vnc8t3skvpb06	1-4550	Lighting Equipment	Peralatan Pencahayaan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Studio lights, LED panels, reflectors, and lighting accessories	Lampu studio, panel LED, reflektor, dan aksesoris pencahayaan	2025-11-08 09:18:13.157	2025-11-08 09:18:13.157
cmhq2nnhl003wnc8tee0nwe9q	1-4560	Accumulated Depreciation - Lighting Equipment	Akumulasi Penyusutan Peralatan Pencahayaan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for lighting equipment	Akumulasi penyusutan peralatan pencahayaan	2025-11-08 09:18:13.161	2025-11-08 09:18:13.161
cmhq2nnho003xnc8t36grrg00	1-4570	Editing Workstations & Computers	Workstation Editing & Komputer	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	High-performance computers for video/photo editing and rendering	Komputer performa tinggi untuk editing video/foto dan rendering	2025-11-08 09:18:13.165	2025-11-08 09:18:13.165
cmhq2nnhs003ync8tt6u8txqj	1-4580	Accumulated Depreciation - Computers	Akumulasi Penyusutan Komputer	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for editing workstations	Akumulasi penyusutan workstation editing	2025-11-08 09:18:13.169	2025-11-08 09:18:13.169
cmhq2nnhw003znc8tdfzfp5ul	6-6010	Meta Ads (Facebook/Instagram)	Iklan Meta (Facebook/Instagram)	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on Meta platforms	Biaya iklan di platform Meta	2025-11-08 09:18:13.172	2025-11-08 09:18:13.172
cmhq2nni00040nc8tf6r4gtxz	6-6020	Google Ads (Search/Display/YouTube)	Google Ads (Search/Display/YouTube)	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on Google platforms	Biaya iklan di platform Google	2025-11-08 09:18:13.176	2025-11-08 09:18:13.176
cmhq2nni40041nc8t2ozs1cjq	6-6030	TikTok Ads	Iklan TikTok	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on TikTok platform	Biaya iklan di platform TikTok	2025-11-08 09:18:13.18	2025-11-08 09:18:13.18
cmhq2nni80042nc8t2kbq8yjz	6-6040	LinkedIn Ads	Iklan LinkedIn	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on LinkedIn platform	Biaya iklan di platform LinkedIn	2025-11-08 09:18:13.184	2025-11-08 09:18:13.184
cmhq2nnic0043nc8toepe55gr	6-7010	Figma/Sketch Subscription	Langganan Figma/Sketch	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	UI/UX design tool subscription	Langganan tools desain UI/UX	2025-11-08 09:18:13.188	2025-11-08 09:18:13.188
cmhq2nnif0044nc8tc2aajnum	6-7020	Font & Typography Licenses	Lisensi Font & Tipografi	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Premium font licenses for commercial use	Lisensi font premium untuk penggunaan komersial	2025-11-08 09:18:13.192	2025-11-08 09:18:13.192
cmhq2nnij0045nc8t4io1ikby	6-7030	Music Licensing (Epidemic Sound, Artlist)	Lisensi Musik (Epidemic Sound, Artlist)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Music licensing for video production	Lisensi musik untuk produksi video	2025-11-08 09:18:13.195	2025-11-08 09:18:13.195
cmhq2nnin0046nc8tty5mnovr	6-7040	3D Software (Blender/Cinema 4D)	Software 3D (Blender/Cinema 4D)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	3D modeling and rendering software subscriptions	Langganan software modeling dan rendering 3D	2025-11-08 09:18:13.199	2025-11-08 09:18:13.199
cmhq2nnir0047nc8t4h1ihxt8	6-7050	Color Grading Software (DaVinci Resolve)	Software Color Grading (DaVinci Resolve)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Professional color grading and finishing software	Software color grading dan finishing profesional	2025-11-08 09:18:13.203	2025-11-08 09:18:13.203
cmhq2nnix0048nc8ttoco1cm2	6-7060	Analytics Tools (Google Analytics, Hotjar)	Tools Analitik (Google Analytics, Hotjar)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Website analytics and user behavior tracking tools	Tools analitik website dan pelacakan perilaku user	2025-11-08 09:18:13.208	2025-11-08 09:18:13.208
cmhq2nnj20049nc8tqbbrtkbw	6-7070	Email Marketing Platform (Mailchimp, SendGrid)	Platform Email Marketing (Mailchimp, SendGrid)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Email marketing automation platform subscriptions	Langganan platform otomasi email marketing	2025-11-08 09:18:13.214	2025-11-08 09:18:13.214
cmhq2nnj7004anc8tfd26g10v	6-7080	CRM Software (HubSpot, Salesforce)	Software CRM (HubSpot, Salesforce)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Customer relationship management software	Software manajemen hubungan pelanggan	2025-11-08 09:18:13.219	2025-11-08 09:18:13.219
cmhq2nnjc004bnc8tggclskli	6-7090	Social Media Scheduling Tools (Buffer, Hootsuite)	Tools Penjadwalan Sosmed (Buffer, Hootsuite)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Social media scheduling and management platforms	Platform penjadwalan dan manajemen media sosial	2025-11-08 09:18:13.224	2025-11-08 09:18:13.224
cmhq2nnjh004cnc8trlsxoanp	6-7100	Domain & SSL Certificates	Domain & Sertifikat SSL	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Domain registrations and SSL certificate renewals	Registrasi domain dan perpanjangan sertifikat SSL	2025-11-08 09:18:13.229	2025-11-08 09:18:13.229
cmhq2nnjl004dnc8t7kpiadgg	6-7110	Web Hosting Services	Layanan Web Hosting	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Web hosting for client projects and internal sites	Web hosting untuk proyek klien dan website internal	2025-11-08 09:18:13.234	2025-11-08 09:18:13.234
cmhq2nnjq004enc8tln5bkms4	6-7120	VPN & Security Software	VPN & Software Keamanan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	VPN services and cybersecurity software subscriptions	Layanan VPN dan langganan software keamanan cyber	2025-11-08 09:18:13.238	2025-11-08 09:18:13.238
cmhq2nnjv004fnc8tkgrppdey	5-4010	Freelancer - Social Media Specialist	Freelancer Spesialis Media Sosial	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance social media specialist costs	Biaya spesialis media sosial freelance	2025-11-08 09:18:13.243	2025-11-08 09:18:13.243
cmhq2nnk0004gnc8tx2nrq8e3	5-4020	Freelancer - SEO Specialist	Freelancer Spesialis SEO	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance SEO specialist costs	Biaya spesialis SEO freelance	2025-11-08 09:18:13.248	2025-11-08 09:18:13.248
cmhq2nnk4004hnc8tiqc1phn1	5-4030	Freelancer - UI/UX Designer	Freelancer Desainer UI/UX	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance UI/UX designer costs	Biaya desainer UI/UX freelance	2025-11-08 09:18:13.252	2025-11-08 09:18:13.252
cmhq2nnk9004inc8tpmtudk93	5-4040	Freelancer - Motion Graphics Designer	Freelancer Desainer Motion Graphics	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance motion graphics designer costs	Biaya desainer motion graphics freelance	2025-11-08 09:18:13.257	2025-11-08 09:18:13.257
cmhq2nnke004jnc8tbdq99fy6	5-4050	Freelancer - Voice Over Artist	Freelancer Pengisi Suara	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Voice over artist fees for video narration	Biaya pengisi suara untuk narasi video	2025-11-08 09:18:13.262	2025-11-08 09:18:13.262
99b2cae7-b7b6-416e-aed4-4119fb7fd661	6-2010	Labor Costs	Biaya Tenaga Kerja	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	\N	\N	2025-11-08 09:41:57.527	2025-11-08 09:41:57.527
cmhq3juvr0002e6262w8yl5db	6-2021	Transportation Expenses	Beban Transportasi	EXPENSE	SALES_EXPENSE	DEBIT	\N	t	f	\N	IDR	f	t	f	\N	\N	2025-11-08 09:43:15.735	2025-11-08 09:43:15.735
cmhq3kf9a0005e626cfkmpaob	6-2022	Accomodation Expenses	Beban Akomodasi	EXPENSE	SALES_EXPENSE	DEBIT	\N	t	f	\N	IDR	f	t	f	\N	\N	2025-11-08 09:43:42.142	2025-11-08 09:43:42.142
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.clients (id, name, email, phone, address, company, "contactPerson", "paymentTerms", status, "createdAt", "updatedAt", "taxNumber", "bankAccount", notes) FROM stdin;
cmhiyns030000muz1gnwyukwc	MIRA SOUTHSEA PEARLS	mirasouthseapearls@gmail.com	+6281247139637	Apartment Puri Gandaria	MIRA SOUTHSEA PEARLS	Yasmine	Cash	active	2025-11-03 09:51:57.315	2025-11-09 07:31:01.786	\N	\N	\N
cmhq2wlib0000e626v1rsc9q8	Pravitha Utami	pravithautami@atlascopco.com	08122008800	Jl. AH. Nasution No. 262	PT. ATLAS COPCO	Pravitha Utami	Net 14	active	2025-11-08 09:25:10.499	2025-11-09 07:31:01.788	\N	\N	\N
cmi4qlsvp0001380f2ih86dn5	Cryptobeast	fjvalentino18@gmail.com	\N	\N	Cryptobeast	Julius	Net 14	active	2025-11-18 15:37:24.085	2025-11-18 15:37:24.085	\N	\N	\N
cmi4qqce20002380fj2rukkfc	Alloysius BN	\N	\N	\N	SMA Santo Aloysius Batununggal	Belinda	Net 7	active	2025-11-18 15:40:55.995	2025-11-19 10:53:31.184	\N	\N	\N
cmihcojn70002jvs4h6ejvqve	Heion	\N	08977756157	\N	Heion	Willy Harlim	Cash	active	2025-11-27 11:28:37.747	2025-11-27 11:28:37.747	\N	\N	\N
\.


--
-- Data for Name: collection_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.collection_items (id, "collectionId", "assetId", "order", "addedAt") FROM stdin;
\.


--
-- Data for Name: collections; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.collections (id, "projectId", name, description, "isDynamic", filters, "groupBy", "sortBy", "sortOrder", "isShared", "shareToken", "sharePassword", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.company_settings (id, "companyName", address, phone, email, website, "taxNumber", currency, "bankBCA", "bankMandiri", "bankBNI", "createdAt", "updatedAt") FROM stdin;
default	Monomi Agency	Taman Cibaduyut Indah Blok E 232	085156662098	admin@monomiagency.com	\N	000000000000000	IDR	3462676350	\N	\N	2025-11-02 18:28:31.021	2025-11-09 07:31:01.793
\.


--
-- Data for Name: content_calendar_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.content_calendar_items (id, "scheduledAt", "publishedAt", status, platforms, "clientId", "projectId", "createdBy", "createdAt", "updatedAt", caption) FROM stdin;
\.


--
-- Data for Name: content_media; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.content_media (id, url, key, type, "mimeType", size, width, height, duration, "originalName", "contentId", "uploadedAt", "thumbnailKey", "thumbnailUrl", "order") FROM stdin;
\.


--
-- Data for Name: deferred_revenue; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.deferred_revenue (id, "invoiceId", "paymentDate", "totalAmount", "recognitionDate", "recognizedAmount", "remainingAmount", status, "performanceObligation", "completionPercentage", "initialJournalId", "recognitionJournalId", "fiscalPeriodId", notes, "notesId", "createdAt", "updatedAt", "createdBy", "recognizedAt", "recognizedBy") FROM stdin;
\.


--
-- Data for Name: depreciation_entries; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.depreciation_entries (id, "assetId", "scheduleId", "periodDate", "fiscalPeriodId", "depreciationAmount", "accumulatedDepreciation", "bookValue", "journalEntryId", status, "calculatedAt", "postedAt", "postedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: depreciation_schedules; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.depreciation_schedules (id, "assetId", method, "depreciableAmount", "residualValue", "usefulLifeMonths", "usefulLifeYears", "depreciationPerMonth", "depreciationPerYear", "annualRate", "startDate", "endDate", "isActive", "isFulfilled", notes, "notesId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.documents (id, "fileName", "originalFileName", "filePath", "fileSize", "mimeType", category, description, "invoiceId", "quotationId", "projectId", "uploadedBy", "uploadedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.exchange_rates (id, "fromCurrency", "toCurrency", rate, "effectiveDate", "expiryDate", source, "isAutomatic", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: expense_approval_history; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.expense_approval_history (id, "expenseId", action, "actionBy", "previousStatus", "newStatus", comments, "commentsId", "commentsEn", "actionDate") FROM stdin;
\.


--
-- Data for Name: expense_budgets; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.expense_budgets (id, name, "nameId", description, "descriptionId", "categoryId", "projectId", "userId", amount, period, "startDate", "endDate", spent, remaining, "alertThreshold", "alertSent", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.expense_categories (id, code, "accountCode", "expenseClass", name, "nameId", description, "descriptionId", "parentId", "defaultPPNRate", "isLuxuryGoods", "withholdingTaxType", "withholdingTaxRate", icon, color, "isActive", "isBillable", "requiresReceipt", "requiresEFaktur", "approvalRequired", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmhq2nmp3000dnc8t8r2x6tna	SELLING_SALARIES	6-1010	SELLING	Sales Salaries	Gaji Penjualan	Salaries and allowances for sales staff	Gaji dan tunjangan karyawan penjualan	\N	0.0000	f	NONE	\N	user	#1890ff	t	f	t	f	t	1	2025-11-08 09:18:12.134	2025-11-08 09:18:12.134
cmhq2nmpn000enc8tgdcohbrt	ADVERTISING	6-1030	SELLING	Advertising & Promotion	Iklan dan Promosi	Advertising, promotion, and marketing costs	Biaya iklan, promosi, dan marketing	\N	0.1200	f	NONE	\N	sound	#fa8c16	t	t	t	t	t	3	2025-11-08 09:18:12.155	2025-11-08 09:18:12.155
cmhq2nmq5000fnc8tia4dm1wc	DIGITAL_MARKETING	6-1070	SELLING	Digital Marketing	Marketing Digital	Online marketing costs (Google Ads, Facebook Ads, etc.)	Biaya marketing online (Google Ads, Facebook Ads, dll)	\N	0.1200	f	NONE	\N	global	#eb2f96	t	t	t	t	t	7	2025-11-08 09:18:12.173	2025-11-08 09:18:12.173
cmhq2nmqg000gnc8tf2mnosvc	OFFICE_RENT	6-2020	GENERAL_ADMIN	Office Rent	Sewa Kantor	Office building or space rental costs	Biaya sewa gedung/ruang kantor	\N	0.1200	f	PPH4_2	0.1000	home	#52c41a	t	f	t	t	t	20	2025-11-08 09:18:12.184	2025-11-08 09:18:12.184
cmhq2nmqs000hnc8t7a8g8uo8	UTILITIES	6-2030	GENERAL_ADMIN	Electricity & Water	Listrik dan Air	Electricity, water, and office utilities	Biaya listrik, air, dan utilitas kantor	\N	0.1200	f	NONE	\N	bulb	#faad14	t	f	t	t	t	30	2025-11-08 09:18:12.196	2025-11-08 09:18:12.196
cmhq2nmr4000inc8tbumgznka	OFFICE_SUPPLIES	6-2050	GENERAL_ADMIN	Office Supplies	Perlengkapan Kantor	Stationery and office supplies	Biaya alat tulis dan perlengkapan kantor	\N	0.1200	f	NONE	\N	file	#2f54eb	t	f	t	t	t	50	2025-11-08 09:18:12.208	2025-11-08 09:18:12.208
cmhq2nmrc000jnc8ttmldfugi	PROFESSIONAL_SERVICES	6-2070	GENERAL_ADMIN	Professional Services	Jasa Profesional	Professional services (accountants, auditors, etc.)	Biaya jasa profesional (akuntan, auditor, dll)	\N	0.1200	f	PPH23	0.0200	solution	#eb2f96	t	t	t	t	t	70	2025-11-08 09:18:12.216	2025-11-08 09:18:12.216
cmhq2nmro000knc8teuxkbzhy	SOFTWARE	6-2130	GENERAL_ADMIN	Software & Licenses	Software dan Lisensi	Software, SaaS, and license costs	Biaya software, SaaS, dan lisensi	\N	0.1200	f	NONE	\N	cloud	#2f54eb	t	f	t	t	t	130	2025-11-08 09:18:12.228	2025-11-08 09:18:12.228
cmhq2nms0000lnc8t1r4r8ywd	BANK_CHARGES	6-2160	GENERAL_ADMIN	Bank Charges	Biaya Bank	Bank administration and service fees	Biaya administrasi dan layanan bank	\N	0.0000	f	NONE	\N	transaction	#faad14	t	f	t	f	t	160	2025-11-08 09:18:12.24	2025-11-08 09:18:12.24
cmhq2nmsc000mnc8t369qz97g	LABOR	6-2010	LABOR_COST	Labor Costs	Biaya Tenaga Kerja	Labor and personnel costs generated from time tracking	Biaya tenaga kerja dan personel dari pelacakan waktu	\N	0.0000	f	NONE	\N	team	#722ed1	t	f	t	f	t	10	2025-11-08 09:18:12.252	2025-11-08 09:18:12.252
cmhq2nmsk000nnc8tdoy3lkib	MISCELLANEOUS	6-2190	GENERAL_ADMIN	Miscellaneous	Lain-Lain	Miscellaneous expenses	Biaya lain-lain	\N	0.1200	f	NONE	\N	more	#8c8c8c	t	f	t	t	t	190	2025-11-08 09:18:12.26	2025-11-08 09:18:12.26
cmhq3juvz0003e626t7yv98ld	6_2021	6-2021	GENERAL_ADMIN	Transportation Expenses	Beban Transportasi	\N	\N	\N	0.1200	f	NONE	\N	shopping	#1890ff	t	f	t	t	t	100	2025-11-08 09:43:15.743	2025-11-08 09:43:15.743
cmhq3kf9g0006e626hyckgry5	6_2022	6-2022	GENERAL_ADMIN	Accomodation Expenses	Beban Akomodasi	\N	\N	\N	0.1200	f	NONE	\N	shopping	#1890ff	t	f	t	t	t	100	2025-11-08 09:43:42.148	2025-11-08 09:43:42.148
fb8ac42e-21c9-4355-93bf-50eb62783218	COGS_GENERAL	5-1010	COGS	Cost of Goods Sold	Harga Pokok Penjualan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.031	2025-11-08 09:48:45.031
1760d6e1-098e-4ea3-ae61-20c0de9f8c90	COGS_DIRECT_LABOR	5-1020	COGS	Direct Labor	Biaya Tenaga Kerja Langsung	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.031	2025-11-08 09:48:45.031
bfe0b5f1-1def-4657-94f3-4d4148357ac9	COGS_MANUFACTURING_OH	5-1030	COGS	Manufacturing Overhead	Biaya Overhead Pabrik	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.031	2025-11-08 09:48:45.031
fa2b4a46-2ef1-4796-9a3c-d7c359f03f8c	FREELANCER_VIDEOGRAPHER	5-2010	COGS	Freelancer - Videographer	Freelancer Videografer	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.036	2025-11-08 09:48:45.036
0d13c4f4-5665-457f-8932-816f3bc03726	FREELANCER_PHOTOGRAPHER	5-2020	COGS	Freelancer - Photographer	Freelancer Fotografer	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.036	2025-11-08 09:48:45.036
75b1e139-7620-4d74-9433-cc965cb389ea	FREELANCER_GRAPHIC_DESIGNER	5-2030	COGS	Freelancer - Graphic Designer	Freelancer Desainer Grafis	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.036	2025-11-08 09:48:45.036
7d756e98-65aa-4cd3-8ca6-13a38d3c8825	FREELANCER_WEB_DEVELOPER	5-2040	COGS	Freelancer - Web Developer	Freelancer Developer Website	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.036	2025-11-08 09:48:45.036
211c6afe-48d3-42de-a55a-3bf2964ea759	FREELANCER_VIDEO_EDITOR	5-2050	COGS	Freelancer - Video Editor	Freelancer Editor Video	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.036	2025-11-08 09:48:45.036
b67e848e-f26e-4e1a-a0ef-0db1bc793f3e	FREELANCER_CONTENT_WRITER	5-2060	COGS	Freelancer - Content Writer	Freelancer Penulis Konten	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.036	2025-11-08 09:48:45.036
4f226b1e-091f-4e59-b967-eaa8b9c19a93	STOCK_FOOTAGE_MUSIC	5-3010	COGS	Stock Footage & Music	Footage & Musik Stok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.037	2025-11-08 09:48:45.037
be7090e5-9ede-4857-96cf-75e2beecbd4e	PROPS_EQUIPMENT_RENTAL	5-3020	COGS	Props & Equipment Rental	Sewa Properti & Peralatan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.037	2025-11-08 09:48:45.037
cf7c7236-7ccf-47d1-a5fa-4e460b1f437f	LOCATION_RENTAL	5-3030	COGS	Location Rental	Sewa Lokasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.037	2025-11-08 09:48:45.037
13d04efa-8bdb-4de3-9326-d206e3b95567	TALENT_MODELS	5-3040	COGS	Talent & Models	Talent & Model	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.037	2025-11-08 09:48:45.037
883f81b9-3f4f-4c8c-bb09-26698f17cf8f	FREELANCER_SOCIAL_MEDIA	5-4010	COGS	Freelancer - Social Media Specialist	Freelancer Spesialis Media Sosial	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.039	2025-11-08 09:48:45.039
7997ddda-b60a-4e7c-bfa8-37d7377e5eef	FREELANCER_SEO	5-4020	COGS	Freelancer - SEO Specialist	Freelancer Spesialis SEO	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.039	2025-11-08 09:48:45.039
7bd953b1-6b8c-4907-85b6-e8bb4f786e67	FREELANCER_UI_UX	5-4030	COGS	Freelancer - UI/UX Designer	Freelancer Desainer UI/UX	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.039	2025-11-08 09:48:45.039
dbb39935-6716-497a-a9cd-31a9b0ada856	FREELANCER_MOTION_GRAPHICS	5-4040	COGS	Freelancer - Motion Graphics Designer	Freelancer Desainer Motion Graphics	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.039	2025-11-08 09:48:45.039
8988e635-ca21-46c9-9c30-2ad74ccea107	FREELANCER_VOICE_OVER	5-4050	COGS	Freelancer - Voice Over Artist	Freelancer Pengisi Suara	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 09:48:45.039	2025-11-08 09:48:45.039
\.


--
-- Data for Name: expense_comments; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.expense_comments (id, "expenseId", "userId", comment, "commentId", "commentEn", "isInternal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expense_documents; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.expense_documents (id, "fileName", "originalFileName", "filePath", "fileSize", "mimeType", category, description, "expenseId", "uploadedBy", "uploadedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.expenses (id, "expenseNumber", "buktiPengeluaranNumber", "accountCode", "accountName", "accountNameEn", "expenseClass", description, "descriptionId", "descriptionEn", "ppnRate", "ppnAmount", "ppnCategory", "isLuxuryGoods", "eFakturNSFP", "eFakturQRCode", "eFakturApprovalCode", "eFakturStatus", "eFakturValidatedAt", "withholdingTaxType", "withholdingTaxRate", "withholdingTaxAmount", "buktiPotongNumber", "buktiPotongDate", "vendorName", "vendorNPWP", "vendorAddress", "vendorPhone", "vendorBank", "vendorAccountNo", "vendorAccountName", "grossAmount", "withholdingAmount", "netAmount", "totalAmount", "expenseDate", currency, "categoryId", tags, "isTaxDeductible", "userId", "projectId", "clientId", "isBillable", "billableAmount", "invoiceId", status, "submittedAt", "approvedAt", "approvedBy", "rejectedAt", "rejectionReason", "paymentStatus", "paidAt", "paymentMethod", "paymentReference", "paymentId", "journalEntryId", "paymentJournalId", notes, "notesId", "notesEn", "receiptNumber", "merchantName", location, "createdAt", "updatedAt", "createdBy", "updatedBy", "purchaseType", "purchaseSource", "vendorId", "purchaseOrderId", "vendorInvoiceId", "accountsPayableId", "dueDate") FROM stdin;
\.


--
-- Data for Name: feature_flag_events; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.feature_flag_events (id, "flagId", "userId", "eventType", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.feature_flags (id, name, description, enabled, "globalEnabled", "targetUsers", "targetGroups", rules, "expiresAt", "disabledReason", "disabledAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: financial_statements; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.financial_statements (id, "statementType", "fiscalPeriodId", "startDate", "endDate", data, "generatedAt", "generatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: fiscal_periods; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.fiscal_periods (id, name, code, "periodType", "startDate", "endDate", status, "isActive", "closedAt", "closedBy", "closingNotes", "createdAt", "updatedAt") FROM stdin;
cmhq2nnlg004knc8td4x7ly0o	January 2025	2025-01	MONTHLY	2025-01-01 00:00:00	2025-01-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.301	2025-11-08 09:18:13.301
cmhq2nnlk004lnc8t8xx8hvo7	February 2025	2025-02	MONTHLY	2025-02-01 00:00:00	2025-02-28 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.305	2025-11-08 09:18:13.305
cmhq2nnlo004mnc8tic92477o	March 2025	2025-03	MONTHLY	2025-03-01 00:00:00	2025-03-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.308	2025-11-08 09:18:13.308
cmhq2nnlr004nnc8txnezfzl0	April 2025	2025-04	MONTHLY	2025-04-01 00:00:00	2025-04-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.311	2025-11-08 09:18:13.311
cmhq2nnlu004onc8tpj81c4yw	May 2025	2025-05	MONTHLY	2025-05-01 00:00:00	2025-05-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.314	2025-11-08 09:18:13.314
cmhq2nnlx004pnc8tjl2fiu6w	June 2025	2025-06	MONTHLY	2025-06-01 00:00:00	2025-06-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.318	2025-11-08 09:18:13.318
cmhq2nnm0004qnc8t7jbznmql	July 2025	2025-07	MONTHLY	2025-07-01 00:00:00	2025-07-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.321	2025-11-08 09:18:13.321
cmhq2nnm3004rnc8td06sw0hn	August 2025	2025-08	MONTHLY	2025-08-01 00:00:00	2025-08-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.324	2025-11-08 09:18:13.324
cmhq2nnm6004snc8twfaokrj3	September 2025	2025-09	MONTHLY	2025-09-01 00:00:00	2025-09-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.327	2025-11-08 09:18:13.327
cmhq2nnm9004tnc8t9wzwi0fx	October 2025	2025-10	MONTHLY	2025-10-01 00:00:00	2025-10-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.33	2025-11-08 09:18:13.33
cmhq2nnmc004unc8tap9o5zur	November 2025	2025-11	MONTHLY	2025-11-01 00:00:00	2025-11-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.332	2025-11-08 09:18:13.332
cmhq2nnmf004vnc8tfp97xp4i	December 2025	2025-12	MONTHLY	2025-12-01 00:00:00	2025-12-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 09:18:13.335	2025-11-08 09:18:13.335
\.


--
-- Data for Name: frame_comments; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.frame_comments (id, "frameId", text, x, y, "parentId", "authorId", mentions, resolved, "resolvedBy", "resolvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: frame_drawings; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.frame_drawings (id, "frameId", type, data, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: general_ledger; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.general_ledger (id, "accountId", "entryDate", "postingDate", "journalEntryId", "journalEntryNumber", "lineNumber", debit, credit, balance, description, "descriptionId", "transactionType", "transactionId", "documentNumber", "projectId", "clientId", "fiscalPeriodId", "createdAt") FROM stdin;
cmi4r93rg000h380fo08ntma0	cmhq2nmuq000snc8tpejic79x	2025-11-18 15:55:31.238	2025-11-18 15:55:31.274	cmi4r93r2000d380fzz2ikfbv	JE-2025-11-0001	1	2050000.00	0.00	0.00	Invoice INV-202511-001	Faktur INV-202511-001	INVOICE_SENT	cmi4r89bb000b380fk5g9o5rv	INV-202511-001	\N	cmi4qqce20002380fj2rukkfc	cmhq2nnmc004unc8tap9o5zur	2025-11-18 15:55:31.276
cmi4r93rg000i380fy9tbyrmh	cmhq2nn060014nc8t06xfq0oe	2025-11-18 15:55:31.238	2025-11-18 15:55:31.274	cmi4r93r2000d380fzz2ikfbv	JE-2025-11-0001	2	0.00	2050000.00	0.00	Revenue from Invoice INV-202511-001	Pendapatan dari Faktur INV-202511-001	INVOICE_SENT	cmi4r89bb000b380fk5g9o5rv	INV-202511-001	\N	cmi4qqce20002380fj2rukkfc	cmhq2nnmc004unc8tap9o5zur	2025-11-18 15:55:31.276
cmi5xhgby000z67opzg2hq6fh	cmhq2nmuq000snc8tpejic79x	2025-11-19 11:37:44.648	2025-11-19 11:37:44.684	cmi5xhgbi000v67opvuad2f5r	JE-2025-11-0002	1	2150000.00	0.00	0.00	Invoice INV-2025/11/0001	Faktur INV-2025/11/0001	INVOICE_SENT	cmi5xh8x5000n67op3ebprhqn	INV-2025/11/0001	\N	cmi4qqce20002380fj2rukkfc	cmhq2nnmc004unc8tap9o5zur	2025-11-19 11:37:44.687
cmi5xhgbz001067opow4rkf4u	cmhq2nn060014nc8t06xfq0oe	2025-11-19 11:37:44.648	2025-11-19 11:37:44.684	cmi5xhgbi000v67opvuad2f5r	JE-2025-11-0002	2	0.00	2150000.00	0.00	Revenue from Invoice INV-2025/11/0001	Pendapatan dari Faktur INV-2025/11/0001	INVOICE_SENT	cmi5xh8x5000n67op3ebprhqn	INV-2025/11/0001	\N	cmi4qqce20002380fj2rukkfc	cmhq2nnmc004unc8tap9o5zur	2025-11-19 11:37:44.687
\.


--
-- Data for Name: goods_receipt_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.goods_receipt_items (id, "grId", "poItemId", "lineNumber", "orderedQuantity", "receivedQuantity", "acceptedQuantity", "rejectedQuantity", "qualityStatus", "rejectionReason", "unitPrice", "lineTotal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: goods_receipts; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.goods_receipts (id, "grNumber", "grDate", "poId", "vendorId", "deliveryNoteNumber", "receivedBy", "receivedAt", "warehouseLocation", "inspectionStatus", "inspectedBy", "inspectedAt", "inspectionNotes", status, "isPosted", "postedAt", notes, "notesId", "createdAt", "updatedAt", "createdBy", "updatedBy", "journalEntryId") FROM stdin;
\.


--
-- Data for Name: indonesian_holidays; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.indonesian_holidays (id, date, year, name, "nameIndonesian", description, type, region, "isLunarBased", "isSubstitute", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invoice_counters; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.invoice_counters (id, year, month, sequence, "createdAt", "updatedAt") FROM stdin;
cmi5xh8wx000k67op1oaajcyk	2025	11	1	2025-11-19 11:37:35.073	2025-11-19 11:37:35.073
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.invoices (id, "invoiceNumber", "creationDate", "dueDate", "quotationId", "clientId", "projectId", "amountPerProject", "totalAmount", "subtotalAmount", "taxRate", "taxAmount", "includeTax", "scopeOfWork", "priceBreakdown", "paymentInfo", "materaiRequired", "materaiApplied", "materaiAppliedAt", "materaiAppliedBy", "materaiAmount", terms, signature, status, "createdBy", "markedPaidBy", "markedPaidAt", "journalEntryId", "paymentJournalId", "paymentMilestoneId", "projectMilestoneId", "createdAt", "updatedAt") FROM stdin;
cmi5xh8x5000n67op3ebprhqn	INV-2025/11/0001	2025-11-19 11:37:35.081	2025-12-31 11:37:35.065	cmi5xg98g000d67opqghldbrq	cmi4qqce20002380fj2rukkfc	cmi4r3vpu0003380f03pzncjw	2150000.00	2150000.00	2150000.00	0.00	0.00	f	\N	{"total": 2150000, "products": [{"name": "Aputure Lighting Equipment Rent", "price": 350000, "quantity": 3, "subtotal": 1050000, "description": "Aputure C300D Mark II"}, {"name": "Godox RGB Lighting", "price": 250000, "quantity": 2, "subtotal": 500000, "description": "Godox SZ 150R RGB"}, {"name": "Gaffer ", "price": 500000, "quantity": 1, "subtotal": 500000, "description": "Hiring 1 Gaffer for 1 Day Shooting"}, {"name": "Accommodation ", "price": 100000, "quantity": 1, "subtotal": 100000, "description": "Transport Rent Items "}], "calculatedAt": "2025-11-19T11:34:30.132Z"}	Bank BCA Digital (Blu): 3462676350 a.n. Monomi Agency\n\nPembayaran dapat dilakukan melalui transfer bank atau tunai.\nKonfirmasi pembayaran dapat dikirim melalui WhatsApp atau email.	f	f	\N	\N	\N	1. Payment Terms: Net 1 day from invoice date\n2. Project Timeline: 19 Nov 2025 - 20 Nov 2025\n3. Scope: Lighting Rent \n4. Deliverables: As specified in project requirements	\N	SENT	cmhq2nmjq0000nc8t77189wtn	\N	\N	cmi5xhgbi000v67opvuad2f5r	\N	\N	\N	2025-11-19 11:37:35.081	2025-11-19 11:40:14.672
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.journal_entries (id, "entryNumber", "entryDate", "postingDate", description, "descriptionId", "descriptionEn", "transactionType", "transactionId", "documentNumber", "documentDate", status, "isPosted", "postedAt", "postedBy", "fiscalPeriodId", "isReversing", "reversedEntryId", "createdBy", "updatedBy", "createdAt", "updatedAt") FROM stdin;
cmi4r93r2000d380fzz2ikfbv	JE-2025-11-0001	2025-11-18 15:55:31.238	\N	Auto-generated: Invoice INV-202511-001 - SENT	Otomatis: Faktur INV-202511-001 - SENT	\N	INVOICE_SENT	cmi4r89bb000b380fk5g9o5rv	INV-202511-001	2025-11-18 15:55:31.238	POSTED	t	2025-11-18 15:55:31.274	system	cmhq2nnmc004unc8tap9o5zur	f	\N	system	\N	2025-11-18 15:55:31.263	2025-11-18 15:55:31.276
cmi5xhgbi000v67opvuad2f5r	JE-2025-11-0002	2025-11-19 11:37:44.648	\N	Auto-generated: Invoice INV-2025/11/0001 - SENT	Otomatis: Faktur INV-2025/11/0001 - SENT	\N	INVOICE_SENT	cmi5xh8x5000n67op3ebprhqn	INV-2025/11/0001	2025-11-19 11:37:44.648	POSTED	t	2025-11-19 11:37:44.684	system	cmhq2nnmc004unc8tap9o5zur	f	\N	system	\N	2025-11-19 11:37:44.671	2025-11-19 11:37:44.687
\.


--
-- Data for Name: journal_line_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.journal_line_items (id, "journalEntryId", "lineNumber", "accountId", debit, credit, description, "descriptionId", "projectId", "clientId", "departmentId", "createdAt", "updatedAt") FROM stdin;
cmi4r93r3000f380fnpz6sgzo	cmi4r93r2000d380fzz2ikfbv	1	cmhq2nmuq000snc8tpejic79x	2050000.00	0.00	Invoice INV-202511-001	Faktur INV-202511-001	\N	cmi4qqce20002380fj2rukkfc	\N	2025-11-18 15:55:31.263	2025-11-18 15:55:31.263
cmi4r93r3000g380fmag9joa7	cmi4r93r2000d380fzz2ikfbv	2	cmhq2nn060014nc8t06xfq0oe	0.00	2050000.00	Revenue from Invoice INV-202511-001	Pendapatan dari Faktur INV-202511-001	\N	cmi4qqce20002380fj2rukkfc	\N	2025-11-18 15:55:31.263	2025-11-18 15:55:31.263
cmi5xhgbj000x67opi31yp84k	cmi5xhgbi000v67opvuad2f5r	1	cmhq2nmuq000snc8tpejic79x	2150000.00	0.00	Invoice INV-2025/11/0001	Faktur INV-2025/11/0001	\N	cmi4qqce20002380fj2rukkfc	\N	2025-11-19 11:37:44.671	2025-11-19 11:37:44.671
cmi5xhgbj000y67opu6hq5yyh	cmi5xhgbi000v67opvuad2f5r	2	cmhq2nn060014nc8t06xfq0oe	0.00	2150000.00	Revenue from Invoice INV-2025/11/0001	Pendapatan dari Faktur INV-2025/11/0001	\N	cmi4qqce20002380fj2rukkfc	\N	2025-11-19 11:37:44.671	2025-11-19 11:37:44.671
\.


--
-- Data for Name: labor_entries; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.labor_entries (id, "projectId", "teamMemberId", "userId", "workDate", "hoursWorked", "laborType", "laborTypeRate", "hourlyRate", "laborCost", "costType", "isDirect", description, "descriptionId", "taskPerformed", status, "submittedAt", "approvedBy", "approvedAt", "rejectedReason", "expenseId", "journalEntryId", "costAllocationId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: maintenance_records; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.maintenance_records (id, "assetId", "maintenanceType", "performedDate", "performedBy", cost, description, "partsReplaced", "nextMaintenanceDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: maintenance_schedules; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.maintenance_schedules (id, "assetId", "maintenanceType", frequency, "lastMaintenanceDate", "nextMaintenanceDate", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.media_assets (id, "projectId", filename, "originalName", description, url, key, "thumbnailUrl", "mediaType", "mimeType", size, duration, fps, codec, bitrate, width, height, status, "starRating", "uploadedBy", "uploadedAt", "updatedAt", "folderId") FROM stdin;
cmi7l89ct01q1106uieoqfilx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a2e7a167-dscf7831.jpg	DSCF7831.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a2e7a167-dscf7831.jpg	content/2025-11-20/a2e7a167-dscf7831.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7ac01b6b-thumb-dscf7831.jpg	IMAGE	image/jpeg	729615	\N	\N	\N	\N	3894	5841	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:12.701	2025-11-21 10:40:05.785	cmi63yyr80005ejrm5rkshgro
cmi7l8jyg01r1106urup8ih7o	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/08a98429-dscf7841.jpg	DSCF7841.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/08a98429-dscf7841.jpg	content/2025-11-20/08a98429-dscf7841.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3f0fcea7-thumb-dscf7841.jpg	IMAGE	image/jpeg	576261	\N	\N	\N	\N	4000	6000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:26.439	2025-11-21 10:42:48.687	cmi63yyr80005ejrm5rkshgro
cmi7la0da01wh106uswvrfoqx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/67cc8c5e-dscf7889.jpg	DSCF7889.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/67cc8c5e-dscf7889.jpg	content/2025-11-20/67cc8c5e-dscf7889.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/42f5c8f3-thumb-dscf7889.jpg	IMAGE	image/jpeg	684173	\N	\N	\N	\N	3861	5792	IN_REVIEW	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:34.365	2025-11-21 16:04:40.902	cmi63yyr80005ejrm5rkshgro
cmi7l9emw01ul106uodyfr0k7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f5eb7acd-dscf7872.jpg	DSCF7872.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f5eb7acd-dscf7872.jpg	content/2025-11-20/f5eb7acd-dscf7872.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/46b76a1f-thumb-dscf7872.jpg	IMAGE	image/jpeg	570486	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:06.2	2025-11-21 16:11:21.724	cmi63yyr80005ejrm5rkshgro
cmi7ku0n800lh106uuqh0vxjg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cd3ee478-dscf7350.jpg	DSCF7350.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cd3ee478-dscf7350.jpg	content/2025-11-20/cd3ee478-dscf7350.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/418feb8d-thumb-dscf7350.jpg	IMAGE	image/jpeg	739296	\N	\N	\N	\N	6000	4000	IN_REVIEW	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:08.228	2025-11-21 11:47:53.388	cmi63yyr80005ejrm5rkshgro
cmi7kslwr00ix106uta1fr0jd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4fa9e140-dscf7312.jpg	DSCF7312.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4fa9e140-dscf7312.jpg	content/2025-11-20/4fa9e140-dscf7312.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1361bf60-thumb-dscf7312.jpg	IMAGE	image/jpeg	829285	\N	\N	\N	\N	6000	4000	IN_REVIEW	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:02.475	2025-11-21 11:51:33.854	cmi63yyr80005ejrm5rkshgro
cmi7l6w6z01l9106urwn70bgi	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/48b8b551-dscf7771.jpg	DSCF7771.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/48b8b551-dscf7771.jpg	content/2025-11-20/48b8b551-dscf7771.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e2310594-thumb-dscf7771.jpg	IMAGE	image/jpeg	743798	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:08.987	2025-11-23 10:19:37.736	cmi63yyr80005ejrm5rkshgro
cmi7l5qj801j1106uxt2lyr31	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7f548057-dscf7742.jpg	DSCF7742.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7f548057-dscf7742.jpg	content/2025-11-20/7f548057-dscf7742.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7c7422ec-thumb-dscf7742.jpg	IMAGE	image/jpeg	658683	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:14.997	2025-11-23 10:20:38.009	cmi63yyr80005ejrm5rkshgro
cmi7kv6wr00oh106us4qgg3c3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b3015585-dscf7391.jpg	DSCF7391.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b3015585-dscf7391.jpg	content/2025-11-20/b3015585-dscf7391.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4b56a515-thumb-dscf7391.jpg	IMAGE	image/jpeg	541318	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:03.003	2025-11-22 04:43:15.353	cmi63yyr80005ejrm5rkshgro
cmi7lfs7i02gp106uffx2426e	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/405955f8-dscf8086.jpg	DSCF8086.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/405955f8-dscf8086.jpg	content/2025-11-20/405955f8-dscf8086.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e4e7b7b5-thumb-dscf8086.jpg	IMAGE	image/jpeg	441491	\N	\N	\N	\N	3927	5890	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:03.727	2025-11-22 08:48:08.722	cmi63yyr80005ejrm5rkshgro
cmi7lfl3w02ft106uuuvgy9ts	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/27b4556c-dscf8078.jpg	DSCF8078.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/27b4556c-dscf8078.jpg	content/2025-11-20/27b4556c-dscf8078.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c4333302-thumb-dscf8078.jpg	IMAGE	image/jpeg	409644	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:54.524	2025-11-22 10:32:33.968	cmi63yyr80005ejrm5rkshgro
cmi7kz1fe0101106u5j67v07a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0fc08dca-dscf7521.jpg	DSCF7521.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0fc08dca-dscf7521.jpg	content/2025-11-20/0fc08dca-dscf7521.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fc1b03a5-thumb-dscf7521.jpg	IMAGE	image/jpeg	473351	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:02.522	2025-11-22 10:19:16.301	cmi63yyr80005ejrm5rkshgro
cmi7kx3us00st106uyoabn2sr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19382f09-dscf7438.jpg	DSCF7438.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19382f09-dscf7438.jpg	content/2025-11-20/19382f09-dscf7438.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ecc2ce8e-thumb-dscf7438.jpg	IMAGE	image/jpeg	469404	\N	\N	\N	\N	3894	5841	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:32.355	2025-11-22 11:05:21.044	cmi63yyr80005ejrm5rkshgro
cmi7kxids00u9106u0aptfu5h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c7a701a2-dscf7452.jpg	DSCF7452.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c7a701a2-dscf7452.jpg	content/2025-11-20/c7a701a2-dscf7452.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7470ec2a-thumb-dscf7452.jpg	IMAGE	image/jpeg	448841	\N	\N	\N	\N	3819	5729	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:51.184	2025-11-22 11:08:15.331	cmi63yyr80005ejrm5rkshgro
cmi7kxwhr00vt106u0t0vxpzh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3cbcd316-dscf7469.jpg	DSCF7469.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3cbcd316-dscf7469.jpg	content/2025-11-20/3cbcd316-dscf7469.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/58e4dac4-thumb-dscf7469.jpg	IMAGE	image/jpeg	396445	\N	\N	\N	\N	3927	5890	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:09.471	2025-11-22 12:32:20.884	cmi63yyr80005ejrm5rkshgro
cmi7ky2gv00wh106uu1skks20	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1b095fdf-dscf7474.jpg	DSCF7474.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1b095fdf-dscf7474.jpg	content/2025-11-20/1b095fdf-dscf7474.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e1785245-thumb-dscf7474.jpg	IMAGE	image/jpeg	415976	\N	\N	\N	\N	3837	5755	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:17.216	2025-11-22 12:33:02.993	cmi63yyr80005ejrm5rkshgro
cmi7lew4l02dh106uhvk98ew5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/560ba3fa-dscf8056.jpg	DSCF8056.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/560ba3fa-dscf8056.jpg	content/2025-11-20/560ba3fa-dscf8056.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/52d87cb8-thumb-dscf8056.jpg	IMAGE	image/jpeg	752506	\N	\N	\N	\N	3861	5792	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:22.149	2025-11-22 13:58:34.983	cmi63yyr80005ejrm5rkshgro
cmi7legih02bt106ueq4ovor7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7d750859-dscf8043.jpg	DSCF8043.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7d750859-dscf8043.jpg	content/2025-11-20/7d750859-dscf8043.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/acc6c2f6-thumb-dscf8043.jpg	IMAGE	image/jpeg	570785	\N	\N	\N	\N	3894	5841	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:01.913	2025-11-22 13:58:57.904	cmi63yyr80005ejrm5rkshgro
cmi7l4bki01ft106uw9k5x4av	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/078931a7-dscf7705.jpg	DSCF7705.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/078931a7-dscf7705.jpg	content/2025-11-20/078931a7-dscf7705.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7871ecb2-thumb-dscf7705.jpg	IMAGE	image/jpeg	683082	\N	\N	\N	\N	3927	5890	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:08.946	2025-11-23 07:18:05.295	cmi63yyr80005ejrm5rkshgro
cmi7l4qmf01h5106uw7f0k8ty	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2a439258-dscf7717.jpg	DSCF7717.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2a439258-dscf7717.jpg	content/2025-11-20/2a439258-dscf7717.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1e13cf6d-thumb-dscf7717.jpg	IMAGE	image/jpeg	908918	\N	\N	\N	\N	3824	5737	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:28.455	2025-11-23 07:19:55.697	cmi63yyr80005ejrm5rkshgro
cmi7kve1700ox106uvlg2z1a3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/86652444-dscf7394.jpg	DSCF7394.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/86652444-dscf7394.jpg	content/2025-11-20/86652444-dscf7394.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f0d7de34-thumb-dscf7394.jpg	IMAGE	image/jpeg	506867	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:12.235	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kveb700p1106u4of63d5t	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0480c75f-dscf7395.jpg	DSCF7395.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0480c75f-dscf7395.jpg	content/2025-11-20/0480c75f-dscf7395.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/42ae8895-thumb-dscf7395.jpg	IMAGE	image/jpeg	477935	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:12.595	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvenk00p5106uf7eiz71z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d9b9c329-dscf7393.jpg	DSCF7393.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d9b9c329-dscf7393.jpg	content/2025-11-20/d9b9c329-dscf7393.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/55088505-thumb-dscf7393.jpg	IMAGE	image/jpeg	519328	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:13.04	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2xyn01dx106u6cyz4xec	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/27e4aa4c-dscf7665.jpg	DSCF7665.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/27e4aa4c-dscf7665.jpg	content/2025-11-20/27e4aa4c-dscf7665.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c3515d65-thumb-dscf7665.jpg	IMAGE	image/jpeg	494640	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:04.655	2025-11-23 12:41:05.511	cmi63yyr80005ejrm5rkshgro
cmi7l2inb01cl106uw6ds4ut8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1d1f3440-dscf7651.jpg	DSCF7651.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1d1f3440-dscf7651.jpg	content/2025-11-20/1d1f3440-dscf7651.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4d0237c0-thumb-dscf7651.jpg	IMAGE	image/jpeg	586827	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:44.807	2025-11-23 12:43:15.864	cmi63yyr80005ejrm5rkshgro
cmi7l6xlv01lh106us1kpaf0b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/34fab810-dscf7774.jpg	DSCF7774.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/34fab810-dscf7774.jpg	content/2025-11-20/34fab810-dscf7774.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/24444f81-thumb-dscf7774.jpg	IMAGE	image/jpeg	729792	\N	\N	\N	\N	3837	5755	DRAFT	5	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:10.819	2025-11-23 10:20:14.148	cmi63yyr80005ejrm5rkshgro
cmi7kyhdj00y1106us2q8lsd5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e7fe77ab-dscf7497.jpg	DSCF7497.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e7fe77ab-dscf7497.jpg	content/2025-11-20/e7fe77ab-dscf7497.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cea42af5-thumb-dscf7497.jpg	IMAGE	image/jpeg	431010	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:36.535	2025-11-23 12:41:32.52	cmi63yyr80005ejrm5rkshgro
cmi7l0slq016d106u0k3ae2en	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bd377145-dscf7584.jpg	DSCF7584.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bd377145-dscf7584.jpg	content/2025-11-20/bd377145-dscf7584.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e6f7b4c9-thumb-dscf7584.jpg	IMAGE	image/jpeg	916365	\N	\N	\N	\N	3819	5729	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:24.398	2025-11-23 13:24:31.854	cmi63yyr80005ejrm5rkshgro
cmi7l1fy40191106ukualwssc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/abfb9dbb-dscf7611.jpg	DSCF7611.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/abfb9dbb-dscf7611.jpg	content/2025-11-20/abfb9dbb-dscf7611.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/97428002-thumb-dscf7611.jpg	IMAGE	image/jpeg	655388	\N	\N	\N	\N	3819	5729	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:54.652	2025-11-23 13:32:30.642	cmi63yyr80005ejrm5rkshgro
cmi7lah2501y9106uh8ovgs60	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8acaf747-dscf7906.jpg	DSCF7906.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8acaf747-dscf7906.jpg	content/2025-11-20/8acaf747-dscf7906.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31e01680-thumb-dscf7906.jpg	IMAGE	image/jpeg	478412	\N	\N	\N	\N	3927	5890	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:55.997	2025-11-23 14:39:04.549	cmi63yyr80005ejrm5rkshgro
cmi7lawag01zt106upgo40mao	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1a5362a5-dscf7921.jpg	DSCF7921.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1a5362a5-dscf7921.jpg	content/2025-11-20/1a5362a5-dscf7921.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/36610d70-thumb-dscf7921.jpg	IMAGE	image/jpeg	448210	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:15.736	2025-11-23 14:24:52.551	cmi63yyr80005ejrm5rkshgro
cmi7lcov5025d106u2f18txxp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/21ff9600-dscf7978.jpg	DSCF7978.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/21ff9600-dscf7978.jpg	content/2025-11-20/21ff9600-dscf7978.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7ac6538f-thumb-dscf7978.jpg	IMAGE	image/jpeg	449672	\N	\N	\N	\N	3851	5776	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:39.425	2025-11-24 13:23:13.001	cmi63yyr80005ejrm5rkshgro
cmi7lcx1v026d106u31l2akty	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/12fdfcd1-dscf7989.jpg	DSCF7989.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/12fdfcd1-dscf7989.jpg	content/2025-11-20/12fdfcd1-dscf7989.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c9bba8ec-thumb-dscf7989.jpg	IMAGE	image/jpeg	453089	\N	\N	\N	\N	4000	6000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:50.034	2025-11-24 13:24:33.243	cmi63yyr80005ejrm5rkshgro
cmi7kzzwq0139106ugxbrzvj9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b23919f7-dscf7555.jpg	DSCF7555.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b23919f7-dscf7555.jpg	content/2025-11-20/b23919f7-dscf7555.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/10d2937b-thumb-dscf7555.jpg	IMAGE	image/jpeg	506043	\N	\N	\N	\N	3927	5890	DRAFT	3	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:47.21	2025-11-24 13:47:11.597	cmi63yyr80005ejrm5rkshgro
cmi7kzor40125106uyxjgb1u6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e0192777-dscf7545.jpg	DSCF7545.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e0192777-dscf7545.jpg	content/2025-11-20/e0192777-dscf7545.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c1c00101-thumb-dscf7545.jpg	IMAGE	image/jpeg	497761	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:32.753	2025-11-24 14:00:36.533	cmi63yyr80005ejrm5rkshgro
cmi7l7saq01o9106u3t3zur70	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d856c5b5-dscf7809.jpg	DSCF7809.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d856c5b5-dscf7809.jpg	content/2025-11-20/d856c5b5-dscf7809.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d37fdc15-thumb-dscf7809.jpg	IMAGE	image/jpeg	448359	\N	\N	\N	\N	3837	5755	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:50.594	2025-11-25 11:04:33.334	cmi63yyr80005ejrm5rkshgro
cmi7l9kwd01vb106u6w6lsstr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b00a4e97-dscf7879.jpg	DSCF7879.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b00a4e97-dscf7879.jpg	content/2025-11-20/b00a4e97-dscf7879.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fc49b6de-thumb-dscf7879.jpg	IMAGE	image/jpeg	615724	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:14.317	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld7wb027t106ugsxalhez	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f9b8c8a-dscf8005.jpg	DSCF8005.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f9b8c8a-dscf8005.jpg	content/2025-11-20/3f9b8c8a-dscf8005.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a8719c34-thumb-dscf8005.jpg	IMAGE	image/jpeg	472413	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:04.091	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lel8i02cd106uywt15vv2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a6cdd566-dscf8046.jpg	DSCF8046.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a6cdd566-dscf8046.jpg	content/2025-11-20/a6cdd566-dscf8046.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2da95eba-thumb-dscf8046.jpg	IMAGE	image/jpeg	542735	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:08.03	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lemum02ch106uatj3wytk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b649e439-dscf8048.jpg	DSCF8048.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b649e439-dscf8048.jpg	content/2025-11-20/b649e439-dscf8048.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bafbdabf-thumb-dscf8048.jpg	IMAGE	image/jpeg	576143	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:10.126	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7leo8602cl106undb7dlrh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2537e500-dscf8049.jpg	DSCF8049.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2537e500-dscf8049.jpg	content/2025-11-20/2537e500-dscf8049.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/599b028b-thumb-dscf8049.jpg	IMAGE	image/jpeg	735334	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:11.91	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9uxd02j5106u3a47m9ga	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e8c88c6a-dscf7184.jpg	DSCF7184.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e8c88c6a-dscf7184.jpg	content/2025-11-20/e8c88c6a-dscf7184.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c608a520-thumb-dscf7184.jpg	IMAGE	image/jpeg	556954	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:26.928	2025-11-20 18:28:53.393	cmi63yyr80005ejrm5rkshgro
cmi7j8nay0001106u6xh885we	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ccf19627-dscf7174.jpg	DSCF7174.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ccf19627-dscf7174.jpg	content/2025-11-20/ccf19627-dscf7174.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3c6125cf-thumb-dscf7174.jpg	IMAGE	image/jpeg	469827	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:31.545	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8nh90005106u9d3qk54a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b6fbff56-dscf7175.jpg	DSCF7175.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b6fbff56-dscf7175.jpg	content/2025-11-20/b6fbff56-dscf7175.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8a29052d-thumb-dscf7175.jpg	IMAGE	image/jpeg	474337	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:31.773	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8ntl0009106um8mq9sg2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9bd4e545-dscf7173.jpg	DSCF7173.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9bd4e545-dscf7173.jpg	content/2025-11-20/9bd4e545-dscf7173.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/60949518-thumb-dscf7173.jpg	IMAGE	image/jpeg	489527	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:32.217	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lg2iu02i1106u5zw59jlc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/541bdc78-dscf8098.jpg	DSCF8098.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/541bdc78-dscf8098.jpg	content/2025-11-20/541bdc78-dscf8098.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7459d7c5-thumb-dscf8098.jpg	IMAGE	image/jpeg	436486	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:17.094	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8ogp000d106uvglg1mqn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/534b7f9e-dscf7180.jpg	DSCF7180.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/534b7f9e-dscf7180.jpg	content/2025-11-20/534b7f9e-dscf7180.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/925273a1-thumb-dscf7180.jpg	IMAGE	image/jpeg	567141	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:33.049	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8qw6000h106us092p3mw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6ac3ce97-dscf7182.jpg	DSCF7182.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6ac3ce97-dscf7182.jpg	content/2025-11-20/6ac3ce97-dscf7182.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c372042d-thumb-dscf7182.jpg	IMAGE	image/jpeg	542631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:36.198	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8qx9000l106uddcws1w9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e0f2ada2-dscf7181.jpg	DSCF7181.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e0f2ada2-dscf7181.jpg	content/2025-11-20/e0f2ada2-dscf7181.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5133d177-thumb-dscf7181.jpg	IMAGE	image/jpeg	548708	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:36.238	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8qxz000p106umitvy30a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/05ded557-dscf7183.jpg	DSCF7183.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/05ded557-dscf7183.jpg	content/2025-11-20/05ded557-dscf7183.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a59d9fba-thumb-dscf7183.jpg	IMAGE	image/jpeg	541501	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:36.263	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8ryk000t106ulczpjjoj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1cf211f3-dscf7184.jpg	DSCF7184.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1cf211f3-dscf7184.jpg	content/2025-11-20/1cf211f3-dscf7184.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3a299313-thumb-dscf7184.jpg	IMAGE	image/jpeg	556954	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:37.58	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8v3e000x106uerb5amuc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6b7ae9bb-dscf7185.jpg	DSCF7185.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6b7ae9bb-dscf7185.jpg	content/2025-11-20/6b7ae9bb-dscf7185.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6fd38db4-thumb-dscf7185.jpg	IMAGE	image/jpeg	575191	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:41.642	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8voy0011106u9wdq7fdv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2ebab737-dscf7187.jpg	DSCF7187.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2ebab737-dscf7187.jpg	content/2025-11-20/2ebab737-dscf7187.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31d36590-thumb-dscf7187.jpg	IMAGE	image/jpeg	568146	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:42.418	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8wh20015106u8b8wssta	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19d39d74-dscf7188.jpg	DSCF7188.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19d39d74-dscf7188.jpg	content/2025-11-20/19d39d74-dscf7188.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d354e103-thumb-dscf7188.jpg	IMAGE	image/jpeg	545636	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:43.43	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8z33001d106ugnx6j72g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/640f06f0-dscf7191.jpg	DSCF7191.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/640f06f0-dscf7191.jpg	content/2025-11-20/640f06f0-dscf7191.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9c3bdc1b-thumb-dscf7191.jpg	IMAGE	image/jpeg	548793	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:46.815	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8z5h001h106up6lmx9od	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3ea29ac5-dscf7190.jpg	DSCF7190.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3ea29ac5-dscf7190.jpg	content/2025-11-20/3ea29ac5-dscf7190.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/17055df6-thumb-dscf7190.jpg	IMAGE	image/jpeg	561562	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:46.902	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j907q001l106u1j3xt6bq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ce89714c-dscf7192.jpg	DSCF7192.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ce89714c-dscf7192.jpg	content/2025-11-20/ce89714c-dscf7192.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9dbe33f3-thumb-dscf7192.jpg	IMAGE	image/jpeg	548958	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:48.278	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j913l001p106uw6t5043p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/946512e2-dscf7193.jpg	DSCF7193.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/946512e2-dscf7193.jpg	content/2025-11-20/946512e2-dscf7193.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1fb7061d-thumb-dscf7193.jpg	IMAGE	image/jpeg	531852	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:49.426	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j92u3001t106uq82ethfx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ec7bc060-dscf7195.jpg	DSCF7195.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ec7bc060-dscf7195.jpg	content/2025-11-20/ec7bc060-dscf7195.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b2a9442b-thumb-dscf7195.jpg	IMAGE	image/jpeg	516454	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:51.675	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j8wh60017106un416hdjn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ba067848-dscf7186.jpg	DSCF7186.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ba067848-dscf7186.jpg	content/2025-11-20/ba067848-dscf7186.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8f333abe-thumb-dscf7186.jpg	IMAGE	image/jpeg	551169	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:43.434	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j93md001x106ulv5x5vao	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19cc1fe1-dscf7196.jpg	DSCF7196.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19cc1fe1-dscf7196.jpg	content/2025-11-20/19cc1fe1-dscf7196.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0e6be133-thumb-dscf7196.jpg	IMAGE	image/jpeg	600633	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:52.693	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j946z0021106u8h4hbujl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6e7327f4-dscf7194.jpg	DSCF7194.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6e7327f4-dscf7194.jpg	content/2025-11-20/6e7327f4-dscf7194.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/473b4dc7-thumb-dscf7194.jpg	IMAGE	image/jpeg	523639	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:53.435	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j94g90025106upt8xzr0p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f03864e9-dscf7197.jpg	DSCF7197.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f03864e9-dscf7197.jpg	content/2025-11-20/f03864e9-dscf7197.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2007002a-thumb-dscf7197.jpg	IMAGE	image/jpeg	536951	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:53.769	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j974w0029106u4thr3uoy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d7ef01ca-dscf7198.jpg	DSCF7198.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d7ef01ca-dscf7198.jpg	content/2025-11-20/d7ef01ca-dscf7198.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ae106a0a-thumb-dscf7198.jpg	IMAGE	image/jpeg	583960	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:57.248	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9866002d106um88w8d20	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/521bff59-dscf7201.jpg	DSCF7201.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/521bff59-dscf7201.jpg	content/2025-11-20/521bff59-dscf7201.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4ad51a48-thumb-dscf7201.jpg	IMAGE	image/jpeg	586907	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:58.59	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j98qe002h106ub90ocbvz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e4e3daca-dscf7200.jpg	DSCF7200.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e4e3daca-dscf7200.jpg	content/2025-11-20/e4e3daca-dscf7200.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/52a2413e-thumb-dscf7200.jpg	IMAGE	image/jpeg	681826	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:59.318	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j995o002l106u37naoldl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/601d60e4-dscf7202.jpg	DSCF7202.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/601d60e4-dscf7202.jpg	content/2025-11-20/601d60e4-dscf7202.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e4c0e7e1-thumb-dscf7202.jpg	IMAGE	image/jpeg	669919	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:34:59.869	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9a22002p106ut88y6wmf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5b60604e-dscf7203.jpg	DSCF7203.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5b60604e-dscf7203.jpg	content/2025-11-20/5b60604e-dscf7203.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d31da8e5-thumb-dscf7203.jpg	IMAGE	image/jpeg	641272	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:01.034	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9b4l002t106ufz4md4sy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7e25834a-dscf7204.jpg	DSCF7204.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7e25834a-dscf7204.jpg	content/2025-11-20/7e25834a-dscf7204.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0f8f0818-thumb-dscf7204.jpg	IMAGE	image/jpeg	620892	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:02.421	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9bxh002x106uen0si6f9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dea68ea5-dscf7205.jpg	DSCF7205.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dea68ea5-dscf7205.jpg	content/2025-11-20/dea68ea5-dscf7205.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a4c95333-thumb-dscf7205.jpg	IMAGE	image/jpeg	692666	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:03.461	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9dgu0031106uk093jiqr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a08a1bb8-dscf7206.jpg	DSCF7206.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a08a1bb8-dscf7206.jpg	content/2025-11-20/a08a1bb8-dscf7206.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2d4d9e3e-thumb-dscf7206.jpg	IMAGE	image/jpeg	699187	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:05.454	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9dm50035106uvm5tlnz6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0d5f1857-dscf7207.jpg	DSCF7207.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0d5f1857-dscf7207.jpg	content/2025-11-20/0d5f1857-dscf7207.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/63e4c36f-thumb-dscf7207.jpg	IMAGE	image/jpeg	634598	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:05.645	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9el70039106ux5k83rah	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/da62e0b6-dscf7209.jpg	DSCF7209.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/da62e0b6-dscf7209.jpg	content/2025-11-20/da62e0b6-dscf7209.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/94d998cd-thumb-dscf7209.jpg	IMAGE	image/jpeg	681088	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:06.907	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9fhq003d106u4zlz0uhy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f0b45d8c-dscf7212.jpg	DSCF7212.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f0b45d8c-dscf7212.jpg	content/2025-11-20/f0b45d8c-dscf7212.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aa474d0f-thumb-dscf7212.jpg	IMAGE	image/jpeg	589539	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:08.078	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9h28003h106u7a9a88ij	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2100a6a6-dscf7214.jpg	DSCF7214.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2100a6a6-dscf7214.jpg	content/2025-11-20/2100a6a6-dscf7214.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4a610f71-thumb-dscf7214.jpg	IMAGE	image/jpeg	638144	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:10.112	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9h5w003l106uaoui49bm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d54960e7-dscf7213.jpg	DSCF7213.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d54960e7-dscf7213.jpg	content/2025-11-20/d54960e7-dscf7213.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2ba81b8f-thumb-dscf7213.jpg	IMAGE	image/jpeg	668505	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:10.244	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9hvr003p106uo6l5aw2b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/79ad0f5b-dscf7215.jpg	DSCF7215.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/79ad0f5b-dscf7215.jpg	content/2025-11-20/79ad0f5b-dscf7215.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6fdebff3-thumb-dscf7215.jpg	IMAGE	image/jpeg	591473	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:11.175	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9jgv003t106ux4nm0jky	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/267c3e80-dscf7216.jpg	DSCF7216.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/267c3e80-dscf7216.jpg	content/2025-11-20/267c3e80-dscf7216.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fe2f5185-thumb-dscf7216.jpg	IMAGE	image/jpeg	608725	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:13.232	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9kdd003x106u0y5h2w95	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4b680e8b-dscf7217.jpg	DSCF7217.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4b680e8b-dscf7217.jpg	content/2025-11-20/4b680e8b-dscf7217.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/85ebade5-thumb-dscf7217.jpg	IMAGE	image/jpeg	619471	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:14.401	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9koy0041106un0ww1ins	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/811ac2a4-dscf7221.jpg	DSCF7221.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/811ac2a4-dscf7221.jpg	content/2025-11-20/811ac2a4-dscf7221.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/087a1612-thumb-dscf7221.jpg	IMAGE	image/jpeg	592865	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:14.818	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9lpr0045106u707tgdem	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/64c8aa35-dscf7222.jpg	DSCF7222.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/64c8aa35-dscf7222.jpg	content/2025-11-20/64c8aa35-dscf7222.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1210d57d-thumb-dscf7222.jpg	IMAGE	image/jpeg	599273	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:16.143	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9mpm0049106ul9xy6tgz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/24460743-dscf7223.jpg	DSCF7223.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/24460743-dscf7223.jpg	content/2025-11-20/24460743-dscf7223.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ce8abfcd-thumb-dscf7223.jpg	IMAGE	image/jpeg	619301	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:17.435	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9myb004d106um2fnzjm3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f51f0822-dscf7224.jpg	DSCF7224.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f51f0822-dscf7224.jpg	content/2025-11-20/f51f0822-dscf7224.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bed74f3e-thumb-dscf7224.jpg	IMAGE	image/jpeg	616826	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:17.747	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9n5x004h106uqpfkfxtq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bb1b1103-dscf7230.jpg	DSCF7230.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bb1b1103-dscf7230.jpg	content/2025-11-20/bb1b1103-dscf7230.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b88c3efd-thumb-dscf7230.jpg	IMAGE	image/jpeg	701709	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:18.021	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9ojg004l106u9qvqq840	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b3be4923-dscf7233.jpg	DSCF7233.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b3be4923-dscf7233.jpg	content/2025-11-20/b3be4923-dscf7233.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c83bae98-thumb-dscf7233.jpg	IMAGE	image/jpeg	647652	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:19.804	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9pss004p106ucpk87sp5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/127a83cb-dscf7234.jpg	DSCF7234.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/127a83cb-dscf7234.jpg	content/2025-11-20/127a83cb-dscf7234.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e77d08cb-thumb-dscf7234.jpg	IMAGE	image/jpeg	638807	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:21.436	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9px7004t106ury1zuqdj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d437845e-dscf7235.jpg	DSCF7235.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d437845e-dscf7235.jpg	content/2025-11-20/d437845e-dscf7235.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/179f2b3b-thumb-dscf7235.jpg	IMAGE	image/jpeg	650134	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:21.595	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9rw0004x106u4qahh2fd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cbf40003-dscf7240.jpg	DSCF7240.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cbf40003-dscf7240.jpg	content/2025-11-20/cbf40003-dscf7240.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a665c9e4-thumb-dscf7240.jpg	IMAGE	image/jpeg	574856	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:24.144	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9t2e0051106uplyn5z0o	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e2a7214e-dscf7239.jpg	DSCF7239.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e2a7214e-dscf7239.jpg	content/2025-11-20/e2a7214e-dscf7239.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/05c8c57a-thumb-dscf7239.jpg	IMAGE	image/jpeg	603661	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:25.67	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9ux10055106uemq0dbu7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d079e502-dscf7241.jpg	DSCF7241.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d079e502-dscf7241.jpg	content/2025-11-20/d079e502-dscf7241.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/14788a91-thumb-dscf7241.jpg	IMAGE	image/jpeg	532776	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:28.069	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9v7v0059106u1mu0o3mt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/06666548-dscf7242.jpg	DSCF7242.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/06666548-dscf7242.jpg	content/2025-11-20/06666548-dscf7242.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bd2c3902-thumb-dscf7242.jpg	IMAGE	image/jpeg	540245	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:28.459	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9vvu005d106up5mzagag	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/16b11969-dscf7243.jpg	DSCF7243.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/16b11969-dscf7243.jpg	content/2025-11-20/16b11969-dscf7243.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9e6a4b92-thumb-dscf7243.jpg	IMAGE	image/jpeg	592221	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:29.322	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9wai005h106ug86yyo7k	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bd7d0fdc-dscf7244.jpg	DSCF7244.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bd7d0fdc-dscf7244.jpg	content/2025-11-20/bd7d0fdc-dscf7244.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/982525d4-thumb-dscf7244.jpg	IMAGE	image/jpeg	567667	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:29.85	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9ydq005l106ux0pmh436	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ecadc5d9-dscf7245.jpg	DSCF7245.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ecadc5d9-dscf7245.jpg	content/2025-11-20/ecadc5d9-dscf7245.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aa1ac3d9-thumb-dscf7245.jpg	IMAGE	image/jpeg	578418	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:32.558	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9yu4005p106urn6gaqon	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8b803912-dscf7247.jpg	DSCF7247.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8b803912-dscf7247.jpg	content/2025-11-20/8b803912-dscf7247.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4bb57239-thumb-dscf7247.jpg	IMAGE	image/jpeg	605275	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:33.148	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9zwc005t106uqla1iz8w	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e23ed871-dscf7249.jpg	DSCF7249.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e23ed871-dscf7249.jpg	content/2025-11-20/e23ed871-dscf7249.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d07b247a-thumb-dscf7249.jpg	IMAGE	image/jpeg	605204	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:34.523	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7j9zya005x106ucsxdfn4q	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/12e1b758-dscf7248.jpg	DSCF7248.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/12e1b758-dscf7248.jpg	content/2025-11-20/12e1b758-dscf7248.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f6315458-thumb-dscf7248.jpg	IMAGE	image/jpeg	577775	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:34.593	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja1t80061106urgaal75g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/63d79620-dscf7251.jpg	DSCF7251.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/63d79620-dscf7251.jpg	content/2025-11-20/63d79620-dscf7251.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d6871e70-thumb-dscf7251.jpg	IMAGE	image/jpeg	622749	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:37.004	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja2ew0065106urfyxjrmn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/03d9f662-dscf7250.jpg	DSCF7250.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/03d9f662-dscf7250.jpg	content/2025-11-20/03d9f662-dscf7250.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c29d51d8-thumb-dscf7250.jpg	IMAGE	image/jpeg	611684	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:37.784	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja3b10069106uxcj7f258	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/83e7af44-dscf7254.jpg	DSCF7254.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/83e7af44-dscf7254.jpg	content/2025-11-20/83e7af44-dscf7254.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/64e117fc-thumb-dscf7254.jpg	IMAGE	image/jpeg	741226	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:38.94	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja4xi006d106uy7o0l1qn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/90fbe931-dscf7252.jpg	DSCF7252.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/90fbe931-dscf7252.jpg	content/2025-11-20/90fbe931-dscf7252.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/57ffd08d-thumb-dscf7252.jpg	IMAGE	image/jpeg	640478	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:41.045	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja5ds006h106upl50x5de	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5b3e1cc7-dscf7255.jpg	DSCF7255.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5b3e1cc7-dscf7255.jpg	content/2025-11-20/5b3e1cc7-dscf7255.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9a9623fd-thumb-dscf7255.jpg	IMAGE	image/jpeg	675971	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:41.632	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja62i006l106uw66oalci	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2022d054-dscf7256.jpg	DSCF7256.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2022d054-dscf7256.jpg	content/2025-11-20/2022d054-dscf7256.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3d0a5111-thumb-dscf7256.jpg	IMAGE	image/jpeg	703550	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:42.522	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja6ds006p106ucovxo2wq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fae8f0f1-dscf7258.jpg	DSCF7258.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fae8f0f1-dscf7258.jpg	content/2025-11-20/fae8f0f1-dscf7258.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/73988430-thumb-dscf7258.jpg	IMAGE	image/jpeg	706365	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:42.928	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja8h0006t106um4h8fkst	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ac727ec7-dscf7260.jpg	DSCF7260.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ac727ec7-dscf7260.jpg	content/2025-11-20/ac727ec7-dscf7260.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2b2b5425-thumb-dscf7260.jpg	IMAGE	image/jpeg	761381	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:45.636	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ja9yf006x106u0ficy8e8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ea961877-dscf7262.jpg	DSCF7262.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ea961877-dscf7262.jpg	content/2025-11-20/ea961877-dscf7262.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aea52d68-thumb-dscf7262.jpg	IMAGE	image/jpeg	700925	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:47.558	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jaa2c0071106us7v0eeqz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8cd78c70-dscf7261.jpg	DSCF7261.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8cd78c70-dscf7261.jpg	content/2025-11-20/8cd78c70-dscf7261.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/65c0ff82-thumb-dscf7261.jpg	IMAGE	image/jpeg	706358	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:47.7	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jaaws0075106u8ahk0vpv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a61a8e7e-dscf7263.jpg	DSCF7263.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a61a8e7e-dscf7263.jpg	content/2025-11-20/a61a8e7e-dscf7263.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/326f1158-thumb-dscf7263.jpg	IMAGE	image/jpeg	702737	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:48.796	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jabf20079106u2roifl65	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4c3121cd-dscf7264.jpg	DSCF7264.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4c3121cd-dscf7264.jpg	content/2025-11-20/4c3121cd-dscf7264.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f496b8fb-thumb-dscf7264.jpg	IMAGE	image/jpeg	699387	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:49.453	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jadck007d106ufkkoal8k	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/29db54ab-dscf7265.jpg	DSCF7265.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/29db54ab-dscf7265.jpg	content/2025-11-20/29db54ab-dscf7265.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e0a11f30-thumb-dscf7265.jpg	IMAGE	image/jpeg	681159	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:51.956	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jaetx007h106ubllqqdlv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b90409ba-dscf7267.jpg	DSCF7267.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b90409ba-dscf7267.jpg	content/2025-11-20/b90409ba-dscf7267.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/995b89f1-thumb-dscf7267.jpg	IMAGE	image/jpeg	624870	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:53.877	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jaewi007l106u10ctr3tc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/053017e8-dscf7268.jpg	DSCF7268.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/053017e8-dscf7268.jpg	content/2025-11-20/053017e8-dscf7268.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2de8768e-thumb-dscf7268.jpg	IMAGE	image/jpeg	690779	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:53.97	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jaeya007p106uasghtqoz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7f4b3582-dscf7266.jpg	DSCF7266.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7f4b3582-dscf7266.jpg	content/2025-11-20/7f4b3582-dscf7266.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f7d62278-thumb-dscf7266.jpg	IMAGE	image/jpeg	703593	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:54.034	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7jaglk007t106u92rf4rpd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/aa232012-dscf7269.jpg	DSCF7269.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/aa232012-dscf7269.jpg	content/2025-11-20/aa232012-dscf7269.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7e2f643a-thumb-dscf7269.jpg	IMAGE	image/jpeg	675533	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 14:35:56.168	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpcfb007x106ujanjwbde	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/60e88485-dscf7173.jpg	DSCF7173.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/60e88485-dscf7173.jpg	content/2025-11-20/60e88485-dscf7173.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7040e3a4-thumb-dscf7173.jpg	IMAGE	image/jpeg	489527	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:30.214	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpd1j0081106ul5hnd3xw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2b5d5949-dscf7180.jpg	DSCF7180.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2b5d5949-dscf7180.jpg	content/2025-11-20/2b5d5949-dscf7180.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/45a2ce04-thumb-dscf7180.jpg	IMAGE	image/jpeg	567141	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:31.015	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpd7p0085106uckp9bklo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fbddbcec-dscf7175.jpg	DSCF7175.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fbddbcec-dscf7175.jpg	content/2025-11-20/fbddbcec-dscf7175.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8974f374-thumb-dscf7175.jpg	IMAGE	image/jpeg	474337	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:31.237	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpdh90089106uso5zindf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/20b24d14-dscf7174.jpg	DSCF7174.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/20b24d14-dscf7174.jpg	content/2025-11-20/20b24d14-dscf7174.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1019ee93-thumb-dscf7174.jpg	IMAGE	image/jpeg	469827	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:31.581	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpetz008d106uz43wk743	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f856566a-dscf7181.jpg	DSCF7181.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f856566a-dscf7181.jpg	content/2025-11-20/f856566a-dscf7181.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31b62d45-thumb-dscf7181.jpg	IMAGE	image/jpeg	548708	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:33.335	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpfb7008h106ue4kdc1f7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19faa568-dscf7182.jpg	DSCF7182.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19faa568-dscf7182.jpg	content/2025-11-20/19faa568-dscf7182.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2ef8e38a-thumb-dscf7182.jpg	IMAGE	image/jpeg	542631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:33.956	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpg7t008l106uuupuckm8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/409be2f9-dscf7183.jpg	DSCF7183.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/409be2f9-dscf7183.jpg	content/2025-11-20/409be2f9-dscf7183.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c3d2abfa-thumb-dscf7183.jpg	IMAGE	image/jpeg	541501	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:35.129	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kphiv008p106udlmeh8n4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/db7e2d14-dscf7184.jpg	DSCF7184.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/db7e2d14-dscf7184.jpg	content/2025-11-20/db7e2d14-dscf7184.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/09830c62-thumb-dscf7184.jpg	IMAGE	image/jpeg	556954	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:36.823	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kphtl008t106uy5pav7ah	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f0a6d84a-dscf7185.jpg	DSCF7185.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f0a6d84a-dscf7185.jpg	content/2025-11-20/f0a6d84a-dscf7185.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5bdf1f21-thumb-dscf7185.jpg	IMAGE	image/jpeg	575191	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:37.208	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpii5008x106ubcd6drr4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b0a6c288-dscf7186.jpg	DSCF7186.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b0a6c288-dscf7186.jpg	content/2025-11-20/b0a6c288-dscf7186.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fe82f275-thumb-dscf7186.jpg	IMAGE	image/jpeg	551169	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:38.093	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpjpu0091106uoo72e5u0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/00aa3648-dscf7187.jpg	DSCF7187.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/00aa3648-dscf7187.jpg	content/2025-11-20/00aa3648-dscf7187.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/22f15997-thumb-dscf7187.jpg	IMAGE	image/jpeg	568146	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:39.666	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kplxc0095106u5yiodwrg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/02ac6708-dscf7190.jpg	DSCF7190.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/02ac6708-dscf7190.jpg	content/2025-11-20/02ac6708-dscf7190.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/80c92a44-thumb-dscf7190.jpg	IMAGE	image/jpeg	561562	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:42.528	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kplz90099106utcvsa4z2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e2449daa-dscf7188.jpg	DSCF7188.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e2449daa-dscf7188.jpg	content/2025-11-20/e2449daa-dscf7188.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0133cb20-thumb-dscf7188.jpg	IMAGE	image/jpeg	545636	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:42.597	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpmg7009d106uj08a7nt2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/49e4dc29-dscf7191.jpg	DSCF7191.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/49e4dc29-dscf7191.jpg	content/2025-11-20/49e4dc29-dscf7191.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/633af769-thumb-dscf7191.jpg	IMAGE	image/jpeg	548793	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:43.207	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpmpc009h106ua94r8o5x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/20f15e83-dscf7192.jpg	DSCF7192.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/20f15e83-dscf7192.jpg	content/2025-11-20/20f15e83-dscf7192.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e248211f-thumb-dscf7192.jpg	IMAGE	image/jpeg	548958	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:43.536	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpphn009l106u73i7fan3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b89000e7-dscf7193.jpg	DSCF7193.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b89000e7-dscf7193.jpg	content/2025-11-20/b89000e7-dscf7193.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e7eaff70-thumb-dscf7193.jpg	IMAGE	image/jpeg	531852	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:47.147	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpqy0009p106u4t2jj9qu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/48d89885-dscf7194.jpg	DSCF7194.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/48d89885-dscf7194.jpg	content/2025-11-20/48d89885-dscf7194.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b9451a37-thumb-dscf7194.jpg	IMAGE	image/jpeg	523639	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:49.032	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kprce009t106umd6y11zx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ba4d7197-dscf7195.jpg	DSCF7195.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ba4d7197-dscf7195.jpg	content/2025-11-20/ba4d7197-dscf7195.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d5cb5e98-thumb-dscf7195.jpg	IMAGE	image/jpeg	516454	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:49.55	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kprx0009x106uy9mcy8pv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e56c4831-dscf7196.jpg	DSCF7196.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e56c4831-dscf7196.jpg	content/2025-11-20/e56c4831-dscf7196.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fe2b5f0d-thumb-dscf7196.jpg	IMAGE	image/jpeg	600633	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:50.292	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kptk400a1106umh5f72eo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5bf4006c-dscf7197.jpg	DSCF7197.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5bf4006c-dscf7197.jpg	content/2025-11-20/5bf4006c-dscf7197.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e024e6d3-thumb-dscf7197.jpg	IMAGE	image/jpeg	536951	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:52.42	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpxxx00a5106ulwa3088n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6fa5a1a5-dscf7200.jpg	DSCF7200.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6fa5a1a5-dscf7200.jpg	content/2025-11-20/6fa5a1a5-dscf7200.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/06ed940f-thumb-dscf7200.jpg	IMAGE	image/jpeg	681826	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:58.101	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpy0800a9106uulkz54o9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8fba5c3d-dscf7198.jpg	DSCF7198.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8fba5c3d-dscf7198.jpg	content/2025-11-20/8fba5c3d-dscf7198.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/83515cfb-thumb-dscf7198.jpg	IMAGE	image/jpeg	583960	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:58.185	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpy3100ad106u478wxfrt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fe59bf48-dscf7201.jpg	DSCF7201.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fe59bf48-dscf7201.jpg	content/2025-11-20/fe59bf48-dscf7201.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/855a6d0c-thumb-dscf7201.jpg	IMAGE	image/jpeg	586907	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:58.285	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kpygp00ah106uemqph2ul	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/90f1311b-dscf7202.jpg	DSCF7202.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/90f1311b-dscf7202.jpg	content/2025-11-20/90f1311b-dscf7202.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/40c443c1-thumb-dscf7202.jpg	IMAGE	image/jpeg	669919	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:15:58.777	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq1fv00al106u3yl639mj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/299af196-dscf7203.jpg	DSCF7203.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/299af196-dscf7203.jpg	content/2025-11-20/299af196-dscf7203.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0572c87e-thumb-dscf7203.jpg	IMAGE	image/jpeg	641272	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:02.636	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq3fk00ap106ubqahi8ga	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f60f7bd-dscf7204.jpg	DSCF7204.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f60f7bd-dscf7204.jpg	content/2025-11-20/3f60f7bd-dscf7204.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ece0fe60-thumb-dscf7204.jpg	IMAGE	image/jpeg	620892	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:05.217	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq45e00at106uaw5rjxne	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/520cf99f-dscf7206.jpg	DSCF7206.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/520cf99f-dscf7206.jpg	content/2025-11-20/520cf99f-dscf7206.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d8c23faf-thumb-dscf7206.jpg	IMAGE	image/jpeg	699187	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:06.146	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq46b00ax106uoshkydxj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2f36506e-dscf7205.jpg	DSCF7205.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2f36506e-dscf7205.jpg	content/2025-11-20/2f36506e-dscf7205.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bb9b1bb1-thumb-dscf7205.jpg	IMAGE	image/jpeg	692666	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:06.179	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq5fg00b1106u9xj4jt2v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/54400868-dscf7207.jpg	DSCF7207.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/54400868-dscf7207.jpg	content/2025-11-20/54400868-dscf7207.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6e0d9a8d-thumb-dscf7207.jpg	IMAGE	image/jpeg	634598	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:07.804	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq8ha00b5106ub9sd06zu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2d83da36-dscf7212.jpg	DSCF7212.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2d83da36-dscf7212.jpg	content/2025-11-20/2d83da36-dscf7212.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/47aa0d0b-thumb-dscf7212.jpg	IMAGE	image/jpeg	589539	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:11.759	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq8mm00b9106uy5prdzdj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/72cfc4e3-dscf7213.jpg	DSCF7213.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/72cfc4e3-dscf7213.jpg	content/2025-11-20/72cfc4e3-dscf7213.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b1bf0562-thumb-dscf7213.jpg	IMAGE	image/jpeg	668505	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:11.95	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq9ai00bd106uhu3w1z83	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a57c47f6-dscf7209.jpg	DSCF7209.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a57c47f6-dscf7209.jpg	content/2025-11-20/a57c47f6-dscf7209.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/adbdb54d-thumb-dscf7209.jpg	IMAGE	image/jpeg	681088	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:12.81	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kq9kt00bh106ui8dx0qv0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e2f06472-dscf7214.jpg	DSCF7214.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e2f06472-dscf7214.jpg	content/2025-11-20/e2f06472-dscf7214.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4aa57e0f-thumb-dscf7214.jpg	IMAGE	image/jpeg	638144	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:13.179	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqc1j00bl106usdoh06sk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/585d2d2f-dscf7215.jpg	DSCF7215.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/585d2d2f-dscf7215.jpg	content/2025-11-20/585d2d2f-dscf7215.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/80a7ad32-thumb-dscf7215.jpg	IMAGE	image/jpeg	591473	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:16.375	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqe4n00bp106ug6qzugek	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4a9fa9c6-dscf7217.jpg	DSCF7217.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4a9fa9c6-dscf7217.jpg	content/2025-11-20/4a9fa9c6-dscf7217.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f6689b83-thumb-dscf7217.jpg	IMAGE	image/jpeg	619471	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:19.078	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqe8900bt106uvact5adl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e418c708-dscf7216.jpg	DSCF7216.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e418c708-dscf7216.jpg	content/2025-11-20/e418c708-dscf7216.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2844536d-thumb-dscf7216.jpg	IMAGE	image/jpeg	608725	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:19.21	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqejg00bx106usrelv1z3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/74c12255-dscf7221.jpg	DSCF7221.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/74c12255-dscf7221.jpg	content/2025-11-20/74c12255-dscf7221.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/793c5ac2-thumb-dscf7221.jpg	IMAGE	image/jpeg	592865	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:19.612	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqg3e00c1106uya9x0cb3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0aa17806-dscf7222.jpg	DSCF7222.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0aa17806-dscf7222.jpg	content/2025-11-20/0aa17806-dscf7222.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aa497248-thumb-dscf7222.jpg	IMAGE	image/jpeg	599273	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:21.626	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqimr00c5106u5vi9ynn0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c0fde01f-dscf7223.jpg	DSCF7223.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c0fde01f-dscf7223.jpg	content/2025-11-20/c0fde01f-dscf7223.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e0add410-thumb-dscf7223.jpg	IMAGE	image/jpeg	619301	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:24.915	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqj7a00c9106uudhf641b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/37220f5f-dscf7224.jpg	DSCF7224.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/37220f5f-dscf7224.jpg	content/2025-11-20/37220f5f-dscf7224.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/de487b4b-thumb-dscf7224.jpg	IMAGE	image/jpeg	616826	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:25.654	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqjql00cd106u5uyxtxzc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/421a2500-dscf7230.jpg	DSCF7230.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/421a2500-dscf7230.jpg	content/2025-11-20/421a2500-dscf7230.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3ed2ffe8-thumb-dscf7230.jpg	IMAGE	image/jpeg	701709	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:26.349	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqk0100ch106u0gvnpi4e	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8b78d140-dscf7233.jpg	DSCF7233.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8b78d140-dscf7233.jpg	content/2025-11-20/8b78d140-dscf7233.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e612b10a-thumb-dscf7233.jpg	IMAGE	image/jpeg	647652	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:26.689	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqmr400cl106uwcb72sbv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bf8a9ea5-dscf7234.jpg	DSCF7234.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bf8a9ea5-dscf7234.jpg	content/2025-11-20/bf8a9ea5-dscf7234.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/63f9cc11-thumb-dscf7234.jpg	IMAGE	image/jpeg	638807	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:30.256	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqo0d00cp106u971ytpdw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4be5f092-dscf7235.jpg	DSCF7235.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4be5f092-dscf7235.jpg	content/2025-11-20/4be5f092-dscf7235.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8e9fc690-thumb-dscf7235.jpg	IMAGE	image/jpeg	650134	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:31.885	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqpmg00ct106udtdld8be	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/354d2eca-dscf7239.jpg	DSCF7239.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/354d2eca-dscf7239.jpg	content/2025-11-20/354d2eca-dscf7239.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b2557b83-thumb-dscf7239.jpg	IMAGE	image/jpeg	603661	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:33.976	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqpzo00cx106u4zt1aviq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ad747335-dscf7241.jpg	DSCF7241.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ad747335-dscf7241.jpg	content/2025-11-20/ad747335-dscf7241.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a075bd62-thumb-dscf7241.jpg	IMAGE	image/jpeg	532776	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:34.452	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqqex00d1106ux40aexwd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ccd71428-dscf7240.jpg	DSCF7240.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ccd71428-dscf7240.jpg	content/2025-11-20/ccd71428-dscf7240.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/39f0abb4-thumb-dscf7240.jpg	IMAGE	image/jpeg	574856	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:35	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqqwo00d5106u90k9dub9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/681d63d9-dscf7242.jpg	DSCF7242.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/681d63d9-dscf7242.jpg	content/2025-11-20/681d63d9-dscf7242.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/77215e30-thumb-dscf7242.jpg	IMAGE	image/jpeg	540245	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:35.64	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqt3i00d9106udgnxtih9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b88dccb6-dscf7243.jpg	DSCF7243.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b88dccb6-dscf7243.jpg	content/2025-11-20/b88dccb6-dscf7243.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4d2d5f70-thumb-dscf7243.jpg	IMAGE	image/jpeg	592221	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:38.478	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqu8i00dd106uqdpetarn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f128ec93-dscf7244.jpg	DSCF7244.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f128ec93-dscf7244.jpg	content/2025-11-20/f128ec93-dscf7244.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1a70b521-thumb-dscf7244.jpg	IMAGE	image/jpeg	567667	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:39.954	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqucc00dh106uaq75jqe4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/87499a36-dscf7245.jpg	DSCF7245.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/87499a36-dscf7245.jpg	content/2025-11-20/87499a36-dscf7245.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c1b23d4a-thumb-dscf7245.jpg	IMAGE	image/jpeg	578418	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:40.092	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqvhj00dl106umph1u9u3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/568affd1-dscf7247.jpg	DSCF7247.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/568affd1-dscf7247.jpg	content/2025-11-20/568affd1-dscf7247.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2e444ef4-thumb-dscf7247.jpg	IMAGE	image/jpeg	605275	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:41.575	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kqzj700dp106u0d6gkxmc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6a9cbffc-dscf7248.jpg	DSCF7248.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6a9cbffc-dscf7248.jpg	content/2025-11-20/6a9cbffc-dscf7248.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/59a40ee0-thumb-dscf7248.jpg	IMAGE	image/jpeg	577775	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:46.819	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr1ws00dt106ub93u36tc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/44c7c828-dscf7249.jpg	DSCF7249.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/44c7c828-dscf7249.jpg	content/2025-11-20/44c7c828-dscf7249.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5ad76e44-thumb-dscf7249.jpg	IMAGE	image/jpeg	605204	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:49.9	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr2ao00dx106uti6a1xga	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/63073579-dscf7251.jpg	DSCF7251.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/63073579-dscf7251.jpg	content/2025-11-20/63073579-dscf7251.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cfc226bb-thumb-dscf7251.jpg	IMAGE	image/jpeg	622749	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:50.401	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr2i900e1106ufzlay82a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/afee0400-dscf7250.jpg	DSCF7250.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/afee0400-dscf7250.jpg	content/2025-11-20/afee0400-dscf7250.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3e7d2d0d-thumb-dscf7250.jpg	IMAGE	image/jpeg	611684	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:50.673	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr32700e5106usq0i761b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a1552188-dscf7252.jpg	DSCF7252.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a1552188-dscf7252.jpg	content/2025-11-20/a1552188-dscf7252.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c4b95014-thumb-dscf7252.jpg	IMAGE	image/jpeg	640478	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:51.391	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr5wz00e9106ua1bdrbrm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/902d4890-dscf7254.jpg	DSCF7254.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/902d4890-dscf7254.jpg	content/2025-11-20/902d4890-dscf7254.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d48d1f77-thumb-dscf7254.jpg	IMAGE	image/jpeg	741226	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:55.091	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr8jf00ed106ukvv049sm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a8cf16eb-dscf7255.jpg	DSCF7255.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a8cf16eb-dscf7255.jpg	content/2025-11-20/a8cf16eb-dscf7255.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/567bdbc4-thumb-dscf7255.jpg	IMAGE	image/jpeg	675971	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:58.491	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr8r400eh106uqd7gcqj3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b3246a2d-dscf7256.jpg	DSCF7256.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b3246a2d-dscf7256.jpg	content/2025-11-20/b3246a2d-dscf7256.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/060c5260-thumb-dscf7256.jpg	IMAGE	image/jpeg	703550	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:58.768	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr9as00el106u31uu1vq9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bde7119b-dscf7258.jpg	DSCF7258.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bde7119b-dscf7258.jpg	content/2025-11-20/bde7119b-dscf7258.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/20bee2e4-thumb-dscf7258.jpg	IMAGE	image/jpeg	706365	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:59.475	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kr9k100ep106ua51xp73g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d3b7a574-dscf7260.jpg	DSCF7260.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d3b7a574-dscf7260.jpg	content/2025-11-20/d3b7a574-dscf7260.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/03afb5d1-thumb-dscf7260.jpg	IMAGE	image/jpeg	761381	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:16:59.809	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krcd200et106ues0ysd13	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bf2bcffc-dscf7261.jpg	DSCF7261.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bf2bcffc-dscf7261.jpg	content/2025-11-20/bf2bcffc-dscf7261.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3c47dd93-thumb-dscf7261.jpg	IMAGE	image/jpeg	706358	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:03.446	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krdbb00ex106u06ou1q05	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ce245ab8-dscf7262.jpg	DSCF7262.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ce245ab8-dscf7262.jpg	content/2025-11-20/ce245ab8-dscf7262.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cd04f6d1-thumb-dscf7262.jpg	IMAGE	image/jpeg	700925	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:04.679	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kre7n00f1106u5raf5968	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8f883fa0-dscf7263.jpg	DSCF7263.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8f883fa0-dscf7263.jpg	content/2025-11-20/8f883fa0-dscf7263.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5c9afbb0-thumb-dscf7263.jpg	IMAGE	image/jpeg	702737	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:05.843	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krf2m00f5106uiyaj0kwf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9c3498c6-dscf7264.jpg	DSCF7264.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9c3498c6-dscf7264.jpg	content/2025-11-20/9c3498c6-dscf7264.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1f247024-thumb-dscf7264.jpg	IMAGE	image/jpeg	699387	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:06.958	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krgbr00f9106ucqamgrq5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/116e0c0a-dscf7265.jpg	DSCF7265.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/116e0c0a-dscf7265.jpg	content/2025-11-20/116e0c0a-dscf7265.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f3256c88-thumb-dscf7265.jpg	IMAGE	image/jpeg	681159	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:08.583	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krh8z00fd106uy9p8u7vz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/83eb3a36-dscf7266.jpg	DSCF7266.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/83eb3a36-dscf7266.jpg	content/2025-11-20/83eb3a36-dscf7266.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/70daaa2c-thumb-dscf7266.jpg	IMAGE	image/jpeg	703593	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:09.779	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krj3s00fh106uh4q31wjr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9275cc92-dscf7267.jpg	DSCF7267.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9275cc92-dscf7267.jpg	content/2025-11-20/9275cc92-dscf7267.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c7786642-thumb-dscf7267.jpg	IMAGE	image/jpeg	624870	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:12.184	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krjmo00fl106u4jmy8fw1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9a737806-dscf7268.jpg	DSCF7268.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9a737806-dscf7268.jpg	content/2025-11-20/9a737806-dscf7268.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e0b03616-thumb-dscf7268.jpg	IMAGE	image/jpeg	690779	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:12.864	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krk9a00fp106upgo9k901	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5c86cff4-dscf7269.jpg	DSCF7269.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5c86cff4-dscf7269.jpg	content/2025-11-20/5c86cff4-dscf7269.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/415c5172-thumb-dscf7269.jpg	IMAGE	image/jpeg	675533	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:13.678	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krlk800ft106uygnj42vr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ee199987-dscf7270.jpg	DSCF7270.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ee199987-dscf7270.jpg	content/2025-11-20/ee199987-dscf7270.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/93dd6e04-thumb-dscf7270.jpg	IMAGE	image/jpeg	700749	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:15.369	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krmw000fx106ukow8a803	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1e9f8d8c-dscf7273.jpg	DSCF7273.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1e9f8d8c-dscf7273.jpg	content/2025-11-20/1e9f8d8c-dscf7273.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5a5e8a06-thumb-dscf7273.jpg	IMAGE	image/jpeg	738462	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:17.088	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krnxa00g1106ukuaf2d0t	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5542bba3-dscf7274.jpg	DSCF7274.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5542bba3-dscf7274.jpg	content/2025-11-20/5542bba3-dscf7274.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2fb42ed2-thumb-dscf7274.jpg	IMAGE	image/jpeg	735472	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:18.43	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krovk00g5106uekgwbzjq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/be420c2f-dscf7275.jpg	DSCF7275.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/be420c2f-dscf7275.jpg	content/2025-11-20/be420c2f-dscf7275.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9d880780-thumb-dscf7275.jpg	IMAGE	image/jpeg	680029	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:19.65	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krrtu00g9106umxgjmad1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3ed6899e-dscf7276.jpg	DSCF7276.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3ed6899e-dscf7276.jpg	content/2025-11-20/3ed6899e-dscf7276.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2eda3055-thumb-dscf7276.jpg	IMAGE	image/jpeg	743011	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:23.49	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krsl800gd106uxzr90fop	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ee42b6c2-dscf7277.jpg	DSCF7277.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ee42b6c2-dscf7277.jpg	content/2025-11-20/ee42b6c2-dscf7277.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/36147a48-thumb-dscf7277.jpg	IMAGE	image/jpeg	712842	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:24.476	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krt6l00gh106uzq4jwtxj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bef331b1-dscf7280.jpg	DSCF7280.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bef331b1-dscf7280.jpg	content/2025-11-20/bef331b1-dscf7280.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0699aa84-thumb-dscf7280.jpg	IMAGE	image/jpeg	684864	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:25.246	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krtj100gl106uvvb0ps4u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9c14b2a2-dscf7279.jpg	DSCF7279.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9c14b2a2-dscf7279.jpg	content/2025-11-20/9c14b2a2-dscf7279.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b1c72b17-thumb-dscf7279.jpg	IMAGE	image/jpeg	705567	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:25.693	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krw5s00gp106uwi5u9atl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/11b6ec21-dscf7281.jpg	DSCF7281.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/11b6ec21-dscf7281.jpg	content/2025-11-20/11b6ec21-dscf7281.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f91d95ed-thumb-dscf7281.jpg	IMAGE	image/jpeg	704754	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:29.104	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krxk200gt106ufqy284at	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4af64d1f-dscf7282.jpg	DSCF7282.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4af64d1f-dscf7282.jpg	content/2025-11-20/4af64d1f-dscf7282.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/13556356-thumb-dscf7282.jpg	IMAGE	image/jpeg	716537	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:30.915	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krz9600gx106u6kpsj2up	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ff7c755b-dscf7283.jpg	DSCF7283.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ff7c755b-dscf7283.jpg	content/2025-11-20/ff7c755b-dscf7283.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e4499c10-thumb-dscf7283.jpg	IMAGE	image/jpeg	720176	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:33.114	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krzfk00h1106utrb5rbf4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e41fa96a-dscf7284.jpg	DSCF7284.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e41fa96a-dscf7284.jpg	content/2025-11-20/e41fa96a-dscf7284.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/57bcbcf1-thumb-dscf7284.jpg	IMAGE	image/jpeg	707702	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:33.344	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7krzmw00h5106umr7of23m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/834af133-dscf7285.jpg	DSCF7285.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/834af133-dscf7285.jpg	content/2025-11-20/834af133-dscf7285.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8d57911e-thumb-dscf7285.jpg	IMAGE	image/jpeg	688047	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:33.608	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ks0rs00h9106uha1ji99k	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a39afeb0-dscf7286.jpg	DSCF7286.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a39afeb0-dscf7286.jpg	content/2025-11-20/a39afeb0-dscf7286.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2b1dce88-thumb-dscf7286.jpg	IMAGE	image/jpeg	686122	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:35.08	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ks60l00hd106uodyn8u7u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e33ce364-dscf7287.jpg	DSCF7287.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e33ce364-dscf7287.jpg	content/2025-11-20/e33ce364-dscf7287.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4a238df6-thumb-dscf7287.jpg	IMAGE	image/jpeg	675699	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:41.878	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ks6qo00hh106u942vov0j	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/249791ff-dscf7288.jpg	DSCF7288.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/249791ff-dscf7288.jpg	content/2025-11-20/249791ff-dscf7288.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/962a5a03-thumb-dscf7288.jpg	IMAGE	image/jpeg	722314	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:42.816	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ks72c00hl106u10uczfjv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0d934994-dscf7296.jpg	DSCF7296.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0d934994-dscf7296.jpg	content/2025-11-20/0d934994-dscf7296.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/96a77c4f-thumb-dscf7296.jpg	IMAGE	image/jpeg	916766	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:43.236	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ks73j00hp106u1olzavzt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f6a4796f-dscf7295.jpg	DSCF7295.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f6a4796f-dscf7295.jpg	content/2025-11-20/f6a4796f-dscf7295.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/eb2401b5-thumb-dscf7295.jpg	IMAGE	image/jpeg	908314	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:43.28	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksa5z00ht106ut68f3n78	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/65e444c1-dscf7297.jpg	DSCF7297.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/65e444c1-dscf7297.jpg	content/2025-11-20/65e444c1-dscf7297.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9949a083-thumb-dscf7297.jpg	IMAGE	image/jpeg	904286	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:47.255	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksckl00hx106u3lti0ty2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ae91dd74-dscf7299.jpg	DSCF7299.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ae91dd74-dscf7299.jpg	content/2025-11-20/ae91dd74-dscf7299.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c8448b39-thumb-dscf7299.jpg	IMAGE	image/jpeg	910686	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:50.372	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksdlr00i1106uveai9w7a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19496218-dscf7300.jpg	DSCF7300.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19496218-dscf7300.jpg	content/2025-11-20/19496218-dscf7300.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3dfd0bb3-thumb-dscf7300.jpg	IMAGE	image/jpeg	922086	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:51.711	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kseir00i5106u6d1e9hyb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/31c2aed9-dscf7298.jpg	DSCF7298.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/31c2aed9-dscf7298.jpg	content/2025-11-20/31c2aed9-dscf7298.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b4508794-thumb-dscf7298.jpg	IMAGE	image/jpeg	908731	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:52.899	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksens00i9106uy933n95q	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c36a9384-dscf7306.jpg	DSCF7306.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c36a9384-dscf7306.jpg	content/2025-11-20/c36a9384-dscf7306.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/946b0cea-thumb-dscf7306.jpg	IMAGE	image/jpeg	790153	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:53.08	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksgy300id106uuqa795jn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c08f697e-dscf7308.jpg	DSCF7308.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c08f697e-dscf7308.jpg	content/2025-11-20/c08f697e-dscf7308.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/07e27038-thumb-dscf7308.jpg	IMAGE	image/jpeg	784876	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:56.043	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksi0x00ih106u5bx9dbqm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/772213e0-dscf7307.jpg	DSCF7307.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/772213e0-dscf7307.jpg	content/2025-11-20/772213e0-dscf7307.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/346f2e27-thumb-dscf7307.jpg	IMAGE	image/jpeg	783478	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:57.441	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksjua00il106u7xk4d9dw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5bc6bdf2-dscf7310.jpg	DSCF7310.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5bc6bdf2-dscf7310.jpg	content/2025-11-20/5bc6bdf2-dscf7310.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/97b2c0d3-thumb-dscf7310.jpg	IMAGE	image/jpeg	720133	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:17:59.794	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksl7900ip106u8uiebcdk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d4f79378-dscf7309.jpg	DSCF7309.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d4f79378-dscf7309.jpg	content/2025-11-20/d4f79378-dscf7309.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1f4fc2a9-thumb-dscf7309.jpg	IMAGE	image/jpeg	794794	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:01.557	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kslf600it106unhssajee	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/47443728-dscf7311.jpg	DSCF7311.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/47443728-dscf7311.jpg	content/2025-11-20/47443728-dscf7311.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/95880a5f-thumb-dscf7311.jpg	IMAGE	image/jpeg	811260	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:01.842	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksogr00j1106u9smzx6mt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f24d996-dscf7313.jpg	DSCF7313.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f24d996-dscf7313.jpg	content/2025-11-20/3f24d996-dscf7313.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4eb0e7c3-thumb-dscf7313.jpg	IMAGE	image/jpeg	831532	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:05.787	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksslr00j5106utsbnnyjb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/712f67e2-dscf7319.jpg	DSCF7319.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/712f67e2-dscf7319.jpg	content/2025-11-20/712f67e2-dscf7319.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0eee21f2-thumb-dscf7319.jpg	IMAGE	image/jpeg	841235	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:11.151	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksstb00j9106u0440jnlm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c869929d-dscf7318.jpg	DSCF7318.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c869929d-dscf7318.jpg	content/2025-11-20/c869929d-dscf7318.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/343f9186-thumb-dscf7318.jpg	IMAGE	image/jpeg	827482	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:11.423	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kst8q00jd106ubhg56hin	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19304adf-dscf7321.jpg	DSCF7321.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19304adf-dscf7321.jpg	content/2025-11-20/19304adf-dscf7321.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cec24824-thumb-dscf7321.jpg	IMAGE	image/jpeg	890076	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:11.978	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ksu5j00jh106u1vjv0xru	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/148ca7c3-dscf7322.jpg	DSCF7322.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/148ca7c3-dscf7322.jpg	content/2025-11-20/148ca7c3-dscf7322.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9ef68727-thumb-dscf7322.jpg	IMAGE	image/jpeg	874975	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:13.159	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktgbx00jl106uoi792qiz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c6aae62d-dscf7335.jpg	DSCF7335.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c6aae62d-dscf7335.jpg	content/2025-11-20/c6aae62d-dscf7335.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c7b9f2dd-thumb-dscf7335.jpg	IMAGE	image/jpeg	865804	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:41.901	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kth3700jp106u2gm499ch	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fa529d3c-dscf7333.jpg	DSCF7333.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fa529d3c-dscf7333.jpg	content/2025-11-20/fa529d3c-dscf7333.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0183a276-thumb-dscf7333.jpg	IMAGE	image/jpeg	866989	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:42.883	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kthgs00jt106u7ktapkl1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/16af8c1f-dscf7334.jpg	DSCF7334.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/16af8c1f-dscf7334.jpg	content/2025-11-20/16af8c1f-dscf7334.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e2a727b7-thumb-dscf7334.jpg	IMAGE	image/jpeg	848528	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:43.371	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kthpg00jx106uo0wib2ib	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c2ecbd87-dscf7336.jpg	DSCF7336.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c2ecbd87-dscf7336.jpg	content/2025-11-20/c2ecbd87-dscf7336.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/721d4b31-thumb-dscf7336.jpg	IMAGE	image/jpeg	788564	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:43.684	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktksx00k1106uy919reem	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7dc0c709-dscf7337.jpg	DSCF7337.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7dc0c709-dscf7337.jpg	content/2025-11-20/7dc0c709-dscf7337.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/90d20822-thumb-dscf7337.jpg	IMAGE	image/jpeg	820827	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:47.697	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktlvb00k5106uttyc2kd5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/26dea265-dscf7338.jpg	DSCF7338.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/26dea265-dscf7338.jpg	content/2025-11-20/26dea265-dscf7338.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/66b0d921-thumb-dscf7338.jpg	IMAGE	image/jpeg	864110	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:49.079	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktndj00k9106ubrzli381	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/786973a8-dscf7339.jpg	DSCF7339.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/786973a8-dscf7339.jpg	content/2025-11-20/786973a8-dscf7339.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/347f5fbe-thumb-dscf7339.jpg	IMAGE	image/jpeg	825405	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:51.032	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktnjg00kd106uitc2y58g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0e267bb0-dscf7340.jpg	DSCF7340.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0e267bb0-dscf7340.jpg	content/2025-11-20/0e267bb0-dscf7340.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8b06c731-thumb-dscf7340.jpg	IMAGE	image/jpeg	839543	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:51.245	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kto6600kh106uzuqsdtvo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c6db9b3a-dscf7341.jpg	DSCF7341.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c6db9b3a-dscf7341.jpg	content/2025-11-20/c6db9b3a-dscf7341.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7ce78dd5-thumb-dscf7341.jpg	IMAGE	image/jpeg	835440	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:52.062	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktp9200kl106usinqv3ca	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/64e04c8d-dscf7342.jpg	DSCF7342.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/64e04c8d-dscf7342.jpg	content/2025-11-20/64e04c8d-dscf7342.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/19292c5b-thumb-dscf7342.jpg	IMAGE	image/jpeg	797874	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:53.462	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktrip00kp106u3hym9je3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d5ce2068-dscf7343.jpg	DSCF7343.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d5ce2068-dscf7343.jpg	content/2025-11-20/d5ce2068-dscf7343.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fd3a2c39-thumb-dscf7343.jpg	IMAGE	image/jpeg	818332	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:18:56.401	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktv4a00kt106u0jjgvt8v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b0a49db0-dscf7344.jpg	DSCF7344.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b0a49db0-dscf7344.jpg	content/2025-11-20/b0a49db0-dscf7344.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/db45aba3-thumb-dscf7344.jpg	IMAGE	image/jpeg	850151	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:01.066	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktw4e00kx106upqx9cl4h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/69e3021e-dscf7345.jpg	DSCF7345.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/69e3021e-dscf7345.jpg	content/2025-11-20/69e3021e-dscf7345.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/055bec31-thumb-dscf7345.jpg	IMAGE	image/jpeg	858867	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:02.366	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktyr300l1106u0zlwi09u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/54b9880d-dscf7346.jpg	DSCF7346.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/54b9880d-dscf7346.jpg	content/2025-11-20/54b9880d-dscf7346.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d4c589f5-thumb-dscf7346.jpg	IMAGE	image/jpeg	804433	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:05.775	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktyv400l5106u18bajpy9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/550b450e-dscf7347.jpg	DSCF7347.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/550b450e-dscf7347.jpg	content/2025-11-20/550b450e-dscf7347.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/79d8c5dd-thumb-dscf7347.jpg	IMAGE	image/jpeg	699642	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:05.921	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktztt00l9106uuqoeos6i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7b422eca-dscf7349.jpg	DSCF7349.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7b422eca-dscf7349.jpg	content/2025-11-20/7b422eca-dscf7349.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ea035b1d-thumb-dscf7349.jpg	IMAGE	image/jpeg	791246	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:07.169	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ktzty00lb106uiw388iin	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/403841fe-dscf7348.jpg	DSCF7348.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/403841fe-dscf7348.jpg	content/2025-11-20/403841fe-dscf7348.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ca634383-thumb-dscf7348.jpg	IMAGE	image/jpeg	810294	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:07.174	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ku3lx00ll106uikz7omg7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6d1c3c2e-dscf7351.jpg	DSCF7351.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6d1c3c2e-dscf7351.jpg	content/2025-11-20/6d1c3c2e-dscf7351.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3e047a89-thumb-dscf7351.jpg	IMAGE	image/jpeg	823002	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:12.069	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ku4k200lp106uzwcy1gq5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/94f496ff-dscf7356.jpg	DSCF7356.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/94f496ff-dscf7356.jpg	content/2025-11-20/94f496ff-dscf7356.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9c47167a-thumb-dscf7356.jpg	IMAGE	image/jpeg	715337	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:13.298	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ku5c300lt106uvunwaepe	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/256813dc-dscf7358.jpg	DSCF7358.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/256813dc-dscf7358.jpg	content/2025-11-20/256813dc-dscf7358.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ba236002-thumb-dscf7358.jpg	IMAGE	image/jpeg	720049	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:14.306	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ku5cy00lx106ujg9l5xum	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b4959c17-dscf7357.jpg	DSCF7357.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b4959c17-dscf7357.jpg	content/2025-11-20/b4959c17-dscf7357.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8b1e2887-thumb-dscf7357.jpg	IMAGE	image/jpeg	714619	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:14.337	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ku8qa00m1106ukspwshw0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a10cf95e-dscf7359.jpg	DSCF7359.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a10cf95e-dscf7359.jpg	content/2025-11-20/a10cf95e-dscf7359.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/88c37413-thumb-dscf7359.jpg	IMAGE	image/jpeg	763723	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:18.705	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ku9eu00m5106uscaa3xvo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c914c808-dscf7360.jpg	DSCF7360.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c914c808-dscf7360.jpg	content/2025-11-20/c914c808-dscf7360.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c9808c04-thumb-dscf7360.jpg	IMAGE	image/jpeg	773594	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:19.59	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kua1c00m9106uyphlugbp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f765b749-dscf7361.jpg	DSCF7361.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f765b749-dscf7361.jpg	content/2025-11-20/f765b749-dscf7361.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2b6e90ed-thumb-dscf7361.jpg	IMAGE	image/jpeg	607662	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:20.4	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kub7j00md106u2oe5gcb8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ece1d0a4-dscf7362.jpg	DSCF7362.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ece1d0a4-dscf7362.jpg	content/2025-11-20/ece1d0a4-dscf7362.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4b3d7fb4-thumb-dscf7362.jpg	IMAGE	image/jpeg	653809	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:21.919	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kudc300mh106ub55fwjyw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/88ceb014-dscf7364.jpg	DSCF7364.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/88ceb014-dscf7364.jpg	content/2025-11-20/88ceb014-dscf7364.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d0cea114-thumb-dscf7364.jpg	IMAGE	image/jpeg	638574	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:24.675	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuejy00ml106u95h20lmv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/61440bad-dscf7365.jpg	DSCF7365.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/61440bad-dscf7365.jpg	content/2025-11-20/61440bad-dscf7365.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cef4f030-thumb-dscf7365.jpg	IMAGE	image/jpeg	670598	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:26.254	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuf8400mp106udqjf5tmq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/688aa497-dscf7366.jpg	DSCF7366.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/688aa497-dscf7366.jpg	content/2025-11-20/688aa497-dscf7366.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f9588d57-thumb-dscf7366.jpg	IMAGE	image/jpeg	659541	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:27.124	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuf9m00mt106u6an25q05	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c4b018fb-dscf7363.jpg	DSCF7363.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c4b018fb-dscf7363.jpg	content/2025-11-20/c4b018fb-dscf7363.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/da4e4efc-thumb-dscf7363.jpg	IMAGE	image/jpeg	673906	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:27.178	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kumw200mx106uuke2bxna	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f192563-dscf7367.jpg	DSCF7367.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f192563-dscf7367.jpg	content/2025-11-20/3f192563-dscf7367.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6da2e317-thumb-dscf7367.jpg	IMAGE	image/jpeg	624408	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:37.058	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuoov00n1106u7q819pr7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b38346b4-dscf7368.jpg	DSCF7368.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b38346b4-dscf7368.jpg	content/2025-11-20/b38346b4-dscf7368.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8c1dddb1-thumb-dscf7368.jpg	IMAGE	image/jpeg	671699	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:39.39	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kupda00n5106ua6pdaudd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2546109e-dscf7369.jpg	DSCF7369.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2546109e-dscf7369.jpg	content/2025-11-20/2546109e-dscf7369.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7632894c-thumb-dscf7369.jpg	IMAGE	image/jpeg	671350	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:40.27	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kupds00n9106uznp964n9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9d52932a-dscf7371.jpg	DSCF7371.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9d52932a-dscf7371.jpg	content/2025-11-20/9d52932a-dscf7371.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7fc063d3-thumb-dscf7371.jpg	IMAGE	image/jpeg	674802	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:40.287	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kurgu00nd106udizd3ojn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9c969817-dscf7374.jpg	DSCF7374.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9c969817-dscf7374.jpg	content/2025-11-20/9c969817-dscf7374.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bebd0710-thumb-dscf7374.jpg	IMAGE	image/jpeg	675250	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:42.99	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kurkd00nh106u675brblp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/847e543a-dscf7375.jpg	DSCF7375.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/847e543a-dscf7375.jpg	content/2025-11-20/847e543a-dscf7375.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fdda9218-thumb-dscf7375.jpg	IMAGE	image/jpeg	683933	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:43.118	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuroi00nl106u89385jia	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/00e9faf2-dscf7373.jpg	DSCF7373.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/00e9faf2-dscf7373.jpg	content/2025-11-20/00e9faf2-dscf7373.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8ce96bf0-thumb-dscf7373.jpg	IMAGE	image/jpeg	690796	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:43.266	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kurxd00np106ua1c9hy9d	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/20821db2-dscf7376.jpg	DSCF7376.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/20821db2-dscf7376.jpg	content/2025-11-20/20821db2-dscf7376.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/04c02492-thumb-dscf7376.jpg	IMAGE	image/jpeg	681371	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:43.585	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuwv200nt106u41hc764z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2248854d-dscf7377.jpg	DSCF7377.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2248854d-dscf7377.jpg	content/2025-11-20/2248854d-dscf7377.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c5d29b6d-thumb-dscf7377.jpg	IMAGE	image/jpeg	678077	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:49.983	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuz8300nx106ufa7m47tl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7288712b-dscf7383.jpg	DSCF7383.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7288712b-dscf7383.jpg	content/2025-11-20/7288712b-dscf7383.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c4fa16fe-thumb-dscf7383.jpg	IMAGE	image/jpeg	644335	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:53.043	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuzb800o1106umyzwr9pg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/04efbf29-dscf7381.jpg	DSCF7381.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/04efbf29-dscf7381.jpg	content/2025-11-20/04efbf29-dscf7381.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/62092a25-thumb-dscf7381.jpg	IMAGE	image/jpeg	626874	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:53.156	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuzed00o5106uqx0k0cf2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ad20bab8-dscf7382.jpg	DSCF7382.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ad20bab8-dscf7382.jpg	content/2025-11-20/ad20bab8-dscf7382.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ee1b1083-thumb-dscf7382.jpg	IMAGE	image/jpeg	644508	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:53.269	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kuzpf00o9106u6od9v77u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/38b22ba7-dscf7384.jpg	DSCF7384.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/38b22ba7-dscf7384.jpg	content/2025-11-20/38b22ba7-dscf7384.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/808ee33a-thumb-dscf7384.jpg	IMAGE	image/jpeg	644350	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:19:53.667	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kv6au00od106u6id4mfgt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/adbfbe67-dscf7385.jpg	DSCF7385.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/adbfbe67-dscf7385.jpg	content/2025-11-20/adbfbe67-dscf7385.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2aa5e152-thumb-dscf7385.jpg	IMAGE	image/jpeg	644674	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:02.214	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kv6xm00ol106uwdf6chbo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6fda4ce4-dscf7387.jpg	DSCF7387.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6fda4ce4-dscf7387.jpg	content/2025-11-20/6fda4ce4-dscf7387.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/84879dde-thumb-dscf7387.jpg	IMAGE	image/jpeg	643253	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:03.034	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvckw00ot106uy75w2yuk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/904f2061-dscf7392.jpg	DSCF7392.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/904f2061-dscf7392.jpg	content/2025-11-20/904f2061-dscf7392.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c26448c1-thumb-dscf7392.jpg	IMAGE	image/jpeg	515408	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:10.352	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvft700p9106uukxo7379	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/362a4604-dscf7396.jpg	DSCF7396.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/362a4604-dscf7396.jpg	content/2025-11-20/362a4604-dscf7396.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a3458ec2-thumb-dscf7396.jpg	IMAGE	image/jpeg	537088	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:14.538	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvkw900pd106uvhjdc9gr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b5f18fca-dscf7400.jpg	DSCF7400.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b5f18fca-dscf7400.jpg	content/2025-11-20/b5f18fca-dscf7400.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5854b9aa-thumb-dscf7400.jpg	IMAGE	image/jpeg	537299	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:21.129	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwlbr00rd106u1a3th8gt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/18ae1570-dscf7427.jpg	DSCF7427.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/18ae1570-dscf7427.jpg	content/2025-11-20/18ae1570-dscf7427.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/473b5822-thumb-dscf7427.jpg	IMAGE	image/jpeg	417267	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:08.343	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwlle00rh106uyrlg8a47	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/55d1e32d-dscf7426.jpg	DSCF7426.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/55d1e32d-dscf7426.jpg	content/2025-11-20/55d1e32d-dscf7426.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2ca19009-thumb-dscf7426.jpg	IMAGE	image/jpeg	413373	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:08.69	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kv70h00op106udvlr56ol	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8d23fb80-dscf7386.jpg	DSCF7386.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8d23fb80-dscf7386.jpg	content/2025-11-20/8d23fb80-dscf7386.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/16d7b5cc-thumb-dscf7386.jpg	IMAGE	image/jpeg	634135	\N	\N	\N	\N	5851	3901	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:03.136	2025-11-23 09:31:31.803	cmi63yyr80005ejrm5rkshgro
cmi7kwmwr00rl106ucuys8ydb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8ffa84c9-dscf7428.jpg	DSCF7428.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8ffa84c9-dscf7428.jpg	content/2025-11-20/8ffa84c9-dscf7428.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/282f416a-thumb-dscf7428.jpg	IMAGE	image/jpeg	409998	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:10.395	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwp8600rp106u92a3ubea	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b5810bcb-dscf7429.jpg	DSCF7429.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b5810bcb-dscf7429.jpg	content/2025-11-20/b5810bcb-dscf7429.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/75d91e1c-thumb-dscf7429.jpg	IMAGE	image/jpeg	410876	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:13.398	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwqv700rt106ujqrb4fil	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c2e0f543-dscf7431.jpg	DSCF7431.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c2e0f543-dscf7431.jpg	content/2025-11-20/c2e0f543-dscf7431.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/635e2442-thumb-dscf7431.jpg	IMAGE	image/jpeg	432245	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:15.523	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwr1w00rx106u4qug0pzj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bf406d8d-dscf7430.jpg	DSCF7430.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bf406d8d-dscf7430.jpg	content/2025-11-20/bf406d8d-dscf7430.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9d5ee7dc-thumb-dscf7430.jpg	IMAGE	image/jpeg	432276	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:15.765	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwrwx00s1106uf12tzket	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4610122e-dscf7432.jpg	DSCF7432.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4610122e-dscf7432.jpg	content/2025-11-20/4610122e-dscf7432.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/72ee4d0b-thumb-dscf7432.jpg	IMAGE	image/jpeg	431520	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:16.881	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwuml00s5106up44mqa05	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/82c9ecbc-dscf7433.jpg	DSCF7433.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/82c9ecbc-dscf7433.jpg	content/2025-11-20/82c9ecbc-dscf7433.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/233e7b0e-thumb-dscf7433.jpg	IMAGE	image/jpeg	415382	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:20.397	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvkwc00pf106uppuhd9lw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8ac4116f-dscf7398.jpg	DSCF7398.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8ac4116f-dscf7398.jpg	content/2025-11-20/8ac4116f-dscf7398.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7a13dfcc-thumb-dscf7398.jpg	IMAGE	image/jpeg	660251	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:21.132	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvl5j00pl106u8aa1k396	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/17347536-dscf7397.jpg	DSCF7397.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/17347536-dscf7397.jpg	content/2025-11-20/17347536-dscf7397.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f1e18a4d-thumb-dscf7397.jpg	IMAGE	image/jpeg	534504	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:21.462	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvlml00pp106uqfb76szy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2e11b2cf-dscf7399.jpg	DSCF7399.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2e11b2cf-dscf7399.jpg	content/2025-11-20/2e11b2cf-dscf7399.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/28c31a74-thumb-dscf7399.jpg	IMAGE	image/jpeg	653398	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:22.077	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvs6o00pt106u4zvh0d16	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/897ce90c-dscf7401.jpg	DSCF7401.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/897ce90c-dscf7401.jpg	content/2025-11-20/897ce90c-dscf7401.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bcba8e21-thumb-dscf7401.jpg	IMAGE	image/jpeg	544631	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:30.576	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvt7u00px106uk7x2bykh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/215ae8f2-dscf7405.jpg	DSCF7405.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/215ae8f2-dscf7405.jpg	content/2025-11-20/215ae8f2-dscf7405.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9372f405-thumb-dscf7405.jpg	IMAGE	image/jpeg	601556	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:31.914	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvtiu00q1106uen4ekwlc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/92c7bc7b-dscf7404.jpg	DSCF7404.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/92c7bc7b-dscf7404.jpg	content/2025-11-20/92c7bc7b-dscf7404.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0fc42ea8-thumb-dscf7404.jpg	IMAGE	image/jpeg	731742	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:32.31	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvtj300q5106ufet5inn2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c535e6b5-dscf7403.jpg	DSCF7403.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c535e6b5-dscf7403.jpg	content/2025-11-20/c535e6b5-dscf7403.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9d4a278c-thumb-dscf7403.jpg	IMAGE	image/jpeg	647408	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:32.32	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kvzgc00q9106ufvfxvhmz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/048a0b96-dscf7406.jpg	DSCF7406.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/048a0b96-dscf7406.jpg	content/2025-11-20/048a0b96-dscf7406.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/52d0ba44-thumb-dscf7406.jpg	IMAGE	image/jpeg	542788	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:39.996	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kw1ck00qd106u89d1ulgy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/13c398ac-dscf7408.jpg	DSCF7408.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/13c398ac-dscf7408.jpg	content/2025-11-20/13c398ac-dscf7408.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3eb402dc-thumb-dscf7408.jpg	IMAGE	image/jpeg	553861	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:42.452	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kw1jh00qh106u0pgfjbiz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5e579233-dscf7409.jpg	DSCF7409.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5e579233-dscf7409.jpg	content/2025-11-20/5e579233-dscf7409.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3a1d06f5-thumb-dscf7409.jpg	IMAGE	image/jpeg	549884	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:42.7	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kw1ph00ql106ujq7yo0nt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c840bb35-dscf7407.jpg	DSCF7407.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c840bb35-dscf7407.jpg	content/2025-11-20/c840bb35-dscf7407.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5651e2c6-thumb-dscf7407.jpg	IMAGE	image/jpeg	551289	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:20:42.917	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwgh500qp106uo9w4wwol	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/45060b3a-dscf7422.jpg	DSCF7422.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/45060b3a-dscf7422.jpg	content/2025-11-20/45060b3a-dscf7422.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b2ed3885-thumb-dscf7422.jpg	IMAGE	image/jpeg	405932	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:02.058	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwgqx00qt106uzebegbfv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f38e458-dscf7421.jpg	DSCF7421.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f38e458-dscf7421.jpg	content/2025-11-20/3f38e458-dscf7421.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/38897761-thumb-dscf7421.jpg	IMAGE	image/jpeg	410017	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:02.409	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwhrp00qx106uyrmp0atm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d1d417e9-dscf7423.jpg	DSCF7423.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d1d417e9-dscf7423.jpg	content/2025-11-20/d1d417e9-dscf7423.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/170b996f-thumb-dscf7423.jpg	IMAGE	image/jpeg	417144	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:03.733	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwi9900r1106u29xm44bu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ffd8c353-dscf7417.jpg	DSCF7417.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ffd8c353-dscf7417.jpg	content/2025-11-20/ffd8c353-dscf7417.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5193f0ae-thumb-dscf7417.jpg	IMAGE	image/jpeg	773987	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:04.365	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwj9c00r5106utua1qwtr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ea9fb11f-dscf7424.jpg	DSCF7424.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ea9fb11f-dscf7424.jpg	content/2025-11-20/ea9fb11f-dscf7424.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/806731f9-thumb-dscf7424.jpg	IMAGE	image/jpeg	416879	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:05.664	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwkzm00r9106u18a0gjhe	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/13fb8a04-dscf7425.jpg	DSCF7425.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/13fb8a04-dscf7425.jpg	content/2025-11-20/13fb8a04-dscf7425.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dcdd2f74-thumb-dscf7425.jpg	IMAGE	image/jpeg	419937	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:07.906	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kww6b00s9106uwcwrc8v7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/01340aec-dscf7435.jpg	DSCF7435.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/01340aec-dscf7435.jpg	content/2025-11-20/01340aec-dscf7435.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f8c8a939-thumb-dscf7435.jpg	IMAGE	image/jpeg	411688	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:22.403	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwwat00sd106ub63yz35b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/756afc66-dscf7434.jpg	DSCF7434.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/756afc66-dscf7434.jpg	content/2025-11-20/756afc66-dscf7434.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9fa4342a-thumb-dscf7434.jpg	IMAGE	image/jpeg	408519	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:22.565	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwy6f00sh106uiktgkdll	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c75e7ec2-dscf7437.jpg	DSCF7437.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c75e7ec2-dscf7437.jpg	content/2025-11-20/c75e7ec2-dscf7437.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dd20e3fe-thumb-dscf7437.jpg	IMAGE	image/jpeg	435343	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:24.999	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kwy8200sl106uw8chwmbs	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5c95e8b7-dscf7436.jpg	DSCF7436.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5c95e8b7-dscf7436.jpg	content/2025-11-20/5c95e8b7-dscf7436.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/339cba55-thumb-dscf7436.jpg	IMAGE	image/jpeg	430112	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:25.059	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx3p900sp106ux3y0fhsr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/696e5a5d-dscf7439.jpg	DSCF7439.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/696e5a5d-dscf7439.jpg	content/2025-11-20/696e5a5d-dscf7439.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7153924d-thumb-dscf7439.jpg	IMAGE	image/jpeg	467922	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:32.158	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx4ob00sx106u1i2ets04	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/41b29859-dscf7441.jpg	DSCF7441.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/41b29859-dscf7441.jpg	content/2025-11-20/41b29859-dscf7441.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/13f6500d-thumb-dscf7441.jpg	IMAGE	image/jpeg	477772	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:33.419	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx5hq00t1106uwfvudp5d	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b7564596-dscf7440.jpg	DSCF7440.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b7564596-dscf7440.jpg	content/2025-11-20/b7564596-dscf7440.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4dfcc851-thumb-dscf7440.jpg	IMAGE	image/jpeg	474881	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:34.478	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx8bu00t5106u9ce51my9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3747fd42-dscf7442.jpg	DSCF7442.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3747fd42-dscf7442.jpg	content/2025-11-20/3747fd42-dscf7442.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/22a4b7b3-thumb-dscf7442.jpg	IMAGE	image/jpeg	459158	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:38.154	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx8fl00t9106upw6aa0em	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/42042af9-dscf7443.jpg	DSCF7443.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/42042af9-dscf7443.jpg	content/2025-11-20/42042af9-dscf7443.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0caf01ac-thumb-dscf7443.jpg	IMAGE	image/jpeg	447658	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:38.289	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx91n00td106u4vdyyy36	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/56be9a31-dscf7444.jpg	DSCF7444.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/56be9a31-dscf7444.jpg	content/2025-11-20/56be9a31-dscf7444.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/242664f7-thumb-dscf7444.jpg	IMAGE	image/jpeg	415992	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:39.082	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kx9jt00th106umqq5bras	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a6139b8c-dscf7445.jpg	DSCF7445.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a6139b8c-dscf7445.jpg	content/2025-11-20/a6139b8c-dscf7445.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/102bddba-thumb-dscf7445.jpg	IMAGE	image/jpeg	456443	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:39.737	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxccq00tl106u0lwz998g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/38708ec7-dscf7446.jpg	DSCF7446.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/38708ec7-dscf7446.jpg	content/2025-11-20/38708ec7-dscf7446.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8cb557d6-thumb-dscf7446.jpg	IMAGE	image/jpeg	441606	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:43.37	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxdut00tp106uxrd0o7ze	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7a09e177-dscf7449.jpg	DSCF7449.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7a09e177-dscf7449.jpg	content/2025-11-20/7a09e177-dscf7449.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7f5cfec1-thumb-dscf7449.jpg	IMAGE	image/jpeg	430768	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:45.317	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxeaa00tt106uqdlpctsa	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9459dac3-dscf7447.jpg	DSCF7447.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9459dac3-dscf7447.jpg	content/2025-11-20/9459dac3-dscf7447.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/26e2ba98-thumb-dscf7447.jpg	IMAGE	image/jpeg	444291	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:45.874	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxfgu00tx106u32q5kjmv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4174ae93-dscf7448.jpg	DSCF7448.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4174ae93-dscf7448.jpg	content/2025-11-20/4174ae93-dscf7448.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9a1e6f62-thumb-dscf7448.jpg	IMAGE	image/jpeg	430972	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:47.406	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxfmm00u1106urenxkm07	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f2377968-dscf7450.jpg	DSCF7450.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f2377968-dscf7450.jpg	content/2025-11-20/f2377968-dscf7450.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2af4393b-thumb-dscf7450.jpg	IMAGE	image/jpeg	425347	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:47.614	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxha900u5106uqgn6ypom	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/697fb289-dscf7451.jpg	DSCF7451.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/697fb289-dscf7451.jpg	content/2025-11-20/697fb289-dscf7451.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3300a5b9-thumb-dscf7451.jpg	IMAGE	image/jpeg	412036	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:49.762	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxk8500ud106ukp8ykyl3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dddcd9c0-dscf7453.jpg	DSCF7453.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dddcd9c0-dscf7453.jpg	content/2025-11-20/dddcd9c0-dscf7453.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d0c93f19-thumb-dscf7453.jpg	IMAGE	image/jpeg	416339	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:53.573	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxkac00uh106ude431m5n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a86d98d8-dscf7454.jpg	DSCF7454.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a86d98d8-dscf7454.jpg	content/2025-11-20/a86d98d8-dscf7454.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b3351f80-thumb-dscf7454.jpg	IMAGE	image/jpeg	401136	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:53.652	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxkx700ul106u8fw5za4w	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3c8526c4-dscf7455.jpg	DSCF7455.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3c8526c4-dscf7455.jpg	content/2025-11-20/3c8526c4-dscf7455.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5683d346-thumb-dscf7455.jpg	IMAGE	image/jpeg	403575	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:54.476	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxlvu00up106upquraz34	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6795b67c-dscf7456.jpg	DSCF7456.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6795b67c-dscf7456.jpg	content/2025-11-20/6795b67c-dscf7456.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f04c1f11-thumb-dscf7456.jpg	IMAGE	image/jpeg	403135	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:55.722	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxnzb00ut106uzfyi13n2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9d7ccf21-dscf7459.jpg	DSCF7459.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9d7ccf21-dscf7459.jpg	content/2025-11-20/9d7ccf21-dscf7459.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e8f37aed-thumb-dscf7459.jpg	IMAGE	image/jpeg	398757	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:58.44	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxo7k00ux106un4icoop6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ef2b42fc-dscf7458.jpg	DSCF7458.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ef2b42fc-dscf7458.jpg	content/2025-11-20/ef2b42fc-dscf7458.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/75ab1fa8-thumb-dscf7458.jpg	IMAGE	image/jpeg	430625	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:58.735	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxp5100v1106ubjw7e9rt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/05754c2f-dscf7461.jpg	DSCF7461.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/05754c2f-dscf7461.jpg	content/2025-11-20/05754c2f-dscf7461.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cb1829ec-thumb-dscf7461.jpg	IMAGE	image/jpeg	404534	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:21:59.94	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxquo00v5106un0w60hgg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cde50a38-dscf7463.jpg	DSCF7463.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cde50a38-dscf7463.jpg	content/2025-11-20/cde50a38-dscf7463.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7f30709a-thumb-dscf7463.jpg	IMAGE	image/jpeg	404891	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:02.16	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxqxi00v9106undchfvwu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f036de4-dscf7464.jpg	DSCF7464.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f036de4-dscf7464.jpg	content/2025-11-20/3f036de4-dscf7464.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c15ac073-thumb-dscf7464.jpg	IMAGE	image/jpeg	404256	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:02.262	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxsp300vd106u8vui5zjj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a8658bdd-dscf7465.jpg	DSCF7465.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a8658bdd-dscf7465.jpg	content/2025-11-20/a8658bdd-dscf7465.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/69ba874a-thumb-dscf7465.jpg	IMAGE	image/jpeg	397020	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:04.551	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxu7300vh106u4sga58q8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e4030f77-dscf7467.jpg	DSCF7467.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e4030f77-dscf7467.jpg	content/2025-11-20/e4030f77-dscf7467.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b83e5d61-thumb-dscf7467.jpg	IMAGE	image/jpeg	398133	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:06.495	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxu8w00vl106uq8wb2y3j	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c6ea6511-dscf7466.jpg	DSCF7466.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c6ea6511-dscf7466.jpg	content/2025-11-20/c6ea6511-dscf7466.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ba1f9f42-thumb-dscf7466.jpg	IMAGE	image/jpeg	398189	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:06.56	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxv5i00vp106udtwba7lp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/11352bd6-dscf7460.jpg	DSCF7460.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/11352bd6-dscf7460.jpg	content/2025-11-20/11352bd6-dscf7460.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4b81f2a4-thumb-dscf7460.jpg	IMAGE	image/jpeg	401091	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:07.734	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxy4a00vx106uggs4h2ue	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/708ceb27-dscf7472.jpg	DSCF7472.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/708ceb27-dscf7472.jpg	content/2025-11-20/708ceb27-dscf7472.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0806971a-thumb-dscf7472.jpg	IMAGE	image/jpeg	425429	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:11.577	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kxy7a00w1106uwiqa2tq9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/efc6d785-dscf7468.jpg	DSCF7468.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/efc6d785-dscf7468.jpg	content/2025-11-20/efc6d785-dscf7468.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b4ec10d9-thumb-dscf7468.jpg	IMAGE	image/jpeg	395184	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:11.685	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky05400w5106upuselm6o	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c1c26db2-dscf7471.jpg	DSCF7471.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c1c26db2-dscf7471.jpg	content/2025-11-20/c1c26db2-dscf7471.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1ec2470d-thumb-dscf7471.jpg	IMAGE	image/jpeg	416801	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:14.2	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky0kw00w9106ufyqylb84	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8ea0c7ec-dscf7473.jpg	DSCF7473.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8ea0c7ec-dscf7473.jpg	content/2025-11-20/8ea0c7ec-dscf7473.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/144b51ec-thumb-dscf7473.jpg	IMAGE	image/jpeg	415962	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:14.768	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky21q00wd106uyj0d9ihu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9514c482-dscf7475.jpg	DSCF7475.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9514c482-dscf7475.jpg	content/2025-11-20/9514c482-dscf7475.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/efe33d78-thumb-dscf7475.jpg	IMAGE	image/jpeg	414237	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:16.67	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky4z900wl106uy7ozg7zo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ab94885a-dscf7476.jpg	DSCF7476.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ab94885a-dscf7476.jpg	content/2025-11-20/ab94885a-dscf7476.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/35e322e1-thumb-dscf7476.jpg	IMAGE	image/jpeg	396540	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:20.469	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky55600wp106ukyri1ig9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5ee2c7ef-dscf7477.jpg	DSCF7477.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5ee2c7ef-dscf7477.jpg	content/2025-11-20/5ee2c7ef-dscf7477.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b7f20c84-thumb-dscf7477.jpg	IMAGE	image/jpeg	403252	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:20.682	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky5vj00wt106ucquitbuz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/db79beb9-dscf7483.jpg	DSCF7483.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/db79beb9-dscf7483.jpg	content/2025-11-20/db79beb9-dscf7483.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c8f7e5fc-thumb-dscf7483.jpg	IMAGE	image/jpeg	413616	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:21.631	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky6a900wx106uahjwzhnu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6bb44708-dscf7484.jpg	DSCF7484.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6bb44708-dscf7484.jpg	content/2025-11-20/6bb44708-dscf7484.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f5bc7b04-thumb-dscf7484.jpg	IMAGE	image/jpeg	425571	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:22.161	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky88h00x1106uatjaldlx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f5d9e7d5-dscf7486.jpg	DSCF7486.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f5d9e7d5-dscf7486.jpg	content/2025-11-20/f5d9e7d5-dscf7486.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c473e015-thumb-dscf7486.jpg	IMAGE	image/jpeg	416537	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:24.689	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky8tb00x5106upb8eoj9a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7e9fa161-dscf7487.jpg	DSCF7487.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7e9fa161-dscf7487.jpg	content/2025-11-20/7e9fa161-dscf7487.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c8c463c0-thumb-dscf7487.jpg	IMAGE	image/jpeg	416295	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:25.439	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky9wg00x9106u0j0on7rl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/456a2b79-dscf7488.jpg	DSCF7488.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/456a2b79-dscf7488.jpg	content/2025-11-20/456a2b79-dscf7488.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1dac7688-thumb-dscf7488.jpg	IMAGE	image/jpeg	420403	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:26.848	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ky9y700xd106u7eu0w728	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bb1302c6-dscf7489.jpg	DSCF7489.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bb1302c6-dscf7489.jpg	content/2025-11-20/bb1302c6-dscf7489.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fbeaa9b7-thumb-dscf7489.jpg	IMAGE	image/jpeg	424253	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:26.911	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kycjn00xh106ub11383ub	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/aa4a1e9e-dscf7490.jpg	DSCF7490.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/aa4a1e9e-dscf7490.jpg	content/2025-11-20/aa4a1e9e-dscf7490.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6f1704a6-thumb-dscf7490.jpg	IMAGE	image/jpeg	492354	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:30.274	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyd2500xl106u26tk0tp6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ca683bec-dscf7491.jpg	DSCF7491.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ca683bec-dscf7491.jpg	content/2025-11-20/ca683bec-dscf7491.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e2e9817d-thumb-dscf7491.jpg	IMAGE	image/jpeg	443427	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:30.942	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyeee00xt106u0rrvzhst	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/baee4a2a-dscf7493.jpg	DSCF7493.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/baee4a2a-dscf7493.jpg	content/2025-11-20/baee4a2a-dscf7493.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9cda6781-thumb-dscf7493.jpg	IMAGE	image/jpeg	476592	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:32.676	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyggf00xx106u7i7gzp7n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0738a9d7-dscf7494.jpg	DSCF7494.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0738a9d7-dscf7494.jpg	content/2025-11-20/0738a9d7-dscf7494.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b931ce45-thumb-dscf7494.jpg	IMAGE	image/jpeg	502300	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:35.344	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyd4v00xp106unsvlbire	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3d7c2605-dscf7492.jpg	DSCF7492.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3d7c2605-dscf7492.jpg	content/2025-11-20/3d7c2605-dscf7492.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/51328be7-thumb-dscf7492.jpg	IMAGE	image/jpeg	479360	\N	\N	\N	\N	3837	5755	DRAFT	5	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:31.038	2025-11-23 12:52:19.369	cmi63yyr80005ejrm5rkshgro
cmi7kyhs500y5106u9h138lw0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ec91bcae-dscf7495.jpg	DSCF7495.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ec91bcae-dscf7495.jpg	content/2025-11-20/ec91bcae-dscf7495.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/71e93600-thumb-dscf7495.jpg	IMAGE	image/jpeg	485535	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:37.061	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyhu700y9106u4ov4avta	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a59c8f86-dscf7498.jpg	DSCF7498.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a59c8f86-dscf7498.jpg	content/2025-11-20/a59c8f86-dscf7498.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/542b72d7-thumb-dscf7498.jpg	IMAGE	image/jpeg	429459	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:37.135	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyj6g00yd106uc81mhsnl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2b308772-dscf7499.jpg	DSCF7499.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2b308772-dscf7499.jpg	content/2025-11-20/2b308772-dscf7499.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8fbcf218-thumb-dscf7499.jpg	IMAGE	image/jpeg	419428	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:38.872	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyjyl00yh106u7rc8jq12	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3ff27fe5-dscf7500.jpg	DSCF7500.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3ff27fe5-dscf7500.jpg	content/2025-11-20/3ff27fe5-dscf7500.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/27b8288e-thumb-dscf7500.jpg	IMAGE	image/jpeg	425644	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:39.885	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kynvm00yl106u8f822tn8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3daaa612-dscf7503.jpg	DSCF7503.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3daaa612-dscf7503.jpg	content/2025-11-20/3daaa612-dscf7503.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0e74ff62-thumb-dscf7503.jpg	IMAGE	image/jpeg	443672	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:44.962	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyo7d00yp106uu0ag1rbq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/25dcc63a-dscf7502.jpg	DSCF7502.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/25dcc63a-dscf7502.jpg	content/2025-11-20/25dcc63a-dscf7502.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6997630f-thumb-dscf7502.jpg	IMAGE	image/jpeg	438172	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:45.385	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyopn00yt106uucpbxkr8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6daafd12-dscf7507.jpg	DSCF7507.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6daafd12-dscf7507.jpg	content/2025-11-20/6daafd12-dscf7507.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a2886743-thumb-dscf7507.jpg	IMAGE	image/jpeg	425050	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:46.043	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kypix00yx106uo3yw2t14	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0769f486-dscf7504.jpg	DSCF7504.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0769f486-dscf7504.jpg	content/2025-11-20/0769f486-dscf7504.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6e787e9b-thumb-dscf7504.jpg	IMAGE	image/jpeg	417458	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:47.097	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyt3100z5106u5rt7zpt6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e57b959b-dscf7508.jpg	DSCF7508.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e57b959b-dscf7508.jpg	content/2025-11-20/e57b959b-dscf7508.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f28c905f-thumb-dscf7508.jpg	IMAGE	image/jpeg	425283	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:51.709	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyt3u00z9106uo8d5zvx2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ac412260-dscf7514.jpg	DSCF7514.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ac412260-dscf7514.jpg	content/2025-11-20/ac412260-dscf7514.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/612cf889-thumb-dscf7514.jpg	IMAGE	image/jpeg	494769	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:51.739	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyv8j00zh106uattd1y7n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/adb04d4c-dscf7516.jpg	DSCF7516.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/adb04d4c-dscf7516.jpg	content/2025-11-20/adb04d4c-dscf7516.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/98e738fa-thumb-dscf7516.jpg	IMAGE	image/jpeg	502997	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:54.5	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyxwy00zl106uwtec26ov	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f45b7188-dscf7517.jpg	DSCF7517.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f45b7188-dscf7517.jpg	content/2025-11-20/f45b7188-dscf7517.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/00f3cef4-thumb-dscf7517.jpg	IMAGE	image/jpeg	487137	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:57.97	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyrqg00z1106u91bof1lp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9c1e402c-dscf7510.jpg	DSCF7510.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9c1e402c-dscf7510.jpg	content/2025-11-20/9c1e402c-dscf7510.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/095f3b29-thumb-dscf7510.jpg	IMAGE	image/jpeg	428930	\N	\N	\N	\N	4000	6000	DRAFT	5	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:49.96	2025-11-23 12:40:34.216	cmi63yyr80005ejrm5rkshgro
cmi7kytuc00zd106u58zhw67i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4b64d79c-dscf7515.jpg	DSCF7515.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4b64d79c-dscf7515.jpg	content/2025-11-20/4b64d79c-dscf7515.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7b09ad22-thumb-dscf7515.jpg	IMAGE	image/jpeg	503244	\N	\N	\N	\N	4000	6000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:52.692	2025-11-23 13:20:54.445	cmi63yyr80005ejrm5rkshgro
cmi7kyyeq00zp106u3yhovc3s	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d08c4369-dscf7518.jpg	DSCF7518.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d08c4369-dscf7518.jpg	content/2025-11-20/d08c4369-dscf7518.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4483fe3c-thumb-dscf7518.jpg	IMAGE	image/jpeg	486265	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:58.61	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyypn00zt106uz7wxh7zr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/efedeb20-dscf7520.jpg	DSCF7520.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/efedeb20-dscf7520.jpg	content/2025-11-20/efedeb20-dscf7520.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6f965ee7-thumb-dscf7520.jpg	IMAGE	image/jpeg	472365	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:59.003	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kyzbq00zx106u32yzeazt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/eec93c35-dscf7519.jpg	DSCF7519.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/eec93c35-dscf7519.jpg	content/2025-11-20/eec93c35-dscf7519.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/88a5d6b7-thumb-dscf7519.jpg	IMAGE	image/jpeg	472082	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:22:59.798	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz2m00105106uginc5la9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/99730312-dscf7522.jpg	DSCF7522.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/99730312-dscf7522.jpg	content/2025-11-20/99730312-dscf7522.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7d6a2052-thumb-dscf7522.jpg	IMAGE	image/jpeg	477855	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:04.056	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz2y50109106ueihxywfg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8e40bf19-dscf7523.jpg	DSCF7523.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8e40bf19-dscf7523.jpg	content/2025-11-20/8e40bf19-dscf7523.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4e971009-thumb-dscf7523.jpg	IMAGE	image/jpeg	489174	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:04.493	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz3l8010d106u6r8ii9bh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0ad2f4be-dscf7524.jpg	DSCF7524.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0ad2f4be-dscf7524.jpg	content/2025-11-20/0ad2f4be-dscf7524.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e83be2ab-thumb-dscf7524.jpg	IMAGE	image/jpeg	535416	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:05.325	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz49f010h106upu3bsdso	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7d47f6ac-dscf7525.jpg	DSCF7525.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7d47f6ac-dscf7525.jpg	content/2025-11-20/7d47f6ac-dscf7525.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/db6f875f-thumb-dscf7525.jpg	IMAGE	image/jpeg	502276	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:06.195	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz6rg010l106utjm8p8jt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4fdadbf9-dscf7526.jpg	DSCF7526.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4fdadbf9-dscf7526.jpg	content/2025-11-20/4fdadbf9-dscf7526.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1c8f99fc-thumb-dscf7526.jpg	IMAGE	image/jpeg	554226	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:09.436	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz7u7010p106ufpymmve0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c367068f-dscf7527.jpg	DSCF7527.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c367068f-dscf7527.jpg	content/2025-11-20/c367068f-dscf7527.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b81c8080-thumb-dscf7527.jpg	IMAGE	image/jpeg	541876	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:10.831	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz7x0010t106ua3ilujgq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/14003ebd-dscf7528.jpg	DSCF7528.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/14003ebd-dscf7528.jpg	content/2025-11-20/14003ebd-dscf7528.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bb7c602e-thumb-dscf7528.jpg	IMAGE	image/jpeg	500946	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:10.933	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kz821010x106un9zbtny9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fe759919-dscf7529.jpg	DSCF7529.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fe759919-dscf7529.jpg	content/2025-11-20/fe759919-dscf7529.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0b1abe5e-thumb-dscf7529.jpg	IMAGE	image/jpeg	592658	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:11.112	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzas60111106urqwdavao	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/15fcf905-dscf7530.jpg	DSCF7530.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/15fcf905-dscf7530.jpg	content/2025-11-20/15fcf905-dscf7530.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1f119407-thumb-dscf7530.jpg	IMAGE	image/jpeg	609611	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:14.646	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzc2l0115106uh99ddgs3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/020639a2-dscf7531.jpg	DSCF7531.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/020639a2-dscf7531.jpg	content/2025-11-20/020639a2-dscf7531.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/84cfe007-thumb-dscf7531.jpg	IMAGE	image/jpeg	595064	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:16.317	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzd5n0119106ufkarbv7l	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/55e98d0e-dscf7532.jpg	DSCF7532.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/55e98d0e-dscf7532.jpg	content/2025-11-20/55e98d0e-dscf7532.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/092614c0-thumb-dscf7532.jpg	IMAGE	image/jpeg	582827	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:17.722	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzd9i011d106uqcgniie0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8758f3cc-dscf7533.jpg	DSCF7533.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8758f3cc-dscf7533.jpg	content/2025-11-20/8758f3cc-dscf7533.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e6a1b9ce-thumb-dscf7533.jpg	IMAGE	image/jpeg	597435	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:17.862	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzeh3011h106u80azvlch	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3e7ee436-dscf7538.jpg	DSCF7538.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3e7ee436-dscf7538.jpg	content/2025-11-20/3e7ee436-dscf7538.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/04ba9c42-thumb-dscf7538.jpg	IMAGE	image/jpeg	503355	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:19.431	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzie2011l106u8gvrebqn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1e1c4206-dscf7540.jpg	DSCF7540.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1e1c4206-dscf7540.jpg	content/2025-11-20/1e1c4206-dscf7540.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bc12fb66-thumb-dscf7540.jpg	IMAGE	image/jpeg	516363	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:24.505	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzj7w011p106uapmvt8it	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a322ebf2-dscf7543.jpg	DSCF7543.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a322ebf2-dscf7543.jpg	content/2025-11-20/a322ebf2-dscf7543.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fbe06e5b-thumb-dscf7543.jpg	IMAGE	image/jpeg	480988	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:25.58	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzj9w011t106u73aaj4ts	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ff11d140-dscf7542.jpg	DSCF7542.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ff11d140-dscf7542.jpg	content/2025-11-20/ff11d140-dscf7542.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/88a5a984-thumb-dscf7542.jpg	IMAGE	image/jpeg	500202	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:25.653	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzjdw011x106ui4dc5o1m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19fc530d-dscf7541.jpg	DSCF7541.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19fc530d-dscf7541.jpg	content/2025-11-20/19fc530d-dscf7541.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f2c47c69-thumb-dscf7541.jpg	IMAGE	image/jpeg	501585	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:25.795	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzmn10121106uvvv54brl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bcf1ff67-dscf7544.jpg	DSCF7544.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bcf1ff67-dscf7544.jpg	content/2025-11-20/bcf1ff67-dscf7544.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/465c88fd-thumb-dscf7544.jpg	IMAGE	image/jpeg	507201	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:30.013	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzp6q0129106u0668q31u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a2b2491f-dscf7546.jpg	DSCF7546.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a2b2491f-dscf7546.jpg	content/2025-11-20/a2b2491f-dscf7546.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a35d5239-thumb-dscf7546.jpg	IMAGE	image/jpeg	504734	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:33.314	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzpf5012d106uwi04gu6f	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fdd8bd1a-dscf7547.jpg	DSCF7547.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fdd8bd1a-dscf7547.jpg	content/2025-11-20/fdd8bd1a-dscf7547.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6e65d7cb-thumb-dscf7547.jpg	IMAGE	image/jpeg	595485	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:33.618	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzqbe012h106ui4o4xe87	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/362441aa-dscf7548.jpg	DSCF7548.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/362441aa-dscf7548.jpg	content/2025-11-20/362441aa-dscf7548.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b4caf91b-thumb-dscf7548.jpg	IMAGE	image/jpeg	529037	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:34.777	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzudf012l106ub09wrp7c	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/78b7947a-dscf7549.jpg	DSCF7549.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/78b7947a-dscf7549.jpg	content/2025-11-20/78b7947a-dscf7549.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/267eaf0b-thumb-dscf7549.jpg	IMAGE	image/jpeg	599551	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:40.035	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzv85012p106uz8vmyejn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/810c93c5-dscf7550.jpg	DSCF7550.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/810c93c5-dscf7550.jpg	content/2025-11-20/810c93c5-dscf7550.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f975cc24-thumb-dscf7550.jpg	IMAGE	image/jpeg	670343	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:41.14	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzv9u012t106unmcuctci	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4038ba3b-dscf7552.jpg	DSCF7552.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4038ba3b-dscf7552.jpg	content/2025-11-20/4038ba3b-dscf7552.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2fd62b63-thumb-dscf7552.jpg	IMAGE	image/jpeg	646692	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:41.202	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzvwp012x106u8erh2ms1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dded88a1-dscf7551.jpg	DSCF7551.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dded88a1-dscf7551.jpg	content/2025-11-20/dded88a1-dscf7551.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/93013b7a-thumb-dscf7551.jpg	IMAGE	image/jpeg	694090	\N	\N	\N	\N	3815	5722	DRAFT	3	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:42.025	2025-11-24 13:46:53.304	cmi63yyr80005ejrm5rkshgro
cmi7kzxk00131106uziqv97a4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3267e992-dscf7553.jpg	DSCF7553.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3267e992-dscf7553.jpg	content/2025-11-20/3267e992-dscf7553.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f113c6b9-thumb-dscf7553.jpg	IMAGE	image/jpeg	566965	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:44.16	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7kzz600135106u8f20w4va	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/60295069-dscf7554.jpg	DSCF7554.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/60295069-dscf7554.jpg	content/2025-11-20/60295069-dscf7554.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/85070240-thumb-dscf7554.jpg	IMAGE	image/jpeg	488015	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:46.248	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0012013d106ua15gyn62	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a9908e45-dscf7556.jpg	DSCF7556.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a9908e45-dscf7556.jpg	content/2025-11-20/a9908e45-dscf7556.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5040f1e5-thumb-dscf7556.jpg	IMAGE	image/jpeg	592873	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:47.365	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l01if013h106uc4v0xvqb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5d31371d-dscf7557.jpg	DSCF7557.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5d31371d-dscf7557.jpg	content/2025-11-20/5d31371d-dscf7557.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d9927d7e-thumb-dscf7557.jpg	IMAGE	image/jpeg	624705	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:49.287	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l02i7013l106usxfjeod5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/70d3cc29-dscf7558.jpg	DSCF7558.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/70d3cc29-dscf7558.jpg	content/2025-11-20/70d3cc29-dscf7558.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cf1e3458-thumb-dscf7558.jpg	IMAGE	image/jpeg	553952	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:50.575	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l04tp013p106usqj3etem	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/00bf17fe-dscf7561.jpg	DSCF7561.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/00bf17fe-dscf7561.jpg	content/2025-11-20/00bf17fe-dscf7561.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e406de70-thumb-dscf7561.jpg	IMAGE	image/jpeg	548562	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:53.581	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l04yx013t106u9bf3iwln	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a95cb97e-dscf7559.jpg	DSCF7559.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a95cb97e-dscf7559.jpg	content/2025-11-20/a95cb97e-dscf7559.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/04615854-thumb-dscf7559.jpg	IMAGE	image/jpeg	622522	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:53.769	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l050p013x106uaq4yuin5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bebdbbab-dscf7560.jpg	DSCF7560.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bebdbbab-dscf7560.jpg	content/2025-11-20/bebdbbab-dscf7560.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3b30c070-thumb-dscf7560.jpg	IMAGE	image/jpeg	623253	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:53.833	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l06gc0141106uee17eqqs	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c7265b78-dscf7564.jpg	DSCF7564.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c7265b78-dscf7564.jpg	content/2025-11-20/c7265b78-dscf7564.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6dc89a2c-thumb-dscf7564.jpg	IMAGE	image/jpeg	494918	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:55.692	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l07xo0145106urkwkdcea	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cfe24a25-dscf7565.jpg	DSCF7565.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cfe24a25-dscf7565.jpg	content/2025-11-20/cfe24a25-dscf7565.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/82c3b7aa-thumb-dscf7565.jpg	IMAGE	image/jpeg	572378	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:57.612	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l08mh0149106urm8waion	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/23c4169c-dscf7567.jpg	DSCF7567.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/23c4169c-dscf7567.jpg	content/2025-11-20/23c4169c-dscf7567.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/66a4b2e0-thumb-dscf7567.jpg	IMAGE	image/jpeg	525563	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:58.504	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0988014d106u08g2kt9t	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f2c631db-dscf7566.jpg	DSCF7566.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f2c631db-dscf7566.jpg	content/2025-11-20/f2c631db-dscf7566.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/07be1f67-thumb-dscf7566.jpg	IMAGE	image/jpeg	562018	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:23:59.288	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0a0l014h106unsrqua6y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a1a05817-dscf7568.jpg	DSCF7568.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a1a05817-dscf7568.jpg	content/2025-11-20/a1a05817-dscf7568.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31b115ec-thumb-dscf7568.jpg	IMAGE	image/jpeg	626925	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:00.309	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0bvq014l106uaw0tuzve	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9092758b-dscf7570.jpg	DSCF7570.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9092758b-dscf7570.jpg	content/2025-11-20/9092758b-dscf7570.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/10d22c00-thumb-dscf7570.jpg	IMAGE	image/jpeg	632791	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:02.726	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0cai014p106u8ym6riv3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7c8edebe-dscf7569.jpg	DSCF7569.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7c8edebe-dscf7569.jpg	content/2025-11-20/7c8edebe-dscf7569.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/da3acd90-thumb-dscf7569.jpg	IMAGE	image/jpeg	667642	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:03.258	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0dl6014t106uq34k6c81	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19d498de-dscf7571.jpg	DSCF7571.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19d498de-dscf7571.jpg	content/2025-11-20/19d498de-dscf7571.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2fa5b155-thumb-dscf7571.jpg	IMAGE	image/jpeg	1128730	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:04.938	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0f3t014x106uw3lfejhf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/642ae54c-dscf7573.jpg	DSCF7573.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/642ae54c-dscf7573.jpg	content/2025-11-20/642ae54c-dscf7573.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4be12f60-thumb-dscf7573.jpg	IMAGE	image/jpeg	477372	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:06.904	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0fdw0151106ujcwyruhe	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cba03456-dscf7572.jpg	DSCF7572.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cba03456-dscf7572.jpg	content/2025-11-20/cba03456-dscf7572.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c6fd0091-thumb-dscf7572.jpg	IMAGE	image/jpeg	1110238	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:07.268	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0h0g0155106ue2gw9phv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/98a1c75e-dscf7575.jpg	DSCF7575.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/98a1c75e-dscf7575.jpg	content/2025-11-20/98a1c75e-dscf7575.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/790f7184-thumb-dscf7575.jpg	IMAGE	image/jpeg	579099	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:09.375	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0h3f0159106u0ckhwu80	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f1879e3d-dscf7574.jpg	DSCF7574.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f1879e3d-dscf7574.jpg	content/2025-11-20/f1879e3d-dscf7574.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bc9a8cfd-thumb-dscf7574.jpg	IMAGE	image/jpeg	442060	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:09.483	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0id0015d106u72dtdio3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2cf84b8d-dscf7576.jpg	DSCF7576.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2cf84b8d-dscf7576.jpg	content/2025-11-20/2cf84b8d-dscf7576.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9bc69249-thumb-dscf7576.jpg	IMAGE	image/jpeg	622809	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:11.124	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0ius015h106usz47slsu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/aae4d106-dscf7577.jpg	DSCF7577.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/aae4d106-dscf7577.jpg	content/2025-11-20/aae4d106-dscf7577.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c80c5f24-thumb-dscf7577.jpg	IMAGE	image/jpeg	646778	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:11.762	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0kq2015l106u5rtgjusv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d326162c-dscf7578.jpg	DSCF7578.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d326162c-dscf7578.jpg	content/2025-11-20/d326162c-dscf7578.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/76d7c9e2-thumb-dscf7578.jpg	IMAGE	image/jpeg	603816	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:14.186	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0mip015p106urjdxj6os	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5ebebe0b-dscf7579.jpg	DSCF7579.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5ebebe0b-dscf7579.jpg	content/2025-11-20/5ebebe0b-dscf7579.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3bbd6536-thumb-dscf7579.jpg	IMAGE	image/jpeg	700618	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:16.513	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0na3015t106u0cvjgccw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2244f691-dscf7581.jpg	DSCF7581.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2244f691-dscf7581.jpg	content/2025-11-20/2244f691-dscf7581.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ddbe42ad-thumb-dscf7581.jpg	IMAGE	image/jpeg	660983	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:17.499	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0ocd015x106urgmd4odw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a41793ef-dscf7580.jpg	DSCF7580.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a41793ef-dscf7580.jpg	content/2025-11-20/a41793ef-dscf7580.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bb773432-thumb-dscf7580.jpg	IMAGE	image/jpeg	908545	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:18.876	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0p4a0161106uju1o8z1p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5916f7b7-dscf7582.jpg	DSCF7582.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5916f7b7-dscf7582.jpg	content/2025-11-20/5916f7b7-dscf7582.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9bab69d6-thumb-dscf7582.jpg	IMAGE	image/jpeg	820373	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:19.882	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0qls0165106ur437valr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ff9111ed-dscf7583.jpg	DSCF7583.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ff9111ed-dscf7583.jpg	content/2025-11-20/ff9111ed-dscf7583.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0c56ae8e-thumb-dscf7583.jpg	IMAGE	image/jpeg	829404	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:21.807	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0rx70169106u3643d7ms	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8150579b-dscf7586.jpg	DSCF7586.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8150579b-dscf7586.jpg	content/2025-11-20/8150579b-dscf7586.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/33648777-thumb-dscf7586.jpg	IMAGE	image/jpeg	552161	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:23.515	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0sy4016h106u5aj62nwn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5f0e1294-dscf7587.jpg	DSCF7587.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5f0e1294-dscf7587.jpg	content/2025-11-20/5f0e1294-dscf7587.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2809caf1-thumb-dscf7587.jpg	IMAGE	image/jpeg	485702	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:24.844	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0tuz016l106uuldzbs44	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/63b541a0-dscf7588.jpg	DSCF7588.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/63b541a0-dscf7588.jpg	content/2025-11-20/63b541a0-dscf7588.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cdcbe62a-thumb-dscf7588.jpg	IMAGE	image/jpeg	556691	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:26.027	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0vwx016t106uawvs1xfj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d2a19514-dscf7590.jpg	DSCF7590.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d2a19514-dscf7590.jpg	content/2025-11-20/d2a19514-dscf7590.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fd9f96c2-thumb-dscf7590.jpg	IMAGE	image/jpeg	558965	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:28.689	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0wb7016x106ui2qk3bbq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/878d60ce-dscf7591.jpg	DSCF7591.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/878d60ce-dscf7591.jpg	content/2025-11-20/878d60ce-dscf7591.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bfb8da3f-thumb-dscf7591.jpg	IMAGE	image/jpeg	575682	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:29.203	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0xd60171106uqjypw9jo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/749e9942-dscf7592.jpg	DSCF7592.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/749e9942-dscf7592.jpg	content/2025-11-20/749e9942-dscf7592.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e4882e4f-thumb-dscf7592.jpg	IMAGE	image/jpeg	569114	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:30.57	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0yxe0175106u76xy3d0y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/60fc2185-dscf7593.jpg	DSCF7593.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/60fc2185-dscf7593.jpg	content/2025-11-20/60fc2185-dscf7593.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0e036d93-thumb-dscf7593.jpg	IMAGE	image/jpeg	514477	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:32.594	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0zko0179106u6rx8byul	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3ab9f697-dscf7595.jpg	DSCF7595.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3ab9f697-dscf7595.jpg	content/2025-11-20/3ab9f697-dscf7595.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ca6293ad-thumb-dscf7595.jpg	IMAGE	image/jpeg	551109	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:33.432	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l10dq017d106ubhvsyz4p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3acd685b-dscf7596.jpg	DSCF7596.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3acd685b-dscf7596.jpg	content/2025-11-20/3acd685b-dscf7596.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/de0debf6-thumb-dscf7596.jpg	IMAGE	image/jpeg	555698	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:34.478	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l11hs017h106uoaptf27r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f59457ca-dscf7597.jpg	DSCF7597.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f59457ca-dscf7597.jpg	content/2025-11-20/f59457ca-dscf7597.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c91f1241-thumb-dscf7597.jpg	IMAGE	image/jpeg	511663	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:35.92	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l12nj017l106u48672dwq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6c0b2eff-dscf7599.jpg	DSCF7599.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6c0b2eff-dscf7599.jpg	content/2025-11-20/6c0b2eff-dscf7599.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9162189c-thumb-dscf7599.jpg	IMAGE	image/jpeg	559917	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:37.422	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l12qf017p106uupuyrl15	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/38f9e7ed-dscf7598.jpg	DSCF7598.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/38f9e7ed-dscf7598.jpg	content/2025-11-20/38f9e7ed-dscf7598.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3cbc4e9f-thumb-dscf7598.jpg	IMAGE	image/jpeg	569306	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:37.527	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l13ft017t106uzmvcqwbo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cb2bbfcc-dscf7600.jpg	DSCF7600.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cb2bbfcc-dscf7600.jpg	content/2025-11-20/cb2bbfcc-dscf7600.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/75c2ec65-thumb-dscf7600.jpg	IMAGE	image/jpeg	557045	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:38.441	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l15hv017x106ua14vnpbr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1037562c-dscf7601.jpg	DSCF7601.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1037562c-dscf7601.jpg	content/2025-11-20/1037562c-dscf7601.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/eb02cf2a-thumb-dscf7601.jpg	IMAGE	image/jpeg	525369	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:41.107	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l0vjx016p106ucp6ladzl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bfcb3388-dscf7589.jpg	DSCF7589.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bfcb3388-dscf7589.jpg	content/2025-11-20/bfcb3388-dscf7589.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e1e405d5-thumb-dscf7589.jpg	IMAGE	image/jpeg	560418	\N	\N	\N	\N	3861	5792	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:28.221	2025-11-23 13:32:56.289	cmi63yyr80005ejrm5rkshgro
cmi7l176l0181106urwrezj5x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7393ce40-dscf7604.jpg	DSCF7604.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7393ce40-dscf7604.jpg	content/2025-11-20/7393ce40-dscf7604.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a88f4935-thumb-dscf7604.jpg	IMAGE	image/jpeg	555711	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:43.294	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l17au0185106u1rssuzju	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7354cdb4-dscf7602.jpg	DSCF7602.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7354cdb4-dscf7602.jpg	content/2025-11-20/7354cdb4-dscf7602.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b5432e0e-thumb-dscf7602.jpg	IMAGE	image/jpeg	553583	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:43.446	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l17er0189106uuxpnybz5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c6fbb21a-dscf7603.jpg	DSCF7603.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c6fbb21a-dscf7603.jpg	content/2025-11-20/c6fbb21a-dscf7603.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/70359832-thumb-dscf7603.jpg	IMAGE	image/jpeg	559345	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:43.587	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l18uy018d106u81zewuku	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ba29d177-dscf7605.jpg	DSCF7605.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ba29d177-dscf7605.jpg	content/2025-11-20/ba29d177-dscf7605.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9c886f8c-thumb-dscf7605.jpg	IMAGE	image/jpeg	527144	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:45.466	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1b8q018h106u7c70ae9m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/03ade48e-dscf7606.jpg	DSCF7606.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/03ade48e-dscf7606.jpg	content/2025-11-20/03ade48e-dscf7606.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aa763c0a-thumb-dscf7606.jpg	IMAGE	image/jpeg	486241	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:48.555	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1bf7018l106um6e2lsso	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/942cc00b-dscf7608.jpg	DSCF7608.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/942cc00b-dscf7608.jpg	content/2025-11-20/942cc00b-dscf7608.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6d34f607-thumb-dscf7608.jpg	IMAGE	image/jpeg	549837	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:48.787	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1c3v018p106uxyasij49	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a6c4062e-dscf7607.jpg	DSCF7607.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a6c4062e-dscf7607.jpg	content/2025-11-20/a6c4062e-dscf7607.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/be54f59f-thumb-dscf7607.jpg	IMAGE	image/jpeg	554940	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:49.674	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1d5s018t106u1wbqfax9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3254e8d6-dscf7609.jpg	DSCF7609.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3254e8d6-dscf7609.jpg	content/2025-11-20/3254e8d6-dscf7609.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7009a45c-thumb-dscf7609.jpg	IMAGE	image/jpeg	693946	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:51.04	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1fvp018x106uvln6nzl1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/29d614e3-dscf7610.jpg	DSCF7610.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/29d614e3-dscf7610.jpg	content/2025-11-20/29d614e3-dscf7610.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e59f8a4b-thumb-dscf7610.jpg	IMAGE	image/jpeg	651414	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:54.565	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1gb40195106u1591aa0r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1bd93793-dscf7612.jpg	DSCF7612.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1bd93793-dscf7612.jpg	content/2025-11-20/1bd93793-dscf7612.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f8dcb288-thumb-dscf7612.jpg	IMAGE	image/jpeg	658525	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:55.12	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1h5r0199106uu6bi5ari	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/71e3dedc-dscf7613.jpg	DSCF7613.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/71e3dedc-dscf7613.jpg	content/2025-11-20/71e3dedc-dscf7613.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0a4bcc63-thumb-dscf7613.jpg	IMAGE	image/jpeg	702864	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:24:56.223	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1l3c019d106uxquxun8b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/287b9b7b-dscf7615.jpg	DSCF7615.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/287b9b7b-dscf7615.jpg	content/2025-11-20/287b9b7b-dscf7615.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1a8861fd-thumb-dscf7615.jpg	IMAGE	image/jpeg	580426	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:01.32	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1lc3019h106us0cdntm0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4207d028-dscf7616.jpg	DSCF7616.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4207d028-dscf7616.jpg	content/2025-11-20/4207d028-dscf7616.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ea6f7061-thumb-dscf7616.jpg	IMAGE	image/jpeg	675393	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:01.635	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1lx5019l106uemr2sews	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/94cb2274-dscf7617.jpg	DSCF7617.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/94cb2274-dscf7617.jpg	content/2025-11-20/94cb2274-dscf7617.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/be35706b-thumb-dscf7617.jpg	IMAGE	image/jpeg	510776	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:02.393	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1mib019p106uxrm81to0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f4804767-dscf7614.jpg	DSCF7614.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f4804767-dscf7614.jpg	content/2025-11-20/f4804767-dscf7614.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4bec45c8-thumb-dscf7614.jpg	IMAGE	image/jpeg	743735	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:03.155	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1p5t019t106uhc88j0xk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2a8a7378-dscf7618.jpg	DSCF7618.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2a8a7378-dscf7618.jpg	content/2025-11-20/2a8a7378-dscf7618.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f4fcd440-thumb-dscf7618.jpg	IMAGE	image/jpeg	557234	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:06.594	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1ps1019x106ua5b7zcdl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5af5c4e0-dscf7620.jpg	DSCF7620.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5af5c4e0-dscf7620.jpg	content/2025-11-20/5af5c4e0-dscf7620.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4c0136e5-thumb-dscf7620.jpg	IMAGE	image/jpeg	548424	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:07.393	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1pvg01a1106ugj70jcf8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1f17b47c-dscf7619.jpg	DSCF7619.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1f17b47c-dscf7619.jpg	content/2025-11-20/1f17b47c-dscf7619.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b52c5325-thumb-dscf7619.jpg	IMAGE	image/jpeg	504768	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:07.516	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1q3f01a5106u0h977jxg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1c353a0c-dscf7621.jpg	DSCF7621.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1c353a0c-dscf7621.jpg	content/2025-11-20/1c353a0c-dscf7621.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5f51fd27-thumb-dscf7621.jpg	IMAGE	image/jpeg	519210	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:07.802	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1scw01a9106udszq2j0m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8535bcbd-dscf7622.jpg	DSCF7622.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8535bcbd-dscf7622.jpg	content/2025-11-20/8535bcbd-dscf7622.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2c0deaef-thumb-dscf7622.jpg	IMAGE	image/jpeg	518984	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:10.736	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1tdf01ad106u12o958wf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/157c8c88-dscf7623.jpg	DSCF7623.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/157c8c88-dscf7623.jpg	content/2025-11-20/157c8c88-dscf7623.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5e5bdafa-thumb-dscf7623.jpg	IMAGE	image/jpeg	534429	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:12.051	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1u3e01ah106utfr2dqg6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/679c21ca-dscf7624.jpg	DSCF7624.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/679c21ca-dscf7624.jpg	content/2025-11-20/679c21ca-dscf7624.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/37dfadf4-thumb-dscf7624.jpg	IMAGE	image/jpeg	585621	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:12.986	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1utq01al106uytk35c4i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d8b9e602-dscf7625.jpg	DSCF7625.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d8b9e602-dscf7625.jpg	content/2025-11-20/d8b9e602-dscf7625.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4821e676-thumb-dscf7625.jpg	IMAGE	image/jpeg	553821	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:13.934	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1vqp01ap106ujtsvw39b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8b0c1e54-dscf7626.jpg	DSCF7626.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8b0c1e54-dscf7626.jpg	content/2025-11-20/8b0c1e54-dscf7626.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/289f2510-thumb-dscf7626.jpg	IMAGE	image/jpeg	646525	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:15.121	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1xvt01at106uudhk0iuw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3632c5cb-dscf7633.jpg	DSCF7633.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3632c5cb-dscf7633.jpg	content/2025-11-20/3632c5cb-dscf7633.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/26edf234-thumb-dscf7633.jpg	IMAGE	image/jpeg	499582	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:17.897	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l1ysu01ax106uz0iad3f7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b591f759-dscf7629.jpg	DSCF7629.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b591f759-dscf7629.jpg	content/2025-11-20/b591f759-dscf7629.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e5417f33-thumb-dscf7629.jpg	IMAGE	image/jpeg	1007744	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:19.085	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l212j01b1106uyxlgu1gk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/915ca1fa-dscf7635.jpg	DSCF7635.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/915ca1fa-dscf7635.jpg	content/2025-11-20/915ca1fa-dscf7635.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ba613e71-thumb-dscf7635.jpg	IMAGE	image/jpeg	469215	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:22.027	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l213o01b5106ueb9my0em	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f8ce5ec9-dscf7634.jpg	DSCF7634.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f8ce5ec9-dscf7634.jpg	content/2025-11-20/f8ce5ec9-dscf7634.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a84a8d3a-thumb-dscf7634.jpg	IMAGE	image/jpeg	473736	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:22.069	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l22lg01b9106uj9czwujt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/255b40b0-dscf7637.jpg	DSCF7637.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/255b40b0-dscf7637.jpg	content/2025-11-20/255b40b0-dscf7637.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/808dc890-thumb-dscf7637.jpg	IMAGE	image/jpeg	468630	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:24.004	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l23k601bd106uu7hi35ss	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/999ad766-dscf7636.jpg	DSCF7636.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/999ad766-dscf7636.jpg	content/2025-11-20/999ad766-dscf7636.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ef33fdbb-thumb-dscf7636.jpg	IMAGE	image/jpeg	475771	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:25.254	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l26i501bh106uva8z82wv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1d6097cc-dscf7639.jpg	DSCF7639.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1d6097cc-dscf7639.jpg	content/2025-11-20/1d6097cc-dscf7639.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8df04038-thumb-dscf7639.jpg	IMAGE	image/jpeg	481381	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:29.069	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l27cl01bl106uue1bpxnc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4b51626a-dscf7638.jpg	DSCF7638.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4b51626a-dscf7638.jpg	content/2025-11-20/4b51626a-dscf7638.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3301f8ff-thumb-dscf7638.jpg	IMAGE	image/jpeg	475238	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:30.165	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l27yd01bp106uiutx2e4c	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4fea84bd-dscf7641.jpg	DSCF7641.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4fea84bd-dscf7641.jpg	content/2025-11-20/4fea84bd-dscf7641.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e2d270f7-thumb-dscf7641.jpg	IMAGE	image/jpeg	486344	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:30.949	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l288101bt106uxzy3djzg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6a567212-dscf7640.jpg	DSCF7640.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6a567212-dscf7640.jpg	content/2025-11-20/6a567212-dscf7640.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8086aee4-thumb-dscf7640.jpg	IMAGE	image/jpeg	473809	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:31.297	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2avt01bx106u5t72kt8g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/27a26353-dscf7642.jpg	DSCF7642.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/27a26353-dscf7642.jpg	content/2025-11-20/27a26353-dscf7642.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c42e56e3-thumb-dscf7642.jpg	IMAGE	image/jpeg	489586	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:34.744	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2c1901c5106upw3bwqhj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e1067ffc-dscf7644.jpg	DSCF7644.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e1067ffc-dscf7644.jpg	content/2025-11-20/e1067ffc-dscf7644.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ad9708cc-thumb-dscf7644.jpg	IMAGE	image/jpeg	480074	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:36.237	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2g6101cd106urgte0nl3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a131b131-dscf7647.jpg	DSCF7647.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a131b131-dscf7647.jpg	content/2025-11-20/a131b131-dscf7647.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/523b3a8f-thumb-dscf7647.jpg	IMAGE	image/jpeg	583409	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:41.592	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2gi701ch106uo9etz9rh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f050920c-dscf7646.jpg	DSCF7646.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f050920c-dscf7646.jpg	content/2025-11-20/f050920c-dscf7646.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/263a88b2-thumb-dscf7646.jpg	IMAGE	image/jpeg	598354	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:42.031	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2j6i01cp106u76od9pra	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fb45912a-dscf7648.jpg	DSCF7648.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fb45912a-dscf7648.jpg	content/2025-11-20/fb45912a-dscf7648.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/87202767-thumb-dscf7648.jpg	IMAGE	image/jpeg	577054	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:45.497	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2kti01ct106u0smv9tci	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/117ce3b2-dscf7652.jpg	DSCF7652.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/117ce3b2-dscf7652.jpg	content/2025-11-20/117ce3b2-dscf7652.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d7f30748-thumb-dscf7652.jpg	IMAGE	image/jpeg	485582	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:47.622	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2kzy01cx106uq6ne7u6r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/17bed380-dscf7655.jpg	DSCF7655.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/17bed380-dscf7655.jpg	content/2025-11-20/17bed380-dscf7655.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7083d484-thumb-dscf7655.jpg	IMAGE	image/jpeg	491633	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:47.854	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2azw01c1106u2952kkgj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/76e32584-dscf7643.jpg	DSCF7643.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/76e32584-dscf7643.jpg	content/2025-11-20/76e32584-dscf7643.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7748d097-thumb-dscf7643.jpg	IMAGE	image/jpeg	486914	\N	\N	\N	\N	4000	6000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:34.892	2025-11-23 09:27:03.12	cmi63yyr80005ejrm5rkshgro
cmi7l2dy201c9106ubxqzjdap	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/09217085-dscf7645.jpg	DSCF7645.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/09217085-dscf7645.jpg	content/2025-11-20/09217085-dscf7645.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1d2a9230-thumb-dscf7645.jpg	IMAGE	image/jpeg	574606	\N	\N	\N	\N	3824	5737	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:38.709	2025-11-23 09:28:06.872	cmi63yyr80005ejrm5rkshgro
cmi7l2mgv01d1106upqqfhpe7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/80e01b58-dscf7656.jpg	DSCF7656.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/80e01b58-dscf7656.jpg	content/2025-11-20/80e01b58-dscf7656.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fe5362ea-thumb-dscf7656.jpg	IMAGE	image/jpeg	487380	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:49.759	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2njn01d5106ur9r4nj3d	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f89bb827-dscf7657.jpg	DSCF7657.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f89bb827-dscf7657.jpg	content/2025-11-20/f89bb827-dscf7657.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4229dca7-thumb-dscf7657.jpg	IMAGE	image/jpeg	495778	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:51.155	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2pmh01d9106utm33wh3h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/51f925cc-dscf7659.jpg	DSCF7659.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/51f925cc-dscf7659.jpg	content/2025-11-20/51f925cc-dscf7659.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cd82f3c7-thumb-dscf7659.jpg	IMAGE	image/jpeg	493183	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:53.849	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2q3k01dd106ufgu5j0ji	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/716931e2-dscf7658.jpg	DSCF7658.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/716931e2-dscf7658.jpg	content/2025-11-20/716931e2-dscf7658.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6c4b5609-thumb-dscf7658.jpg	IMAGE	image/jpeg	504161	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:54.464	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2rvj01dh106up81oyozz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b384e844-dscf7662.jpg	DSCF7662.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b384e844-dscf7662.jpg	content/2025-11-20/b384e844-dscf7662.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f2008660-thumb-dscf7662.jpg	IMAGE	image/jpeg	606357	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:56.767	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2tl201dp106uwtemk2kz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cf8da39a-dscf7664.jpg	DSCF7664.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cf8da39a-dscf7664.jpg	content/2025-11-20/cf8da39a-dscf7664.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1fe5393b-thumb-dscf7664.jpg	IMAGE	image/jpeg	498045	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:58.981	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2tmh01dt106ud6ih12mb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1e77fc57-dscf7663.jpg	DSCF7663.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1e77fc57-dscf7663.jpg	content/2025-11-20/1e77fc57-dscf7663.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a4a9b579-thumb-dscf7663.jpg	IMAGE	image/jpeg	662092	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:59.033	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l2zw901e1106u7tzifsxo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/09bdf085-dscf7667.jpg	DSCF7667.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/09bdf085-dscf7667.jpg	content/2025-11-20/09bdf085-dscf7667.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/80f42285-thumb-dscf7667.jpg	IMAGE	image/jpeg	454526	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:07.161	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l30lr01e5106ugzqngsm8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c0ace360-dscf7674.jpg	DSCF7674.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c0ace360-dscf7674.jpg	content/2025-11-20/c0ace360-dscf7674.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ac1654af-thumb-dscf7674.jpg	IMAGE	image/jpeg	507699	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:08.079	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l313n01e9106ucewk2qfd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/01081e5a-dscf7675.jpg	DSCF7675.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/01081e5a-dscf7675.jpg	content/2025-11-20/01081e5a-dscf7675.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8ff2d253-thumb-dscf7675.jpg	IMAGE	image/jpeg	496979	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:08.723	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l338o01eh106un28b5lpi	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d50c4140-dscf7677.jpg	DSCF7677.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d50c4140-dscf7677.jpg	content/2025-11-20/d50c4140-dscf7677.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/91a35214-thumb-dscf7677.jpg	IMAGE	image/jpeg	505532	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:11.496	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l36w701el106uz42wovcr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/02602fb1-dscf7678.jpg	DSCF7678.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/02602fb1-dscf7678.jpg	content/2025-11-20/02602fb1-dscf7678.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e20527be-thumb-dscf7678.jpg	IMAGE	image/jpeg	503689	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:16.231	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l32so01ed106ugl3ore9g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/41f1e865-dscf7676.jpg	DSCF7676.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/41f1e865-dscf7676.jpg	content/2025-11-20/41f1e865-dscf7676.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bb727fe0-thumb-dscf7676.jpg	IMAGE	image/jpeg	550283	\N	\N	\N	\N	3894	5841	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:10.92	2025-11-23 09:29:38.743	cmi63yyr80005ejrm5rkshgro
cmi7l2sp501dl106ujbw9vz4p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/eb2ce306-dscf7661.jpg	DSCF7661.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/eb2ce306-dscf7661.jpg	content/2025-11-20/eb2ce306-dscf7661.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1cccef15-thumb-dscf7661.jpg	IMAGE	image/jpeg	612683	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:25:57.833	2025-11-23 12:42:27.397	cmi63yyr80005ejrm5rkshgro
cmi7l417y01ep106ukjy2h8o2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7cfc7817-dscf7696.jpg	DSCF7696.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7cfc7817-dscf7696.jpg	content/2025-11-20/7cfc7817-dscf7696.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2f9122c5-thumb-dscf7696.jpg	IMAGE	image/jpeg	532194	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:55.534	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l41ai01et106u7g9gjvfu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e2b54e4e-dscf7697.jpg	DSCF7697.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e2b54e4e-dscf7697.jpg	content/2025-11-20/e2b54e4e-dscf7697.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dfae03ea-thumb-dscf7697.jpg	IMAGE	image/jpeg	584980	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:55.626	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l41qr01ex106ulzm3h0l9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/24beeee8-dscf7695.jpg	DSCF7695.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/24beeee8-dscf7695.jpg	content/2025-11-20/24beeee8-dscf7695.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/316e5546-thumb-dscf7695.jpg	IMAGE	image/jpeg	683445	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:56.211	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l421501f1106uncnlgvyc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5e1199c1-dscf7694.jpg	DSCF7694.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5e1199c1-dscf7694.jpg	content/2025-11-20/5e1199c1-dscf7694.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a3a90685-thumb-dscf7694.jpg	IMAGE	image/jpeg	752468	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:56.585	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l429z01f5106uxngn7vb6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/08dcd6ea-dscf7699.jpg	DSCF7699.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/08dcd6ea-dscf7699.jpg	content/2025-11-20/08dcd6ea-dscf7699.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f53a300f-thumb-dscf7699.jpg	IMAGE	image/jpeg	603737	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:56.903	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l42j601f9106uphlmoa3i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1e52b0b7-dscf7698.jpg	DSCF7698.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1e52b0b7-dscf7698.jpg	content/2025-11-20/1e52b0b7-dscf7698.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3306c215-thumb-dscf7698.jpg	IMAGE	image/jpeg	559404	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:26:57.234	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l45ma01fd106up6xyve6v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/552603ea-dscf7700.jpg	DSCF7700.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/552603ea-dscf7700.jpg	content/2025-11-20/552603ea-dscf7700.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b261f5c9-thumb-dscf7700.jpg	IMAGE	image/jpeg	678608	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:01.234	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l45oo01fh106uhdnfki7y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c4813953-dscf7702.jpg	DSCF7702.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c4813953-dscf7702.jpg	content/2025-11-20/c4813953-dscf7702.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b3e09a3b-thumb-dscf7702.jpg	IMAGE	image/jpeg	691577	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:01.321	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l46tg01fl106u6nuwx5sh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/421a5679-dscf7703.jpg	DSCF7703.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/421a5679-dscf7703.jpg	content/2025-11-20/421a5679-dscf7703.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c2ba05d0-thumb-dscf7703.jpg	IMAGE	image/jpeg	669836	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:02.788	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l48zj01fp106ufj9wrwk5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/759d459b-dscf7701.jpg	DSCF7701.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/759d459b-dscf7701.jpg	content/2025-11-20/759d459b-dscf7701.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c85153ef-thumb-dscf7701.jpg	IMAGE	image/jpeg	626570	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:05.599	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4bzd01fx106urovx5id4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/82e687f3-dscf7704.jpg	DSCF7704.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/82e687f3-dscf7704.jpg	content/2025-11-20/82e687f3-dscf7704.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31e3ce56-thumb-dscf7704.jpg	IMAGE	image/jpeg	670590	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:09.481	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4f6a01g1106u4ml4lwwn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/643b590d-dscf7707.jpg	DSCF7707.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/643b590d-dscf7707.jpg	content/2025-11-20/643b590d-dscf7707.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/eef2b239-thumb-dscf7707.jpg	IMAGE	image/jpeg	545645	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:13.618	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4f6i01g5106udwk759ps	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/725d6c71-dscf7706.jpg	DSCF7706.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/725d6c71-dscf7706.jpg	content/2025-11-20/725d6c71-dscf7706.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e33e2292-thumb-dscf7706.jpg	IMAGE	image/jpeg	538187	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:13.627	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4fbq01g9106usii8zjek	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/81542a13-dscf7708.jpg	DSCF7708.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/81542a13-dscf7708.jpg	content/2025-11-20/81542a13-dscf7708.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/298d9cf4-thumb-dscf7708.jpg	IMAGE	image/jpeg	543257	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:13.814	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4he101gd106udondvo4g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9d95cc4d-dscf7709.jpg	DSCF7709.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9d95cc4d-dscf7709.jpg	content/2025-11-20/9d95cc4d-dscf7709.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0603514a-thumb-dscf7709.jpg	IMAGE	image/jpeg	1007235	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:16.489	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4j7701gh106uco3w8yw4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a881ab03-dscf7710.jpg	DSCF7710.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a881ab03-dscf7710.jpg	content/2025-11-20/a881ab03-dscf7710.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5e3a7594-thumb-dscf7710.jpg	IMAGE	image/jpeg	952469	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:18.835	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4kqw01gl106ufziy2gjn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d7b94770-dscf7713.jpg	DSCF7713.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d7b94770-dscf7713.jpg	content/2025-11-20/d7b94770-dscf7713.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9885db78-thumb-dscf7713.jpg	IMAGE	image/jpeg	901788	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:20.839	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4kt701gp106uq1m9qhux	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3aa458b5-dscf7714.jpg	DSCF7714.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3aa458b5-dscf7714.jpg	content/2025-11-20/3aa458b5-dscf7714.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4d6eea97-thumb-dscf7714.jpg	IMAGE	image/jpeg	779885	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:20.923	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4me901gt106uik8823f2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/69e99fbb-dscf7715.jpg	DSCF7715.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/69e99fbb-dscf7715.jpg	content/2025-11-20/69e99fbb-dscf7715.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/556509c4-thumb-dscf7715.jpg	IMAGE	image/jpeg	934619	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:22.976	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4nbw01gx106urwvcuqaj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d5244818-dscf7716.jpg	DSCF7716.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d5244818-dscf7716.jpg	content/2025-11-20/d5244818-dscf7716.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8068088a-thumb-dscf7716.jpg	IMAGE	image/jpeg	951683	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:24.188	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4qim01h1106uxqozf4lr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/86784ccb-dscf7718.jpg	DSCF7718.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/86784ccb-dscf7718.jpg	content/2025-11-20/86784ccb-dscf7718.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/988644af-thumb-dscf7718.jpg	IMAGE	image/jpeg	798285	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:28.318	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4sel01h9106uq2soc7je	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fd14b70e-dscf7720.jpg	DSCF7720.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fd14b70e-dscf7720.jpg	content/2025-11-20/fd14b70e-dscf7720.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/53642f68-thumb-dscf7720.jpg	IMAGE	image/jpeg	619031	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:30.765	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4sre01hd106ukcbeh61e	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/52e73e9c-dscf7719.jpg	DSCF7719.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/52e73e9c-dscf7719.jpg	content/2025-11-20/52e73e9c-dscf7719.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fd2b543b-thumb-dscf7719.jpg	IMAGE	image/jpeg	909534	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:31.226	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4vdk01hh106uvct5p0jw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4492d520-dscf7721.jpg	DSCF7721.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4492d520-dscf7721.jpg	content/2025-11-20/4492d520-dscf7721.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2675ca50-thumb-dscf7721.jpg	IMAGE	image/jpeg	626974	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:34.616	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4vh301hl106u19fqaf4t	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fb7873db-dscf7722.jpg	DSCF7722.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fb7873db-dscf7722.jpg	content/2025-11-20/fb7873db-dscf7722.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/449d3ed8-thumb-dscf7722.jpg	IMAGE	image/jpeg	605207	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:34.743	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4x0801hp106uwfnas6w1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fb7ab439-dscf7724.jpg	DSCF7724.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fb7ab439-dscf7724.jpg	content/2025-11-20/fb7ab439-dscf7724.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a1a9aab0-thumb-dscf7724.jpg	IMAGE	image/jpeg	481316	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:36.728	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4x4x01ht106u0nb5ug2b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/77563b13-dscf7723.jpg	DSCF7723.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/77563b13-dscf7723.jpg	content/2025-11-20/77563b13-dscf7723.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0a762155-thumb-dscf7723.jpg	IMAGE	image/jpeg	629254	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:36.897	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4yxz01hx106ueb63w8c8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e4395c99-dscf7725.jpg	DSCF7725.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e4395c99-dscf7725.jpg	content/2025-11-20/e4395c99-dscf7725.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1b4977ff-thumb-dscf7725.jpg	IMAGE	image/jpeg	525656	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:39.239	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l4zpn01i1106uya3t2gx6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e77db350-dscf7726.jpg	DSCF7726.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e77db350-dscf7726.jpg	content/2025-11-20/e77db350-dscf7726.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1b7a3b6c-thumb-dscf7726.jpg	IMAGE	image/jpeg	476211	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:40.235	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l50ar01i5106uo9rd4nzz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b83705be-dscf7727.jpg	DSCF7727.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b83705be-dscf7727.jpg	content/2025-11-20/b83705be-dscf7727.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1aeb0283-thumb-dscf7727.jpg	IMAGE	image/jpeg	512236	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:40.995	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l50te01i9106us8o4j0ca	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c60f082f-dscf7728.jpg	DSCF7728.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c60f082f-dscf7728.jpg	content/2025-11-20/c60f082f-dscf7728.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f95c2d70-thumb-dscf7728.jpg	IMAGE	image/jpeg	558750	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:41.666	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5bb601id106u820gi3yt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1b1a253b-dscf7732.jpg	DSCF7732.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1b1a253b-dscf7732.jpg	content/2025-11-20/1b1a253b-dscf7732.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9b0ddebf-thumb-dscf7732.jpg	IMAGE	image/jpeg	717158	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:55.266	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5blp01ih106u397q2j1o	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f612a8cb-dscf7733.jpg	DSCF7733.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f612a8cb-dscf7733.jpg	content/2025-11-20/f612a8cb-dscf7733.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4a765c5b-thumb-dscf7733.jpg	IMAGE	image/jpeg	741182	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:27:55.645	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5mxr01il106uw1tpg3l6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/692db9a5-dscf7739.jpg	DSCF7739.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/692db9a5-dscf7739.jpg	content/2025-11-20/692db9a5-dscf7739.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b6c09e4f-thumb-dscf7739.jpg	IMAGE	image/jpeg	664854	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:10.335	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5nej01ip106u1jo0s9sy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3bfcbc9a-dscf7738.jpg	DSCF7738.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3bfcbc9a-dscf7738.jpg	content/2025-11-20/3bfcbc9a-dscf7738.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e66d3969-thumb-dscf7738.jpg	IMAGE	image/jpeg	724844	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:10.94	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5nhe01it106u5h7cfyk7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f41b2851-dscf7740.jpg	DSCF7740.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f41b2851-dscf7740.jpg	content/2025-11-20/f41b2851-dscf7740.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1a2f3736-thumb-dscf7740.jpg	IMAGE	image/jpeg	625962	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:11.043	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5nqq01ix106ua9scrq5m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6a52388d-dscf7741.jpg	DSCF7741.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6a52388d-dscf7741.jpg	content/2025-11-20/6a52388d-dscf7741.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7569eeb4-thumb-dscf7741.jpg	IMAGE	image/jpeg	656658	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:11.378	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5sg401j9106u74cwayhw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/61c37dc0-dscf7745.jpg	DSCF7745.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/61c37dc0-dscf7745.jpg	content/2025-11-20/61c37dc0-dscf7745.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/38749174-thumb-dscf7745.jpg	IMAGE	image/jpeg	611503	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:17.476	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5sme01jd106u9zm4e5fx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/57d10acb-dscf7744.jpg	DSCF7744.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/57d10acb-dscf7744.jpg	content/2025-11-20/57d10acb-dscf7744.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cfe336c4-thumb-dscf7744.jpg	IMAGE	image/jpeg	611585	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:17.702	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5vgv01jh106uuq70xuix	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bf3d323e-dscf7746.jpg	DSCF7746.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bf3d323e-dscf7746.jpg	content/2025-11-20/bf3d323e-dscf7746.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7e60e450-thumb-dscf7746.jpg	IMAGE	image/jpeg	607778	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:21.391	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l60te01jl106uldkguj2v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4c04b2f2-dscf7747.jpg	DSCF7747.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4c04b2f2-dscf7747.jpg	content/2025-11-20/4c04b2f2-dscf7747.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b8d91dc3-thumb-dscf7747.jpg	IMAGE	image/jpeg	921610	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:28.322	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l5rnr01j5106uw643uc29	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d74c0809-dscf7743.jpg	DSCF7743.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d74c0809-dscf7743.jpg	content/2025-11-20/d74c0809-dscf7743.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/97d0988e-thumb-dscf7743.jpg	IMAGE	image/jpeg	666439	\N	\N	\N	\N	3927	5890	DRAFT	5	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:16.455	2025-11-23 10:21:03.718	cmi63yyr80005ejrm5rkshgro
cmi7l62r801jp106uu4g1qmwm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d79b16d5-dscf7748.jpg	DSCF7748.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d79b16d5-dscf7748.jpg	content/2025-11-20/d79b16d5-dscf7748.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/08feb4d8-thumb-dscf7748.jpg	IMAGE	image/jpeg	825273	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:30.836	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l63sp01jt106up8iiz770	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a0a417f3-dscf7749.jpg	DSCF7749.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a0a417f3-dscf7749.jpg	content/2025-11-20/a0a417f3-dscf7749.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f576c650-thumb-dscf7749.jpg	IMAGE	image/jpeg	674146	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:32.185	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l63un01jx106u0pk96qs5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9ba1ccd5-dscf7751.jpg	DSCF7751.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9ba1ccd5-dscf7751.jpg	content/2025-11-20/9ba1ccd5-dscf7751.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4a26004e-thumb-dscf7751.jpg	IMAGE	image/jpeg	694885	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:32.244	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l63xj01k1106ul2ixx2ds	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/00596e0a-dscf7750.jpg	DSCF7750.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/00596e0a-dscf7750.jpg	content/2025-11-20/00596e0a-dscf7750.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d1c7beea-thumb-dscf7750.jpg	IMAGE	image/jpeg	715928	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:32.358	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l66hr01k5106ux0k92nls	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/42c69a58-dscf7753.jpg	DSCF7753.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/42c69a58-dscf7753.jpg	content/2025-11-20/42c69a58-dscf7753.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f0ce3d30-thumb-dscf7753.jpg	IMAGE	image/jpeg	869859	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:35.678	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l66n801k9106uodg8xd76	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0f8cf555-dscf7752.jpg	DSCF7752.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0f8cf555-dscf7752.jpg	content/2025-11-20/0f8cf555-dscf7752.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/62c0c8c2-thumb-dscf7752.jpg	IMAGE	image/jpeg	892926	\N	\N	\N	\N	3819	5729	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:35.875	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l676y01kd106u23lc4fui	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/78eee98d-dscf7754.jpg	DSCF7754.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/78eee98d-dscf7754.jpg	content/2025-11-20/78eee98d-dscf7754.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/26089be6-thumb-dscf7754.jpg	IMAGE	image/jpeg	653516	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:36.586	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l679001kh106u0lwday6c	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8addd6d6-dscf7758.jpg	DSCF7758.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8addd6d6-dscf7758.jpg	content/2025-11-20/8addd6d6-dscf7758.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/16d5ab6c-thumb-dscf7758.jpg	IMAGE	image/jpeg	627662	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:36.66	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6d9i01kl106uulnki8vq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/08dae580-dscf7759.jpg	DSCF7759.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/08dae580-dscf7759.jpg	content/2025-11-20/08dae580-dscf7759.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f19c38a0-thumb-dscf7759.jpg	IMAGE	image/jpeg	626402	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:44.454	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6ei701kp106uz3c5gn53	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8583c95f-dscf7761.jpg	DSCF7761.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8583c95f-dscf7761.jpg	content/2025-11-20/8583c95f-dscf7761.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/89ddfab2-thumb-dscf7761.jpg	IMAGE	image/jpeg	690474	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:46.063	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6ev401kt106uole9getx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/95d3185a-dscf7760.jpg	DSCF7760.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/95d3185a-dscf7760.jpg	content/2025-11-20/95d3185a-dscf7760.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d9adf61a-thumb-dscf7760.jpg	IMAGE	image/jpeg	728432	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:46.529	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6fw201kx106ui6kvwdrt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e37948e2-dscf7762.jpg	DSCF7762.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e37948e2-dscf7762.jpg	content/2025-11-20/e37948e2-dscf7762.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/24eccf76-thumb-dscf7762.jpg	IMAGE	image/jpeg	693214	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:47.857	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6gob01l1106us8eswjm1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dbd3489f-dscf7763.jpg	DSCF7763.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dbd3489f-dscf7763.jpg	content/2025-11-20/dbd3489f-dscf7763.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fb912c8d-thumb-dscf7763.jpg	IMAGE	image/jpeg	465255	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:28:48.875	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6vix01l5106uwzqrprbq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/db20f1b5-dscf7772.jpg	DSCF7772.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/db20f1b5-dscf7772.jpg	content/2025-11-20/db20f1b5-dscf7772.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f25ca653-thumb-dscf7772.jpg	IMAGE	image/jpeg	826011	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:08.121	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6wlu01ld106un7cstxg0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f261c507-dscf7773.jpg	DSCF7773.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f261c507-dscf7773.jpg	content/2025-11-20/f261c507-dscf7773.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ed78f7ad-thumb-dscf7773.jpg	IMAGE	image/jpeg	861620	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:09.521	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6y9801ll106ugqqrpp0x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d1d936ed-dscf7776.jpg	DSCF7776.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d1d936ed-dscf7776.jpg	content/2025-11-20/d1d936ed-dscf7776.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/32112f42-thumb-dscf7776.jpg	IMAGE	image/jpeg	842182	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:11.66	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6z5u01lp106uszf8x79k	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/eb295dc4-dscf7775.jpg	DSCF7775.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/eb295dc4-dscf7775.jpg	content/2025-11-20/eb295dc4-dscf7775.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/decef985-thumb-dscf7775.jpg	IMAGE	image/jpeg	846207	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:12.834	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6zs001lt106urasorpj6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d2939179-dscf7780.jpg	DSCF7780.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d2939179-dscf7780.jpg	content/2025-11-20/d2939179-dscf7780.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b863c9d7-thumb-dscf7780.jpg	IMAGE	image/jpeg	412495	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:13.632	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l6zt001lx106unvidy9fo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ede6f917-dscf7777.jpg	DSCF7777.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ede6f917-dscf7777.jpg	content/2025-11-20/ede6f917-dscf7777.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2dcf98f7-thumb-dscf7777.jpg	IMAGE	image/jpeg	845516	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:13.668	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l70zh01m1106uuiqmxm9x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/79e95b2e-dscf7781.jpg	DSCF7781.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/79e95b2e-dscf7781.jpg	content/2025-11-20/79e95b2e-dscf7781.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7069e32b-thumb-dscf7781.jpg	IMAGE	image/jpeg	414576	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:15.198	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l71sa01m5106ufcca8jkz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5fbf2791-dscf7782.jpg	DSCF7782.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5fbf2791-dscf7782.jpg	content/2025-11-20/5fbf2791-dscf7782.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6838a601-thumb-dscf7782.jpg	IMAGE	image/jpeg	430181	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:16.234	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l73u101m9106ukuudnp8f	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/30c9d268-dscf7785.jpg	DSCF7785.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/30c9d268-dscf7785.jpg	content/2025-11-20/30c9d268-dscf7785.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b3d9a66a-thumb-dscf7785.jpg	IMAGE	image/jpeg	422516	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:18.89	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l73wq01md106u6899kzt0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b7bde1e8-dscf7783.jpg	DSCF7783.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b7bde1e8-dscf7783.jpg	content/2025-11-20/b7bde1e8-dscf7783.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d5c3e8a5-thumb-dscf7783.jpg	IMAGE	image/jpeg	429186	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:18.987	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l74d501mh106ud1znitkg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f74f67d6-dscf7786.jpg	DSCF7786.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f74f67d6-dscf7786.jpg	content/2025-11-20/f74f67d6-dscf7786.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2e989516-thumb-dscf7786.jpg	IMAGE	image/jpeg	411979	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:19.577	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l74k001ml106uhb9si6mp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dd16c1c6-dscf7784.jpg	DSCF7784.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dd16c1c6-dscf7784.jpg	content/2025-11-20/dd16c1c6-dscf7784.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e7e82e5d-thumb-dscf7784.jpg	IMAGE	image/jpeg	422467	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:19.824	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l76wy01mp106u5wd7ukbl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/34db5b67-dscf7787.jpg	DSCF7787.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/34db5b67-dscf7787.jpg	content/2025-11-20/34db5b67-dscf7787.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/132adb30-thumb-dscf7787.jpg	IMAGE	image/jpeg	372170	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:22.882	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l771x01mt106u0hkbnkgu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/60e5e553-dscf7788.jpg	DSCF7788.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/60e5e553-dscf7788.jpg	content/2025-11-20/60e5e553-dscf7788.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/664edddb-thumb-dscf7788.jpg	IMAGE	image/jpeg	433963	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:23.061	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l77ar01mx106uqy4dnqwp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4dec0236-dscf7790.jpg	DSCF7790.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4dec0236-dscf7790.jpg	content/2025-11-20/4dec0236-dscf7790.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dd3c1035-thumb-dscf7790.jpg	IMAGE	image/jpeg	432544	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:23.379	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l77p601n1106uwzetdnco	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2f240be4-dscf7789.jpg	DSCF7789.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2f240be4-dscf7789.jpg	content/2025-11-20/2f240be4-dscf7789.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1db2a6f3-thumb-dscf7789.jpg	IMAGE	image/jpeg	428350	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:23.898	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l79vk01n5106u8ntqr59k	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/936dfe10-dscf7797.jpg	DSCF7797.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/936dfe10-dscf7797.jpg	content/2025-11-20/936dfe10-dscf7797.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/63e9f405-thumb-dscf7797.jpg	IMAGE	image/jpeg	397045	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:26.72	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7hy201n9106umk3ikah8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6512de5e-dscf7798.jpg	DSCF7798.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6512de5e-dscf7798.jpg	content/2025-11-20/6512de5e-dscf7798.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aeda211f-thumb-dscf7798.jpg	IMAGE	image/jpeg	390211	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:37.177	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7l2g01nd106u24hkko6z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6a606f9c-dscf7801.jpg	DSCF7801.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6a606f9c-dscf7801.jpg	content/2025-11-20/6a606f9c-dscf7801.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fe5d3314-thumb-dscf7801.jpg	IMAGE	image/jpeg	407944	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:41.224	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7l7d01nh106uoc6smqd3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1c7b1c80-dscf7803.jpg	DSCF7803.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1c7b1c80-dscf7803.jpg	content/2025-11-20/1c7b1c80-dscf7803.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a7ff6a0b-thumb-dscf7803.jpg	IMAGE	image/jpeg	418622	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:41.401	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7lir01nl106uzmk6wuky	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dff61a83-dscf7804.jpg	DSCF7804.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dff61a83-dscf7804.jpg	content/2025-11-20/dff61a83-dscf7804.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4cab3c1f-thumb-dscf7804.jpg	IMAGE	image/jpeg	415980	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:41.811	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7pel01nt106ud37p80l4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e5de5e4a-dscf7805.jpg	DSCF7805.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e5de5e4a-dscf7805.jpg	content/2025-11-20/e5de5e4a-dscf7805.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9fc25f24-thumb-dscf7805.jpg	IMAGE	image/jpeg	455901	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:46.845	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7qrv01nx106u6bdzhiof	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c15abb22-dscf7806.jpg	DSCF7806.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c15abb22-dscf7806.jpg	content/2025-11-20/c15abb22-dscf7806.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0df40990-thumb-dscf7806.jpg	IMAGE	image/jpeg	435305	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:48.619	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7r6901o1106uww6scpxb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/87ab8703-dscf7807.jpg	DSCF7807.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/87ab8703-dscf7807.jpg	content/2025-11-20/87ab8703-dscf7807.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/071683d4-thumb-dscf7807.jpg	IMAGE	image/jpeg	433956	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:49.137	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7rt601o5106uo5iuh5yu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/01a80839-dscf7808.jpg	DSCF7808.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/01a80839-dscf7808.jpg	content/2025-11-20/01a80839-dscf7808.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a92f17b7-thumb-dscf7808.jpg	IMAGE	image/jpeg	480325	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:49.961	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7u4d01od106u822r6yoj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e16d5c01-dscf7812.jpg	DSCF7812.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e16d5c01-dscf7812.jpg	content/2025-11-20/e16d5c01-dscf7812.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9b61f0c1-thumb-dscf7812.jpg	IMAGE	image/jpeg	497548	\N	\N	\N	\N	3815	5722	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:52.956	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7u9k01oh106uousy0kqy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1ad0a155-dscf7813.jpg	DSCF7813.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1ad0a155-dscf7813.jpg	content/2025-11-20/1ad0a155-dscf7813.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a6cdb3cc-thumb-dscf7813.jpg	IMAGE	image/jpeg	447682	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:53.145	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7v0k01ol106uigmwpoqh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7c79c884-dscf7814.jpg	DSCF7814.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7c79c884-dscf7814.jpg	content/2025-11-20/7c79c884-dscf7814.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ce580d7e-thumb-dscf7814.jpg	IMAGE	image/jpeg	487709	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:54.116	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7lmj01np106ue53elcx7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d9704b8c-dscf7802.jpg	DSCF7802.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d9704b8c-dscf7802.jpg	content/2025-11-20/d9704b8c-dscf7802.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/811cc9b3-thumb-dscf7802.jpg	IMAGE	image/jpeg	413640	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:41.947	2025-11-25 11:08:33.242	cmi63yyr80005ejrm5rkshgro
cmi7l7vz401op106ucpxybm10	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/61f5c9e7-dscf7815.jpg	DSCF7815.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/61f5c9e7-dscf7815.jpg	content/2025-11-20/61f5c9e7-dscf7815.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/26cd234d-thumb-dscf7815.jpg	IMAGE	image/jpeg	503151	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:55.36	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7xcm01ot106u9o0hnpog	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dac6a398-dscf7817.jpg	DSCF7817.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dac6a398-dscf7817.jpg	content/2025-11-20/dac6a398-dscf7817.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a522170e-thumb-dscf7817.jpg	IMAGE	image/jpeg	546998	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:57.142	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7ycc01ox106uy1xugmce	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7c9262d7-dscf7820.jpg	DSCF7820.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7c9262d7-dscf7820.jpg	content/2025-11-20/7c9262d7-dscf7820.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a049f006-thumb-dscf7820.jpg	IMAGE	image/jpeg	605133	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:58.428	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7z7n01p1106uj7m9pgft	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c57c33f3-dscf7821.jpg	DSCF7821.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c57c33f3-dscf7821.jpg	content/2025-11-20/c57c33f3-dscf7821.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ae5e0ba2-thumb-dscf7821.jpg	IMAGE	image/jpeg	615522	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:59.555	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l7z9x01p5106ux3ctm0ce	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/197a088d-dscf7818.jpg	DSCF7818.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/197a088d-dscf7818.jpg	content/2025-11-20/197a088d-dscf7818.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9cae75d1-thumb-dscf7818.jpg	IMAGE	image/jpeg	610316	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:29:59.637	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l80op01p9106ulh6bbwej	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/af8b8e47-dscf7822.jpg	DSCF7822.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/af8b8e47-dscf7822.jpg	content/2025-11-20/af8b8e47-dscf7822.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/def3b058-thumb-dscf7822.jpg	IMAGE	image/jpeg	555312	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:01.465	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l839101pd106ukh5mhdzy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ef1c4de9-dscf7823.jpg	DSCF7823.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ef1c4de9-dscf7823.jpg	content/2025-11-20/ef1c4de9-dscf7823.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/920566b1-thumb-dscf7823.jpg	IMAGE	image/jpeg	504997	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:04.789	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l85d601ph106ukmtpcn6j	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0b2e0080-dscf7825.jpg	DSCF7825.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0b2e0080-dscf7825.jpg	content/2025-11-20/0b2e0080-dscf7825.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/09413a6c-thumb-dscf7825.jpg	IMAGE	image/jpeg	548795	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:07.53	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l85y901pl106ujq0wj4wd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/071128b8-dscf7826.jpg	DSCF7826.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/071128b8-dscf7826.jpg	content/2025-11-20/071128b8-dscf7826.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cfcff89e-thumb-dscf7826.jpg	IMAGE	image/jpeg	627112	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:08.288	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l866w01pp106ummn463f2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c6a18230-dscf7824.jpg	DSCF7824.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c6a18230-dscf7824.jpg	content/2025-11-20/c6a18230-dscf7824.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d4c827e6-thumb-dscf7824.jpg	IMAGE	image/jpeg	555922	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:08.6	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l87gu01pt106ueq6q6xrj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/77d34561-dscf7828.jpg	DSCF7828.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/77d34561-dscf7828.jpg	content/2025-11-20/77d34561-dscf7828.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/428a94ba-thumb-dscf7828.jpg	IMAGE	image/jpeg	694290	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:10.254	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l888e01px106uimm4ko7z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5d1dedac-dscf7829.jpg	DSCF7829.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5d1dedac-dscf7829.jpg	content/2025-11-20/5d1dedac-dscf7829.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fbc31dc9-thumb-dscf7829.jpg	IMAGE	image/jpeg	692313	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:11.246	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l89gn01q5106u8fnensxg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3c27ee46-dscf7830.jpg	DSCF7830.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3c27ee46-dscf7830.jpg	content/2025-11-20/3c27ee46-dscf7830.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d25f19e2-thumb-dscf7830.jpg	IMAGE	image/jpeg	821496	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:12.839	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8aja01q9106upyso13yf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cedfd43b-dscf7832.jpg	DSCF7832.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cedfd43b-dscf7832.jpg	content/2025-11-20/cedfd43b-dscf7832.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/20cb4316-thumb-dscf7832.jpg	IMAGE	image/jpeg	633206	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:14.23	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8byv01qd106ur4mudb9h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/59dc66f6-dscf7833.jpg	DSCF7833.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/59dc66f6-dscf7833.jpg	content/2025-11-20/59dc66f6-dscf7833.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4a18a326-thumb-dscf7833.jpg	IMAGE	image/jpeg	840149	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:16.087	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8ekb01qh106u3vbj2kb8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8e24a964-dscf7834.jpg	DSCF7834.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8e24a964-dscf7834.jpg	content/2025-11-20/8e24a964-dscf7834.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/78c6341f-thumb-dscf7834.jpg	IMAGE	image/jpeg	828259	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:19.451	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8fpz01ql106uzj9q01yp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c641dfe1-dscf7836.jpg	DSCF7836.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c641dfe1-dscf7836.jpg	content/2025-11-20/c641dfe1-dscf7836.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/943313eb-thumb-dscf7836.jpg	IMAGE	image/jpeg	771545	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:20.951	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8fq801qp106uzfkz6cuu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2c11e9cc-dscf7835.jpg	DSCF7835.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2c11e9cc-dscf7835.jpg	content/2025-11-20/2c11e9cc-dscf7835.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f6efd9db-thumb-dscf7835.jpg	IMAGE	image/jpeg	860107	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:20.96	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8gvm01qt106uwuyjv0fx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/655958ad-dscf7837.jpg	DSCF7837.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/655958ad-dscf7837.jpg	content/2025-11-20/655958ad-dscf7837.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/14473269-thumb-dscf7837.jpg	IMAGE	image/jpeg	807302	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:22.45	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8jkv01qx106ulthv8oz3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d206b9d6-dscf7838.jpg	DSCF7838.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d206b9d6-dscf7838.jpg	content/2025-11-20/d206b9d6-dscf7838.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/caa96db5-thumb-dscf7838.jpg	IMAGE	image/jpeg	878917	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:25.952	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8kks01r5106uhz894jb0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/708953b8-dscf7839.jpg	DSCF7839.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/708953b8-dscf7839.jpg	content/2025-11-20/708953b8-dscf7839.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/09548801-thumb-dscf7839.jpg	IMAGE	image/jpeg	787112	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:27.245	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8l7v01r9106utwdee5a2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/54640a0f-dscf7840.jpg	DSCF7840.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/54640a0f-dscf7840.jpg	content/2025-11-20/54640a0f-dscf7840.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3455a8e2-thumb-dscf7840.jpg	IMAGE	image/jpeg	607716	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:28.075	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8m7j01rd106uo6wa6vsf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a7311659-dscf7842.jpg	DSCF7842.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a7311659-dscf7842.jpg	content/2025-11-20/a7311659-dscf7842.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a2949741-thumb-dscf7842.jpg	IMAGE	image/jpeg	603631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:29.359	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8mya01rh106ufq2lu6t1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6c117544-dscf7844.jpg	DSCF7844.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6c117544-dscf7844.jpg	content/2025-11-20/6c117544-dscf7844.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c7435cb0-thumb-dscf7844.jpg	IMAGE	image/jpeg	755604	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:30.322	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8n7101rl106u5q2c9hx5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/081860b5-dscf7843.jpg	DSCF7843.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/081860b5-dscf7843.jpg	content/2025-11-20/081860b5-dscf7843.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e2f29c36-thumb-dscf7843.jpg	IMAGE	image/jpeg	594366	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:30.635	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8tkd01rp106ukb7lghn6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4a7f3951-dscf7845.jpg	DSCF7845.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4a7f3951-dscf7845.jpg	content/2025-11-20/4a7f3951-dscf7845.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/935ab1c9-thumb-dscf7845.jpg	IMAGE	image/jpeg	941535	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:38.892	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8uaj01rt106uc60d83qt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2391d033-dscf7849.jpg	DSCF7849.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2391d033-dscf7849.jpg	content/2025-11-20/2391d033-dscf7849.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/13baff20-thumb-dscf7849.jpg	IMAGE	image/jpeg	910017	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:39.835	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8ub701rx106ugrsux93d	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6b12e3f3-dscf7846.jpg	DSCF7846.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6b12e3f3-dscf7846.jpg	content/2025-11-20/6b12e3f3-dscf7846.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5ef4a366-thumb-dscf7846.jpg	IMAGE	image/jpeg	820224	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:39.86	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8v1k01s1106uq4huv2fh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ad050ee5-dscf7847.jpg	DSCF7847.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ad050ee5-dscf7847.jpg	content/2025-11-20/ad050ee5-dscf7847.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d6c641cc-thumb-dscf7847.jpg	IMAGE	image/jpeg	973091	\N	\N	\N	\N	3824	5737	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:40.808	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8w6w01s5106ut6t8jt5q	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c9f12c0e-dscf7850.jpg	DSCF7850.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c9f12c0e-dscf7850.jpg	content/2025-11-20/c9f12c0e-dscf7850.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e2a6c132-thumb-dscf7850.jpg	IMAGE	image/jpeg	465369	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:42.296	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8x0y01s9106unh1q7k93	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6bdbcbb1-dscf7851.jpg	DSCF7851.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6bdbcbb1-dscf7851.jpg	content/2025-11-20/6bdbcbb1-dscf7851.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e0016024-thumb-dscf7851.jpg	IMAGE	image/jpeg	555751	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:43.378	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8x4801sd106ue61jcq8v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2d3f7a01-dscf7852.jpg	DSCF7852.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2d3f7a01-dscf7852.jpg	content/2025-11-20/2d3f7a01-dscf7852.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d377fc20-thumb-dscf7852.jpg	IMAGE	image/jpeg	637473	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:43.496	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l8yhs01sh106ur17jzvu6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f1c14f91-dscf7853.jpg	DSCF7853.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f1c14f91-dscf7853.jpg	content/2025-11-20/f1c14f91-dscf7853.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6668a210-thumb-dscf7853.jpg	IMAGE	image/jpeg	631380	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:45.279	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l90vd01sl106ubdkbgfij	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ba286cc5-dscf7855.jpg	DSCF7855.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ba286cc5-dscf7855.jpg	content/2025-11-20/ba286cc5-dscf7855.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/857e67a3-thumb-dscf7855.jpg	IMAGE	image/jpeg	643801	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:48.36	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l916l01sp106u3zzd0nvl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1653933a-dscf7857.jpg	DSCF7857.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1653933a-dscf7857.jpg	content/2025-11-20/1653933a-dscf7857.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c45f3eea-thumb-dscf7857.jpg	IMAGE	image/jpeg	578067	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:48.765	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l91bc01st106u16fui7ks	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dd8b4a07-dscf7856.jpg	DSCF7856.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dd8b4a07-dscf7856.jpg	content/2025-11-20/dd8b4a07-dscf7856.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fc4616fc-thumb-dscf7856.jpg	IMAGE	image/jpeg	616864	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:48.936	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l91c401sx106upntiu13i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ca159fb9-dscf7854.jpg	DSCF7854.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ca159fb9-dscf7854.jpg	content/2025-11-20/ca159fb9-dscf7854.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/189e6ddf-thumb-dscf7854.jpg	IMAGE	image/jpeg	654373	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:48.963	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l94y801t1106uscqi4ah0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1fec497a-dscf7859.jpg	DSCF7859.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1fec497a-dscf7859.jpg	content/2025-11-20/1fec497a-dscf7859.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4f356d28-thumb-dscf7859.jpg	IMAGE	image/jpeg	609949	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:53.648	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l95gd01t5106ucjyerpfl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0133ee14-dscf7861.jpg	DSCF7861.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0133ee14-dscf7861.jpg	content/2025-11-20/0133ee14-dscf7861.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bdb7a827-thumb-dscf7861.jpg	IMAGE	image/jpeg	596464	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:54.301	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l95sj01t9106utm6iwf2z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b85a0e2b-dscf7858.jpg	DSCF7858.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b85a0e2b-dscf7858.jpg	content/2025-11-20/b85a0e2b-dscf7858.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/81f6a28f-thumb-dscf7858.jpg	IMAGE	image/jpeg	578879	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:54.739	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l96pc01td106ubh30yr9e	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/44468b04-dscf7860.jpg	DSCF7860.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/44468b04-dscf7860.jpg	content/2025-11-20/44468b04-dscf7860.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5a463ad6-thumb-dscf7860.jpg	IMAGE	image/jpeg	585515	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:55.92	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l97m601th106up8u9oymt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/00ac0bfc-dscf7862.jpg	DSCF7862.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/00ac0bfc-dscf7862.jpg	content/2025-11-20/00ac0bfc-dscf7862.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b2a5acc9-thumb-dscf7862.jpg	IMAGE	image/jpeg	582626	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:57.102	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l983n01tl106u99365vpx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3b351306-dscf7864.jpg	DSCF7864.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3b351306-dscf7864.jpg	content/2025-11-20/3b351306-dscf7864.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fdf33e82-thumb-dscf7864.jpg	IMAGE	image/jpeg	584631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:57.731	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l98pc01tp106uwt7xzexw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/716b06a0-dscf7863.jpg	DSCF7863.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/716b06a0-dscf7863.jpg	content/2025-11-20/716b06a0-dscf7863.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/38579041-thumb-dscf7863.jpg	IMAGE	image/jpeg	581982	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:58.512	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l99oq01tt106u0fr9wkhy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c9d8ed41-dscf7866.jpg	DSCF7866.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c9d8ed41-dscf7866.jpg	content/2025-11-20/c9d8ed41-dscf7866.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dc4dddeb-thumb-dscf7866.jpg	IMAGE	image/jpeg	577527	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:30:59.786	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l99vg01tx106u9cbni6pp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2f616e73-dscf7865.jpg	DSCF7865.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2f616e73-dscf7865.jpg	content/2025-11-20/2f616e73-dscf7865.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7b9095fc-thumb-dscf7865.jpg	IMAGE	image/jpeg	581796	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:00.026	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9b7701u1106uvaudkju2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7a278e98-dscf7868.jpg	DSCF7868.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7a278e98-dscf7868.jpg	content/2025-11-20/7a278e98-dscf7868.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9c34833a-thumb-dscf7868.jpg	IMAGE	image/jpeg	564773	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:01.747	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9bvg01u5106ugo1na2lj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/015367bc-dscf7867.jpg	DSCF7867.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/015367bc-dscf7867.jpg	content/2025-11-20/015367bc-dscf7867.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ea9e081f-thumb-dscf7867.jpg	IMAGE	image/jpeg	558387	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:02.62	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9cqx01u9106unmf2usqy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/510db44b-dscf7869.jpg	DSCF7869.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/510db44b-dscf7869.jpg	content/2025-11-20/510db44b-dscf7869.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0da5e496-thumb-dscf7869.jpg	IMAGE	image/jpeg	488111	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:03.753	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9dkr01ud106unlgjkoaf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d58c3758-dscf7870.jpg	DSCF7870.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d58c3758-dscf7870.jpg	content/2025-11-20/d58c3758-dscf7870.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0dd0a75e-thumb-dscf7870.jpg	IMAGE	image/jpeg	483124	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:04.827	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9dnr01uh106ug30m5dym	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c3c7905f-dscf7871.jpg	DSCF7871.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c3c7905f-dscf7871.jpg	content/2025-11-20/c3c7905f-dscf7871.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/827e6e14-thumb-dscf7871.jpg	IMAGE	image/jpeg	482826	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:04.935	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9gcd01ut106u96a8onwt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b8141af7-dscf7874.jpg	DSCF7874.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b8141af7-dscf7874.jpg	content/2025-11-20/b8141af7-dscf7874.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/26b895c6-thumb-dscf7874.jpg	IMAGE	image/jpeg	589946	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:08.413	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9ibl01ux106u9yiqctcn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d4f4e0e8-dscf7876.jpg	DSCF7876.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d4f4e0e8-dscf7876.jpg	content/2025-11-20/d4f4e0e8-dscf7876.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/347acf93-thumb-dscf7876.jpg	IMAGE	image/jpeg	716245	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:10.977	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9jgt01v1106u3cg0unyk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0841e724-dscf7875.jpg	DSCF7875.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0841e724-dscf7875.jpg	content/2025-11-20/0841e724-dscf7875.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4d29b71f-thumb-dscf7875.jpg	IMAGE	image/jpeg	590551	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:12.461	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9kwa01v9106u7a1070zp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f921366f-dscf7878.jpg	DSCF7878.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f921366f-dscf7878.jpg	content/2025-11-20/f921366f-dscf7878.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/631fc7e8-thumb-dscf7878.jpg	IMAGE	image/jpeg	689452	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:14.314	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9jhk01v5106udhn5sqfl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/02ac1cca-dscf7877.jpg	DSCF7877.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/02ac1cca-dscf7877.jpg	content/2025-11-20/02ac1cca-dscf7877.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2308eb75-thumb-dscf7877.jpg	IMAGE	image/jpeg	689120	\N	\N	\N	\N	3927	5890	IN_REVIEW	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:12.487	2025-11-21 11:12:17.488	cmi63yyr80005ejrm5rkshgro
cmi7l9fib01up106u5f72d9jm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/49771333-dscf7873.jpg	DSCF7873.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/49771333-dscf7873.jpg	content/2025-11-20/49771333-dscf7873.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9af89520-thumb-dscf7873.jpg	IMAGE	image/jpeg	572347	\N	\N	\N	\N	4000	6000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:07.331	2025-11-21 16:10:35.621	cmi63yyr80005ejrm5rkshgro
cmi7l9nkf01vh106ut6zg0ji7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/01f6b3de-dscf7881.jpg	DSCF7881.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/01f6b3de-dscf7881.jpg	content/2025-11-20/01f6b3de-dscf7881.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/09e699e5-thumb-dscf7881.jpg	IMAGE	image/jpeg	601129	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:17.775	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9nmo01vl106umva4co5a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/025e9182-dscf7880.jpg	DSCF7880.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/025e9182-dscf7880.jpg	content/2025-11-20/025e9182-dscf7880.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/517ffb98-thumb-dscf7880.jpg	IMAGE	image/jpeg	619858	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:17.856	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9ntc01vp106u4jcv9w8y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a1cd5643-dscf7882.jpg	DSCF7882.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a1cd5643-dscf7882.jpg	content/2025-11-20/a1cd5643-dscf7882.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8ea07978-thumb-dscf7882.jpg	IMAGE	image/jpeg	530608	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:18.096	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9o6101vt106uyrel3g0t	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cecdccb5-dscf7883.jpg	DSCF7883.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cecdccb5-dscf7883.jpg	content/2025-11-20/cecdccb5-dscf7883.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/78bed873-thumb-dscf7883.jpg	IMAGE	image/jpeg	546158	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:18.553	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9rj901vx106u3gmry6z3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fafe0c49-dscf7886.jpg	DSCF7886.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fafe0c49-dscf7886.jpg	content/2025-11-20/fafe0c49-dscf7886.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dc2c8298-thumb-dscf7886.jpg	IMAGE	image/jpeg	514012	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:22.917	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9rn601w1106u523vna1d	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7a2bed47-dscf7884.jpg	DSCF7884.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7a2bed47-dscf7884.jpg	content/2025-11-20/7a2bed47-dscf7884.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f462545b-thumb-dscf7884.jpg	IMAGE	image/jpeg	579145	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:23.058	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9s0k01w5106u86h6vmq7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bcfe909a-dscf7885.jpg	DSCF7885.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bcfe909a-dscf7885.jpg	content/2025-11-20/bcfe909a-dscf7885.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5584d048-thumb-dscf7885.jpg	IMAGE	image/jpeg	513784	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:23.54	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7l9s4801w9106uu6nnbo0r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/baa9e084-dscf7887.jpg	DSCF7887.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/baa9e084-dscf7887.jpg	content/2025-11-20/baa9e084-dscf7887.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/594abe2e-thumb-dscf7887.jpg	IMAGE	image/jpeg	646568	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:23.672	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la01b01wd106uqbdnzoov	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0dc898cf-dscf7888.jpg	DSCF7888.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0dc898cf-dscf7888.jpg	content/2025-11-20/0dc898cf-dscf7888.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f9416e95-thumb-dscf7888.jpg	IMAGE	image/jpeg	671173	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:33.935	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la0ew01wl106uxeuyomhg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5f3be503-dscf7890.jpg	DSCF7890.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5f3be503-dscf7890.jpg	content/2025-11-20/5f3be503-dscf7890.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ce9afb7b-thumb-dscf7890.jpg	IMAGE	image/jpeg	446045	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:34.424	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la10o01wp106uz7sl2sj7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6949d2d4-dscf7891.jpg	DSCF7891.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6949d2d4-dscf7891.jpg	content/2025-11-20/6949d2d4-dscf7891.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/14216aac-thumb-dscf7891.jpg	IMAGE	image/jpeg	457638	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:35.208	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la3d501wt106u2j5jzuxy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9bcce868-dscf7892.jpg	DSCF7892.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9bcce868-dscf7892.jpg	content/2025-11-20/9bcce868-dscf7892.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e5d8e7ef-thumb-dscf7892.jpg	IMAGE	image/jpeg	453364	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:38.25	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la4lq01x1106urldhszfi	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2f0feb9e-dscf7895.jpg	DSCF7895.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2f0feb9e-dscf7895.jpg	content/2025-11-20/2f0feb9e-dscf7895.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/88411574-thumb-dscf7895.jpg	IMAGE	image/jpeg	457659	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:39.854	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la3t501wx106upbcvh1ff	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c768bb7b-dscf7893.jpg	DSCF7893.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c768bb7b-dscf7893.jpg	content/2025-11-20/c768bb7b-dscf7893.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c9624852-thumb-dscf7893.jpg	IMAGE	image/jpeg	478211	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:38.825	2025-11-23 14:31:32.82	cmi63yyr80005ejrm5rkshgro
cmi7la4rg01x5106u99rzgrr1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/70436fd0-dscf7894.jpg	DSCF7894.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/70436fd0-dscf7894.jpg	content/2025-11-20/70436fd0-dscf7894.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d64bc99e-thumb-dscf7894.jpg	IMAGE	image/jpeg	479899	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:40.06	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la6o801x9106u43tuicnd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c9590add-dscf7897.jpg	DSCF7897.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c9590add-dscf7897.jpg	content/2025-11-20/c9590add-dscf7897.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ab6c6aad-thumb-dscf7897.jpg	IMAGE	image/jpeg	435351	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:42.535	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la6rr01xd106uobssyul0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7d1fd521-dscf7896.jpg	DSCF7896.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7d1fd521-dscf7896.jpg	content/2025-11-20/7d1fd521-dscf7896.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ac4d94d0-thumb-dscf7896.jpg	IMAGE	image/jpeg	437364	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:42.663	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la6ui01xh106ud3opan3z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/84b69297-dscf7898.jpg	DSCF7898.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/84b69297-dscf7898.jpg	content/2025-11-20/84b69297-dscf7898.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0b131112-thumb-dscf7898.jpg	IMAGE	image/jpeg	441115	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:42.762	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7la7zp01xl106ubxy5v9v9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6cc0c694-dscf7899.jpg	DSCF7899.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6cc0c694-dscf7899.jpg	content/2025-11-20/6cc0c694-dscf7899.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/88f7de07-thumb-dscf7899.jpg	IMAGE	image/jpeg	443775	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:44.245	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laax001xp106u1x8k30ws	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a4af9415-dscf7900.jpg	DSCF7900.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a4af9415-dscf7900.jpg	content/2025-11-20/a4af9415-dscf7900.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/799f6ee1-thumb-dscf7900.jpg	IMAGE	image/jpeg	529535	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:48.036	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ladeg01xt106uoafad343	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/714c6d08-dscf7901.jpg	DSCF7901.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/714c6d08-dscf7901.jpg	content/2025-11-20/714c6d08-dscf7901.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1305e1a8-thumb-dscf7901.jpg	IMAGE	image/jpeg	530007	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:51.256	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laedw01xx106uw0mp9hsv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/879b9dff-dscf7903.jpg	DSCF7903.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/879b9dff-dscf7903.jpg	content/2025-11-20/879b9dff-dscf7903.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3681992b-thumb-dscf7903.jpg	IMAGE	image/jpeg	535569	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:52.532	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laehx01y1106u0czijcf5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cada6c6c-dscf7902.jpg	DSCF7902.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cada6c6c-dscf7902.jpg	content/2025-11-20/cada6c6c-dscf7902.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a10cb01c-thumb-dscf7902.jpg	IMAGE	image/jpeg	535525	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:52.678	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laeqq01y5106up1ugn6v5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9553261a-dscf7904.jpg	DSCF7904.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9553261a-dscf7904.jpg	content/2025-11-20/9553261a-dscf7904.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1d2d1df2-thumb-dscf7904.jpg	IMAGE	image/jpeg	528692	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:52.994	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lajp701yl106ud1thed5y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a41fbd27-dscf7909.jpg	DSCF7909.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a41fbd27-dscf7909.jpg	content/2025-11-20/a41fbd27-dscf7909.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/10082926-thumb-dscf7909.jpg	IMAGE	image/jpeg	457539	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:59.419	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laktb01yp106ukwxrsmcr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ecf538c1-dscf7908.jpg	DSCF7908.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ecf538c1-dscf7908.jpg	content/2025-11-20/ecf538c1-dscf7908.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5e4f584d-thumb-dscf7908.jpg	IMAGE	image/jpeg	450046	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:00.863	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laiax01yd106umgjudp0p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6b3c45ba-dscf7907.jpg	DSCF7907.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6b3c45ba-dscf7907.jpg	content/2025-11-20/6b3c45ba-dscf7907.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d60ff999-thumb-dscf7907.jpg	IMAGE	image/jpeg	463950	\N	\N	\N	\N	4000	6000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:57.609	2025-11-23 14:23:00.996	cmi63yyr80005ejrm5rkshgro
cmi7laix601yh106u8t8kjvee	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/121af3f4-dscf7905.jpg	DSCF7905.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/121af3f4-dscf7905.jpg	content/2025-11-20/121af3f4-dscf7905.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/25493769-thumb-dscf7905.jpg	IMAGE	image/jpeg	563131	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:31:58.41	2025-11-23 14:39:10.459	cmi63yyr80005ejrm5rkshgro
cmi7lamq701yt106uhq0zaw2u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/92e8d2f6-dscf7910.jpg	DSCF7910.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/92e8d2f6-dscf7910.jpg	content/2025-11-20/92e8d2f6-dscf7910.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f7fa55c2-thumb-dscf7910.jpg	IMAGE	image/jpeg	378488	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:03.342	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lamvi01yx106uj2nt2da1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/20f18738-dscf7911.jpg	DSCF7911.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/20f18738-dscf7911.jpg	content/2025-11-20/20f18738-dscf7911.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a2620759-thumb-dscf7911.jpg	IMAGE	image/jpeg	452008	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:03.534	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lanoh01z1106uiugshaq0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/649ab010-dscf7912.jpg	DSCF7912.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/649ab010-dscf7912.jpg	content/2025-11-20/649ab010-dscf7912.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5ac2b536-thumb-dscf7912.jpg	IMAGE	image/jpeg	516476	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:04.577	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lanp201z5106u31jivbce	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0be1d745-dscf7913.jpg	DSCF7913.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0be1d745-dscf7913.jpg	content/2025-11-20/0be1d745-dscf7913.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fe48f369-thumb-dscf7913.jpg	IMAGE	image/jpeg	510181	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:04.598	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laro901z9106upkhelftm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a8630b6f-dscf7915.jpg	DSCF7915.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a8630b6f-dscf7915.jpg	content/2025-11-20/a8630b6f-dscf7915.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/202c28fa-thumb-dscf7915.jpg	IMAGE	image/jpeg	497441	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:09.753	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7las1001zd106uibqvih4a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5485810a-dscf7917.jpg	DSCF7917.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5485810a-dscf7917.jpg	content/2025-11-20/5485810a-dscf7917.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/86c5eda6-thumb-dscf7917.jpg	IMAGE	image/jpeg	507378	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:10.212	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7las2k01zh106upvghmapo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/361ebd98-dscf7914.jpg	DSCF7914.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/361ebd98-dscf7914.jpg	content/2025-11-20/361ebd98-dscf7914.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e247b6cd-thumb-dscf7914.jpg	IMAGE	image/jpeg	505104	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:10.268	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7las5801zl106unrrb2xqx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/395460ca-dscf7916.jpg	DSCF7916.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/395460ca-dscf7916.jpg	content/2025-11-20/395460ca-dscf7916.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/db9366d4-thumb-dscf7916.jpg	IMAGE	image/jpeg	516090	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:10.364	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lavml01zp106ucs6up4i8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/15bed4f3-dscf7918.jpg	DSCF7918.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/15bed4f3-dscf7918.jpg	content/2025-11-20/15bed4f3-dscf7918.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7b76f0af-thumb-dscf7918.jpg	IMAGE	image/jpeg	448188	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:14.877	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lawei01zx106ueklquj3g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f14be53f-dscf7920.jpg	DSCF7920.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f14be53f-dscf7920.jpg	content/2025-11-20/f14be53f-dscf7920.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/842a9afa-thumb-dscf7920.jpg	IMAGE	image/jpeg	445521	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:15.882	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laxtv0201106usje5lu8i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b655152d-dscf7919.jpg	DSCF7919.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b655152d-dscf7919.jpg	content/2025-11-20/b655152d-dscf7919.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fc708169-thumb-dscf7919.jpg	IMAGE	image/jpeg	449894	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:17.731	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7layp00205106u8kybjs22	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9af21dad-dscf7922.jpg	DSCF7922.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9af21dad-dscf7922.jpg	content/2025-11-20/9af21dad-dscf7922.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/50d4b779-thumb-dscf7922.jpg	IMAGE	image/jpeg	505008	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:18.851	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laz300209106ukuv4q8oc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d4f60f10-dscf7923.jpg	DSCF7923.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d4f60f10-dscf7923.jpg	content/2025-11-20/d4f60f10-dscf7923.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c311a88c-thumb-dscf7923.jpg	IMAGE	image/jpeg	420832	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:19.357	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7laziw020d106uz5dk6up5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1a4985a8-dscf7924.jpg	DSCF7924.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1a4985a8-dscf7924.jpg	content/2025-11-20/1a4985a8-dscf7924.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3e037b54-thumb-dscf7924.jpg	IMAGE	image/jpeg	420368	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:19.926	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb1j4020h106ub3uqefoq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/654f3747-dscf7926.jpg	DSCF7926.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/654f3747-dscf7926.jpg	content/2025-11-20/654f3747-dscf7926.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/37920f28-thumb-dscf7926.jpg	IMAGE	image/jpeg	430429	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:22.528	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb1kv020l106ur7u349pi	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/434abdd5-dscf7927.jpg	DSCF7927.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/434abdd5-dscf7927.jpg	content/2025-11-20/434abdd5-dscf7927.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/aa4fbd92-thumb-dscf7927.jpg	IMAGE	image/jpeg	410862	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:22.591	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb3wd020p106uwhc7xejh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fd49198d-dscf7929.jpg	DSCF7929.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fd49198d-dscf7929.jpg	content/2025-11-20/fd49198d-dscf7929.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b32dead8-thumb-dscf7929.jpg	IMAGE	image/jpeg	422106	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:25.597	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb4pk020t106utkhx39si	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8e8a7cb8-dscf7928.jpg	DSCF7928.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8e8a7cb8-dscf7928.jpg	content/2025-11-20/8e8a7cb8-dscf7928.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8a6f1974-thumb-dscf7928.jpg	IMAGE	image/jpeg	421446	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:26.648	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb79o020x106uqjrvosho	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4b48a44f-dscf7930.jpg	DSCF7930.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4b48a44f-dscf7930.jpg	content/2025-11-20/4b48a44f-dscf7930.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/832667a0-thumb-dscf7930.jpg	IMAGE	image/jpeg	426893	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:29.964	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb7aq0211106ueqn9x7dp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ce3f324f-dscf7931.jpg	DSCF7931.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ce3f324f-dscf7931.jpg	content/2025-11-20/ce3f324f-dscf7931.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/68651351-thumb-dscf7931.jpg	IMAGE	image/jpeg	421321	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:30.002	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb7no0215106ufv2wq5yg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dda77ea3-dscf7932.jpg	DSCF7932.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dda77ea3-dscf7932.jpg	content/2025-11-20/dda77ea3-dscf7932.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9e0e5f63-thumb-dscf7932.jpg	IMAGE	image/jpeg	419698	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:30.468	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lb7t70219106uxb6ytd1n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c165e001-dscf7933.jpg	DSCF7933.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c165e001-dscf7933.jpg	content/2025-11-20/c165e001-dscf7933.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d1534755-thumb-dscf7933.jpg	IMAGE	image/jpeg	432162	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:30.667	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbaij021d106u6240g1m5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fdfbaec6-dscf7935.jpg	DSCF7935.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fdfbaec6-dscf7935.jpg	content/2025-11-20/fdfbaec6-dscf7935.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7898fcdf-thumb-dscf7935.jpg	IMAGE	image/jpeg	433971	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:34.17	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbaqt021h106uppuvisty	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/20cf53c6-dscf7937.jpg	DSCF7937.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/20cf53c6-dscf7937.jpg	content/2025-11-20/20cf53c6-dscf7937.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e98cccaf-thumb-dscf7937.jpg	IMAGE	image/jpeg	447028	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:34.469	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbbbc021l106u1l89ldss	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dc6dc2ae-dscf7934.jpg	DSCF7934.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dc6dc2ae-dscf7934.jpg	content/2025-11-20/dc6dc2ae-dscf7934.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ad464a69-thumb-dscf7934.jpg	IMAGE	image/jpeg	434811	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:35.208	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbbig021p106utjg1b2hk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0c770301-dscf7938.jpg	DSCF7938.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0c770301-dscf7938.jpg	content/2025-11-20/0c770301-dscf7938.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c4ab9fb1-thumb-dscf7938.jpg	IMAGE	image/jpeg	443473	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:35.465	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbdhw021t106up5vslgyz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/01ca1913-dscf7939.jpg	DSCF7939.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/01ca1913-dscf7939.jpg	content/2025-11-20/01ca1913-dscf7939.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c12c08a9-thumb-dscf7939.jpg	IMAGE	image/jpeg	442303	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:38.036	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbfmk021x106urywkgw9y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/346e9207-dscf7940.jpg	DSCF7940.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/346e9207-dscf7940.jpg	content/2025-11-20/346e9207-dscf7940.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/67349728-thumb-dscf7940.jpg	IMAGE	image/jpeg	426951	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:40.796	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbhh50221106uiz325fcu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8eaaa11f-dscf7945.jpg	DSCF7945.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8eaaa11f-dscf7945.jpg	content/2025-11-20/8eaaa11f-dscf7945.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4794e369-thumb-dscf7945.jpg	IMAGE	image/jpeg	416663	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:43.193	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbhrq0225106ukrgjep1v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/101678dd-dscf7943.jpg	DSCF7943.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/101678dd-dscf7943.jpg	content/2025-11-20/101678dd-dscf7943.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4cec4946-thumb-dscf7943.jpg	IMAGE	image/jpeg	424999	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:43.574	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbhvp0229106uekere214	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a3c62c74-dscf7944.jpg	DSCF7944.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a3c62c74-dscf7944.jpg	content/2025-11-20/a3c62c74-dscf7944.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/81888854-thumb-dscf7944.jpg	IMAGE	image/jpeg	417165	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:43.717	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbi5z022d106usa7cr5f0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4ff608e4-dscf7946.jpg	DSCF7946.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4ff608e4-dscf7946.jpg	content/2025-11-20/4ff608e4-dscf7946.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7ae8bdce-thumb-dscf7946.jpg	IMAGE	image/jpeg	418405	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:44.087	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbl45022h106uoufheh2y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/610da2a9-dscf7947.jpg	DSCF7947.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/610da2a9-dscf7947.jpg	content/2025-11-20/610da2a9-dscf7947.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/038e1df9-thumb-dscf7947.jpg	IMAGE	image/jpeg	426699	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:47.909	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbpkk022l106ubn141ci3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/26d10d3d-dscf7949.jpg	DSCF7949.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/26d10d3d-dscf7949.jpg	content/2025-11-20/26d10d3d-dscf7949.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3b5dce38-thumb-dscf7949.jpg	IMAGE	image/jpeg	485812	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:53.684	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbpt7022p106uyoic9met	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/47d9ba76-dscf7951.jpg	DSCF7951.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/47d9ba76-dscf7951.jpg	content/2025-11-20/47d9ba76-dscf7951.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d817b236-thumb-dscf7951.jpg	IMAGE	image/jpeg	471224	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:53.995	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbpua022t106u2rhhdjic	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1d6cca6e-dscf7948.jpg	DSCF7948.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1d6cca6e-dscf7948.jpg	content/2025-11-20/1d6cca6e-dscf7948.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3464d98f-thumb-dscf7948.jpg	IMAGE	image/jpeg	442289	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:54.034	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbqap022x106ukoqxvgce	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ed683097-dscf7950.jpg	DSCF7950.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ed683097-dscf7950.jpg	content/2025-11-20/ed683097-dscf7950.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ef806e2a-thumb-dscf7950.jpg	IMAGE	image/jpeg	467104	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:32:54.625	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbwqx0231106uvb19tfl1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/403e1167-dscf7955.jpg	DSCF7955.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/403e1167-dscf7955.jpg	content/2025-11-20/403e1167-dscf7955.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/81c793c0-thumb-dscf7955.jpg	IMAGE	image/jpeg	434824	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:02.985	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbx5r0235106urncppr3x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/98721405-dscf7953.jpg	DSCF7953.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/98721405-dscf7953.jpg	content/2025-11-20/98721405-dscf7953.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2b635cb1-thumb-dscf7953.jpg	IMAGE	image/jpeg	438675	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:03.519	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbxbr0239106uhl8mbnw5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/db717465-dscf7956.jpg	DSCF7956.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/db717465-dscf7956.jpg	content/2025-11-20/db717465-dscf7956.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6a753c4c-thumb-dscf7956.jpg	IMAGE	image/jpeg	493868	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:03.735	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lbxm4023d106uryxvs8r5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6048e73f-dscf7952.jpg	DSCF7952.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6048e73f-dscf7952.jpg	content/2025-11-20/6048e73f-dscf7952.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/38f8bc13-thumb-dscf7952.jpg	IMAGE	image/jpeg	469969	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:04.108	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lc7rg023h106u2x55w7br	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b48633ea-dscf7960.jpg	DSCF7960.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b48633ea-dscf7960.jpg	content/2025-11-20/b48633ea-dscf7960.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/18d01d5c-thumb-dscf7960.jpg	IMAGE	image/jpeg	446781	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:17.26	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lc8z6023l106usp5zuh87	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a161cef4-dscf7959.jpg	DSCF7959.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a161cef4-dscf7959.jpg	content/2025-11-20/a161cef4-dscf7959.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8c195e49-thumb-dscf7959.jpg	IMAGE	image/jpeg	433922	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:18.834	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcacz023p106u9cz8c6ns	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6b3974ca-dscf7964.jpg	DSCF7964.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6b3974ca-dscf7964.jpg	content/2025-11-20/6b3974ca-dscf7964.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b9b92d0d-thumb-dscf7964.jpg	IMAGE	image/jpeg	447788	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:20.627	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcb5i023t106u53kmdbsd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b382f2cd-dscf7961.jpg	DSCF7961.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b382f2cd-dscf7961.jpg	content/2025-11-20/b382f2cd-dscf7961.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/19f67567-thumb-dscf7961.jpg	IMAGE	image/jpeg	441773	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:21.654	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcbii023x106umjcksgyr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3cacaeb9-dscf7963.jpg	DSCF7963.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3cacaeb9-dscf7963.jpg	content/2025-11-20/3cacaeb9-dscf7963.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4adbfd82-thumb-dscf7963.jpg	IMAGE	image/jpeg	456939	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:22.122	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcbnm0241106uw6enz836	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ef55273c-dscf7962.jpg	DSCF7962.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ef55273c-dscf7962.jpg	content/2025-11-20/ef55273c-dscf7962.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9745fa14-thumb-dscf7962.jpg	IMAGE	image/jpeg	504437	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:22.306	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcd0y0245106uu5yimdpn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d13d97ba-dscf7966.jpg	DSCF7966.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d13d97ba-dscf7966.jpg	content/2025-11-20/d13d97ba-dscf7966.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ab699d37-thumb-dscf7966.jpg	IMAGE	image/jpeg	560708	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:24.082	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcge00249106ur7mwbvyq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c5b6e701-dscf7967.jpg	DSCF7967.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c5b6e701-dscf7967.jpg	content/2025-11-20/c5b6e701-dscf7967.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1135b5bf-thumb-dscf7967.jpg	IMAGE	image/jpeg	545970	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:28.44	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcgyf024d106um6piukjc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/851f89f7-dscf7968.jpg	DSCF7968.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/851f89f7-dscf7968.jpg	content/2025-11-20/851f89f7-dscf7968.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ea84966e-thumb-dscf7968.jpg	IMAGE	image/jpeg	464967	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:29.175	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lch4b024h106ubphx1nrg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/80b49f27-dscf7970.jpg	DSCF7970.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/80b49f27-dscf7970.jpg	content/2025-11-20/80b49f27-dscf7970.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/08217487-thumb-dscf7970.jpg	IMAGE	image/jpeg	514669	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:29.387	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lchn1024l106ue0h9l8cy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b7fab0f7-dscf7969.jpg	DSCF7969.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b7fab0f7-dscf7969.jpg	content/2025-11-20/b7fab0f7-dscf7969.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/82cd1362-thumb-dscf7969.jpg	IMAGE	image/jpeg	477275	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:30.062	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcim8024p106ubhgbjcpw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b478a0de-dscf7971.jpg	DSCF7971.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b478a0de-dscf7971.jpg	content/2025-11-20/b478a0de-dscf7971.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c118ccc8-thumb-dscf7971.jpg	IMAGE	image/jpeg	456640	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:31.328	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lclc1024t106uezmv2zkv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2feaafba-dscf7973.jpg	DSCF7973.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2feaafba-dscf7973.jpg	content/2025-11-20/2feaafba-dscf7973.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/338ea4d0-thumb-dscf7973.jpg	IMAGE	image/jpeg	433782	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:34.849	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcluy024x106uc301oxkc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/72a32f7f-dscf7972.jpg	DSCF7972.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/72a32f7f-dscf7972.jpg	content/2025-11-20/72a32f7f-dscf7972.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2d157157-thumb-dscf7972.jpg	IMAGE	image/jpeg	587120	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:35.53	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lclwi0251106usakzjrew	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0f9ae858-dscf7975.jpg	DSCF7975.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0f9ae858-dscf7975.jpg	content/2025-11-20/0f9ae858-dscf7975.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c1b112ab-thumb-dscf7975.jpg	IMAGE	image/jpeg	432096	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:35.586	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcm600255106uyv0c89h3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a9548697-dscf7974.jpg	DSCF7974.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a9548697-dscf7974.jpg	content/2025-11-20/a9548697-dscf7974.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/82fe5f81-thumb-dscf7974.jpg	IMAGE	image/jpeg	428720	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:35.928	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lco8j0259106uenu4yp99	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/69ade6c8-dscf7976.jpg	DSCF7976.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/69ade6c8-dscf7976.jpg	content/2025-11-20/69ade6c8-dscf7976.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/928756a1-thumb-dscf7976.jpg	IMAGE	image/jpeg	428945	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:38.612	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcpcv025h106ue89dwj0c	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/8fc3bc43-dscf7977.jpg	DSCF7977.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/8fc3bc43-dscf7977.jpg	content/2025-11-20/8fc3bc43-dscf7977.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/df1e15ce-thumb-dscf7977.jpg	IMAGE	image/jpeg	438653	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:40.063	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcprz025l106u89ibfm3f	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/308dd5df-dscf7979.jpg	DSCF7979.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/308dd5df-dscf7979.jpg	content/2025-11-20/308dd5df-dscf7979.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ae281289-thumb-dscf7979.jpg	IMAGE	image/jpeg	459893	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:40.607	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcrb4025p106u71g1gzt2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/66c57d32-dscf7980.jpg	DSCF7980.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/66c57d32-dscf7980.jpg	content/2025-11-20/66c57d32-dscf7980.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e0a5e699-thumb-dscf7980.jpg	IMAGE	image/jpeg	449549	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:42.592	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcsdm025t106ubu4uo8uj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/89701039-dscf7981.jpg	DSCF7981.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/89701039-dscf7981.jpg	content/2025-11-20/89701039-dscf7981.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/df51bdf8-thumb-dscf7981.jpg	IMAGE	image/jpeg	469281	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:43.978	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lctjf025x106ue53qpwzx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3f4c9783-dscf7983.jpg	DSCF7983.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3f4c9783-dscf7983.jpg	content/2025-11-20/3f4c9783-dscf7983.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1922b2e2-thumb-dscf7983.jpg	IMAGE	image/jpeg	456575	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:45.483	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcuib0261106unie5l3e1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7fb72db9-dscf7982.jpg	DSCF7982.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7fb72db9-dscf7982.jpg	content/2025-11-20/7fb72db9-dscf7982.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2269a8c0-thumb-dscf7982.jpg	IMAGE	image/jpeg	489336	\N	\N	\N	\N	3851	5776	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:46.739	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcumy0265106ub7etb872	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f2d47cee-dscf7984.jpg	DSCF7984.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f2d47cee-dscf7984.jpg	content/2025-11-20/f2d47cee-dscf7984.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a5e1f8f0-thumb-dscf7984.jpg	IMAGE	image/jpeg	434499	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:46.905	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcw7z0269106ucvu74c08	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e4f955f9-dscf7985.jpg	DSCF7985.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e4f955f9-dscf7985.jpg	content/2025-11-20/e4f955f9-dscf7985.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/156a00e8-thumb-dscf7985.jpg	IMAGE	image/jpeg	433612	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:48.96	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcxij026h106ujloz8340	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c0852297-dscf7991.jpg	DSCF7991.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c0852297-dscf7991.jpg	content/2025-11-20/c0852297-dscf7991.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2930f84a-thumb-dscf7991.jpg	IMAGE	image/jpeg	442858	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:50.634	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcy5k026l106uqibu03ud	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0c24f1c7-dscf7990.jpg	DSCF7990.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0c24f1c7-dscf7990.jpg	content/2025-11-20/0c24f1c7-dscf7990.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3d0aedb9-thumb-dscf7990.jpg	IMAGE	image/jpeg	439612	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:51.464	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lcypc026p106un0ouly9v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0a9d449a-dscf7992.jpg	DSCF7992.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0a9d449a-dscf7992.jpg	content/2025-11-20/0a9d449a-dscf7992.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7b5fa0d9-thumb-dscf7992.jpg	IMAGE	image/jpeg	436864	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:52.176	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld0eg026t106ufeg9v5hc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/72e596d4-dscf7993.jpg	DSCF7993.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/72e596d4-dscf7993.jpg	content/2025-11-20/72e596d4-dscf7993.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/84c328cb-thumb-dscf7993.jpg	IMAGE	image/jpeg	442231	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:54.375	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld17q026x106uise3dyhu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3deeceb3-dscf7996.jpg	DSCF7996.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3deeceb3-dscf7996.jpg	content/2025-11-20/3deeceb3-dscf7996.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4277a8ff-thumb-dscf7996.jpg	IMAGE	image/jpeg	505875	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:55.43	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld2i40271106uswxeoo1x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/62ba9da2-dscf7997.jpg	DSCF7997.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/62ba9da2-dscf7997.jpg	content/2025-11-20/62ba9da2-dscf7997.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3fa0c4d8-thumb-dscf7997.jpg	IMAGE	image/jpeg	515861	\N	\N	\N	\N	3837	5755	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:57.1	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld2nn0275106u61razo8w	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bf412bf8-dscf7998.jpg	DSCF7998.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bf412bf8-dscf7998.jpg	content/2025-11-20/bf412bf8-dscf7998.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/79f4c58f-thumb-dscf7998.jpg	IMAGE	image/jpeg	466057	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:57.298	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld42h0279106u5aoi9428	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b3ee1c1a-dscf7999.jpg	DSCF7999.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b3ee1c1a-dscf7999.jpg	content/2025-11-20/b3ee1c1a-dscf7999.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/012d57d7-thumb-dscf7999.jpg	IMAGE	image/jpeg	489225	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:59.129	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld4p9027d106ucgpd2ofc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/03178557-dscf8001.jpg	DSCF8001.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/03178557-dscf8001.jpg	content/2025-11-20/03178557-dscf8001.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0087b127-thumb-dscf8001.jpg	IMAGE	image/jpeg	487091	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:33:59.949	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld5gc027h106uzjqc323r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c87ce8e8-dscf8002.jpg	DSCF8002.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c87ce8e8-dscf8002.jpg	content/2025-11-20/c87ce8e8-dscf8002.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/35e12b0d-thumb-dscf8002.jpg	IMAGE	image/jpeg	484761	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:00.924	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld6a7027l106ugefy3dvi	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/06bd0f4d-dscf8003.jpg	DSCF8003.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/06bd0f4d-dscf8003.jpg	content/2025-11-20/06bd0f4d-dscf8003.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/400633b1-thumb-dscf8003.jpg	IMAGE	image/jpeg	493300	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:01.999	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld6ko027p106uhivnrpv3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ff94e98a-dscf8004.jpg	DSCF8004.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ff94e98a-dscf8004.jpg	content/2025-11-20/ff94e98a-dscf8004.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c29a28f8-thumb-dscf8004.jpg	IMAGE	image/jpeg	479176	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:02.376	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7leoj602cp106uyi4ogs8z	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fc588214-dscf8050.jpg	DSCF8050.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fc588214-dscf8050.jpg	content/2025-11-20/fc588214-dscf8050.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5a4a5ef2-thumb-dscf8050.jpg	IMAGE	image/jpeg	659324	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:12.306	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7leqke02ct106uqmr0jfk6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2eb57202-dscf8052.jpg	DSCF8052.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2eb57202-dscf8052.jpg	content/2025-11-20/2eb57202-dscf8052.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/90373cb8-thumb-dscf8052.jpg	IMAGE	image/jpeg	591952	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:14.942	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7leqm602cx106uw080snig	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/267431f2-dscf8051.jpg	DSCF8051.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/267431f2-dscf8051.jpg	content/2025-11-20/267431f2-dscf8051.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6dd559f9-thumb-dscf8051.jpg	IMAGE	image/jpeg	474093	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:15.006	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lerml02d1106u76iieys8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e2639c57-dscf8053.jpg	DSCF8053.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e2639c57-dscf8053.jpg	content/2025-11-20/e2639c57-dscf8053.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e9c0fd9f-thumb-dscf8053.jpg	IMAGE	image/jpeg	584988	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:16.317	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lesic02d5106u0zhvk4a9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2a345a34-dscf8054.jpg	DSCF8054.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2a345a34-dscf8054.jpg	content/2025-11-20/2a345a34-dscf8054.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/27de9545-thumb-dscf8054.jpg	IMAGE	image/jpeg	725965	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:17.46	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7leulg02d9106u7p6brhav	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/14364690-dscf8055.jpg	DSCF8055.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/14364690-dscf8055.jpg	content/2025-11-20/14364690-dscf8055.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3408046e-thumb-dscf8055.jpg	IMAGE	image/jpeg	712635	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:20.164	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lew3q02dd106ubtsr5sm1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ee9e1a4f-dscf8058.jpg	DSCF8058.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ee9e1a4f-dscf8058.jpg	content/2025-11-20/ee9e1a4f-dscf8058.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/81b9de71-thumb-dscf8058.jpg	IMAGE	image/jpeg	764133	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:22.117	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld7we027v106uphj7lh9r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6b215488-dscf8006.jpg	DSCF8006.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6b215488-dscf8006.jpg	content/2025-11-20/6b215488-dscf8006.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/44661316-thumb-dscf8006.jpg	IMAGE	image/jpeg	453302	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:04.094	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld9b80281106uch299xx8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f25baaa1-dscf8007.jpg	DSCF8007.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f25baaa1-dscf8007.jpg	content/2025-11-20/f25baaa1-dscf8007.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bc50f538-thumb-dscf8007.jpg	IMAGE	image/jpeg	455374	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:05.924	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ld9p30285106ubgv9fnts	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/cfafcca4-dscf8008.jpg	DSCF8008.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/cfafcca4-dscf8008.jpg	content/2025-11-20/cfafcca4-dscf8008.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ca1d79cd-thumb-dscf8008.jpg	IMAGE	image/jpeg	453314	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:06.423	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldb2y0289106u3zoft9yh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e21af154-dscf8010.jpg	DSCF8010.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e21af154-dscf8010.jpg	content/2025-11-20/e21af154-dscf8010.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ffdcc8aa-thumb-dscf8010.jpg	IMAGE	image/jpeg	510940	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:08.218	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldb54028d106ulgk38m1b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1ba07b41-dscf8009.jpg	DSCF8009.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1ba07b41-dscf8009.jpg	content/2025-11-20/1ba07b41-dscf8009.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e4b2766f-thumb-dscf8009.jpg	IMAGE	image/jpeg	527121	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:08.296	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldcdk028h106uwu6kyx7w	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a07ace21-dscf8012.jpg	DSCF8012.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a07ace21-dscf8012.jpg	content/2025-11-20/a07ace21-dscf8012.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7c7de0e1-thumb-dscf8012.jpg	IMAGE	image/jpeg	510955	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:09.896	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldcfl028l106uep8g43gl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9d3dbddb-dscf8011.jpg	DSCF8011.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9d3dbddb-dscf8011.jpg	content/2025-11-20/9d3dbddb-dscf8011.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/42774ade-thumb-dscf8011.jpg	IMAGE	image/jpeg	503382	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:09.97	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldf4d028p106ur9ycku07	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/77ac99a8-dscf8014.jpg	DSCF8014.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/77ac99a8-dscf8014.jpg	content/2025-11-20/77ac99a8-dscf8014.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4b9618a9-thumb-dscf8014.jpg	IMAGE	image/jpeg	482902	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:13.454	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldg4c028t106ui4fayc8g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f5a8c8d3-dscf8016.jpg	DSCF8016.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f5a8c8d3-dscf8016.jpg	content/2025-11-20/f5a8c8d3-dscf8016.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/af10fc04-thumb-dscf8016.jpg	IMAGE	image/jpeg	471170	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:14.747	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldghf028x106ugcxzewme	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2fb60783-dscf8015.jpg	DSCF8015.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2fb60783-dscf8015.jpg	content/2025-11-20/2fb60783-dscf8015.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/757a2e47-thumb-dscf8015.jpg	IMAGE	image/jpeg	484188	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:15.219	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldh120291106umfd1631t	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/80661b36-dscf8013.jpg	DSCF8013.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/80661b36-dscf8013.jpg	content/2025-11-20/80661b36-dscf8013.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e8728171-thumb-dscf8013.jpg	IMAGE	image/jpeg	529294	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:15.926	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldjd50295106uje470saf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9945af70-dscf8017.jpg	DSCF8017.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9945af70-dscf8017.jpg	content/2025-11-20/9945af70-dscf8017.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/35de76b4-thumb-dscf8017.jpg	IMAGE	image/jpeg	470551	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:18.953	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldjqe0299106uu8pl5zie	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/98fa0034-dscf8018.jpg	DSCF8018.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/98fa0034-dscf8018.jpg	content/2025-11-20/98fa0034-dscf8018.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/88cb063b-thumb-dscf8018.jpg	IMAGE	image/jpeg	461325	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:19.429	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldkam029d106u3ksd8xc3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bb449045-dscf8019.jpg	DSCF8019.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bb449045-dscf8019.jpg	content/2025-11-20/bb449045-dscf8019.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3a0ee68b-thumb-dscf8019.jpg	IMAGE	image/jpeg	461489	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:20.158	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldlcj029h106ub7cnepdv	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/47d06055-dscf8020.jpg	DSCF8020.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/47d06055-dscf8020.jpg	content/2025-11-20/47d06055-dscf8020.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ebf8d4e2-thumb-dscf8020.jpg	IMAGE	image/jpeg	504561	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:21.522	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldm0q029l106ugnqae5vs	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/52f110be-dscf8021.jpg	DSCF8021.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/52f110be-dscf8021.jpg	content/2025-11-20/52f110be-dscf8021.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/cb6bdaa4-thumb-dscf8021.jpg	IMAGE	image/jpeg	611715	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:22.393	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldn68029p106ueb1dafau	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fab107df-dscf8022.jpg	DSCF8022.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fab107df-dscf8022.jpg	content/2025-11-20/fab107df-dscf8022.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/53dcb072-thumb-dscf8022.jpg	IMAGE	image/jpeg	613066	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:23.888	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldoqe029t106ulxqyk27x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3757203a-dscf8023.jpg	DSCF8023.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3757203a-dscf8023.jpg	content/2025-11-20/3757203a-dscf8023.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3c557643-thumb-dscf8023.jpg	IMAGE	image/jpeg	582248	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:25.91	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldpxl029x106uewl72zbc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/2c1a70db-dscf8024.jpg	DSCF8024.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/2c1a70db-dscf8024.jpg	content/2025-11-20/2c1a70db-dscf8024.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/ccfa0df5-thumb-dscf8024.jpg	IMAGE	image/jpeg	554631	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:27.464	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldqdc02a1106ucoyo43k4	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d1edc6d7-dscf8025.jpg	DSCF8025.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d1edc6d7-dscf8025.jpg	content/2025-11-20/d1edc6d7-dscf8025.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9cabb920-thumb-dscf8025.jpg	IMAGE	image/jpeg	539510	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:28.032	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldqk302a5106u42o9dc9s	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9ca77a93-dscf8026.jpg	DSCF8026.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9ca77a93-dscf8026.jpg	content/2025-11-20/9ca77a93-dscf8026.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8a956422-thumb-dscf8026.jpg	IMAGE	image/jpeg	560086	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:28.275	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldse402a9106uuyzbiuao	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/aca5492a-dscf8027.jpg	DSCF8027.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/aca5492a-dscf8027.jpg	content/2025-11-20/aca5492a-dscf8027.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7529abe9-thumb-dscf8027.jpg	IMAGE	image/jpeg	587407	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:30.652	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldv8702ad106uz1m46u9p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ea2c6bf4-dscf8028.jpg	DSCF8028.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ea2c6bf4-dscf8028.jpg	content/2025-11-20/ea2c6bf4-dscf8028.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/56651d1c-thumb-dscf8028.jpg	IMAGE	image/jpeg	593938	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:34.327	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldwu402ah106uvcjd32rm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/821b5314-dscf8030.jpg	DSCF8030.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/821b5314-dscf8030.jpg	content/2025-11-20/821b5314-dscf8030.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/a35e27d2-thumb-dscf8030.jpg	IMAGE	image/jpeg	573391	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:36.412	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldx9c02al106uyljd0as7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/abdcbbf4-dscf8031.jpg	DSCF8031.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/abdcbbf4-dscf8031.jpg	content/2025-11-20/abdcbbf4-dscf8031.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6cb6f641-thumb-dscf8031.jpg	IMAGE	image/jpeg	588508	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:36.96	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldycb02ap106ul0ir3y16	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e7efadef-dscf8029.jpg	DSCF8029.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e7efadef-dscf8029.jpg	content/2025-11-20/e7efadef-dscf8029.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5575a2aa-thumb-dscf8029.jpg	IMAGE	image/jpeg	583237	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:38.363	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7ldyti02at106uggekvjwj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3fe7760f-dscf8032.jpg	DSCF8032.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3fe7760f-dscf8032.jpg	content/2025-11-20/3fe7760f-dscf8032.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e01dbc7a-thumb-dscf8032.jpg	IMAGE	image/jpeg	575372	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:38.982	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7le46z02ax106uv8rvsqsa	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/23890a5e-dscf8034.jpg	DSCF8034.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/23890a5e-dscf8034.jpg	content/2025-11-20/23890a5e-dscf8034.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d3cec222-thumb-dscf8034.jpg	IMAGE	image/jpeg	581897	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:45.947	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7le4u802b1106u77jjf50m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/faba1970-dscf8033.jpg	DSCF8033.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/faba1970-dscf8033.jpg	content/2025-11-20/faba1970-dscf8033.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bf46459f-thumb-dscf8033.jpg	IMAGE	image/jpeg	583141	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:46.784	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7le5wo02b5106u392x0yoo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1eba8055-dscf8037.jpg	DSCF8037.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1eba8055-dscf8037.jpg	content/2025-11-20/1eba8055-dscf8037.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/16724214-thumb-dscf8037.jpg	IMAGE	image/jpeg	577611	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:48.168	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7le6mh02b9106ufo3dabfc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a07f6f51-dscf8035.jpg	DSCF8035.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a07f6f51-dscf8035.jpg	content/2025-11-20/a07f6f51-dscf8035.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/8eafa635-thumb-dscf8035.jpg	IMAGE	image/jpeg	578555	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:49.097	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7le83f02bd106utdrku7u5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/dbc2072c-dscf8038.jpg	DSCF8038.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/dbc2072c-dscf8038.jpg	content/2025-11-20/dbc2072c-dscf8038.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b8984d16-thumb-dscf8038.jpg	IMAGE	image/jpeg	576346	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:51.002	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7le8j502bh106ulvank65w	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/318eab9b-dscf8039.jpg	DSCF8039.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/318eab9b-dscf8039.jpg	content/2025-11-20/318eab9b-dscf8039.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5da786f0-thumb-dscf8039.jpg	IMAGE	image/jpeg	574018	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:34:51.569	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lef8102bl106uqmnrq0wp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1768f2a7-dscf8040.jpg	DSCF8040.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1768f2a7-dscf8040.jpg	content/2025-11-20/1768f2a7-dscf8040.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9fa9cb69-thumb-dscf8040.jpg	IMAGE	image/jpeg	559494	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:00.241	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7leffo02bp106uxe52q1ke	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/27aa0b5e-dscf8041.jpg	DSCF8041.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/27aa0b5e-dscf8041.jpg	content/2025-11-20/27aa0b5e-dscf8041.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/805777dd-thumb-dscf8041.jpg	IMAGE	image/jpeg	557314	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:00.516	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lei7102bx106un3o3yu1s	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/13f7a824-dscf8042.jpg	DSCF8042.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/13f7a824-dscf8042.jpg	content/2025-11-20/13f7a824-dscf8042.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e11a8bb3-thumb-dscf8042.jpg	IMAGE	image/jpeg	597801	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:04.093	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lej7q02c1106uc1ytdjen	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6fcfd1b6-dscf8047.jpg	DSCF8047.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6fcfd1b6-dscf8047.jpg	content/2025-11-20/6fcfd1b6-dscf8047.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/47e03390-thumb-dscf8047.jpg	IMAGE	image/jpeg	522888	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:05.414	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lek5g02c5106u907kc669	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a475bd99-dscf8044.jpg	DSCF8044.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a475bd99-dscf8044.jpg	content/2025-11-20/a475bd99-dscf8044.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/832a3bad-thumb-dscf8044.jpg	IMAGE	image/jpeg	588827	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:06.628	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lekse02c9106uz5t7neyp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e5b3d542-dscf8045.jpg	DSCF8045.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e5b3d542-dscf8045.jpg	content/2025-11-20/e5b3d542-dscf8045.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/4ee9220b-thumb-dscf8045.jpg	IMAGE	image/jpeg	559270	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:07.454	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lex9x02dl106uqunhwmhr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/bd8b675d-dscf8059.jpg	DSCF8059.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/bd8b675d-dscf8059.jpg	content/2025-11-20/bd8b675d-dscf8059.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/e055bc4e-thumb-dscf8059.jpg	IMAGE	image/jpeg	678761	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:23.637	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lexc602dp106u63sdxh5m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/81782b11-dscf8057.jpg	DSCF8057.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/81782b11-dscf8057.jpg	content/2025-11-20/81782b11-dscf8057.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dadd6201-thumb-dscf8057.jpg	IMAGE	image/jpeg	708944	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:23.718	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf09l02dt106uxrctyn60	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1c4a4412-dscf8061.jpg	DSCF8061.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1c4a4412-dscf8061.jpg	content/2025-11-20/1c4a4412-dscf8061.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fb7128b8-thumb-dscf8061.jpg	IMAGE	image/jpeg	682992	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:27.513	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf2bl02dx106umzye36l3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/63f5a7f4-dscf8063.jpg	DSCF8063.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/63f5a7f4-dscf8063.jpg	content/2025-11-20/63f5a7f4-dscf8063.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bc8ea14b-thumb-dscf8063.jpg	IMAGE	image/jpeg	706603	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:30.178	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf2pv02e1106uk2e5royj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/643ff737-dscf8060.jpg	DSCF8060.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/643ff737-dscf8060.jpg	content/2025-11-20/643ff737-dscf8060.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1e8df8dd-thumb-dscf8060.jpg	IMAGE	image/jpeg	710945	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:30.691	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf30402e5106ul2l2wp10	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0da34768-dscf8062.jpg	DSCF8062.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0da34768-dscf8062.jpg	content/2025-11-20/0da34768-dscf8062.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2de8aca4-thumb-dscf8062.jpg	IMAGE	image/jpeg	702898	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:31.06	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf3il02e9106upfu8904h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/4812279c-dscf8064.jpg	DSCF8064.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/4812279c-dscf8064.jpg	content/2025-11-20/4812279c-dscf8064.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b340d4d0-thumb-dscf8064.jpg	IMAGE	image/jpeg	665673	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:31.725	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf63002ed106u16ft6oel	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a2c46ccc-dscf8067.jpg	DSCF8067.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a2c46ccc-dscf8067.jpg	content/2025-11-20/a2c46ccc-dscf8067.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/36c44aad-thumb-dscf8067.jpg	IMAGE	image/jpeg	672126	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:35.051	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf6df02eh106u1d6pq8xs	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0cd96aec-dscf8066.jpg	DSCF8066.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0cd96aec-dscf8066.jpg	content/2025-11-20/0cd96aec-dscf8066.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0af5f5ab-thumb-dscf8066.jpg	IMAGE	image/jpeg	640021	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:35.428	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf6kk02el106uyjd3966o	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a2d09ef4-dscf8065.jpg	DSCF8065.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a2d09ef4-dscf8065.jpg	content/2025-11-20/a2d09ef4-dscf8065.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/68d59d76-thumb-dscf8065.jpg	IMAGE	image/jpeg	744546	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:35.684	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lf7jt02ep106ueniiksmb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d196e3f5-dscf8068.jpg	DSCF8068.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d196e3f5-dscf8068.jpg	content/2025-11-20/d196e3f5-dscf8068.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/319618ff-thumb-dscf8068.jpg	IMAGE	image/jpeg	658749	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:36.953	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfadw02et106ubr0wzg1a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ac9004c6-dscf8069.jpg	DSCF8069.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ac9004c6-dscf8069.jpg	content/2025-11-20/ac9004c6-dscf8069.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/94bb1220-thumb-dscf8069.jpg	IMAGE	image/jpeg	711613	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:40.628	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfakv02ex106uo032zaz3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/7db3dd0b-dscf8072.jpg	DSCF8072.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/7db3dd0b-dscf8072.jpg	content/2025-11-20/7db3dd0b-dscf8072.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/c5dde31a-thumb-dscf8072.jpg	IMAGE	image/jpeg	411872	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:40.879	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfb3p02f5106u5o8807s5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ec466852-dscf8071.jpg	DSCF8071.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ec466852-dscf8071.jpg	content/2025-11-20/ec466852-dscf8071.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/b1d9380a-thumb-dscf8071.jpg	IMAGE	image/jpeg	398800	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:41.557	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfel602f9106ubypnoeu2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f9ca1d9a-dscf8073.jpg	DSCF8073.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f9ca1d9a-dscf8073.jpg	content/2025-11-20/f9ca1d9a-dscf8073.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/208040aa-thumb-dscf8073.jpg	IMAGE	image/jpeg	411492	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:46.074	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfett02fd106urjn89lzy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/5ffe371d-dscf8075.jpg	DSCF8075.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/5ffe371d-dscf8075.jpg	content/2025-11-20/5ffe371d-dscf8075.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/37d5dd9d-thumb-dscf8075.jpg	IMAGE	image/jpeg	409098	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:46.385	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfeue02fh106uzn5dtdxl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/1f69ace5-dscf8076.jpg	DSCF8076.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/1f69ace5-dscf8076.jpg	content/2025-11-20/1f69ace5-dscf8076.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/bf848116-thumb-dscf8076.jpg	IMAGE	image/jpeg	412569	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:46.406	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfexr02fl106u1njg3ha3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/846cb3e1-dscf8074.jpg	DSCF8074.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/846cb3e1-dscf8074.jpg	content/2025-11-20/846cb3e1-dscf8074.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/eeeae0b5-thumb-dscf8074.jpg	IMAGE	image/jpeg	411258	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:46.527	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfkto02fp106u2t63xo1l	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/82eb3e22-dscf8077.jpg	DSCF8077.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/82eb3e22-dscf8077.jpg	content/2025-11-20/82eb3e22-dscf8077.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/35c9f3ad-thumb-dscf8077.jpg	IMAGE	image/jpeg	422947	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:54.155	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfawq02f1106uwpp7hm8h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/90e1775c-dscf8070.jpg	DSCF8070.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/90e1775c-dscf8070.jpg	content/2025-11-20/90e1775c-dscf8070.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6cbeea7e-thumb-dscf8070.jpg	IMAGE	image/jpeg	747324	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:41.306	2025-11-23 07:28:38.492	cmi63yyr80005ejrm5rkshgro
cmi7lfl5k02fx106usu4qztij	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6a7322cc-dscf8080.jpg	DSCF8080.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6a7322cc-dscf8080.jpg	content/2025-11-20/6a7322cc-dscf8080.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d079bb56-thumb-dscf8080.jpg	IMAGE	image/jpeg	417515	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:54.584	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfl5z02g1106ums8u2pbk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/91b92f1d-dscf8079.jpg	DSCF8079.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/91b92f1d-dscf8079.jpg	content/2025-11-20/91b92f1d-dscf8079.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5a438772-thumb-dscf8079.jpg	IMAGE	image/jpeg	411639	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:54.599	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfotb02g9106upi38ur9i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f32897e8-dscf8082.jpg	DSCF8082.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f32897e8-dscf8082.jpg	content/2025-11-20/f32897e8-dscf8082.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/3b94b56c-thumb-dscf8082.jpg	IMAGE	image/jpeg	417568	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:59.326	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfpqv02gd106u983mc4hw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/d8967769-dscf8084.jpg	DSCF8084.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/d8967769-dscf8084.jpg	content/2025-11-20/d8967769-dscf8084.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/81343138-thumb-dscf8084.jpg	IMAGE	image/jpeg	468223	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:00.523	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfq1x02gh106uv95amv3h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/f03d1d2f-dscf8083.jpg	DSCF8083.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/f03d1d2f-dscf8083.jpg	content/2025-11-20/f03d1d2f-dscf8083.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/2155859f-thumb-dscf8083.jpg	IMAGE	image/jpeg	419177	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:00.933	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfrhg02gl106uaeiadyth	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e594ed57-dscf8085.jpg	DSCF8085.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e594ed57-dscf8085.jpg	content/2025-11-20/e594ed57-dscf8085.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/899ec199-thumb-dscf8085.jpg	IMAGE	image/jpeg	421754	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:02.788	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfsvl02gt106u3jimukb7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/0dc39c9e-dscf8087.jpg	DSCF8087.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/0dc39c9e-dscf8087.jpg	content/2025-11-20/0dc39c9e-dscf8087.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31eca040-thumb-dscf8087.jpg	IMAGE	image/jpeg	438258	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:04.594	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfub702gx106uo5lmajrt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fbd57c70-dscf8088.jpg	DSCF8088.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fbd57c70-dscf8088.jpg	content/2025-11-20/fbd57c70-dscf8088.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/60cfb242-thumb-dscf8088.jpg	IMAGE	image/jpeg	448020	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:06.451	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfv8r02h1106uog4eiuhq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/04f91c77-dscf8090.jpg	DSCF8090.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/04f91c77-dscf8090.jpg	content/2025-11-20/04f91c77-dscf8090.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/85b6b1c2-thumb-dscf8090.jpg	IMAGE	image/jpeg	453298	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:07.659	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfvhx02h5106uqu7ptx7b	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e84fbca7-dscf8089.jpg	DSCF8089.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e84fbca7-dscf8089.jpg	content/2025-11-20/e84fbca7-dscf8089.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/d549e44d-thumb-dscf8089.jpg	IMAGE	image/jpeg	446442	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:07.99	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfw6e02h9106urxmbzcxb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/485ad0a3-dscf8091.jpg	DSCF8091.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/485ad0a3-dscf8091.jpg	content/2025-11-20/485ad0a3-dscf8091.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/dc2a33ef-thumb-dscf8091.jpg	IMAGE	image/jpeg	457842	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:08.87	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfxvx02hd106u114cx93l	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/a41ca2f5-dscf8093.jpg	DSCF8093.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/a41ca2f5-dscf8093.jpg	content/2025-11-20/a41ca2f5-dscf8093.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/5892820f-thumb-dscf8093.jpg	IMAGE	image/jpeg	434873	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:11.085	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfy2602hh106ul6osnevy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/ac04ef28-dscf8092.jpg	DSCF8092.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/ac04ef28-dscf8092.jpg	content/2025-11-20/ac04ef28-dscf8092.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/7c73ac08-thumb-dscf8092.jpg	IMAGE	image/jpeg	444401	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:11.31	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfo6102g5106uftc3llvm	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/e20c9166-dscf8081.jpg	DSCF8081.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/e20c9166-dscf8081.jpg	content/2025-11-20/e20c9166-dscf8081.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/0c3329e6-thumb-dscf8081.jpg	IMAGE	image/jpeg	412431	\N	\N	\N	\N	3927	5890	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:35:58.489	2025-11-22 10:32:09.704	cmi63yyr80005ejrm5rkshgro
cmi7lfyf202hl106urplflniq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/475d8760-dscf8094.jpg	DSCF8094.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/475d8760-dscf8094.jpg	content/2025-11-20/475d8760-dscf8094.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f7d5f798-thumb-dscf8094.jpg	IMAGE	image/jpeg	434110	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:11.774	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lfzrl02hp106u7om0d88m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/50f73bf9-dscf8095.jpg	DSCF8095.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/50f73bf9-dscf8095.jpg	content/2025-11-20/50f73bf9-dscf8095.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9fb93791-thumb-dscf8095.jpg	IMAGE	image/jpeg	437381	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:13.521	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lg0ev02ht106uxygmimnd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/b1f2bcd7-dscf8096.jpg	DSCF8096.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/b1f2bcd7-dscf8096.jpg	content/2025-11-20/b1f2bcd7-dscf8096.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9e60e860-thumb-dscf8096.jpg	IMAGE	image/jpeg	438124	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:14.359	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lg27y02hx106up2tlz8ug	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/3cfa3947-dscf8097.jpg	DSCF8097.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/3cfa3947-dscf8097.jpg	content/2025-11-20/3cfa3947-dscf8097.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/9c5afb58-thumb-dscf8097.jpg	IMAGE	image/jpeg	439162	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:16.7	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lg34d02i5106uy7pbl1h1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/c7a8a3f7-dscf8100.jpg	DSCF8100.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/c7a8a3f7-dscf8100.jpg	content/2025-11-20/c7a8a3f7-dscf8100.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/31799417-thumb-dscf8100.jpg	IMAGE	image/jpeg	422773	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:17.869	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lg3vj02i9106ugfhj3oj7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/19b34fd8-dscf8099.jpg	DSCF8099.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/19b34fd8-dscf8099.jpg	content/2025-11-20/19b34fd8-dscf8099.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/67b87f08-thumb-dscf8099.jpg	IMAGE	image/jpeg	433047	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:18.847	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7lg5m502id106uwfusg2es	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9bac226f-dscf8101.jpg	DSCF8101.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9bac226f-dscf8101.jpg	content/2025-11-20/9bac226f-dscf8101.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/f37fc8c5-thumb-dscf8101.jpg	IMAGE	image/jpeg	422725	\N	\N	\N	\N	3927	5890	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:36:21.101	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9nm902ih106uo07pp3yl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/22d107d8-dscf7173.jpg	DSCF7173.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/22d107d8-dscf7173.jpg	content/2025-11-20/22d107d8-dscf7173.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/1b11fab8-thumb-dscf7173.jpg	IMAGE	image/jpeg	489527	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:17.457	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9nwf02il106u84ii4une	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6c351969-dscf7175.jpg	DSCF7175.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6c351969-dscf7175.jpg	content/2025-11-20/6c351969-dscf7175.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/6c05889b-thumb-dscf7175.jpg	IMAGE	image/jpeg	474337	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:17.823	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9o2l02ip106u3f0v8zjn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/fb732dc7-dscf7180.jpg	DSCF7180.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/fb732dc7-dscf7180.jpg	content/2025-11-20/fb732dc7-dscf7180.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/79cff432-thumb-dscf7180.jpg	IMAGE	image/jpeg	567141	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:18.045	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9o3f02it106u4vr1e8oy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/be1c4b51-dscf7174.jpg	DSCF7174.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/be1c4b51-dscf7174.jpg	content/2025-11-20/be1c4b51-dscf7174.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/fff6d59b-thumb-dscf7174.jpg	IMAGE	image/jpeg	469827	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:18.075	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9tvo02ix106u327arvpn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/6cc78de8-dscf7181.jpg	DSCF7181.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/6cc78de8-dscf7181.jpg	content/2025-11-20/6cc78de8-dscf7181.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/be7351cd-thumb-dscf7181.jpg	IMAGE	image/jpeg	548708	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:25.572	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9udw02j1106u9jyw65e5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/9214f212-dscf7183.jpg	DSCF7183.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/9214f212-dscf7183.jpg	content/2025-11-20/9214f212-dscf7183.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/318409ed-thumb-dscf7183.jpg	IMAGE	image/jpeg	541501	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:26.228	2025-11-20 18:43:58.402	cmi63yyr80005ejrm5rkshgro
cmi7m9uzn02j9106uq4sg9aud	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-20/addf0c96-dscf7182.jpg	DSCF7182.jpg	\N	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/content/2025-11-20/addf0c96-dscf7182.jpg	content/2025-11-20/addf0c96-dscf7182.jpg	https://209896b6231b1f8246620be3ab526b3f.r2.cloudflarestorage.com/thumbnails/2025-11-20/30843577-thumb-dscf7182.jpg	IMAGE	image/jpeg	542631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-20 15:59:27.011	2025-11-21 13:50:32.624	cmi63yyr80005ejrm5rkshgro
\.


--
-- Data for Name: media_collaborators; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.media_collaborators (id, "projectId", "userId", role, "invitedBy", "addedAt", "guestEmail", "guestName", "inviteToken", status, "lastAccessAt", "expiresAt", "updatedAt") FROM stdin;
cmi63yt3b0003ejrm0rmwcvr7	cmi63yt2g0001ejrm7m6nn14c	cmhq2nmjq0000nc8t77189wtn	OWNER	cmhq2nmjq0000nc8t77189wtn	2025-11-19 14:39:12.071	\N	\N	\N	PENDING	\N	\N	2025-11-19 14:39:12.071
\.


--
-- Data for Name: media_folders; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.media_folders (id, name, "parentId", "createdAt", "updatedAt", "createdById", description, "projectId") FROM stdin;
cmi63yyr80005ejrm5rkshgro	all files	\N	2025-11-19 14:39:19.412	2025-11-19 14:39:19.412	cmhq2nmjq0000nc8t77189wtn	\N	cmi63yt2g0001ejrm7m6nn14c
\.


--
-- Data for Name: media_frames; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.media_frames (id, "assetId", "timestamp", "frameNumber", x, y, "thumbnailUrl", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: media_projects; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.media_projects (id, name, description, "clientId", "projectId", "folderId", "createdBy", "createdAt", "updatedAt", "isPublic", "publicShareToken", "publicShareUrl", "publicViewCount", "publicSharedAt", "publicAccessLevel") FROM stdin;
cmi63yt2g0001ejrm7m6nn14c	MG Aloy BN	\N	\N	\N	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 14:39:12.04	2025-11-27 14:41:02.017	t	ps5uAHu6B2agXH-XWOumGA	https://share.monomiagency.com/shared/ps5uAHu6B2agXH-XWOumGA	671	2025-11-19 19:52:27.828	VIEW_ONLY
\.


--
-- Data for Name: media_versions; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.media_versions (id, "assetId", "versionNumber", filename, url, key, "thumbnailUrl", size, duration, width, height, "changeNotes", "uploadedBy", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: payment_milestones; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.payment_milestones (id, "quotationId", "milestoneNumber", name, "nameId", description, "descriptionId", "paymentPercentage", "paymentAmount", "dueDate", "dueDaysFromPrev", deliverables, "isInvoiced", "projectMilestoneId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.payments (id, "invoiceId", amount, "paymentDate", "paymentMethod", "transactionRef", "bankDetails", status, "confirmedAt", "journalEntryId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_cost_allocations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.project_cost_allocations (id, "projectId", "expenseId", "allocationDate", "allocationMethod", "allocationPercentage", "allocatedAmount", "journalEntryId", "costType", "isDirect", notes, "notesId", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: project_equipment_usage; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.project_equipment_usage (id, "projectId", "assetId", "startDate", "endDate", "returnDate", condition, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.project_milestones (id, "projectId", "milestoneNumber", name, "nameId", description, "descriptionId", "plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate", "completionPercentage", "plannedRevenue", "recognizedRevenue", "remainingRevenue", "estimatedCost", "actualCost", status, deliverables, "acceptedBy", "acceptedAt", "journalEntryId", notes, "notesId", priority, "predecessorId", "delayDays", "delayReason", "materaiRequired", "taxTreatment", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: project_team_members; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.project_team_members (id, "projectId", "userId", role, "roleId", "allocationPercent", "hourlyRate", "hourlyRateCurrency", "assignedDate", "startDate", "endDate", "isActive", notes, "notesId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: project_type_configs; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.project_type_configs (id, code, name, description, prefix, color, "isDefault", "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmhq2nmn90008nc8t83p9ruib	PRODUCTION	Production Work	Website development, software development, and other production tasks	PH	#52c41a	t	t	1	2025-11-08 09:18:12.069	2025-11-08 09:18:12.069
cmhq2nmnt0009nc8tbppt9nqr	SOCIAL_MEDIA	Social Media Management	Content creation, social media management, and digital marketing	SM	#1890ff	f	t	2	2025-11-08 09:18:12.089	2025-11-08 09:18:12.089
cmhq2nmo3000anc8tkvhzrekf	CONSULTATION	Consultation Services	Business consultation, technical consultation, and advisory services	CS	#722ed1	f	t	3	2025-11-08 09:18:12.1	2025-11-08 09:18:12.1
cmhq2nmof000bnc8ttoi1t1qx	MAINTENANCE	Maintenance & Support	System maintenance, bug fixes, and technical support	MT	#fa8c16	f	t	4	2025-11-08 09:18:12.111	2025-11-08 09:18:12.111
cmhq2nmoq000cnc8throx3abx	OTHER	Other Services	Miscellaneous services and custom projects	OT	#595959	f	t	5	2025-11-08 09:18:12.122	2025-11-08 09:18:12.122
cmhhxl1tb0008lf256h1sgmyt	PRODUCTION_BACKUP	Production Work (Backup)	Original production type from backup	PH	#52c41a	f	t	10	2025-11-03 16:34:04.271	2025-11-08 09:25:47.866
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.projects (id, number, description, "scopeOfWork", output, "projectTypeId", "clientId", "startDate", "endDate", "estimatedBudget", "basePrice", "priceBreakdown", "estimatedExpenses", "projectedGrossMargin", "projectedNetMargin", "projectedProfit", "totalDirectCosts", "totalIndirectCosts", "totalAllocatedCosts", "totalInvoicedAmount", "totalPaidAmount", "grossProfit", "netProfit", "grossMarginPercent", "netMarginPercent", "budgetVariance", "budgetVariancePercent", "profitCalculatedAt", "profitCalculatedBy", status, "createdAt", "updatedAt") FROM stdin;
cmihfe2uv0000jcgkue4mvzoy	PRJ-PH-202511-003	- 1 day Videoshoot service \n- Video editing service for 60s (no sound)\n- Brainstorming concept & storyboard\n- Camera equipment\n- Lighting equipment	Professional Videography & Editing Service:\t\n\t\n1. One-day Session\t\n- Professional Videography Service for 1 day\n- Multiple angles shot per products\t\n- Macro detail & beauty shots for intricate designs\n- Professional lighting setup and execution\t\n\t\n2. Post-Production & Deliverables:\t\n- Edited 60s Video (Ratio 9:16 & Ration 1:1), format MP4\t\n- Professionally edited high-resolution Video:\t\t\n  - Color grading (Color correction and white balance, Exposure and brightness optimization, Contrast, saturation, and highlight/shadow adjustment)\t\n  - Cut-to-cut, video text, transition, 3D Motion, Motion Graphics\n\nTERMS & CONDITIONS:\t\n\t\n- 50% non-refundable booking deposit required\n- Secures your shoot date and videographer's time\t\n- Balance due upon delivery of edited video\n\t\nCancellation Policy:\t\n- More than 7 days notice: Reschedule once at no charge\t\n- Full deposit forfeited, can reschedule with Additional Fee\t\n- Less than 48 hours: Full deposit forfeited\t\n- No-show: Full deposit forfeited + balance due for time committed\t\n\t\nRescheduling:\t\n- First reschedule: complimentary (with 7+ days notice)\t\n- Additional Charged for rescheduling : Rp 1,000,000 fee\t\n- Subject to videographer availability\t\n\t\nAdditional & Revision Policy:\n- 1 complimentary revision round for 2 minor revisions (cut-to-cut, video text, transition)\t\n- Must be requested within 7 days business days of delivery\t\n- Additional minor revision : Rp 150,000 / revision\t\n- Additional major revision : Rp 500,000 / revision\t\n- Major revision included as: changing motion, changing more than 40% of overall video, changing overall color grading\t\n- Re-shoot: charged as new session at daily rate\n\nClient Responsibilities:\t\n- Provide all products organized and ready to shoot\t\n- Provide brand style guidelines if specific editing aesthetic required\t\n\t\nCopyright & Usage:\t\n- Client receives full usage rights as specified above\t\n- Video may be used in Monomi's portfolio\t\t\n- Edited files available for additional licen\t		cmhq2nmn90008nc8t83p9ruib	cmihcojn70002jvs4h6ejvqve	2025-11-26 17:00:00	2025-12-26 17:00:00	5000000.00	5000000.00	{"total": 5000000, "products": [{"name": "Videoshoot & Video editing service", "price": 5000000, "quantity": 1, "subtotal": 5000000, "description": "- 1 day Videoshoot service \\n- Video editing service for 60s (no sound)\\n- Brainstorming concept & storyboard\\n- Camera equipment\\n- Lighting equipment"}], "calculatedAt": "2025-11-27T15:50:54.632Z"}	{"direct": [{"notes": "sewa aputure 2pcs", "amount": 600000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "editing motion graphics", "amount": 300000, "categoryId": "211c6afe-48d3-42de-a55a-3bf2964ea759", "categoryName": "Freelancer - Video Editor", "categoryNameId": "Freelancer Editor Video"}, {"notes": "konsumsi", "amount": 300000, "categoryId": "cmhq3kf9g0006e626hyckgry5", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}, {"notes": "", "amount": 150000, "categoryId": "cmhq3juvz0003e626t7yv98ld", "categoryName": "Transportation Expenses", "categoryNameId": "Beban Transportasi"}], "indirect": [], "totalDirect": 1350000, "calculatedAt": "2025-11-27T15:50:54.635Z", "totalIndirect": 0, "totalEstimated": 1350000}	73.00	73.00	3650000.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	-5000000.00	-100.00	2025-11-27 12:44:28.493	\N	PLANNING	2025-11-27 12:44:28.279	2025-11-27 15:56:41.919
cmhj7zkcx0006nocx4sigshsa	PRJ-PH-202511-002	Photography & Videography Services	Scope of Work\\t\\t\\nProfessional Photography & Styling Services:\\t\\t\\n\\t\\t\\n1. Two-Days Sessions\\t\\t\\n- Professional Photography Services for 2 Days\\t\\t\\n- Multiple angles captured per piece\\t\\t\\n"- Macro detail shots for intricate designs\\n"\\t\\t\\n- Professional lighting setup and execution\\t\\t\\n\\t\\t\\n2. Food Styling Services Include:\\t\\t\\n- Plating and arrangement optimization\\t\\t\\n- Composition and color balance adjustments\\t\\t\\n- Professional styling throughout shoot duration\\t\\t\\n\\t\\t\\n2. Post-Production & Deliverables:\\t\\t\\n- Complete archive of all RAW/unedited photos\\t\\t\\n- 200 professionally edited high-resolution images:\\t\\t\\n  - 2 edited photos per catalog product (200 files)\\t\\t\\n  - 2 edited photos per on-model product (200 files)\\t\\t\\n  - Total delivery: 400 high-resolution edited images (JPG - 4000px+)\\t\\t\\n- Professional editing includes:\\t\\t\\n- Color correction and white balance\\t\\t\\n- Exposure and brightness optimization\\t\\t\\n- Contrast, saturation, and highlight/shadow adjustment\\t\\t\\n- Minor background cleanup\\t\\t\\n\\t\\t\\n4. File Formats Delivered:\\t\\t\\n- High-resolution JPG (4000px+)\\t\\t\\n\\t\\t\\n3. Delivery Timeline:\\t\\t\\n- All unedited photos: 3 business days\\t\\t\\n- Final edited photos: 10 business days\\t\\t\\n- Preview selection (low-res): 2 business days\\t\\t\\n\\t\\t\\nTERMS & CONDITIONS:\\t\\t\\n\\t\\t\\n- 50% non-refundable booking deposit required (Rp 9,250,000)\\t\\t\\n- Secures your shoot date and photographer's time\\t\\t\\n- Balance due upon delivery of edited photos (Rp 9,250,000)\\t\\t\\n\\t\\t\\nCancellation Policy:\\t\\t\\n- More than 7 days notice: Reschedule once at no charge\\t\\t\\n- Full deposit forfeited, can reschedule with Additional Fee\\t\\t\\n- Less than 48 hours: Full deposit forfeited\\t\\t\\n- No-show: Full deposit forfeited + balance due for time committed\\t\\t\\n\\t\\t\\nRescheduling:\\t\\t\\n- First reschedule: complimentary (with 7+ days notice)\\t\\t\\n- Additional Charged for rescheduling : Rp 1,000,000 fee\\t\\t\\n- Subject to photographer availability\\t\\t\\n\\t\\t\\nAdditional & Revision Policy:\\t\\t\\n- 1 complimentary revision round (minor color/crop adjustments)\\t\\t\\n- Must be requested within 7 business days of delivery\\t\\t\\n- Additional edited photo revision : Rp 150,000 / photo\\t\\t\\n- Additional edited photo : Rp 150.000 / photo\\t\\t\\n"- Additional products beyond 100 pieces: Rp 110,000 / catalog, Rp 75,000 / on-model\\n"\\t\\t\\n- Re-shoot: charged as new session at daily rate\\t\\t\\n\\t\\t\\nClient Responsibilities:\\t\\t\\n- Provide all jewelry pieces organized and ready to shoot\\t\\t\\n- Label/number pieces for tracking\\t\\t\\n- Provide model for on-body shots\\t\\t\\n- Jewelry should arrive cleaned and polished\\t\\t\\n- Provide brand style guidelines if specific editing aesthetic required\\t\\t\\n\\t\\t\\nCopyright & Usage:\\t\\t\\n- Photographer retains copyright to all images\\t\\t\\n- Client receives full usage rights as specified above\\t\\t\\n- Images may be used in photographer's portfolio\\t\\t\\n- RAW files remain property of photographer\\t\\t\\n- Edited files available for additional licen\\t\\t	Photography & Videography Services	cmhhxl1tb0008lf256h1sgmyt	cmhiyns030000muz1gnwyukwc	2025-11-03 17:00:00	2025-11-20 17:00:00	7379000.00	21000000.00	{"total": 21000000, "products": [{"name": "Photography & Videography Catalog Services", "price": 105000, "quantity": 100, "subtotal": 10500000, "description": "2 edited photos per catalog product (200 files)"}, {"name": "Photography & Videography On Model Services", "price": 67000, "quantity": 100, "subtotal": 6700000, "description": "2 edited photos per on-model product (200 files)"}, {"name": "Studio Rent", "price": 3800000, "quantity": 1, "subtotal": 3800000, "description": "Kyabin Studio - Studio 3 - 9 Hours"}], "calculatedAt": "2025-11-03T14:13:03.823Z"}	{"direct": [{"notes": "Cititrans PP Bdg-Jkt", "amount": 840000, "categoryId": "cmhj7rsty0003xiqoeo4w2oxh", "categoryName": "Transportation Expenses", "categoryNameId": "Biaya Transportasi"}, {"notes": "Hotel Losari Blok M 2 Nights", "amount": 1248000, "categoryId": "cmhj7rsu20004xiqojuca0pin", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}, {"notes": "Kyabin Studio", "amount": 3800000, "categoryId": "cmhj7rsu60005xiqo1duppjdr", "categoryName": "Studio Rent Expenses", "categoryNameId": "Beban Sewa Studio"}, {"notes": "Fujifilm XF 80mm Lens Rent", "amount": 400000, "categoryId": "cmhj82x3h0009nocxjuw08lgr", "categoryName": "Tools Rent Expenses", "categoryNameId": "Beban Sewa Peralatan/Perlengkapan"}, {"notes": "AAkomodasi Transportasi", "amount": 491000, "categoryId": "cmhj7rsty0003xiqoeo4w2oxh", "categoryName": "Transportation Expenses", "categoryNameId": "Biaya Transportasi"}, {"notes": "Akomodasi Makanan & Minuman", "amount": 600000, "categoryId": "cmhj7rsu20004xiqojuca0pin", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 7379000, "calculatedAt": "2025-11-03T14:17:10.961Z", "totalIndirect": 0, "totalEstimated": 7379000}	64.86	64.86	13621000.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	-5888000.00	-100.00	2025-11-03 14:14:01.447	\N	PLANNING	2025-11-03 14:13:03.826	2025-11-09 07:31:01.821
cmi4r3vpu0003380f03pzncjw	PRJ-OT-202511-001	Lighting Rent 			cmhq2nmoq000cnc8throx3abx	cmi4qqce20002380fj2rukkfc	2025-11-18 17:00:00	2025-11-19 17:00:00	1988000.00	2150000.00	{"total": 2150000, "products": [{"name": "Aputure Lighting Equipment Rent", "price": 350000, "quantity": 3, "subtotal": 1050000, "description": "Aputure C300D Mark II"}, {"name": "Godox RGB Lighting", "price": 250000, "quantity": 2, "subtotal": 500000, "description": "Godox SZ 150R RGB"}, {"name": "Gaffer ", "price": 500000, "quantity": 1, "subtotal": 500000, "description": "Hiring 1 Gaffer for 1 Day Shooting"}, {"name": "Accommodation ", "price": 100000, "quantity": 1, "subtotal": 100000, "description": "Transport Rent Items "}], "calculatedAt": "2025-11-19T11:34:30.132Z"}	{"direct": [{"notes": "Rent Aputure", "amount": 950000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Rent Godox", "amount": 444000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Rent Lens", "amount": 194000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Hire Gaffer", "amount": 300000, "categoryId": "883f81b9-3f4f-4c8c-bb09-26698f17cf8f", "categoryName": "Freelancer - Social Media Specialist", "categoryNameId": "Freelancer Spesialis Media Sosial"}, {"notes": "Gocar", "amount": 100000, "categoryId": "cmhq3kf9g0006e626hyckgry5", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 1988000, "calculatedAt": "2025-11-19T11:34:30.136Z", "totalIndirect": 0, "totalEstimated": 1988000}	7.53	7.53	162000.00	0.00	0.00	0.00	2150000.00	0.00	0.00	0.00	0.00	0.00	-1988000.00	-100.00	2025-11-27 11:25:01.016	\N	PLANNING	2025-11-18 15:51:27.57	2025-11-27 11:25:01.018
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.purchase_order_items (id, "poId", "lineNumber", "itemType", "itemCode", description, "descriptionId", quantity, unit, "unitPrice", "discountPercent", "discountAmount", "lineTotal", "ppnAmount", "quantityReceived", "quantityInvoiced", "quantityOutstanding", "assetId", "expenseCategoryId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.purchase_orders (id, "poNumber", "poDate", "vendorId", "projectId", subtotal, "discountAmount", "ppnAmount", "pphAmount", "totalAmount", "isPPNIncluded", "ppnRate", "withholdingTaxType", "withholdingTaxRate", "deliveryAddress", "deliveryDate", "paymentTerms", "dueDate", status, "approvalStatus", "requestedBy", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "totalReceived", "totalInvoiced", "isClosed", "closedAt", "closedBy", "closureReason", description, "descriptionId", notes, "termsConditions", "createdAt", "updatedAt", "createdBy", "updatedBy", "journalEntryId") FROM stdin;
\.


--
-- Data for Name: quotation_counters; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.quotation_counters (id, year, month, sequence, "createdAt", "updatedAt") FROM stdin;
cmhqbtcp00002rk652zd5q09v	2025	11	4	2025-11-08 13:34:35.653	2025-11-19 11:36:48.828
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.quotations (id, "quotationNumber", date, "validUntil", "clientId", "projectId", "amountPerProject", "totalAmount", "scopeOfWork", "priceBreakdown", terms, "paymentType", "paymentTermsText", status, "createdBy", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "createdAt", "updatedAt") FROM stdin;
cmi5xg98g000d67opqghldbrq	QT-202511-004	2025-11-19 11:36:48.832	2025-12-19 17:00:00	cmi4qqce20002380fj2rukkfc	cmi4r3vpu0003380f03pzncjw	2150000.00	2150000.00	\N	{"total": 2150000, "products": [{"name": "Aputure Lighting Equipment Rent", "price": 350000, "quantity": 3, "subtotal": 1050000, "description": "Aputure C300D Mark II"}, {"name": "Godox RGB Lighting", "price": 250000, "quantity": 2, "subtotal": 500000, "description": "Godox SZ 150R RGB"}, {"name": "Gaffer ", "price": 500000, "quantity": 1, "subtotal": 500000, "description": "Hiring 1 Gaffer for 1 Day Shooting"}, {"name": "Accommodation ", "price": 100000, "quantity": 1, "subtotal": 100000, "description": "Transport Rent Items "}], "calculatedAt": "2025-11-19T11:34:30.132Z"}	1. Payment Terms: Net 1 day from invoice date\n2. Project Timeline: 19 Nov 2025 - 20 Nov 2025\n3. Scope: Lighting Rent \n4. Deliverables: As specified in project requirements	FULL_PAYMENT	\N	APPROVED	cmhq2nmjq0000nc8t77189wtn	\N	\N	\N	\N	2025-11-19 11:36:48.832	2025-11-19 11:37:11.736
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt", "lastUsedAt", "isRevoked", "revokedAt", "revokedReason", "userAgent", "ipAddress", "deviceId", "replacedBy") FROM stdin;
cmihk6d180006jcgk91yktkfj	bba3aaa258ad8edaafa47a6c0b893afd60cda61302846c6ec6b466d84402e2d0b0831449fb626be43ad826db9a39d281263d28dd0b7baa072a4ca540e75a2f49	cmhq2nmjq0000nc8t77189wtn	2025-12-27 14:58:26.3	2025-11-27 14:58:26.3	2025-11-27 15:11:26.412	t	2025-11-27 15:11:26.427	replaced	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	48a574fec8db21a3b6ce96939b0d5de4158a16d8b1d7177f934a3cc88444cd539ec47dc88e0349409594ebbdc59e49e8562ec1f9669c8ad20f8f92a6028bdec5
cmihczipp0004jvs4aklm682f	96af7d65eba9d2e80263f471185f707c9571146250608145a23d36d554d287a6fe96d81083eec411e28932bd390a7971d9e861ed90e0120bf1dc37c2780541ed	cmhq2nmjq0000nc8t77189wtn	2025-12-27 11:37:09.756	2025-11-27 11:37:09.757	2025-11-27 11:37:09.757	f	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	\N
cmihcio4j0001jvs4zz82uqtf	7688b33782c9840a40b62e2390c9d43742d294b9741dd4fcbfe09d2256be1cac422337a69421d5a99d115ccb999bb9510faed4029cbae14f2fb12419599c5f1d	cmhq2nmjq0000nc8t77189wtn	2025-12-27 11:24:03.618	2025-11-27 11:24:03.619	2025-11-27 11:37:09.752	t	2025-11-27 11:37:09.759	replaced	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	96af7d65eba9d2e80263f471185f707c9571146250608145a23d36d554d287a6fe96d81083eec411e28932bd390a7971d9e861ed90e0120bf1dc37c2780541ed
cmihlieib0001a9or4bq3gqti	5348ab0714775d8f2a7f1a3905d8d5367541977ccbd3dd3602f83238e0b65c615ab0114b826d1dca8d9c05cb73e44ba440625e9673899405f91c2a93443d3e83	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:35:47.698	2025-11-27 15:35:47.699	2025-11-27 15:35:47.699	f	\N	\N	curl/8.5.0	172.20.0.8	\N	\N
cmihesvc6000gjvs4lwgt2kkd	4f23f2655e56ac7c330b10a12ee10aaf34c60ed47d622114b505cca046b36b11abb96785d353dbf06235733a52f2d49c45e19beff868938167f6b955b5d8b92f	cmhq2nmjq0000nc8t77189wtn	2025-12-27 12:27:58.757	2025-11-27 12:27:58.758	2025-11-27 12:27:58.758	f	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	\N
cmihec2ra0006jvs4d6m2qbfm	4c2a46939e2ce221fa7040049c1e42fbb1c3aa6747f525643d37045ee3b1773a96e47324ff036988107bb5c5d7fdd1d886ce1a073edeb53b7ecf210595cee134	cmhq2nmjq0000nc8t77189wtn	2025-12-27 12:14:55.222	2025-11-27 12:14:55.223	2025-11-27 12:27:58.75	t	2025-11-27 12:27:58.764	replaced	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	4f23f2655e56ac7c330b10a12ee10aaf34c60ed47d622114b505cca046b36b11abb96785d353dbf06235733a52f2d49c45e19beff868938167f6b955b5d8b92f
cmihlik8o0003a9orpk62c5we	6b56c59334754faf2b12b4b0e38c4660bf2db33ffb83d07d58f7ecf785a858176bf015e5e7eb3be2919c5b25990258e9c7b920b910f8fac469521dd249c007bf	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:35:55.128	2025-11-27 15:35:55.128	2025-11-27 15:35:55.128	f	\N	\N	curl/8.5.0	172.20.0.8	\N	\N
cmihfe5gc0002jcgkt2q6g2xo	93a03581074074341ed3bf1f2b9adea432e81f669e6cdcae797ac89c4b3913ab28b84d7596cf6d126f3fe4003aa6f54ceff10734f3262e5a317675ec07c4c633	cmhq2nmjq0000nc8t77189wtn	2025-12-27 12:44:31.643	2025-11-27 12:44:31.644	2025-11-27 12:44:31.644	f	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	\N
cmihex3oy000ijvs4ikpricui	1629e8b89519872d789545ceb61a4af5c6acb79a047ee147216e5c0ac89cb7e8e85e8116bc4fac56714767d702ea08858bdff74c5e5f59492f70036c9ca793f1	cmhq2nmjq0000nc8t77189wtn	2025-12-27 12:31:16.21	2025-11-27 12:31:16.211	2025-11-27 12:44:31.616	t	2025-11-27 12:44:31.646	replaced	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	93a03581074074341ed3bf1f2b9adea432e81f669e6cdcae797ac89c4b3913ab28b84d7596cf6d126f3fe4003aa6f54ceff10734f3262e5a317675ec07c4c633
cmihfeu640004jcgkqh4jtv6h	fa4670cad8dbc266a9d47b9e01e47f24e80f0df300d9466435323e19cb2c7d037090867c2acce5153e6fdeccb86722c48d9f3d04582361c62e32ab5d5e8d2cb7	cmhq2nmjq0000nc8t77189wtn	2025-12-27 12:45:03.675	2025-11-27 12:45:03.676	2025-11-27 12:45:03.676	f	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	\N
cmihexzc7000kjvs4wbmlkr0r	51ccf5c41c0a1c56837282b985e27de5c294a7bc64070a5128d8449098e412cd6c1f8d9d61c325370c1822b305717e6d52b9883d0f0353eaede0d684a8cdc30d	cmhq2nmjq0000nc8t77189wtn	2025-12-27 12:31:57.222	2025-11-27 12:31:57.223	2025-11-27 12:45:03.669	t	2025-11-27 12:45:03.68	replaced	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	fa4670cad8dbc266a9d47b9e01e47f24e80f0df300d9466435323e19cb2c7d037090867c2acce5153e6fdeccb86722c48d9f3d04582361c62e32ab5d5e8d2cb7
cmihltzek0009a9or8kregxj2	243deb3756c67127cca20de1356028637f9089b90bec898f96c3049d3769b49361b14456fdb820e154adb40d0b2eef07fb58740826e8063e56e1b11e3ee76064	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:44:47.996	2025-11-27 15:44:47.996	2025-11-27 15:57:48.165	t	2025-11-27 15:57:48.172	replaced	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	d7747128057fa06569c16358a8cb8d34c92b35fd3fa7c33de0ca233a54d3281a47652fb1c92d4385ddd2e209462210391a604f184716218a1f6e736fd609affd
cmihkn2za0008jcgksxe3q5gc	48a574fec8db21a3b6ce96939b0d5de4158a16d8b1d7177f934a3cc88444cd539ec47dc88e0349409594ebbdc59e49e8562ec1f9669c8ad20f8f92a6028bdec5	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:11:26.421	2025-11-27 15:11:26.422	2025-11-27 15:11:26.422	f	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	\N
cmihliw230007a9orl461am9c	8e612cc67a0c287e01e37ae9ddcb636755fbf84a639510a1b584d91bdb9cf0cc3dff6bd224c8539f02a551d66ac4a91b9e909c0fab601eec68fd20ef7cfc765b	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:36:10.442	2025-11-27 15:36:10.443	2025-11-27 15:36:10.443	f	\N	\N	curl/8.5.0	172.20.0.8	\N	\N
cmihliqm00005a9orlhdys4z1	5f194edd5a1ce335f880b170fa6b9307c6d52411aefb1df9c303e52be32e9ff072861c4aff2d749794cf963784abbef34b69247879cd784877efe880cebe8e84	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:36:03.384	2025-11-27 15:36:03.385	2025-11-27 15:36:10.436	t	2025-11-27 15:36:10.452	replaced	curl/8.5.0	172.20.0.8	\N	8e612cc67a0c287e01e37ae9ddcb636755fbf84a639510a1b584d91bdb9cf0cc3dff6bd224c8539f02a551d66ac4a91b9e909c0fab601eec68fd20ef7cfc765b
cmihmape2000ba9orsjvh269n	d7747128057fa06569c16358a8cb8d34c92b35fd3fa7c33de0ca233a54d3281a47652fb1c92d4385ddd2e209462210391a604f184716218a1f6e736fd609affd	cmhq2nmjq0000nc8t77189wtn	2025-12-27 15:57:48.169	2025-11-27 15:57:48.17	2025-11-27 15:57:48.17	f	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	172.20.0.8	\N	\N
\.


--
-- Data for Name: report_sections; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.report_sections (id, "reportId", "order", title, description, "csvFileName", "csvFilePath", "importedAt", "columnTypes", "rawData", "rowCount", visualizations, "createdAt", "updatedAt", layout, "layoutVersion") FROM stdin;
\.


--
-- Data for Name: social_media_reports; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.social_media_reports (id, "projectId", title, description, month, year, status, "pdfUrl", "pdfGeneratedAt", "pdfVersion", "emailedAt", "emailedTo", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.system_settings (id, "defaultPaymentTerms", "materaiThreshold", "invoicePrefix", "quotationPrefix", "autoBackup", "backupFrequency", "backupTime", "autoMateraiReminder", "defaultCurrency", "createdAt", "updatedAt") FROM stdin;
default	NET 30	5000000	INV-	QT-	t	daily	02:00	t	IDR	2025-11-02 18:36:43.301	2025-11-03 10:35:01.606
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.user_preferences (id, "userId", timezone, language, currency, "emailNotifications", "pushNotifications", theme, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.users (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cmhre3czb0001z28xs6303080	user@monomi.id	$2b$10$SCVcmwtaCXdqnddlfCJO2..1HxED/FYD.0.cfocL8skkZ3mfMDtqW	Regular User	USER	t	2025-11-09 07:26:07.992	2025-11-09 07:26:07.992
cmhq2nmjq0000nc8t77189wtn	admin@monomi.id	$2b$10$TNR3sbcDyA22gPQt28ogxeRSOQQgMrtZMuVpldJfNTywJiOx1Bazq	Admin Sistem (Legacy)	ADMIN	t	2025-11-08 09:18:11.942	2025-11-09 07:31:01.745
cmhq2nmk50001nc8txygfefzd	user@bisnis.co.id	$2b$10$TNR3sbcDyA22gPQt28ogxeRSOQQgMrtZMuVpldJfNTywJiOx1Bazq	User Bisnis (Legacy)	USER	t	2025-11-08 09:18:11.957	2025-11-09 07:31:01.753
cmhq2nmki0002nc8tfdvy53x9	super.admin@monomi.id	$2b$10$Y7GGcQLc1SuhbSY/JVXuqORXi7MkpXfUkDFz0M1YZg.qrLbezIm5C	Super Admin	SUPER_ADMIN	t	2025-11-08 09:18:11.97	2025-11-09 07:31:01.755
cmhq2nmkr0003nc8tjnzseany	finance.manager@monomi.id	$2b$10$Y7GGcQLc1SuhbSY/JVXuqORXi7MkpXfUkDFz0M1YZg.qrLbezIm5C	Finance Manager	FINANCE_MANAGER	t	2025-11-08 09:18:11.979	2025-11-09 07:31:01.757
cmhq2nml30004nc8tlhgq56d8	accountant@monomi.id	$2b$10$Y7GGcQLc1SuhbSY/JVXuqORXi7MkpXfUkDFz0M1YZg.qrLbezIm5C	Accountant	ACCOUNTANT	t	2025-11-08 09:18:11.991	2025-11-09 07:31:01.76
cmhq2nmlf0005nc8t37c4b6ci	project.manager@monomi.id	$2b$10$Y7GGcQLc1SuhbSY/JVXuqORXi7MkpXfUkDFz0M1YZg.qrLbezIm5C	Project Manager	PROJECT_MANAGER	t	2025-11-08 09:18:12.004	2025-11-09 07:31:01.762
cmhq2nmln0006nc8t3rt56kkz	staff@monomi.id	$2b$10$Y7GGcQLc1SuhbSY/JVXuqORXi7MkpXfUkDFz0M1YZg.qrLbezIm5C	Staff User	STAFF	t	2025-11-08 09:18:12.011	2025-11-09 07:31:01.765
cmhq2nmlz0007nc8tgjbrzxiv	viewer@monomi.id	$2b$10$Y7GGcQLc1SuhbSY/JVXuqORXi7MkpXfUkDFz0M1YZg.qrLbezIm5C	Viewer	VIEWER	t	2025-11-08 09:18:12.023	2025-11-09 07:31:01.767
cmhhxl1r20000lf2533an14r7	admin@monomiagency.com	$2b$10$m1zUtfuNZWtLu7tLneG6OeOSWEdGOlHYEI6e/MrWQPc/YK2pORepu	Admin Monomi	ADMIN	t	2025-11-02 16:34:04.19	2025-11-09 07:31:01.769
\.


--
-- Data for Name: ux_metrics; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.ux_metrics (id, "componentName", "eventType", "metricName", value, "userId", "sessionId", "clientId", url, "userAgent", "performanceData", "createdAt") FROM stdin;
\.


--
-- Data for Name: vendor_invoice_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.vendor_invoice_items (id, "viId", "poItemId", "lineNumber", description, "descriptionId", quantity, unit, "unitPrice", "discountAmount", "lineTotal", "ppnAmount", "isMatched", "varianceReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vendor_invoices; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.vendor_invoices (id, "vendorInvoiceNumber", "internalNumber", "invoiceDate", "vendorId", "poId", "grId", subtotal, "discountAmount", "ppnAmount", "pphAmount", "totalAmount", "eFakturNSFP", "eFakturQRCode", "eFakturStatus", "eFakturUploadDate", "paymentTerms", "dueDate", "matchingStatus", "matchedBy", "matchedAt", "matchingNotes", "priceVariance", "quantityVariance", "withinTolerance", status, "approvalStatus", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "accountsPayableId", "journalEntryId", description, "descriptionId", notes, "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: vendor_payment_allocations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.vendor_payment_allocations (id, "paymentId", "apId", "allocatedAmount", "createdAt") FROM stdin;
\.


--
-- Data for Name: vendor_payments; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.vendor_payments (id, "paymentNumber", "paymentDate", "vendorId", "paymentMethod", "referenceNumber", "bankAccountId", "totalAmount", status, "clearedAt", "journalEntryId", notes, "notesId", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.vendors (id, "vendorCode", name, "nameId", "vendorType", "industryType", "contactPerson", email, phone, address, city, province, "postalCode", country, npwp, "pkpStatus", "taxAddress", "bankName", "bankAccountNumber", "bankAccountName", "bankBranch", "swiftCode", "paymentTerms", "creditLimit", currency, "isActive", "isPKP", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: work_in_progress; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.work_in_progress (id, "projectId", "periodDate", "fiscalPeriodId", "directMaterialCost", "directLaborCost", "directExpenses", "allocatedOverhead", "totalCost", "billedToDate", "recognizedRevenue", "unbilledRevenue", "completionPercentage", "isCompleted", "costJournalId", "revenueJournalId", notes, "notesId", "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_balances account_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT account_balances_pkey PRIMARY KEY (id);


--
-- Name: accounts_payable accounts_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_pkey PRIMARY KEY (id);


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT allowance_for_doubtful_accounts_pkey PRIMARY KEY (id);


--
-- Name: asset_kit_items asset_kit_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_kit_items
    ADD CONSTRAINT asset_kit_items_pkey PRIMARY KEY (id);


--
-- Name: asset_kits asset_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_kits
    ADD CONSTRAINT asset_kits_pkey PRIMARY KEY (id);


--
-- Name: asset_metadata asset_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT asset_metadata_pkey PRIMARY KEY (id);


--
-- Name: asset_reservations asset_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT asset_reservations_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_reconciliation_items bank_reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_reconciliation_items
    ADD CONSTRAINT bank_reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: bank_reconciliations bank_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_reconciliations
    ADD CONSTRAINT bank_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: bank_transfers bank_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_transfers
    ADD CONSTRAINT bank_transfers_pkey PRIMARY KEY (id);


--
-- Name: business_journey_event_metadata business_journey_event_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_event_metadata
    ADD CONSTRAINT business_journey_event_metadata_pkey PRIMARY KEY (id);


--
-- Name: business_journey_events business_journey_events_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT business_journey_events_pkey PRIMARY KEY (id);


--
-- Name: cash_bank_balances cash_bank_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.cash_bank_balances
    ADD CONSTRAINT cash_bank_balances_pkey PRIMARY KEY (id);


--
-- Name: cash_transactions cash_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT cash_transactions_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: collection_items collection_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_pkey PRIMARY KEY (id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: content_calendar_items content_calendar_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT content_calendar_items_pkey PRIMARY KEY (id);


--
-- Name: content_media content_media_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT content_media_pkey PRIMARY KEY (id);


--
-- Name: deferred_revenue deferred_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.deferred_revenue
    ADD CONSTRAINT deferred_revenue_pkey PRIMARY KEY (id);


--
-- Name: depreciation_entries depreciation_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT depreciation_entries_pkey PRIMARY KEY (id);


--
-- Name: depreciation_schedules depreciation_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expense_approval_history expense_approval_history_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_approval_history
    ADD CONSTRAINT expense_approval_history_pkey PRIMARY KEY (id);


--
-- Name: expense_budgets expense_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT expense_budgets_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_comments expense_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_comments
    ADD CONSTRAINT expense_comments_pkey PRIMARY KEY (id);


--
-- Name: expense_documents expense_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_documents
    ADD CONSTRAINT expense_documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: feature_flag_events feature_flag_events_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.feature_flag_events
    ADD CONSTRAINT feature_flag_events_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: financial_statements financial_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_pkey PRIMARY KEY (id);


--
-- Name: fiscal_periods fiscal_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT fiscal_periods_pkey PRIMARY KEY (id);


--
-- Name: frame_comments frame_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_comments
    ADD CONSTRAINT frame_comments_pkey PRIMARY KEY (id);


--
-- Name: frame_drawings frame_drawings_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_drawings
    ADD CONSTRAINT frame_drawings_pkey PRIMARY KEY (id);


--
-- Name: general_ledger general_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_items goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: indonesian_holidays indonesian_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.indonesian_holidays
    ADD CONSTRAINT indonesian_holidays_pkey PRIMARY KEY (id);


--
-- Name: invoice_counters invoice_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoice_counters
    ADD CONSTRAINT invoice_counters_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_line_items journal_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.journal_line_items
    ADD CONSTRAINT journal_line_items_pkey PRIMARY KEY (id);


--
-- Name: labor_entries labor_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_pkey PRIMARY KEY (id);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: media_collaborators media_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_collaborators
    ADD CONSTRAINT media_collaborators_pkey PRIMARY KEY (id);


--
-- Name: media_folders media_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_folders
    ADD CONSTRAINT media_folders_pkey PRIMARY KEY (id);


--
-- Name: media_frames media_frames_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_frames
    ADD CONSTRAINT media_frames_pkey PRIMARY KEY (id);


--
-- Name: media_projects media_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_projects
    ADD CONSTRAINT media_projects_pkey PRIMARY KEY (id);


--
-- Name: media_versions media_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_versions
    ADD CONSTRAINT media_versions_pkey PRIMARY KEY (id);


--
-- Name: payment_milestones payment_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT payment_milestones_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: project_cost_allocations project_cost_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_cost_allocations
    ADD CONSTRAINT project_cost_allocations_pkey PRIMARY KEY (id);


--
-- Name: project_equipment_usage project_equipment_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_equipment_usage
    ADD CONSTRAINT project_equipment_usage_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_team_members project_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT project_team_members_pkey PRIMARY KEY (id);


--
-- Name: project_type_configs project_type_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_type_configs
    ADD CONSTRAINT project_type_configs_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: quotation_counters quotation_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotation_counters
    ADD CONSTRAINT quotation_counters_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: report_sections report_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.report_sections
    ADD CONSTRAINT report_sections_pkey PRIMARY KEY (id);


--
-- Name: social_media_reports social_media_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.social_media_reports
    ADD CONSTRAINT social_media_reports_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ux_metrics ux_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.ux_metrics
    ADD CONSTRAINT ux_metrics_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoice_items vendor_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT vendor_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoices vendor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id);


--
-- Name: vendor_payment_allocations vendor_payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_payment_allocations
    ADD CONSTRAINT vendor_payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: vendor_payments vendor_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: work_in_progress work_in_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.work_in_progress
    ADD CONSTRAINT work_in_progress_pkey PRIMARY KEY (id);


--
-- Name: account_balances_accountId_fiscalPeriodId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "account_balances_accountId_fiscalPeriodId_key" ON public.account_balances USING btree ("accountId", "fiscalPeriodId");


--
-- Name: account_balances_accountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "account_balances_accountId_idx" ON public.account_balances USING btree ("accountId");


--
-- Name: account_balances_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "account_balances_fiscalPeriodId_idx" ON public.account_balances USING btree ("fiscalPeriodId");


--
-- Name: account_balances_isClosed_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "account_balances_isClosed_idx" ON public.account_balances USING btree ("isClosed");


--
-- Name: accounts_payable_agingBucket_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "accounts_payable_agingBucket_idx" ON public.accounts_payable USING btree ("agingBucket");


--
-- Name: accounts_payable_apNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "accounts_payable_apNumber_idx" ON public.accounts_payable USING btree ("apNumber");


--
-- Name: accounts_payable_apNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "accounts_payable_apNumber_key" ON public.accounts_payable USING btree ("apNumber");


--
-- Name: accounts_payable_dueDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "accounts_payable_dueDate_idx" ON public.accounts_payable USING btree ("dueDate");


--
-- Name: accounts_payable_expenseId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "accounts_payable_expenseId_key" ON public.accounts_payable USING btree ("expenseId");


--
-- Name: accounts_payable_invoiceDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "accounts_payable_invoiceDate_idx" ON public.accounts_payable USING btree ("invoiceDate");


--
-- Name: accounts_payable_paymentStatus_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "accounts_payable_paymentStatus_idx" ON public.accounts_payable USING btree ("paymentStatus");


--
-- Name: accounts_payable_vendorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "accounts_payable_vendorId_idx" ON public.accounts_payable USING btree ("vendorId");


--
-- Name: accounts_payable_vendorInvoiceId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "accounts_payable_vendorInvoiceId_key" ON public.accounts_payable USING btree ("vendorInvoiceId");


--
-- Name: allowance_for_doubtful_accounts_agingBucket_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_agingBucket_idx" ON public.allowance_for_doubtful_accounts USING btree ("agingBucket");


--
-- Name: allowance_for_doubtful_accounts_calculationDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_calculationDate_idx" ON public.allowance_for_doubtful_accounts USING btree ("calculationDate");


--
-- Name: allowance_for_doubtful_accounts_daysPastDue_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_daysPastDue_idx" ON public.allowance_for_doubtful_accounts USING btree ("daysPastDue");


--
-- Name: allowance_for_doubtful_accounts_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_fiscalPeriodId_idx" ON public.allowance_for_doubtful_accounts USING btree ("fiscalPeriodId");


--
-- Name: allowance_for_doubtful_accounts_invoiceId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_invoiceId_idx" ON public.allowance_for_doubtful_accounts USING btree ("invoiceId");


--
-- Name: allowance_for_doubtful_accounts_journalEntryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_journalEntryId_idx" ON public.allowance_for_doubtful_accounts USING btree ("journalEntryId");


--
-- Name: allowance_for_doubtful_accounts_provisionStatus_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "allowance_for_doubtful_accounts_provisionStatus_idx" ON public.allowance_for_doubtful_accounts USING btree ("provisionStatus");


--
-- Name: asset_kit_items_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_kit_items_assetId_idx" ON public.asset_kit_items USING btree ("assetId");


--
-- Name: asset_kit_items_kitId_assetId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "asset_kit_items_kitId_assetId_key" ON public.asset_kit_items USING btree ("kitId", "assetId");


--
-- Name: asset_kit_items_kitId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_kit_items_kitId_idx" ON public.asset_kit_items USING btree ("kitId");


--
-- Name: asset_kits_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_kits_isActive_idx" ON public.asset_kits USING btree ("isActive");


--
-- Name: asset_metadata_assetId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "asset_metadata_assetId_key" ON public.asset_metadata USING btree ("assetId");


--
-- Name: asset_metadata_assigneeId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_metadata_assigneeId_idx" ON public.asset_metadata USING btree ("assigneeId");


--
-- Name: asset_metadata_dueDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_metadata_dueDate_idx" ON public.asset_metadata USING btree ("dueDate");


--
-- Name: asset_metadata_platforms_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX asset_metadata_platforms_idx ON public.asset_metadata USING btree (platforms);


--
-- Name: asset_reservations_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_assetId_idx" ON public.asset_reservations USING btree ("assetId");


--
-- Name: asset_reservations_assetId_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_assetId_startDate_endDate_idx" ON public.asset_reservations USING btree ("assetId", "startDate", "endDate");


--
-- Name: asset_reservations_assetId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_assetId_status_idx" ON public.asset_reservations USING btree ("assetId", status);


--
-- Name: asset_reservations_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_endDate_idx" ON public.asset_reservations USING btree ("endDate");


--
-- Name: asset_reservations_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_projectId_idx" ON public.asset_reservations USING btree ("projectId");


--
-- Name: asset_reservations_startDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_startDate_idx" ON public.asset_reservations USING btree ("startDate");


--
-- Name: asset_reservations_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX asset_reservations_status_idx ON public.asset_reservations USING btree (status);


--
-- Name: asset_reservations_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "asset_reservations_userId_idx" ON public.asset_reservations USING btree ("userId");


--
-- Name: assets_assetCode_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "assets_assetCode_idx" ON public.assets USING btree ("assetCode");


--
-- Name: assets_assetCode_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "assets_assetCode_key" ON public.assets USING btree ("assetCode");


--
-- Name: assets_category_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX assets_category_idx ON public.assets USING btree (category);


--
-- Name: assets_category_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX assets_category_status_idx ON public.assets USING btree (category, status);


--
-- Name: assets_condition_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX assets_condition_idx ON public.assets USING btree (condition);


--
-- Name: assets_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "assets_createdAt_idx" ON public.assets USING btree ("createdAt");


--
-- Name: assets_createdById_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "assets_createdById_idx" ON public.assets USING btree ("createdById");


--
-- Name: assets_status_condition_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX assets_status_condition_idx ON public.assets USING btree (status, condition);


--
-- Name: assets_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX assets_status_idx ON public.assets USING btree (status);


--
-- Name: bank_reconciliation_items_isMatched_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliation_items_isMatched_idx" ON public.bank_reconciliation_items USING btree ("isMatched");


--
-- Name: bank_reconciliation_items_itemDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliation_items_itemDate_idx" ON public.bank_reconciliation_items USING btree ("itemDate");


--
-- Name: bank_reconciliation_items_itemType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliation_items_itemType_idx" ON public.bank_reconciliation_items USING btree ("itemType");


--
-- Name: bank_reconciliation_items_reconciliationId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliation_items_reconciliationId_idx" ON public.bank_reconciliation_items USING btree ("reconciliationId");


--
-- Name: bank_reconciliation_items_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX bank_reconciliation_items_status_idx ON public.bank_reconciliation_items USING btree (status);


--
-- Name: bank_reconciliations_bankAccountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_bankAccountId_idx" ON public.bank_reconciliations USING btree ("bankAccountId");


--
-- Name: bank_reconciliations_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_createdAt_idx" ON public.bank_reconciliations USING btree ("createdAt");


--
-- Name: bank_reconciliations_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_createdBy_idx" ON public.bank_reconciliations USING btree ("createdBy");


--
-- Name: bank_reconciliations_isBalanced_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_isBalanced_idx" ON public.bank_reconciliations USING btree ("isBalanced");


--
-- Name: bank_reconciliations_periodStartDate_periodEndDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_periodStartDate_periodEndDate_idx" ON public.bank_reconciliations USING btree ("periodStartDate", "periodEndDate");


--
-- Name: bank_reconciliations_reconciliationNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_reconciliationNumber_idx" ON public.bank_reconciliations USING btree ("reconciliationNumber");


--
-- Name: bank_reconciliations_reconciliationNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "bank_reconciliations_reconciliationNumber_key" ON public.bank_reconciliations USING btree ("reconciliationNumber");


--
-- Name: bank_reconciliations_statementDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_reconciliations_statementDate_idx" ON public.bank_reconciliations USING btree ("statementDate");


--
-- Name: bank_reconciliations_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX bank_reconciliations_status_idx ON public.bank_reconciliations USING btree (status);


--
-- Name: bank_transfers_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_clientId_idx" ON public.bank_transfers USING btree ("clientId");


--
-- Name: bank_transfers_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_createdAt_idx" ON public.bank_transfers USING btree ("createdAt");


--
-- Name: bank_transfers_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_createdBy_idx" ON public.bank_transfers USING btree ("createdBy");


--
-- Name: bank_transfers_fromAccountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_fromAccountId_idx" ON public.bank_transfers USING btree ("fromAccountId");


--
-- Name: bank_transfers_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_projectId_idx" ON public.bank_transfers USING btree ("projectId");


--
-- Name: bank_transfers_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX bank_transfers_status_idx ON public.bank_transfers USING btree (status);


--
-- Name: bank_transfers_toAccountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_toAccountId_idx" ON public.bank_transfers USING btree ("toAccountId");


--
-- Name: bank_transfers_transferDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_transferDate_idx" ON public.bank_transfers USING btree ("transferDate");


--
-- Name: bank_transfers_transferNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "bank_transfers_transferNumber_idx" ON public.bank_transfers USING btree ("transferNumber");


--
-- Name: bank_transfers_transferNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "bank_transfers_transferNumber_key" ON public.bank_transfers USING btree ("transferNumber");


--
-- Name: business_journey_event_metadata_eventId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "business_journey_event_metadata_eventId_key" ON public.business_journey_event_metadata USING btree ("eventId");


--
-- Name: business_journey_event_metadata_materaiRequired_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_event_metadata_materaiRequired_idx" ON public.business_journey_event_metadata USING btree ("materaiRequired");


--
-- Name: business_journey_event_metadata_priority_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX business_journey_event_metadata_priority_idx ON public.business_journey_event_metadata USING btree (priority);


--
-- Name: business_journey_event_metadata_source_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX business_journey_event_metadata_source_idx ON public.business_journey_event_metadata USING btree (source);


--
-- Name: business_journey_events_amount_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX business_journey_events_amount_idx ON public.business_journey_events USING btree (amount);


--
-- Name: business_journey_events_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_clientId_idx" ON public.business_journey_events USING btree ("clientId");


--
-- Name: business_journey_events_clientId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_clientId_status_createdAt_idx" ON public.business_journey_events USING btree ("clientId", status, "createdAt");


--
-- Name: business_journey_events_clientId_type_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_clientId_type_createdAt_idx" ON public.business_journey_events USING btree ("clientId", type, "createdAt");


--
-- Name: business_journey_events_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_createdAt_idx" ON public.business_journey_events USING btree ("createdAt");


--
-- Name: business_journey_events_invoiceId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_invoiceId_idx" ON public.business_journey_events USING btree ("invoiceId");


--
-- Name: business_journey_events_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_projectId_idx" ON public.business_journey_events USING btree ("projectId");


--
-- Name: business_journey_events_quotationId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_quotationId_idx" ON public.business_journey_events USING btree ("quotationId");


--
-- Name: business_journey_events_status_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "business_journey_events_status_createdAt_idx" ON public.business_journey_events USING btree (status, "createdAt");


--
-- Name: business_journey_events_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX business_journey_events_status_idx ON public.business_journey_events USING btree (status);


--
-- Name: business_journey_events_type_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX business_journey_events_type_idx ON public.business_journey_events USING btree (type);


--
-- Name: business_journey_events_type_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX business_journey_events_type_status_idx ON public.business_journey_events USING btree (type, status);


--
-- Name: cash_bank_balances_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_bank_balances_createdAt_idx" ON public.cash_bank_balances USING btree ("createdAt");


--
-- Name: cash_bank_balances_periodDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_bank_balances_periodDate_idx" ON public.cash_bank_balances USING btree ("periodDate");


--
-- Name: cash_bank_balances_year_month_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX cash_bank_balances_year_month_idx ON public.cash_bank_balances USING btree (year, month);


--
-- Name: cash_bank_balances_year_month_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX cash_bank_balances_year_month_key ON public.cash_bank_balances USING btree (year, month);


--
-- Name: cash_transactions_cashAccountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_cashAccountId_idx" ON public.cash_transactions USING btree ("cashAccountId");


--
-- Name: cash_transactions_category_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX cash_transactions_category_idx ON public.cash_transactions USING btree (category);


--
-- Name: cash_transactions_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_clientId_idx" ON public.cash_transactions USING btree ("clientId");


--
-- Name: cash_transactions_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_createdAt_idx" ON public.cash_transactions USING btree ("createdAt");


--
-- Name: cash_transactions_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_createdBy_idx" ON public.cash_transactions USING btree ("createdBy");


--
-- Name: cash_transactions_offsetAccountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_offsetAccountId_idx" ON public.cash_transactions USING btree ("offsetAccountId");


--
-- Name: cash_transactions_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_projectId_idx" ON public.cash_transactions USING btree ("projectId");


--
-- Name: cash_transactions_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX cash_transactions_status_idx ON public.cash_transactions USING btree (status);


--
-- Name: cash_transactions_transactionDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_transactionDate_idx" ON public.cash_transactions USING btree ("transactionDate");


--
-- Name: cash_transactions_transactionNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_transactionNumber_idx" ON public.cash_transactions USING btree ("transactionNumber");


--
-- Name: cash_transactions_transactionNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "cash_transactions_transactionNumber_key" ON public.cash_transactions USING btree ("transactionNumber");


--
-- Name: cash_transactions_transactionType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "cash_transactions_transactionType_idx" ON public.cash_transactions USING btree ("transactionType");


--
-- Name: chart_of_accounts_accountType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "chart_of_accounts_accountType_idx" ON public.chart_of_accounts USING btree ("accountType");


--
-- Name: chart_of_accounts_code_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX chart_of_accounts_code_idx ON public.chart_of_accounts USING btree (code);


--
-- Name: chart_of_accounts_code_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX chart_of_accounts_code_key ON public.chart_of_accounts USING btree (code);


--
-- Name: chart_of_accounts_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "chart_of_accounts_isActive_idx" ON public.chart_of_accounts USING btree ("isActive");


--
-- Name: chart_of_accounts_parentId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "chart_of_accounts_parentId_idx" ON public.chart_of_accounts USING btree ("parentId");


--
-- Name: clients_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "clients_createdAt_idx" ON public.clients USING btree ("createdAt");


--
-- Name: clients_email_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX clients_email_idx ON public.clients USING btree (email);


--
-- Name: clients_name_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX clients_name_idx ON public.clients USING btree (name);


--
-- Name: clients_name_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX clients_name_status_idx ON public.clients USING btree (name, status);


--
-- Name: clients_phone_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX clients_phone_idx ON public.clients USING btree (phone);


--
-- Name: clients_status_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "clients_status_createdAt_idx" ON public.clients USING btree (status, "createdAt");


--
-- Name: collection_items_collectionId_assetId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "collection_items_collectionId_assetId_key" ON public.collection_items USING btree ("collectionId", "assetId");


--
-- Name: collection_items_collectionId_order_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "collection_items_collectionId_order_idx" ON public.collection_items USING btree ("collectionId", "order");


--
-- Name: collections_isDynamic_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "collections_isDynamic_idx" ON public.collections USING btree ("isDynamic");


--
-- Name: collections_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "collections_projectId_idx" ON public.collections USING btree ("projectId");


--
-- Name: collections_shareToken_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "collections_shareToken_idx" ON public.collections USING btree ("shareToken");


--
-- Name: collections_shareToken_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "collections_shareToken_key" ON public.collections USING btree ("shareToken");


--
-- Name: content_calendar_items_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_calendar_items_clientId_idx" ON public.content_calendar_items USING btree ("clientId");


--
-- Name: content_calendar_items_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_calendar_items_createdBy_idx" ON public.content_calendar_items USING btree ("createdBy");


--
-- Name: content_calendar_items_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_calendar_items_projectId_idx" ON public.content_calendar_items USING btree ("projectId");


--
-- Name: content_calendar_items_scheduledAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_calendar_items_scheduledAt_idx" ON public.content_calendar_items USING btree ("scheduledAt");


--
-- Name: content_calendar_items_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX content_calendar_items_status_idx ON public.content_calendar_items USING btree (status);


--
-- Name: content_calendar_items_status_scheduledAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_calendar_items_status_scheduledAt_idx" ON public.content_calendar_items USING btree (status, "scheduledAt");


--
-- Name: content_media_contentId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_media_contentId_idx" ON public.content_media USING btree ("contentId");


--
-- Name: content_media_contentId_order_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_media_contentId_order_idx" ON public.content_media USING btree ("contentId", "order");


--
-- Name: content_media_type_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX content_media_type_idx ON public.content_media USING btree (type);


--
-- Name: content_media_uploadedAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "content_media_uploadedAt_idx" ON public.content_media USING btree ("uploadedAt");


--
-- Name: deferred_revenue_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "deferred_revenue_fiscalPeriodId_idx" ON public.deferred_revenue USING btree ("fiscalPeriodId");


--
-- Name: deferred_revenue_invoiceId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "deferred_revenue_invoiceId_idx" ON public.deferred_revenue USING btree ("invoiceId");


--
-- Name: deferred_revenue_paymentDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "deferred_revenue_paymentDate_idx" ON public.deferred_revenue USING btree ("paymentDate");


--
-- Name: deferred_revenue_recognitionDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "deferred_revenue_recognitionDate_idx" ON public.deferred_revenue USING btree ("recognitionDate");


--
-- Name: deferred_revenue_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX deferred_revenue_status_idx ON public.deferred_revenue USING btree (status);


--
-- Name: depreciation_entries_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_entries_assetId_idx" ON public.depreciation_entries USING btree ("assetId");


--
-- Name: depreciation_entries_assetId_periodDate_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "depreciation_entries_assetId_periodDate_key" ON public.depreciation_entries USING btree ("assetId", "periodDate");


--
-- Name: depreciation_entries_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_entries_fiscalPeriodId_idx" ON public.depreciation_entries USING btree ("fiscalPeriodId");


--
-- Name: depreciation_entries_journalEntryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_entries_journalEntryId_idx" ON public.depreciation_entries USING btree ("journalEntryId");


--
-- Name: depreciation_entries_periodDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_entries_periodDate_idx" ON public.depreciation_entries USING btree ("periodDate");


--
-- Name: depreciation_entries_scheduleId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_entries_scheduleId_idx" ON public.depreciation_entries USING btree ("scheduleId");


--
-- Name: depreciation_entries_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX depreciation_entries_status_idx ON public.depreciation_entries USING btree (status);


--
-- Name: depreciation_schedules_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_schedules_assetId_idx" ON public.depreciation_schedules USING btree ("assetId");


--
-- Name: depreciation_schedules_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_schedules_endDate_idx" ON public.depreciation_schedules USING btree ("endDate");


--
-- Name: depreciation_schedules_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_schedules_isActive_idx" ON public.depreciation_schedules USING btree ("isActive");


--
-- Name: depreciation_schedules_isFulfilled_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_schedules_isFulfilled_idx" ON public.depreciation_schedules USING btree ("isFulfilled");


--
-- Name: depreciation_schedules_startDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "depreciation_schedules_startDate_idx" ON public.depreciation_schedules USING btree ("startDate");


--
-- Name: documents_category_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX documents_category_idx ON public.documents USING btree (category);


--
-- Name: documents_invoiceId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "documents_invoiceId_idx" ON public.documents USING btree ("invoiceId");


--
-- Name: documents_mimeType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "documents_mimeType_idx" ON public.documents USING btree ("mimeType");


--
-- Name: documents_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "documents_projectId_idx" ON public.documents USING btree ("projectId");


--
-- Name: documents_quotationId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "documents_quotationId_idx" ON public.documents USING btree ("quotationId");


--
-- Name: documents_uploadedAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "documents_uploadedAt_idx" ON public.documents USING btree ("uploadedAt");


--
-- Name: exchange_rates_effectiveDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "exchange_rates_effectiveDate_idx" ON public.exchange_rates USING btree ("effectiveDate");


--
-- Name: exchange_rates_fromCurrency_toCurrency_effectiveDate_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_effectiveDate_key" ON public.exchange_rates USING btree ("fromCurrency", "toCurrency", "effectiveDate");


--
-- Name: exchange_rates_fromCurrency_toCurrency_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "exchange_rates_fromCurrency_toCurrency_idx" ON public.exchange_rates USING btree ("fromCurrency", "toCurrency");


--
-- Name: exchange_rates_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "exchange_rates_isActive_idx" ON public.exchange_rates USING btree ("isActive");


--
-- Name: expense_approval_history_actionBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_approval_history_actionBy_idx" ON public.expense_approval_history USING btree ("actionBy");


--
-- Name: expense_approval_history_actionDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_approval_history_actionDate_idx" ON public.expense_approval_history USING btree ("actionDate");


--
-- Name: expense_approval_history_expenseId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_approval_history_expenseId_idx" ON public.expense_approval_history USING btree ("expenseId");


--
-- Name: expense_budgets_categoryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_budgets_categoryId_idx" ON public.expense_budgets USING btree ("categoryId");


--
-- Name: expense_budgets_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_budgets_isActive_idx" ON public.expense_budgets USING btree ("isActive");


--
-- Name: expense_budgets_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_budgets_projectId_idx" ON public.expense_budgets USING btree ("projectId");


--
-- Name: expense_budgets_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_budgets_startDate_endDate_idx" ON public.expense_budgets USING btree ("startDate", "endDate");


--
-- Name: expense_budgets_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_budgets_userId_idx" ON public.expense_budgets USING btree ("userId");


--
-- Name: expense_categories_accountCode_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_categories_accountCode_idx" ON public.expense_categories USING btree ("accountCode");


--
-- Name: expense_categories_code_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX expense_categories_code_idx ON public.expense_categories USING btree (code);


--
-- Name: expense_categories_code_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX expense_categories_code_key ON public.expense_categories USING btree (code);


--
-- Name: expense_categories_expenseClass_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_categories_expenseClass_idx" ON public.expense_categories USING btree ("expenseClass");


--
-- Name: expense_categories_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_categories_isActive_idx" ON public.expense_categories USING btree ("isActive");


--
-- Name: expense_categories_parentId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_categories_parentId_idx" ON public.expense_categories USING btree ("parentId");


--
-- Name: expense_comments_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_comments_createdAt_idx" ON public.expense_comments USING btree ("createdAt");


--
-- Name: expense_comments_expenseId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_comments_expenseId_idx" ON public.expense_comments USING btree ("expenseId");


--
-- Name: expense_comments_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_comments_userId_idx" ON public.expense_comments USING btree ("userId");


--
-- Name: expense_documents_category_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX expense_documents_category_idx ON public.expense_documents USING btree (category);


--
-- Name: expense_documents_expenseId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_documents_expenseId_idx" ON public.expense_documents USING btree ("expenseId");


--
-- Name: expense_documents_mimeType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_documents_mimeType_idx" ON public.expense_documents USING btree ("mimeType");


--
-- Name: expense_documents_uploadedAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expense_documents_uploadedAt_idx" ON public.expense_documents USING btree ("uploadedAt");


--
-- Name: expenses_accountCode_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_accountCode_idx" ON public.expenses USING btree ("accountCode");


--
-- Name: expenses_accountsPayableId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "expenses_accountsPayableId_key" ON public.expenses USING btree ("accountsPayableId");


--
-- Name: expenses_buktiPengeluaranNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_buktiPengeluaranNumber_idx" ON public.expenses USING btree ("buktiPengeluaranNumber");


--
-- Name: expenses_buktiPengeluaranNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "expenses_buktiPengeluaranNumber_key" ON public.expenses USING btree ("buktiPengeluaranNumber");


--
-- Name: expenses_categoryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_categoryId_idx" ON public.expenses USING btree ("categoryId");


--
-- Name: expenses_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_clientId_idx" ON public.expenses USING btree ("clientId");


--
-- Name: expenses_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_createdAt_idx" ON public.expenses USING btree ("createdAt");


--
-- Name: expenses_dueDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_dueDate_idx" ON public.expenses USING btree ("dueDate");


--
-- Name: expenses_eFakturNSFP_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_eFakturNSFP_idx" ON public.expenses USING btree ("eFakturNSFP");


--
-- Name: expenses_expenseClass_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_expenseClass_idx" ON public.expenses USING btree ("expenseClass");


--
-- Name: expenses_expenseDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_expenseDate_idx" ON public.expenses USING btree ("expenseDate");


--
-- Name: expenses_expenseNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_expenseNumber_idx" ON public.expenses USING btree ("expenseNumber");


--
-- Name: expenses_expenseNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "expenses_expenseNumber_key" ON public.expenses USING btree ("expenseNumber");


--
-- Name: expenses_paymentStatus_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_paymentStatus_idx" ON public.expenses USING btree ("paymentStatus");


--
-- Name: expenses_ppnCategory_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_ppnCategory_idx" ON public.expenses USING btree ("ppnCategory");


--
-- Name: expenses_projectId_categoryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_projectId_categoryId_idx" ON public.expenses USING btree ("projectId", "categoryId");


--
-- Name: expenses_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_projectId_idx" ON public.expenses USING btree ("projectId");


--
-- Name: expenses_projectId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_projectId_status_idx" ON public.expenses USING btree ("projectId", status);


--
-- Name: expenses_purchaseOrderId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_purchaseOrderId_idx" ON public.expenses USING btree ("purchaseOrderId");


--
-- Name: expenses_purchaseSource_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_purchaseSource_idx" ON public.expenses USING btree ("purchaseSource");


--
-- Name: expenses_purchaseType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_purchaseType_idx" ON public.expenses USING btree ("purchaseType");


--
-- Name: expenses_status_expenseDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_status_expenseDate_idx" ON public.expenses USING btree (status, "expenseDate");


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: expenses_status_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_status_userId_idx" ON public.expenses USING btree (status, "userId");


--
-- Name: expenses_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_userId_idx" ON public.expenses USING btree ("userId");


--
-- Name: expenses_vendorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_vendorId_idx" ON public.expenses USING btree ("vendorId");


--
-- Name: expenses_vendorId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_vendorId_status_idx" ON public.expenses USING btree ("vendorId", status);


--
-- Name: expenses_vendorInvoiceId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "expenses_vendorInvoiceId_idx" ON public.expenses USING btree ("vendorInvoiceId");


--
-- Name: feature_flag_events_eventType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "feature_flag_events_eventType_idx" ON public.feature_flag_events USING btree ("eventType");


--
-- Name: feature_flag_events_flagId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "feature_flag_events_flagId_idx" ON public.feature_flag_events USING btree ("flagId");


--
-- Name: feature_flag_events_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "feature_flag_events_userId_idx" ON public.feature_flag_events USING btree ("userId");


--
-- Name: feature_flags_name_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name);


--
-- Name: financial_statements_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "financial_statements_fiscalPeriodId_idx" ON public.financial_statements USING btree ("fiscalPeriodId");


--
-- Name: financial_statements_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "financial_statements_startDate_endDate_idx" ON public.financial_statements USING btree ("startDate", "endDate");


--
-- Name: financial_statements_statementType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "financial_statements_statementType_idx" ON public.financial_statements USING btree ("statementType");


--
-- Name: fiscal_periods_code_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX fiscal_periods_code_idx ON public.fiscal_periods USING btree (code);


--
-- Name: fiscal_periods_code_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX fiscal_periods_code_key ON public.fiscal_periods USING btree (code);


--
-- Name: fiscal_periods_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "fiscal_periods_endDate_idx" ON public.fiscal_periods USING btree ("endDate");


--
-- Name: fiscal_periods_startDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "fiscal_periods_startDate_idx" ON public.fiscal_periods USING btree ("startDate");


--
-- Name: fiscal_periods_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX fiscal_periods_status_idx ON public.fiscal_periods USING btree (status);


--
-- Name: frame_comments_authorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "frame_comments_authorId_idx" ON public.frame_comments USING btree ("authorId");


--
-- Name: frame_comments_frameId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "frame_comments_frameId_idx" ON public.frame_comments USING btree ("frameId");


--
-- Name: frame_comments_parentId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "frame_comments_parentId_idx" ON public.frame_comments USING btree ("parentId");


--
-- Name: frame_comments_resolved_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX frame_comments_resolved_idx ON public.frame_comments USING btree (resolved);


--
-- Name: frame_drawings_frameId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "frame_drawings_frameId_idx" ON public.frame_drawings USING btree ("frameId");


--
-- Name: general_ledger_accountId_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_accountId_fiscalPeriodId_idx" ON public.general_ledger USING btree ("accountId", "fiscalPeriodId");


--
-- Name: general_ledger_accountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_accountId_idx" ON public.general_ledger USING btree ("accountId");


--
-- Name: general_ledger_accountId_postingDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_accountId_postingDate_idx" ON public.general_ledger USING btree ("accountId", "postingDate");


--
-- Name: general_ledger_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_clientId_idx" ON public.general_ledger USING btree ("clientId");


--
-- Name: general_ledger_entryDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_entryDate_idx" ON public.general_ledger USING btree ("entryDate");


--
-- Name: general_ledger_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_fiscalPeriodId_idx" ON public.general_ledger USING btree ("fiscalPeriodId");


--
-- Name: general_ledger_journalEntryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_journalEntryId_idx" ON public.general_ledger USING btree ("journalEntryId");


--
-- Name: general_ledger_postingDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_postingDate_idx" ON public.general_ledger USING btree ("postingDate");


--
-- Name: general_ledger_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_projectId_idx" ON public.general_ledger USING btree ("projectId");


--
-- Name: general_ledger_transactionType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "general_ledger_transactionType_idx" ON public.general_ledger USING btree ("transactionType");


--
-- Name: goods_receipt_items_grId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "goods_receipt_items_grId_idx" ON public.goods_receipt_items USING btree ("grId");


--
-- Name: goods_receipt_items_poItemId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "goods_receipt_items_poItemId_idx" ON public.goods_receipt_items USING btree ("poItemId");


--
-- Name: goods_receipts_grDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "goods_receipts_grDate_idx" ON public.goods_receipts USING btree ("grDate");


--
-- Name: goods_receipts_grNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "goods_receipts_grNumber_idx" ON public.goods_receipts USING btree ("grNumber");


--
-- Name: goods_receipts_grNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "goods_receipts_grNumber_key" ON public.goods_receipts USING btree ("grNumber");


--
-- Name: goods_receipts_poId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "goods_receipts_poId_idx" ON public.goods_receipts USING btree ("poId");


--
-- Name: goods_receipts_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX goods_receipts_status_idx ON public.goods_receipts USING btree (status);


--
-- Name: goods_receipts_vendorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "goods_receipts_vendorId_idx" ON public.goods_receipts USING btree ("vendorId");


--
-- Name: indonesian_holidays_date_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX indonesian_holidays_date_idx ON public.indonesian_holidays USING btree (date);


--
-- Name: indonesian_holidays_date_region_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX indonesian_holidays_date_region_key ON public.indonesian_holidays USING btree (date, region);


--
-- Name: indonesian_holidays_region_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX indonesian_holidays_region_idx ON public.indonesian_holidays USING btree (region);


--
-- Name: indonesian_holidays_type_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX indonesian_holidays_type_idx ON public.indonesian_holidays USING btree (type);


--
-- Name: indonesian_holidays_year_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX indonesian_holidays_year_idx ON public.indonesian_holidays USING btree (year);


--
-- Name: invoice_counters_year_month_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX invoice_counters_year_month_idx ON public.invoice_counters USING btree (year, month);


--
-- Name: invoice_counters_year_month_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX invoice_counters_year_month_key ON public.invoice_counters USING btree (year, month);


--
-- Name: invoices_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_clientId_idx" ON public.invoices USING btree ("clientId");


--
-- Name: invoices_clientId_projectId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_clientId_projectId_status_idx" ON public.invoices USING btree ("clientId", "projectId", status);


--
-- Name: invoices_clientId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_clientId_status_idx" ON public.invoices USING btree ("clientId", status);


--
-- Name: invoices_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_createdAt_idx" ON public.invoices USING btree ("createdAt");


--
-- Name: invoices_createdAt_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_createdAt_status_idx" ON public.invoices USING btree ("createdAt", status);


--
-- Name: invoices_dueDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_dueDate_idx" ON public.invoices USING btree ("dueDate");


--
-- Name: invoices_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_invoiceNumber_idx" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: invoices_invoiceNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: invoices_materaiRequired_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_materaiRequired_idx" ON public.invoices USING btree ("materaiRequired");


--
-- Name: invoices_materaiRequired_materaiApplied_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_materaiRequired_materaiApplied_status_idx" ON public.invoices USING btree ("materaiRequired", "materaiApplied", status);


--
-- Name: invoices_materaiRequired_totalAmount_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_materaiRequired_totalAmount_idx" ON public.invoices USING btree ("materaiRequired", "totalAmount");


--
-- Name: invoices_paymentMilestoneId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_paymentMilestoneId_idx" ON public.invoices USING btree ("paymentMilestoneId");


--
-- Name: invoices_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_projectId_idx" ON public.invoices USING btree ("projectId");


--
-- Name: invoices_projectMilestoneId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_projectMilestoneId_idx" ON public.invoices USING btree ("projectMilestoneId");


--
-- Name: invoices_quotationId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_quotationId_idx" ON public.invoices USING btree ("quotationId");


--
-- Name: invoices_quotationId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_quotationId_status_idx" ON public.invoices USING btree ("quotationId", status);


--
-- Name: invoices_status_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_status_createdAt_idx" ON public.invoices USING btree (status, "createdAt");


--
-- Name: invoices_status_dueDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "invoices_status_dueDate_idx" ON public.invoices USING btree (status, "dueDate");


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: journal_entries_entryDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_entries_entryDate_idx" ON public.journal_entries USING btree ("entryDate");


--
-- Name: journal_entries_entryNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_entries_entryNumber_idx" ON public.journal_entries USING btree ("entryNumber");


--
-- Name: journal_entries_entryNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON public.journal_entries USING btree ("entryNumber");


--
-- Name: journal_entries_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_entries_fiscalPeriodId_idx" ON public.journal_entries USING btree ("fiscalPeriodId");


--
-- Name: journal_entries_isPosted_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_entries_isPosted_idx" ON public.journal_entries USING btree ("isPosted");


--
-- Name: journal_entries_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX journal_entries_status_idx ON public.journal_entries USING btree (status);


--
-- Name: journal_entries_transactionId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_entries_transactionId_idx" ON public.journal_entries USING btree ("transactionId");


--
-- Name: journal_entries_transactionType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_entries_transactionType_idx" ON public.journal_entries USING btree ("transactionType");


--
-- Name: journal_line_items_accountId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_line_items_accountId_idx" ON public.journal_line_items USING btree ("accountId");


--
-- Name: journal_line_items_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_line_items_clientId_idx" ON public.journal_line_items USING btree ("clientId");


--
-- Name: journal_line_items_journalEntryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_line_items_journalEntryId_idx" ON public.journal_line_items USING btree ("journalEntryId");


--
-- Name: journal_line_items_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "journal_line_items_projectId_idx" ON public.journal_line_items USING btree ("projectId");


--
-- Name: labor_entries_expenseId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "labor_entries_expenseId_idx" ON public.labor_entries USING btree ("expenseId");


--
-- Name: labor_entries_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "labor_entries_projectId_idx" ON public.labor_entries USING btree ("projectId");


--
-- Name: labor_entries_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX labor_entries_status_idx ON public.labor_entries USING btree (status);


--
-- Name: labor_entries_teamMemberId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "labor_entries_teamMemberId_idx" ON public.labor_entries USING btree ("teamMemberId");


--
-- Name: labor_entries_teamMemberId_workDate_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "labor_entries_teamMemberId_workDate_key" ON public.labor_entries USING btree ("teamMemberId", "workDate");


--
-- Name: labor_entries_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "labor_entries_userId_idx" ON public.labor_entries USING btree ("userId");


--
-- Name: labor_entries_workDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "labor_entries_workDate_idx" ON public.labor_entries USING btree ("workDate");


--
-- Name: maintenance_records_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_records_assetId_idx" ON public.maintenance_records USING btree ("assetId");


--
-- Name: maintenance_records_maintenanceType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_records_maintenanceType_idx" ON public.maintenance_records USING btree ("maintenanceType");


--
-- Name: maintenance_records_performedDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_records_performedDate_idx" ON public.maintenance_records USING btree ("performedDate");


--
-- Name: maintenance_schedules_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_schedules_assetId_idx" ON public.maintenance_schedules USING btree ("assetId");


--
-- Name: maintenance_schedules_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_schedules_isActive_idx" ON public.maintenance_schedules USING btree ("isActive");


--
-- Name: maintenance_schedules_isActive_nextMaintenanceDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_schedules_isActive_nextMaintenanceDate_idx" ON public.maintenance_schedules USING btree ("isActive", "nextMaintenanceDate");


--
-- Name: maintenance_schedules_nextMaintenanceDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "maintenance_schedules_nextMaintenanceDate_idx" ON public.maintenance_schedules USING btree ("nextMaintenanceDate");


--
-- Name: media_assets_folderId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_assets_folderId_idx" ON public.media_assets USING btree ("folderId");


--
-- Name: media_assets_mediaType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_assets_mediaType_idx" ON public.media_assets USING btree ("mediaType");


--
-- Name: media_assets_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_assets_projectId_idx" ON public.media_assets USING btree ("projectId");


--
-- Name: media_assets_projectId_starRating_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_assets_projectId_starRating_idx" ON public.media_assets USING btree ("projectId", "starRating");


--
-- Name: media_assets_starRating_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_assets_starRating_idx" ON public.media_assets USING btree ("starRating");


--
-- Name: media_assets_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX media_assets_status_idx ON public.media_assets USING btree (status);


--
-- Name: media_assets_uploadedBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_assets_uploadedBy_idx" ON public.media_assets USING btree ("uploadedBy");


--
-- Name: media_collaborators_guestEmail_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_collaborators_guestEmail_idx" ON public.media_collaborators USING btree ("guestEmail");


--
-- Name: media_collaborators_inviteToken_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "media_collaborators_inviteToken_key" ON public.media_collaborators USING btree ("inviteToken");


--
-- Name: media_collaborators_projectId_guestEmail_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "media_collaborators_projectId_guestEmail_key" ON public.media_collaborators USING btree ("projectId", "guestEmail");


--
-- Name: media_collaborators_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_collaborators_projectId_idx" ON public.media_collaborators USING btree ("projectId");


--
-- Name: media_collaborators_projectId_userId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "media_collaborators_projectId_userId_key" ON public.media_collaborators USING btree ("projectId", "userId");


--
-- Name: media_collaborators_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX media_collaborators_status_idx ON public.media_collaborators USING btree (status);


--
-- Name: media_collaborators_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_collaborators_userId_idx" ON public.media_collaborators USING btree ("userId");


--
-- Name: media_folders_createdById_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_folders_createdById_idx" ON public.media_folders USING btree ("createdById");


--
-- Name: media_folders_parentId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_folders_parentId_idx" ON public.media_folders USING btree ("parentId");


--
-- Name: media_folders_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_folders_projectId_idx" ON public.media_folders USING btree ("projectId");


--
-- Name: media_frames_assetId_timestamp_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_frames_assetId_timestamp_idx" ON public.media_frames USING btree ("assetId", "timestamp");


--
-- Name: media_frames_assetId_x_y_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_frames_assetId_x_y_idx" ON public.media_frames USING btree ("assetId", x, y);


--
-- Name: media_frames_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_frames_createdBy_idx" ON public.media_frames USING btree ("createdBy");


--
-- Name: media_projects_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_projects_clientId_idx" ON public.media_projects USING btree ("clientId");


--
-- Name: media_projects_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_projects_createdBy_idx" ON public.media_projects USING btree ("createdBy");


--
-- Name: media_projects_folderId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_projects_folderId_idx" ON public.media_projects USING btree ("folderId");


--
-- Name: media_projects_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_projects_projectId_idx" ON public.media_projects USING btree ("projectId");


--
-- Name: media_projects_publicShareToken_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_projects_publicShareToken_idx" ON public.media_projects USING btree ("publicShareToken");


--
-- Name: media_projects_publicShareToken_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "media_projects_publicShareToken_key" ON public.media_projects USING btree ("publicShareToken");


--
-- Name: media_versions_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "media_versions_assetId_idx" ON public.media_versions USING btree ("assetId");


--
-- Name: media_versions_assetId_versionNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "media_versions_assetId_versionNumber_key" ON public.media_versions USING btree ("assetId", "versionNumber");


--
-- Name: payment_milestones_projectMilestoneId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payment_milestones_projectMilestoneId_idx" ON public.payment_milestones USING btree ("projectMilestoneId");


--
-- Name: payment_milestones_quotationId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payment_milestones_quotationId_idx" ON public.payment_milestones USING btree ("quotationId");


--
-- Name: payment_milestones_quotationId_milestoneNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "payment_milestones_quotationId_milestoneNumber_key" ON public.payment_milestones USING btree ("quotationId", "milestoneNumber");


--
-- Name: payments_invoiceId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payments_invoiceId_idx" ON public.payments USING btree ("invoiceId");


--
-- Name: payments_invoiceId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payments_invoiceId_status_idx" ON public.payments USING btree ("invoiceId", status);


--
-- Name: payments_paymentDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payments_paymentDate_idx" ON public.payments USING btree ("paymentDate");


--
-- Name: payments_paymentMethod_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payments_paymentMethod_idx" ON public.payments USING btree ("paymentMethod");


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payments_status_paymentDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payments_status_paymentDate_idx" ON public.payments USING btree (status, "paymentDate");


--
-- Name: project_cost_allocations_allocationDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_cost_allocations_allocationDate_idx" ON public.project_cost_allocations USING btree ("allocationDate");


--
-- Name: project_cost_allocations_costType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_cost_allocations_costType_idx" ON public.project_cost_allocations USING btree ("costType");


--
-- Name: project_cost_allocations_expenseId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_cost_allocations_expenseId_idx" ON public.project_cost_allocations USING btree ("expenseId");


--
-- Name: project_cost_allocations_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_cost_allocations_projectId_idx" ON public.project_cost_allocations USING btree ("projectId");


--
-- Name: project_equipment_usage_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_equipment_usage_assetId_idx" ON public.project_equipment_usage USING btree ("assetId");


--
-- Name: project_equipment_usage_assetId_startDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_equipment_usage_assetId_startDate_idx" ON public.project_equipment_usage USING btree ("assetId", "startDate");


--
-- Name: project_equipment_usage_projectId_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_equipment_usage_projectId_assetId_idx" ON public.project_equipment_usage USING btree ("projectId", "assetId");


--
-- Name: project_equipment_usage_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_equipment_usage_projectId_idx" ON public.project_equipment_usage USING btree ("projectId");


--
-- Name: project_equipment_usage_returnDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_equipment_usage_returnDate_idx" ON public.project_equipment_usage USING btree ("returnDate");


--
-- Name: project_equipment_usage_startDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_equipment_usage_startDate_idx" ON public.project_equipment_usage USING btree ("startDate");


--
-- Name: project_milestones_completionPercentage_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_milestones_completionPercentage_idx" ON public.project_milestones USING btree ("completionPercentage");


--
-- Name: project_milestones_milestoneNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_milestones_milestoneNumber_idx" ON public.project_milestones USING btree ("milestoneNumber");


--
-- Name: project_milestones_predecessorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_milestones_predecessorId_idx" ON public.project_milestones USING btree ("predecessorId");


--
-- Name: project_milestones_priority_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX project_milestones_priority_idx ON public.project_milestones USING btree (priority);


--
-- Name: project_milestones_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_milestones_projectId_idx" ON public.project_milestones USING btree ("projectId");


--
-- Name: project_milestones_projectId_milestoneNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "project_milestones_projectId_milestoneNumber_key" ON public.project_milestones USING btree ("projectId", "milestoneNumber");


--
-- Name: project_milestones_projectId_plannedStartDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_milestones_projectId_plannedStartDate_idx" ON public.project_milestones USING btree ("projectId", "plannedStartDate");


--
-- Name: project_milestones_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX project_milestones_status_idx ON public.project_milestones USING btree (status);


--
-- Name: project_milestones_status_plannedEndDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_milestones_status_plannedEndDate_idx" ON public.project_milestones USING btree (status, "plannedEndDate");


--
-- Name: project_team_members_endDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_team_members_endDate_idx" ON public.project_team_members USING btree ("endDate");


--
-- Name: project_team_members_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_team_members_isActive_idx" ON public.project_team_members USING btree ("isActive");


--
-- Name: project_team_members_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_team_members_projectId_idx" ON public.project_team_members USING btree ("projectId");


--
-- Name: project_team_members_projectId_userId_assignedDate_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "project_team_members_projectId_userId_assignedDate_key" ON public.project_team_members USING btree ("projectId", "userId", "assignedDate");


--
-- Name: project_team_members_startDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_team_members_startDate_idx" ON public.project_team_members USING btree ("startDate");


--
-- Name: project_team_members_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_team_members_userId_idx" ON public.project_team_members USING btree ("userId");


--
-- Name: project_type_configs_code_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX project_type_configs_code_idx ON public.project_type_configs USING btree (code);


--
-- Name: project_type_configs_code_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX project_type_configs_code_key ON public.project_type_configs USING btree (code);


--
-- Name: project_type_configs_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_type_configs_isActive_idx" ON public.project_type_configs USING btree ("isActive");


--
-- Name: project_type_configs_sortOrder_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "project_type_configs_sortOrder_idx" ON public.project_type_configs USING btree ("sortOrder");


--
-- Name: projects_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_clientId_idx" ON public.projects USING btree ("clientId");


--
-- Name: projects_clientId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_clientId_status_idx" ON public.projects USING btree ("clientId", status);


--
-- Name: projects_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_createdAt_idx" ON public.projects USING btree ("createdAt");


--
-- Name: projects_grossMarginPercent_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_grossMarginPercent_idx" ON public.projects USING btree ("grossMarginPercent");


--
-- Name: projects_netMarginPercent_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_netMarginPercent_idx" ON public.projects USING btree ("netMarginPercent");


--
-- Name: projects_number_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX projects_number_idx ON public.projects USING btree (number);


--
-- Name: projects_number_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX projects_number_key ON public.projects USING btree (number);


--
-- Name: projects_profitCalculatedAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_profitCalculatedAt_idx" ON public.projects USING btree ("profitCalculatedAt");


--
-- Name: projects_projectTypeId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_projectTypeId_idx" ON public.projects USING btree ("projectTypeId");


--
-- Name: projects_projectTypeId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_projectTypeId_status_idx" ON public.projects USING btree ("projectTypeId", status);


--
-- Name: projects_projectedNetMargin_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_projectedNetMargin_idx" ON public.projects USING btree ("projectedNetMargin");


--
-- Name: projects_status_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_status_createdAt_idx" ON public.projects USING btree (status, "createdAt");


--
-- Name: projects_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX projects_status_idx ON public.projects USING btree (status);


--
-- Name: projects_totalAllocatedCosts_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_totalAllocatedCosts_idx" ON public.projects USING btree ("totalAllocatedCosts");


--
-- Name: purchase_order_items_assetId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_order_items_assetId_idx" ON public.purchase_order_items USING btree ("assetId");


--
-- Name: purchase_order_items_expenseCategoryId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_order_items_expenseCategoryId_idx" ON public.purchase_order_items USING btree ("expenseCategoryId");


--
-- Name: purchase_order_items_poId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_order_items_poId_idx" ON public.purchase_order_items USING btree ("poId");


--
-- Name: purchase_orders_approvalStatus_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_orders_approvalStatus_idx" ON public.purchase_orders USING btree ("approvalStatus");


--
-- Name: purchase_orders_poDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_orders_poDate_idx" ON public.purchase_orders USING btree ("poDate");


--
-- Name: purchase_orders_poNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_orders_poNumber_idx" ON public.purchase_orders USING btree ("poNumber");


--
-- Name: purchase_orders_poNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON public.purchase_orders USING btree ("poNumber");


--
-- Name: purchase_orders_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_orders_projectId_idx" ON public.purchase_orders USING btree ("projectId");


--
-- Name: purchase_orders_requestedBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_orders_requestedBy_idx" ON public.purchase_orders USING btree ("requestedBy");


--
-- Name: purchase_orders_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX purchase_orders_status_idx ON public.purchase_orders USING btree (status);


--
-- Name: purchase_orders_vendorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "purchase_orders_vendorId_idx" ON public.purchase_orders USING btree ("vendorId");


--
-- Name: quotation_counters_year_month_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX quotation_counters_year_month_idx ON public.quotation_counters USING btree (year, month);


--
-- Name: quotation_counters_year_month_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX quotation_counters_year_month_key ON public.quotation_counters USING btree (year, month);


--
-- Name: quotations_clientId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_clientId_idx" ON public.quotations USING btree ("clientId");


--
-- Name: quotations_clientId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_clientId_status_idx" ON public.quotations USING btree ("clientId", status);


--
-- Name: quotations_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_createdAt_idx" ON public.quotations USING btree ("createdAt");


--
-- Name: quotations_createdAt_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_createdAt_status_idx" ON public.quotations USING btree ("createdAt", status);


--
-- Name: quotations_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_projectId_idx" ON public.quotations USING btree ("projectId");


--
-- Name: quotations_projectId_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_projectId_status_idx" ON public.quotations USING btree ("projectId", status);


--
-- Name: quotations_quotationNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_quotationNumber_idx" ON public.quotations USING btree ("quotationNumber");


--
-- Name: quotations_quotationNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON public.quotations USING btree ("quotationNumber");


--
-- Name: quotations_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX quotations_status_idx ON public.quotations USING btree (status);


--
-- Name: quotations_status_validUntil_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_status_validUntil_idx" ON public.quotations USING btree (status, "validUntil");


--
-- Name: quotations_validUntil_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_validUntil_idx" ON public.quotations USING btree ("validUntil");


--
-- Name: refresh_tokens_token_isRevoked_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "refresh_tokens_token_isRevoked_idx" ON public.refresh_tokens USING btree (token, "isRevoked");


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_userId_isRevoked_expiresAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "refresh_tokens_userId_isRevoked_expiresAt_idx" ON public.refresh_tokens USING btree ("userId", "isRevoked", "expiresAt");


--
-- Name: report_sections_reportId_order_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "report_sections_reportId_order_idx" ON public.report_sections USING btree ("reportId", "order");


--
-- Name: social_media_reports_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "social_media_reports_projectId_idx" ON public.social_media_reports USING btree ("projectId");


--
-- Name: social_media_reports_projectId_year_month_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "social_media_reports_projectId_year_month_key" ON public.social_media_reports USING btree ("projectId", year, month);


--
-- Name: social_media_reports_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX social_media_reports_status_idx ON public.social_media_reports USING btree (status);


--
-- Name: social_media_reports_year_month_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX social_media_reports_year_month_idx ON public.social_media_reports USING btree (year, month);


--
-- Name: user_preferences_userId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "user_preferences_userId_key" ON public.user_preferences USING btree ("userId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: ux_metrics_componentName_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "ux_metrics_componentName_idx" ON public.ux_metrics USING btree ("componentName");


--
-- Name: ux_metrics_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "ux_metrics_createdAt_idx" ON public.ux_metrics USING btree ("createdAt");


--
-- Name: ux_metrics_eventType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "ux_metrics_eventType_idx" ON public.ux_metrics USING btree ("eventType");


--
-- Name: ux_metrics_metricName_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "ux_metrics_metricName_idx" ON public.ux_metrics USING btree ("metricName");


--
-- Name: ux_metrics_userId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "ux_metrics_userId_idx" ON public.ux_metrics USING btree ("userId");


--
-- Name: vendor_invoice_items_poItemId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoice_items_poItemId_idx" ON public.vendor_invoice_items USING btree ("poItemId");


--
-- Name: vendor_invoice_items_viId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoice_items_viId_idx" ON public.vendor_invoice_items USING btree ("viId");


--
-- Name: vendor_invoices_accountsPayableId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "vendor_invoices_accountsPayableId_key" ON public.vendor_invoices USING btree ("accountsPayableId");


--
-- Name: vendor_invoices_dueDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_dueDate_idx" ON public.vendor_invoices USING btree ("dueDate");


--
-- Name: vendor_invoices_eFakturNSFP_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_eFakturNSFP_idx" ON public.vendor_invoices USING btree ("eFakturNSFP");


--
-- Name: vendor_invoices_eFakturNSFP_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "vendor_invoices_eFakturNSFP_key" ON public.vendor_invoices USING btree ("eFakturNSFP");


--
-- Name: vendor_invoices_grId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_grId_idx" ON public.vendor_invoices USING btree ("grId");


--
-- Name: vendor_invoices_internalNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_internalNumber_idx" ON public.vendor_invoices USING btree ("internalNumber");


--
-- Name: vendor_invoices_internalNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "vendor_invoices_internalNumber_key" ON public.vendor_invoices USING btree ("internalNumber");


--
-- Name: vendor_invoices_invoiceDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_invoiceDate_idx" ON public.vendor_invoices USING btree ("invoiceDate");


--
-- Name: vendor_invoices_matchingStatus_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_matchingStatus_idx" ON public.vendor_invoices USING btree ("matchingStatus");


--
-- Name: vendor_invoices_poId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_poId_idx" ON public.vendor_invoices USING btree ("poId");


--
-- Name: vendor_invoices_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX vendor_invoices_status_idx ON public.vendor_invoices USING btree (status);


--
-- Name: vendor_invoices_vendorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_invoices_vendorId_idx" ON public.vendor_invoices USING btree ("vendorId");


--
-- Name: vendor_payment_allocations_apId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_payment_allocations_apId_idx" ON public.vendor_payment_allocations USING btree ("apId");


--
-- Name: vendor_payment_allocations_paymentId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_payment_allocations_paymentId_idx" ON public.vendor_payment_allocations USING btree ("paymentId");


--
-- Name: vendor_payments_paymentDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_payments_paymentDate_idx" ON public.vendor_payments USING btree ("paymentDate");


--
-- Name: vendor_payments_paymentNumber_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_payments_paymentNumber_idx" ON public.vendor_payments USING btree ("paymentNumber");


--
-- Name: vendor_payments_paymentNumber_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "vendor_payments_paymentNumber_key" ON public.vendor_payments USING btree ("paymentNumber");


--
-- Name: vendor_payments_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX vendor_payments_status_idx ON public.vendor_payments USING btree (status);


--
-- Name: vendor_payments_vendorId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendor_payments_vendorId_idx" ON public.vendor_payments USING btree ("vendorId");


--
-- Name: vendors_isActive_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendors_isActive_idx" ON public.vendors USING btree ("isActive");


--
-- Name: vendors_name_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX vendors_name_idx ON public.vendors USING btree (name);


--
-- Name: vendors_npwp_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX vendors_npwp_idx ON public.vendors USING btree (npwp);


--
-- Name: vendors_npwp_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX vendors_npwp_key ON public.vendors USING btree (npwp);


--
-- Name: vendors_vendorCode_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendors_vendorCode_idx" ON public.vendors USING btree ("vendorCode");


--
-- Name: vendors_vendorCode_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "vendors_vendorCode_key" ON public.vendors USING btree ("vendorCode");


--
-- Name: vendors_vendorType_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "vendors_vendorType_idx" ON public.vendors USING btree ("vendorType");


--
-- Name: work_in_progress_fiscalPeriodId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "work_in_progress_fiscalPeriodId_idx" ON public.work_in_progress USING btree ("fiscalPeriodId");


--
-- Name: work_in_progress_isCompleted_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "work_in_progress_isCompleted_idx" ON public.work_in_progress USING btree ("isCompleted");


--
-- Name: work_in_progress_periodDate_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "work_in_progress_periodDate_idx" ON public.work_in_progress USING btree ("periodDate");


--
-- Name: work_in_progress_projectId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "work_in_progress_projectId_idx" ON public.work_in_progress USING btree ("projectId");


--
-- Name: work_in_progress_projectId_periodDate_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "work_in_progress_projectId_periodDate_key" ON public.work_in_progress USING btree ("projectId", "periodDate");


--
-- Name: chart_of_accounts trg_auto_create_expense_category; Type: TRIGGER; Schema: public; Owner: invoiceuser
--

CREATE TRIGGER trg_auto_create_expense_category AFTER INSERT ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.auto_create_expense_category();


--
-- Name: chart_of_accounts trg_auto_update_expense_category; Type: TRIGGER; Schema: public; Owner: invoiceuser
--

CREATE TRIGGER trg_auto_update_expense_category AFTER UPDATE ON public.chart_of_accounts FOR EACH ROW WHEN (((old.code IS DISTINCT FROM new.code) OR (old.name IS DISTINCT FROM new.name))) EXECUTE FUNCTION public.auto_create_expense_category();


--
-- Name: account_balances account_balances_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT "account_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: account_balances account_balances_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.account_balances
    ADD CONSTRAINT "account_balances_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounts_payable accounts_payable_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT "accounts_payable_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounts_payable accounts_payable_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT "accounts_payable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT "allowance_for_doubtful_accounts_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT "allowance_for_doubtful_accounts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: allowance_for_doubtful_accounts allowance_for_doubtful_accounts_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.allowance_for_doubtful_accounts
    ADD CONSTRAINT "allowance_for_doubtful_accounts_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_kit_items asset_kit_items_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_kit_items
    ADD CONSTRAINT "asset_kit_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_kit_items asset_kit_items_kitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_kit_items
    ADD CONSTRAINT "asset_kit_items_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES public.asset_kits(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_metadata asset_metadata_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT "asset_metadata_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.media_assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_metadata asset_metadata_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_metadata
    ADD CONSTRAINT "asset_metadata_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_reservations asset_reservations_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT "asset_reservations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_reservations asset_reservations_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT "asset_reservations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_reservations asset_reservations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.asset_reservations
    ADD CONSTRAINT "asset_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_goodsReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_vendorInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT "assets_vendorInvoiceId_fkey" FOREIGN KEY ("vendorInvoiceId") REFERENCES public.vendor_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_reconciliation_items bank_reconciliation_items_reconciliationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_reconciliation_items
    ADD CONSTRAINT "bank_reconciliation_items_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES public.bank_reconciliations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bank_reconciliations bank_reconciliations_bankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_reconciliations
    ADD CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_transfers bank_transfers_fromAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_transfers
    ADD CONSTRAINT "bank_transfers_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bank_transfers bank_transfers_toAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.bank_transfers
    ADD CONSTRAINT "bank_transfers_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_journey_event_metadata business_journey_event_metadata_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_event_metadata
    ADD CONSTRAINT "business_journey_event_metadata_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.business_journey_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: business_journey_events business_journey_events_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: business_journey_events business_journey_events_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: business_journey_events business_journey_events_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.business_journey_events
    ADD CONSTRAINT "business_journey_events_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cash_transactions cash_transactions_cashAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "cash_transactions_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_transactions cash_transactions_offsetAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "cash_transactions_offsetAccountId_fkey" FOREIGN KEY ("offsetAccountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chart_of_accounts chart_of_accounts_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: collection_items collection_items_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT "collection_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.media_assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: collection_items collection_items_collectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT "collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES public.collections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: collections collections_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT "collections_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: collections collections_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT "collections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.media_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: content_calendar_items content_calendar_items_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT "content_calendar_items_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: content_calendar_items content_calendar_items_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT "content_calendar_items_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: content_calendar_items content_calendar_items_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.content_calendar_items
    ADD CONSTRAINT "content_calendar_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: content_media content_media_contentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT "content_media_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES public.content_calendar_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deferred_revenue deferred_revenue_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.deferred_revenue
    ADD CONSTRAINT "deferred_revenue_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: deferred_revenue deferred_revenue_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.deferred_revenue
    ADD CONSTRAINT "deferred_revenue_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: depreciation_entries depreciation_entries_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: depreciation_entries depreciation_entries_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: depreciation_entries depreciation_entries_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: depreciation_entries depreciation_entries_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_entries
    ADD CONSTRAINT "depreciation_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public.depreciation_schedules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: depreciation_schedules depreciation_schedules_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT "depreciation_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_approval_history expense_approval_history_actionBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_approval_history
    ADD CONSTRAINT "expense_approval_history_actionBy_fkey" FOREIGN KEY ("actionBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_approval_history expense_approval_history_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_approval_history
    ADD CONSTRAINT "expense_approval_history_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_budgets expense_budgets_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT "expense_budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_budgets expense_budgets_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT "expense_budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_budgets expense_budgets_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_budgets
    ADD CONSTRAINT "expense_budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_categories expense_categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_comments expense_comments_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_comments
    ADD CONSTRAINT "expense_comments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expense_comments expense_comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_comments
    ADD CONSTRAINT "expense_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expense_documents expense_documents_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expense_documents
    ADD CONSTRAINT "expense_documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_purchaseOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_vendorInvoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_vendorInvoiceId_fkey" FOREIGN KEY ("vendorInvoiceId") REFERENCES public.vendor_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: feature_flag_events feature_flag_events_flagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.feature_flag_events
    ADD CONSTRAINT "feature_flag_events_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES public.feature_flags(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: frame_comments frame_comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_comments
    ADD CONSTRAINT "frame_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: frame_comments frame_comments_frameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_comments
    ADD CONSTRAINT "frame_comments_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES public.media_frames(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: frame_comments frame_comments_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_comments
    ADD CONSTRAINT "frame_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.frame_comments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: frame_comments frame_comments_resolvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_comments
    ADD CONSTRAINT "frame_comments_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: frame_drawings frame_drawings_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_drawings
    ADD CONSTRAINT "frame_drawings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: frame_drawings frame_drawings_frameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.frame_drawings
    ADD CONSTRAINT "frame_drawings_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES public.media_frames(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: general_ledger general_ledger_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT "general_ledger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: general_ledger general_ledger_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT "general_ledger_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipt_items goods_receipt_items_grId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT "goods_receipt_items_grId_fkey" FOREIGN KEY ("grId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: goods_receipt_items goods_receipt_items_poItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT "goods_receipt_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES public.purchase_order_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_poId_fkey" FOREIGN KEY ("poId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: goods_receipts goods_receipts_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT "goods_receipts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_markedPaidBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_markedPaidBy_fkey" FOREIGN KEY ("markedPaidBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_paymentMilestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_paymentMilestoneId_fkey" FOREIGN KEY ("paymentMilestoneId") REFERENCES public.payment_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_projectMilestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "invoices_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_reversedEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT "journal_entries_reversedEntryId_fkey" FOREIGN KEY ("reversedEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_line_items journal_line_items_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.journal_line_items
    ADD CONSTRAINT "journal_line_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: journal_line_items journal_line_items_journalEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.journal_line_items
    ADD CONSTRAINT "journal_line_items_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES public.journal_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: labor_entries labor_entries_costAllocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_costAllocationId_fkey" FOREIGN KEY ("costAllocationId") REFERENCES public.project_cost_allocations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: labor_entries labor_entries_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: labor_entries labor_entries_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: labor_entries labor_entries_teamMemberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES public.project_team_members(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: labor_entries labor_entries_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT "labor_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maintenance_records maintenance_records_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: maintenance_schedules maintenance_schedules_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT "maintenance_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_assets media_assets_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT "media_assets_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public.media_folders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: media_assets media_assets_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT "media_assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.media_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_assets media_assets_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT "media_assets_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: media_collaborators media_collaborators_invitedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_collaborators
    ADD CONSTRAINT "media_collaborators_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: media_collaborators media_collaborators_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_collaborators
    ADD CONSTRAINT "media_collaborators_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.media_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_collaborators media_collaborators_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_collaborators
    ADD CONSTRAINT "media_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_folders media_folders_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_folders
    ADD CONSTRAINT "media_folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: media_folders media_folders_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_folders
    ADD CONSTRAINT "media_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.media_folders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_folders media_folders_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_folders
    ADD CONSTRAINT "media_folders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.media_projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_frames media_frames_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_frames
    ADD CONSTRAINT "media_frames_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.media_assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_frames media_frames_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_frames
    ADD CONSTRAINT "media_frames_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: media_projects media_projects_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_projects
    ADD CONSTRAINT "media_projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: media_projects media_projects_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_projects
    ADD CONSTRAINT "media_projects_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: media_projects media_projects_folderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_projects
    ADD CONSTRAINT "media_projects_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public.media_folders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: media_projects media_projects_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_projects
    ADD CONSTRAINT "media_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: media_versions media_versions_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_versions
    ADD CONSTRAINT "media_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.media_assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_versions media_versions_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.media_versions
    ADD CONSTRAINT "media_versions_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payment_milestones payment_milestones_projectMilestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT "payment_milestones_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_milestones payment_milestones_quotationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT "payment_milestones_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_cost_allocations project_cost_allocations_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_cost_allocations
    ADD CONSTRAINT "project_cost_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_cost_allocations project_cost_allocations_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_cost_allocations
    ADD CONSTRAINT "project_cost_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_equipment_usage project_equipment_usage_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_equipment_usage
    ADD CONSTRAINT "project_equipment_usage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_equipment_usage project_equipment_usage_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_equipment_usage
    ADD CONSTRAINT "project_equipment_usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_predecessorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES public.project_milestones(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_milestones project_milestones_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_team_members project_team_members_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT "project_team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_team_members project_team_members_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.project_team_members
    ADD CONSTRAINT "project_team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects projects_projectTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES public.project_type_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_order_items purchase_order_items_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT "purchase_order_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_expenseCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT "purchase_order_items_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES public.expense_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_items purchase_order_items_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT "purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quotations quotations_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotations quotations_rejectedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT "quotations_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_sections report_sections_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.report_sections
    ADD CONSTRAINT "report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public.social_media_reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: social_media_reports social_media_reports_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.social_media_reports
    ADD CONSTRAINT "social_media_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vendor_invoice_items vendor_invoice_items_poItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT "vendor_invoice_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES public.purchase_order_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoice_items vendor_invoice_items_viId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoice_items
    ADD CONSTRAINT "vendor_invoice_items_viId_fkey" FOREIGN KEY ("viId") REFERENCES public.vendor_invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_invoices vendor_invoices_accountsPayableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES public.accounts_payable(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_grId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_grId_fkey" FOREIGN KEY ("grId") REFERENCES public.goods_receipts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_poId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_poId_fkey" FOREIGN KEY ("poId") REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_invoices vendor_invoices_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT "vendor_invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vendor_payment_allocations vendor_payment_allocations_apId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_payment_allocations
    ADD CONSTRAINT "vendor_payment_allocations_apId_fkey" FOREIGN KEY ("apId") REFERENCES public.accounts_payable(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vendor_payment_allocations vendor_payment_allocations_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_payment_allocations
    ADD CONSTRAINT "vendor_payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.vendor_payments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_payments vendor_payments_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT "vendor_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: work_in_progress work_in_progress_fiscalPeriodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.work_in_progress
    ADD CONSTRAINT "work_in_progress_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES public.fiscal_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: work_in_progress work_in_progress_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoiceuser
--

ALTER TABLE ONLY public.work_in_progress
    ADD CONSTRAINT "work_in_progress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1IiOLVTxFy2c4PZHFbeaHi4iUEnE301t4CF4k0h23gqop552GmG2q2wxTFEqD8H

