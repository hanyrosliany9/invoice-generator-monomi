--
-- PostgreSQL database dump
--

\restrict rfpjTDg8HUs5hfEyD9UI3o2YD4y7uzHxs0bBWzBPX2BFc2RQKkZitIgmcbuyeLu

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
-- Name: FeeType; Type: TYPE; Schema: public; Owner: invoiceuser
--

CREATE TYPE public."FeeType" AS ENUM (
    'PERCENTAGE',
    'FIXED',
    'HOURLY'
);


ALTER TYPE public."FeeType" OWNER TO invoiceuser;

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
    "vendorInvoiceId" text
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
    phone text NOT NULL,
    address text,
    company text,
    "contactPerson" text,
    "paymentTerms" text,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.clients OWNER TO invoiceuser;

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
    title text NOT NULL,
    description text,
    "scheduledAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    status public."ContentStatus" DEFAULT 'DRAFT'::public."ContentStatus" NOT NULL,
    platforms public."ContentPlatform"[],
    "clientId" text,
    "projectId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.content_calendar_items OWNER TO invoiceuser;

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
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.content_media OWNER TO invoiceuser;

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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "subtotalAmount" numeric(15,2),
    "taxRate" numeric(5,2),
    "taxAmount" numeric(15,2),
    "includeTax" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.quotations OWNER TO invoiceuser;

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

COMMENT ON COLUMN public.report_sections.layout IS 'Widget-based layout for visual report builder: {widgets: [{id, type, layout, config}], cols: 12, rowHeight: 30, layoutVersion: 1}';


--
-- Name: COLUMN report_sections."layoutVersion"; Type: COMMENT; Schema: public; Owner: invoiceuser
--

COMMENT ON COLUMN public.report_sections."layoutVersion" IS 'Track layout schema version for future migrations';


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
f7f568ed-3f3b-4e9e-9b02-598ff4ec5e43	70a0150d9e7685f2e55a4b05efe1665cd153b3ff4f920317345123395d63ff10	2025-11-08 09:12:29.827035+00	20251107173854_init_baseline	\N	\N	2025-11-08 09:12:25.770553+00	1
573914cc-29d4-4c7f-af7d-3c319e8bdb35	8f46bbd65151fbf9cf849b61b6cc66d1a22eb3418520d3e6beebb6eb666118ff	2025-11-08 09:12:29.881192+00	20251108060706_add_performance_indexes	\N	\N	2025-11-08 09:12:29.832489+00	1
cb28d173-6da7-4002-a952-f636f6061e28	f41cd0f4d7078402e66e05b6e07a55b52e7bad16d7784aedd0ddcb826d34ab16	2025-11-08 09:12:29.906334+00	20251108061200_fix_milestone_invoice_race_condition	\N	\N	2025-11-08 09:12:29.884619+00	1
50197148-8331-47b9-9424-2cd1eac63b16	f5fddc1a1521c7d29cf9a897b187d224526d6ae2bbd8141301886f5159a0fe1a	2025-11-08 09:43:56.873613+00	20251108094336_add_social_media_ads_reporting	\N	\N	2025-11-08 09:43:56.511585+00	1
825da5b3-eee9-4cac-89d9-f67e17ee406f	cc2a4997510e16ab9b5ef60d5edd5c59987ba16048149d854f09f1ee0f842409	2025-11-08 09:48:02.335217+00	20251108094802_add_cogs_expense_class	\N	\N	2025-11-08 09:48:02.329771+00	1
18871c67-6930-4919-9fb0-a3f4d1e9cbb4	trigger_auto_expense_category	2025-11-08 09:52:40.96251+00	20251108095500_auto_expense_category_trigger	\N	\N	2025-11-08 09:52:40.96251+00	1
575e6ab1-ca9b-4ef6-b7c1-6dbd5911e599	e7ec736f6a11a027478d66b09a1aa8008106e801e0883372c5cc8c2b282c99ee	2025-11-08 10:43:51.28686+00	20251108103500_add_content_planning_calendar	\N	\N	2025-11-08 10:43:51.14258+00	1
b452d707-7a66-4d2f-aee9-e192a8e16974	6fbba960d9630863d16761187fd4f9ea0d1e9bc36b907596526311b06f329666	2025-11-08 15:45:57.541546+00	20251108120000_add_tax_fields_to_quotations	\N	\N	2025-11-08 15:45:57.525985+00	1
b98f61ca-63fa-42a8-bc3a-c7924386e88e	0bfc7c1d287c7e803aadad3d93fb60c0cd047b25c245d91892c73590adf75940	2025-11-09 07:09:46.047492+00	20251109140923_add_universal_social_media_reporting	\N	\N	2025-11-09 07:09:45.92257+00	1
df43261f-1117-422f-a849-447ed62084f5	088269ca1035c9c7911978bcc3e6daa9641343f8539417cf7e9fd39fff75ec81	2025-11-09 07:26:52.566638+00	20251109142637_remove_campaign_system	\N	\N	2025-11-09 07:26:52.506084+00	1
39306005-d4b3-49ca-9df1-b2973c6ba452	8aa11937a54cf79ce335cd34cd40cf01166fb54761550d01d6cd7f45c57858cf	2025-11-09 09:41:25.5782+00	20251109100000_add_report_section_layout	\N	\N	2025-11-09 09:41:25.543432+00	1
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
-- Data for Name: asset_reservations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.asset_reservations (id, "assetId", "userId", "projectId", "startDate", "endDate", purpose, status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.assets (id, "assetCode", name, category, subcategory, manufacturer, model, "serialNumber", specifications, "purchaseDate", "purchasePrice", supplier, "invoiceNumber", "warrantyExpiration", "currentValue", "notesFinancial", status, condition, location, photos, documents, "qrCode", "rfidTag", tags, notes, "createdAt", "updatedAt", "createdById", "vendorId", "purchaseOrderId", "goodsReceiptId", "vendorInvoiceId") FROM stdin;
cmhqihj0f0051g1uc0xrfk50p	CAM-202501-001	Sony A7S III	Camera	Mirrorless	Sony	A7S III	SN-A7S3-12345	\N	2024-03-15 00:00:00	55000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Kamera utama untuk produksi video 4K	2025-11-08 16:41:21.279	2025-11-08 16:41:21.279	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj0k0053g1ucjismywqr	CAM-202501-002	Canon EOS R5	Camera	Mirrorless	Canon	EOS R5	SN-R5-67890	\N	2024-05-10 00:00:00	65000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	CHECKED_OUT	EXCELLENT	Out - Project SM-001	\N	\N	\N	\N	\N	Sedang digunakan untuk project social media	2025-11-08 16:41:21.284	2025-11-08 16:41:21.284	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj0o0055g1uc6ifcr2vo	LEN-202501-001	Sony FE 24-70mm f/2.8 GM II	Lens	Zoom Lens	Sony	SEL2470GM2	SN-LENS-11111	\N	2024-03-15 00:00:00	32000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Lensa zoom serbaguna untuk Sony A7S III	2025-11-08 16:41:21.288	2025-11-08 16:41:21.288	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj0s0057g1ucey89458l	LEN-202501-002	Canon RF 70-200mm f/2.8L	Lens	Telephoto Lens	Canon	RF70200F28L	SN-LENS-22222	\N	2024-05-10 00:00:00	42000000.00	PT Kamera Pro Indonesia	\N	\N	\N	\N	AVAILABLE	GOOD	Equipment Room A	\N	\N	\N	\N	\N	Lensa telephoto untuk Canon R5	2025-11-08 16:41:21.292	2025-11-08 16:41:21.292	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj0w0059g1uc6gqdw7yb	LIG-202501-001	Godox SL-60W LED Light	Lighting	LED Panel	Godox	SL-60W	SN-LIGHT-33333	\N	2024-06-20 00:00:00	3500000.00	Toko Lighting Jakarta	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Studio B	\N	\N	\N	\N	\N	Lampu LED untuk studio photography	2025-11-08 16:41:21.296	2025-11-08 16:41:21.296	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj10005bg1uc7kc64ruw	LIG-202501-002	Aputure 300D Mark II	Lighting	LED Light	Aputure	300D Mark II	SN-APU-44444	\N	2024-07-15 00:00:00	12000000.00	Toko Lighting Jakarta	\N	\N	\N	\N	IN_MAINTENANCE	FAIR	Maintenance Workshop	\N	\N	\N	\N	\N	Dalam perbaikan - mounting bracket rusak	2025-11-08 16:41:21.3	2025-11-08 16:41:21.3	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj14005dg1ucglqlyhyj	AUD-202501-001	Rode VideoMic Pro Plus	Audio	Microphone	Rode	VideoMic Pro+	SN-RODE-55555	\N	2024-04-10 00:00:00	4500000.00	Audio Equipment Store	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Microphone shotgun untuk video production	2025-11-08 16:41:21.304	2025-11-08 16:41:21.304	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj18005fg1ucjpa4qjwx	COM-202501-001	MacBook Pro 16" M2 Max	Computer	Laptop	Apple	MacBook Pro 16 M2 Max	SN-MAC-66666	\N	2024-02-01 00:00:00	48000000.00	iStore Jakarta	\N	\N	\N	\N	RESERVED	EXCELLENT	Editor Desk 1	\N	\N	\N	\N	\N	Reserved untuk video editing project besar	2025-11-08 16:41:21.308	2025-11-08 16:41:21.308	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj1c005hg1ucdxykvmgt	ACC-202501-001	DJI Ronin RSC 2	Accessories	Gimbal	DJI	Ronin RSC 2	SN-DJI-77777	\N	2024-08-05 00:00:00	8500000.00	DJI Store Jakarta	\N	\N	\N	\N	AVAILABLE	GOOD	Equipment Room B	\N	\N	\N	\N	\N	Gimbal 3-axis untuk camera mirrorless	2025-11-08 16:41:21.312	2025-11-08 16:41:21.312	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
cmhqihj1f005jg1ucz1hk336k	ACC-202501-002	Manfrotto MT055XPRO3 Tripod	Accessories	Tripod	Manfrotto	MT055XPRO3	SN-MAN-88888	\N	2024-01-20 00:00:00	6500000.00	Photography Equipment Store	\N	\N	\N	\N	AVAILABLE	EXCELLENT	Equipment Room A	\N	\N	\N	\N	\N	Tripod aluminum professional untuk camera berat	2025-11-08 16:41:21.315	2025-11-08 16:41:21.315	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.audit_logs (id, action, "entityType", "entityId", "oldValues", "newValues", "userId", "ipAddress", "userAgent", "createdAt") FROM stdin;
cmhro6w9w004w13ptbvnhf1ig	CREATE	quotation	quotation-1	\N	{"status": "DRAFT", "totalAmount": 75000000.0, "quotationNumber": "QT-202501-001"}	cmhq2gicz0000tdp49v6ginqs	127.0.0.1	Seed Script	2025-11-09 12:08:49.124
cmhro6w9w004x13ptnj7tfq2j	UPDATE	quotation	quotation-1	{"status": "DRAFT"}	{"status": "APPROVED"}	cmhq2gicz0000tdp49v6ginqs	127.0.0.1	Seed Script	2025-11-09 12:08:49.124
cmhro6w9w004y13ptgxnng056	CREATE	invoice	invoice-1	\N	{"status": "DRAFT", "totalAmount": 75000000.0, "invoiceNumber": "INV-202501-001"}	cmhq2gicz0000tdp49v6ginqs	127.0.0.1	Seed Script	2025-11-09 12:08:49.124
cmhro6w9w004z13ptlbsxtbs7	UPDATE	invoice	invoice-2	{"status": "SENT"}	{"status": "PAID"}	cmhq2gicz0000tdp49v6ginqs	127.0.0.1	Seed Script	2025-11-09 12:08:49.124
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
\.


--
-- Data for Name: business_journey_events; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.business_journey_events (id, type, title, description, status, amount, "clientId", "projectId", "quotationId", "invoiceId", "paymentId", "createdBy", "createdAt", "updatedAt") FROM stdin;
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
cmhqihice000og1ucqqwvxpgk	1-1010	Cash	Kas	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	t	t	t	Cash on hand	Kas ditangan	2025-11-08 16:41:20.414	2025-11-08 16:41:20.414
cmhqihico000pg1ucibr2jfzt	1-1020	Bank Account	Rekening Bank	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	t	t	t	Bank accounts (BCA, Mandiri, BNI)	Rekening bank (BCA, Mandiri, BNI)	2025-11-08 16:41:20.425	2025-11-08 16:41:20.425
cmhqihict000qg1uclln0prx7	1-1021	USD Bank Account	Rekening Bank USD	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	USD	t	t	f	USD denominated bank accounts	Rekening bank dalam mata uang USD	2025-11-08 16:41:20.429	2025-11-08 16:41:20.429
cmhqihicx000rg1ucl19drn5k	1-1022	USDT Crypto Wallet	Dompet Kripto USDT	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	USDT	t	t	f	USDT (Tether) cryptocurrency wallet - FASB ASU 2023-08 compliant	Dompet cryptocurrency USDT (Tether) - Sesuai FASB ASU 2023-08	2025-11-08 16:41:20.433	2025-11-08 16:41:20.433
cmhqihid3000sg1ucbyy2q9rq	1-2010	Accounts Receivable	Piutang Usaha	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	f	t	t	Accounts receivable from customers	Piutang dari pelanggan	2025-11-08 16:41:20.439	2025-11-08 16:41:20.439
cmhqihid7000tg1uci56otuyw	1-3010	Prepaid Expenses	Biaya Dibayar Dimuka	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Prepaid rent, insurance, etc.	Sewa, asuransi, dll yang dibayar dimuka	2025-11-08 16:41:20.443	2025-11-08 16:41:20.443
cmhqihidc000ug1uco9jmi2rp	1-4010	Equipment	Peralatan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Computer equipment, furniture, etc.	Komputer, mebel, dll	2025-11-08 16:41:20.448	2025-11-08 16:41:20.448
cmhqihidg000vg1uc2rdtcb0k	1-4020	Accumulated Depreciation	Akumulasi Penyusutan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	t	Accumulated depreciation on equipment (PSAK 16)	Akumulasi penyusutan peralatan (PSAK 16)	2025-11-08 16:41:20.452	2025-11-08 16:41:20.452
cmhqihidk000wg1ucwbgyfh1a	1-2015	Allowance for Doubtful Accounts	Penyisihan Piutang Tak Tertagih	ASSET	CURRENT_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	t	Expected credit loss provision for accounts receivable (PSAK 71)	Penyisihan kerugian kredit ekspektasian untuk piutang usaha (PSAK 71)	2025-11-08 16:41:20.456	2025-11-08 16:41:20.456
cmhqihido000xg1uccye25vyk	2-1010	Accounts Payable	Hutang Usaha	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	t	f	\N	IDR	f	t	t	Accounts payable to vendors	Hutang kepada vendor	2025-11-08 16:41:20.46	2025-11-08 16:41:20.46
cmhqihids000yg1uc4dy1wr8x	2-2010	PPN Payable	Hutang PPN	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPN_OUT	IDR	f	t	t	VAT payable to tax authority	PPN yang harus dibayar ke DJP	2025-11-08 16:41:20.465	2025-11-08 16:41:20.465
cmhqihidx000zg1uc67rj1tre	2-2020	PPh Payable	Hutang PPh	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPH23	IDR	f	t	t	Withholding tax payable	PPh yang harus dibayar	2025-11-08 16:41:20.469	2025-11-08 16:41:20.469
cmhqihie00010g1uc7z47xh0f	3-1010	Owner Capital	Modal Pemilik	EQUITY	CAPITAL	CREDIT	\N	f	f	\N	IDR	f	t	t	Owner's capital investment	Modal yang disetorkan pemilik	2025-11-08 16:41:20.473	2025-11-08 16:41:20.473
cmhqihie40011g1ucy0fvhzf3	3-2010	Retained Earnings	Laba Ditahan	EQUITY	RETAINED_EARNINGS	CREDIT	\N	f	f	\N	IDR	f	t	t	Accumulated retained earnings	Akumulasi laba yang ditahan	2025-11-08 16:41:20.476	2025-11-08 16:41:20.476
cmhqihie70012g1ucu0rzzkdj	3-3010	Current Year Profit/Loss	Laba/Rugi Tahun Berjalan	EQUITY	CURRENT_EARNINGS	CREDIT	\N	f	f	\N	IDR	f	t	t	Current year profit or loss	Laba/rugi tahun berjalan	2025-11-08 16:41:20.479	2025-11-08 16:41:20.479
cmhqihiea0013g1ucmm9o0wct	3-4010	Owner's Drawing	Prive Pemilik	EQUITY	DRAWING	DEBIT	\N	f	f	\N	IDR	f	t	t	Owner withdrawals	Pengambilan pemilik	2025-11-08 16:41:20.482	2025-11-08 16:41:20.482
cmhqihiec0014g1uc6hfcbxh7	4-1010	Service Revenue	Pendapatan Jasa	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	t	Revenue from services rendered	Pendapatan dari jasa yang diberikan	2025-11-08 16:41:20.485	2025-11-08 16:41:20.485
cmhqihief0015g1uc8pycsgwn	4-2010	Sales Revenue	Pendapatan Penjualan	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from sales	Pendapatan dari penjualan	2025-11-08 16:41:20.488	2025-11-08 16:41:20.488
cmhqihiei0016g1ucuxc6rgn0	4-9010	Other Income	Pendapatan Lain-Lain	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	t	Other income from non-operating activities	Pendapatan lain-lain dari aktivitas non-operasional	2025-11-08 16:41:20.49	2025-11-08 16:41:20.49
cmhqihiel0017g1ucquqrkn1e	6-1010	Sales Salaries	Gaji Penjualan	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Salaries and allowances for sales staff	Gaji dan tunjangan karyawan penjualan	2025-11-08 16:41:20.493	2025-11-08 16:41:20.493
cmhqihieo0018g1ucwd37xvcm	6-1030	Advertising & Promotion	Iklan dan Promosi	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising, promotion, and marketing costs	Biaya iklan, promosi, dan marketing	2025-11-08 16:41:20.497	2025-11-08 16:41:20.497
cmhqihier0019g1ucfxjgpf8x	6-1070	Digital Marketing	Marketing Digital	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Online marketing costs	Biaya marketing online	2025-11-08 16:41:20.5	2025-11-08 16:41:20.5
cmhqihieu001ag1ucl2xlc7yx	6-2020	Office Rent	Sewa Kantor	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Office rental costs	Biaya sewa kantor	2025-11-08 16:41:20.503	2025-11-08 16:41:20.503
cmhqihiex001bg1ucokzwq9ks	6-2030	Electricity & Water	Listrik dan Air	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Electricity and water costs	Biaya listrik dan air	2025-11-08 16:41:20.506	2025-11-08 16:41:20.506
cmhqihif0001cg1uc83jnbqi8	6-2050	Office Supplies	Perlengkapan Kantor	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Stationery and office supplies	Alat tulis dan perlengkapan kantor	2025-11-08 16:41:20.508	2025-11-08 16:41:20.508
cmhqihif3001dg1ucyvdw7kll	6-2070	Professional Services	Jasa Profesional	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Professional service fees	Biaya jasa profesional	2025-11-08 16:41:20.511	2025-11-08 16:41:20.511
cmhqihif6001eg1ucfdo846by	6-2130	Software & Licenses	Software dan Lisensi	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Software and license costs	Biaya software dan lisensi	2025-11-08 16:41:20.514	2025-11-08 16:41:20.514
cmhqihif9001fg1ucjw8ckb24	6-2160	Bank Charges	Biaya Bank	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Bank fees and charges	Biaya administrasi bank	2025-11-08 16:41:20.517	2025-11-08 16:41:20.517
cmhqihifc001gg1ucnex3e37j	6-2190	Miscellaneous Expenses	Biaya Lain-Lain	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Miscellaneous expenses	Biaya lain-lain	2025-11-08 16:41:20.52	2025-11-08 16:41:20.52
cmhqihife001hg1uc3sbzzbi1	6-3010	Depreciation Expense	Beban Penyusutan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	t	Depreciation expense on fixed assets (PSAK 16)	Beban penyusutan aset tetap (PSAK 16)	2025-11-08 16:41:20.523	2025-11-08 16:41:20.523
cmhqihifi001ig1ucwqaad0hl	8-1010	Bad Debt Expense	Beban Piutang Tak Tertagih	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	t	Bad debt expense and ECL provision (PSAK 71)	Beban piutang tak tertagih dan penyisihan kerugian kredit (PSAK 71)	2025-11-08 16:41:20.526	2025-11-08 16:41:20.526
cmhqihifk001jg1uc2rps1zeg	8-2010	Other Expenses	Beban Lain-Lain	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Other non-operating expenses	Beban lain-lain diluar operasional	2025-11-08 16:41:20.529	2025-11-08 16:41:20.529
cmhqihifn001kg1uc2vxbjbdl	1-1510	Inventory - Raw Materials	Persediaan Bahan Baku	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	f	t	f	Raw materials inventory	Persediaan bahan baku untuk produksi	2025-11-08 16:41:20.531	2025-11-08 16:41:20.531
cmhqihifp001lg1uc7skve6te	1-1520	Inventory - Work in Progress	Persediaan Barang Dalam Proses	ASSET	CURRENT_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Work in progress inventory	Persediaan barang yang masih dalam proses produksi	2025-11-08 16:41:20.534	2025-11-08 16:41:20.534
cmhqihifs001mg1uc20302vnx	1-1530	Inventory - Finished Goods	Persediaan Barang Jadi	ASSET	CURRENT_ASSET	DEBIT	\N	t	f	\N	IDR	f	t	f	Finished goods inventory	Persediaan barang jadi siap dijual	2025-11-08 16:41:20.536	2025-11-08 16:41:20.536
cmhqihifv001ng1uc128ox6nj	1-2510	Prepaid PPh 23	PPh Pasal 23 Dibayar Dimuka	ASSET	CURRENT_ASSET	DEBIT	\N	f	t	PPh_23	IDR	f	t	f	Prepaid income tax article 23	Pajak penghasilan pasal 23 yang dibayar dimuka	2025-11-08 16:41:20.539	2025-11-08 16:41:20.539
cmhqihify001og1ucmfox346l	1-2520	Prepaid PPh 25	PPh Pasal 25 Dibayar Dimuka	ASSET	CURRENT_ASSET	DEBIT	\N	f	t	PPh_25	IDR	f	t	f	Prepaid income tax article 25 (monthly installment)	Pajak penghasilan pasal 25 (angsuran bulanan)	2025-11-08 16:41:20.542	2025-11-08 16:41:20.542
cmhqihig0001pg1uccl55arvo	1-2530	Prepaid PPN	PPN Masukan	ASSET	CURRENT_ASSET	DEBIT	\N	f	t	VAT_IN	IDR	f	t	f	Prepaid VAT (input VAT)	PPN yang dibayar saat pembelian (PPN Masukan)	2025-11-08 16:41:20.545	2025-11-08 16:41:20.545
cmhqihig3001qg1uc2rtpuqhb	1-4110	Land	Tanah	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Land (not depreciated)	Tanah (tidak disusutkan)	2025-11-08 16:41:20.547	2025-11-08 16:41:20.547
cmhqihig6001rg1ucok68i2co	1-4210	Buildings	Bangunan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Buildings and structures	Bangunan dan gedung	2025-11-08 16:41:20.55	2025-11-08 16:41:20.55
cmhqihig8001sg1ucj14w1tut	1-4220	Accumulated Depreciation - Buildings	Akumulasi Penyusutan Bangunan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for buildings	Akumulasi penyusutan bangunan	2025-11-08 16:41:20.553	2025-11-08 16:41:20.553
cmhqihigb001tg1ucc4zjsav0	1-4310	Vehicles	Kendaraan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Vehicles and transportation equipment	Kendaraan dan alat transportasi	2025-11-08 16:41:20.556	2025-11-08 16:41:20.556
cmhqihige001ug1uc6jfnqebc	1-4320	Accumulated Depreciation - Vehicles	Akumulasi Penyusutan Kendaraan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for vehicles	Akumulasi penyusutan kendaraan	2025-11-08 16:41:20.558	2025-11-08 16:41:20.558
cmhqihigh001vg1uc1xci8a6s	1-4410	Furniture & Fixtures	Perabotan Kantor	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Office furniture and fixtures	Perabotan dan perlengkapan kantor	2025-11-08 16:41:20.561	2025-11-08 16:41:20.561
cmhqihigj001wg1ucyrlsi6ge	1-4420	Accumulated Depreciation - Furniture	Akumulasi Penyusutan Perabotan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for furniture	Akumulasi penyusutan perabotan	2025-11-08 16:41:20.564	2025-11-08 16:41:20.564
cmhqihigm001xg1uc2gr478zp	1-5010	Goodwill	Goodwill	ASSET	INTANGIBLE_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Goodwill and brand value	Goodwill dan nilai merek	2025-11-08 16:41:20.566	2025-11-08 16:41:20.566
cmhqihigp001yg1ucfxe4y393	1-5020	Patents & Trademarks	Hak Paten dan Merek Dagang	ASSET	INTANGIBLE_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Patents, trademarks, and intellectual property	Hak paten, merek dagang, dan kekayaan intelektual	2025-11-08 16:41:20.569	2025-11-08 16:41:20.569
cmhqihigr001zg1ucb286sdke	1-5030	Software Licenses	Lisensi Perangkat Lunak	ASSET	INTANGIBLE_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Long-term software licenses	Lisensi perangkat lunak jangka panjang	2025-11-08 16:41:20.572	2025-11-08 16:41:20.572
cmhqihigu0020g1uce534i01t	2-1110	Wages Payable	Hutang Gaji	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	t	f	\N	IDR	f	t	f	Accrued wages and salaries payable	Hutang gaji dan upah karyawan	2025-11-08 16:41:20.574	2025-11-08 16:41:20.574
cmhqihigx0021g1uct36toptk	2-1120	Accrued Expenses	Biaya Yang Masih Harus Dibayar	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Accrued expenses not yet paid	Biaya yang sudah terjadi tetapi belum dibayar	2025-11-08 16:41:20.577	2025-11-08 16:41:20.577
cmhqihih10022g1uc8eck9n0q	2-1130	Customer Deposits	Uang Muka Pelanggan	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Advance payments from customers	Uang muka yang diterima dari pelanggan	2025-11-08 16:41:20.581	2025-11-08 16:41:20.581
cmhqihiha0023g1uc1jk2ze7r	2-2110	PPh 21 Payable	Hutang PPh Pasal 21	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_21	IDR	f	t	f	Income tax article 21 (employee withholding) payable	Hutang pajak penghasilan pasal 21 (pemotongan gaji karyawan)	2025-11-08 16:41:20.59	2025-11-08 16:41:20.59
cmhqihihj0024g1ucw4c1iahy	2-2120	PPh 23 Payable	Hutang PPh Pasal 23	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_23	IDR	f	t	f	Income tax article 23 (service withholding) payable	Hutang pajak penghasilan pasal 23 (pemotongan jasa)	2025-11-08 16:41:20.599	2025-11-08 16:41:20.599
cmhqihiht0025g1ucn4bwqads	2-2130	PPh 25 Payable	Hutang PPh Pasal 25	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_25	IDR	f	t	f	Income tax article 25 (monthly corporate tax) payable	Hutang pajak penghasilan pasal 25 (angsuran pajak badan)	2025-11-08 16:41:20.609	2025-11-08 16:41:20.609
cmhqihii20026g1uc09swahav	2-2140	PPh 29 Payable	Hutang PPh Pasal 29	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	PPh_29	IDR	f	t	f	Income tax article 29 (final annual tax) payable	Hutang pajak penghasilan pasal 29 (kurang bayar tahunan)	2025-11-08 16:41:20.618	2025-11-08 16:41:20.618
cmhqihiic0027g1ucf4x0mlvu	2-2150	PPN Output	PPN Keluaran	LIABILITY	CURRENT_LIABILITY	CREDIT	\N	f	t	VAT_OUT	IDR	f	t	f	VAT collected from sales (output VAT)	PPN yang dipungut dari penjualan (PPN Keluaran)	2025-11-08 16:41:20.627	2025-11-08 16:41:20.627
cmhqihiil0028g1ucfajk1pd2	2-3010	Bank Loans	Pinjaman Bank	LIABILITY	LONG_TERM_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Long-term bank loans	Pinjaman bank jangka panjang	2025-11-08 16:41:20.637	2025-11-08 16:41:20.637
cmhqihiiu0029g1ucoyadi89y	2-3020	Bonds Payable	Hutang Obligasi	LIABILITY	LONG_TERM_LIABILITY	CREDIT	\N	f	f	\N	IDR	f	t	f	Bonds and debentures payable	Hutang obligasi dan surat utang	2025-11-08 16:41:20.646	2025-11-08 16:41:20.646
cmhqihij3002ag1ucb074smdw	4-1020	Product Sales	Penjualan Produk	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from product sales	Pendapatan dari penjualan produk	2025-11-08 16:41:20.655	2025-11-08 16:41:20.655
cmhqihijd002bg1ucttl6w55v	4-1030	Consulting Revenue	Pendapatan Konsultasi	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from consulting services	Pendapatan dari jasa konsultasi	2025-11-08 16:41:20.665	2025-11-08 16:41:20.665
cmhqihijl002cg1ucn7bxrxd9	4-1040	Training Revenue	Pendapatan Pelatihan	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from training services	Pendapatan dari jasa pelatihan	2025-11-08 16:41:20.673	2025-11-08 16:41:20.673
cmhqihijr002dg1ucj0kin14b	4-8010	Interest Income	Pendapatan Bunga	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	f	Interest income from deposits	Pendapatan bunga dari deposito	2025-11-08 16:41:20.679	2025-11-08 16:41:20.679
cmhqihijw002eg1ucid4ix1cs	4-8020	Foreign Exchange Gain	Keuntungan Selisih Kurs	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	f	Realized foreign exchange gains	Keuntungan selisih kurs yang terealisasi	2025-11-08 16:41:20.684	2025-11-08 16:41:20.684
cmhqihik1002fg1uc1jig6vfb	4-8030	Gain on Asset Sales	Keuntungan Penjualan Aset	REVENUE	OTHER_INCOME	CREDIT	\N	f	f	\N	IDR	f	t	f	Gains from sale of fixed assets	Keuntungan dari penjualan aset tetap	2025-11-08 16:41:20.689	2025-11-08 16:41:20.689
cmhqihik6002gg1ucro9hiz42	5-1010	Cost of Goods Sold	Harga Pokok Penjualan	EXPENSE	COGS	DEBIT	\N	t	f	\N	IDR	f	t	f	Cost of goods sold	Harga pokok barang yang terjual	2025-11-08 16:41:20.694	2025-11-08 16:41:20.694
cmhqihikc002hg1ucd7s9ezdo	5-1020	Direct Labor	Biaya Tenaga Kerja Langsung	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Direct labor costs for production	Biaya tenaga kerja langsung untuk produksi	2025-11-08 16:41:20.7	2025-11-08 16:41:20.7
cmhqihiki002ig1ucuqfskdcm	5-1030	Manufacturing Overhead	Biaya Overhead Pabrik	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Manufacturing overhead costs	Biaya overhead produksi	2025-11-08 16:41:20.706	2025-11-08 16:41:20.706
cmhqihikn002jg1ucwocjq1mq	6-5010	Salaries - Management	Gaji Manajemen	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Management salaries and compensation	Gaji dan kompensasi manajemen	2025-11-08 16:41:20.712	2025-11-08 16:41:20.712
cmhqihikt002kg1uc9yf4xw3k	6-5020	Salaries - Administrative	Gaji Administrasi	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Administrative staff salaries	Gaji karyawan administrasi	2025-11-08 16:41:20.717	2025-11-08 16:41:20.717
cmhqihikz002lg1uc3h3wl6qv	6-5030	Employee Benefits	Tunjangan Karyawan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Employee benefits (BPJS, insurance, allowances)	Tunjangan karyawan (BPJS, asuransi, tunjangan)	2025-11-08 16:41:20.723	2025-11-08 16:41:20.723
cmhqihil4002mg1ucps9expio	6-5040	Severance Pay	Pesangon	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Employee severance and termination benefits	Pesangon dan uang pisah karyawan	2025-11-08 16:41:20.729	2025-11-08 16:41:20.729
cmhqihila002ng1uc1lsdllf4	6-4010	Income Tax Expense	Beban Pajak Penghasilan	EXPENSE	TAX_EXPENSE	DEBIT	\N	f	t	\N	IDR	f	t	f	Corporate income tax expense	Beban pajak penghasilan badan	2025-11-08 16:41:20.734	2025-11-08 16:41:20.734
cmhqihilf002og1uclkzcv7i2	6-4020	Property Tax	Pajak Bumi dan Bangunan (PBB)	EXPENSE	TAX_EXPENSE	DEBIT	\N	f	t	\N	IDR	f	t	f	Property tax (PBB)	Pajak bumi dan bangunan	2025-11-08 16:41:20.739	2025-11-08 16:41:20.739
cmhqihilm002pg1uc5juj4qko	8-3010	Interest Expense	Beban Bunga	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Interest expense on loans	Beban bunga pinjaman	2025-11-08 16:41:20.746	2025-11-08 16:41:20.746
cmhqihilv002qg1uc3myyj4gn	8-3020	Foreign Exchange Loss	Rugi Selisih Kurs	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Realized foreign exchange losses	Kerugian selisih kurs yang terealisasi	2025-11-08 16:41:20.755	2025-11-08 16:41:20.755
cmhqihim4002rg1uca6w9zomg	8-3030	Loss on Asset Sales	Kerugian Penjualan Aset	EXPENSE	OTHER_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Losses from sale of fixed assets	Kerugian dari penjualan aset tetap	2025-11-08 16:41:20.764	2025-11-08 16:41:20.764
cmhqihimo002tg1ucwsn4kved	4-2020	Photography Revenue	Pendapatan Fotografi	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from photography services	Pendapatan dari jasa fotografi	2025-11-08 16:41:20.784	2025-11-08 16:41:20.784
cmhqihimx002ug1ucsic0olys	4-2030	Graphic Design Revenue	Pendapatan Desain Grafis	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from graphic design services	Pendapatan dari jasa desain grafis	2025-11-08 16:41:20.793	2025-11-08 16:41:20.793
cmhqihin7002vg1ucd5h1ot06	4-2040	Web Development Revenue	Pendapatan Pengembangan Website	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from web development services	Pendapatan dari jasa pembuatan website	2025-11-08 16:41:20.803	2025-11-08 16:41:20.803
cmhqihing002wg1uc1bwyvhh7	4-2050	Social Media Management Revenue	Pendapatan Manajemen Media Sosial	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from social media management services	Pendapatan dari jasa manajemen media sosial	2025-11-08 16:41:20.812	2025-11-08 16:41:20.812
cmhqihinp002xg1uc4829bu84	4-2060	Content Creation Revenue	Pendapatan Pembuatan Konten	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from content creation services	Pendapatan dari jasa pembuatan konten	2025-11-08 16:41:20.821	2025-11-08 16:41:20.821
cmhqihinx002yg1uc1gapzm4i	4-2070	Video Editing Revenue	Pendapatan Editing Video	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from video editing services	Pendapatan dari jasa editing video	2025-11-08 16:41:20.829	2025-11-08 16:41:20.829
cmhqihio2002zg1uc75ua4w97	4-2080	Animation Revenue	Pendapatan Animasi	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from animation services	Pendapatan dari jasa animasi	2025-11-08 16:41:20.834	2025-11-08 16:41:20.834
cmhqihio70030g1ucnssqzufx	4-2090	Branding & Identity Revenue	Pendapatan Branding & Identitas	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from branding and corporate identity services	Pendapatan dari jasa branding dan identitas korporat	2025-11-08 16:41:20.839	2025-11-08 16:41:20.839
cmhqihioc0031g1ucqg93mihg	5-2010	Freelancer - Videographer	Freelancer Videografer	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance videographer costs	Biaya videografer freelance	2025-11-08 16:41:20.844	2025-11-08 16:41:20.844
cmhqihioi0032g1ucy3m8wzft	5-2020	Freelancer - Photographer	Freelancer Fotografer	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance photographer costs	Biaya fotografer freelance	2025-11-08 16:41:20.85	2025-11-08 16:41:20.85
cmhqihioo0033g1ucqn7xkmub	5-2030	Freelancer - Graphic Designer	Freelancer Desainer Grafis	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance graphic designer costs	Biaya desainer grafis freelance	2025-11-08 16:41:20.856	2025-11-08 16:41:20.856
cmhqihiou0034g1ucqwbqbujl	5-2040	Freelancer - Web Developer	Freelancer Developer Website	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance web developer costs	Biaya developer website freelance	2025-11-08 16:41:20.862	2025-11-08 16:41:20.862
cmhqihip00035g1ucam84j8l3	5-2050	Freelancer - Video Editor	Freelancer Editor Video	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance video editor costs	Biaya editor video freelance	2025-11-08 16:41:20.868	2025-11-08 16:41:20.868
cmhqihip50036g1ucjhuuq2q7	5-2060	Freelancer - Content Writer	Freelancer Penulis Konten	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance content writer costs	Biaya penulis konten freelance	2025-11-08 16:41:20.874	2025-11-08 16:41:20.874
cmhqihipb0037g1ucgujq54r9	5-3010	Stock Footage & Music	Footage & Musik Stok	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Stock footage, music, and media assets	Biaya footage, musik, dan aset media stok	2025-11-08 16:41:20.879	2025-11-08 16:41:20.879
cmhqihipg0038g1uc3ac11n1r	5-3020	Props & Equipment Rental	Sewa Properti & Peralatan	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Props and equipment rental for productions	Biaya sewa properti dan peralatan untuk produksi	2025-11-08 16:41:20.885	2025-11-08 16:41:20.885
cmhqihipm0039g1uce33ctz8w	5-3030	Location Rental	Sewa Lokasi	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Location rental for shoots	Biaya sewa lokasi untuk pengambilan gambar	2025-11-08 16:41:20.89	2025-11-08 16:41:20.89
cmhqihipr003ag1uchoa02c8o	5-3040	Talent & Models	Talent & Model	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Talent and model fees	Biaya talent dan model	2025-11-08 16:41:20.895	2025-11-08 16:41:20.895
cmhqihiq2003cg1uc7a6pvgri	6-3020	Cloud Storage (Dropbox/Google)	Penyimpanan Cloud	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Cloud storage subscription for project files	Langganan penyimpanan cloud untuk file proyek	2025-11-08 16:41:20.906	2025-11-08 16:41:20.906
cmhqihiq7003dg1ucemv8a3es	6-3030	Project Management Software	Software Manajemen Proyek	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Project management tools (Asana, Trello, Monday)	Tools manajemen proyek (Asana, Trello, Monday)	2025-11-08 16:41:20.911	2025-11-08 16:41:20.911
cmhqihiqd003eg1ucvnztsz6q	6-3040	Stock Photo Subscriptions	Langganan Foto Stok	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Stock photo subscriptions (Shutterstock, Unsplash Pro)	Langganan foto stok (Shutterstock, Unsplash Pro)	2025-11-08 16:41:20.917	2025-11-08 16:41:20.917
cmhqihiqi003fg1ucp89beqec	6-3050	Video Hosting & Streaming	Hosting & Streaming Video	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Video hosting services (Vimeo Pro, YouTube Premium)	Layanan hosting video (Vimeo Pro, YouTube Premium)	2025-11-08 16:41:20.923	2025-11-08 16:41:20.923
cmhqihiqo003gg1uc5cw68iyn	6-3060	Equipment Maintenance & Repair	Pemeliharaan & Perbaikan Peralatan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Camera, lens, and equipment maintenance	Pemeliharaan kamera, lensa, dan peralatan	2025-11-08 16:41:20.928	2025-11-08 16:41:20.928
cmhqihiqt003hg1ucgnd1baca	6-3070	Internet & Bandwidth	Internet & Bandwidth	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	High-speed internet for uploads and downloads	Internet berkecepatan tinggi untuk upload dan download	2025-11-08 16:41:20.934	2025-11-08 16:41:20.934
cmhqihiqz003ig1ucxt8e9dju	6-3080	Portfolio Website Hosting	Hosting Website Portfolio	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Portfolio website hosting and domain	Hosting dan domain website portfolio	2025-11-08 16:41:20.939	2025-11-08 16:41:20.939
cmhqihir4003jg1uc2w53jmr6	4-3010	SEO & SEM Services Revenue	Pendapatan Layanan SEO & SEM	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from SEO and search engine marketing services	Pendapatan dari layanan SEO dan marketing mesin pencari	2025-11-08 16:41:20.945	2025-11-08 16:41:20.945
cmhqihira003kg1ucua1gp8os	4-3020	UI/UX Design Revenue	Pendapatan Desain UI/UX	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from user interface and experience design	Pendapatan dari desain antarmuka dan pengalaman pengguna	2025-11-08 16:41:20.95	2025-11-08 16:41:20.95
cmhrslv7y0001q25y9uolndqn	6-2031	Transport Expense	Beban Transportasi	EXPENSE	SALES_EXPENSE	DEBIT	\N	t	f	\N	IDR	f	t	f	\N	\N	2025-11-09 14:12:26.062	2025-11-09 14:12:26.062
cmhqihirf003lg1ucdzzilr4m	4-3030	Mobile App Development Revenue	Pendapatan Pengembangan Aplikasi Mobile	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from mobile application development	Pendapatan dari pembuatan aplikasi mobile (iOS/Android)	2025-11-08 16:41:20.955	2025-11-08 16:41:20.955
cmhqihirk003mg1ucpbl3n5h4	4-3040	Influencer Marketing Revenue	Pendapatan Marketing Influencer	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from influencer marketing campaign management	Pendapatan dari manajemen kampanye influencer marketing	2025-11-08 16:41:20.96	2025-11-08 16:41:20.96
cmhqihirp003ng1ucdfov9efm	4-3050	Podcast Production Revenue	Pendapatan Produksi Podcast	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from podcast recording and production services	Pendapatan dari jasa rekaman dan produksi podcast	2025-11-08 16:41:20.966	2025-11-08 16:41:20.966
cmhqihirv003og1uc4lkdxwbq	4-3060	Livestreaming Services Revenue	Pendapatan Jasa Livestreaming	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from live event streaming services	Pendapatan dari jasa siaran langsung acara	2025-11-08 16:41:20.971	2025-11-08 16:41:20.971
cmhqihis0003pg1uc76kglo9k	4-3070	3D Modeling & Rendering Revenue	Pendapatan Modeling & Rendering 3D	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from 3D modeling and rendering services	Pendapatan dari jasa modeling dan rendering 3D	2025-11-08 16:41:20.976	2025-11-08 16:41:20.976
cmhqihis9003qg1ucu0e12zho	4-3080	Email Marketing Services Revenue	Pendapatan Jasa Email Marketing	REVENUE	OPERATING_REVENUE	CREDIT	\N	f	f	\N	IDR	f	t	f	Revenue from email marketing campaign management	Pendapatan dari manajemen kampanye email marketing	2025-11-08 16:41:20.985	2025-11-08 16:41:20.985
cmhqihisf003rg1uc2fxg3amm	1-4510	Camera & Photography Equipment	Kamera & Peralatan Fotografi	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Cameras, lenses, tripods, and photography accessories	Kamera, lensa, tripod, dan aksesoris fotografi	2025-11-08 16:41:20.991	2025-11-08 16:41:20.991
cmhqihisk003sg1uckqnq6g5k	1-4520	Accumulated Depreciation - Camera Equipment	Akumulasi Penyusutan Peralatan Kamera	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for camera equipment	Akumulasi penyusutan peralatan kamera	2025-11-08 16:41:20.996	2025-11-08 16:41:20.996
cmhqihisp003tg1ucd53io12m	1-4530	Video & Audio Production Equipment	Peralatan Produksi Video & Audio	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Video cameras, microphones, audio recorders, mixers	Kamera video, mikrofon, perekam audio, mixer	2025-11-08 16:41:21.001	2025-11-08 16:41:21.001
cmhqihisu003ug1ucb72ui0em	1-4540	Accumulated Depreciation - Video/Audio Equipment	Akumulasi Penyusutan Peralatan Video/Audio	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for video and audio equipment	Akumulasi penyusutan peralatan video dan audio	2025-11-08 16:41:21.006	2025-11-08 16:41:21.006
cmhqihit0003vg1uccmsswx2a	1-4550	Lighting Equipment	Peralatan Pencahayaan	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	Studio lights, LED panels, reflectors, and lighting accessories	Lampu studio, panel LED, reflektor, dan aksesoris pencahayaan	2025-11-08 16:41:21.012	2025-11-08 16:41:21.012
cmhqihit5003wg1ucdl0s0fpa	1-4560	Accumulated Depreciation - Lighting Equipment	Akumulasi Penyusutan Peralatan Pencahayaan	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for lighting equipment	Akumulasi penyusutan peralatan pencahayaan	2025-11-08 16:41:21.017	2025-11-08 16:41:21.017
cmhqihita003xg1uc0dpz5vac	1-4570	Editing Workstations & Computers	Workstation Editing & Komputer	ASSET	FIXED_ASSET	DEBIT	\N	f	f	\N	IDR	f	t	f	High-performance computers for video/photo editing and rendering	Komputer performa tinggi untuk editing video/foto dan rendering	2025-11-08 16:41:21.022	2025-11-08 16:41:21.022
cmhqihitf003yg1ucgbflckj1	1-4580	Accumulated Depreciation - Computers	Akumulasi Penyusutan Komputer	ASSET	FIXED_ASSET	CREDIT	\N	f	f	\N	IDR	f	t	f	Accumulated depreciation for editing workstations	Akumulasi penyusutan workstation editing	2025-11-08 16:41:21.028	2025-11-08 16:41:21.028
cmhqihitk003zg1uc9cjo7n7k	6-6010	Meta Ads (Facebook/Instagram)	Iklan Meta (Facebook/Instagram)	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on Meta platforms	Biaya iklan di platform Meta	2025-11-08 16:41:21.033	2025-11-08 16:41:21.033
cmhqihitq0040g1ucfeo539lw	6-6020	Google Ads (Search/Display/YouTube)	Google Ads (Search/Display/YouTube)	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on Google platforms	Biaya iklan di platform Google	2025-11-08 16:41:21.038	2025-11-08 16:41:21.038
cmhqihitw0041g1ucd3js8hbg	6-6030	TikTok Ads	Iklan TikTok	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on TikTok platform	Biaya iklan di platform TikTok	2025-11-08 16:41:21.044	2025-11-08 16:41:21.044
cmhqihiu10042g1uckdyjqtl7	6-6040	LinkedIn Ads	Iklan LinkedIn	EXPENSE	SELLING_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Advertising spend on LinkedIn platform	Biaya iklan di platform LinkedIn	2025-11-08 16:41:21.05	2025-11-08 16:41:21.05
cmhqihiu70043g1uc5xciyy42	6-7010	Figma/Sketch Subscription	Langganan Figma/Sketch	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	UI/UX design tool subscription	Langganan tools desain UI/UX	2025-11-08 16:41:21.055	2025-11-08 16:41:21.055
cmhqihiud0044g1ucmwkdmbcy	6-7020	Font & Typography Licenses	Lisensi Font & Tipografi	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Premium font licenses for commercial use	Lisensi font premium untuk penggunaan komersial	2025-11-08 16:41:21.061	2025-11-08 16:41:21.061
cmhqihiui0045g1ucat3lcznd	6-7030	Music Licensing (Epidemic Sound, Artlist)	Lisensi Musik (Epidemic Sound, Artlist)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Music licensing for video production	Lisensi musik untuk produksi video	2025-11-08 16:41:21.066	2025-11-08 16:41:21.066
cmhqihiuo0046g1ucxv24phu9	6-7040	3D Software (Blender/Cinema 4D)	Software 3D (Blender/Cinema 4D)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	3D modeling and rendering software subscriptions	Langganan software modeling dan rendering 3D	2025-11-08 16:41:21.072	2025-11-08 16:41:21.072
cmhqihiuu0047g1ucrnrpvwoi	6-7050	Color Grading Software (DaVinci Resolve)	Software Color Grading (DaVinci Resolve)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Professional color grading and finishing software	Software color grading dan finishing profesional	2025-11-08 16:41:21.078	2025-11-08 16:41:21.078
cmhqihiuz0048g1ucrqvwir2x	6-7060	Analytics Tools (Google Analytics, Hotjar)	Tools Analitik (Google Analytics, Hotjar)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Website analytics and user behavior tracking tools	Tools analitik website dan pelacakan perilaku user	2025-11-08 16:41:21.083	2025-11-08 16:41:21.083
cmhqihiv50049g1ucvfjfjk7w	6-7070	Email Marketing Platform (Mailchimp, SendGrid)	Platform Email Marketing (Mailchimp, SendGrid)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Email marketing automation platform subscriptions	Langganan platform otomasi email marketing	2025-11-08 16:41:21.089	2025-11-08 16:41:21.089
cmhqihiva004ag1uch5vi3s46	6-7080	CRM Software (HubSpot, Salesforce)	Software CRM (HubSpot, Salesforce)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Customer relationship management software	Software manajemen hubungan pelanggan	2025-11-08 16:41:21.095	2025-11-08 16:41:21.095
cmhqihivg004bg1ucqiocdc21	6-7090	Social Media Scheduling Tools (Buffer, Hootsuite)	Tools Penjadwalan Sosmed (Buffer, Hootsuite)	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Social media scheduling and management platforms	Platform penjadwalan dan manajemen media sosial	2025-11-08 16:41:21.1	2025-11-08 16:41:21.1
cmhqihivl004cg1ucv8992oua	6-7100	Domain & SSL Certificates	Domain & Sertifikat SSL	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Domain registrations and SSL certificate renewals	Registrasi domain dan perpanjangan sertifikat SSL	2025-11-08 16:41:21.106	2025-11-08 16:41:21.106
cmhrsmh940003q25ye3ycy1sl	6-2032	Accomodation Expense	Beban Akomodasi	EXPENSE	SALES_EXPENSE	DEBIT	\N	t	f	\N	IDR	f	t	f	\N	\N	2025-11-09 14:12:54.617	2025-11-09 14:12:54.617
cmhqihivr004dg1uco53ur0or	6-7110	Web Hosting Services	Layanan Web Hosting	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	Web hosting for client projects and internal sites	Web hosting untuk proyek klien dan website internal	2025-11-08 16:41:21.111	2025-11-08 16:41:21.111
cmhqihivx004eg1ucaw67bhge	6-7120	VPN & Security Software	VPN & Software Keamanan	EXPENSE	ADMIN_EXPENSE	DEBIT	\N	f	f	\N	IDR	f	t	f	VPN services and cybersecurity software subscriptions	Layanan VPN dan langganan software keamanan cyber	2025-11-08 16:41:21.117	2025-11-08 16:41:21.117
cmhqihiw3004fg1ucvudxfatp	5-4010	Freelancer - Social Media Specialist	Freelancer Spesialis Media Sosial	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance social media specialist costs	Biaya spesialis media sosial freelance	2025-11-08 16:41:21.123	2025-11-08 16:41:21.123
cmhqihiw9004gg1uchzvj39b8	5-4020	Freelancer - SEO Specialist	Freelancer Spesialis SEO	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance SEO specialist costs	Biaya spesialis SEO freelance	2025-11-08 16:41:21.129	2025-11-08 16:41:21.129
cmhqihiwe004hg1ucnvu9qe5i	5-4030	Freelancer - UI/UX Designer	Freelancer Desainer UI/UX	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance UI/UX designer costs	Biaya desainer UI/UX freelance	2025-11-08 16:41:21.134	2025-11-08 16:41:21.134
cmhqihiwk004ig1uctq8g5lbo	5-4040	Freelancer - Motion Graphics Designer	Freelancer Desainer Motion Graphics	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Freelance motion graphics designer costs	Biaya desainer motion graphics freelance	2025-11-08 16:41:21.14	2025-11-08 16:41:21.14
cmhqihiwq004jg1uc8oyfqq69	5-4050	Freelancer - Voice Over Artist	Freelancer Pengisi Suara	EXPENSE	COGS	DEBIT	\N	f	f	\N	IDR	f	t	f	Voice over artist fees for video narration	Biaya pengisi suara untuk narasi video	2025-11-08 16:41:21.146	2025-11-08 16:41:21.146
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.clients (id, name, email, phone, address, company, "contactPerson", "paymentTerms", status, "createdAt", "updatedAt") FROM stdin;
cmhrssgrw0004q25yilsyk11p	Pravitha Utami	pravithautami@atlascopco.com	081197611829	Jl. AH. Nasution No. 262	PT. ATLAS COPCO	Pravitha Utami	Net 14	active	2025-11-09 14:17:33.933	2025-11-09 14:17:33.933
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.company_settings (id, "companyName", address, phone, email, website, "taxNumber", currency, "bankBCA", "bankMandiri", "bankBNI", "createdAt", "updatedAt") FROM stdin;
default	Monomi Agency	Taman Cibaduyut Indah Blok E 232	085156662098	admin@monomiagency.com		000000000000000	IDR	3462676350			2025-11-08 10:39:35.304	2025-11-08 10:41:27.486
\.


--
-- Data for Name: content_calendar_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.content_calendar_items (id, title, description, "scheduledAt", "publishedAt", status, platforms, "clientId", "projectId", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: content_media; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.content_media (id, url, key, type, "mimeType", size, width, height, duration, "originalName", "contentId", "uploadedAt") FROM stdin;
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
e1ed384d-57e3-4452-8ae3-a37070b7e9ac	6_2031	6-2031	GENERAL_ADMIN	Transport Expense	Beban Transportasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-09 14:12:26.063	2025-11-09 14:12:26.063
7099cad4-1901-4113-b3c5-600245efde07	6_7030	6-7030	OTHER	Music Licensing (Epidemic Sound, Artlist)	Lisensi Musik (Epidemic Sound, Artlist)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.068	2025-11-08 16:41:21.068
86bf971f-69d2-4775-a232-3604e5beee8d	6_7040	6-7040	OTHER	3D Software (Blender/Cinema 4D)	Software 3D (Blender/Cinema 4D)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.073	2025-11-08 16:41:21.073
e5a48e3f-7454-404a-9fce-da0a8bde067f	6_7050	6-7050	OTHER	Color Grading Software (DaVinci Resolve)	Software Color Grading (DaVinci Resolve)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.079	2025-11-08 16:41:21.079
c618c9eb-b79a-40ac-a097-22337562f24b	6_7060	6-7060	OTHER	Analytics Tools (Google Analytics, Hotjar)	Tools Analitik (Google Analytics, Hotjar)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.085	2025-11-08 16:41:21.085
5a92437a-97f7-44b3-a6a1-683229635af6	6_7070	6-7070	OTHER	Email Marketing Platform (Mailchimp, SendGrid)	Platform Email Marketing (Mailchimp, SendGrid)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.09	2025-11-08 16:41:21.09
f3ff8e65-9417-489e-9f7f-97de6bc90cc3	6_7080	6-7080	OTHER	CRM Software (HubSpot, Salesforce)	Software CRM (HubSpot, Salesforce)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.096	2025-11-08 16:41:21.096
4557e6db-908c-4da0-8446-4728cbed85cd	6_7090	6-7090	OTHER	Social Media Scheduling Tools (Buffer, Hootsuite)	Tools Penjadwalan Sosmed (Buffer, Hootsuite)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.101	2025-11-08 16:41:21.101
4c36d7a4-eb38-42ae-b9e6-c2204b83e818	6_7100	6-7100	OTHER	Domain & SSL Certificates	Domain & Sertifikat SSL	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.107	2025-11-08 16:41:21.107
6ea02d03-b301-4e0e-8900-1c8b6d504a2a	6_7110	6-7110	OTHER	Web Hosting Services	Layanan Web Hosting	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.112	2025-11-08 16:41:21.112
e09d2330-5646-4d62-8ac3-bd0825d99298	6_2032	6-2032	GENERAL_ADMIN	Accomodation Expense	Beban Akomodasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-09 14:12:54.618	2025-11-09 14:12:54.618
d48e9fd8-88ff-4337-939e-ff2905c31286	6_6010	6-6010	OTHER	Meta Ads (Facebook/Instagram)	Iklan Meta (Facebook/Instagram)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.034	2025-11-08 16:41:21.034
2c8d0013-5d5a-45dd-89c1-1698d43ac0e9	6_6020	6-6020	OTHER	Google Ads (Search/Display/YouTube)	Google Ads (Search/Display/YouTube)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.04	2025-11-08 16:41:21.04
dc986180-fe25-431c-a3a4-0de0522834e7	6_6030	6-6030	OTHER	TikTok Ads	Iklan TikTok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.045	2025-11-08 16:41:21.045
36cf2917-9f8e-403a-bcbb-34fcc6a7e874	6_6040	6-6040	OTHER	LinkedIn Ads	Iklan LinkedIn	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.051	2025-11-08 16:41:21.051
699d8d1e-ff8d-4cbf-84da-2a768410c58e	6_7010	6-7010	OTHER	Figma/Sketch Subscription	Langganan Figma/Sketch	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.056	2025-11-08 16:41:21.056
59186154-c551-4215-8c36-2f13f517346d	6_7020	6-7020	OTHER	Font & Typography Licenses	Lisensi Font & Tipografi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.062	2025-11-08 16:41:21.062
3b7acf45-a2aa-482e-aa02-6104c256366a	6_7120	6-7120	OTHER	VPN & Security Software	VPN & Software Keamanan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.118	2025-11-08 16:41:21.118
48caaedb-9f7b-4dc3-b69c-a28db2fcc676	5_4010	5-4010	COGS	Freelancer - Social Media Specialist	Freelancer Spesialis Media Sosial	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.124	2025-11-08 16:41:21.124
c586ba9e-ab28-4e07-b98a-2ffba7272533	5_4020	5-4020	COGS	Freelancer - SEO Specialist	Freelancer Spesialis SEO	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.13	2025-11-08 16:41:21.13
0b34fa17-858e-4f1d-9079-2f452208db68	5_4030	5-4030	COGS	Freelancer - UI/UX Designer	Freelancer Desainer UI/UX	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.136	2025-11-08 16:41:21.136
a2f830d9-277d-4835-a9b8-bee202ed4eb5	5_4040	5-4040	COGS	Freelancer - Motion Graphics Designer	Freelancer Desainer Motion Graphics	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.141	2025-11-08 16:41:21.141
778396ce-339b-4974-9f91-4eea53336e6c	5_4050	5-4050	COGS	Freelancer - Voice Over Artist	Freelancer Pengisi Suara	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:21.147	2025-11-08 16:41:21.147
3be4fcdc-5db3-45a1-9656-adb78bcc9d1d	6_4020	6-4020	OTHER	Property Tax	Pajak Bumi dan Bangunan (PBB)	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.741	2025-11-08 16:41:20.741
6edc1405-b630-4b61-86c9-9beb77cf6595	5_2010	5-2010	COGS	Freelancer - Videographer	Freelancer Videografer	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.846	2025-11-08 16:41:20.846
cmhqihic4000mg1uc0uvd4svg	LABOR	6-2010	LABOR_COST	Labor Costs	Biaya Tenaga Kerja	Labor and personnel costs generated from time tracking	Biaya tenaga kerja dan personel dari pelacakan waktu	\N	0.0000	f	NONE	\N	team	#722ed1	t	f	t	f	t	10	2025-11-08 16:41:20.404	2025-11-08 16:41:20.404
cmhqihiav000dg1uc4bszuxsp	SELLING_SALARIES	6-1010	SELLING	Sales Salaries	Gaji Penjualan	Salaries and allowances for sales staff	Gaji dan tunjangan karyawan penjualan	\N	0.0000	f	NONE	\N	user	#1890ff	t	f	t	f	t	1	2025-11-08 16:41:20.359	2025-11-08 16:41:20.494
cmhqihib2000eg1ucvf5a471s	ADVERTISING	6-1030	SELLING	Advertising & Promotion	Iklan dan Promosi	Advertising, promotion, and marketing costs	Biaya iklan, promosi, dan marketing	\N	0.1200	f	NONE	\N	sound	#fa8c16	t	t	t	t	t	3	2025-11-08 16:41:20.366	2025-11-08 16:41:20.497
cmhqihib7000fg1uczugb08d1	DIGITAL_MARKETING	6-1070	SELLING	Digital Marketing	Marketing Digital	Online marketing costs (Google Ads, Facebook Ads, etc.)	Biaya marketing online (Google Ads, Facebook Ads, dll)	\N	0.1200	f	NONE	\N	global	#eb2f96	t	t	t	t	t	7	2025-11-08 16:41:20.371	2025-11-08 16:41:20.5
cmhqihibc000gg1ucasdn1sb7	OFFICE_RENT	6-2020	GENERAL_ADMIN	Office Rent	Sewa Kantor	Office building or space rental costs	Biaya sewa gedung/ruang kantor	\N	0.1200	f	PPH4_2	0.1000	home	#52c41a	t	f	t	t	t	20	2025-11-08 16:41:20.376	2025-11-08 16:41:20.503
cmhqihibh000hg1ucva31yj73	UTILITIES	6-2030	GENERAL_ADMIN	Electricity & Water	Listrik dan Air	Electricity, water, and office utilities	Biaya listrik, air, dan utilitas kantor	\N	0.1200	f	NONE	\N	bulb	#faad14	t	f	t	t	t	30	2025-11-08 16:41:20.381	2025-11-08 16:41:20.506
cmhqihibm000ig1uckrzlx97o	OFFICE_SUPPLIES	6-2050	GENERAL_ADMIN	Office Supplies	Perlengkapan Kantor	Stationery and office supplies	Biaya alat tulis dan perlengkapan kantor	\N	0.1200	f	NONE	\N	file	#2f54eb	t	f	t	t	t	50	2025-11-08 16:41:20.386	2025-11-08 16:41:20.509
cmhqihibr000jg1uc7rohcwbl	PROFESSIONAL_SERVICES	6-2070	GENERAL_ADMIN	Professional Services	Jasa Profesional	Professional services (accountants, auditors, etc.)	Biaya jasa profesional (akuntan, auditor, dll)	\N	0.1200	f	PPH23	0.0200	solution	#eb2f96	t	t	t	t	t	70	2025-11-08 16:41:20.391	2025-11-08 16:41:20.512
cmhqihibv000kg1uctbl6dukc	SOFTWARE	6-2130	GENERAL_ADMIN	Software & Licenses	Software dan Lisensi	Software, SaaS, and license costs	Biaya software, SaaS, dan lisensi	\N	0.1200	f	NONE	\N	cloud	#2f54eb	t	f	t	t	t	130	2025-11-08 16:41:20.396	2025-11-08 16:41:20.515
cmhqihic0000lg1uc6739dtyb	BANK_CHARGES	6-2160	GENERAL_ADMIN	Bank Charges	Biaya Bank	Bank administration and service fees	Biaya administrasi dan layanan bank	\N	0.0000	f	NONE	\N	transaction	#faad14	t	f	t	f	t	160	2025-11-08 16:41:20.4	2025-11-08 16:41:20.518
cmhqihic9000ng1ucw9zm2b1y	MISCELLANEOUS	6-2190	GENERAL_ADMIN	Miscellaneous Expenses	Biaya Lain-Lain	Miscellaneous expenses	Biaya lain-lain	\N	0.1200	f	NONE	\N	more	#8c8c8c	t	f	t	t	t	190	2025-11-08 16:41:20.409	2025-11-08 16:41:20.521
a4e95655-2246-43d7-9090-0621026293c2	6_3010	6-3010	OTHER	Depreciation Expense	Beban Penyusutan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.523	2025-11-08 16:41:20.523
d2bcc15e-9a48-4170-a014-69409b8a0335	5_1010	5-1010	COGS	Cost of Goods Sold	Harga Pokok Penjualan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.695	2025-11-08 16:41:20.695
1c4d44bc-616b-4423-b4dd-2d8249f110e8	5_1020	5-1020	COGS	Direct Labor	Biaya Tenaga Kerja Langsung	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.701	2025-11-08 16:41:20.701
9fb8e1b6-8487-4bb4-b28e-ba82df7ef5d0	5_1030	5-1030	COGS	Manufacturing Overhead	Biaya Overhead Pabrik	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.707	2025-11-08 16:41:20.707
375ed760-2fb8-4438-8dfd-32186034bcd4	6_5010	6-5010	OTHER	Salaries - Management	Gaji Manajemen	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.713	2025-11-08 16:41:20.713
7726e052-3184-4f04-8f0a-aa5c714098ae	6_5020	6-5020	OTHER	Salaries - Administrative	Gaji Administrasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.718	2025-11-08 16:41:20.718
1a64a465-2d23-44e4-857c-79a32db5279c	6_5030	6-5030	OTHER	Employee Benefits	Tunjangan Karyawan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.724	2025-11-08 16:41:20.724
37ab9d57-2d3a-43ec-8b22-688dbf8c573c	6_5040	6-5040	OTHER	Severance Pay	Pesangon	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.73	2025-11-08 16:41:20.73
3dc0693e-d629-47d3-a245-9f3d63e21a81	6_4010	6-4010	OTHER	Income Tax Expense	Beban Pajak Penghasilan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.735	2025-11-08 16:41:20.735
d26e8c22-f92b-4446-a6ca-9bf9e27362c2	5_2020	5-2020	COGS	Freelancer - Photographer	Freelancer Fotografer	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.852	2025-11-08 16:41:20.852
ba0caa41-2250-4f1a-999c-193f41686eff	5_2030	5-2030	COGS	Freelancer - Graphic Designer	Freelancer Desainer Grafis	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.858	2025-11-08 16:41:20.858
9b2c5cba-e493-43ba-8ff3-d5205d91261a	5_2040	5-2040	COGS	Freelancer - Web Developer	Freelancer Developer Website	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.863	2025-11-08 16:41:20.863
3994f8c6-6603-4537-b80d-ca64e683fde6	5_2050	5-2050	COGS	Freelancer - Video Editor	Freelancer Editor Video	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.869	2025-11-08 16:41:20.869
87a66713-7c5b-45c3-861e-02ff08071023	5_2060	5-2060	COGS	Freelancer - Content Writer	Freelancer Penulis Konten	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.875	2025-11-08 16:41:20.875
81ebcf23-e44e-4feb-8a0a-2d2d0a02cae7	5_3010	5-3010	COGS	Stock Footage & Music	Footage & Musik Stok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.88	2025-11-08 16:41:20.88
3aded9ca-a1db-43c9-97d4-21856772d62f	5_3020	5-3020	COGS	Props & Equipment Rental	Sewa Properti & Peralatan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.886	2025-11-08 16:41:20.886
aeb94ebc-e1fd-4725-b9ae-e593a5cbf3ab	5_3030	5-3030	COGS	Location Rental	Sewa Lokasi	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.891	2025-11-08 16:41:20.891
203ffd01-d0c0-4dd9-aced-6e76ae500dc5	5_3040	5-3040	COGS	Talent & Models	Talent & Model	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.897	2025-11-08 16:41:20.897
dccc080c-d8b5-41ea-bedd-cdf31ca4bab8	6_3020	6-3020	OTHER	Cloud Storage (Dropbox/Google)	Penyimpanan Cloud	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.907	2025-11-08 16:41:20.907
69b25ffc-a127-4026-b3d4-121bbb7636e8	6_3030	6-3030	OTHER	Project Management Software	Software Manajemen Proyek	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.912	2025-11-08 16:41:20.912
50f92696-e614-478a-8eaa-ec2326ffd069	6_3040	6-3040	OTHER	Stock Photo Subscriptions	Langganan Foto Stok	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.918	2025-11-08 16:41:20.918
c6681132-a82f-49a0-adf6-b0fd6ec07dd4	6_3050	6-3050	OTHER	Video Hosting & Streaming	Hosting & Streaming Video	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.924	2025-11-08 16:41:20.924
c036ea58-2c82-4ca2-b5eb-f05615577ae7	6_3060	6-3060	OTHER	Equipment Maintenance & Repair	Pemeliharaan & Perbaikan Peralatan	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.929	2025-11-08 16:41:20.929
8df4b3c7-7564-45ca-9ef3-0a427597370c	6_3070	6-3070	OTHER	Internet & Bandwidth	Internet & Bandwidth	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.935	2025-11-08 16:41:20.935
773c4d54-48b8-460d-8618-027989dccafe	6_3080	6-3080	OTHER	Portfolio Website Hosting	Hosting Website Portfolio	\N	\N	\N	0.1200	f	NONE	\N	\N	#1890ff	t	f	t	t	t	0	2025-11-08 16:41:20.94	2025-11-08 16:41:20.94
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
cmhqihixv004kg1uc78f8ftq0	January 2025	2025-01	MONTHLY	2025-01-01 00:00:00	2025-01-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.188	2025-11-08 16:41:21.188
cmhqihixz004lg1ucs6zs16q7	February 2025	2025-02	MONTHLY	2025-02-01 00:00:00	2025-02-28 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.191	2025-11-08 16:41:21.191
cmhqihiy2004mg1ucvy9fq6s5	March 2025	2025-03	MONTHLY	2025-03-01 00:00:00	2025-03-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.194	2025-11-08 16:41:21.194
cmhqihiy5004ng1uct8tpdt63	April 2025	2025-04	MONTHLY	2025-04-01 00:00:00	2025-04-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.197	2025-11-08 16:41:21.197
cmhqihiy8004og1ucsh1hhfs3	May 2025	2025-05	MONTHLY	2025-05-01 00:00:00	2025-05-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.2	2025-11-08 16:41:21.2
cmhqihiyb004pg1uc6nnx1rxl	June 2025	2025-06	MONTHLY	2025-06-01 00:00:00	2025-06-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.203	2025-11-08 16:41:21.203
cmhqihiye004qg1uck83m4g46	July 2025	2025-07	MONTHLY	2025-07-01 00:00:00	2025-07-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.206	2025-11-08 16:41:21.206
cmhqihiyh004rg1uc79mxmdcv	August 2025	2025-08	MONTHLY	2025-08-01 00:00:00	2025-08-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.209	2025-11-08 16:41:21.209
cmhqihiyk004sg1uckjuecbxm	September 2025	2025-09	MONTHLY	2025-09-01 00:00:00	2025-09-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.212	2025-11-08 16:41:21.212
cmhqihiyn004tg1uc63poo3yr	October 2025	2025-10	MONTHLY	2025-10-01 00:00:00	2025-10-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.215	2025-11-08 16:41:21.215
cmhqihiyq004ug1ucai75t2r4	November 2025	2025-11	MONTHLY	2025-11-01 00:00:00	2025-11-30 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.218	2025-11-08 16:41:21.218
cmhqihiyt004vg1ucp0881qz5	December 2025	2025-12	MONTHLY	2025-12-01 00:00:00	2025-12-31 23:59:59	OPEN	t	\N	\N	\N	2025-11-08 16:41:21.221	2025-11-08 16:41:21.221
\.


--
-- Data for Name: general_ledger; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.general_ledger (id, "accountId", "entryDate", "postingDate", "journalEntryId", "journalEntryNumber", "lineNumber", debit, credit, balance, description, "descriptionId", "transactionType", "transactionId", "documentNumber", "projectId", "clientId", "fiscalPeriodId", "createdAt") FROM stdin;
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
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.invoices (id, "invoiceNumber", "creationDate", "dueDate", "quotationId", "clientId", "projectId", "amountPerProject", "totalAmount", "subtotalAmount", "taxRate", "taxAmount", "includeTax", "scopeOfWork", "priceBreakdown", "paymentInfo", "materaiRequired", "materaiApplied", "materaiAppliedAt", "materaiAppliedBy", "materaiAmount", terms, signature, status, "createdBy", "markedPaidBy", "markedPaidAt", "journalEntryId", "paymentJournalId", "paymentMilestoneId", "projectMilestoneId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.journal_entries (id, "entryNumber", "entryDate", "postingDate", description, "descriptionId", "descriptionEn", "transactionType", "transactionId", "documentNumber", "documentDate", status, "isPosted", "postedAt", "postedBy", "fiscalPeriodId", "isReversing", "reversedEntryId", "createdBy", "updatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: journal_line_items; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.journal_line_items (id, "journalEntryId", "lineNumber", "accountId", debit, credit, description, "descriptionId", "projectId", "clientId", "departmentId", "createdAt", "updatedAt") FROM stdin;
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
-- Data for Name: payment_milestones; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.payment_milestones (id, "quotationId", "milestoneNumber", name, "nameId", description, "descriptionId", "paymentPercentage", "paymentAmount", "dueDate", "dueDaysFromPrev", deliverables, "isInvoiced", "projectMilestoneId", "createdAt", "updatedAt") FROM stdin;
cmhrt4p79000bq25yxf1wp5as	cmhrt4p6t0009q25yj02xnim7	1	Down Payment	DP 50%	Initial payment upon project commencement	Pembayaran awal saat proyek dimulai	50.00	2250000.00	\N	\N	\N	f	\N	2025-11-09 14:27:04.725	2025-11-09 15:14:19.057
cmhrt4p7h000dq25y3ucg4q8e	cmhrt4p6t0009q25yj02xnim7	2	Final Payment	Pelunasan	Final payment upon project completion	Pembayaran akhir saat proyek selesai	50.00	2250000.00	\N	\N	\N	f	\N	2025-11-09 14:27:04.733	2025-11-09 15:14:19.196
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
cmhq2giey0008tdp4r41zz6l5	PRODUCTION	Production Work	Website development, software development, and other production tasks	PH	#52c41a	t	t	1	2025-11-08 09:12:39.994	2025-11-08 09:12:39.994
cmhq2gif60009tdp43pbx1t4n	SOCIAL_MEDIA	Social Media Management	Content creation, social media management, and digital marketing	SM	#1890ff	f	t	2	2025-11-08 09:12:40.003	2025-11-08 09:12:40.003
cmhq2gifd000atdp49z4lwaa5	CONSULTATION	Consultation Services	Business consultation, technical consultation, and advisory services	CS	#722ed1	f	t	3	2025-11-08 09:12:40.009	2025-11-08 09:12:40.009
cmhq2gifj000btdp40y8ttc5a	MAINTENANCE	Maintenance & Support	System maintenance, bug fixes, and technical support	MT	#fa8c16	f	t	4	2025-11-08 09:12:40.015	2025-11-08 09:12:40.015
cmhq2gifp000ctdp42mknwl7r	OTHER	Other Services	Miscellaneous services and custom projects	OT	#595959	f	t	5	2025-11-08 09:12:40.022	2025-11-08 09:12:40.022
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.projects (id, number, description, "scopeOfWork", output, "projectTypeId", "clientId", "startDate", "endDate", "estimatedBudget", "basePrice", "priceBreakdown", "estimatedExpenses", "projectedGrossMargin", "projectedNetMargin", "projectedProfit", "totalDirectCosts", "totalIndirectCosts", "totalAllocatedCosts", "totalInvoicedAmount", "totalPaidAmount", "grossProfit", "netProfit", "grossMarginPercent", "netMarginPercent", "budgetVariance", "budgetVariancePercent", "profitCalculatedAt", "profitCalculatedBy", status, "createdAt", "updatedAt") FROM stdin;
cmhrt3q5y0005q25y5hnci7rw	PRJ-PH-202511-001	Photoshoot and Editing Service	1. Professional Photography Services for One and a half Days\n\n2. Post-Production & Deliverables:\n- Complete archive of all RAW/unedited photos\n- professionally edited high-resolution image\n- Professional editing includes:\n- Color correction and white balance\n- Exposure and brightness optimization\n- Contrast, saturation, and highlight/shadow adjustment\n\n3. Delivery Timeline: Final edited photos in 10 business days\n\n4. Additional & Revision Policy:  \n- 1 complimentary revision round (minor color/crop adjustments)  \n- Must be requested within 7 business days of delivery  \n- Additional edited photo revision : Rp 150,000 / photo  \n- Re-shoot: charged as new session at daily rate		cmhq2giey0008tdp4r41zz6l5	cmhrssgrw0004q25yilsyk11p	2025-11-12 17:00:00	2025-11-19 17:00:00	600000.00	4500000.00	{"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}	{"direct": [{"notes": "Transport PP", "amount": 400000, "categoryId": "e1ed384d-57e3-4452-8ae3-a37070b7e9ac", "categoryName": "Transport Expense", "categoryNameId": "Beban Transportasi"}, {"notes": "", "amount": 200000, "categoryId": "e09d2330-5646-4d62-8ac3-bd0825d99298", "categoryName": "Accomodation Expense", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 600000, "calculatedAt": "2025-11-09T14:26:19.315Z", "totalIndirect": 0, "totalEstimated": 600000}	86.67	86.67	3900000.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	-600000.00	-100.00	2025-11-09 14:26:19.58	\N	PLANNING	2025-11-09 14:26:19.318	2025-11-09 14:26:19.581
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
cmhqi9kyn0001ohstk39m2mnk	2025	11	2	2025-11-08 16:35:10.559	2025-11-09 14:27:04.706
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.quotations (id, "quotationNumber", date, "validUntil", "clientId", "projectId", "amountPerProject", "totalAmount", "scopeOfWork", "priceBreakdown", terms, "paymentType", "paymentTermsText", status, "createdBy", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "createdAt", "updatedAt", "subtotalAmount", "taxRate", "taxAmount", "includeTax") FROM stdin;
cmhrt4p6t0009q25yj02xnim7	QT-202511-002	2025-11-09 14:27:04.71	2025-11-11 17:00:00	cmhrssgrw0004q25yilsyk11p	cmhrt3q5y0005q25y5hnci7rw	4500000.00	4500000.00	1. Professional Photography Services for One and a half Days\n\n2. Post-Production & Deliverables:\n- Complete archive of all RAW/unedited photos\n- professionally edited high-resolution image\n- Professional editing includes:\n- Color correction and white balance\n- Exposure and brightness optimization\n- Contrast, saturation, and highlight/shadow adjustment\n\n3. Delivery Timeline: Final edited photos in 10 business days\n\n4. Additional & Revision Policy:  \n- 1 complimentary revision round (minor color/crop adjustments)  \n- Must be requested within 7 business days of delivery  \n- Additional edited photo revision : Rp 150,000 / photo  \n- Re-shoot: charged as new session at daily rate	{"total": 4500000, "products": [{"name": "Photoshoot & Editing Service", "price": 4500000, "quantity": 1, "subtotal": 4500000, "description": "Photoshoot Service for One and a Half Days & Editing Service "}], "calculatedAt": "2025-11-09T14:26:19.311Z"}	TERMS & CONDITIONS:  \n  \n- 50% non-refundable booking deposit required (Rp 2,250,000)  \n- Secures your shoot date and photographer's time  \n- Balance due upon delivery of edited photos (Rp 2,250,000)\n\nCancellation Policy:  \n- More than 7 days notice: Reschedule once at no charge  \n- Full deposit forfeited, can reschedule with Additional Fee  \n- Less than 48 hours: Full deposit forfeited  \n- No-show: Full deposit forfeited + balance due for time committed  \n\nRescheduling:\n- First reschedule: complimentary (with 7+ days notice)\n- Additional Charged for rescheduling : Rp 1,000,000 fee\n- Subject to photographer availability\n\nCopyright & Usage:\n- Client receives full usage rights as specified above\n- Images may be used in Monomi's portfolio\n- RAW files remain property of Monomi\n- Edited files available for additional licen	FULL_PAYMENT	\N	SENT	cmhq2gicz0000tdp49v6ginqs	\N	\N	\N	\N	2025-11-09 14:27:04.71	2025-11-09 15:26:03.602	4500000.00	0.00	0.00	f
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
default	NET 30	5000000	INV-	QT-	t	daily	02:00	t	IDR	2025-11-08 16:35:51.238	2025-11-08 16:35:51.238
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.user_preferences (id, "userId", timezone, language, currency, "emailNotifications", "pushNotifications", theme, "createdAt", "updatedAt") FROM stdin;
cmhqiag9z0005ohstwzp3f3r1	cmhq2gicz0000tdp49v6ginqs	Asia/Jakarta	id	IDR	t	t	light	2025-11-08 16:35:51.143	2025-11-08 16:35:51.143
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: invoiceuser
--

COPY public.users (id, email, password, name, role, "isActive", "createdAt", "updatedAt") FROM stdin;
cmhq2gicz0000tdp49v6ginqs	admin@monomi.id	$2b$10$yj2WzCw994ECN6eeiqzQtuIDU8nrnafwwBr27q2zbJOLxZjWBEZuO	Admin Sistem (Legacy)	ADMIN	t	2025-11-08 09:12:39.924	2025-11-08 09:12:39.924
cmhq2gid60001tdp4aij1k24f	user@bisnis.co.id	$2b$10$yj2WzCw994ECN6eeiqzQtuIDU8nrnafwwBr27q2zbJOLxZjWBEZuO	User Bisnis (Legacy)	USER	t	2025-11-08 09:12:39.931	2025-11-08 09:12:39.931
cmhq2gidf0002tdp4w5hofa93	super.admin@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Super Admin	SUPER_ADMIN	t	2025-11-08 09:12:39.94	2025-11-08 09:12:39.94
cmhq2gidm0003tdp4du79a8ex	finance.manager@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Finance Manager	FINANCE_MANAGER	t	2025-11-08 09:12:39.947	2025-11-08 09:12:39.947
cmhq2gidr0004tdp42xpnxe32	accountant@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Accountant	ACCOUNTANT	t	2025-11-08 09:12:39.952	2025-11-08 09:12:39.952
cmhq2gidw0005tdp48po7qv3d	project.manager@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Project Manager	PROJECT_MANAGER	t	2025-11-08 09:12:39.957	2025-11-08 09:12:39.957
cmhq2gie20006tdp4cdzmz5m2	staff@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Staff User	STAFF	t	2025-11-08 09:12:39.962	2025-11-08 09:12:39.962
cmhq2gie70007tdp4nu02men3	viewer@monomi.id	$2b$10$xrSTB47A3xwpgWSgJoSi4.e/AZOfVNMHVz4a1mKY.K.Sq1kuvI11S	Viewer	VIEWER	t	2025-11-08 09:12:39.967	2025-11-08 09:12:39.967
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
-- Name: invoices_paymentMilestoneId_key; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE UNIQUE INDEX "invoices_paymentMilestoneId_key" ON public.invoices USING btree ("paymentMilestoneId");


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
-- Name: payment_milestones_isInvoiced_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payment_milestones_isInvoiced_idx" ON public.payment_milestones USING btree ("isInvoiced");


--
-- Name: payment_milestones_projectMilestoneId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payment_milestones_projectMilestoneId_idx" ON public.payment_milestones USING btree ("projectMilestoneId");


--
-- Name: payment_milestones_quotationId_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payment_milestones_quotationId_idx" ON public.payment_milestones USING btree ("quotationId");


--
-- Name: payment_milestones_quotationId_isInvoiced_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "payment_milestones_quotationId_isInvoiced_idx" ON public.payment_milestones USING btree ("quotationId", "isInvoiced");


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
-- Name: projects_clientId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "projects_clientId_status_createdAt_idx" ON public.projects USING btree ("clientId", status, "createdAt");


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
-- Name: quotations_createdBy_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_createdBy_idx" ON public.quotations USING btree ("createdBy");


--
-- Name: quotations_createdBy_status_idx; Type: INDEX; Schema: public; Owner: invoiceuser
--

CREATE INDEX "quotations_createdBy_status_idx" ON public.quotations USING btree ("createdBy", status);


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
    ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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

\unrestrict rfpjTDg8HUs5hfEyD9UI3o2YD4y7uzHxs0bBWzBPX2BFc2RQKkZitIgmcbuyeLu

