# Comprehensive Expense Management Implementation Plan
## Indonesian-Compliant Business Expense Tracking System

**Project:** Invoice Generator (Monomi Business Management System)
**Feature:** Indonesian-Compliant Expense Management Module
**Date:** 2025-10-16
**Status:** Planning Phase - DO NOT IMPLEMENT YET
**Timeline:** 14-16 weeks
**Compliance Level:** PSAK + Indonesian Tax Law 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Codebase Analysis](#codebase-analysis)
3. [2025 Best Practices Research](#2025-best-practices-research)
4. [Indonesian Compliance Requirements](#indonesian-compliance-requirements)
5. [Feature Requirements](#feature-requirements)
6. [Database Schema Design](#database-schema-design)
7. [Backend API Design](#backend-api-design)
8. [Frontend Implementation](#frontend-implementation)
9. [Integration Points](#integration-points)
10. [Implementation Phases](#implementation-phases)
11. [Testing Strategy](#testing-strategy)
12. [Security Considerations](#security-considerations)
13. [Performance Optimization](#performance-optimization)
14. [Indonesian Tax Reporting](#indonesian-tax-reporting)

---

## Executive Summary

### Goal

Add a **comprehensive, Indonesian-compliant expense management module** to the existing Invoice Generator system to enable tracking of business expenses with full compliance to Indonesian accounting standards (PSAK), tax regulations (PPN/PPh), and e-Faktur requirements.

### Why Indonesian Compliance is Core

This is **not** a generic expense tracker with Indonesian features added later. This is an **Indonesian-first expense management system** that:

- **Follows PSAK accounting standards** from day one
- **Uses Indonesian chart of accounts** (6-xxxx for expenses)
- **Calculates PPN at 12%** (effective Jan 2025)
- **Integrates e-Faktur validation** (mandatory in Indonesia)
- **Tracks withholding tax** (PPh Pasal 23, 4(2), 15)
- **Generates Bukti Pengeluaran** (Indonesian expense documentation)
- **Produces Indonesian tax reports** (monthly PPN, quarterly PPh)

### Key Benefits

1. **Complete Financial Picture**: Track income (invoices) and expenses in one system
2. **Indonesian Compliance**: Full PSAK and tax law compliance out of the box
3. **Project Profitability**: Link expenses to projects for true ROI calculation
4. **Tax Automation**: Automatic PPN and PPh calculations
5. **E-Faktur Integration**: Validate receipts against DGT e-Faktur system
6. **Bilingual Support**: Indonesian primary, English secondary
7. **Audit-Ready**: 10-year archival with complete audit trails

### Success Metrics

- **60% faster** expense entry with receipt scanning
- **100%** Indonesian tax compliance
- **Zero** PPN calculation errors
- **Complete** project profitability analysis
- **Real-time** expense approval notifications
- **10-year** compliant record retention

### Critical Compliance Requirements

🔴 **CRITICAL** - Cannot launch without:
- E-Faktur NSFP tracking and validation
- PPN 12% rate (effective 11% for non-luxury goods)
- PSAK-compliant chart of accounts (6-xxxx, 8-xxxx)
- Bukti Pengeluaran format
- Withholding tax calculation (PPh)
- Bilingual support (Indonesian primary)

🟡 **HIGH** - Should have for launch:
- Monthly PPN reporting
- Multi-step income statement (PSAK format)
- Account code validation
- Indonesian PDF templates

🟢 **MEDIUM** - Can add later:
- OCR receipt scanning
- Real-time DGT API validation
- Budget tracking
- Advanced analytics

---

## Codebase Analysis

### Current System Architecture

#### Technology Stack (Verified 2025)
- **Backend**: NestJS 11.1.3 + Prisma + PostgreSQL 15 + TypeScript
- **Frontend**: React 19 + Vite 6/7 + Ant Design 5.x + TypeScript
- **State Management**: Zustand + TanStack Query
- **PDF Generation**: Puppeteer (server-side)
- **Localization**: i18next (Indonesian/English) ✅ **Already bilingual**
- **Container**: Docker + docker-compose

#### Existing Database Models

Current models we'll integrate with:

```prisma
✅ User         // Expense submitters and approvers
✅ Client       // Expenses may be client-related
✅ Project      // Expenses linked to projects
✅ Invoice      // Billable expenses → invoice items
✅ Payment      // Track expense reimbursements
✅ Document     // Attach receipts and e-Faktur
✅ AuditLog     // Track all expense changes
```

#### Current Routing Pattern

The system follows a consistent pattern:

```typescript
/expenses                    // List page
/expenses/new               // Create page (lazy loaded)
/expenses/:id               // Detail page
/expenses/:id/edit          // Edit page (lazy loaded)
```

#### Existing Page Patterns

**List Pages** (e.g., InvoicesPage.tsx):
- Search and filter controls
- Status filters (Ant Design Select)
- Compact metric cards for statistics
- Ant Design Table with sorting/pagination
- Batch operations (select multiple, bulk actions)
- Keyboard shortcuts support
- Export functionality
- Theme-aware colors ✅

**Create Pages** (e.g., InvoiceCreatePage.tsx):
- OptimizedFormLayout with hero card
- Progressive sections (collapsible)
- Auto-save functionality
- Form validation (Ant Design Form)
- Real-time preview
- Mobile optimization
- **IDRCurrencyInput** ✅ **Already supports Indonesian Rupiah**
- Entity relationships (select client/project)

**Detail Pages** (e.g., InvoiceDetailPage.tsx):
- Hero card with entity info
- Status badges and timelines
- Statistics cards (4-column grid)
- Tabbed interface (Details, History, Related)
- Document attachments
- Action buttons (Edit, PDF, Print)
- Floating action buttons
- Modal dialogs for actions

#### Backend Module Pattern

**Module Structure** (from invoices.module.ts):

```typescript
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuotationsModule),
    NotificationsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
```

**Expected Files**:
```
backend/src/modules/expenses/
├── expenses.module.ts
├── expenses.controller.ts
├── expenses.service.ts
├── expenses.service.spec.ts
├── dto/
│   ├── create-expense.dto.ts
│   ├── update-expense.dto.ts
│   ├── expense-query.dto.ts
│   └── approve-expense.dto.ts
├── services/
│   ├── ppn-calculator.service.ts        // 🇮🇩 PPN calculation
│   ├── withholding-tax.service.ts       // 🇮🇩 PPh calculation
│   └── efaktur-validator.service.ts     // 🇮🇩 e-Faktur validation
└── guards/
    └── expense-access.guard.ts
```

#### Reusable Components

The codebase already has components we can leverage:

```typescript
✅ CompactMetricCard        // Statistics display
✅ EntityHeroCard          // Page headers
✅ FormStatistics          // Real-time form stats
✅ ProgressiveSection      // Collapsible form sections
✅ FileUpload              // Document attachments
✅ IDRCurrencyInput        // Indonesian currency ✅
✅ MateraiCompliancePanel  // Tax compliance ✅
```

**Key Finding**: The system **already supports Indonesian currency (IDR)** and has tax compliance components. We're building on solid foundations.

---

## 2025 Best Practices Research

### Industry Standards for Expense Management

#### Core Features (from FreshBooks, Expensify, QuickBooks)

1. **Receipt Capture**
   - Mobile photo capture
   - Email forwarding
   - Drag-and-drop upload
   - **OCR text extraction** ← 🇮🇩 Extract NSFP from e-Faktur

2. **Smart Categorization**
   - AI-powered category suggestions
   - **PSAK chart of accounts hierarchy** ← 🇮🇩
   - Tax-deductible marking
   - Project/client assignment

3. **Approval Workflows**
   - Multi-level approval chains
   - Approval policies (amount thresholds)
   - Email/push notifications
   - Bulk approval actions

4. **Expense Types**
   - Direct expenses (purchases)
   - Mileage/travel expenses
   - Per diem expenses
   - **Vendor payments with withholding tax** ← 🇮🇩
   - Employee reimbursements

5. **Reporting & Analytics**
   - Expense by category (PSAK classification)
   - Expense by project/client
   - Monthly/quarterly trends
   - Budget vs. actual
   - **Indonesian tax reports** (PPN, PPh) ← 🇮🇩
   - Export to Excel/PDF (Indonesian format)

6. **Integration Points**
   - Link to projects (profitability)
   - Convert to invoice items (billable)
   - Payment tracking (reimbursements)
   - **E-Faktur validation** ← 🇮🇩
   - Accounting export

#### Modern UX Patterns

**Progressive Disclosure**:
- Basic info first (amount, category, date, vendor NPWP)
- Advanced options hidden (e-Faktur, withholding tax)
- Quick entry mode for repetitive expenses

**Mobile-First Design**:
- Large touch targets
- Camera integration for receipts
- Offline support with sync
- **QR code scanning** ← 🇮🇩 For e-Faktur

**Real-Time Collaboration**:
- Live status updates
- In-app notifications (bilingual)
- Comment threads
- Activity logs

#### Technical Best Practices

**API Design** (RESTful + Events):

```typescript
// Standard CRUD
GET    /api/v1/expenses              // List with filters
POST   /api/v1/expenses              // Create
GET    /api/v1/expenses/:id          // Detail
PATCH  /api/v1/expenses/:id          // Update
DELETE /api/v1/expenses/:id          // Delete

// Workflow Actions
POST   /api/v1/expenses/:id/submit   // Submit for approval
POST   /api/v1/expenses/:id/approve  // Approve
POST   /api/v1/expenses/:id/reject   // Reject
POST   /api/v1/expenses/:id/mark-paid // Mark as paid

// 🇮🇩 Indonesian-Specific Endpoints
POST   /api/v1/expenses/:id/validate-efaktur // Validate e-Faktur
GET    /api/v1/expenses/:id/bukti-pengeluaran // Download Bukti Pengeluaran PDF
GET    /api/v1/expenses/reports/ppn           // PPN monthly report
GET    /api/v1/expenses/reports/pph           // PPh withholding report
GET    /api/v1/expenses/reports/income-statement // Multi-step PSAK format

// Statistics
GET    /api/v1/expenses/stats        // Statistics
GET    /api/v1/expenses/export       // Export data
```

**State Management**:
- TanStack Query for server state
- Optimistic updates for better UX
- Infinite scroll for large lists
- Real-time subscriptions (optional)

**Performance**:
- Lazy load images (receipts)
- Virtual scrolling for lists
- Debounced search
- Cached analytics

---

## Indonesian Compliance Requirements

### Indonesian Accounting Standards (PSAK)

#### Four-Tier Framework

Indonesia uses a **four-tier accounting standards framework**:

| Tier | Standard | Target Audience | Relevance to Monomi |
|------|----------|----------------|---------------------|
| **1** | PSAK (Full IFRS) | Listed companies | 🟡 Growing clients |
| **2** | SAK EP (Private Entity) | Private companies | 🟢 **PRIMARY TARGET** |
| **3** | PSAK Syariah | Islamic finance | 🔴 Not applicable |
| **4** | PSAK EMKM (SMEs) | Micro/small business | 🟡 Smallest clients |

**Implementation Strategy**: Support **Tier 2 (SAK EP)** as primary, with configuration option for **Tier 1 (PSAK)** and **Tier 4 (EMKM)**.

#### Chart of Accounts Structure

Indonesian businesses follow this account structure:

```
1-xxxx: Aset (Assets)
2-xxxx: Kewajiban (Liabilities)
3-xxxx: Ekuitas (Equity)
4-xxxx: Pendapatan (Revenue)
5-xxxx: Harga Pokok Penjualan (COGS)
6-xxxx: Beban Operasional (Operating Expenses) ← **EXPENSES MODULE**
  6-1xxx: Beban Penjualan (Selling Expenses)
  6-2xxx: Beban Administrasi & Umum (General & Administrative)
7-xxxx: Pendapatan Lain-Lain (Other Income)
8-xxxx: Beban Lain-Lain (Other Expenses)        ← **EXPENSES MODULE**
9-xxxx: Pajak Penghasilan (Income Tax)
```

### Indonesian Tax Requirements (2025)

#### PPN (Pajak Pertambahan Nilai) - Value Added Tax

**Critical Update**: As of **January 1, 2025**, PPN rate increased to **12%**

```typescript
// PPN Rate Configuration
const PPN_RATES = {
  STANDARD: 0.12,           // 12% statutory rate
  EFFECTIVE: 0.11,          // 11% effective rate for non-luxury
  LUXURY: 0.12,             // 12% for luxury goods (no reduction)
  EXPORT: 0.00,             // 0% for exports
}

// Calculation
const calculatePPN = (grossAmount: number, isLuxury: boolean) => {
  if (isLuxury) {
    // Luxury goods: Full 12%
    return grossAmount * PPN_RATES.LUXURY
  }
  // Non-luxury: DPP × 11/12 × 12% = DPP × 11%
  return grossAmount * PPN_RATES.EFFECTIVE
}

// Example:
// Gross Amount: Rp 10,000,000
// PPN (non-luxury): Rp 10,000,000 × 11% = Rp 1,100,000
// Total: Rp 11,100,000
```

**PPN Categories**:

```typescript
enum PPNCategory {
  CREDITABLE = 'creditable',       // Can offset against output VAT
  NON_CREDITABLE = 'non_creditable', // Cannot be credited
  EXEMPT = 'exempt',                 // VAT-exempt goods/services
  ZERO_RATED = 'zero_rated',         // 0% VAT (exports)
}
```

**Reporting Requirements**:
- **Monthly VAT returns** due by 20th of following month
- **Input VAT (PPN Masukan)**: VAT paid on purchases/expenses
- **Output VAT (PPN Keluaran)**: VAT collected on sales
- **Net VAT**: Output VAT - Input VAT = Amount to pay/refund

#### PPh (Pajak Penghasilan) - Withholding Tax

Many business expenses require **withholding tax** (pemotongan PPh):

```typescript
enum WithholdingTaxType {
  PPH23 = 'PPh23',       // Services (2% or 15%)
  PPH4_2 = 'PPh4_2',     // Final tax on specific income
  PPH15 = 'PPh15',       // Specific business activities
  NONE = 'none',
}

// Common Withholding Tax Rates
const WITHHOLDING_TAX_RATES = {
  // PPh Pasal 23
  RENTAL: 0.02,              // 2% for rental services
  CONSULTING: 0.02,          // 2% for consulting services
  TECHNICAL_SERVICES: 0.02,  // 2% for technical services
  INTEREST: 0.15,            // 15% for interest
  DIVIDENDS: 0.15,           // 15% for dividends
  ROYALTY: 0.15,             // 15% for royalty

  // PPh Pasal 4(2)
  LAND_BUILDING_RENT: 0.10,  // 10% for land/building rental
  CONSTRUCTION: 0.02,         // 2% for construction (varies)
}
```

**Example Calculation**:

```
Service Fee (Consulting):     Rp 10,000,000
PPN 11%:                      Rp  1,100,000
                             ──────────────
Gross Amount:                 Rp 11,100,000
PPh 23 Withholding (2%):      Rp    200,000 (on base amount)
                             ──────────────
Net Payment to Vendor:        Rp 10,900,000
```

#### E-Faktur Pajak (Electronic Tax Invoice)

**CRITICAL**: All expense receipts must be **valid e-Faktur** invoices.

**Mandatory Elements**:

```typescript
interface EFaktur {
  // Header
  nsfp: string                    // Nomor Seri Faktur Pajak: 010.123-25.12345678
  qrCode: string                  // QR code for validation
  approvalCode: string            // DGT approval code

  // Seller (PKP - Pengusaha Kena Pajak)
  sellerNpwp: string              // Tax ID: 01.234.567.8-901.000
  sellerName: string
  sellerAddress: string

  // Buyer (Your Company)
  buyerNpwp: string
  buyerName: string
  buyerAddress: string

  // Transaction
  dpp: number                     // Dasar Pengenaan Pajak (base amount)
  ppnRate: number                 // 11% or 12%
  ppnAmount: number               // PPN amount
  totalAmount: number             // DPP + PPN

  // Dates
  issueDate: Date
  transactionDate: Date

  // Validation
  status: 'VALID' | 'INVALID' | 'PENDING'
  validatedAt?: Date
}
```

**E-Faktur Format Example**:

```
┌─────────────────────────────────────────────────────────┐
│                   FAKTUR PAJAK                          │
│              (TAX INVOICE - e-FAKTUR)                   │
│                                                         │
│  NSFP: 010.123-25.12345678                             │
│  Tanggal: 15 Oktober 2025                              │
└─────────────────────────────────────────────────────────┘

PENJUAL (Seller):
PT. ABC Indonesia
NPWP: 01.234.567.8-901.000
Alamat: Jl. Sudirman No. 123, Jakarta

PEMBELI (Buyer):
PT. Monomi Technology
NPWP: 02.345.678.9-012.000
Alamat: Jl. Thamrin No. 456, Jakarta

RINCIAN (Details):
┌────────────────────────────────┬──────────────┐
│ DPP (Base Amount)              │ Rp 10.000.000│
│ PPN 11%                        │ Rp  1.100.000│
├────────────────────────────────┼──────────────┤
│ JUMLAH (Total)                 │ Rp 11.100.000│
└────────────────────────────────┴──────────────┘

[QR CODE]                  [Digital Signature]
```

### Bukti Pengeluaran (Proof of Expenditure)

Indonesian businesses use standardized **Bukti Pengeluaran** (BKK/BKK) forms:

```typescript
interface BuktiPengeluaran {
  // Header
  nomorBukti: string              // BKK-2025-0001
  tanggal: Date                   // Date

  // Vendor Information
  dibayarKepada: string           // Paid to (vendor name)
  npwpPenerima?: string           // Vendor NPWP
  alamatPenerima: string          // Vendor address

  // Transaction Details
  uraian: string                  // Description (Indonesian)
  kodeAkun: string                // Account code: 6-2050
  proyekId?: string               // Project (optional)

  // Amount Breakdown
  jumlahBruto: number             // Gross amount
  ppn: number                     // PPN amount
  pph?: number                    // PPh withholding
  jumlahBersih: number            // Net payment

  // Tax Invoice Reference
  nomorFakturPajak?: string       // e-Faktur NSFP
  tanggalFakturPajak?: Date

  // Payment Method
  metodePembayaran: string        // BANK_TRANSFER, CASH, etc.
  nomorReferensi?: string         // Bank transfer ref

  // Approval
  disetujuiOleh: string          // Approved by
  tanggalPersetujuan: Date
}
```

---

## Feature Requirements

### Functional Requirements

#### FR1: Indonesian-Compliant Expense CRUD

- **FR1.1**: Create expense with Indonesian fields (vendor NPWP, account code, e-Faktur NSFP)
- **FR1.2**: Upload e-Faktur receipt (PDF/image) with QR code
- **FR1.3**: Auto-calculate PPN at 12% (11% effective for non-luxury)
- **FR1.4**: Auto-calculate withholding tax based on expense category
- **FR1.5**: Generate Bukti Pengeluaran number (BKK-YYYY-NNNN)
- **FR1.6**: Validate account code against PSAK chart of accounts
- **FR1.7**: Support bilingual descriptions (Indonesian + English)
- **FR1.8**: Edit expense (only in DRAFT status)
- **FR1.9**: Delete draft expenses
- **FR1.10**: Duplicate expenses for quick entry

#### FR2: PSAK-Compliant Expense Categorization

- **FR2.1**: PSAK chart of accounts (6-1xxx, 6-2xxx, 8-xxxx)
- **FR2.2**: Expense classification:
  - Beban Penjualan (Selling Expenses - 6-1xxx)
  - Beban Administrasi & Umum (General & Admin - 6-2xxx)
  - Beban Lain-Lain (Other Expenses - 8-xxxx)
- **FR2.3**: Account code + Indonesian name mapping
- **FR2.4**: Tag expenses with custom labels
- **FR2.5**: Mark tax-deductible status (default: true for business expenses)

#### FR3: E-Faktur Integration

- **FR3.1**: Upload e-Faktur receipt (PDF/image)
- **FR3.2**: Extract NSFP from receipt (manual or OCR)
- **FR3.3**: Extract vendor NPWP
- **FR3.4**: Validate e-Faktur format (NSFP pattern)
- **FR3.5**: Store QR code data
- **FR3.6**: Track validation status (PENDING, VALID, INVALID)
- **FR3.7**: Link to Document model for receipt storage
- **FR3.8**: (Future) Real-time DGT API validation

#### FR4: Indonesian Tax Calculations

- **FR4.1**: Calculate PPN at 12% (11% effective for non-luxury)
- **FR4.2**: Identify luxury goods for 12% rate
- **FR4.3**: Calculate withholding tax (PPh 23, 4(2), 15)
- **FR4.4**: Compute net payment: Gross + PPN - PPh
- **FR4.5**: Track creditable vs. non-creditable VAT
- **FR4.6**: Generate Bukti Potong (withholding evidence) number

#### FR5: Project & Client Association

- **FR5.1**: Link expense to project (optional)
- **FR5.2**: Link expense to client (optional)
- **FR5.3**: Mark expense as billable/non-billable
- **FR5.4**: Convert billable expenses to invoice line items
- **FR5.5**: View project expense totals
- **FR5.6**: Calculate project profitability (Revenue - Expenses)

#### FR6: Approval Workflow

- **FR6.1**: Submit expense for approval
- **FR6.2**: Multi-level approval (submitter → manager → finance)
- **FR6.3**: Approve/reject with comments (bilingual)
- **FR6.4**: Email notifications (Indonesian + English)
- **FR6.5**: Bulk approval for multiple expenses
- **FR6.6**: Approval policy rules (amount thresholds)
- **FR6.7**: Validate e-Faktur before approval

#### FR7: Payment & Reimbursement

- **FR7.1**: Track payment status (UNPAID/PENDING/PAID)
- **FR7.2**: Record payment date and method
- **FR7.3**: Link to Payment model for reimbursements
- **FR7.4**: Generate reimbursement reports
- **FR7.5**: Payment summary by user
- **FR7.6**: Track bank transfer references

#### FR8: Indonesian Reporting & Analytics

- **FR8.1**: Expense dashboard with key metrics
- **FR8.2**: Expense by PSAK category report
- **FR8.3**: Expense by project/client report
- **FR8.4**: Monthly expense trends
- **FR8.5**: **PPN Monthly Report (SPT Masa PPN)**
  - Input VAT by vendor
  - Input VAT by category
  - Creditable vs. non-creditable
  - Export to Excel (Indonesian format)
- **FR8.6**: **PPh Withholding Report**
  - PPh 23 summary
  - PPh 4(2) summary
  - Bukti Potong listing
  - Export to Excel
- **FR8.7**: **Multi-Step Income Statement (PSAK format)**
  - Operating vs. non-operating expenses
  - Indonesian terminology
  - Export to PDF/Excel
- **FR8.8**: Budget tracking and alerts
- **FR8.9**: Indonesian tax reports ready for DGT submission

#### FR9: Search & Filtering

- **FR9.1**: Search by description, vendor, NSFP, account code
- **FR9.2**: Filter by date range
- **FR9.3**: Filter by status (DRAFT, SUBMITTED, APPROVED, REJECTED, PAID)
- **FR9.4**: Filter by project/client
- **FR9.5**: Filter by submitter/approver
- **FR9.6**: Filter by expense class (SELLING, GENERAL_ADMIN, OTHER)
- **FR9.7**: Filter by account code
- **FR9.8**: Saved filter presets

### Non-Functional Requirements

#### NFR1: Performance
- Page load time < 2 seconds
- Receipt upload < 5 seconds
- Support 10,000+ expense records
- Real-time search results
- OCR processing < 10 seconds

#### NFR2: Security
- Role-based access control (RBAC)
- Users can only see their own expenses
- Managers can see team expenses
- Admins can see all expenses
- Encrypted file storage for receipts
- Audit trail for all changes
- **10-year archival** (Indonesian requirement)

#### NFR3: Usability
- Mobile-responsive design
- Keyboard shortcuts
- Accessibility (WCAG 2.1 AA)
- **Indonesian language primary**
- English language secondary
- Currency in IDR
- Indonesian date format (DD/MM/YYYY)

#### NFR4: Reliability
- Data validation on client and server
- Graceful error handling
- Auto-save drafts
- Backup and recovery
- 99.9% uptime target

#### NFR5: Indonesian Compliance
- PSAK chart of accounts validation
- PPN rate updates (12% as of 2025)
- E-Faktur format validation
- Withholding tax accuracy
- Bukti Pengeluaran format compliance
- Monthly reporting deadlines

---

## Database Schema Design

### Complete Indonesian-Compliant Expense Model

```prisma
// ============================================
// EXPENSE MANAGEMENT MODELS
// ============================================

model Expense {
  id              String        @id @default(cuid())
  expenseNumber   String        @unique // EXP-2025-0001

  // ===== INDONESIAN COMPLIANCE FIELDS =====

  // Bukti Pengeluaran Number
  buktiPengeluaranNumber String @unique // BKK-2025-0001

  // PSAK Chart of Accounts
  accountCode     String        // 6-1010, 6-2050, 8-1010
  accountName     String        // Indonesian account name
  accountNameEn   String?       // English account name

  // Expense Classification (for Income Statement)
  expenseClass    ExpenseClass  // SELLING, GENERAL_ADMIN, OTHER

  // Bilingual Descriptions
  description     String        // Primary description
  descriptionId   String?       // Indonesian description (Uraian)
  descriptionEn   String?       // English description

  // ===== TAX COMPLIANCE FIELDS =====

  // PPN (VAT) - Indonesian 2025 Rates
  ppnRate         Decimal       @db.Decimal(5, 4) @default(0.1200) // 12% or 11%
  ppnAmount       Decimal       @db.Decimal(12, 2)
  ppnCategory     PPNCategory   @default(CREDITABLE)
  isLuxuryGoods   Boolean       @default(false) // For 12% vs 11% rate

  // E-Faktur Integration
  eFakturNSFP     String?       // Nomor Seri Faktur Pajak: 010.123-25.12345678
  eFakturQRCode   String?       @db.Text // QR Code data
  eFakturApprovalCode String?   // DGT approval code
  eFakturStatus   EFakturStatus @default(NOT_REQUIRED)
  eFakturValidatedAt DateTime?

  // Withholding Tax (PPh)
  withholdingTaxType   WithholdingTaxType? // PPH23, PPH4_2, PPH15
  withholdingTaxRate   Decimal?  @db.Decimal(5, 4) // 0.02, 0.15, etc.
  withholdingTaxAmount Decimal?  @db.Decimal(12, 2)
  buktiPotongNumber    String?   // Withholding tax evidence number
  buktiPotongDate      DateTime?

  // ===== VENDOR INFORMATION (Indonesian Format) =====

  vendorName      String        // Nama Vendor
  vendorNPWP      String?       // NPWP (Tax ID): 01.234.567.8-901.000
  vendorAddress   String?       // Alamat
  vendorPhone     String?
  vendorBank      String?       // Bank name
  vendorAccountNo String?       // Bank account number
  vendorAccountName String?     // Account holder name

  // ===== AMOUNT BREAKDOWN (Indonesian Tax Format) =====

  grossAmount     Decimal       @db.Decimal(12, 2) // Jumlah Bruto (before PPN)
  ppnAmount       Decimal       @db.Decimal(12, 2) // PPN amount
  withholdingAmount Decimal?    @db.Decimal(12, 2) // PPh withheld
  netAmount       Decimal       @db.Decimal(12, 2) // Net payment (Jumlah Bersih)
  totalAmount     Decimal       @db.Decimal(12, 2) // Gross + PPN (for display)

  // ===== STANDARD FIELDS =====

  expenseDate     DateTime      // Tanggal Pengeluaran
  currency        String        @default("IDR")

  // Categorization
  categoryId      String
  category        ExpenseCategory @relation(fields: [categoryId], references: [id])
  tags            String[]      // Custom tags
  isTaxDeductible Boolean       @default(true) // Most business expenses are

  // Relationships
  userId          String        // Expense submitter
  user            User          @relation(fields: [userId], references: [id])

  projectId       String?
  project         Project?      @relation(fields: [projectId], references: [id])

  clientId        String?
  client          Client?       @relation(fields: [clientId], references: [id])

  // Billable Tracking
  isBillable      Boolean       @default(false)
  billableAmount  Decimal?      @db.Decimal(12, 2)
  invoiceId       String?       // If converted to invoice item
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id])

  // Approval Workflow
  status          ExpenseStatus @default(DRAFT)
  submittedAt     DateTime?
  approvedAt      DateTime?
  approvedBy      String?
  approver        User?         @relation("ExpenseApprover", fields: [approvedBy], references: [id])
  rejectedAt      DateTime?
  rejectionReason String?       @db.Text

  // Payment Tracking
  paymentStatus   ExpensePaymentStatus @default(UNPAID)
  paidAt          DateTime?
  paymentMethod   String?       // BANK_TRANSFER, CASH, etc.
  paymentReference String?      // Bank transfer reference
  paymentId       String?
  payment         Payment?      @relation(fields: [paymentId], references: [id])

  // Notes
  notes           String?       @db.Text
  notesId         String?       @db.Text // Indonesian notes
  notesEn         String?       @db.Text // English notes
  receiptNumber   String?       // Merchant receipt number
  merchantName    String?       // Merchant name (if different from vendor)
  location        String?       // Location of expense

  // Documents (Receipts, E-Faktur, Supporting Docs)
  documents       Document[]

  // Audit Trail
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  createdBy       String?
  updatedBy       String?

  // Relations
  approvalHistory ExpenseApprovalHistory[]
  comments        ExpenseComment[]

  // Indexes for Performance
  @@index([expenseNumber])
  @@index([buktiPengeluaranNumber])
  @@index([accountCode])
  @@index([expenseClass])
  @@index([status])
  @@index([userId])
  @@index([projectId])
  @@index([clientId])
  @@index([categoryId])
  @@index([expenseDate])
  @@index([eFakturNSFP])
  @@index([ppnCategory])
  @@index([status, userId])
  @@index([projectId, status])
  @@index([paymentStatus])
  @@index([createdAt])

  @@map("expenses")
}

// ============================================
// EXPENSE CATEGORY (PSAK-Aligned)
// ============================================

model ExpenseCategory {
  id          String    @id @default(cuid())
  code        String    @unique // OFFICE_RENT, ADVERTISING, etc.

  // PSAK Account Code
  accountCode String    // 6-1010, 6-2050, 8-1010
  expenseClass ExpenseClass // SELLING, GENERAL_ADMIN, OTHER

  // Bilingual Names
  name        String    // English name
  nameId      String    // Indonesian name (e.g., "Sewa Kantor")
  description String?   // English description
  descriptionId String? // Indonesian description

  // Hierarchy Support
  parentId    String?
  parent      ExpenseCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ExpenseCategory[] @relation("CategoryHierarchy")

  // Tax Configuration
  defaultPPNRate Decimal @db.Decimal(5, 4) @default(0.1200) // 12%
  isLuxuryGoods  Boolean @default(false)
  withholdingTaxType WithholdingTaxType? @default(NONE)
  withholdingTaxRate Decimal? @db.Decimal(5, 4)

  // UI Settings
  icon        String?   // Icon name for UI
  color       String    @default("#1890ff") // Display color

  // Business Rules
  isActive    Boolean   @default(true)
  isBillable  Boolean   @default(false) // Default billable setting
  requiresReceipt Boolean @default(true)
  requiresEFaktur Boolean @default(true) // Require e-Faktur validation
  approvalRequired Boolean @default(true)
  sortOrder   Int       @default(0)

  // Relations
  expenses    Expense[]
  budgets     ExpenseBudget[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([code])
  @@index([accountCode])
  @@index([expenseClass])
  @@index([parentId])
  @@index([isActive])

  @@map("expense_categories")
}

// ============================================
// APPROVAL HISTORY
// ============================================

model ExpenseApprovalHistory {
  id          String    @id @default(cuid())
  expenseId   String
  expense     Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  action      ExpenseApprovalAction // SUBMITTED, APPROVED, REJECTED, RECALLED
  actionBy    String
  user        User      @relation(fields: [actionBy], references: [id])

  previousStatus ExpenseStatus
  newStatus      ExpenseStatus

  comments    String?   @db.Text
  commentsId  String?   @db.Text // Indonesian comments
  commentsEn  String?   @db.Text // English comments

  actionDate  DateTime  @default(now())

  @@index([expenseId])
  @@index([actionBy])
  @@index([actionDate])

  @@map("expense_approval_history")
}

// ============================================
// COMMENTS
// ============================================

model ExpenseComment {
  id          String    @id @default(cuid())
  expenseId   String
  expense     Expense   @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  userId      String
  user        User      @relation(fields: [userId], references: [id])

  comment     String    @db.Text
  commentId   String?   @db.Text // Indonesian comment
  commentEn   String?   @db.Text // English comment

  isInternal  Boolean   @default(false) // Internal notes vs public comments

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([expenseId])
  @@index([userId])
  @@index([createdAt])

  @@map("expense_comments")
}

// ============================================
// BUDGET TRACKING
// ============================================

model ExpenseBudget {
  id          String    @id @default(cuid())
  name        String
  nameId      String?   // Indonesian name
  description String?
  descriptionId String? // Indonesian description

  // Budget Scope
  categoryId  String?
  category    ExpenseCategory? @relation(fields: [categoryId], references: [id])

  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id])

  userId      String?   // User-specific budget
  user        User?     @relation(fields: [userId], references: [id])

  // Budget Amounts
  amount      Decimal   @db.Decimal(12, 2)
  period      BudgetPeriod // MONTHLY, QUARTERLY, YEARLY, CUSTOM
  startDate   DateTime
  endDate     DateTime

  // Tracking
  spent       Decimal   @db.Decimal(12, 2) @default(0)
  remaining   Decimal   @db.Decimal(12, 2)

  // Alerts
  alertThreshold Int    @default(80) // Alert at 80% spent
  alertSent      Boolean @default(false)

  isActive    Boolean   @default(true)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([categoryId])
  @@index([projectId])
  @@index([userId])
  @@index([startDate, endDate])
  @@index([isActive])

  @@map("expense_budgets")
}

// ============================================
// ENUMS
// ============================================

enum ExpenseStatus {
  DRAFT           // Being created
  SUBMITTED       // Submitted for approval
  APPROVED        // Approved by manager
  REJECTED        // Rejected
  PAID            // Reimbursement paid
  CANCELLED       // Cancelled by submitter
}

enum ExpensePaymentStatus {
  UNPAID          // Not yet paid
  PENDING         // Payment in progress
  PAID            // Payment completed
  PARTIAL         // Partially paid
}

enum ExpenseApprovalAction {
  SUBMITTED
  APPROVED
  REJECTED
  RECALLED        // Submitter withdrew submission
  PAYMENT_REQUESTED
  PAYMENT_COMPLETED
}

enum BudgetPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
  CUSTOM
}

// ===== INDONESIAN COMPLIANCE ENUMS =====

enum ExpenseClass {
  SELLING           // Beban Penjualan (6-1xxx)
  GENERAL_ADMIN     // Beban Administrasi & Umum (6-2xxx)
  OTHER             // Beban Lain-Lain (8-xxxx)
}

enum PPNCategory {
  CREDITABLE        // PPN Masukan (can credit against output VAT)
  NON_CREDITABLE    // Cannot be credited
  EXEMPT            // VAT-exempt
  ZERO_RATED        // 0% VAT (exports)
}

enum EFakturStatus {
  NOT_REQUIRED      // Not required for this expense
  PENDING           // Awaiting e-Faktur upload
  UPLOADED          // Uploaded, awaiting validation
  VALID             // Validated by DGT
  INVALID           // Invalid e-Faktur
  EXPIRED           // e-Faktur expired
}

enum WithholdingTaxType {
  PPH23             // PPh Pasal 23 (services)
  PPH4_2            // PPh Pasal 4(2) (final)
  PPH15             // PPh Pasal 15 (specific activities)
  NONE              // No withholding tax
}

// ============================================
// UPDATE EXISTING MODELS
// ============================================

// Add to User model:
// expenses            Expense[]
// approvedExpenses    Expense[]              @relation("ExpenseApprover")
// expenseApprovals    ExpenseApprovalHistory[]
// expenseComments     ExpenseComment[]
// expenseBudgets      ExpenseBudget[]

// Add to Project model:
// expenses            Expense[]
// expenseBudgets      ExpenseBudget[]

// Add to Client model:
// expenses            Expense[]

// Add to Invoice model:
// expenses            Expense[]  // Billable expenses converted to invoice items

// Add to Payment model:
// expenses            Expense[]  // Reimbursement payments

// Add to Document model:
// expenseId   String?
// expense     Expense?   @relation(fields: [expenseId], references: [id], onDelete: Cascade)
```

### Indonesian Expense Categories (PSAK-Compliant)

```typescript
// backend/prisma/seed-data/indonesian-expense-categories.ts

export const INDONESIAN_EXPENSE_CATEGORIES = [
  // ===== BEBAN PENJUALAN (Selling Expenses) - 6-1xxx =====
  {
    accountCode: '6-1010',
    code: 'SELLING_SALARIES',
    name: 'Sales Salaries',
    nameId: 'Gaji Penjualan',
    descriptionId: 'Gaji dan tunjangan karyawan penjualan',
    expenseClass: 'SELLING',
    icon: 'user',
    color: '#1890ff',
    defaultPPNRate: 0.00, // Salaries not subject to PPN
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
  {
    accountCode: '6-1020',
    code: 'SALES_COMMISSION',
    name: 'Sales Commission',
    nameId: 'Komisi Penjualan',
    descriptionId: 'Komisi untuk tenaga penjual',
    expenseClass: 'SELLING',
    icon: 'trophy',
    color: '#52c41a',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02, // 2%
  },
  {
    accountCode: '6-1030',
    code: 'ADVERTISING',
    name: 'Advertising & Promotion',
    nameId: 'Iklan dan Promosi',
    descriptionId: 'Biaya iklan, promosi, dan marketing',
    expenseClass: 'SELLING',
    icon: 'sound',
    color: '#fa8c16',
    isBillable: true,
  },
  {
    accountCode: '6-1040',
    code: 'SALES_TRANSPORTATION',
    name: 'Sales Transportation',
    nameId: 'Transportasi Penjualan',
    descriptionId: 'Biaya transportasi aktivitas penjualan',
    expenseClass: 'SELLING',
    icon: 'car',
    color: '#13c2c2',
  },
  {
    accountCode: '6-1050',
    code: 'DELIVERY_COSTS',
    name: 'Delivery Costs',
    nameId: 'Biaya Kirim',
    descriptionId: 'Biaya pengiriman barang ke pelanggan',
    expenseClass: 'SELLING',
    icon: 'shopping',
    color: '#2f54eb',
  },
  {
    accountCode: '6-1060',
    code: 'EXHIBITIONS',
    name: 'Exhibitions & Events',
    nameId: 'Pameran dan Event',
    descriptionId: 'Biaya pameran, event, dan roadshow',
    expenseClass: 'SELLING',
    icon: 'calendar',
    color: '#722ed1',
    isBillable: true,
  },
  {
    accountCode: '6-1070',
    code: 'DIGITAL_MARKETING',
    name: 'Digital Marketing',
    nameId: 'Marketing Digital',
    descriptionId: 'Biaya marketing online (Google Ads, Facebook Ads, dll)',
    expenseClass: 'SELLING',
    icon: 'global',
    color: '#eb2f96',
    isBillable: true,
  },
  {
    accountCode: '6-1080',
    code: 'CLIENT_ENTERTAINMENT',
    name: 'Client Entertainment',
    nameId: 'Entertainment Klien',
    descriptionId: 'Biaya jamuan klien dan hubungan pelanggan',
    expenseClass: 'SELLING',
    icon: 'coffee',
    color: '#faad14',
    isTaxDeductible: false, // Limited deductibility for entertainment
  },

  // ===== BEBAN ADMINISTRASI & UMUM (General & Admin) - 6-2xxx =====
  {
    accountCode: '6-2010',
    code: 'EMPLOYEE_SALARIES',
    name: 'Employee Salaries',
    nameId: 'Gaji Karyawan',
    descriptionId: 'Gaji dan tunjangan karyawan non-penjualan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'team',
    color: '#1890ff',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2020',
    code: 'OFFICE_RENT',
    name: 'Office Rent',
    nameId: 'Sewa Kantor',
    descriptionId: 'Biaya sewa gedung/ruang kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'home',
    color: '#52c41a',
    withholdingTaxType: 'PPH4_2',
    withholdingTaxRate: 0.10, // 10% for building rental (PPh Final)
  },
  {
    accountCode: '6-2030',
    code: 'UTILITIES',
    name: 'Electricity & Water',
    nameId: 'Listrik dan Air',
    descriptionId: 'Biaya listrik, air, dan utilitas kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'bulb',
    color: '#faad14',
  },
  {
    accountCode: '6-2040',
    code: 'TELECOMMUNICATIONS',
    name: 'Phone & Internet',
    nameId: 'Telepon dan Internet',
    descriptionId: 'Biaya telepon, internet, dan komunikasi',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'phone',
    color: '#13c2c2',
  },
  {
    accountCode: '6-2050',
    code: 'OFFICE_SUPPLIES',
    name: 'Office Supplies',
    nameId: 'Perlengkapan Kantor',
    descriptionId: 'Biaya alat tulis dan perlengkapan kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'file',
    color: '#2f54eb',
  },
  {
    accountCode: '6-2060',
    code: 'OFFICE_MAINTENANCE',
    name: 'Office Maintenance',
    nameId: 'Pemeliharaan Kantor',
    descriptionId: 'Biaya perawatan dan perbaikan kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'tool',
    color: '#722ed1',
  },
  {
    accountCode: '6-2070',
    code: 'PROFESSIONAL_SERVICES',
    name: 'Professional Services',
    nameId: 'Jasa Profesional',
    descriptionId: 'Biaya jasa profesional (akuntan, auditor, dll)',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'solution',
    color: '#eb2f96',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02, // 2%
    isBillable: true,
  },
  {
    accountCode: '6-2080',
    code: 'INSURANCE',
    name: 'Insurance',
    nameId: 'Asuransi',
    descriptionId: 'Biaya premi asuransi',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'safety',
    color: '#fa541c',
  },
  {
    accountCode: '6-2090',
    code: 'TAXES_LEVIES',
    name: 'Taxes & Levies',
    nameId: 'Pajak dan Retribusi',
    descriptionId: 'Biaya pajak dan retribusi (PBB, PKB, dll)',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'bank',
    color: '#a0d911',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2100',
    code: 'DEPRECIATION',
    name: 'Asset Depreciation',
    nameId: 'Penyusutan Aset',
    descriptionId: 'Biaya penyusutan aset tetap',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'fall',
    color: '#8c8c8c',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
    requiresReceipt: false, // Non-cash expense
  },
  {
    accountCode: '6-2110',
    code: 'BUSINESS_TRAVEL',
    name: 'Business Travel',
    nameId: 'Perjalanan Dinas',
    descriptionId: 'Biaya perjalanan dinas karyawan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'car',
    color: '#13c2c2',
  },
  {
    accountCode: '6-2120',
    code: 'TRAINING',
    name: 'Training & Development',
    nameId: 'Pelatihan dan Pengembangan',
    descriptionId: 'Biaya pelatihan dan pengembangan SDM',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'read',
    color: '#722ed1',
  },
  {
    accountCode: '6-2130',
    code: 'SOFTWARE',
    name: 'Software & Licenses',
    nameId: 'Software dan Lisensi',
    descriptionId: 'Biaya software, SaaS, dan lisensi',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'cloud',
    color: '#2f54eb',
  },
  {
    accountCode: '6-2140',
    code: 'CONSULTING',
    name: 'Consulting Services',
    nameId: 'Jasa Konsultan',
    descriptionId: 'Biaya jasa konsultan bisnis',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'solution',
    color: '#1890ff',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02, // 2%
    isBillable: true,
  },
  {
    accountCode: '6-2150',
    code: 'LEGAL',
    name: 'Legal & Notary',
    nameId: 'Legal dan Notaris',
    descriptionId: 'Biaya jasa hukum dan notaris',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'audit',
    color: '#52c41a',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02, // 2%
  },
  {
    accountCode: '6-2160',
    code: 'BANK_CHARGES',
    name: 'Bank Charges',
    nameId: 'Biaya Bank',
    descriptionId: 'Biaya administrasi dan layanan bank',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'transaction',
    color: '#faad14',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2170',
    code: 'ENTERTAINMENT',
    name: 'Entertainment',
    nameId: 'Entertainment',
    descriptionId: 'Biaya entertainment dan jamuan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'gift',
    color: '#fa541c',
    isTaxDeductible: false, // Limited deductibility
  },
  {
    accountCode: '6-2180',
    code: 'DONATIONS',
    name: 'Donations',
    nameId: 'Donasi',
    descriptionId: 'Biaya donasi dan sumbangan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'heart',
    color: '#eb2f96',
    isTaxDeductible: false, // Usually not deductible
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2190',
    code: 'MISCELLANEOUS',
    name: 'Miscellaneous',
    nameId: 'Lain-Lain',
    descriptionId: 'Biaya lain-lain',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'more',
    color: '#8c8c8c',
  },

  // ===== BEBAN LAIN-LAIN (Other Expenses) - 8-xxxx =====
  {
    accountCode: '8-1010',
    code: 'INTEREST_EXPENSE',
    name: 'Interest Expense',
    nameId: 'Beban Bunga',
    descriptionId: 'Beban bunga pinjaman',
    expenseClass: 'OTHER',
    icon: 'dollar',
    color: '#ff4d4f',
    defaultPPNRate: 0.00, // Interest not subject to PPN
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.15, // 15% for interest
    requiresEFaktur: false,
  },
  {
    accountCode: '8-1020',
    code: 'FOREX_LOSS',
    name: 'Foreign Exchange Loss',
    nameId: 'Rugi Selisih Kurs',
    descriptionId: 'Kerugian selisih kurs mata uang asing',
    expenseClass: 'OTHER',
    icon: 'swap',
    color: '#faad14',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
    requiresReceipt: false, // Non-cash expense
  },
  {
    accountCode: '8-1030',
    code: 'ASSET_DISPOSAL_LOSS',
    name: 'Loss on Asset Disposal',
    nameId: 'Rugi Penjualan Aset',
    descriptionId: 'Kerugian penjualan aset tetap',
    expenseClass: 'OTHER',
    icon: 'minus-circle',
    color: '#ff7a45',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
  {
    accountCode: '8-1040',
    code: 'FINES_PENALTIES',
    name: 'Fines & Penalties',
    nameId: 'Denda dan Penalti',
    descriptionId: 'Biaya denda dan penalti',
    expenseClass: 'OTHER',
    icon: 'warning',
    color: '#fa541c',
    isTaxDeductible: false, // Not tax deductible
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
  {
    accountCode: '8-1050',
    code: 'EXTRAORDINARY_LOSSES',
    name: 'Extraordinary Losses',
    nameId: 'Kerugian Luar Biasa',
    descriptionId: 'Kerugian luar biasa (force majeure, bencana, dll)',
    expenseClass: 'OTHER',
    icon: 'thunderbolt',
    color: '#ff4d4f',
    defaultPPNRate: 0.00,
    withholdingTaxType: 'NONE',
    requiresEFaktur: false,
  },
]
```

---

*This document continues in the next section with Backend API Design, Frontend Implementation, Integration Points, Implementation Phases (14-16 weeks), Testing Strategy, Security, Performance, and Indonesian Tax Reporting.*

**Total length**: ~10,000+ lines when complete.

Would you like me to continue with the remaining sections?
