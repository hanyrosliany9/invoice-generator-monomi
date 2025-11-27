--
-- PostgreSQL database dump
--

\restrict n26clJgFexSosdEhtdgdfAZJQkWDBIs1D02iPJTRLqR2B0DzFBR2EAgZsUUCHVB

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
cmi64ytcr0003rlrpuzqmzsqo	cmi64ytcj0001rlrpl2iwrzuc	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 08:59:42	\N	\N	    	2025-11-19 15:07:12.027	2025-11-19 15:07:12.027
cmi64ywt00007rlrptu6naqxc	cmi64ywsn0005rlrp1si2gypg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:11	\N	\N	    	2025-11-19 15:07:16.5	2025-11-19 15:07:16.5
cmi64yzkh000brlrpbwob1vmk	cmi64yzkc0009rlrphm2hgh7l	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:17	\N	\N	    	2025-11-19 15:07:20.081	2025-11-19 15:07:20.081
cmi64z3zn000frlrpxsl10z63	cmi64z3zi000drlrpdb9rd7qu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:03:18	\N	\N	    	2025-11-19 15:07:25.811	2025-11-19 15:07:25.811
cmi64z6ag000jrlrpusl2i5fg	cmi64z6ac000hrlrp9az3dbse	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:03:42	\N	\N	    	2025-11-19 15:07:28.792	2025-11-19 15:07:28.792
cmi64zbhx000nrlrps2szqy5y	cmi64zbhs000lrlrp8d8fmbcy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:02	\N	\N	    	2025-11-19 15:07:35.541	2025-11-19 15:07:35.541
cmi64zf61000rrlrpi3q4qt6n	cmi64zf5o000prlrpqcmueg4p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:06	\N	\N	    	2025-11-19 15:07:40.296	2025-11-19 15:07:40.296
cmi64zje8000vrlrp5r4k8bty	cmi64zje3000trlrpgppd8fxu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:09	\N	\N	    	2025-11-19 15:07:45.776	2025-11-19 15:07:45.776
cmi64zmi7000zrlrp038mnuq1	cmi64zmhv000xrlrpzatb5np3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:18	\N	\N	    	2025-11-19 15:07:49.807	2025-11-19 15:07:49.807
cmi64zpdm0013rlrp1pi3d3kl	cmi64zpd00011rlrpaazvj7du	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:23	\N	\N	    	2025-11-19 15:07:53.53	2025-11-19 15:07:53.53
cmi64zt220017rlrpsa2pydg5	cmi64zt1q0015rlrph1dem1hq	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:27	\N	\N	    	2025-11-19 15:07:58.298	2025-11-19 15:07:58.298
cmi64zy16001brlrp5qwo87c1	cmi64zy0u0019rlrpiovykwle	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	25	2025-11-19 09:04:54	\N	\N	    	2025-11-19 15:08:04.746	2025-11-19 15:08:04.746
cmi65011m001frlrpr7ww1sun	cmi65011h001drlrpdbppnv2p	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:03	\N	\N	    	2025-11-19 15:08:08.65	2025-11-19 15:08:08.65
cmi650364001jrlrpo61r3zcl	cmi65035z001hrlrpla4erz1s	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:22	\N	\N	    	2025-11-19 15:08:11.404	2025-11-19 15:08:11.404
cmi6505tb001nrlrplmoiy03x	cmi6505t0001lrlrp6hieq057	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:26	\N	\N	    	2025-11-19 15:08:14.83	2025-11-19 15:08:14.83
cmi650a96001rrlrp0jr9d8xc	cmi650a91001prlrp8014uu3i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:29	\N	\N	    	2025-11-19 15:08:20.586	2025-11-19 15:08:20.586
cmi650du2001vrlrpbhn4tjw3	cmi650dtx001trlrp90sdy6me	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:54	\N	\N	    	2025-11-19 15:08:25.226	2025-11-19 15:08:25.226
cmi650hc2001zrlrpmoixl9jm	cmi650hbs001xrlrpwivsbu1i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:58	\N	\N	    	2025-11-19 15:08:29.762	2025-11-19 15:08:29.762
cmi650m4b0023rlrp27axjqyw	cmi650m3y0021rlrp7wyeih5s	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:06:47	\N	\N	    	2025-11-19 15:08:35.962	2025-11-19 15:08:35.962
cmi650qqh0027rlrpkrnx3ips	cmi650qq50025rlrp8zl72g32	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:08:45	\N	\N	    	2025-11-19 15:08:41.945	2025-11-19 15:08:41.945
cmi650uxd002brlrp38ww1st1	cmi650ux00029rlrp5q45ia5x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:09:30	\N	\N	    	2025-11-19 15:08:47.376	2025-11-19 15:08:47.376
cmi650y5p002frlrpszsmcx57	cmi650y5k002drlrpbac1pj6h	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:11:43	\N	\N	    	2025-11-19 15:08:51.565	2025-11-19 15:08:51.565
cmi6511ra002jrlrpee4b9flr	cmi6511qy002hrlrpge4cjjaz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:09	\N	\N	    	2025-11-19 15:08:56.23	2025-11-19 15:08:56.23
cmi6516pz002nrlrpucutk84r	cmi6516pp002lrlrpwk0zf503	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:21	\N	\N	    	2025-11-19 15:09:02.663	2025-11-19 15:09:02.663
cmi651agw002rrlrp55oujp05	cmi651ago002prlrpbjrxtcdh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:25	\N	\N	    	2025-11-19 15:09:07.52	2025-11-19 15:09:07.52
cmi651ddr002vrlrprunwiwna	cmi651ddm002trlrpfdggudct	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	17	2025-11-19 09:12:31	\N	\N	    	2025-11-19 15:09:11.295	2025-11-19 15:09:11.295
cmi651fnb002zrlrpzwexlg8x	cmi651fn0002xrlrpdt07uf4m	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:44	\N	\N	    	2025-11-19 15:09:14.231	2025-11-19 15:09:14.231
cmi651zbm0033rlrpp76jte1c	cmi651zbh0031rlrpm11qtqww	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:47	\N	\N	    	2025-11-19 15:09:39.731	2025-11-19 15:09:39.731
cmi658n8g0037rlrpacr2r7n8	cmi658n7z0035rlrps2qhf57g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 08:59:42	\N	\N	    	2025-11-19 15:14:50.656	2025-11-19 15:14:50.656
cmi658pou003brlrp6ban1zzr	cmi658pop0039rlrp3ioie6da	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:11	\N	\N	    	2025-11-19 15:14:53.838	2025-11-19 15:14:53.838
cmi658sof003frlrpun7r95vq	cmi658so9003drlrpni69purj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	200	11.00	1/125	16	2025-11-19 09:00:17	\N	\N	    	2025-11-19 15:14:57.711	2025-11-19 15:14:57.711
cmi658vqx003jrlrpl1b70pbq	cmi658vqq003hrlrpwlc99fhi	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:03:18	\N	\N	    	2025-11-19 15:15:01.689	2025-11-19 15:15:01.689
cmi658xzv003nrlrpskslohn7	cmi658xzj003lrlrppyylz95n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:03:42	\N	\N	    	2025-11-19 15:15:04.603	2025-11-19 15:15:04.603
cmi6590jz003rrlrp750qx8wp	cmi6590jt003prlrptv50p6nb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:02	\N	\N	    	2025-11-19 15:15:07.919	2025-11-19 15:15:07.919
cmi6595dr003vrlrpbbj0f25s	cmi6595df003trlrpgwg1emy8	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:06	\N	\N	    	2025-11-19 15:15:14.174	2025-11-19 15:15:14.174
cmi6597zj003zrlrpkoy4raw2	cmi6597z7003xrlrpjcdkaghx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:04:09	\N	\N	    	2025-11-19 15:15:17.55	2025-11-19 15:15:17.55
cmi659bbk0043rlrp70zw7lg1	cmi659bb80041rlrp8kv0aew1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:18	\N	\N	    	2025-11-19 15:15:21.871	2025-11-19 15:15:21.871
cmi659ef70047rlrpkr53j41a	cmi659eev0045rlrpjqjfen9r	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:23	\N	\N	    	2025-11-19 15:15:25.89	2025-11-19 15:15:25.89
cmi659izf004brlrp7xngafhm	cmi659iz40049rlrpg15xax2u	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:04:27	\N	\N	    	2025-11-19 15:15:31.803	2025-11-19 15:15:31.803
cmi659mki004frlrp2vs29cu3	cmi659mkd004drlrp7k0xtymk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	25	2025-11-19 09:04:54	\N	\N	    	2025-11-19 15:15:36.45	2025-11-19 15:15:36.45
cmi659oyq004jrlrp67oqrbzo	cmi659oyf004hrlrpnsnrh8zo	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:03	\N	\N	    	2025-11-19 15:15:39.553	2025-11-19 15:15:39.553
cmi659sxj004nrlrpg0o8tpo8	cmi659sx9004lrlrpyhy24ogs	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:22	\N	\N	    	2025-11-19 15:15:44.695	2025-11-19 15:15:44.695
cmi659vbu004rrlrpdspu7amy	cmi659vbi004prlrpspbdoybr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:26	\N	\N	    	2025-11-19 15:15:47.801	2025-11-19 15:15:47.801
cmi659yc7004vrlrpyfieqzra	cmi659yc2004trlrp1nbwgr8e	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	24	2025-11-19 09:05:29	\N	\N	    	2025-11-19 15:15:51.703	2025-11-19 15:15:51.703
cmi65a1to004zrlrpag5htv60	cmi65a1td004xrlrpph0q8qpd	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:54	\N	\N	    	2025-11-19 15:15:56.22	2025-11-19 15:15:56.22
cmi65a4ar0053rlrpb00a7x7w	cmi65a4am0051rlrpmzx37wj5	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	22	2025-11-19 09:05:58	\N	\N	    	2025-11-19 15:15:59.428	2025-11-19 15:15:59.428
cmi65a6bs0057rlrp81lqahug	cmi65a6bh0055rlrpbibvlosg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:06:47	\N	\N	    	2025-11-19 15:16:02.056	2025-11-19 15:16:02.056
cmi65ab03005brlrpn6a9lco2	cmi65aazy0059rlrp5xgmzbzx	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:08:45	\N	\N	    	2025-11-19 15:16:08.116	2025-11-19 15:16:08.116
cmi65ad8k005frlrpw7z53k8n	cmi65ad88005drlrpmnpdd58g	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	14.00	1/125	16	2025-11-19 09:09:30	\N	\N	    	2025-11-19 15:16:11.011	2025-11-19 15:16:11.011
cmi65ah40005jrlrplg6adgo6	cmi65ah3o005hrlrpy44msk69	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:11:43	\N	\N	    	2025-11-19 15:16:16.032	2025-11-19 15:16:16.032
cmi65ajee005nrlrpsk9ocalx	cmi65aje3005lrlrp1w32s3qw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:09	\N	\N	    	2025-11-19 15:16:18.998	2025-11-19 15:16:18.998
cmi65alyv005rrlrpbojlnn4g	cmi65alyk005prlrpfi847n33	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:21	\N	\N	    	2025-11-19 15:16:22.326	2025-11-19 15:16:22.326
cmi65apa3005vrlrpw76ua3f1	cmi65ap9s005trlrph4nwn7y9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	21	2025-11-19 09:12:25	\N	\N	    	2025-11-19 15:16:26.619	2025-11-19 15:16:26.619
cmi65asxp005zrlrp0tzqwpad	cmi65asxd005xrlrptlpafrsj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	17	2025-11-19 09:12:31	\N	\N	    	2025-11-19 15:16:31.356	2025-11-19 15:16:31.356
cmi65av5p0063rlrpmh5cl9kw	cmi65av5e0061rlrpkjo0jzme	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:44	\N	\N	    	2025-11-19 15:16:34.237	2025-11-19 15:16:34.237
cmi65azd70067rlrp5wj14z69	cmi65azcw0065rlrpmr5dodfz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	22	2025-11-19 09:12:47	\N	\N	    	2025-11-19 15:16:39.691	2025-11-19 15:16:39.691
cmi65b1nd006brlrpamixot8d	cmi65b1mx0069rlrpvvmfow9w	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	24	2025-11-19 09:13:07	\N	\N	    	2025-11-19 15:16:42.649	2025-11-19 15:16:42.649
cmi65b4pm006frlrpwlf90aa1	cmi65b4pg006drlrpccgaes83	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:13:20	\N	\N	    	2025-11-19 15:16:46.618	2025-11-19 15:16:46.618
cmi65b7u5006jrlrp7rluiy1s	cmi65b7ty006hrlrppm3zy3yk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:09	\N	\N	    	2025-11-19 15:16:50.67	2025-11-19 15:16:50.67
cmi65bax9006nrlrp7f4c7w89	cmi65bax4006lrlrpiqt56k7x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:13	\N	\N	    	2025-11-19 15:16:54.669	2025-11-19 15:16:54.669
cmi65bem0006rrlrpi160rv2e	cmi65belo006prlrpd77nd8ts	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	20	2025-11-19 09:14:15	\N	\N	    	2025-11-19 15:16:59.448	2025-11-19 15:16:59.448
cmi65bhp7006vrlrp0q4w301z	cmi65bhp0006trlrp5v268uq7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:42	\N	\N	    	2025-11-19 15:17:03.451	2025-11-19 15:17:03.451
cmi65bkbu006zrlrpj6kvqnii	cmi65bkbh006xrlrp39n0rn0q	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:46	\N	\N	    	2025-11-19 15:17:06.858	2025-11-19 15:17:06.858
cmi65bn660073rlrp2tdw3etu	cmi65bn5v0071rlrpr8r20l5i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	16.00	1/125	18	2025-11-19 09:14:49	\N	\N	    	2025-11-19 15:17:10.541	2025-11-19 15:17:10.541
cmi65bp9l0077rlrp94raxa5m	cmi65bp9a0075rlrprtvuzrou	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	18.00	1/125	16	2025-11-19 09:20:25	\N	\N	    	2025-11-19 15:17:13.257	2025-11-19 15:17:13.257
cmi65btfw007brlrp9a2dglzw	cmi65btfm0079rlrpde92ecn3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	16	2025-11-19 09:20:50	\N	\N	    	2025-11-19 15:17:18.668	2025-11-19 15:17:18.668
cmi65bwkb007frlrpfg8b4i3g	cmi65bwk6007drlrphwd0snse	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:21:17	\N	\N	    	2025-11-19 15:17:22.715	2025-11-19 15:17:22.715
cmi65byzf007jrlrppe9i40ai	cmi65byz4007hrlrp1wy04gjf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:21:21	\N	\N	    	2025-11-19 15:17:25.851	2025-11-19 15:17:25.851
cmi65c1gm007nrlrp7eo06krw	cmi65c1gb007lrlrpc1x8s4vn	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	19	2025-11-19 09:25:57	\N	\N	    	2025-11-19 15:17:29.061	2025-11-19 15:17:29.061
cmi65c5k9007rrlrpm643yoq2	cmi65c5k4007prlrphbc600cj	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:43	\N	\N	    	2025-11-19 15:17:34.377	2025-11-19 15:17:34.377
cmi65cb20007vrlrpjeknfev6	cmi65cb1q007trlrpy9ygu1wt	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:48	\N	\N	    	2025-11-19 15:17:41.496	2025-11-19 15:17:41.496
cmi65cejh007zrlrp70br3vzn	cmi65ceje007xrlrpjs5qii6v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	18	2025-11-19 09:26:53	\N	\N	    	2025-11-19 15:17:46.014	2025-11-19 15:17:46.014
cmi65cixq0083rlrpz15hkq35	cmi65cixn0081rlrp5d86ecil	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:23	\N	\N	    	2025-11-19 15:17:51.71	2025-11-19 15:17:51.71
cmi65cqb80087rlrp8zzi0lx1	cmi65cqax0085rlrp0abxcyvz	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:28	\N	\N	    	2025-11-19 15:18:01.268	2025-11-19 15:18:01.268
cmi65cv4j008brlrpkk66tfmk	cmi65cv480089rlrpevhs3of6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:33	\N	\N	    	2025-11-19 15:18:07.506	2025-11-19 15:18:07.506
cmi65cy8t008frlrpe0pdxrjr	cmi65cy8m008drlrp65pn2cx6	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:49	\N	\N	    	2025-11-19 15:18:11.549	2025-11-19 15:18:11.549
cmi65d0yj008jrlrpop4g80xp	cmi65d0y8008hrlrp0ker1j1y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:53	\N	\N	    	2025-11-19 15:18:15.067	2025-11-19 15:18:15.067
cmi65d7u2008nrlrp6fej0o9k	cmi65d7tz008lrlrpw3lwznv0	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:56	\N	\N	    	2025-11-19 15:18:23.978	2025-11-19 15:18:23.978
cmi65dc0o008rrlrppe9hx4ju	cmi65dc0d008prlrppykbk4ok	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:35:59	\N	\N	    	2025-11-19 15:18:29.4	2025-11-19 15:18:29.4
cmi65dgsr008vrlrp96qomgj0	cmi65dgsf008trlrp7urfwowy	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:11	\N	\N	    	2025-11-19 15:18:35.594	2025-11-19 15:18:35.594
cmi65dk7s008zrlrpurmt3j99	cmi65dk7g008xrlrprbn4fs71	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:16	\N	\N	    	2025-11-19 15:18:40.023	2025-11-19 15:18:40.023
cmi65do790093rlrpsdy1xnc3	cmi65do6x0091rlrpd5orbgn7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:19	\N	\N	    	2025-11-19 15:18:45.189	2025-11-19 15:18:45.189
cmi65dr0p0097rlrpoemqeeyg	cmi65dr0d0095rlrph9tfufgl	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:21	\N	\N	    	2025-11-19 15:18:48.841	2025-11-19 15:18:48.841
cmi65du06009brlrp0hfpbzvr	cmi65dtzu0099rlrpetbyzfoa	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:36:24	\N	\N	    	2025-11-19 15:18:52.71	2025-11-19 15:18:52.71
cmi65dzp5009frlrp3hm7huwr	cmi65dzp0009drlrpyo372de7	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	33	2025-11-19 09:36:31	\N	\N	    	2025-11-19 15:19:00.089	2025-11-19 15:19:00.089
cmi65e2vk009jrlrp1qq0cdia	cmi65e2va009hrlrplpr2p413	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	29	2025-11-19 09:40:03	\N	\N	    	2025-11-19 15:19:04.207	2025-11-19 15:19:04.207
cmi65e5le009nrlrp1gv8la0r	cmi65e5l3009lrlrpeaq1hlve	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	20.00	1/125	24	2025-11-19 09:40:40	\N	\N	    	2025-11-19 15:19:07.73	2025-11-19 15:19:07.73
cmi65e8kp009rrlrp8lt3ozfx	cmi65e8kd009prlrpzqlt9293	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	24	2025-11-19 09:40:54	\N	\N	    	2025-11-19 15:19:11.593	2025-11-19 15:19:11.593
cmi65ecug009vrlrpx2vp8z0h	cmi65ecu4009trlrpkz78hr5c	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:41:53	\N	\N	    	2025-11-19 15:19:17.127	2025-11-19 15:19:17.127
cmi65egjn009zrlrpmktmu63l	cmi65egjc009xrlrpvpbc6bvp	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	32	2025-11-19 09:42:06	\N	\N	    	2025-11-19 15:19:21.923	2025-11-19 15:19:21.923
cmi65ejcs00a3rlrphgbdyp3e	cmi65ejcf00a1rlrp4ha3of1x	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:42:54	\N	\N	    	2025-11-19 15:19:25.564	2025-11-19 15:19:25.564
cmi65emk000a7rlrpliwocxai	cmi65emjo00a5rlrprxsj944v	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:43:43	\N	\N	    	2025-11-19 15:19:29.711	2025-11-19 15:19:29.711
cmi65eqa000abrlrp0m8qlh1f	cmi65eq9p00a9rlrp38r72rwu	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:43:53	\N	\N	    	2025-11-19 15:19:34.536	2025-11-19 15:19:34.536
cmi65etld00afrlrp73pi200m	cmi65etl800adrlrpvmnuynls	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:05	\N	\N	    	2025-11-19 15:19:38.833	2025-11-19 15:19:38.833
cmi65ex9j00ajrlrpb6wa399j	cmi65ex9d00ahrlrptomhyrgg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:08	\N	\N	    	2025-11-19 15:19:43.592	2025-11-19 15:19:43.592
cmi65f0xp00anrlrpvtv3vp3g	cmi65f0xd00alrlrpnji2kuso	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:10	\N	\N	    	2025-11-19 15:19:48.348	2025-11-19 15:19:48.348
cmi65f43v00arrlrpwlye5em9	cmi65f43i00aprlrpxza7czlk	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:14	\N	\N	    	2025-11-19 15:19:52.459	2025-11-19 15:19:52.459
cmi65f82500avrlrpyw7p087v	cmi65f81u00atrlrpj73qyhv2	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:17	\N	\N	    	2025-11-19 15:19:57.581	2025-11-19 15:19:57.581
cmi65fail00azrlrplng0sbnm	cmi65fai900axrlrpag174lir	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:19	\N	\N	    	2025-11-19 15:20:00.764	2025-11-19 15:20:00.764
cmi65fd3q00b3rlrpfgagvj09	cmi65fd3f00b1rlrpvudg35bh	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:21	\N	\N	    	2025-11-19 15:20:04.118	2025-11-19 15:20:04.118
cmi65fgpl00b7rlrpbwzbt901	cmi65fgpf00b5rlrpa7j1f3vg	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:44	\N	\N	    	2025-11-19 15:20:08.793	2025-11-19 15:20:08.793
cmi65fk9700bbrlrpgeobxz6j	cmi65fk8w00b9rlrp47e39ilb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:47	\N	\N	    	2025-11-19 15:20:13.387	2025-11-19 15:20:13.387
cmi65fppo00bfrlrpqthjn10o	cmi65fppb00bdrlrpare3k955	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:50	\N	\N	    	2025-11-19 15:20:20.46	2025-11-19 15:20:20.46
cmi65ftlu00bjrlrpam4glbm6	cmi65ftln00bhrlrpw2j0eqmw	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:53	\N	\N	    	2025-11-19 15:20:25.506	2025-11-19 15:20:25.506
cmi65fwvp00bnrlrprr7165r3	cmi65fwvh00blrlrpzu3t1yrb	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:44:57	\N	\N	    	2025-11-19 15:20:29.749	2025-11-19 15:20:29.749
cmi65fzhb00brrlrpwsdbeete	cmi65fzgz00bprlrpoi0zsaf9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:01	\N	\N	    	2025-11-19 15:20:33.118	2025-11-19 15:20:33.118
cmi65g28f00bvrlrph8v6q13r	cmi65g28300btrlrp8b79rcw3	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:04	\N	\N	    	2025-11-19 15:20:36.687	2025-11-19 15:20:36.687
cmi65g5cl00bzrlrp6ra6s5p6	cmi65g5c900bxrlrpjn1pjv5a	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:06	\N	\N	    	2025-11-19 15:20:40.725	2025-11-19 15:20:40.725
cmi65gape00c3rlrp7t5evp6c	cmi65gap200c1rlrp30van01i	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:08	\N	\N	    	2025-11-19 15:20:47.666	2025-11-19 15:20:47.666
cmi65geff00c7rlrpx8q6vuhj	cmi65gefa00c5rlrptv6px3g9	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:11	\N	\N	    	2025-11-19 15:20:52.491	2025-11-19 15:20:52.491
cmi65glwp00cbrlrpy7otamv4	cmi65glwe00c9rlrp2en4trer	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:13	\N	\N	    	2025-11-19 15:21:02.185	2025-11-19 15:21:02.185
cmi65gpc900cfrlrpmpbv67xe	cmi65gpby00cdrlrp3jl7fpwf	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:17	\N	\N	    	2025-11-19 15:21:06.633	2025-11-19 15:21:06.633
cmi65gur700cjrlrphnv7pv4a	cmi65guqx00chrlrp64srwct1	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:19	\N	\N	    	2025-11-19 15:21:13.65	2025-11-19 15:21:13.65
cmi65gz4r00cnrlrp0lp0x6ls	cmi65gz4n00clrlrpbw8by44n	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:22	\N	\N	    	2025-11-19 15:21:19.323	2025-11-19 15:21:19.323
cmi65h2qm00crrlrp5hxbsyfg	cmi65h2q900cprlrpdkswxlfr	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	29	2025-11-19 09:45:24	\N	\N	    	2025-11-19 15:21:23.997	2025-11-19 15:21:23.997
cmi65h5y400cvrlrpu8w8nsdt	cmi65h5xt00ctrlrp3gm2ba0y	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:00:49	\N	\N	    	2025-11-19 15:21:28.156	2025-11-19 15:21:28.156
cmi65hecj00czrlrpv3axwwkf	cmi65hec800cxrlrp9dlaxoow	\N	\N	\N	\N	\N	X-T100	FUJIFILM	Fujifilm Fujinon XF16-55mmF2.8 R LM WR	400	22.00	1/125	16	2025-11-19 10:01:02	\N	\N	    	2025-11-19 15:21:39.043	2025-11-19 15:21:39.043
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
cmi64ytcj0001rlrpl2iwrzuc	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f8afc202-dscf7173.jpg	DSCF7173.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f8afc202-dscf7173.jpg	content/2025-11-19/f8afc202-dscf7173.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/2c5d5f1e-thumb-dscf7173.jpg	IMAGE	image/jpeg	489527	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:12.02	2025-11-19 15:07:12.02	\N
cmi64ywsn0005rlrp1si2gypg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8e388074-dscf7174.jpg	DSCF7174.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8e388074-dscf7174.jpg	content/2025-11-19/8e388074-dscf7174.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/6e5b1309-thumb-dscf7174.jpg	IMAGE	image/jpeg	469827	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:16.487	2025-11-19 15:07:16.487	\N
cmi64yzkc0009rlrphm2hgh7l	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/c47ce6b2-dscf7175.jpg	DSCF7175.jpg	\N	/api/v1/media/proxy/content/2025-11-19/c47ce6b2-dscf7175.jpg	content/2025-11-19/c47ce6b2-dscf7175.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/c8b4ba01-thumb-dscf7175.jpg	IMAGE	image/jpeg	474337	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:20.076	2025-11-19 15:07:20.076	\N
cmi64z3zi000drlrpdb9rd7qu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/64622a0e-dscf7180.jpg	DSCF7180.jpg	\N	/api/v1/media/proxy/content/2025-11-19/64622a0e-dscf7180.jpg	content/2025-11-19/64622a0e-dscf7180.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/9554f24b-thumb-dscf7180.jpg	IMAGE	image/jpeg	567141	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:25.806	2025-11-19 15:07:25.806	\N
cmi64z6ac000hrlrp9az3dbse	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/6b953a31-dscf7181.jpg	DSCF7181.jpg	\N	/api/v1/media/proxy/content/2025-11-19/6b953a31-dscf7181.jpg	content/2025-11-19/6b953a31-dscf7181.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/9da517fa-thumb-dscf7181.jpg	IMAGE	image/jpeg	548708	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:28.788	2025-11-19 15:07:28.788	\N
cmi64zbhs000lrlrp8d8fmbcy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/cdfc04f4-dscf7182.jpg	DSCF7182.jpg	\N	/api/v1/media/proxy/content/2025-11-19/cdfc04f4-dscf7182.jpg	content/2025-11-19/cdfc04f4-dscf7182.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/5d67ee82-thumb-dscf7182.jpg	IMAGE	image/jpeg	542631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:35.536	2025-11-19 15:07:35.536	\N
cmi64zf5o000prlrpqcmueg4p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/1928c404-dscf7183.jpg	DSCF7183.jpg	\N	/api/v1/media/proxy/content/2025-11-19/1928c404-dscf7183.jpg	content/2025-11-19/1928c404-dscf7183.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4e3a2f13-thumb-dscf7183.jpg	IMAGE	image/jpeg	541501	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:40.283	2025-11-19 15:07:40.283	\N
cmi64zje3000trlrpgppd8fxu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f865ec93-dscf7184.jpg	DSCF7184.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f865ec93-dscf7184.jpg	content/2025-11-19/f865ec93-dscf7184.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/0d72ed7f-thumb-dscf7184.jpg	IMAGE	image/jpeg	556954	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:45.771	2025-11-19 15:07:45.771	\N
cmi64zmhv000xrlrpzatb5np3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f4b15498-dscf7185.jpg	DSCF7185.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f4b15498-dscf7185.jpg	content/2025-11-19/f4b15498-dscf7185.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/c485ef1e-thumb-dscf7185.jpg	IMAGE	image/jpeg	575191	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:49.795	2025-11-19 15:07:49.795	\N
cmi64zpd00011rlrpaazvj7du	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/22dbdfbe-dscf7186.jpg	DSCF7186.jpg	\N	/api/v1/media/proxy/content/2025-11-19/22dbdfbe-dscf7186.jpg	content/2025-11-19/22dbdfbe-dscf7186.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/8e9d34e4-thumb-dscf7186.jpg	IMAGE	image/jpeg	551169	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:53.508	2025-11-19 15:07:53.508	\N
cmi64zt1q0015rlrph1dem1hq	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/5415f09b-dscf7187.jpg	DSCF7187.jpg	\N	/api/v1/media/proxy/content/2025-11-19/5415f09b-dscf7187.jpg	content/2025-11-19/5415f09b-dscf7187.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/2e404572-thumb-dscf7187.jpg	IMAGE	image/jpeg	568146	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:07:58.285	2025-11-19 15:07:58.285	\N
cmi64zy0u0019rlrpiovykwle	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/56512087-dscf7188.jpg	DSCF7188.jpg	\N	/api/v1/media/proxy/content/2025-11-19/56512087-dscf7188.jpg	content/2025-11-19/56512087-dscf7188.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/414083ea-thumb-dscf7188.jpg	IMAGE	image/jpeg	545636	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:04.734	2025-11-19 15:08:04.734	\N
cmi65011h001drlrpdbppnv2p	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/95e9c15c-dscf7190.jpg	DSCF7190.jpg	\N	/api/v1/media/proxy/content/2025-11-19/95e9c15c-dscf7190.jpg	content/2025-11-19/95e9c15c-dscf7190.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/9c853234-thumb-dscf7190.jpg	IMAGE	image/jpeg	561562	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:08.644	2025-11-19 15:08:08.644	\N
cmi65035z001hrlrpla4erz1s	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/1095c40c-dscf7191.jpg	DSCF7191.jpg	\N	/api/v1/media/proxy/content/2025-11-19/1095c40c-dscf7191.jpg	content/2025-11-19/1095c40c-dscf7191.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/e1f913c9-thumb-dscf7191.jpg	IMAGE	image/jpeg	548793	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:11.4	2025-11-19 15:08:11.4	\N
cmi6505t0001lrlrp6hieq057	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/e0366ab9-dscf7192.jpg	DSCF7192.jpg	\N	/api/v1/media/proxy/content/2025-11-19/e0366ab9-dscf7192.jpg	content/2025-11-19/e0366ab9-dscf7192.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/352b167e-thumb-dscf7192.jpg	IMAGE	image/jpeg	548958	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:14.819	2025-11-19 15:08:14.819	\N
cmi650a91001prlrp8014uu3i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/082dc462-dscf7193.jpg	DSCF7193.jpg	\N	/api/v1/media/proxy/content/2025-11-19/082dc462-dscf7193.jpg	content/2025-11-19/082dc462-dscf7193.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/2dc62a52-thumb-dscf7193.jpg	IMAGE	image/jpeg	531852	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:20.581	2025-11-19 15:08:20.581	\N
cmi650dtx001trlrp90sdy6me	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/07be68e0-dscf7194.jpg	DSCF7194.jpg	\N	/api/v1/media/proxy/content/2025-11-19/07be68e0-dscf7194.jpg	content/2025-11-19/07be68e0-dscf7194.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/50808370-thumb-dscf7194.jpg	IMAGE	image/jpeg	523639	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:25.221	2025-11-19 15:08:25.221	\N
cmi650hbs001xrlrpwivsbu1i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/874b8310-dscf7195.jpg	DSCF7195.jpg	\N	/api/v1/media/proxy/content/2025-11-19/874b8310-dscf7195.jpg	content/2025-11-19/874b8310-dscf7195.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/7cb8211d-thumb-dscf7195.jpg	IMAGE	image/jpeg	516454	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:29.752	2025-11-19 15:08:29.752	\N
cmi650m3y0021rlrp7wyeih5s	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8d83aded-dscf7196.jpg	DSCF7196.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8d83aded-dscf7196.jpg	content/2025-11-19/8d83aded-dscf7196.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/cd88ad36-thumb-dscf7196.jpg	IMAGE	image/jpeg	600633	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:35.95	2025-11-19 15:08:35.95	\N
cmi650qq50025rlrp8zl72g32	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8c317488-dscf7197.jpg	DSCF7197.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8c317488-dscf7197.jpg	content/2025-11-19/8c317488-dscf7197.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/06e3cb53-thumb-dscf7197.jpg	IMAGE	image/jpeg	536951	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:41.933	2025-11-19 15:08:41.933	\N
cmi650ux00029rlrp5q45ia5x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/4b84d2cd-dscf7198.jpg	DSCF7198.jpg	\N	/api/v1/media/proxy/content/2025-11-19/4b84d2cd-dscf7198.jpg	content/2025-11-19/4b84d2cd-dscf7198.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/b55ae776-thumb-dscf7198.jpg	IMAGE	image/jpeg	583960	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:47.363	2025-11-19 15:08:47.363	\N
cmi650y5k002drlrpbac1pj6h	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/2a82e0c5-dscf7200.jpg	DSCF7200.jpg	\N	/api/v1/media/proxy/content/2025-11-19/2a82e0c5-dscf7200.jpg	content/2025-11-19/2a82e0c5-dscf7200.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/be78dcdf-thumb-dscf7200.jpg	IMAGE	image/jpeg	681826	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:51.56	2025-11-19 15:08:51.56	\N
cmi6511qy002hrlrpge4cjjaz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/655a799c-dscf7201.jpg	DSCF7201.jpg	\N	/api/v1/media/proxy/content/2025-11-19/655a799c-dscf7201.jpg	content/2025-11-19/655a799c-dscf7201.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f5544aea-thumb-dscf7201.jpg	IMAGE	image/jpeg	586907	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:08:56.218	2025-11-19 15:08:56.218	\N
cmi6516pp002lrlrpwk0zf503	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f745b251-dscf7202.jpg	DSCF7202.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f745b251-dscf7202.jpg	content/2025-11-19/f745b251-dscf7202.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/088f0174-thumb-dscf7202.jpg	IMAGE	image/jpeg	669919	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:09:02.653	2025-11-19 15:09:02.653	\N
cmi651ago002prlrpbjrxtcdh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/57f7c0b5-dscf7203.jpg	DSCF7203.jpg	\N	/api/v1/media/proxy/content/2025-11-19/57f7c0b5-dscf7203.jpg	content/2025-11-19/57f7c0b5-dscf7203.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/b13b7419-thumb-dscf7203.jpg	IMAGE	image/jpeg	641272	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:09:07.512	2025-11-19 15:09:07.512	\N
cmi651ddm002trlrpfdggudct	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/3d96fce8-dscf7204.jpg	DSCF7204.jpg	\N	/api/v1/media/proxy/content/2025-11-19/3d96fce8-dscf7204.jpg	content/2025-11-19/3d96fce8-dscf7204.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f4b46e55-thumb-dscf7204.jpg	IMAGE	image/jpeg	620892	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:09:11.29	2025-11-19 15:09:11.29	\N
cmi651fn0002xrlrpdt07uf4m	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/5f04bb62-dscf7205.jpg	DSCF7205.jpg	\N	/api/v1/media/proxy/content/2025-11-19/5f04bb62-dscf7205.jpg	content/2025-11-19/5f04bb62-dscf7205.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/215236e9-thumb-dscf7205.jpg	IMAGE	image/jpeg	692666	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:09:14.219	2025-11-19 15:09:14.219	\N
cmi651zbh0031rlrpm11qtqww	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/7c210e36-dscf7206.jpg	DSCF7206.jpg	\N	/api/v1/media/proxy/content/2025-11-19/7c210e36-dscf7206.jpg	content/2025-11-19/7c210e36-dscf7206.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/73c4e7b4-thumb-dscf7206.jpg	IMAGE	image/jpeg	699187	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:09:39.725	2025-11-19 15:09:39.725	\N
cmi658n7z0035rlrps2qhf57g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/6893e26f-dscf7173.jpg	DSCF7173.jpg	\N	/api/v1/media/proxy/content/2025-11-19/6893e26f-dscf7173.jpg	content/2025-11-19/6893e26f-dscf7173.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/43a9d9a2-thumb-dscf7173.jpg	IMAGE	image/jpeg	489527	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:14:50.638	2025-11-19 15:14:50.638	\N
cmi658pop0039rlrp3ioie6da	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/ed0b0b7b-dscf7174.jpg	DSCF7174.jpg	\N	/api/v1/media/proxy/content/2025-11-19/ed0b0b7b-dscf7174.jpg	content/2025-11-19/ed0b0b7b-dscf7174.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/6b20153a-thumb-dscf7174.jpg	IMAGE	image/jpeg	469827	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:14:53.833	2025-11-19 15:14:53.833	\N
cmi658so9003drlrpni69purj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/cfa1290c-dscf7175.jpg	DSCF7175.jpg	\N	/api/v1/media/proxy/content/2025-11-19/cfa1290c-dscf7175.jpg	content/2025-11-19/cfa1290c-dscf7175.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/62293bff-thumb-dscf7175.jpg	IMAGE	image/jpeg	474337	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:14:57.705	2025-11-19 15:14:57.705	\N
cmi658vqq003hrlrpwlc99fhi	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a5e83b5e-dscf7180.jpg	DSCF7180.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a5e83b5e-dscf7180.jpg	content/2025-11-19/a5e83b5e-dscf7180.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/52525100-thumb-dscf7180.jpg	IMAGE	image/jpeg	567141	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:01.682	2025-11-19 15:15:01.682	\N
cmi658xzj003lrlrppyylz95n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a04fd985-dscf7181.jpg	DSCF7181.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a04fd985-dscf7181.jpg	content/2025-11-19/a04fd985-dscf7181.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/65417a1b-thumb-dscf7181.jpg	IMAGE	image/jpeg	548708	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:04.591	2025-11-19 15:15:04.591	\N
cmi6590jt003prlrptv50p6nb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/45d39a79-dscf7182.jpg	DSCF7182.jpg	\N	/api/v1/media/proxy/content/2025-11-19/45d39a79-dscf7182.jpg	content/2025-11-19/45d39a79-dscf7182.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/095132fc-thumb-dscf7182.jpg	IMAGE	image/jpeg	542631	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:07.914	2025-11-19 15:15:07.914	\N
cmi6595df003trlrpgwg1emy8	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/e4abbc49-dscf7183.jpg	DSCF7183.jpg	\N	/api/v1/media/proxy/content/2025-11-19/e4abbc49-dscf7183.jpg	content/2025-11-19/e4abbc49-dscf7183.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4e1d2fe1-thumb-dscf7183.jpg	IMAGE	image/jpeg	541501	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:14.163	2025-11-19 15:15:14.163	\N
cmi6597z7003xrlrpjcdkaghx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/3ea2f08f-dscf7184.jpg	DSCF7184.jpg	\N	/api/v1/media/proxy/content/2025-11-19/3ea2f08f-dscf7184.jpg	content/2025-11-19/3ea2f08f-dscf7184.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/7f9251ea-thumb-dscf7184.jpg	IMAGE	image/jpeg	556954	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:17.538	2025-11-19 15:15:17.538	\N
cmi659bb80041rlrp8kv0aew1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/40e22ebf-dscf7185.jpg	DSCF7185.jpg	\N	/api/v1/media/proxy/content/2025-11-19/40e22ebf-dscf7185.jpg	content/2025-11-19/40e22ebf-dscf7185.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/eacfb988-thumb-dscf7185.jpg	IMAGE	image/jpeg	575191	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:21.86	2025-11-19 15:15:21.86	\N
cmi659eev0045rlrpjqjfen9r	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/bec65d91-dscf7186.jpg	DSCF7186.jpg	\N	/api/v1/media/proxy/content/2025-11-19/bec65d91-dscf7186.jpg	content/2025-11-19/bec65d91-dscf7186.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/5c5295b2-thumb-dscf7186.jpg	IMAGE	image/jpeg	551169	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:25.879	2025-11-19 15:15:25.879	\N
cmi659iz40049rlrpg15xax2u	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a64bd3fb-dscf7187.jpg	DSCF7187.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a64bd3fb-dscf7187.jpg	content/2025-11-19/a64bd3fb-dscf7187.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/35c0c4f1-thumb-dscf7187.jpg	IMAGE	image/jpeg	568146	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:31.792	2025-11-19 15:15:31.792	\N
cmi659mkd004drlrp7k0xtymk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8eb62a49-dscf7188.jpg	DSCF7188.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8eb62a49-dscf7188.jpg	content/2025-11-19/8eb62a49-dscf7188.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4f5a5c7c-thumb-dscf7188.jpg	IMAGE	image/jpeg	545636	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:36.444	2025-11-19 15:15:36.444	\N
cmi659oyf004hrlrpnsnrh8zo	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/62339be9-dscf7190.jpg	DSCF7190.jpg	\N	/api/v1/media/proxy/content/2025-11-19/62339be9-dscf7190.jpg	content/2025-11-19/62339be9-dscf7190.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/b8861964-thumb-dscf7190.jpg	IMAGE	image/jpeg	561562	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:39.543	2025-11-19 15:15:39.543	\N
cmi659sx9004lrlrpyhy24ogs	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/2c5b9b77-dscf7191.jpg	DSCF7191.jpg	\N	/api/v1/media/proxy/content/2025-11-19/2c5b9b77-dscf7191.jpg	content/2025-11-19/2c5b9b77-dscf7191.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/1926816d-thumb-dscf7191.jpg	IMAGE	image/jpeg	548793	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:44.685	2025-11-19 15:15:44.685	\N
cmi659vbi004prlrpspbdoybr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/3c92d3e7-dscf7192.jpg	DSCF7192.jpg	\N	/api/v1/media/proxy/content/2025-11-19/3c92d3e7-dscf7192.jpg	content/2025-11-19/3c92d3e7-dscf7192.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4066c86d-thumb-dscf7192.jpg	IMAGE	image/jpeg	548958	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:47.79	2025-11-19 15:15:47.79	\N
cmi659yc2004trlrp1nbwgr8e	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/422e26b6-dscf7193.jpg	DSCF7193.jpg	\N	/api/v1/media/proxy/content/2025-11-19/422e26b6-dscf7193.jpg	content/2025-11-19/422e26b6-dscf7193.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4696736a-thumb-dscf7193.jpg	IMAGE	image/jpeg	531852	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:51.699	2025-11-19 15:15:51.699	\N
cmi65a1td004xrlrpph0q8qpd	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/89644598-dscf7194.jpg	DSCF7194.jpg	\N	/api/v1/media/proxy/content/2025-11-19/89644598-dscf7194.jpg	content/2025-11-19/89644598-dscf7194.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/85ee46b9-thumb-dscf7194.jpg	IMAGE	image/jpeg	523639	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:56.209	2025-11-19 15:15:56.209	\N
cmi65a4am0051rlrpmzx37wj5	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/d6e99df4-dscf7195.jpg	DSCF7195.jpg	\N	/api/v1/media/proxy/content/2025-11-19/d6e99df4-dscf7195.jpg	content/2025-11-19/d6e99df4-dscf7195.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/ee6b40cf-thumb-dscf7195.jpg	IMAGE	image/jpeg	516454	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:15:59.422	2025-11-19 15:15:59.422	\N
cmi65a6bh0055rlrpbibvlosg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/efe0db0e-dscf7196.jpg	DSCF7196.jpg	\N	/api/v1/media/proxy/content/2025-11-19/efe0db0e-dscf7196.jpg	content/2025-11-19/efe0db0e-dscf7196.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/04d10561-thumb-dscf7196.jpg	IMAGE	image/jpeg	600633	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:02.044	2025-11-19 15:16:02.044	\N
cmi65aazy0059rlrp5xgmzbzx	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/4937cb9f-dscf7197.jpg	DSCF7197.jpg	\N	/api/v1/media/proxy/content/2025-11-19/4937cb9f-dscf7197.jpg	content/2025-11-19/4937cb9f-dscf7197.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/69182ec8-thumb-dscf7197.jpg	IMAGE	image/jpeg	536951	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:08.11	2025-11-19 15:16:08.11	\N
cmi65ad88005drlrpmnpdd58g	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/0731bf8b-dscf7198.jpg	DSCF7198.jpg	\N	/api/v1/media/proxy/content/2025-11-19/0731bf8b-dscf7198.jpg	content/2025-11-19/0731bf8b-dscf7198.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/c51e4245-thumb-dscf7198.jpg	IMAGE	image/jpeg	583960	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:11	2025-11-19 15:16:11	\N
cmi65ah3o005hrlrpy44msk69	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8460fa90-dscf7200.jpg	DSCF7200.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8460fa90-dscf7200.jpg	content/2025-11-19/8460fa90-dscf7200.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/21d403f0-thumb-dscf7200.jpg	IMAGE	image/jpeg	681826	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:16.019	2025-11-19 15:16:16.019	\N
cmi65aje3005lrlrp1w32s3qw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a612b5ce-dscf7201.jpg	DSCF7201.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a612b5ce-dscf7201.jpg	content/2025-11-19/a612b5ce-dscf7201.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/0ebdf802-thumb-dscf7201.jpg	IMAGE	image/jpeg	586907	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:18.987	2025-11-19 15:16:18.987	\N
cmi65alyk005prlrpfi847n33	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/185e5e70-dscf7202.jpg	DSCF7202.jpg	\N	/api/v1/media/proxy/content/2025-11-19/185e5e70-dscf7202.jpg	content/2025-11-19/185e5e70-dscf7202.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/638e582a-thumb-dscf7202.jpg	IMAGE	image/jpeg	669919	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:22.315	2025-11-19 15:16:22.315	\N
cmi65ap9s005trlrph4nwn7y9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/dc285f71-dscf7203.jpg	DSCF7203.jpg	\N	/api/v1/media/proxy/content/2025-11-19/dc285f71-dscf7203.jpg	content/2025-11-19/dc285f71-dscf7203.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/0d569d83-thumb-dscf7203.jpg	IMAGE	image/jpeg	641272	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:26.607	2025-11-19 15:16:26.607	\N
cmi65asxd005xrlrptlpafrsj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/fd13f1f0-dscf7204.jpg	DSCF7204.jpg	\N	/api/v1/media/proxy/content/2025-11-19/fd13f1f0-dscf7204.jpg	content/2025-11-19/fd13f1f0-dscf7204.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/48ab2351-thumb-dscf7204.jpg	IMAGE	image/jpeg	620892	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:31.344	2025-11-19 15:16:31.344	\N
cmi65av5e0061rlrpkjo0jzme	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/36d74dee-dscf7205.jpg	DSCF7205.jpg	\N	/api/v1/media/proxy/content/2025-11-19/36d74dee-dscf7205.jpg	content/2025-11-19/36d74dee-dscf7205.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/ac7dd1e1-thumb-dscf7205.jpg	IMAGE	image/jpeg	692666	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:34.226	2025-11-19 15:16:34.226	\N
cmi65azcw0065rlrpmr5dodfz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f30e576d-dscf7206.jpg	DSCF7206.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f30e576d-dscf7206.jpg	content/2025-11-19/f30e576d-dscf7206.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/cb744306-thumb-dscf7206.jpg	IMAGE	image/jpeg	699187	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:39.679	2025-11-19 15:16:39.679	\N
cmi65b1mx0069rlrpvvmfow9w	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/5b1e86a3-dscf7207.jpg	DSCF7207.jpg	\N	/api/v1/media/proxy/content/2025-11-19/5b1e86a3-dscf7207.jpg	content/2025-11-19/5b1e86a3-dscf7207.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f92e7936-thumb-dscf7207.jpg	IMAGE	image/jpeg	634598	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:42.633	2025-11-19 15:16:42.633	\N
cmi65b4pg006drlrpccgaes83	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/234210bd-dscf7209.jpg	DSCF7209.jpg	\N	/api/v1/media/proxy/content/2025-11-19/234210bd-dscf7209.jpg	content/2025-11-19/234210bd-dscf7209.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/6211835b-thumb-dscf7209.jpg	IMAGE	image/jpeg	681088	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:46.611	2025-11-19 15:16:46.611	\N
cmi65b7ty006hrlrppm3zy3yk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/d3de9c29-dscf7212.jpg	DSCF7212.jpg	\N	/api/v1/media/proxy/content/2025-11-19/d3de9c29-dscf7212.jpg	content/2025-11-19/d3de9c29-dscf7212.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/7e376eeb-thumb-dscf7212.jpg	IMAGE	image/jpeg	589539	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:50.662	2025-11-19 15:16:50.662	\N
cmi65bax4006lrlrpiqt56k7x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/cb5a7d15-dscf7213.jpg	DSCF7213.jpg	\N	/api/v1/media/proxy/content/2025-11-19/cb5a7d15-dscf7213.jpg	content/2025-11-19/cb5a7d15-dscf7213.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/5fff9b8a-thumb-dscf7213.jpg	IMAGE	image/jpeg	668505	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:54.664	2025-11-19 15:16:54.664	\N
cmi65belo006prlrpd77nd8ts	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/601fec01-dscf7214.jpg	DSCF7214.jpg	\N	/api/v1/media/proxy/content/2025-11-19/601fec01-dscf7214.jpg	content/2025-11-19/601fec01-dscf7214.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/8c6622dd-thumb-dscf7214.jpg	IMAGE	image/jpeg	638144	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:16:59.436	2025-11-19 15:16:59.436	\N
cmi65bhp0006trlrp5v268uq7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/1f436153-dscf7215.jpg	DSCF7215.jpg	\N	/api/v1/media/proxy/content/2025-11-19/1f436153-dscf7215.jpg	content/2025-11-19/1f436153-dscf7215.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/a4d66b42-thumb-dscf7215.jpg	IMAGE	image/jpeg	591473	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:03.444	2025-11-19 15:17:03.444	\N
cmi65bkbh006xrlrp39n0rn0q	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/70e2578d-dscf7216.jpg	DSCF7216.jpg	\N	/api/v1/media/proxy/content/2025-11-19/70e2578d-dscf7216.jpg	content/2025-11-19/70e2578d-dscf7216.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/6e4535c1-thumb-dscf7216.jpg	IMAGE	image/jpeg	608725	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:06.845	2025-11-19 15:17:06.845	\N
cmi65bn5v0071rlrpr8r20l5i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a131f9a1-dscf7217.jpg	DSCF7217.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a131f9a1-dscf7217.jpg	content/2025-11-19/a131f9a1-dscf7217.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/a8e7dd39-thumb-dscf7217.jpg	IMAGE	image/jpeg	619471	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:10.53	2025-11-19 15:17:10.53	\N
cmi65bp9a0075rlrprtvuzrou	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/7313f4d6-dscf7221.jpg	DSCF7221.jpg	\N	/api/v1/media/proxy/content/2025-11-19/7313f4d6-dscf7221.jpg	content/2025-11-19/7313f4d6-dscf7221.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/644bf1b5-thumb-dscf7221.jpg	IMAGE	image/jpeg	592865	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:13.246	2025-11-19 15:17:13.246	\N
cmi65btfm0079rlrpde92ecn3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f9871a33-dscf7222.jpg	DSCF7222.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f9871a33-dscf7222.jpg	content/2025-11-19/f9871a33-dscf7222.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/9990325b-thumb-dscf7222.jpg	IMAGE	image/jpeg	599273	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:18.657	2025-11-19 15:17:18.657	\N
cmi65bwk6007drlrphwd0snse	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f0dd283f-dscf7223.jpg	DSCF7223.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f0dd283f-dscf7223.jpg	content/2025-11-19/f0dd283f-dscf7223.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/fe87feba-thumb-dscf7223.jpg	IMAGE	image/jpeg	619301	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:22.709	2025-11-19 15:17:22.709	\N
cmi65byz4007hrlrp1wy04gjf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/16360b3a-dscf7224.jpg	DSCF7224.jpg	\N	/api/v1/media/proxy/content/2025-11-19/16360b3a-dscf7224.jpg	content/2025-11-19/16360b3a-dscf7224.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f509dd8b-thumb-dscf7224.jpg	IMAGE	image/jpeg	616826	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:25.839	2025-11-19 15:17:25.839	\N
cmi65c1gb007lrlrpc1x8s4vn	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/5f7d3101-dscf7230.jpg	DSCF7230.jpg	\N	/api/v1/media/proxy/content/2025-11-19/5f7d3101-dscf7230.jpg	content/2025-11-19/5f7d3101-dscf7230.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/0620d4d7-thumb-dscf7230.jpg	IMAGE	image/jpeg	701709	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:29.05	2025-11-19 15:17:29.05	\N
cmi65c5k4007prlrphbc600cj	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a977ed78-dscf7233.jpg	DSCF7233.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a977ed78-dscf7233.jpg	content/2025-11-19/a977ed78-dscf7233.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/282bf4d8-thumb-dscf7233.jpg	IMAGE	image/jpeg	647652	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:34.372	2025-11-19 15:17:34.372	\N
cmi65cb1q007trlrpy9ygu1wt	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/1598a6fc-dscf7234.jpg	DSCF7234.jpg	\N	/api/v1/media/proxy/content/2025-11-19/1598a6fc-dscf7234.jpg	content/2025-11-19/1598a6fc-dscf7234.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/b2510bb0-thumb-dscf7234.jpg	IMAGE	image/jpeg	638807	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:41.485	2025-11-19 15:17:41.485	\N
cmi65ceje007xrlrpjs5qii6v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/0dc0cedd-dscf7235.jpg	DSCF7235.jpg	\N	/api/v1/media/proxy/content/2025-11-19/0dc0cedd-dscf7235.jpg	content/2025-11-19/0dc0cedd-dscf7235.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/d49892e1-thumb-dscf7235.jpg	IMAGE	image/jpeg	650134	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:46.01	2025-11-19 15:17:46.01	\N
cmi65cixn0081rlrp5d86ecil	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/6ac4668d-dscf7239.jpg	DSCF7239.jpg	\N	/api/v1/media/proxy/content/2025-11-19/6ac4668d-dscf7239.jpg	content/2025-11-19/6ac4668d-dscf7239.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/fca6d320-thumb-dscf7239.jpg	IMAGE	image/jpeg	603661	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:17:51.707	2025-11-19 15:17:51.707	\N
cmi65cqax0085rlrp0abxcyvz	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a345f56a-dscf7240.jpg	DSCF7240.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a345f56a-dscf7240.jpg	content/2025-11-19/a345f56a-dscf7240.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/e85317f2-thumb-dscf7240.jpg	IMAGE	image/jpeg	574856	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:01.257	2025-11-19 15:18:01.257	\N
cmi65cv480089rlrpevhs3of6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/d7bca3be-dscf7241.jpg	DSCF7241.jpg	\N	/api/v1/media/proxy/content/2025-11-19/d7bca3be-dscf7241.jpg	content/2025-11-19/d7bca3be-dscf7241.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/c12c1993-thumb-dscf7241.jpg	IMAGE	image/jpeg	532776	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:07.495	2025-11-19 15:18:07.495	\N
cmi65cy8m008drlrp65pn2cx6	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/4a69d8ce-dscf7242.jpg	DSCF7242.jpg	\N	/api/v1/media/proxy/content/2025-11-19/4a69d8ce-dscf7242.jpg	content/2025-11-19/4a69d8ce-dscf7242.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/5a3da6f2-thumb-dscf7242.jpg	IMAGE	image/jpeg	540245	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:11.542	2025-11-19 15:18:11.542	\N
cmi65d0y8008hrlrp0ker1j1y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/debee53c-dscf7243.jpg	DSCF7243.jpg	\N	/api/v1/media/proxy/content/2025-11-19/debee53c-dscf7243.jpg	content/2025-11-19/debee53c-dscf7243.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/8d6ce372-thumb-dscf7243.jpg	IMAGE	image/jpeg	592221	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:15.055	2025-11-19 15:18:15.055	\N
cmi65d7tz008lrlrpw3lwznv0	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/33ec3d85-dscf7244.jpg	DSCF7244.jpg	\N	/api/v1/media/proxy/content/2025-11-19/33ec3d85-dscf7244.jpg	content/2025-11-19/33ec3d85-dscf7244.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/fa23a82f-thumb-dscf7244.jpg	IMAGE	image/jpeg	567667	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:23.974	2025-11-19 15:18:23.974	\N
cmi65dc0d008prlrppykbk4ok	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/710fda0d-dscf7245.jpg	DSCF7245.jpg	\N	/api/v1/media/proxy/content/2025-11-19/710fda0d-dscf7245.jpg	content/2025-11-19/710fda0d-dscf7245.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/ff545e20-thumb-dscf7245.jpg	IMAGE	image/jpeg	578418	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:29.378	2025-11-19 15:18:29.378	\N
cmi65dgsf008trlrp7urfwowy	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/48a98c3f-dscf7247.jpg	DSCF7247.jpg	\N	/api/v1/media/proxy/content/2025-11-19/48a98c3f-dscf7247.jpg	content/2025-11-19/48a98c3f-dscf7247.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f68d1b2c-thumb-dscf7247.jpg	IMAGE	image/jpeg	605275	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:35.582	2025-11-19 15:18:35.582	\N
cmi65dk7g008xrlrprbn4fs71	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a735be90-dscf7248.jpg	DSCF7248.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a735be90-dscf7248.jpg	content/2025-11-19/a735be90-dscf7248.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4dce81ce-thumb-dscf7248.jpg	IMAGE	image/jpeg	577775	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:40.011	2025-11-19 15:18:40.011	\N
cmi65do6x0091rlrpd5orbgn7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/c180a7b6-dscf7249.jpg	DSCF7249.jpg	\N	/api/v1/media/proxy/content/2025-11-19/c180a7b6-dscf7249.jpg	content/2025-11-19/c180a7b6-dscf7249.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/daa1b867-thumb-dscf7249.jpg	IMAGE	image/jpeg	605204	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:45.176	2025-11-19 15:18:45.176	\N
cmi65dr0d0095rlrph9tfufgl	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/fe9536db-dscf7250.jpg	DSCF7250.jpg	\N	/api/v1/media/proxy/content/2025-11-19/fe9536db-dscf7250.jpg	content/2025-11-19/fe9536db-dscf7250.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/8236954d-thumb-dscf7250.jpg	IMAGE	image/jpeg	611684	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:48.829	2025-11-19 15:18:48.829	\N
cmi65dtzu0099rlrpetbyzfoa	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/4c813f6f-dscf7251.jpg	DSCF7251.jpg	\N	/api/v1/media/proxy/content/2025-11-19/4c813f6f-dscf7251.jpg	content/2025-11-19/4c813f6f-dscf7251.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/2d1979a4-thumb-dscf7251.jpg	IMAGE	image/jpeg	622749	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:18:52.697	2025-11-19 15:18:52.697	\N
cmi65dzp0009drlrpyo372de7	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/0c114df2-dscf7252.jpg	DSCF7252.jpg	\N	/api/v1/media/proxy/content/2025-11-19/0c114df2-dscf7252.jpg	content/2025-11-19/0c114df2-dscf7252.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/abe0105a-thumb-dscf7252.jpg	IMAGE	image/jpeg	640478	\N	\N	\N	\N	3861	5792	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:00.084	2025-11-19 15:19:00.084	\N
cmi65e2va009hrlrplpr2p413	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/52d51b5d-dscf7254.jpg	DSCF7254.jpg	\N	/api/v1/media/proxy/content/2025-11-19/52d51b5d-dscf7254.jpg	content/2025-11-19/52d51b5d-dscf7254.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/de341c50-thumb-dscf7254.jpg	IMAGE	image/jpeg	741226	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:04.198	2025-11-19 15:19:04.198	\N
cmi65e5l3009lrlrpeaq1hlve	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/9ec12334-dscf7255.jpg	DSCF7255.jpg	\N	/api/v1/media/proxy/content/2025-11-19/9ec12334-dscf7255.jpg	content/2025-11-19/9ec12334-dscf7255.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/b8512cae-thumb-dscf7255.jpg	IMAGE	image/jpeg	675971	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:07.719	2025-11-19 15:19:07.719	\N
cmi65e8kd009prlrpzqlt9293	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/86a46f39-dscf7256.jpg	DSCF7256.jpg	\N	/api/v1/media/proxy/content/2025-11-19/86a46f39-dscf7256.jpg	content/2025-11-19/86a46f39-dscf7256.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/089c3ec8-thumb-dscf7256.jpg	IMAGE	image/jpeg	703550	\N	\N	\N	\N	4000	6000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:11.581	2025-11-19 15:19:11.581	\N
cmi65ecu4009trlrpkz78hr5c	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/7b1bb933-dscf7258.jpg	DSCF7258.jpg	\N	/api/v1/media/proxy/content/2025-11-19/7b1bb933-dscf7258.jpg	content/2025-11-19/7b1bb933-dscf7258.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/16ad4d4c-thumb-dscf7258.jpg	IMAGE	image/jpeg	706365	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:17.116	2025-11-19 15:19:17.116	\N
cmi65egjc009xrlrpvpbc6bvp	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/839775ba-dscf7260.jpg	DSCF7260.jpg	\N	/api/v1/media/proxy/content/2025-11-19/839775ba-dscf7260.jpg	content/2025-11-19/839775ba-dscf7260.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/fe8054a0-thumb-dscf7260.jpg	IMAGE	image/jpeg	761381	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:21.911	2025-11-19 15:19:21.911	\N
cmi65ejcf00a1rlrp4ha3of1x	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8e7ac65e-dscf7261.jpg	DSCF7261.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8e7ac65e-dscf7261.jpg	content/2025-11-19/8e7ac65e-dscf7261.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/77346b63-thumb-dscf7261.jpg	IMAGE	image/jpeg	706358	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:25.551	2025-11-19 15:19:25.551	\N
cmi65emjo00a5rlrprxsj944v	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/b3740a5f-dscf7262.jpg	DSCF7262.jpg	\N	/api/v1/media/proxy/content/2025-11-19/b3740a5f-dscf7262.jpg	content/2025-11-19/b3740a5f-dscf7262.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/1ebd2a48-thumb-dscf7262.jpg	IMAGE	image/jpeg	700925	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:29.7	2025-11-19 15:19:29.7	\N
cmi65eq9p00a9rlrp38r72rwu	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/4b8b9241-dscf7263.jpg	DSCF7263.jpg	\N	/api/v1/media/proxy/content/2025-11-19/4b8b9241-dscf7263.jpg	content/2025-11-19/4b8b9241-dscf7263.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/d26880fa-thumb-dscf7263.jpg	IMAGE	image/jpeg	702737	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:34.524	2025-11-19 15:19:34.524	\N
cmi65etl800adrlrpvmnuynls	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/4fde2538-dscf7264.jpg	DSCF7264.jpg	\N	/api/v1/media/proxy/content/2025-11-19/4fde2538-dscf7264.jpg	content/2025-11-19/4fde2538-dscf7264.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/03e474ea-thumb-dscf7264.jpg	IMAGE	image/jpeg	699387	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:38.828	2025-11-19 15:19:38.828	\N
cmi65ex9d00ahrlrptomhyrgg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/70cd3827-dscf7265.jpg	DSCF7265.jpg	\N	/api/v1/media/proxy/content/2025-11-19/70cd3827-dscf7265.jpg	content/2025-11-19/70cd3827-dscf7265.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/053f3a2b-thumb-dscf7265.jpg	IMAGE	image/jpeg	681159	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:43.584	2025-11-19 15:19:43.584	\N
cmi65f0xd00alrlrpnji2kuso	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/64c69f39-dscf7266.jpg	DSCF7266.jpg	\N	/api/v1/media/proxy/content/2025-11-19/64c69f39-dscf7266.jpg	content/2025-11-19/64c69f39-dscf7266.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/531b9830-thumb-dscf7266.jpg	IMAGE	image/jpeg	703593	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:48.337	2025-11-19 15:19:48.337	\N
cmi65f43i00aprlrpxza7czlk	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/57ea3dbb-dscf7267.jpg	DSCF7267.jpg	\N	/api/v1/media/proxy/content/2025-11-19/57ea3dbb-dscf7267.jpg	content/2025-11-19/57ea3dbb-dscf7267.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/41159398-thumb-dscf7267.jpg	IMAGE	image/jpeg	624870	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:52.445	2025-11-19 15:19:52.445	\N
cmi65f81u00atrlrpj73qyhv2	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/8b1fc08a-dscf7268.jpg	DSCF7268.jpg	\N	/api/v1/media/proxy/content/2025-11-19/8b1fc08a-dscf7268.jpg	content/2025-11-19/8b1fc08a-dscf7268.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/1a288900-thumb-dscf7268.jpg	IMAGE	image/jpeg	690779	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:19:57.569	2025-11-19 15:19:57.569	\N
cmi65fai900axrlrpag174lir	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/14269500-dscf7269.jpg	DSCF7269.jpg	\N	/api/v1/media/proxy/content/2025-11-19/14269500-dscf7269.jpg	content/2025-11-19/14269500-dscf7269.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/249420fc-thumb-dscf7269.jpg	IMAGE	image/jpeg	675533	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:00.753	2025-11-19 15:20:00.753	\N
cmi65fd3f00b1rlrpvudg35bh	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/dca8de9d-dscf7270.jpg	DSCF7270.jpg	\N	/api/v1/media/proxy/content/2025-11-19/dca8de9d-dscf7270.jpg	content/2025-11-19/dca8de9d-dscf7270.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/ad11fa9a-thumb-dscf7270.jpg	IMAGE	image/jpeg	700749	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:04.106	2025-11-19 15:20:04.106	\N
cmi65fgpf00b5rlrpa7j1f3vg	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/9119b698-dscf7273.jpg	DSCF7273.jpg	\N	/api/v1/media/proxy/content/2025-11-19/9119b698-dscf7273.jpg	content/2025-11-19/9119b698-dscf7273.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/b44962cd-thumb-dscf7273.jpg	IMAGE	image/jpeg	738462	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:08.786	2025-11-19 15:20:08.786	\N
cmi65fk8w00b9rlrp47e39ilb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/f06fc566-dscf7274.jpg	DSCF7274.jpg	\N	/api/v1/media/proxy/content/2025-11-19/f06fc566-dscf7274.jpg	content/2025-11-19/f06fc566-dscf7274.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/965a6678-thumb-dscf7274.jpg	IMAGE	image/jpeg	735472	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:13.376	2025-11-19 15:20:13.376	\N
cmi65fppb00bdrlrpare3k955	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/c8e8fd80-dscf7275.jpg	DSCF7275.jpg	\N	/api/v1/media/proxy/content/2025-11-19/c8e8fd80-dscf7275.jpg	content/2025-11-19/c8e8fd80-dscf7275.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/3d866322-thumb-dscf7275.jpg	IMAGE	image/jpeg	680029	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:20.447	2025-11-19 15:20:20.447	\N
cmi65ftln00bhrlrpw2j0eqmw	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/48794638-dscf7276.jpg	DSCF7276.jpg	\N	/api/v1/media/proxy/content/2025-11-19/48794638-dscf7276.jpg	content/2025-11-19/48794638-dscf7276.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/2d8ee332-thumb-dscf7276.jpg	IMAGE	image/jpeg	743011	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:25.499	2025-11-19 15:20:25.499	\N
cmi65fwvh00blrlrpzu3t1yrb	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/14d96273-dscf7277.jpg	DSCF7277.jpg	\N	/api/v1/media/proxy/content/2025-11-19/14d96273-dscf7277.jpg	content/2025-11-19/14d96273-dscf7277.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/3545f5eb-thumb-dscf7277.jpg	IMAGE	image/jpeg	712842	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:29.742	2025-11-19 15:20:29.742	\N
cmi65fzgz00bprlrpoi0zsaf9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/20dd558b-dscf7279.jpg	DSCF7279.jpg	\N	/api/v1/media/proxy/content/2025-11-19/20dd558b-dscf7279.jpg	content/2025-11-19/20dd558b-dscf7279.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/a3a8c732-thumb-dscf7279.jpg	IMAGE	image/jpeg	705567	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:33.107	2025-11-19 15:20:33.107	\N
cmi65g28300btrlrp8b79rcw3	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a3dce9e4-dscf7280.jpg	DSCF7280.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a3dce9e4-dscf7280.jpg	content/2025-11-19/a3dce9e4-dscf7280.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f42d44ac-thumb-dscf7280.jpg	IMAGE	image/jpeg	684864	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:36.675	2025-11-19 15:20:36.675	\N
cmi65g5c900bxrlrpjn1pjv5a	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/78ef20a5-dscf7281.jpg	DSCF7281.jpg	\N	/api/v1/media/proxy/content/2025-11-19/78ef20a5-dscf7281.jpg	content/2025-11-19/78ef20a5-dscf7281.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/c3a81f19-thumb-dscf7281.jpg	IMAGE	image/jpeg	704754	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:40.713	2025-11-19 15:20:40.713	\N
cmi65gap200c1rlrp30van01i	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/a7363228-dscf7282.jpg	DSCF7282.jpg	\N	/api/v1/media/proxy/content/2025-11-19/a7363228-dscf7282.jpg	content/2025-11-19/a7363228-dscf7282.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/c93be634-thumb-dscf7282.jpg	IMAGE	image/jpeg	716537	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:47.654	2025-11-19 15:20:47.654	\N
cmi65gefa00c5rlrptv6px3g9	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/3de2f0cb-dscf7283.jpg	DSCF7283.jpg	\N	/api/v1/media/proxy/content/2025-11-19/3de2f0cb-dscf7283.jpg	content/2025-11-19/3de2f0cb-dscf7283.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/a2731d2b-thumb-dscf7283.jpg	IMAGE	image/jpeg	720176	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:20:52.486	2025-11-19 15:20:52.486	\N
cmi65glwe00c9rlrp2en4trer	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/2249ef98-dscf7284.jpg	DSCF7284.jpg	\N	/api/v1/media/proxy/content/2025-11-19/2249ef98-dscf7284.jpg	content/2025-11-19/2249ef98-dscf7284.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/8384b8e5-thumb-dscf7284.jpg	IMAGE	image/jpeg	707702	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:02.173	2025-11-19 15:21:02.173	\N
cmi65gpby00cdrlrp3jl7fpwf	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/9a18f1a1-dscf7285.jpg	DSCF7285.jpg	\N	/api/v1/media/proxy/content/2025-11-19/9a18f1a1-dscf7285.jpg	content/2025-11-19/9a18f1a1-dscf7285.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/62e591a8-thumb-dscf7285.jpg	IMAGE	image/jpeg	688047	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:06.622	2025-11-19 15:21:06.622	\N
cmi65guqx00chrlrp64srwct1	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/7e942deb-dscf7286.jpg	DSCF7286.jpg	\N	/api/v1/media/proxy/content/2025-11-19/7e942deb-dscf7286.jpg	content/2025-11-19/7e942deb-dscf7286.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/4943c793-thumb-dscf7286.jpg	IMAGE	image/jpeg	686122	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:13.64	2025-11-19 15:21:13.64	\N
cmi65gz4n00clrlrpbw8by44n	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/7d3ddbab-dscf7287.jpg	DSCF7287.jpg	\N	/api/v1/media/proxy/content/2025-11-19/7d3ddbab-dscf7287.jpg	content/2025-11-19/7d3ddbab-dscf7287.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f5df8bfa-thumb-dscf7287.jpg	IMAGE	image/jpeg	675699	\N	\N	\N	\N	5841	3894	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:19.319	2025-11-19 15:21:19.319	\N
cmi65h2q900cprlrpdkswxlfr	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/dc308966-dscf7288.jpg	DSCF7288.jpg	\N	/api/v1/media/proxy/content/2025-11-19/dc308966-dscf7288.jpg	content/2025-11-19/dc308966-dscf7288.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/f12f444a-thumb-dscf7288.jpg	IMAGE	image/jpeg	722314	\N	\N	\N	\N	3894	5841	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:23.985	2025-11-19 15:21:23.985	\N
cmi65h5xt00ctrlrp3gm2ba0y	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/9e5f2679-dscf7295.jpg	DSCF7295.jpg	\N	/api/v1/media/proxy/content/2025-11-19/9e5f2679-dscf7295.jpg	content/2025-11-19/9e5f2679-dscf7295.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/3fded8c9-thumb-dscf7295.jpg	IMAGE	image/jpeg	908314	\N	\N	\N	\N	6000	4000	DRAFT	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:28.145	2025-11-19 15:21:28.145	\N
cmi65hec800cxrlrp9dlaxoow	cmi63yt2g0001ejrm7m6nn14c	content/2025-11-19/2b7d38b5-dscf7296.jpg	DSCF7296.jpg	\N	/api/v1/media/proxy/content/2025-11-19/2b7d38b5-dscf7296.jpg	content/2025-11-19/2b7d38b5-dscf7296.jpg	/api/v1/media/proxy/thumbnails/2025-11-19/a5a57fe6-thumb-dscf7296.jpg	IMAGE	image/jpeg	916766	\N	\N	\N	\N	6000	4000	DRAFT	1	cmhq2nmjq0000nc8t77189wtn	2025-11-19 15:21:39.031	2025-11-20 12:48:56.628	\N
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
cmi63yt2g0001ejrm7m6nn14c	MG Aloy BN	\N	\N	\N	\N	cmhq2nmjq0000nc8t77189wtn	2025-11-19 14:39:12.04	2025-11-20 12:48:56.616	t	ps5uAHu6B2agXH-XWOumGA	https://share.monomiagency.com/shared/ps5uAHu6B2agXH-XWOumGA	127	2025-11-19 19:52:27.828	VIEW_ONLY
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
cmhj7zkcx0006nocx4sigshsa	PRJ-PH-202511-002	Photography & Videography Services	Scope of Work\\t\\t\\nProfessional Photography & Styling Services:\\t\\t\\n\\t\\t\\n1. Two-Days Sessions\\t\\t\\n- Professional Photography Services for 2 Days\\t\\t\\n- Multiple angles captured per piece\\t\\t\\n"- Macro detail shots for intricate designs\\n"\\t\\t\\n- Professional lighting setup and execution\\t\\t\\n\\t\\t\\n2. Food Styling Services Include:\\t\\t\\n- Plating and arrangement optimization\\t\\t\\n- Composition and color balance adjustments\\t\\t\\n- Professional styling throughout shoot duration\\t\\t\\n\\t\\t\\n2. Post-Production & Deliverables:\\t\\t\\n- Complete archive of all RAW/unedited photos\\t\\t\\n- 200 professionally edited high-resolution images:\\t\\t\\n  - 2 edited photos per catalog product (200 files)\\t\\t\\n  - 2 edited photos per on-model product (200 files)\\t\\t\\n  - Total delivery: 400 high-resolution edited images (JPG - 4000px+)\\t\\t\\n- Professional editing includes:\\t\\t\\n- Color correction and white balance\\t\\t\\n- Exposure and brightness optimization\\t\\t\\n- Contrast, saturation, and highlight/shadow adjustment\\t\\t\\n- Minor background cleanup\\t\\t\\n\\t\\t\\n4. File Formats Delivered:\\t\\t\\n- High-resolution JPG (4000px+)\\t\\t\\n\\t\\t\\n3. Delivery Timeline:\\t\\t\\n- All unedited photos: 3 business days\\t\\t\\n- Final edited photos: 10 business days\\t\\t\\n- Preview selection (low-res): 2 business days\\t\\t\\n\\t\\t\\nTERMS & CONDITIONS:\\t\\t\\n\\t\\t\\n- 50% non-refundable booking deposit required (Rp 9,250,000)\\t\\t\\n- Secures your shoot date and photographer's time\\t\\t\\n- Balance due upon delivery of edited photos (Rp 9,250,000)\\t\\t\\n\\t\\t\\nCancellation Policy:\\t\\t\\n- More than 7 days notice: Reschedule once at no charge\\t\\t\\n- Full deposit forfeited, can reschedule with Additional Fee\\t\\t\\n- Less than 48 hours: Full deposit forfeited\\t\\t\\n- No-show: Full deposit forfeited + balance due for time committed\\t\\t\\n\\t\\t\\nRescheduling:\\t\\t\\n- First reschedule: complimentary (with 7+ days notice)\\t\\t\\n- Additional Charged for rescheduling : Rp 1,000,000 fee\\t\\t\\n- Subject to photographer availability\\t\\t\\n\\t\\t\\nAdditional & Revision Policy:\\t\\t\\n- 1 complimentary revision round (minor color/crop adjustments)\\t\\t\\n- Must be requested within 7 business days of delivery\\t\\t\\n- Additional edited photo revision : Rp 150,000 / photo\\t\\t\\n- Additional edited photo : Rp 150.000 / photo\\t\\t\\n"- Additional products beyond 100 pieces: Rp 110,000 / catalog, Rp 75,000 / on-model\\n"\\t\\t\\n- Re-shoot: charged as new session at daily rate\\t\\t\\n\\t\\t\\nClient Responsibilities:\\t\\t\\n- Provide all jewelry pieces organized and ready to shoot\\t\\t\\n- Label/number pieces for tracking\\t\\t\\n- Provide model for on-body shots\\t\\t\\n- Jewelry should arrive cleaned and polished\\t\\t\\n- Provide brand style guidelines if specific editing aesthetic required\\t\\t\\n\\t\\t\\nCopyright & Usage:\\t\\t\\n- Photographer retains copyright to all images\\t\\t\\n- Client receives full usage rights as specified above\\t\\t\\n- Images may be used in photographer's portfolio\\t\\t\\n- RAW files remain property of photographer\\t\\t\\n- Edited files available for additional licen\\t\\t	Photography & Videography Services	cmhhxl1tb0008lf256h1sgmyt	cmhiyns030000muz1gnwyukwc	2025-11-03 17:00:00	2025-11-20 17:00:00	7379000.00	21000000.00	{"total": 21000000, "products": [{"name": "Photography & Videography Catalog Services", "price": 105000, "quantity": 100, "subtotal": 10500000, "description": "2 edited photos per catalog product (200 files)"}, {"name": "Photography & Videography On Model Services", "price": 67000, "quantity": 100, "subtotal": 6700000, "description": "2 edited photos per on-model product (200 files)"}, {"name": "Studio Rent", "price": 3800000, "quantity": 1, "subtotal": 3800000, "description": "Kyabin Studio - Studio 3 - 9 Hours"}], "calculatedAt": "2025-11-03T14:13:03.823Z"}	{"direct": [{"notes": "Cititrans PP Bdg-Jkt", "amount": 840000, "categoryId": "cmhj7rsty0003xiqoeo4w2oxh", "categoryName": "Transportation Expenses", "categoryNameId": "Biaya Transportasi"}, {"notes": "Hotel Losari Blok M 2 Nights", "amount": 1248000, "categoryId": "cmhj7rsu20004xiqojuca0pin", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}, {"notes": "Kyabin Studio", "amount": 3800000, "categoryId": "cmhj7rsu60005xiqo1duppjdr", "categoryName": "Studio Rent Expenses", "categoryNameId": "Beban Sewa Studio"}, {"notes": "Fujifilm XF 80mm Lens Rent", "amount": 400000, "categoryId": "cmhj82x3h0009nocxjuw08lgr", "categoryName": "Tools Rent Expenses", "categoryNameId": "Beban Sewa Peralatan/Perlengkapan"}, {"notes": "AAkomodasi Transportasi", "amount": 491000, "categoryId": "cmhj7rsty0003xiqoeo4w2oxh", "categoryName": "Transportation Expenses", "categoryNameId": "Biaya Transportasi"}, {"notes": "Akomodasi Makanan & Minuman", "amount": 600000, "categoryId": "cmhj7rsu20004xiqojuca0pin", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 7379000, "calculatedAt": "2025-11-03T14:17:10.961Z", "totalIndirect": 0, "totalEstimated": 7379000}	64.86	64.86	13621000.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	-5888000.00	-100.00	2025-11-03 14:14:01.447	\N	PLANNING	2025-11-03 14:13:03.826	2025-11-09 07:31:01.821
cmi4r3vpu0003380f03pzncjw	PRJ-OT-202511-001	Lighting Rent 			cmhq2nmoq000cnc8throx3abx	cmi4qqce20002380fj2rukkfc	2025-11-18 17:00:00	2025-11-19 17:00:00	1988000.00	2150000.00	{"total": 2150000, "products": [{"name": "Aputure Lighting Equipment Rent", "price": 350000, "quantity": 3, "subtotal": 1050000, "description": "Aputure C300D Mark II"}, {"name": "Godox RGB Lighting", "price": 250000, "quantity": 2, "subtotal": 500000, "description": "Godox SZ 150R RGB"}, {"name": "Gaffer ", "price": 500000, "quantity": 1, "subtotal": 500000, "description": "Hiring 1 Gaffer for 1 Day Shooting"}, {"name": "Accommodation ", "price": 100000, "quantity": 1, "subtotal": 100000, "description": "Transport Rent Items "}], "calculatedAt": "2025-11-19T11:34:30.132Z"}	{"direct": [{"notes": "Rent Aputure", "amount": 950000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Rent Godox", "amount": 444000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Rent Lens", "amount": 194000, "categoryId": "be7090e5-9ede-4857-96cf-75e2beecbd4e", "categoryName": "Props & Equipment Rental", "categoryNameId": "Sewa Properti & Peralatan"}, {"notes": "Hire Gaffer", "amount": 300000, "categoryId": "883f81b9-3f4f-4c8c-bb09-26698f17cf8f", "categoryName": "Freelancer - Social Media Specialist", "categoryNameId": "Freelancer Spesialis Media Sosial"}, {"notes": "Gocar", "amount": 100000, "categoryId": "cmhq3kf9g0006e626hyckgry5", "categoryName": "Accomodation Expenses", "categoryNameId": "Beban Akomodasi"}], "indirect": [], "totalDirect": 1988000, "calculatedAt": "2025-11-19T11:34:30.136Z", "totalIndirect": 0, "totalEstimated": 1988000}	7.53	7.53	162000.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	-2050000.00	-100.00	2025-11-18 15:51:27.712	\N	PLANNING	2025-11-18 15:51:27.57	2025-11-19 11:34:30.139
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

\unrestrict n26clJgFexSosdEhtdgdfAZJQkWDBIs1D02iPJTRLqR2B0DzFBR2EAgZsUUCHVB

