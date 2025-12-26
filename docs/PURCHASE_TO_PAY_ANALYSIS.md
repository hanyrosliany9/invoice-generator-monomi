# Purchase-to-Pay System - Current State Analysis & Implementation Plan

**Date**: 2025-10-18
**Project**: Monomi Invoice Generator - Indonesian Business Management System
**Objective**: Implement comprehensive purchase-to-pay system with Indonesian PSAK compliance

---

## 📊 CURRENT STATE ANALYSIS

### Database Schema (schema.prisma - 2,523 lines)

#### ✅ **Existing Models** (Relevant to Purchase-to-Pay):

**Expense Model**:
```prisma
model Expense {
  id                      String   @id @default(cuid())
  expenseNumber           String   @unique
  categoryId              String
  userId                  String

  // Vendor Information (TEXT ONLY - NOT FK)
  vendorName              String?
  vendorNPWP              String?  // Tax ID as text

  // Financial
  grossAmount             Decimal  @db.Decimal(15, 2)
  ppnAmount               Decimal  @db.Decimal(15, 2)
  totalAmount             Decimal  @db.Decimal(15, 2)

  // Indonesian Tax Compliance
  eFakturNSFP             String?
  eFakturQRCode           String?
  ppnCategory             PPNCategory
  withholdingTaxType      WithholdingTaxType

  // Status & Workflow
  status                  ExpenseStatus          // DRAFT, SUBMITTED, APPROVED, REJECTED, PAID
  paymentStatus           ExpensePaymentStatus   // UNPAID, PARTIALLY_PAID, PAID

  // Accounting
  journalEntryId          String?  // Journal entry when approved
  paymentJournalId        String?  // Journal entry when paid

  // Relations
  category                ExpenseCategory @relation(...)
  user                    User @relation(...)
  project                 Project? @relation(...)
  client                  Client? @relation(...)
}
```

**Key Issues**:
- ❌ No vendor master data (vendor stored as text)
- ❌ No purchase order tracking
- ❌ No goods receipt linkage
- ❌ No vendor invoice matching
- ❌ No actual due date field (AP report assumes 30 days)
- ❌ No payment terms tracking
- ❌ No three-way matching

**Asset Model**:
```prisma
model Asset {
  id                String   @id @default(cuid())
  assetNumber       String   @unique

  // Purchase Info
  purchaseDate      DateTime
  purchasePrice     Decimal  @db.Decimal(15, 2)

  // Depreciation (PSAK 16)
  depreciationMethod       DepreciationMethod
  usefulLife               Int
  salvageValue             Decimal?

  // Relations
  projectId         String?
  categoryId        String
}
```

**Key Issues**:
- ❌ No link to purchase order
- ❌ No vendor information
- ❌ No goods receipt tracking
- ❌ Cannot track asset purchases through procurement workflow

**Accounting Models**:
```prisma
model ChartOfAccounts {
  id            String      @id @default(cuid())
  code          String      @unique  // e.g., "2-1010" for AP
  accountType   AccountType // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  normalBalance BalanceType // DEBIT or CREDIT
}

model JournalEntry {
  id              String   @id @default(cuid())
  entryNumber     String   @unique
  transactionType TransactionType
  // INVOICE_SENT, PAYMENT_RECEIVED, EXPENSE_SUBMITTED, EXPENSE_PAID, etc.

  lineItems       JournalLineItem[]
}

model GeneralLedger {
  id            String   @id @default(cuid())
  accountId     String
  journalEntryId String
  debit         Decimal  @db.Decimal(15, 2)
  credit        Decimal  @db.Decimal(15, 2)
}
```

**Key Observations**:
- ✅ Robust double-entry accounting system
- ✅ Indonesian PSAK compliance (PSAK 16, 71, 72, 57)
- ❌ No AP model - relies on journal entries only
- ❌ Need new TransactionType enums for PO/GR/VI

#### ❌ **Missing Models** (Need to Build):

1. **Vendor** - Master data for suppliers
2. **PurchaseOrder** - PO workflow with approval
3. **PurchaseOrderItem** - Line items for PO
4. **GoodsReceipt** - Track received items
5. **GoodsReceiptItem** - Line items for GR
6. **VendorInvoice** - Vendor bills with three-way matching
7. **VendorInvoiceItem** - Line items for VI
8. **AccountsPayable** - AP tracking separate from journal entries
9. **VendorPayment** - Payment allocation to multiple invoices/expenses
10. **VendorPaymentAllocation** - Track which payment pays which invoice

---

### Backend Services Analysis

#### ✅ **Existing Services**:

**ExpensesService** (`backend/src/modules/expenses/expenses.service.ts` - 763 lines):

**Current Workflow**:
```
1. CREATE EXPENSE (DRAFT)
   - User enters vendor name as text
   - Calculates Indonesian taxes (PPN, PPh)
   - Validates E-Faktur if provided
   - Generates: EXP-2025-00001, BKK-2025-00001

2. SUBMIT FOR APPROVAL (SUBMITTED)
   - Changes status to SUBMITTED
   - Creates approval history

3. APPROVE EXPENSE (APPROVED)
   - Creates journal entry:
     DR: Expense Account (e.g., 6-1010)
     CR: Accounts Payable (2-1010)
   - Posts journal entry immediately
   - Links journalEntryId to expense

4. MARK AS PAID (PAID)
   - Creates payment journal entry:
     DR: Accounts Payable (2-1010)
     CR: Cash/Bank (1-1010)
   - Posts payment journal entry
   - Links paymentJournalId to expense
```

**Strengths**:
- ✅ Indonesian tax compliance (PPN 12%, PPh, E-Faktur)
- ✅ Approval workflow with history tracking
- ✅ Automatic journal entry creation
- ✅ RBAC integration

**Weaknesses**:
- ❌ No vendor master data integration
- ❌ No purchase order workflow
- ❌ No three-way matching
- ❌ Hardcoded 30-day payment terms (no flexibility)
- ❌ Cannot track credit purchases separately from direct expenses

**LedgerService** (`backend/src/modules/accounting/services/ledger.service.ts`):

**Key Method**: `getAccountsPayableAging()` (line 479-547)
```typescript
async getAccountsPayableAging(asOfDate: Date) {
  // Get all unpaid expenses
  const expenses = await this.prisma.expense.findMany({
    where: {
      status: { in: ['SUBMITTED', 'APPROVED'] },
      expenseDate: { lte: asOfDate },
    },
    include: { category: true },
  });

  // Calculate aging buckets
  const aging = expenses.map(expense => {
    // HARDCODED: Assumes 30 days payment term
    const dueDate = new Date(expense.expenseDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const daysOverdue = Math.floor(
      (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let agingBucket = 'Current';
    if (daysOverdue > 0 && daysOverdue <= 30) agingBucket = '1-30 days';
    else if (daysOverdue > 30 && daysOverdue <= 60) agingBucket = '31-60 days';
    // ... etc
  });
}
```

**Issues**:
- ❌ Expense-based (not vendor invoice based)
- ❌ Assumes 30-day payment terms for ALL expenses
- ❌ No actual dueDate field in database
- ❌ Groups by expense category, not vendor
- ❌ No payment allocation tracking

**FinancialStatementsService**: `getAccountsPayableReport()`
- Gets AP balance from account 2-1010 (hardcoded)
- Calls `getAccountsPayableAging()` for aging
- Groups expenses by category (top 10)
- Returns expense-based AP summary

#### ❌ **Missing Services** (Need to Build):

1. **VendorsService** - CRUD for vendor master data
2. **PurchaseOrdersService** - PO creation, approval, tracking
3. **GoodsReceiptsService** - GR creation against PO
4. **VendorInvoicesService** - VI creation with three-way matching
5. **AccountsPayableService** - AP tracking and aging
6. **VendorPaymentsService** - Payment allocation logic
7. **PurchaseJournalService** - Journal entries for purchase cycle

---

### Frontend Pages Analysis

#### ✅ **Existing Pages** (AP-Related):

**AccountsPayablePage.tsx** (`frontend/src/pages/accounting/AccountsPayablePage.tsx` - 399 lines):

**Current Implementation**:
- Shows expense-based AP report
- Date range filter (start/end date)
- Summary cards:
  - Total Hutang (Total Outstanding)
  - Jumlah Kategori (Category Count)
  - Beban Belum Bayar (Unpaid Expenses Count)
- **Hutang Per Kategori Table**: Groups expenses by category
  - Shows category name, expense count, outstanding amount, percentage
- **Beban Belum Terbayar Table**: Individual unpaid expenses
  - Expense number, category, expense date, due date, aging bucket, amount
  - Aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, Over 90 days
- Export to PDF functionality

**Limitations**:
- ❌ Shows expenses, not vendor invoices
- ❌ No vendor filter or grouping
- ❌ No payment allocation tracking
- ❌ Cannot link to purchase orders or goods receipts

**APAgingPage.tsx** (`frontend/src/pages/accounting/APAgingPage.tsx`):
- Similar to AccountsPayablePage
- Focus on aging analysis

**GeneralLedgerPage.tsx**:
- Shows journal entry details with account code filtering
- Can filter by account type or specific account
- Already supports theme-aware colors

#### ❌ **Missing Pages** (Need to Build):

1. **VendorsPage** - List all vendors with CRUD
2. **VendorDetailPage** - Vendor details with PO/Invoice history
3. **VendorCreatePage** / **VendorEditPage** - Vendor form with Indonesian tax fields
4. **PurchaseOrdersPage** - List all POs with status filtering
5. **PurchaseOrderCreatePage** - PO creation form
6. **PurchaseOrderDetailPage** - PO details with GR/VI matching
7. **GoodsReceiptsPage** - List all GRs
8. **GoodsReceiptCreatePage** - GR against PO
9. **VendorInvoicesPage** - List all vendor invoices
10. **VendorInvoiceCreatePage** - VI with three-way matching
11. **VendorInvoiceDetailPage** - VI details with matching status
12. **VendorPaymentsPage** - Payment allocation interface
13. **VendorPaymentCreatePage** - Payment with allocation to multiple invoices

#### 🔄 **Pages to Update**:

1. **ExpensesPage** - Add "Source" column (Direct, From PO, From VI)
2. **ExpenseCreatePage** - Add option to create from vendor invoice
3. **ExpenseDetailPage** - Show linked PO/VI if exists
4. **AssetsPage** - Show linked PO/GR if exists
5. **AssetCreatePage** - Option to create from PO/GR
6. **AccountsPayablePage** - Upgrade to show vendor invoices + expenses
7. **APAgingPage** - Group by vendor instead of category

---

## 🔄 INTEGRATION POINTS MAP

### Current Data Flow (Expense-Based):

```
┌─────────────┐
│   EXPENSE   │
│  (Manual)   │
└──────┬──────┘
       │
       │ 1. Submit for approval
       ▼
┌─────────────┐
│  APPROVED   │
└──────┬──────┘
       │
       │ 2. Create Journal Entry
       │    DR: Expense (6-xxxx)
       │    CR: AP (2-1010)
       ▼
┌─────────────┐
│   GENERAL   │
│   LEDGER    │
└──────┬──────┘
       │
       │ 3. Mark as Paid
       │    DR: AP (2-1010)
       │    CR: Cash (1-1010)
       ▼
┌─────────────┐
│    PAID     │
└─────────────┘
```

**Issues**:
- No vendor tracking
- No procurement workflow
- No goods receipt verification
- No invoice matching

### Proposed Data Flow (Purchase-to-Pay):

```
                    ┌──────────────────┐
                    │  VENDOR MASTER   │
                    │  - Name          │
                    │  - NPWP          │
                    │  - Payment Terms │
                    └────────┬─────────┘
                             │
                ┌────────────┴─────────────┐
                │                          │
       ┌────────▼─────────┐       ┌───────▼────────┐
       │  PURCHASE ORDER  │       │  DIRECT        │
       │  - Items         │       │  EXPENSE       │
       │  - Budget Check  │       │  (Legacy)      │
       │  - Approval      │       └────────────────┘
       └────────┬─────────┘
                │
                │ 1. Approve PO
                │    DR: WIP/Asset/Expense (depends on item type)
                │    CR: PO Commitment (2-1020)
                ▼
       ┌─────────────────┐
       │  GOODS RECEIPT  │
       │  - Match to PO  │
       │  - Qty Check    │
       │  - Quality OK   │
       └────────┬────────┘
                │
                │ 2. Receive Goods
                │    DR: Inventory/Asset/Expense
                │    CR: GR Accrual (2-1030)
                ▼
       ┌─────────────────┐
       │ VENDOR INVOICE  │
       │ - Match to PO   │
       │ - Match to GR   │
       │ - E-Faktur      │
       └────────┬────────┘
                │
                │ 3. Three-Way Match
                │    PO ↔ GR ↔ VI
                │    - Price tolerance check
                │    - Quantity validation
                │    - Tax verification (PPN, PPh)
                ▼
       ┌─────────────────┐
       │ ACCOUNTS PAYABLE│
       │ - Due Date      │
       │ - Aging         │
       │ - Allocation    │
       └────────┬────────┘
                │
                │ 4. Approve VI
                │    DR: Expense/Asset (final)
                │    CR: AP (2-1010)
                │
                │    DR: PO Commitment (2-1020)
                │    CR: PO Commitment (2-1020) [Clear]
                │
                │    DR: GR Accrual (2-1030)
                │    CR: GR Accrual (2-1030) [Clear]
                ▼
       ┌─────────────────┐
       │ VENDOR PAYMENT  │
       │ - Allocation    │
       │ - Multi-Invoice │
       └────────┬────────┘
                │
                │ 5. Make Payment
                │    DR: AP (2-1010)
                │    CR: Cash/Bank (1-1xxx)
                ▼
       ┌─────────────────┐
       │      PAID       │
       └─────────────────┘
```

### Integration Requirements:

#### **1. Expense ↔ Vendor Invoice**:
```prisma
model Expense {
  // NEW FIELDS
  purchaseType        PurchaseType  @default(DIRECT)  // DIRECT, CREDIT, FROM_PO
  purchaseSource      PurchaseSource @default(MANUAL) // MANUAL, FROM_PO, FROM_VENDOR_INVOICE

  vendorId            String?  // FK to Vendor
  vendor              Vendor?  @relation(...)

  purchaseOrderId     String?  // FK to PurchaseOrder
  purchaseOrder       PurchaseOrder? @relation(...)

  vendorInvoiceId     String?  // FK to VendorInvoice
  vendorInvoice       VendorInvoice? @relation(...)

  accountsPayableId   String?  // FK to AccountsPayable
  accountsPayable     AccountsPayable? @relation(...)

  dueDate             DateTime? // Actual due date from payment terms
}

enum PurchaseType {
  DIRECT      // Paid immediately
  CREDIT      // Buy now, pay later
  FROM_PO     // Sourced from purchase order
}

enum PurchaseSource {
  MANUAL              // User creates expense directly
  FROM_PO             // Generated from PO
  FROM_VENDOR_INVOICE // Generated from vendor invoice
}
```

#### **2. Asset ↔ Purchase Order**:
```prisma
model Asset {
  // NEW FIELDS
  vendorId            String?
  vendor              Vendor? @relation(...)

  purchaseOrderId     String?
  purchaseOrder       PurchaseOrder? @relation(...)

  goodsReceiptId      String?
  goodsReceipt        GoodsReceipt? @relation(...)

  vendorInvoiceId     String?
  vendorInvoice       VendorInvoice? @relation(...)
}
```

#### **3. Project ↔ Purchase Order** (Budget Control):
```prisma
model Project {
  // Existing
  purchaseBudget      Decimal?  @db.Decimal(15, 2)

  // NEW RELATIONS
  purchaseOrders      PurchaseOrder[]

  // NEW COMPUTED FIELDS (in service)
  // - committedAmount: Sum of approved POs
  // - actualSpent: Sum of received goods/services
  // - budgetRemaining: purchaseBudget - committedAmount
}
```

#### **4. TransactionType Enum** (New Types):
```prisma
enum TransactionType {
  // Existing
  INVOICE_SENT
  PAYMENT_RECEIVED
  EXPENSE_SUBMITTED
  EXPENSE_PAID
  PAYMENT_MADE
  ASSET_PURCHASE
  DEPRECIATION

  // NEW - Purchase-to-Pay
  PO_APPROVED           // PO commitment
  PO_CANCELLED          // Reverse PO commitment
  GOODS_RECEIVED        // GR accrual
  VENDOR_INVOICE_APPROVED // Final AP recognition
  VENDOR_PAYMENT_MADE   // Payment to vendor
  PURCHASE_RETURN       // Return to vendor
}
```

---

## 🎯 REVISED IMPLEMENTATION PLAN

### Phase 1: Database Schema (Prisma Migration)

**Duration**: 1-2 hours
**Files**: `backend/prisma/schema.prisma`

#### Step 1.1: Create Vendor Model
```prisma
model Vendor {
  id                  String   @id @default(cuid())
  vendorCode          String   @unique // VEN-2025-0001
  name                String
  nameId              String?  // Indonesian name

  // Vendor Classification
  vendorType          VendorType
  industryType        String?

  // Contact Information
  contactPerson       String?
  email               String?
  phone               String?
  address             String?
  city                String?
  province            String?
  postalCode          String?
  country             String   @default("Indonesia")

  // Tax Information (Indonesian Compliance)
  npwp                String?  @unique // Nomor Pokok Wajib Pajak
  pkpStatus           PKPStatus @default(NON_PKP)
  taxAddress          String?  // Tax invoice address

  // Banking Information
  bankName            String?
  bankAccountNumber   String?
  bankAccountName     String?
  bankBranch          String?
  swiftCode           String?

  // Payment Terms
  paymentTerms        String   @default("NET 30") // NET 30, NET 60, COD, etc.
  creditLimit         Decimal? @db.Decimal(15, 2)
  currency            String   @default("IDR")

  // Status
  isActive            Boolean  @default(true)
  isPKP               Boolean  @default(false) // Pengusaha Kena Pajak

  // Audit Fields
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String
  updatedBy           String?

  // Relations
  purchaseOrders      PurchaseOrder[]
  goodsReceipts       GoodsReceipt[]
  vendorInvoices      VendorInvoice[]
  accountsPayable     AccountsPayable[]
  vendorPayments      VendorPayment[]
  expenses            Expense[]
  assets              Asset[]

  @@index([vendorCode])
  @@index([npwp])
  @@index([isActive])
}

enum VendorType {
  SUPPLIER        // Material/goods supplier
  SERVICE_PROVIDER // Service vendor
  CONTRACTOR      // Construction contractor
  CONSULTANT      // Professional services
  UTILITY         // Utilities (electric, water)
  GOVERNMENT      // Government agencies
  OTHER
}

enum PKPStatus {
  PKP             // Pengusaha Kena Pajak (VAT registered)
  NON_PKP         // Not VAT registered
  GOVERNMENT      // Government entity
}
```

#### Step 1.2: Create Purchase Order Models
```prisma
model PurchaseOrder {
  id                  String   @id @default(cuid())
  poNumber            String   @unique // PO-2025-01-0001
  poDate              DateTime @default(now())

  // Vendor
  vendorId            String
  vendor              Vendor   @relation(fields: [vendorId], references: [id])

  // Project (Optional)
  projectId           String?
  project             Project? @relation(fields: [projectId], references: [id])

  // Line Items
  items               PurchaseOrderItem[]

  // Financial Summary
  subtotal            Decimal  @db.Decimal(15, 2)
  discountAmount      Decimal  @db.Decimal(15, 2) @default(0)
  ppnAmount           Decimal  @db.Decimal(15, 2)
  pphAmount           Decimal  @db.Decimal(15, 2) @default(0)
  totalAmount         Decimal  @db.Decimal(15, 2)

  // Indonesian Tax
  isPPNIncluded       Boolean  @default(true)
  ppnRate             Decimal  @db.Decimal(5, 2) @default(12) // 12%
  withholdingTaxType  WithholdingTaxType @default(NONE)
  withholdingTaxRate  Decimal? @db.Decimal(5, 2)

  // Delivery & Payment
  deliveryAddress     String?
  deliveryDate        DateTime?
  paymentTerms        String   @default("NET 30")
  dueDate             DateTime?

  // Status & Workflow
  status              POStatus @default(DRAFT)
  approvalStatus      ApprovalStatus @default(PENDING)

  // Approval Trail
  requestedBy         String
  approvedBy          String?
  approvedAt          DateTime?
  rejectedBy          String?
  rejectedAt          DateTime?
  rejectionReason     String?

  // Fulfillment Tracking
  totalReceived       Decimal  @db.Decimal(15, 2) @default(0)
  totalInvoiced       Decimal  @db.Decimal(15, 2) @default(0)
  isClosed            Boolean  @default(false)
  closedAt            DateTime?
  closedBy            String?
  closureReason       String?

  // Notes
  description         String?
  descriptionId       String?  // Indonesian description
  notes               String?
  termsConditions     String?

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String
  updatedBy           String?

  // Relations
  goodsReceipts       GoodsReceipt[]
  vendorInvoices      VendorInvoice[]
  expenses            Expense[]
  assets              Asset[]
  journalEntry        JournalEntry? // PO commitment entry

  @@index([poNumber])
  @@index([vendorId])
  @@index([projectId])
  @@index([status])
  @@index([poDate])
}

model PurchaseOrderItem {
  id                  String   @id @default(cuid())
  poId                String
  po                  PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  lineNumber          Int      // 1, 2, 3...

  // Item Details
  itemType            POItemType
  itemCode            String?  // SKU or service code
  description         String
  descriptionId       String?  // Indonesian description

  // Quantity & Pricing
  quantity            Decimal  @db.Decimal(15, 3)
  unit                String   // pcs, kg, hour, m2, etc.
  unitPrice           Decimal  @db.Decimal(15, 2)
  discountPercent     Decimal  @db.Decimal(5, 2) @default(0)
  discountAmount      Decimal  @db.Decimal(15, 2) @default(0)
  lineTotal           Decimal  @db.Decimal(15, 2)

  // PPN per line item
  ppnAmount           Decimal  @db.Decimal(15, 2)

  // Fulfillment Tracking
  quantityReceived    Decimal  @db.Decimal(15, 3) @default(0)
  quantityInvoiced    Decimal  @db.Decimal(15, 3) @default(0)
  quantityOutstanding Decimal  @db.Decimal(15, 3)

  // Asset/Project Linking
  assetId             String?
  asset               Asset?   @relation(fields: [assetId], references: [id])
  expenseCategoryId   String?
  expenseCategory     ExpenseCategory? @relation(fields: [expenseCategoryId], references: [id])

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  goodsReceiptItems   GoodsReceiptItem[]
  vendorInvoiceItems  VendorInvoiceItem[]

  @@index([poId])
  @@index([assetId])
}

enum POStatus {
  DRAFT       // Being created
  PENDING     // Awaiting approval
  APPROVED    // Approved, ready to send
  SENT        // Sent to vendor
  PARTIAL     // Partially received
  COMPLETED   // Fully received
  CANCELLED   // Cancelled
  CLOSED      // Manually closed
}

enum POItemType {
  GOODS       // Physical goods
  SERVICE     // Services
  ASSET       // Capital asset purchase
  EXPENSE     // Operating expense
}
```

#### Step 1.3: Create Goods Receipt Models
```prisma
model GoodsReceipt {
  id                  String   @id @default(cuid())
  grNumber            String   @unique // GR-2025-01-0001
  grDate              DateTime @default(now())

  // Reference
  poId                String
  po                  PurchaseOrder @relation(fields: [poId], references: [id])
  vendorId            String
  vendor              Vendor   @relation(fields: [vendorId], references: [id])

  // Delivery Details
  deliveryNoteNumber  String?  // Vendor's delivery note
  receivedBy          String
  receivedAt          DateTime @default(now())
  warehouseLocation   String?

  // Quality Check
  inspectionStatus    InspectionStatus @default(PENDING)
  inspectedBy         String?
  inspectedAt         DateTime?
  inspectionNotes     String?

  // Line Items
  items               GoodsReceiptItem[]

  // Status
  status              GRStatus @default(DRAFT)
  isPosted            Boolean  @default(false)
  postedAt            DateTime?

  // Notes
  notes               String?
  notesId             String?

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String
  updatedBy           String?

  // Relations
  vendorInvoices      VendorInvoice[]
  journalEntry        JournalEntry? // GR accrual entry
  assets              Asset[]

  @@index([grNumber])
  @@index([poId])
  @@index([vendorId])
  @@index([grDate])
}

model GoodsReceiptItem {
  id                  String   @id @default(cuid())
  grId                String
  gr                  GoodsReceipt @relation(fields: [grId], references: [id], onDelete: Cascade)

  poItemId            String
  poItem              PurchaseOrderItem @relation(fields: [poItemId], references: [id])

  lineNumber          Int

  // Quantity Details
  orderedQuantity     Decimal  @db.Decimal(15, 3)
  receivedQuantity    Decimal  @db.Decimal(15, 3)
  acceptedQuantity    Decimal  @db.Decimal(15, 3)
  rejectedQuantity    Decimal  @db.Decimal(15, 3) @default(0)

  // Quality
  qualityStatus       QualityStatus @default(PENDING)
  rejectionReason     String?

  // Pricing (from PO)
  unitPrice           Decimal  @db.Decimal(15, 2)
  lineTotal           Decimal  @db.Decimal(15, 2)

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([grId])
  @@index([poItemId])
}

enum GRStatus {
  DRAFT
  RECEIVED
  INSPECTED
  POSTED
  CANCELLED
}

enum InspectionStatus {
  PENDING
  IN_PROGRESS
  PASSED
  FAILED
  PARTIAL
}

enum QualityStatus {
  PENDING
  ACCEPTED
  REJECTED
  CONDITIONAL
}
```

#### Step 1.4: Create Vendor Invoice Models
```prisma
model VendorInvoice {
  id                  String   @id @default(cuid())

  // Numbers
  vendorInvoiceNumber String   // Vendor's invoice number
  internalNumber      String   @unique // VI-2025-01-0001
  invoiceDate         DateTime

  // Vendor
  vendorId            String
  vendor              Vendor   @relation(fields: [vendorId], references: [id])

  // References for Three-Way Matching
  poId                String?
  po                  PurchaseOrder? @relation(fields: [poId], references: [id])
  grId                String?
  gr                  GoodsReceipt? @relation(fields: [grId], references: [id])

  // Line Items
  items               VendorInvoiceItem[]

  // Financial
  subtotal            Decimal  @db.Decimal(15, 2)
  discountAmount      Decimal  @db.Decimal(15, 2) @default(0)
  ppnAmount           Decimal  @db.Decimal(15, 2)
  pphAmount           Decimal  @db.Decimal(15, 2) @default(0)
  totalAmount         Decimal  @db.Decimal(15, 2)

  // Indonesian E-Faktur
  eFakturNSFP         String?  @unique // Nomor Seri Faktur Pajak
  eFakturQRCode       String?
  eFakturStatus       EFakturStatus @default(NOT_APPLICABLE)
  eFakturUploadDate   DateTime?

  // Payment Terms
  paymentTerms        String
  dueDate             DateTime

  // Three-Way Matching
  matchingStatus      MatchingStatus @default(UNMATCHED)
  matchedBy           String?
  matchedAt           DateTime?
  matchingNotes       String?

  // Tolerance Check Results
  priceVariance       Decimal? @db.Decimal(15, 2)
  quantityVariance    Decimal? @db.Decimal(15, 3)
  withinTolerance     Boolean  @default(false)

  // Status
  status              VIStatus @default(DRAFT)
  approvalStatus      ApprovalStatus @default(PENDING)

  // Approval
  approvedBy          String?
  approvedAt          DateTime?
  rejectedBy          String?
  rejectedAt          DateTime?
  rejectionReason     String?

  // Accounting
  accountsPayableId   String?  @unique
  accountsPayable     AccountsPayable? @relation(fields: [accountsPayableId], references: [id])
  journalEntryId      String?
  journalEntry        JournalEntry? @relation(fields: [journalEntryId], references: [id])

  // Notes
  description         String?
  descriptionId       String?
  notes               String?

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String
  updatedBy           String?

  // Relations
  expenses            Expense[]

  @@index([vendorId])
  @@index([poId])
  @@index([grId])
  @@index([internalNumber])
  @@index([eFakturNSFP])
  @@index([status])
  @@index([matchingStatus])
}

model VendorInvoiceItem {
  id                  String   @id @default(cuid())
  viId                String
  vi                  VendorInvoice @relation(fields: [viId], references: [id], onDelete: Cascade)

  poItemId            String?
  poItem              PurchaseOrderItem? @relation(fields: [poItemId], references: [id])

  lineNumber          Int

  // Item Details
  description         String
  descriptionId       String?

  // Quantity & Pricing
  quantity            Decimal  @db.Decimal(15, 3)
  unit                String
  unitPrice           Decimal  @db.Decimal(15, 2)
  discountAmount      Decimal  @db.Decimal(15, 2) @default(0)
  lineTotal           Decimal  @db.Decimal(15, 2)
  ppnAmount           Decimal  @db.Decimal(15, 2)

  // Matching Flags
  isMatched           Boolean  @default(false)
  varianceReason      String?

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([viId])
  @@index([poItemId])
}

enum VIStatus {
  DRAFT
  PENDING_MATCH
  MATCHED
  APPROVED
  POSTED
  PAID
  CANCELLED
}

enum MatchingStatus {
  UNMATCHED           // Not yet matched
  MATCHED             // All items matched within tolerance
  PARTIAL_MATCH       // Some items matched
  VARIANCE            // Matched but has variances
  FAILED              // Matching failed
}

enum EFakturStatus {
  NOT_APPLICABLE      // Non-PKP vendor
  PENDING             // Waiting for e-Faktur
  RECEIVED            // e-Faktur received
  VALIDATED           // e-Faktur validated
  REJECTED            // e-Faktur invalid
}
```

#### Step 1.5: Create Accounts Payable Models
```prisma
model AccountsPayable {
  id                  String   @id @default(cuid())
  apNumber            String   @unique // AP-2025-01-0001

  // Vendor
  vendorId            String
  vendor              Vendor   @relation(fields: [vendorId], references: [id])

  // Source Document
  sourceType          APSourceType
  vendorInvoiceId     String?  @unique
  vendorInvoice       VendorInvoice?
  expenseId           String?  @unique
  expense             Expense?

  // Financial
  originalAmount      Decimal  @db.Decimal(15, 2)
  paidAmount          Decimal  @db.Decimal(15, 2) @default(0)
  outstandingAmount   Decimal  @db.Decimal(15, 2)

  // Dates
  invoiceDate         DateTime
  dueDate             DateTime

  // Status
  paymentStatus       APPaymentStatus @default(UNPAID)

  // Aging
  daysOutstanding     Int?     // Calculated
  agingBucket         String?  // Current, 1-30, 31-60, etc.

  // Accounting
  journalEntryId      String?
  journalEntry        JournalEntry? @relation(fields: [journalEntryId], references: [id])

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String
  updatedBy           String?

  // Relations
  paymentAllocations  VendorPaymentAllocation[]

  @@index([vendorId])
  @@index([paymentStatus])
  @@index([dueDate])
  @@index([agingBucket])
}

enum APSourceType {
  VENDOR_INVOICE
  EXPENSE
  MANUAL_ENTRY
}

enum APPaymentStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  OVERDUE
  WRITTEN_OFF
}
```

#### Step 1.6: Create Vendor Payment Models
```prisma
model VendorPayment {
  id                  String   @id @default(cuid())
  paymentNumber       String   @unique // VP-2025-01-0001
  paymentDate         DateTime @default(now())

  // Vendor
  vendorId            String
  vendor              Vendor   @relation(fields: [vendorId], references: [id])

  // Payment Details
  paymentMethod       PaymentMethod
  referenceNumber     String?  // Check number, transfer ref, etc.
  bankAccountId       String?  // Paying bank account

  // Amount
  totalAmount         Decimal  @db.Decimal(15, 2)

  // Allocation
  allocations         VendorPaymentAllocation[]

  // Status
  status              PaymentStatus @default(DRAFT)
  clearedAt           DateTime?  // When bank cleared

  // Accounting
  journalEntryId      String?
  journalEntry        JournalEntry? @relation(fields: [journalEntryId], references: [id])

  // Notes
  notes               String?
  notesId             String?

  // Audit
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String
  updatedBy           String?

  @@index([vendorId])
  @@index([paymentDate])
  @@index([status])
}

model VendorPaymentAllocation {
  id                  String   @id @default(cuid())

  paymentId           String
  payment             VendorPayment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  apId                String
  ap                  AccountsPayable @relation(fields: [apId], references: [id])

  allocatedAmount     Decimal  @db.Decimal(15, 2)

  createdAt           DateTime @default(now())

  @@index([paymentId])
  @@index([apId])
}

enum PaymentStatus {
  DRAFT
  PENDING
  POSTED
  CLEARED
  CANCELLED
  REVERSED
}
```

#### Step 1.7: Update Existing Models

**Expense Model Updates**:
```prisma
model Expense {
  // ... existing fields ...

  // NEW FIELDS FOR PURCHASE-TO-PAY
  purchaseType        PurchaseType  @default(DIRECT)
  purchaseSource      PurchaseSource @default(MANUAL)

  // Vendor Integration
  vendorId            String?
  vendor              Vendor? @relation(fields: [vendorId], references: [id])

  // Purchase Workflow Links
  purchaseOrderId     String?
  purchaseOrder       PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])

  vendorInvoiceId     String?
  vendorInvoice       VendorInvoice? @relation(fields: [vendorInvoiceId], references: [id])

  accountsPayableId   String?  @unique
  accountsPayable     AccountsPayable?

  // Payment Terms
  dueDate             DateTime?  // Actual due date (not calculated)

  // Keep existing vendorName and vendorNPWP for legacy data
  // vendorName       String?  (existing)
  // vendorNPWP       String?  (existing)
}

enum PurchaseType {
  DIRECT      // Paid immediately
  CREDIT      // Buy now, pay later
  FROM_PO     // Sourced from purchase order
}

enum PurchaseSource {
  MANUAL              // User creates expense directly
  FROM_PO             // Generated from PO
  FROM_VENDOR_INVOICE // Generated from vendor invoice
}
```

**Asset Model Updates**:
```prisma
model Asset {
  // ... existing fields ...

  // NEW FIELDS FOR PURCHASE-TO-PAY
  vendorId            String?
  vendor              Vendor? @relation(fields: [vendorId], references: [id])

  purchaseOrderId     String?
  purchaseOrder       PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])

  goodsReceiptId      String?
  goodsReceipt        GoodsReceipt? @relation(fields: [goodsReceiptId], references: [id])

  vendorInvoiceId     String?
  vendorInvoice       VendorInvoice? @relation(fields: [vendorInvoiceId], references: [id])

  // Relations
  poItems             PurchaseOrderItem[]
}
```

**JournalEntry Model Updates**:
```prisma
enum TransactionType {
  // ... existing types ...

  // NEW TYPES FOR PURCHASE-TO-PAY
  PO_APPROVED           // PO commitment
  PO_CANCELLED          // Reverse PO commitment
  GOODS_RECEIVED        // GR accrual
  VENDOR_INVOICE_APPROVED // Final AP recognition
  VENDOR_PAYMENT_MADE   // Payment to vendor
  PURCHASE_RETURN       // Return to vendor
}

model JournalEntry {
  // ... existing fields ...

  // NEW RELATIONS
  vendorInvoices      VendorInvoice[]
  accountsPayable     AccountsPayable[]
  vendorPayments      VendorPayment[]
}
```

#### Step 1.8: Chart of Accounts Updates

Add new accounts for purchase-to-pay:
```prisma
// New accounts to seed:
// 2-1020 | PO Commitments        | LIABILITY | CREDIT
// 2-1030 | GR Accruals           | LIABILITY | CREDIT
// 6-3010 | Purchase Returns      | EXPENSE   | DEBIT (contra)
// 6-3020 | Purchase Discounts    | EXPENSE   | DEBIT (contra)
```

---

### Phase 2: Backend Services Implementation

**Duration**: 4-6 hours
**Files**:
- `backend/src/modules/vendors/`
- `backend/src/modules/purchase-orders/`
- `backend/src/modules/goods-receipts/`
- `backend/src/modules/vendor-invoices/`
- `backend/src/modules/accounts-payable/`

#### Step 2.1: Vendors Module

**Structure**:
```
backend/src/modules/vendors/
├── vendors.module.ts
├── vendors.controller.ts
├── vendors.service.ts
├── dto/
│   ├── create-vendor.dto.ts
│   ├── update-vendor.dto.ts
│   └── vendor-query.dto.ts
└── services/
    └── vendor-validation.service.ts
```

**Key Features**:
- CRUD operations for vendor master data
- NPWP validation (Indonesian tax ID format)
- PKP status management
- Credit limit tracking
- Payment terms configuration
- Vendor statistics (total POs, invoices, payments)

#### Step 2.2: Purchase Orders Module

**Structure**:
```
backend/src/modules/purchase-orders/
├── purchase-orders.module.ts
├── purchase-orders.controller.ts
├── purchase-orders.service.ts
├── dto/
│   ├── create-po.dto.ts
│   ├── update-po.dto.ts
│   ├── approve-po.dto.ts
│   └── po-query.dto.ts
└── services/
    ├── po-approval.service.ts
    ├── po-commitment.service.ts  // Journal entry for PO commitment
    └── project-budget.service.ts // Budget check for project POs
```

**Key Features**:
- PO creation with line items
- Multi-level approval workflow (RBAC-based)
- Project budget validation
- PO commitment journal entry
- PO status tracking (DRAFT → APPROVED → SENT → PARTIAL → COMPLETED)
- Auto-generate PO numbers: `PO-YYYY-MM-NNNNN`

**Journal Entry Logic**:
```typescript
// When PO is approved:
async createPOCommitmentEntry(po: PurchaseOrder) {
  return journalService.createJournalEntry({
    transactionType: 'PO_APPROVED',
    description: `PO Commitment: ${po.poNumber}`,
    lineItems: [
      {
        accountCode: po.items[0].expenseCategory.accountCode, // e.g., 6-1010
        debit: po.totalAmount,
        credit: 0,
      },
      {
        accountCode: '2-1020', // PO Commitments
        debit: 0,
        credit: po.totalAmount,
      },
    ],
  });
}
```

#### Step 2.3: Goods Receipts Module

**Structure**:
```
backend/src/modules/goods-receipts/
├── goods-receipts.module.ts
├── goods-receipts.controller.ts
├── goods-receipts.service.ts
├── dto/
│   ├── create-gr.dto.ts
│   ├── update-gr.dto.ts
│   └── gr-query.dto.ts
└── services/
    ├── gr-matching.service.ts      // Match GR to PO
    ├── gr-accrual.service.ts       // Journal entry for GR accrual
    └── inventory-update.service.ts // Update inventory if applicable
```

**Key Features**:
- GR creation against PO
- Quantity received vs ordered tracking
- Quality inspection workflow
- GR accrual journal entry
- Partial receipts support
- Auto-generate GR numbers: `GR-YYYY-MM-NNNNN`

**Journal Entry Logic**:
```typescript
// When goods are received:
async createGRAccrualEntry(gr: GoodsReceipt) {
  const receivedValue = gr.items.reduce((sum, item) =>
    sum + (item.receivedQuantity * item.unitPrice), 0
  );

  return journalService.createJournalEntry({
    transactionType: 'GOODS_RECEIVED',
    description: `Goods Receipt: ${gr.grNumber}`,
    lineItems: [
      {
        accountCode: '1-3010', // Inventory or Asset
        debit: receivedValue,
        credit: 0,
      },
      {
        accountCode: '2-1030', // GR Accruals
        debit: 0,
        credit: receivedValue,
      },
    ],
  });
}
```

#### Step 2.4: Vendor Invoices Module

**Structure**:
```
backend/src/modules/vendor-invoices/
├── vendor-invoices.module.ts
├── vendor-invoices.controller.ts
├── vendor-invoices.service.ts
├── dto/
│   ├── create-vi.dto.ts
│   ├── update-vi.dto.ts
│   ├── approve-vi.dto.ts
│   └── vi-query.dto.ts
└── services/
    ├── three-way-matching.service.ts
    ├── efaktur-integration.service.ts
    ├── vi-approval.service.ts
    └── ap-creation.service.ts
```

**Key Features**:
- Vendor invoice creation
- **Three-way matching**: PO ↔ GR ↔ VI
- Price and quantity tolerance checks (configurable, e.g., ±5%)
- E-Faktur validation and upload
- Variance reporting
- Auto-generate VI numbers: `VI-YYYY-MM-NNNNN`

**Three-Way Matching Logic**:
```typescript
async performThreeWayMatch(vi: VendorInvoice) {
  const po = await getPO(vi.poId);
  const gr = await getGR(vi.grId);

  const results = {
    priceMatches: [],
    quantityMatches: [],
    variances: [],
  };

  for (const viItem of vi.items) {
    const poItem = po.items.find(i => i.id === viItem.poItemId);
    const grItem = gr.items.find(i => i.poItemId === viItem.poItemId);

    // Price tolerance check (±5%)
    const priceTolerance = 0.05;
    const priceVariance = Math.abs(viItem.unitPrice - poItem.unitPrice);
    const priceVariancePercent = priceVariance / poItem.unitPrice;

    if (priceVariancePercent > priceTolerance) {
      results.variances.push({
        itemId: viItem.id,
        type: 'PRICE',
        expected: poItem.unitPrice,
        actual: viItem.unitPrice,
        variance: priceVariance,
        variancePercent: priceVariancePercent * 100,
      });
    }

    // Quantity check
    if (viItem.quantity !== grItem.receivedQuantity) {
      results.variances.push({
        itemId: viItem.id,
        type: 'QUANTITY',
        expected: grItem.receivedQuantity,
        actual: viItem.quantity,
        variance: viItem.quantity - grItem.receivedQuantity,
      });
    }
  }

  const matchingStatus = results.variances.length === 0
    ? 'MATCHED'
    : 'VARIANCE';

  return { ...results, matchingStatus };
}
```

**Journal Entry Logic** (when VI is approved):
```typescript
async createVIApprovalEntry(vi: VendorInvoice) {
  const entries = [];

  // 1. Record final expense/asset
  entries.push({
    accountCode: determineExpenseAccount(vi),
    debit: vi.totalAmount,
    credit: 0,
    description: `Vendor Invoice: ${vi.internalNumber}`,
  });

  // 2. Record AP
  entries.push({
    accountCode: '2-1010', // Accounts Payable
    debit: 0,
    credit: vi.totalAmount,
  });

  // 3. Clear PO commitment
  if (vi.poId) {
    entries.push({
      accountCode: '2-1020', // PO Commitments
      debit: vi.subtotal,
      credit: 0,
    });
    entries.push({
      accountCode: determineExpenseAccount(vi),
      debit: 0,
      credit: vi.subtotal,
    });
  }

  // 4. Clear GR accrual
  if (vi.grId) {
    entries.push({
      accountCode: '2-1030', // GR Accruals
      debit: vi.subtotal,
      credit: 0,
    });
    entries.push({
      accountCode: '1-3010', // Inventory
      debit: 0,
      credit: vi.subtotal,
    });
  }

  return journalService.createJournalEntry({
    transactionType: 'VENDOR_INVOICE_APPROVED',
    lineItems: entries,
  });
}
```

#### Step 2.5: Accounts Payable Module

**Structure**:
```
backend/src/modules/accounts-payable/
├── accounts-payable.module.ts
├── accounts-payable.controller.ts
├── accounts-payable.service.ts
├── dto/
│   ├── ap-query.dto.ts
│   └── ap-aging-query.dto.ts
└── services/
    ├── ap-aging.service.ts
    ├── ap-reporting.service.ts
    └── ap-reconciliation.service.ts
```

**Key Features**:
- AP record creation from vendor invoices
- Aging calculation (Current, 1-30, 31-60, 61-90, 90+ days)
- Payment tracking (UNPAID → PARTIALLY_PAID → PAID)
- Vendor-based grouping (not category-based)
- AP reconciliation with GL account 2-1010

**Aging Logic**:
```typescript
async getAPAging(asOfDate: Date) {
  const apRecords = await prisma.accountsPayable.findMany({
    where: {
      paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      invoiceDate: { lte: asOfDate },
    },
    include: {
      vendor: true,
      vendorInvoice: true,
      expense: true,
    },
  });

  const aging = apRecords.map(ap => {
    const daysOverdue = Math.floor(
      (asOfDate.getTime() - ap.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let agingBucket = 'Current';
    if (daysOverdue > 0 && daysOverdue <= 30) agingBucket = '1-30 days';
    else if (daysOverdue > 30 && daysOverdue <= 60) agingBucket = '31-60 days';
    else if (daysOverdue > 60 && daysOverdue <= 90) agingBucket = '61-90 days';
    else if (daysOverdue > 90) agingBucket = 'Over 90 days';

    return {
      ...ap,
      daysOverdue,
      agingBucket,
      vendorName: ap.vendor.name,
      invoiceNumber: ap.vendorInvoice?.vendorInvoiceNumber || ap.expense?.expenseNumber,
    };
  });

  // Group by vendor
  const byVendor = groupBy(aging, 'vendorId');

  return {
    asOfDate,
    aging,
    byVendor,
    summary: calculateAgingSummary(aging),
  };
}
```

#### Step 2.6: Vendor Payments Module

**Structure**:
```
backend/src/modules/vendor-payments/
├── vendor-payments.module.ts
├── vendor-payments.controller.ts
├── vendor-payments.service.ts
├── dto/
│   ├── create-payment.dto.ts
│   ├── payment-allocation.dto.ts
│   └── payment-query.dto.ts
└── services/
    ├── payment-allocation.service.ts
    └── payment-journal.service.ts
```

**Key Features**:
- Payment creation with multiple invoice allocation
- Payment method tracking (bank transfer, check, cash)
- Bank reconciliation integration
- Auto-generate payment numbers: `VP-YYYY-MM-NNNNN`

**Payment Allocation Logic**:
```typescript
async createVendorPayment(dto: CreatePaymentDto) {
  const payment = await prisma.vendorPayment.create({
    data: {
      vendorId: dto.vendorId,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      totalAmount: dto.totalAmount,
      allocations: {
        create: dto.allocations.map(alloc => ({
          apId: alloc.apId,
          allocatedAmount: alloc.amount,
        })),
      },
    },
  });

  // Update AP records
  for (const alloc of dto.allocations) {
    const ap = await prisma.accountsPayable.findUnique({
      where: { id: alloc.apId },
    });

    const newPaidAmount = ap.paidAmount + alloc.amount;
    const newOutstanding = ap.originalAmount - newPaidAmount;

    let paymentStatus = 'PARTIALLY_PAID';
    if (newOutstanding === 0) paymentStatus = 'PAID';
    if (newPaidAmount === 0) paymentStatus = 'UNPAID';

    await prisma.accountsPayable.update({
      where: { id: alloc.apId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        paymentStatus,
      },
    });
  }

  // Create journal entry
  await createPaymentJournalEntry(payment);

  return payment;
}

async createPaymentJournalEntry(payment: VendorPayment) {
  return journalService.createJournalEntry({
    transactionType: 'VENDOR_PAYMENT_MADE',
    description: `Payment to Vendor: ${payment.paymentNumber}`,
    lineItems: [
      {
        accountCode: '2-1010', // Accounts Payable
        debit: payment.totalAmount,
        credit: 0,
      },
      {
        accountCode: determineBankAccount(payment.bankAccountId),
        debit: 0,
        credit: payment.totalAmount,
      },
    ],
  });
}
```

---

### Phase 3: Frontend Pages Implementation

**Duration**: 6-8 hours
**Tech Stack**: React 19, TypeScript, Ant Design 5.x, TanStack Query

#### Step 3.1: Vendor Management Pages

**VendorsPage.tsx** - List all vendors
- Table with columns: Vendor Code, Name, NPWP, PKP Status, Payment Terms, Credit Limit, Status
- Filters: Active/Inactive, Vendor Type, PKP Status
- Search: Name, NPWP, Vendor Code
- Actions: Create, Edit, View Details, Deactivate

**VendorDetailPage.tsx** - Vendor details
- Vendor information card
- Tabs:
  - Overview (contact, tax, banking info)
  - Purchase Orders (list of POs)
  - Invoices (list of vendor invoices)
  - Payments (payment history)
  - Statistics (total spent, average payment days, etc.)

**VendorCreatePage.tsx** / **VendorEditPage.tsx**
- Form sections:
  - Basic Information (name, type, contact)
  - Tax Information (NPWP, PKP status)
  - Banking Information
  - Payment Terms & Credit Limit
- Validation:
  - NPWP format validation (15 digits)
  - Duplicate NPWP check
  - Credit limit positive number

#### Step 3.2: Purchase Order Pages

**PurchaseOrdersPage.tsx**
- Table with columns: PO Number, Vendor, Date, Total, Status, Approval Status
- Filters: Status (Draft, Approved, Sent, etc.), Date Range, Vendor, Project
- Status badges with colors
- Actions: Create, View, Edit (draft only), Approve, Send to Vendor

**PurchaseOrderCreatePage.tsx**
- Progressive form sections:
  1. **Vendor Selection**: Select vendor (auto-fills payment terms, tax info)
  2. **Project Linking** (optional): Select project, show budget remaining
  3. **Line Items**:
     - Item type (Goods, Service, Asset, Expense)
     - Description (ID + EN)
     - Quantity, Unit, Unit Price
     - Discount
     - Line total with PPN
  4. **Summary**:
     - Subtotal
     - Discount
     - PPN (12%)
     - PPh if applicable
     - Total
  5. **Terms & Conditions**: Delivery date, payment terms, notes
- Dynamic calculations:
  - Auto-calculate PPN per line
  - Update totals on quantity/price changes
  - Check project budget if linked
- Validations:
  - At least one line item
  - Project budget not exceeded
  - Vendor credit limit check

**PurchaseOrderDetailPage.tsx**
- PO header with status badges
- Vendor information
- Line items table
- Approval history
- Matching status (GR and VI)
- Tabs:
  - Details
  - Goods Receipts (list of GRs against this PO)
  - Vendor Invoices (list of VIs matched to this PO)
  - Journal Entries
- Actions (role-based):
  - Approve (if pending)
  - Send to Vendor
  - Create Goods Receipt
  - Close PO
  - Cancel

#### Step 3.3: Goods Receipt Pages

**GoodsReceiptsPage.tsx**
- Table: GR Number, PO Number, Vendor, Date, Received By, Inspection Status
- Filters: Status, Date Range, Vendor, Inspection Status
- Actions: Create, View Details, Inspect

**GoodsReceiptCreatePage.tsx**
- Select PO (only approved POs)
- Auto-populate items from PO
- For each item:
  - Ordered Quantity (read-only from PO)
  - Received Quantity (user input)
  - Accepted Quantity (after inspection)
  - Rejected Quantity
  - Quality Status (Accepted, Rejected, Conditional)
  - Rejection Reason
- Delivery information:
  - Delivery Note Number
  - Received By
  - Warehouse Location
- Notes

**GoodsReceiptDetailPage.tsx**
- GR header with status
- PO reference link
- Items table with quantity comparison
- Inspection details
- Actions:
  - Mark as Inspected
  - Create Vendor Invoice
  - Post to GL

#### Step 3.4: Vendor Invoice Pages

**VendorInvoicesPage.tsx**
- Table: VI Number, Vendor Invoice #, Vendor, PO #, GR #, Date, Due Date, Total, Matching Status, Approval Status
- Filters: Matching Status, Approval Status, Date Range, Vendor
- Status badges for matching (Matched, Variance, Failed)
- Actions: Create, View, Approve, Match

**VendorInvoiceCreatePage.tsx**
- **Mode 1**: Create from PO/GR (recommended)
  - Select GR (auto-fills PO, vendor, items)
  - Items pre-populated from GR
  - User enters vendor invoice number, date, amounts
  - System performs three-way match
  - Show variance report if any
- **Mode 2**: Create standalone (no PO/GR)
  - Select vendor
  - Manually enter items
  - No matching
- E-Faktur upload (if vendor is PKP)
- Payment terms auto-filled from vendor
- Calculate due date

**VendorInvoiceDetailPage.tsx**
- VI header with matching status badge
- Three-way matching section:
  - PO reference
  - GR reference
  - Variance table (if any):
    - Item, Expected, Actual, Variance, Variance %, Tolerance Status
- Items table
- E-Faktur information (if applicable)
- Approval history
- Actions:
  - Perform Matching
  - Approve (if matched)
  - Reject
  - Create Expense (if needed)
  - View Journal Entry

#### Step 3.5: Accounts Payable Pages (Upgrade Existing)

**AccountsPayablePage.tsx** (UPGRADE)
- **Current**: Shows expense-based AP
- **New**: Show combined AP (vendor invoices + expenses)
- Filters:
  - AP Type (All, Vendor Invoices, Expenses)
  - Vendor
  - Date Range
  - Payment Status
- Summary Cards:
  - Total Outstanding
  - Current
  - Overdue
  - Average Days to Pay
- Two tables:
  1. **AP by Vendor**: Group by vendor
     - Vendor Name, Invoice Count, Total Outstanding, Oldest Invoice, Avg Days Overdue
  2. **AP Details**: Individual AP records
     - AP Number, Source (VI/Expense), Vendor, Invoice Date, Due Date, Original Amount, Paid, Outstanding, Aging Bucket, Days Overdue
- Actions:
  - Create Payment
  - View Details
  - Export to Excel/PDF

**APAgingPage.tsx** (UPGRADE)
- Aging buckets: Current, 1-30, 31-60, 61-90, 90+ days
- Stacked bar chart: AP aging by vendor (top 10)
- Aging summary table:
  - Vendor, Current, 1-30 days, 31-60 days, 61-90 days, 90+ days, Total
- Color coding:
  - Green: Current
  - Blue: 1-30 days
  - Orange: 31-60 days
  - Red: 61-90 days
  - Purple: Over 90 days

#### Step 3.6: Vendor Payment Pages

**VendorPaymentsPage.tsx**
- Table: Payment Number, Vendor, Payment Date, Payment Method, Total Amount, Status, Cleared
- Filters: Status, Date Range, Vendor, Payment Method
- Actions: Create, View Details, Mark as Cleared

**VendorPaymentCreatePage.tsx**
- Select Vendor
- Show outstanding AP for selected vendor:
  - Table: Invoice #, Due Date, Original Amount, Outstanding, Days Overdue
  - Select invoices to pay
  - Enter allocated amount for each
  - Total allocated must equal payment amount
- Payment details:
  - Payment Date
  - Payment Method (Bank Transfer, Check, Cash, etc.)
  - Bank Account (if transfer)
  - Reference Number (check #, transfer ref)
  - Notes
- Validation:
  - Total allocated <= Total available
  - Allocated amount <= Outstanding for each AP
- Preview journal entry

**VendorPaymentDetailPage.tsx**
- Payment header
- Vendor information
- Allocation table:
  - Invoice #, Invoice Date, Due Date, Amount Paid
- Bank account details
- Journal entry link
- Actions:
  - Mark as Cleared (if pending)
  - Reverse Payment (with approval)

---

### Phase 4: Update Existing Modules

**Duration**: 2-3 hours

#### Step 4.1: Expense Module Updates

**ExpensesPage.tsx**:
- Add "Source" column: Direct, From PO, From VI
- Add "Vendor" filter (select from vendor master)
- Show linked PO/VI icons with click-through

**ExpenseCreatePage.tsx**:
- Add source selector at top:
  - [ ] Create Direct Expense (manual)
  - [ ] Create from Vendor Invoice (select VI → auto-fill)
  - [ ] Create from Purchase Order (select PO → auto-fill)
- If "Create from VI" selected:
  - Select vendor invoice
  - Auto-fill: vendor, category, amounts, tax info, due date
  - Link to VI record
- If vendor selected from master, auto-fill NPWP and payment terms

**ExpenseDetailPage.tsx**:
- Show "Linked Purchase Order" section (if exists)
- Show "Linked Vendor Invoice" section (if exists)
- Show "Accounts Payable Record" link (if exists)

#### Step 4.2: Asset Module Updates

**AssetCreatePage.tsx**:
- Add source selector:
  - [ ] Create Direct Asset
  - [ ] Create from Purchase Order
  - [ ] Create from Goods Receipt
- If from PO/GR selected:
  - Select PO/GR
  - Auto-fill: purchase date, price, vendor
  - Link to PO/GR

**AssetDetailPage.tsx**:
- Show procurement section:
  - Vendor
  - Purchase Order (link)
  - Goods Receipt (link)
  - Vendor Invoice (link)

#### Step 4.3: Project Module Updates

**ProjectDetailPage.tsx**:
- Add "Purchase Orders" tab:
  - Table: PO Number, Vendor, Date, Total, Status
  - Show committed amount vs budget
  - Progress bar: Budget Utilization
- Budget section:
  - Purchase Budget
  - Committed (sum of approved POs)
  - Actual Spent (sum of received goods)
  - Remaining Budget

---

### Phase 5: Testing & Validation

**Duration**: 2-3 hours

#### Test Scenarios:

1. **Complete Purchase-to-Pay Cycle**:
   - Create Vendor
   - Create PO with project linkage
   - Check project budget impact
   - Approve PO → verify journal entry (PO commitment)
   - Create GR → verify journal entry (GR accrual)
   - Create VI → perform three-way match
   - Check variance handling
   - Approve VI → verify journal entry (AP recognition)
   - Check AP aging report
   - Create payment with allocation to multiple invoices
   - Verify payment journal entry
   - Verify AP status updates

2. **Indonesian Tax Compliance**:
   - PKP vendor with E-Faktur
   - Non-PKP vendor without E-Faktur
   - PPN calculation (12%)
   - PPh calculation (2%, 4%, 10% based on type)
   - E-Faktur validation

3. **Legacy Expense Flow** (Backward Compatibility):
   - Create direct expense (no PO)
   - Verify existing workflow still works
   - Verify journal entries match old format

4. **Three-Way Matching Edge Cases**:
   - Price variance within tolerance
   - Price variance outside tolerance (should flag)
   - Quantity mismatch
   - Partial receipts
   - Multiple GRs for one PO
   - Multiple VIs for one PO

5. **Reporting**:
   - AP Aging by Vendor
   - AP Aging by Aging Bucket
   - Vendor Performance (payment days)
   - Purchase Order Status Report
   - E-Faktur Status Report

---

## 📋 MIGRATION STRATEGY

### Backward Compatibility:

1. **Existing Expenses**:
   - Keep `vendorName` and `vendorNPWP` fields populated
   - Set `purchaseType = DIRECT` and `purchaseSource = MANUAL` for existing records
   - `vendorId = NULL` (not migrated to vendor master)
   - Add migration script to optionally migrate vendor names to vendor master

2. **Existing Assets**:
   - Keep `purchaseDate` and `purchasePrice`
   - `vendorId = NULL`, `purchaseOrderId = NULL`

3. **AP Report**:
   - Update `getAccountsPayableReport()` to include both:
     - New AP records from vendor invoices
     - Legacy expenses (where status = APPROVED and vendorId IS NULL)
   - Union results for backward compatibility

### Data Migration Script:

```typescript
// Optional: Migrate existing vendor names to vendor master
async function migrateVendorNames() {
  const uniqueVendors = await prisma.expense.groupBy({
    by: ['vendorName', 'vendorNPWP'],
    where: {
      vendorName: { not: null },
    },
  });

  for (const vendorData of uniqueVendors) {
    if (!vendorData.vendorName) continue;

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode: await generateVendorCode(),
        name: vendorData.vendorName,
        npwp: vendorData.vendorNPWP,
        vendorType: 'OTHER',
        pkpStatus: vendorData.vendorNPWP ? 'PKP' : 'NON_PKP',
        createdBy: 'MIGRATION',
      },
    });

    // Update all expenses with this vendor name
    await prisma.expense.updateMany({
      where: {
        vendorName: vendorData.vendorName,
        vendorNPWP: vendorData.vendorNPWP,
        vendorId: null,
      },
      data: {
        vendorId: vendor.id,
      },
    });
  }
}
```

---

## 🎯 SUCCESS CRITERIA

### Functional Requirements:
- ✅ Full purchase-to-pay cycle implemented (PO → GR → VI → Payment)
- ✅ Three-way matching working with configurable tolerance
- ✅ Indonesian tax compliance (E-Faktur, PPN, PPh)
- ✅ Vendor master data management
- ✅ AP aging by vendor (not category)
- ✅ Payment allocation to multiple invoices
- ✅ Automatic journal entries for all transactions
- ✅ Project budget control for POs
- ✅ RBAC integration for approvals

### Non-Functional Requirements:
- ✅ Backward compatible with existing expense workflow
- ✅ Theme-aware UI (light/dark mode)
- ✅ Indonesian language support (Bahasa Indonesia)
- ✅ Responsive design
- ✅ Performance: Page loads < 2 seconds
- ✅ Type-safe throughout (TypeScript)

### Accounting Requirements:
- ✅ Double-entry bookkeeping maintained
- ✅ Journal entries for all transactions
- ✅ GL reconciliation possible
- ✅ Audit trail complete
- ✅ PSAK compliance

---

## 📊 EFFORT ESTIMATE

| Phase | Duration | Files | Lines of Code (est.) |
|-------|----------|-------|---------------------|
| Phase 1: Database Schema | 1-2 hours | 1 migration | ~800 lines |
| Phase 2: Backend Services | 4-6 hours | ~30 files | ~3,000 lines |
| Phase 3: Frontend Pages | 6-8 hours | ~20 files | ~4,000 lines |
| Phase 4: Update Existing | 2-3 hours | ~10 files | ~500 lines |
| Phase 5: Testing | 2-3 hours | - | - |
| **TOTAL** | **15-22 hours** | **~60 files** | **~8,300 lines** |

---

## 🚀 NEXT STEPS

1. ✅ Complete codebase analysis (DONE)
2. **Review this analysis document** with stakeholders
3. **Approve implementation plan**
4. **Start Phase 1**: Create Prisma migration for new models
5. **Validate schema** with sample data
6. **Proceed to Phase 2**: Backend services
7. **Iterate**: Build, test, validate, repeat

---

## 📝 NOTES & CONSIDERATIONS

### Design Decisions:

1. **Vendor Master**: Decided to create full vendor master instead of just storing vendor names as text. This enables proper AP tracking, payment terms management, and reporting.

2. **Three-Way Matching**: Implemented as configurable tolerance check (default ±5%) rather than strict equality. This handles real-world scenarios where small price fluctuations occur.

3. **Journal Entries**: Decided to create intermediate commitment and accrual accounts (2-1020, 2-1030) instead of going directly to AP. This provides better audit trail and matches Indonesian accounting practices.

4. **Backward Compatibility**: Chose to maintain legacy fields (`vendorName`, `vendorNPWP`) rather than force migration. This prevents breaking existing functionality.

5. **Payment Allocation**: Implemented many-to-many allocation (one payment can pay multiple invoices) instead of one-to-one. This is more flexible and matches real business processes.

### Risks & Mitigation:

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking existing expense workflow | HIGH | Maintain backward compatibility, add migration scripts |
| Performance with large dataset | MEDIUM | Add database indexes, implement pagination, use TanStack Query caching |
| Complexity of three-way matching | MEDIUM | Implement in phases, start with simple matching, add variance handling later |
| E-Faktur integration | MEDIUM | Start with manual upload, consider API integration in future |
| User adoption | MEDIUM | Provide training, documentation, keep old workflow available |

---

**Document Status**: ✅ READY FOR REVIEW
**Last Updated**: 2025-10-18
**Next Review**: After Phase 1 completion
