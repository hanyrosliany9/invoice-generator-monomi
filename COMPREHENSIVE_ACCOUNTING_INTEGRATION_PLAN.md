# Comprehensive Accounting Integration Plan
**Indonesian Business Management System - Full PSAK Compliance**

**Date**: October 17, 2025
**System**: Monomi Internal Invoice Generator → **Full ERP Accounting System**
**Standards**: PSAK 72, Indonesian Chart of Accounts, Double-Entry Bookkeeping

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [PSAK Standards Research](#3-psak-standards-research)
4. [Gap Analysis](#4-gap-analysis)
5. [Comprehensive Upgrade Plan](#5-comprehensive-upgrade-plan)
6. [Database Schema Changes](#6-database-schema-changes)
7. [Backend Services](#7-backend-services)
8. [Frontend Pages](#8-frontend-pages)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Executive Summary

### 1.1 Current System Status
The system is currently a **document management system** for invoices, quotations, and expenses. It tracks transactions but does NOT maintain proper accounting records following Indonesian PSAK standards.

### 1.2 Transformation Goal
Transform the system into a **full ERP accounting system** with:
- ✅ Double-entry bookkeeping (Pembukuan Berpasangan)
- ✅ Automated journal entries (Jurnal Umum Otomatis)
- ✅ Chart of Accounts (Bagan Akun)
- ✅ General Ledger (Buku Besar)
- ✅ Financial Statements (Laporan Keuangan)
- ✅ Accounts Receivable/Payable tracking (Piutang/Hutang)
- ✅ PSAK 72 compliant revenue recognition
- ✅ Indonesian tax compliance (PPN, PPh)

### 1.3 Key Business Requirements
When Invoice is **SENT (UNPAID)**:
```
Debit:  Piutang (Accounts Receivable) → Asset increases
Credit: Pendapatan (Revenue)          → Income increases
```

When Invoice is **PAID**:
```
Debit:  Kas/Bank (Cash)                → Asset increases
Credit: Piutang (Accounts Receivable) → Asset decreases (settled)
```

When Expense is **SUBMITTED (UNPAID)**:
```
Debit:  Beban (Expense)                → Expense increases
Credit: Hutang (Accounts Payable)     → Liability increases
```

When Expense is **PAID**:
```
Debit:  Hutang (Accounts Payable)     → Liability decreases (settled)
Credit: Kas/Bank (Cash)                → Asset decreases
```

---

## 2. Current State Analysis

### 2.1 Existing Modules ✅

#### Business Modules:
1. **Clients** - Customer management
2. **Projects** - Project-based work tracking
3. **Quotations** - Sales quotations with approval workflow
4. **Invoices** - Invoice generation with payment tracking
5. **Payments** - Payment recording
6. **Expenses** - Expense management with PSAK categories
7. **Assets** - Fixed asset management
8. **Reports** - Revenue and payment analytics

#### Supporting Systems:
- Authentication & Authorization (JWT, RBAC)
- Document management
- Indonesian compliance (Materai, PPN, PPh)
- Multi-language support (Indonesian/English)

### 2.2 Database Relationships ✅

```
Client
  ↓
Project (projectTypeId, clientId)
  ↓
Quotation (projectId, clientId)
  ↓
Invoice (projectId, clientId, quotationId?)
  ↓
Payment (invoiceId)

Expense (projectId?, clientId?, categoryId)
  ↓
Payment (linked to expense reimbursement)

Asset (maintenance, depreciation tracking)
```

### 2.3 What EXISTS (Good Foundation)

#### Database Models:
✅ **Invoice** - Tracks totalAmount, status (DRAFT/SENT/PAID/OVERDUE)
✅ **Payment** - Tracks payment records with paymentMethod, paymentDate, status
✅ **Expense** - Has PSAK account codes (6-1xxx, 6-2xxx, 8-xxxx)
✅ **ExpenseCategory** - PSAK-aligned categories with withholdingTax
✅ **Project** - Tracks basePrice, estimatedBudget
✅ **Client** - Customer data
✅ **Asset** - Fixed assets with depreciation potential

#### Backend Services:
✅ **InvoicesService** - findAll, findOne, create, update, delete
✅ **ExpensesService** - With statistics, approval workflow
✅ **ReportsService** - Revenue analytics, payment analytics
✅ **ProjectsService** - Project management

#### Frontend Pages:
✅ **InvoicesPage** - List invoices with status
✅ **ExpensesPage** - List expenses with payment status
✅ **ReportsPage** - Revenue charts, top clients/projects
✅ **ProjectDetailPage** - Project overview

### 2.4 What's MISSING ❌ (Critical Gaps)

#### No Accounting Infrastructure:
❌ **Chart of Accounts** (Bagan Akun) - No table or management
❌ **Journal Entries** (Jurnal Umum) - No table or automation
❌ **General Ledger** (Buku Besar) - No ledger tracking
❌ **Accounts Receivable Ledger** (Buku Piutang) - Implicit only
❌ **Accounts Payable Ledger** (Buku Hutang) - Implicit only

#### No Financial Statements:
❌ **Income Statement** (Laporan Laba Rugi)
❌ **Balance Sheet** (Neraca)
❌ **Cash Flow Statement** (Laporan Arus Kas)
❌ **Trial Balance** (Neraca Saldo)

#### No Automation:
❌ **Automated journal entry creation** when invoice/expense status changes
❌ **Real-time ledger updates**
❌ **Automatic account reconciliation**
❌ **Period closing** (month-end, year-end)

#### Limited Reporting:
❌ Revenue reports show only PAID invoices (not accrual basis)
❌ No aging reports for receivables/payables
❌ No cash position tracking
❌ No budget vs actual reports

---

## 3. PSAK Standards Research

### 3.1 PSAK 72 - Revenue Recognition (2020+)

**Replaced**: PSAK 34 (Construction Contracts) is NO LONGER in use as of January 1, 2020.

**Current Standard**: PSAK 72 (adoption of IFRS 15) - Revenue from Contracts with Customers

**5-Step Revenue Recognition**:
1. Identify the contract with customer
2. Identify performance obligations in contract
3. Determine transaction price
4. Allocate transaction price to performance obligations
5. Recognize revenue when (or as) entity satisfies performance obligation

**Implication for Our System**:
- Revenue is recognized when **invoice is SENT** (performance obligation satisfied)
- Not when invoice is PAID (cash basis) ❌
- Must use **accrual accounting** ✅

### 3.2 Indonesian Chart of Accounts Structure

**Standard Account Coding** (used by most Indonesian companies):

```
1-xxxx : ASSETS (Aset)
  100-199  : Current Assets (Aset Lancar)
    101-xxx : Cash & Bank (Kas & Bank)
    110-xxx : Accounts Receivable (Piutang)
    120-xxx : Inventory (Persediaan)
    130-xxx : Prepaid Expenses (Biaya Dibayar Dimuka)

  200-299  : Fixed Assets (Aset Tetap)
    210-xxx : Equipment (Peralatan)
    220-xxx : Accumulated Depreciation (Akumulasi Penyusutan)

2-xxxx : LIABILITIES (Kewajiban)
  210-299  : Current Liabilities (Kewajiban Lancar)
    210-xxx : Accounts Payable (Hutang Usaha)
    220-xxx : Accrued Expenses (Biaya Yang Masih Harus Dibayar)
    230-xxx : Tax Payable (Hutang Pajak - PPN, PPh)

3-xxxx : EQUITY (Ekuitas)
  300-399  : Owner's Equity
    310-xxx : Capital (Modal)
    320-xxx : Retained Earnings (Laba Ditahan)
    330-xxx : Current Year Profit (Laba Tahun Berjalan)

4-xxxx : REVENUE (Pendapatan)
  400-499  : Operating Revenue
    410-xxx : Service Revenue (Pendapatan Jasa)
    420-xxx : Sales Revenue (Pendapatan Penjualan)

5-xxxx : COST OF GOODS SOLD (Harga Pokok Penjualan)
  500-599  : Direct Costs
    510-xxx : Material Costs
    520-xxx : Labor Costs

6-xxxx : EXPENSES (Beban)
  600-699  : Operating Expenses
    610-6xx : Selling Expenses (Beban Penjualan) → 6-1xxx in current system ✅
    620-6xx : General & Admin (Beban Administrasi) → 6-2xxx in current system ✅

8-xxxx : OTHER INCOME/EXPENSES (Pendapatan/Beban Lain)
  810-899  : Other Expenses (Beban Lain-Lain) → 8-xxxx in current system ✅
  820-899  : Other Income (Pendapatan Lain-Lain)
```

**Good News**: Our expense categories already use PSAK-aligned codes! ✅

### 3.3 Double-Entry Bookkeeping Rules

**Every transaction affects TWO accounts**:
- Total debits = Total credits (always balanced)
- Debit = Left side, Credit = Right side

**Account Type Rules**:
```
Assets:      Debit increases  | Credit decreases
Liabilities: Credit increases | Debit decreases
Equity:      Credit increases | Debit decreases
Revenue:     Credit increases | Debit decreases
Expenses:    Debit increases  | Credit decreases
```

### 3.4 Accrual vs Cash Basis

**Current System**: Mixed (mostly cash basis)
**Required**: Accrual basis for PSAK 72 compliance

**Accrual Basis**:
- Revenue recognized when **earned** (invoice sent), not when cash received
- Expenses recognized when **incurred** (expense submitted), not when paid

---

## 4. Gap Analysis

### 4.1 Database Schema Gaps

| Required Component | Current Status | Priority |
|-------------------|----------------|----------|
| Chart of Accounts | ❌ Missing | 🔴 Critical |
| Journal Entries | ❌ Missing | 🔴 Critical |
| General Ledger | ❌ Missing | 🔴 Critical |
| Account Balances | ❌ Missing | 🔴 Critical |
| Fiscal Periods | ❌ Missing | 🟡 High |
| Trial Balance | ❌ Missing | 🟡 High |
| Closing Entries | ❌ Missing | 🟡 High |

### 4.2 Business Logic Gaps

| Required Feature | Current Status | Priority |
|-----------------|----------------|----------|
| Auto journal entry on invoice sent | ❌ Missing | 🔴 Critical |
| Auto journal entry on invoice paid | ❌ Missing | 🔴 Critical |
| Auto journal entry on expense submitted | ❌ Missing | 🔴 Critical |
| Auto journal entry on expense paid | ❌ Missing | 🔴 Critical |
| Ledger posting | ❌ Missing | 🔴 Critical |
| Account balance calculation | ❌ Missing | 🔴 Critical |
| Financial statement generation | ❌ Missing | 🟡 High |
| Period closing | ❌ Missing | 🟢 Medium |
| Asset depreciation journal entries | ❌ Missing | 🟢 Medium |

### 4.3 Reporting Gaps

| Required Report | Current Status | Priority |
|----------------|----------------|----------|
| Income Statement (Laba Rugi) | ❌ Missing | 🔴 Critical |
| Balance Sheet (Neraca) | ❌ Missing | 🔴 Critical |
| Cash Flow Statement | ❌ Missing | 🟡 High |
| Trial Balance | ❌ Missing | 🟡 High |
| Accounts Receivable Aging | ❌ Missing | 🟡 High |
| Accounts Payable Aging | ❌ Missing | 🟡 High |
| General Ledger Report | ❌ Missing | 🟢 Medium |
| Journal Entry Report | ❌ Missing | 🟢 Medium |

---

## 5. Comprehensive Upgrade Plan

### 5.1 Strategic Approach

**Phase-Based Implementation**: 7 phases over 12-16 weeks

**Key Principles**:
1. **Backward Compatibility**: Keep existing features working
2. **Gradual Migration**: Implement accounting layer alongside existing system
3. **Data Integrity**: Ensure all journal entries balance
4. **User Training**: Progressive disclosure of accounting features
5. **Testing**: Comprehensive validation at each phase

### 5.2 Success Criteria

✅ All transactions automatically create balanced journal entries
✅ Real-time financial statements (Income Statement, Balance Sheet)
✅ Accounts Receivable = Sum of unpaid invoices
✅ Accounts Payable = Sum of unpaid expenses
✅ Cash balance matches bank reconciliation
✅ Trial balance always balances (debits = credits)
✅ Period closing process functional
✅ PSAK 72 compliant revenue recognition

---

## 6. Database Schema Changes

### 6.1 New Tables (7 Critical Tables)

#### Table 1: `chart_of_accounts` (Bagan Akun)
```prisma
model ChartOfAccounts {
  id                String   @id @default(cuid())
  code              String   @unique // 1-1010, 4-1010, 6-1010
  name              String   // English name
  nameId            String   // Indonesian name
  accountType       AccountType // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  accountSubType    String   // CURRENT_ASSET, FIXED_ASSET, etc.
  normalBalance     BalanceType // DEBIT or CREDIT

  // Hierarchy
  parentId          String?
  parent            ChartOfAccounts? @relation("AccountHierarchy", fields: [parentId], references: [id])
  children          ChartOfAccounts[] @relation("AccountHierarchy")

  // Tax Configuration
  isControlAccount  Boolean  @default(false) // AR, AP, Cash
  isTaxAccount      Boolean  @default(false) // PPN, PPh
  taxType           String?  // PPN_IN, PPN_OUT, PPH23, PPH4_2

  // Status
  isActive          Boolean  @default(true)
  isSystemAccount   Boolean  @default(false) // Cannot be deleted
  description       String?
  descriptionId     String?

  // Relations
  journalLineItems  JournalLineItem[]
  ledgerEntries     GeneralLedger[]
  accountBalances   AccountBalance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([code])
  @@index([accountType])
  @@index([isActive])
  @@index([parentId])
  @@map("chart_of_accounts")
}

enum AccountType {
  ASSET           // 1-xxxx
  LIABILITY       // 2-xxxx
  EQUITY          // 3-xxxx
  REVENUE         // 4-xxxx
  EXPENSE         // 6-xxxx, 8-xxxx
}

enum BalanceType {
  DEBIT
  CREDIT
}
```

#### Table 2: `journal_entries` (Jurnal Umum)
```prisma
model JournalEntry {
  id                String   @id @default(cuid())
  entryNumber       String   @unique // JE-2025-10-0001
  entryDate         DateTime
  postingDate       DateTime? // When posted to ledger

  // Description
  description       String
  descriptionId     String?
  descriptionEn     String?

  // Transaction Reference
  transactionType   TransactionType // INVOICE, PAYMENT, EXPENSE, etc.
  transactionId     String // ID of invoice, payment, expense, etc.

  // Source Document
  documentNumber    String? // Invoice number, expense number
  documentDate      DateTime?

  // Status
  status            JournalStatus @default(DRAFT)
  isPosted          Boolean @default(false)
  postedAt          DateTime?
  postedBy          String?

  // Fiscal Period
  fiscalPeriodId    String?
  fiscalPeriod      FiscalPeriod? @relation(fields: [fiscalPeriodId], references: [id])

  // Reversal
  isReversing       Boolean @default(false)
  reversedEntryId   String?
  reversedEntry     JournalEntry? @relation("JournalReversal", fields: [reversedEntryId], references: [id])
  reversingEntries  JournalEntry[] @relation("JournalReversal")

  // User Tracking
  createdBy         String
  updatedBy         String?

  // Relations
  lineItems         JournalLineItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([entryNumber])
  @@index([entryDate])
  @@index([status])
  @@index([transactionType])
  @@index([transactionId])
  @@index([fiscalPeriodId])
  @@index([isPosted])
  @@map("journal_entries")
}

enum TransactionType {
  INVOICE_SENT        // Debit AR, Credit Revenue
  INVOICE_PAID        // Debit Cash, Credit AR
  EXPENSE_SUBMITTED   // Debit Expense, Credit AP
  EXPENSE_PAID        // Debit AP, Credit Cash
  PAYMENT_RECEIVED    // Debit Cash, Credit AR
  PAYMENT_MADE        // Debit AP, Credit Cash
  DEPRECIATION        // Debit Depreciation Expense, Credit Accumulated Depreciation
  ADJUSTMENT          // Manual adjustment
  CLOSING             // Period closing entry
  OPENING             // Period opening entry
}

enum JournalStatus {
  DRAFT
  POSTED
  VOID
  REVERSED
}
```

#### Table 3: `journal_line_items` (Detail Jurnal)
```prisma
model JournalLineItem {
  id                String   @id @default(cuid())
  journalEntryId    String
  journalEntry      JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  lineNumber        Int // 1, 2, 3...

  // Account
  accountId         String
  account           ChartOfAccounts @relation(fields: [accountId], references: [id])

  // Amount
  debit             Decimal  @db.Decimal(15, 2) @default(0)
  credit            Decimal  @db.Decimal(15, 2) @default(0)

  // Description
  description       String?
  descriptionId     String?

  // Dimensions (for reporting)
  projectId         String?
  clientId          String?
  departmentId      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([journalEntryId])
  @@index([accountId])
  @@index([projectId])
  @@index([clientId])
  @@map("journal_line_items")
}
```

#### Table 4: `general_ledger` (Buku Besar)
```prisma
model GeneralLedger {
  id                String   @id @default(cuid())

  // Account
  accountId         String
  account           ChartOfAccounts @relation(fields: [accountId], references: [id])

  // Transaction Details
  entryDate         DateTime
  postingDate       DateTime

  // Journal Reference
  journalEntryId    String
  journalEntryNumber String
  lineNumber        Int

  // Amount
  debit             Decimal  @db.Decimal(15, 2) @default(0)
  credit            Decimal  @db.Decimal(15, 2) @default(0)
  balance           Decimal  @db.Decimal(15, 2) // Running balance

  // Description
  description       String
  descriptionId     String?

  // Transaction Reference
  transactionType   TransactionType
  transactionId     String
  documentNumber    String?

  // Dimensions
  projectId         String?
  clientId          String?
  fiscalPeriodId    String?

  createdAt DateTime @default(now())

  @@index([accountId])
  @@index([entryDate])
  @@index([postingDate])
  @@index([journalEntryId])
  @@index([transactionType])
  @@index([fiscalPeriodId])
  @@index([projectId])
  @@index([clientId])
  @@map("general_ledger")
}
```

#### Table 5: `account_balances` (Saldo Akun)
```prisma
model AccountBalance {
  id                String   @id @default(cuid())

  // Account
  accountId         String
  account           ChartOfAccounts @relation(fields: [accountId], references: [id])

  // Period
  fiscalPeriodId    String
  fiscalPeriod      FiscalPeriod @relation(fields: [fiscalPeriodId], references: [id])

  // Balances
  beginningBalance  Decimal  @db.Decimal(15, 2) @default(0)
  debitTotal        Decimal  @db.Decimal(15, 2) @default(0)
  creditTotal       Decimal  @db.Decimal(15, 2) @default(0)
  endingBalance     Decimal  @db.Decimal(15, 2) @default(0)

  // Status
  isClosed          Boolean  @default(false)
  closedAt          DateTime?

  lastUpdated DateTime @updatedAt

  @@unique([accountId, fiscalPeriodId])
  @@index([accountId])
  @@index([fiscalPeriodId])
  @@index([isClosed])
  @@map("account_balances")
}
```

#### Table 6: `fiscal_periods` (Periode Fiskal)
```prisma
model FiscalPeriod {
  id                String   @id @default(cuid())
  name              String   // "January 2025", "Q1 2025"
  code              String   @unique // "2025-01", "2025-Q1"
  periodType        PeriodType // MONTHLY, QUARTERLY, YEARLY

  startDate         DateTime
  endDate           DateTime

  // Status
  status            PeriodStatus @default(OPEN)
  isActive          Boolean  @default(true)

  // Closing
  closedAt          DateTime?
  closedBy          String?
  closingNotes      String?

  // Relations
  journalEntries    JournalEntry[]
  accountBalances   AccountBalance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([code])
  @@index([status])
  @@index([startDate])
  @@index([endDate])
  @@map("fiscal_periods")
}

enum PeriodType {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum PeriodStatus {
  OPEN
  CLOSED
  LOCKED
}
```

#### Table 7: `financial_statements` (Cache for Reports)
```prisma
model FinancialStatement {
  id                String   @id @default(cuid())
  statementType     StatementType

  // Period
  fiscalPeriodId    String
  startDate         DateTime
  endDate           DateTime

  // Data (JSON for flexibility)
  data              Json

  // Metadata
  generatedAt       DateTime @default(now())
  generatedBy       String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([statementType])
  @@index([fiscalPeriodId])
  @@index([startDate, endDate])
  @@map("financial_statements")
}

enum StatementType {
  INCOME_STATEMENT      // Laporan Laba Rugi
  BALANCE_SHEET         // Neraca
  CASH_FLOW            // Laporan Arus Kas
  TRIAL_BALANCE        // Neraca Saldo
  ACCOUNTS_RECEIVABLE  // Laporan Piutang
  ACCOUNTS_PAYABLE     // Laporan Hutang
}
```

### 6.2 Modified Tables (Add Accounting Links)

#### Update: `Invoice` model
```prisma
// Add these fields to Invoice model:
journalEntryId    String?  // Journal entry when invoice sent
paymentJournalId  String?  // Journal entry when invoice paid
```

#### Update: `Expense` model
```prisma
// Add these fields to Expense model:
journalEntryId    String?  // Journal entry when expense submitted
paymentJournalId  String?  // Journal entry when expense paid
```

#### Update: `Payment` model
```prisma
// Add these fields to Payment model:
journalEntryId    String?  // Journal entry for this payment
```

---

## 7. Backend Services

### 7.1 New Core Services

#### 1. `AccountingService` (Master Service)
**Location**: `backend/src/modules/accounting/accounting.service.ts`

**Responsibilities**:
- Coordinate all accounting operations
- Ensure data consistency
- Transaction management

**Key Methods**:
```typescript
class AccountingService {
  // Chart of Accounts
  getChartOfAccounts(filter?): Promise<ChartOfAccounts[]>
  getAccount(id): Promise<ChartOfAccounts>
  createAccount(data): Promise<ChartOfAccounts>

  // Journal Entries
  createJournalEntry(data): Promise<JournalEntry>
  postJournalEntry(id): Promise<JournalEntry>
  voidJournalEntry(id): Promise<JournalEntry>
  reverseJournalEntry(id): Promise<JournalEntry>

  // Ledger Operations
  postToLedger(journalEntry): Promise<GeneralLedger[]>
  calculateAccountBalance(accountId, date): Promise<Decimal>

  // Financial Statements
  generateIncomeStatement(startDate, endDate): Promise<IncomeStatement>
  generateBalanceSheet(date): Promise<BalanceSheet>
  generateCashFlow(startDate, endDate): Promise<CashFlowStatement>
  generateTrialBalance(date): Promise<TrialBalance>

  // Period Management
  closePeriod(periodId): Promise<FiscalPeriod>
  openPeriod(periodId): Promise<FiscalPeriod>
}
```

#### 2. `JournalService` (Journal Entry Management)
**Location**: `backend/src/modules/accounting/journal.service.ts`

**Key Methods**:
```typescript
class JournalService {
  // Automated Entry Creation
  createInvoiceSentEntry(invoice): Promise<JournalEntry>
  createInvoicePaidEntry(invoice, payment): Promise<JournalEntry>
  createExpenseSubmittedEntry(expense): Promise<JournalEntry>
  createExpensePaidEntry(expense, payment): Promise<JournalEntry>
  createDepreciationEntry(asset, period): Promise<JournalEntry>

  // Validation
  validateJournalEntry(entry): Promise<boolean>
  checkBalance(entry): boolean // Debit = Credit?

  // Posting
  postToGeneralLedger(entry): Promise<void>
  updateAccountBalances(entry): Promise<void>
}
```

#### 3. `LedgerService` (General Ledger Management)
**Location**: `backend/src/modules/accounting/ledger.service.ts`

**Key Methods**:
```typescript
class LedgerService {
  getLedgerEntries(accountId, startDate?, endDate?): Promise<GeneralLedger[]>
  getAccountBalance(accountId, date): Promise<AccountBalance>
  recalculateRunningBalance(accountId): Promise<void>
  getTrialBalance(date): Promise<TrialBalanceData>
}
```

#### 4. `FinancialStatementsService` (Report Generation)
**Location**: `backend/src/modules/accounting/financial-statements.service.ts`

**Key Methods**:
```typescript
class FinancialStatementsService {
  generateIncomeStatement(startDate, endDate): Promise<IncomeStatementData>
  generateBalanceSheet(date): Promise<BalanceSheetData>
  generateCashFlowStatement(startDate, endDate): Promise<CashFlowData>
  generateAccountsReceivableAging(): Promise<AgingReportData>
  generateAccountsPayableAging(): Promise<AgingReportData>

  // Export
  exportToPDF(statement): Promise<Buffer>
  exportToExcel(statement): Promise<Buffer>
}
```

### 7.2 Modified Existing Services

#### Update: `InvoicesService`
```typescript
// Add to create() method:
async create(data) {
  const invoice = await this.prisma.invoice.create({...})

  // When status is SENT, create journal entry
  if (invoice.status === 'SENT') {
    const journalEntry = await this.journalService.createInvoiceSentEntry(invoice)
    await this.journalService.postToGeneralLedger(journalEntry)
  }

  return invoice
}

// Add to updateStatus() method:
async updateStatus(id, status) {
  const invoice = await this.prisma.invoice.update({...})

  // When status changes to PAID, create payment journal entry
  if (status === 'PAID' && oldStatus !== 'PAID') {
    const payment = await this.prisma.payment.findFirst({
      where: { invoiceId: id }
    })
    const journalEntry = await this.journalService.createInvoicePaidEntry(invoice, payment)
    await this.journalService.postToGeneralLedger(journalEntry)
  }

  return invoice
}
```

#### Update: `ExpensesService`
```typescript
// Add to submit() method:
async submit(id) {
  const expense = await this.prisma.expense.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date() }
  })

  // Create journal entry
  const journalEntry = await this.journalService.createExpenseSubmittedEntry(expense)
  await this.journalService.postToGeneralLedger(journalEntry)

  return expense
}

// Add to markPaid() method:
async markPaid(id, paymentData) {
  const expense = await this.prisma.expense.update({
    where: { id },
    data: { paymentStatus: 'PAID', paidAt: new Date() }
  })

  const payment = await this.prisma.payment.create({...})

  // Create payment journal entry
  const journalEntry = await this.journalService.createExpensePaidEntry(expense, payment)
  await this.journalService.postToGeneralLedger(journalEntry)

  return expense
}
```

---

## 8. Frontend Pages

### 8.1 New Pages (6 Critical Pages)

#### 1. **Chart of Accounts Page** (`/accounting/chart-of-accounts`)
**File**: `frontend/src/pages/accounting/ChartOfAccountsPage.tsx`

**Features**:
- Tree view of accounts hierarchy
- Add/Edit/Delete accounts
- Account type filtering
- Active/Inactive toggle
- Search by code or name

**Components**:
- AccountTree component
- AccountFormModal
- AccountTypeFilter

---

#### 2. **Journal Entries Page** (`/accounting/journal-entries`)
**File**: `frontend/src/pages/accounting/JournalEntriesPage.tsx`

**Features**:
- List all journal entries
- Filter by date, type, status
- View entry details (line items)
- Post/Void entries
- Create manual entries

**Components**:
- JournalEntryTable
- JournalEntryDetailModal
- ManualEntryModal

---

#### 3. **General Ledger Page** (`/accounting/general-ledger`)
**File**: `frontend/src/pages/accounting/GeneralLedgerPage.tsx`

**Features**:
- Select account to view ledger
- Date range filter
- Running balance display
- Export to Excel
- Drill-down to journal entries

**Components**:
- AccountSelector
- LedgerTable
- BalanceSummary

---

#### 4. **Income Statement Page** (`/accounting/income-statement`)
**File**: `frontend/src/pages/accounting/IncomeStatementPage.tsx`

**Features**:
- Select period (month/quarter/year)
- Revenue breakdown
- Expense breakdown by PSAK category
- Net profit calculation
- Comparative periods
- Export to PDF/Excel

**Layout**:
```
LAPORAN LABA RUGI
PT Teknologi Indonesia
Periode: Januari 2025

PENDAPATAN
  Pendapatan Jasa                 Rp 150.000.000
  Total Pendapatan                Rp 150.000.000

BEBAN OPERASIONAL
  Beban Penjualan
    - Gaji Penjualan              Rp  20.000.000
    - Iklan dan Promosi           Rp  10.000.000
    Total Beban Penjualan         Rp  30.000.000

  Beban Administrasi & Umum
    - Gaji Administrasi           Rp  15.000.000
    - Sewa Kantor                 Rp   5.000.000
    - Listrik dan Air             Rp   2.000.000
    Total Beban Administrasi      Rp  22.000.000

  Total Beban Operasional         Rp  52.000.000

LABA OPERASIONAL                  Rp  98.000.000

BEBAN LAIN-LAIN
  Beban Lain-Lain                 Rp   3.000.000

LABA BERSIH SEBELUM PAJAK         Rp  95.000.000
```

---

#### 5. **Balance Sheet Page** (`/accounting/balance-sheet`)
**File**: `frontend/src/pages/accounting/BalanceSheetPage.tsx`

**Features**:
- As of date selection
- Asset breakdown
- Liability breakdown
- Equity calculation
- Comparative periods
- Export to PDF/Excel

**Layout**:
```
NERACA
PT Teknologi Indonesia
Per 31 Januari 2025

ASET
  Aset Lancar
    - Kas dan Bank                Rp  50.000.000
    - Piutang Usaha               Rp  30.000.000
    - Biaya Dibayar Dimuka        Rp   5.000.000
    Total Aset Lancar             Rp  85.000.000

  Aset Tetap
    - Peralatan                   Rp  40.000.000
    - Akumulasi Penyusutan        (Rp 10.000.000)
    Total Aset Tetap              Rp  30.000.000

  TOTAL ASET                      Rp 115.000.000

KEWAJIBAN
  Kewajiban Lancar
    - Hutang Usaha                Rp  10.000.000
    - Hutang Pajak                Rp   3.000.000
    Total Kewajiban Lancar        Rp  13.000.000

  TOTAL KEWAJIBAN                 Rp  13.000.000

EKUITAS
  - Modal                         Rp  50.000.000
  - Laba Ditahan                  Rp  47.000.000
  - Laba Tahun Berjalan           Rp   5.000.000
  TOTAL EKUITAS                   Rp 102.000.000

TOTAL KEWAJIBAN & EKUITAS        Rp 115.000.000
```

---

#### 6. **Accounts Receivable Page** (`/accounting/accounts-receivable`)
**File**: `frontend/src/pages/accounting/AccountsReceivablePage.tsx`

**Features**:
- List unpaid invoices
- Aging report (0-30, 31-60, 61-90, >90 days)
- Client-wise breakdown
- Total receivable amount
- Link to invoice details

**Components**:
- AgingReportChart
- ReceivableTable
- ClientReceivableSummary

---

### 8.2 Modified Pages

#### Update: **ReportsPage** (`/reports`)
**Add New Sections**:
- Link to Income Statement
- Link to Balance Sheet
- Link to Accounts Receivable
- Link to Accounts Payable
- Cash position summary

#### Update: **SettingsPage** (`/settings`)
**Add New Tab**: "Accounting"
- Chart of Accounts management link
- Fiscal period settings
- Period closing
- Accounting preferences

#### Update: **DashboardPage** (`/dashboard`)
**Add New Metrics**:
- Total Accounts Receivable (Piutang)
- Total Accounts Payable (Hutang)
- Net Profit (current month)
- Cash balance
- Quick ratio

---

## 9. Implementation Phases

### Phase 1: Foundation Setup (2 weeks)
**Week 1-2**: Database schema and core accounting infrastructure

**Tasks**:
1. Create database migration for all 7 new tables
2. Seed initial Chart of Accounts (Indonesian standard)
3. Create AccountingModule, JournalModule, LedgerModule
4. Implement AccountingService base methods
5. Unit tests for core accounting logic

**Deliverables**:
✅ Database schema updated
✅ Chart of Accounts seeded with 50+ standard accounts
✅ Core services created
✅ 80%+ test coverage

**Validation**:
- [ ] Migration runs successfully
- [ ] Seeded accounts follow Indonesian COA standards
- [ ] Journal entry validation passes
- [ ] Balance check (debit = credit) works

---

### Phase 2: Journal Entry Automation (3 weeks)
**Week 3-5**: Automated journal entry creation

**Tasks**:
1. Implement JournalService methods:
   - `createInvoiceSentEntry()`
   - `createInvoicePaidEntry()`
   - `createExpenseSubmittedEntry()`
   - `createExpensePaidEntry()`
2. Update InvoicesService to trigger journal entries
3. Update ExpensesService to trigger journal entries
4. Implement posting to General Ledger
5. Real-time account balance updates
6. Integration tests

**Deliverables**:
✅ Invoices auto-create journal entries
✅ Expenses auto-create journal entries
✅ Ledger posting working
✅ Account balances accurate

**Validation**:
- [ ] Create invoice → Journal entry created (Debit AR, Credit Revenue)
- [ ] Pay invoice → Journal entry created (Debit Cash, Credit AR)
- [ ] Submit expense → Journal entry created (Debit Expense, Credit AP)
- [ ] Pay expense → Journal entry created (Debit AP, Credit Cash)
- [ ] Trial balance balances (debits = credits)

---

### Phase 3: Ledger & Balances (2 weeks)
**Week 6-7**: General Ledger and balance tracking

**Tasks**:
1. Implement LedgerService methods
2. Running balance calculation
3. Account balance aggregation
4. Fiscal period management
5. Period closing logic
6. Trial balance generation

**Deliverables**:
✅ General Ledger populated
✅ Account balances accurate
✅ Trial balance report working
✅ Period closing functional

**Validation**:
- [ ] General Ledger shows all posted transactions
- [ ] Running balances correct for each account
- [ ] Trial balance shows zero difference
- [ ] Period can be closed (no new entries)

---

### Phase 4: Financial Statements (3 weeks)
**Week 8-10**: Income Statement, Balance Sheet, Cash Flow

**Tasks**:
1. Implement FinancialStatementsService
2. Income Statement generation
3. Balance Sheet generation
4. Cash Flow Statement generation
5. Accounts Receivable aging report
6. Accounts Payable aging report
7. PDF/Excel export

**Deliverables**:
✅ Income Statement functional
✅ Balance Sheet functional
✅ Cash Flow Statement functional
✅ Aging reports functional
✅ Export to PDF/Excel working

**Validation**:
- [ ] Income Statement shows correct revenue & expenses
- [ ] Balance Sheet balances (Assets = Liabilities + Equity)
- [ ] Net profit matches between Income Statement and Balance Sheet
- [ ] Cash Flow reconciles with cash balance

---

### Phase 5: Frontend Implementation (4 weeks)
**Week 11-14**: Build all accounting pages

**Tasks**:
1. Chart of Accounts page
2. Journal Entries page
3. General Ledger page
4. Income Statement page
5. Balance Sheet page
6. Accounts Receivable page
7. Update ReportsPage
8. Update DashboardPage
9. Update SettingsPage

**Deliverables**:
✅ 6 new accounting pages
✅ Updated existing pages
✅ Navigation menu updated
✅ User-friendly UI

**Validation**:
- [ ] All pages render correctly
- [ ] Data loads from backend
- [ ] CRUD operations work
- [ ] Reports display properly
- [ ] Export functions work

---

### Phase 6: Data Migration & Historical Entries (2 weeks)
**Week 15-16**: Migrate existing data to accounting system

**Tasks**:
1. Create migration scripts
2. Generate journal entries for all existing invoices
3. Generate journal entries for all existing expenses
4. Recalculate account balances
5. Validate data consistency
6. Generate opening balances

**Deliverables**:
✅ All historical invoices have journal entries
✅ All historical expenses have journal entries
✅ Account balances accurate from day 1
✅ No data loss

**Validation**:
- [ ] Count of invoices = Count of invoice journal entries
- [ ] Sum of invoice amounts = Sum of revenue journal entries
- [ ] Account balances match expected values
- [ ] Financial statements show correct historical data

---

### Phase 7: Testing & Deployment (2 weeks)
**Week 17-18**: Comprehensive testing and production deployment

**Tasks**:
1. End-to-end testing
2. User acceptance testing
3. Performance optimization
4. Security audit
5. User training materials
6. Production deployment
7. Monitoring setup

**Deliverables**:
✅ Test coverage >80%
✅ All critical bugs fixed
✅ Performance benchmarks met
✅ Security vulnerabilities resolved
✅ User documentation complete
✅ Production deployment successful

**Validation**:
- [ ] All test suites pass
- [ ] No critical bugs
- [ ] Page load times <2 seconds
- [ ] Database queries optimized
- [ ] Users trained
- [ ] System stable in production

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Backend Services** (Target: 80%+ coverage):
- [ ] ChartOfAccountsService CRUD operations
- [ ] JournalService entry creation and validation
- [ ] LedgerService balance calculations
- [ ] FinancialStatementsService report generation
- [ ] Double-entry validation (debit = credit)

**Frontend Components** (Target: 70%+ coverage):
- [ ] Chart of Accounts tree rendering
- [ ] Journal entry form validation
- [ ] Financial statement display
- [ ] Report export functionality

### 10.2 Integration Tests

**Accounting Workflows**:
- [ ] Invoice sent → Journal entry created → Ledger updated → Balance updated
- [ ] Invoice paid → Payment journal created → AR cleared → Cash increased
- [ ] Expense submitted → Journal entry created → Ledger updated → Balance updated
- [ ] Expense paid → Payment journal created → AP cleared → Cash decreased
- [ ] Period closing → All entries posted → Balances calculated → Period locked

### 10.3 End-to-End Tests

**User Journeys**:
- [ ] Create client → Create project → Create quotation → Create invoice → Record payment
- [ ] Submit expense → Approve expense → Record payment
- [ ] Generate Income Statement
- [ ] Generate Balance Sheet
- [ ] Generate Trial Balance
- [ ] Export reports to PDF/Excel

### 10.4 Data Integrity Tests

**Accounting Rules**:
- [ ] Every journal entry balances (debits = credits)
- [ ] Trial balance always balances
- [ ] Balance Sheet equation holds (Assets = Liabilities + Equity)
- [ ] Net profit consistent across statements
- [ ] No orphaned records
- [ ] Account balances match ledger totals

### 10.5 Performance Tests

**Benchmarks**:
- [ ] Generate Income Statement: <3 seconds for 1 year of data
- [ ] Generate Balance Sheet: <2 seconds
- [ ] Load General Ledger: <5 seconds for 1000 entries
- [ ] Trial Balance calculation: <5 seconds
- [ ] Journal entry posting: <1 second
- [ ] Database queries optimized with indexes

---

## 11. Risk Mitigation

### 11.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data integrity issues | 🔴 Critical | Comprehensive validation, transaction management, rollback capability |
| Performance degradation | 🟡 High | Indexing, caching, pagination, background jobs for heavy calculations |
| Complexity overload | 🟡 High | Phased implementation, progressive disclosure in UI, clear documentation |
| Migration failures | 🔴 Critical | Backup before migration, dry-run scripts, rollback plan |
| Balance mismatch | 🔴 Critical | Automated reconciliation checks, daily balance validation jobs |

### 11.2 Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| User resistance | 🟡 High | Training materials, gradual rollout, change management |
| Incorrect accounting | 🔴 Critical | Consult with Indonesian accountant, PSAK compliance review |
| Audit compliance | 🔴 Critical | Audit trail for all transactions, immutable journal entries, period locking |
| Downtime during migration | 🟡 High | Schedule maintenance window, incremental migration, parallel run |

---

## 12. Success Metrics

### 12.1 Technical Metrics
- ✅ 100% of transactions have corresponding journal entries
- ✅ Trial balance balances 100% of the time
- ✅ Financial statements generate in <3 seconds
- ✅ Zero data integrity errors
- ✅ 95% uptime
- ✅ <2 second page load times

### 12.2 Business Metrics
- ✅ Real-time visibility into Accounts Receivable
- ✅ Real-time visibility into Accounts Payable
- ✅ Instant financial statement generation
- ✅ Automated month-end closing (<1 hour)
- ✅ PSAK 72 compliant revenue recognition
- ✅ Ready for external audit

### 12.3 User Satisfaction
- ✅ 90%+ users find system easy to use
- ✅ <5 support tickets per week
- ✅ 80%+ adoption rate within 2 months
- ✅ Positive feedback on reporting capabilities

---

## 13. Post-Implementation Roadmap

### 13.1 Phase 8: Advanced Features (Future)
1. **Budget Management**
   - Budget vs Actual reports
   - Variance analysis
   - Budget approval workflow

2. **Multi-Currency Support**
   - Foreign exchange tracking
   - Realized/Unrealized gains/losses
   - Multi-currency financial statements

3. **Asset Depreciation**
   - Automated depreciation calculations
   - Multiple depreciation methods
   - Asset disposal tracking

4. **Cost Centers**
   - Department-wise P&L
   - Cost allocation
   - Internal recharging

5. **Advanced Analytics**
   - Financial ratios
   - Trend analysis
   - Predictive analytics
   - Business intelligence dashboards

---

## 14. Appendix

### 14.1 Indonesian Accounting Terms Reference

| English | Indonesian | Abbreviation |
|---------|-----------|--------------|
| Chart of Accounts | Bagan Akun | COA |
| Journal Entry | Jurnal Umum | - |
| General Ledger | Buku Besar | - |
| Trial Balance | Neraca Saldo | - |
| Income Statement | Laporan Laba Rugi | L/R |
| Balance Sheet | Neraca | - |
| Cash Flow Statement | Laporan Arus Kas | LAK |
| Accounts Receivable | Piutang Usaha | - |
| Accounts Payable | Hutang Usaha | - |
| Assets | Aset/Harta | - |
| Liabilities | Kewajiban | - |
| Equity | Ekuitas/Modal | - |
| Revenue | Pendapatan | - |
| Expense | Beban | - |
| Debit | Debit | - |
| Credit | Kredit | - |
| Posting | Posting/Pembukuan | - |
| Closing Entry | Jurnal Penutup | - |

### 14.2 Key PSAK Standards

- **PSAK 1**: Presentation of Financial Statements
- **PSAK 2**: Cash Flow Statements
- **PSAK 14**: Inventories
- **PSAK 16**: Fixed Assets
- **PSAK 72**: Revenue from Contracts with Customers (replaces PSAK 34)
- **PSAK 101**: Islamic Financial Accounting
- **PSAK 109**: Islamic Accounting for Zakat

### 14.3 Indonesian Tax References

- **PPN (Pajak Pertambahan Nilai)**: Value Added Tax - 11% or 12%
- **PPh 21**: Income Tax on Employment
- **PPh 23**: Income Tax on Services - 2%
- **PPh 4(2)**: Final Income Tax - 10% (building rental)
- **PPh 15**: Income Tax on Shipping/Aviation
- **NPWP**: Taxpayer Identification Number
- **Materai**: Stamp Duty - Required for invoices >Rp 5,000,000

---

## 15. Conclusion

This comprehensive plan transforms the system from a **simple invoice generator** into a **full-featured ERP accounting system** compliant with Indonesian PSAK standards.

### Key Achievements:
✅ **Double-entry bookkeeping** with automated journal entries
✅ **Real-time financial statements** (Income Statement, Balance Sheet, Cash Flow)
✅ **PSAK 72 compliant** revenue recognition
✅ **Accrual basis accounting** (not cash basis)
✅ **Accounts Receivable/Payable** tracking
✅ **Automated ledger posting** and balance calculations
✅ **Indonesian tax compliance** (PPN, PPh, Materai)
✅ **Audit-ready** with immutable journal entries

### Expected Benefits:
- 📊 **Real-time financial visibility**
- ⚡ **Automated accounting workflows**
- 📈 **Accurate financial reporting**
- 🔒 **Audit compliance**
- 💰 **Better cash flow management**
- 📉 **Reduced manual errors**
- ⏱️ **Faster month-end closing**

### Timeline: **16-18 weeks**
### Budget: To be estimated based on team size
### Team: Backend (2), Frontend (2), QA (1), Accountant Consultant (1)

---

**Document Status**: ✅ COMPREHENSIVE ANALYSIS COMPLETE
**Next Step**: Review with stakeholders → Approve → Begin Phase 1

**Prepared By**: Claude (AI Assistant)
**Date**: October 17, 2025
**Version**: 1.0
