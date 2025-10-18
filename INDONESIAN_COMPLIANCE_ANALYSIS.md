# Indonesian Financial Reporting Compliance Analysis

**Project:** Invoice Generator - Expense Management Module
**Document:** Indonesian Standards Compliance Review
**Date:** 2025-10-16
**Status:** Critical Compliance Requirements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Indonesian Accounting Standards Overview](#indonesian-accounting-standards-overview)
3. [Critical Compliance Gaps](#critical-compliance-gaps)
4. [Indonesian Tax Requirements](#indonesian-tax-requirements)
5. [Financial Statement Format Requirements](#financial-statement-format-requirements)
6. [Expense Documentation Standards](#expense-documentation-standards)
7. [Revised Database Schema](#revised-database-schema)
8. [Revised Expense Categories](#revised-expense-categories)
9. [E-Faktur Integration Requirements](#e-faktur-integration-requirements)
10. [Revised Implementation Plan](#revised-implementation-plan)

---

## Executive Summary

### Critical Findings

After researching Indonesian financial reporting standards (PSAK), tax regulations, and expense documentation requirements for 2025, we have identified **several critical compliance gaps** in the original expense management plan that must be addressed.

### Key Indonesian Requirements

1. **PSAK Compliance**: All financial statements must follow PSAK (Pernyataan Standar Akuntansi Keuangan) based on IFRS
2. **PPN (VAT) 12%**: As of January 1, 2025, VAT increased to 12% (effective 11% for non-luxury goods)
3. **e-Faktur Pajak**: Mandatory electronic invoicing system with DGT validation and QR codes
4. **Language**: All records in Bahasa Indonesia (English optional for public companies)
5. **Currency**: IDR (Rupiah) only
6. **Archival**: 10-year retention requirement for tax invoices
7. **Monthly Reporting**: VAT returns due by 20th of following month

### Compliance Severity

🔴 **CRITICAL**: e-Faktur integration, PPN rate updates, PSAK chart of accounts
🟡 **HIGH**: Bilingual support, expense categorization, documentation requirements
🟢 **MEDIUM**: Report formats, Indonesian terminology, UI localization

---

## Indonesian Accounting Standards Overview

### Four-Tier Framework

Indonesia uses a four-tier accounting standards framework:

#### Tier 1: PSAK (Full IFRS Adoption)
- **Target**: Listed companies, companies with public accountability
- **Standard**: Full adoption of IFRS (converged as of 2015)
- **Updates**: Second phase convergence reducing IFRS gap from 3 years to 1 year
- **Requirement**: Complete IFRS compliance

#### Tier 2: SAK EP (Private Entity Standards)
- **Target**: Private entities without public accountability
- **Effective**: January 1, 2025 (replacing SAK ETAP)
- **Simplification**: Simplified IFRS for smaller entities
- **Adoption**: **Most relevant for Monomi's target market (SMEs)**

#### Tier 3: PSAK Syariah (Islamic Accounting)
- **Target**: Sharia-compliant financial institutions
- **Application**: Islamic banking and finance
- **Not applicable**: To general business expense management

#### Tier 4: PSAK EMKM (Micro, Small & Medium Enterprises)
- **Target**: Micro, small, and medium enterprises
- **Simplification**: Simplified accounting for smallest businesses
- **Potential**: May be relevant for smallest Monomi customers

### Recommended Approach for Monomi

**Support Multiple Tiers**:
- Primary focus: **Tier 2 (SAK EP)** - Most SME clients
- Secondary: **Tier 1 (PSAK)** - Growing businesses
- Optional: **Tier 4 (PSAK EMKM)** - Micro enterprises

Implementation: Configuration setting to select accounting standard tier.

---

## Critical Compliance Gaps

### Gap Analysis: Original Plan vs. Indonesian Requirements

| Requirement | Original Plan | Indonesian Requirement | Gap Severity | Impact |
|-------------|---------------|----------------------|--------------|--------|
| **VAT Rate** | Generic | 12% PPN (Jan 2025) | 🔴 CRITICAL | Tax calculation errors |
| **e-Faktur** | Not mentioned | Mandatory with QR code | 🔴 CRITICAL | Legal non-compliance |
| **NSFP Number** | Not included | Required for all receipts | 🔴 CRITICAL | Invalid expense docs |
| **Language** | English primary | Bahasa Indonesia required | 🟡 HIGH | Audit rejection |
| **Chart of Accounts** | Generic categories | PSAK-compliant structure | 🔴 CRITICAL | Report non-compliance |
| **Expense Format** | Generic | Bukti Pengeluaran format | 🟡 HIGH | Documentation issues |
| **Withholding Tax** | Not mentioned | Bukti Potong tracking | 🟡 HIGH | Tax filing errors |
| **Archival** | Not specified | 10-year requirement | 🟡 HIGH | Legal compliance |
| **Monthly Reporting** | Not integrated | PPN monthly reporting | 🟡 HIGH | Tax reporting gaps |
| **Income Statement** | Generic | Multi-step PSAK format | 🟡 HIGH | Financial report errors |

### Top 5 Critical Gaps to Address

#### 1. e-Faktur Pajak Integration (CRITICAL)

**Problem**: Original plan has no integration with Indonesia's mandatory e-Faktur system.

**Requirement**:
- All expense receipts must be validated e-Faktur invoices
- Must include NSFP (Nomor Seri Faktur Pajak) serial number
- Must have DGT-approved QR code
- Must be validated through e-Faktur system

**Solution Required**:
- Add e-Faktur validation API integration
- Add NSFP field to expense model
- Add QR code scanning/validation
- Add e-Faktur status tracking

#### 2. PPN (VAT) Rate 12% (CRITICAL)

**Problem**: Generic tax handling doesn't account for Indonesian PPN specifics.

**Requirement**:
- PPN rate is 12% as of January 1, 2025
- Effective rate is 11% for non-luxury goods (DPP × 11/12)
- Different rates for luxury goods vs. standard goods
- Input VAT (PPN Masukan) vs. Output VAT (PPN Keluaran) tracking

**Solution Required**:
- Configurable PPN rate (default 12%)
- Luxury goods flag for expense categories
- Effective rate calculation (11% vs 12%)
- Separate tracking for input/output VAT

#### 3. PSAK Chart of Accounts (CRITICAL)

**Problem**: Generic expense categories don't align with PSAK financial statement requirements.

**Requirement**:
- Expenses must be categorized according to PSAK standards
- Multi-step income statement requires operational vs. non-operational expenses
- Specific account codes for different expense types
- Alignment with Indonesian Tax Law classifications

**Solution Required**:
- Redesign expense categories to match PSAK structure
- Add account code field (e.g., 6-xxxx for expenses)
- Categorize as operational vs. non-operational
- Support for Indonesian expense terminology

#### 4. Bukti Pengeluaran Format (HIGH)

**Problem**: No specific format for Indonesian expense documentation.

**Requirement**:
- Standard "Bukti Pengeluaran" (Proof of Expenditure) format
- Must include specific fields required by Indonesian tax law
- Must be in Bahasa Indonesia
- Must be printer-friendly for physical records

**Solution Required**:
- Create Indonesian expense report template
- Bilingual support (Indonesian + English)
- PDF generation with proper Indonesian formatting
- Include all legally required fields

#### 5. Withholding Tax (Bukti Potong) Tracking (HIGH)

**Problem**: No handling of Indonesian withholding tax requirements.

**Requirement**:
- Many expenses require withholding tax (PPh Pasal 23, PPh Pasal 4(2), etc.)
- Must track and report Bukti Potong (withholding tax evidence)
- Different rates for different expense types
- Monthly reporting requirements

**Solution Required**:
- Add withholding tax fields to expense model
- Track Bukti Potong numbers
- Calculate withholding tax based on expense type
- Generate withholding tax reports

---

## Indonesian Tax Requirements

### PPN (Pajak Pertambahan Nilai) - Value Added Tax

#### Current Rates (2025)

```typescript
// PPN Rate Configuration
const PPN_RATES = {
  STANDARD: 0.12,           // 12% for most goods/services
  EFFECTIVE: 0.11,          // 11% effective rate (DPP × 11/12)
  LUXURY: 0.12,             // 12% for luxury goods (no reduction)
  EXPORT: 0.00,             // 0% for exports
}

// Calculation
const calculatePPN = (amount: number, isLuxury: boolean) => {
  if (isLuxury) {
    return amount * PPN_RATES.LUXURY
  }
  // For non-luxury: DPP × 11/12 × 12% = DPP × 11%
  return amount * PPN_RATES.EFFECTIVE
}
```

#### PPN Reporting Requirements

1. **Monthly Reporting**: VAT returns due by 20th of following month
2. **Input VAT (PPN Masukan)**: VAT paid on purchases/expenses
3. **Output VAT (PPN Keluaran)**: VAT collected on sales
4. **Creditable**: Input VAT can be credited against Output VAT
5. **Non-Creditable**: Some expenses (personal, non-business) have non-creditable VAT

#### PPN Categories for Expenses

```typescript
enum PPNCategory {
  CREDITABLE = 'creditable',       // Can be credited against output VAT
  NON_CREDITABLE = 'non_creditable', // Cannot be credited
  EXEMPT = 'exempt',                 // VAT-exempt goods/services
  ZERO_RATED = 'zero_rated',         // 0% VAT (exports)
}
```

### PPh (Pajak Penghasilan) - Income Tax / Withholding Tax

#### Withholding Tax Types

1. **PPh Pasal 21**: Withholding tax on salaries (not relevant for expenses)
2. **PPh Pasal 23**: Withholding tax on services (2% or 15%)
3. **PPh Pasal 4(2)**: Final withholding tax on specific income
4. **PPh Pasal 15**: Specific business activities

#### Applicable to Expenses

```typescript
interface WithholdingTax {
  type: 'PPh23' | 'PPh4_2' | 'PPh15'
  rate: number  // 0.02, 0.15, etc.
  description: string
}

// Example withholding tax rates
const WITHHOLDING_TAX_RATES = {
  // PPh Pasal 23
  RENTAL: 0.02,              // 2% for rental services
  CONSULTING: 0.02,          // 2% for consulting services
  TECHNICAL_SERVICES: 0.02,  // 2% for technical services
  INTEREST: 0.15,            // 15% for interest
  DIVIDENDS: 0.15,           // 15% for dividends
  ROYALTY: 0.15,             // 15% for royalty

  // PPh Pasal 4(2)
  CONSTRUCTION: 0.02,        // 2% for construction services (varies)
  LAND_BUILDING_RENT: 0.10,  // 10% for land/building rental
}
```

### Tax Invoice (Faktur Pajak) Requirements

#### Mandatory Elements

All expense receipts must be valid tax invoices containing:

1. **"Faktur Pajak"** title
2. **Serial Number (NSFP)**: Nomor Seri Faktur Pajak
3. **Seller Information**:
   - Name, address, NPWP (Tax ID)
   - PKP status (VAT-registered person)
4. **Buyer Information**:
   - Name, address, NPWP
5. **Transaction Details**:
   - Description of goods/services
   - Amount (DPP - Dasar Pengenaan Pajak)
   - PPN amount
   - Total amount including PPN
6. **Date and Place of Issue**
7. **QR Code** (for e-Faktur)
8. **Digital Signature** (for e-Faktur)

#### e-Faktur Specific Requirements

```typescript
interface EFakturData {
  nsfp: string                    // Serial number from DGT
  qrCode: string                  // QR code data
  approvalCode: string            // DGT approval code
  approvalDate: Date              // When DGT approved

  // Seller (PKP)
  sellerNpwp: string              // Tax ID
  sellerName: string
  sellerAddress: string

  // Buyer
  buyerNpwp: string
  buyerName: string
  buyerAddress: string

  // Transaction
  dpp: number                     // Dasar Pengenaan Pajak (base amount)
  ppnAmount: number               // PPN amount
  totalAmount: number             // DPP + PPN
  ppnRate: number                 // 11% or 12%

  // Validation
  validationStatus: 'valid' | 'invalid' | 'pending'
  validationDate?: Date
}
```

---

## Financial Statement Format Requirements

### Indonesian Income Statement (Laporan Laba Rugi)

#### PSAK Multi-Step Format

Indonesian companies must use the **multi-step format** for income statements, showing:

1. **Pendapatan (Revenue)**
2. **Beban Pokok Penjualan / HPP (Cost of Goods Sold)**
3. **Laba Kotor (Gross Profit)** = Revenue - COGS
4. **Beban Operasional (Operating Expenses)**
   - Beban Penjualan (Selling Expenses)
   - Beban Administrasi & Umum (General & Administrative Expenses)
5. **Laba Operasional (Operating Income)** = Gross Profit - Operating Expenses
6. **Pendapatan & Beban Lain-Lain (Other Income & Expenses)**
   - Non-operational income
   - Non-operational expenses
7. **Laba Sebelum Pajak (Pretax Income)**
8. **Beban Pajak Penghasilan (Income Tax Expense)**
9. **Laba Bersih (Net Income)** = Pretax Income - Tax

#### Critical Classification

Expenses must be classified into:

**1. Beban Operasional (Operating Expenses)**:
- Directly related to main business operations
- Beban Penjualan (Selling):
  - Marketing and advertising
  - Sales commissions
  - Delivery costs
- Beban Administrasi & Umum (G&A):
  - Office rent
  - Utilities
  - Salaries
  - Office supplies
  - Professional services

**2. Beban Lain-Lain (Non-Operating Expenses)**:
- Not directly related to operations
- Interest expense
- Foreign exchange losses
- Disposal of assets
- Unusual or infrequent expenses

### Indonesian Chart of Accounts Structure

```
1-xxxx: Aset (Assets)
2-xxxx: Kewajiban (Liabilities)
3-xxxx: Ekuitas (Equity)
4-xxxx: Pendapatan (Revenue)
5-xxxx: Harga Pokok Penjualan (Cost of Goods Sold)
6-xxxx: Beban Operasional (Operating Expenses)
  6-1xxx: Beban Penjualan (Selling Expenses)
  6-2xxx: Beban Administrasi & Umum (General & Administrative)
7-xxxx: Pendapatan Lain-Lain (Other Income)
8-xxxx: Beban Lain-Lain (Other Expenses)
9-xxxx: Pajak Penghasilan (Income Tax)
```

#### Detailed Expense Accounts (6-xxxx)

```typescript
// Beban Penjualan (6-1xxx) - Selling Expenses
const SELLING_EXPENSES = {
  '6-1010': 'Gaji Penjualan', // Sales salaries
  '6-1020': 'Komisi Penjualan', // Sales commissions
  '6-1030': 'Iklan dan Promosi', // Advertising & promotion
  '6-1040': 'Transportasi Penjualan', // Sales transportation
  '6-1050': 'Biaya Kirim', // Delivery costs
  '6-1060': 'Pameran dan Event', // Exhibitions & events
  '6-1070': 'Marketing Digital', // Digital marketing
  '6-1080': 'Biaya Entertainment Klien', // Client entertainment
}

// Beban Administrasi & Umum (6-2xxx) - General & Administrative
const GENERAL_ADMIN_EXPENSES = {
  '6-2010': 'Gaji Karyawan', // Employee salaries
  '6-2020': 'Sewa Kantor', // Office rent
  '6-2030': 'Listrik dan Air', // Electricity & water
  '6-2040': 'Telepon dan Internet', // Phone & internet
  '6-2050': 'Perlengkapan Kantor', // Office supplies
  '6-2060': 'Pemeliharaan Kantor', // Office maintenance
  '6-2070': 'Jasa Profesional', // Professional services
  '6-2080': 'Asuransi', // Insurance
  '6-2090': 'Pajak dan Retribusi', // Taxes & levies
  '6-2100': 'Penyusutan Aset', // Asset depreciation
  '6-2110': 'Perjalanan Dinas', // Business travel
  '6-2120': 'Pelatihan dan Pengembangan', // Training & development
  '6-2130': 'Software dan Lisensi', // Software & licenses
  '6-2140': 'Jasa Konsultan', // Consulting services
  '6-2150': 'Legal dan Notaris', // Legal & notary
  '6-2160': 'Biaya Bank', // Bank charges
  '6-2170': 'Entertainment', // Entertainment
  '6-2180': 'Donation', // Donations
  '6-2190': 'Lain-Lain', // Miscellaneous
}

// Beban Lain-Lain (8-xxxx) - Other Expenses
const OTHER_EXPENSES = {
  '8-1010': 'Beban Bunga', // Interest expense
  '8-1020': 'Rugi Selisih Kurs', // Foreign exchange loss
  '8-1030': 'Rugi Penjualan Aset', // Loss on asset disposal
  '8-1040': 'Denda dan Penalti', // Fines & penalties
  '8-1050': 'Kerugian Luar Biasa', // Extraordinary losses
}
```

---

## Expense Documentation Standards

### Bukti Pengeluaran (Proof of Expenditure)

Indonesian businesses use standardized "Bukti Pengeluaran" forms for expense documentation.

#### Required Fields

```typescript
interface BuktiPengeluaran {
  // Header
  nomorBukti: string              // Document number
  tanggal: Date                   // Date

  // Payer Information
  dibayarOleh: string             // Paid by (company name)
  npwpPembayar: string            // Payer NPWP
  alamatPembayar: string          // Payer address

  // Payee Information
  dibayarKepada: string           // Paid to (vendor name)
  npwpPenerima?: string           // Payee NPWP (if applicable)
  alamatPenerima: string          // Payee address

  // Transaction Details
  uraian: string                  // Description
  jumlahBruto: number             // Gross amount
  ppn: number                     // PPN amount
  pph?: number                    // PPh withholding (if applicable)
  jumlahBersih: number            // Net amount (after withholding)

  // Tax Invoice Reference
  nomorFakturPajak?: string       // Tax invoice number (NSFP)
  tanggalFakturPajak?: Date       // Tax invoice date

  // Payment Method
  metodePembayaran: string        // Payment method
  nomorReferensi?: string         // Reference number (check, transfer)

  // Supporting Documents
  dokumenPendukung: string[]      // List of attachments

  // Approval
  disetujuiOleh: string          // Approved by
  tanggalPersetujuan: Date       // Approval date

  // Accounting
  kodeAkun: string               // Account code (6-xxxx)
  proyekId?: string              // Project ID (if applicable)

  // Signatures
  yangMembayar: string           // Payer signature
  yangMenerima: string           // Payee signature
  yangMenyetujui: string         // Approver signature
}
```

#### Document Format

```
┌─────────────────────────────────────────────────────────┐
│           BUKTI PENGELUARAN KAS/BANK                    │
│              (PROOF OF EXPENDITURE)                     │
│                                                         │
│  No: BKK-2025-0001              Tanggal: 16 Okt 2025  │
└─────────────────────────────────────────────────────────┘

DIBAYAR KEPADA (Paid To):
Nama      : PT. ABC Indonesia
NPWP      : 01.234.567.8-901.000
Alamat    : Jl. Sudirman No. 123, Jakarta Pusat

URAIAN PEMBAYARAN (Description):
Pembelian perlengkapan kantor bulan Oktober 2025

RINCIAN BIAYA (Cost Breakdown):
┌───────────────────────────────────────┬──────────────┐
│ Jumlah Bruto (Gross Amount)          │ Rp 5.000.000 │
│ PPN 11% (VAT)                         │ Rp   550.000 │
│ PPh Pasal 23 (2%)                     │ Rp   100.000 │
├───────────────────────────────────────┼──────────────┤
│ JUMLAH YANG DIBAYAR (Net Payment)     │ Rp 5.450.000 │
└───────────────────────────────────────┴──────────────┘

REFERENSI FAKTUR PAJAK (Tax Invoice Reference):
No. Faktur  : 010.123-25.12345678
Tanggal     : 15 Oktober 2025

METODE PEMBAYARAN (Payment Method):
Transfer Bank BCA - Ref: TRF20251016001

KODE AKUN (Account Code): 6-2050
PROYEK (Project): [Optional]

─────────────────────────────────────────────────────────
PERSETUJUAN (Approval):

Dibuat Oleh         Diperiksa Oleh       Disetujui Oleh
(Prepared By)       (Reviewed By)        (Approved By)

___________         ___________          ___________
[Nama]              [Nama]               [Nama]
Tanggal:            Tanggal:             Tanggal:
```

---

## Revised Database Schema

### Updated Expense Model

```prisma
model Expense {
  id              String        @id @default(cuid())
  expenseNumber   String        @unique // EXP-2025-0001

  // ===== INDONESIAN COMPLIANCE FIELDS =====

  // Bukti Pengeluaran Number
  buktiPengeluaranNumber String @unique // BKK-2025-0001

  // Account Code (PSAK Chart of Accounts)
  accountCode     String        // 6-1010, 6-2050, etc.
  accountName     String        // Indonesian account name

  // Expense Classification (for Income Statement)
  expenseClass    ExpenseClass  // SELLING, GENERAL_ADMIN, OTHER

  // Language Support
  description     String        // Primary description
  descriptionId   String?       // Indonesian description (Uraian)
  descriptionEn   String?       // English description

  // ===== TAX COMPLIANCE FIELDS =====

  // PPN (VAT) - Enhanced
  ppnRate         Decimal       @db.Decimal(5, 4) @default(0.1200) // 12% or 11%
  ppnAmount       Decimal       @db.Decimal(12, 2)
  ppnCategory     PPNCategory   @default(CREDITABLE)
  isLuxuryGoods   Boolean       @default(false) // For 12% vs 11% rate

  // e-Faktur Integration
  eFakturNSFP     String?       // Nomor Seri Faktur Pajak
  eFakturQRCode   String?       // QR Code data
  eFakturApprovalCode String?   // DGT approval code
  eFakturStatus   EFakturStatus @default(NOT_REQUIRED)
  eFakturValidatedAt DateTime?

  // Withholding Tax (PPh)
  withholdingTaxType   WithholdingTaxType? // PPh23, PPh4_2, PPh15
  withholdingTaxRate   Decimal?  @db.Decimal(5, 4) // 0.02, 0.15, etc.
  withholdingTaxAmount Decimal?  @db.Decimal(12, 2)
  buktiPotongNumber    String?   // Withholding tax evidence number
  buktiPotongDate      DateTime?

  // ===== VENDOR INFORMATION (Indonesian Format) =====

  vendorName      String        // Nama Vendor
  vendorNPWP      String?       // NPWP (Tax ID)
  vendorAddress   String?       // Alamat
  vendorPhone     String?
  vendorBank      String?       // Bank account for payment
  vendorAccountNo String?

  // ===== AMOUNT BREAKDOWN (Indonesian Tax Format) =====

  grossAmount     Decimal       @db.Decimal(12, 2) // Jumlah Bruto (before PPN)
  ppnAmount       Decimal       @db.Decimal(12, 2) // PPN amount
  withholdingAmount Decimal?    @db.Decimal(12, 2) // PPh withheld
  netAmount       Decimal       @db.Decimal(12, 2) // Net payment (Jumlah Bersih)
  totalAmount     Decimal       @db.Decimal(12, 2) // Gross + PPN (for display)

  // Original fields (simplified, keeping only essentials)
  expenseDate     DateTime
  currency        String        @default("IDR")

  // Categorization
  categoryId      String
  category        ExpenseCategory @relation(fields: [categoryId], references: [id])
  tags            String[]
  isTaxDeductible Boolean       @default(true) // Most business expenses are

  // Relationships
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  projectId       String?
  project         Project?      @relation(fields: [projectId], references: [id])
  clientId        String?
  client          Client?       @relation(fields: [clientId], references: [id])

  // Billable tracking
  isBillable      Boolean       @default(false)
  billableAmount  Decimal?      @db.Decimal(12, 2)
  invoiceId       String?
  invoice         Invoice?      @relation(fields: [invoiceId], references: [id])

  // Approval workflow
  status          ExpenseStatus @default(DRAFT)
  submittedAt     DateTime?
  approvedAt      DateTime?
  approvedBy      String?
  approver        User?         @relation("ExpenseApprover", fields: [approvedBy], references: [id])
  rejectedAt      DateTime?
  rejectionReason String?

  // Payment tracking
  paymentStatus   ExpensePaymentStatus @default(UNPAID)
  paidAt          DateTime?
  paymentMethod   String?       // BANK_TRANSFER, CASH, etc.
  paymentReference String?      // Transfer reference number
  paymentId       String?
  payment         Payment?      @relation(fields: [paymentId], references: [id])

  // Notes
  notes           String?       @db.Text
  notesId         String?       @db.Text // Indonesian notes

  // Documents
  documents       Document[]

  // Audit
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  approvalHistory ExpenseApprovalHistory[]
  comments        ExpenseComment[]

  @@index([expenseNumber])
  @@index([buktiPengeluaranNumber])
  @@index([accountCode])
  @@index([expenseClass])
  @@index([status])
  @@index([userId])
  @@index([projectId])
  @@index([categoryId])
  @@index([expenseDate])
  @@index([eFakturNSFP])
  @@index([ppnCategory])
  @@map("expenses")
}

// Updated Expense Category with PSAK Alignment
model ExpenseCategory {
  id          String    @id @default(cuid())
  code        String    @unique // Account code: 6-1010, 6-2050

  // Bilingual names
  name        String    // English name
  nameId      String    // Indonesian name (e.g., "Sewa Kantor")
  description String?
  descriptionId String? // Indonesian description

  // Account Classification
  accountCode String    // 6-1xxx, 6-2xxx, 8-xxxx
  expenseClass ExpenseClass // SELLING, GENERAL_ADMIN, OTHER

  // Hierarchy support
  parentId    String?
  parent      ExpenseCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ExpenseCategory[] @relation("CategoryHierarchy")

  // Tax Configuration
  defaultPPNRate Decimal @db.Decimal(5, 4) @default(0.1200)
  isLuxuryGoods  Boolean @default(false)
  withholdingTaxType WithholdingTaxType?
  withholdingTaxRate Decimal? @db.Decimal(5, 4)

  // Settings
  icon        String?
  color       String    @default("#1890ff")
  isActive    Boolean   @default(true)
  isBillable  Boolean   @default(false)
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

// ===== NEW ENUMS =====

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
```

---

## Revised Expense Categories

### PSAK-Compliant Expense Categories

```typescript
export const INDONESIAN_EXPENSE_CATEGORIES = [
  // ===== BEBAN PENJUALAN (Selling Expenses) - 6-1xxx =====
  {
    accountCode: '6-1010',
    code: 'SELLING_SALARIES',
    name: 'Sales Salaries',
    nameId: 'Gaji Penjualan',
    expenseClass: 'SELLING',
    icon: 'user',
    color: '#1890ff',
    defaultPPNRate: 0.00, // Salaries are not subject to PPN
    requiresEFaktur: false,
  },
  {
    accountCode: '6-1020',
    code: 'SALES_COMMISSION',
    name: 'Sales Commission',
    nameId: 'Komisi Penjualan',
    expenseClass: 'SELLING',
    icon: 'trophy',
    color: '#52c41a',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02,
  },
  {
    accountCode: '6-1030',
    code: 'ADVERTISING',
    name: 'Advertising & Promotion',
    nameId: 'Iklan dan Promosi',
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
    expenseClass: 'SELLING',
    icon: 'car',
    color: '#13c2c2',
  },
  {
    accountCode: '6-1050',
    code: 'DELIVERY_COSTS',
    name: 'Delivery Costs',
    nameId: 'Biaya Kirim',
    expenseClass: 'SELLING',
    icon: 'shopping',
    color: '#2f54eb',
  },
  {
    accountCode: '6-1060',
    code: 'EXHIBITIONS',
    name: 'Exhibitions & Events',
    nameId: 'Pameran dan Event',
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
    expenseClass: 'SELLING',
    icon: 'coffee',
    color: '#faad14',
    isTaxDeductible: false, // Entertainment may have limitations
  },

  // ===== BEBAN ADMINISTRASI & UMUM (General & Admin) - 6-2xxx =====
  {
    accountCode: '6-2010',
    code: 'EMPLOYEE_SALARIES',
    name: 'Employee Salaries',
    nameId: 'Gaji Karyawan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'team',
    color: '#1890ff',
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2020',
    code: 'OFFICE_RENT',
    name: 'Office Rent',
    nameId: 'Sewa Kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'home',
    color: '#52c41a',
    withholdingTaxType: 'PPH4_2',
    withholdingTaxRate: 0.10, // 10% for building rental
  },
  {
    accountCode: '6-2030',
    code: 'UTILITIES',
    name: 'Electricity & Water',
    nameId: 'Listrik dan Air',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'bulb',
    color: '#faad14',
  },
  {
    accountCode: '6-2040',
    code: 'TELECOMMUNICATIONS',
    name: 'Phone & Internet',
    nameId: 'Telepon dan Internet',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'phone',
    color: '#13c2c2',
  },
  {
    accountCode: '6-2050',
    code: 'OFFICE_SUPPLIES',
    name: 'Office Supplies',
    nameId: 'Perlengkapan Kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'file',
    color: '#2f54eb',
  },
  {
    accountCode: '6-2060',
    code: 'OFFICE_MAINTENANCE',
    name: 'Office Maintenance',
    nameId: 'Pemeliharaan Kantor',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'tool',
    color: '#722ed1',
  },
  {
    accountCode: '6-2070',
    code: 'PROFESSIONAL_SERVICES',
    name: 'Professional Services',
    nameId: 'Jasa Profesional',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'solution',
    color: '#eb2f96',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02,
    isBillable: true,
  },
  {
    accountCode: '6-2080',
    code: 'INSURANCE',
    name: 'Insurance',
    nameId: 'Asuransi',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'safety',
    color: '#fa541c',
  },
  {
    accountCode: '6-2090',
    code: 'TAXES_LEVIES',
    name: 'Taxes & Levies',
    nameId: 'Pajak dan Retribusi',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'bank',
    color: '#a0d911',
    defaultPPNRate: 0.00, // Taxes not subject to PPN
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2100',
    code: 'DEPRECIATION',
    name: 'Asset Depreciation',
    nameId: 'Penyusutan Aset',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'fall',
    color: '#8c8c8c',
    defaultPPNRate: 0.00, // Non-cash expense
    requiresEFaktur: false,
    requiresReceipt: false,
  },
  {
    accountCode: '6-2110',
    code: 'BUSINESS_TRAVEL',
    name: 'Business Travel',
    nameId: 'Perjalanan Dinas',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'car',
    color: '#13c2c2',
    children: [
      {
        code: 'TRAVEL_FLIGHTS',
        name: 'Flights',
        nameId: 'Penerbangan',
      },
      {
        code: 'TRAVEL_HOTELS',
        name: 'Hotels',
        nameId: 'Hotel',
      },
      {
        code: 'TRAVEL_MEALS',
        name: 'Meals',
        nameId: 'Makan',
      },
      {
        code: 'TRAVEL_TRANSPORT',
        name: 'Local Transport',
        nameId: 'Transportasi Lokal',
      },
    ],
  },
  {
    accountCode: '6-2120',
    code: 'TRAINING',
    name: 'Training & Development',
    nameId: 'Pelatihan dan Pengembangan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'read',
    color: '#722ed1',
  },
  {
    accountCode: '6-2130',
    code: 'SOFTWARE',
    name: 'Software & Licenses',
    nameId: 'Software dan Lisensi',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'cloud',
    color: '#2f54eb',
  },
  {
    accountCode: '6-2140',
    code: 'CONSULTING',
    name: 'Consulting Services',
    nameId: 'Jasa Konsultan',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'solution',
    color: '#1890ff',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02,
    isBillable: true,
  },
  {
    accountCode: '6-2150',
    code: 'LEGAL',
    name: 'Legal & Notary',
    nameId: 'Legal dan Notaris',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'audit',
    color: '#52c41a',
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.02,
  },
  {
    accountCode: '6-2160',
    code: 'BANK_CHARGES',
    name: 'Bank Charges',
    nameId: 'Biaya Bank',
    expenseClass: 'GENERAL_ADMIN',
    icon: 'transaction',
    color: '#faad14',
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
  },
  {
    accountCode: '6-2170',
    code: 'ENTERTAINMENT',
    name: 'Entertainment',
    nameId: 'Entertainment',
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
    expenseClass: 'GENERAL_ADMIN',
    icon: 'heart',
    color: '#eb2f96',
    isTaxDeductible: false, // Usually not deductible
  },
  {
    accountCode: '6-2190',
    code: 'MISCELLANEOUS',
    name: 'Miscellaneous',
    nameId: 'Lain-Lain',
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
    expenseClass: 'OTHER',
    icon: 'dollar',
    color: '#ff4d4f',
    defaultPPNRate: 0.00, // Interest not subject to PPN
    withholdingTaxType: 'PPH23',
    withholdingTaxRate: 0.15, // 15% for interest
  },
  {
    accountCode: '8-1020',
    code: 'FOREX_LOSS',
    name: 'Foreign Exchange Loss',
    nameId: 'Rugi Selisih Kurs',
    expenseClass: 'OTHER',
    icon: 'swap',
    color: '#faad14',
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
    requiresReceipt: false,
  },
  {
    accountCode: '8-1030',
    code: 'ASSET_DISPOSAL_LOSS',
    name: 'Loss on Asset Disposal',
    nameId: 'Rugi Penjualan Aset',
    expenseClass: 'OTHER',
    icon: 'minus-circle',
    color: '#ff7a45',
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
  },
  {
    accountCode: '8-1040',
    code: 'FINES_PENALTIES',
    name: 'Fines & Penalties',
    nameId: 'Denda dan Penalti',
    expenseClass: 'OTHER',
    icon: 'warning',
    color: '#fa541c',
    isTaxDeductible: false, // Not deductible
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
  },
  {
    accountCode: '8-1050',
    code: 'EXTRAORDINARY_LOSSES',
    name: 'Extraordinary Losses',
    nameId: 'Kerugian Luar Biasa',
    expenseClass: 'OTHER',
    icon: 'thunderbolt',
    color: '#ff4d4f',
    defaultPPNRate: 0.00,
    requiresEFaktur: false,
  },
]
```

---

## E-Faktur Integration Requirements

### System Architecture

```
┌─────────────────┐
│  Monomi System  │
└────────┬────────┘
         │
         ├─ Upload Receipt (PDF/Image)
         │
         ▼
┌──────────────────────┐
│  Receipt Processor   │ ← OCR Text Extraction
└────────┬─────────────┘
         │
         ├─ Extract: NSFP, Amount, Date, Vendor
         │
         ▼
┌──────────────────────┐
│ e-Faktur Validator   │
└────────┬─────────────┘
         │
         ├─ API Call to DGT
         ├─ Validate QR Code
         ├─ Check NSFP Status
         │
         ▼
┌──────────────────────┐
│   Validation Result  │
├──────────────────────┤
│ ✓ Valid              │
│ ✗ Invalid            │
│ ⚠ Pending Approval   │
└──────────────────────┘
```

### Implementation Requirements

#### Phase 1: Manual Entry (MVP)
- Manual input of NSFP number
- Manual input of e-Faktur details
- QR code upload
- Basic validation (format check)

#### Phase 2: OCR Integration
- OCR to extract NSFP from receipt images
- Extract vendor NPWP
- Extract amounts (DPP, PPN, Total)
- Extract date

#### Phase 3: DGT API Integration (Future)
- Real-time validation with DGT API
- Auto-fetch e-Faktur details
- Status monitoring
- Automatic updates

### Data Flow

```typescript
// Step 1: User uploads receipt
POST /api/v1/expenses/:id/receipts
{
  file: File, // PDF or Image
  documentType: 'RECEIPT' | 'E_FAKTUR'
}

// Step 2: OCR Processing (if enabled)
{
  nsfp: '010.123-25.12345678',
  vendorNpwp: '01.234.567.8-901.000',
  vendorName: 'PT ABC Indonesia',
  dpp: 5000000,
  ppnAmount: 550000,
  totalAmount: 5550000,
  date: '2025-10-15',
  qrCodeData: 'base64...',
}

// Step 3: Validation
POST /api/v1/expenses/:id/validate-efaktur
{
  nsfp: '010.123-25.12345678',
  expectedAmount: 5550000,
}

Response:
{
  valid: true,
  status: 'VALID',
  validatedAt: '2025-10-16T10:00:00Z',
  details: {
    nsfp: '010.123-25.12345678',
    approvalCode: 'DGT-ABC123',
    issueDate: '2025-10-15',
    sellerNpwp: '01.234.567.8-901.000',
    sellerName: 'PT ABC Indonesia',
  }
}

// Step 4: Save to expense
PATCH /api/v1/expenses/:id
{
  eFakturNSFP: '010.123-25.12345678',
  eFakturStatus: 'VALID',
  eFakturValidatedAt: '2025-10-16T10:00:00Z',
  eFakturApprovalCode: 'DGT-ABC123',
}
```

---

## Revised Implementation Plan

### Updated Timeline

**Total Duration**: 14-16 weeks (extended from 12 weeks)

### Phase 1: Foundation + Indonesian Compliance (Week 1-3)

**Goal**: Database, Indonesian standards, basic backend

**Tasks**:
1. ✅ **Database schema** with Indonesian compliance fields
   - Add accountCode, expenseClass
   - Add PPN fields (ppnRate, ppnAmount, ppnCategory)
   - Add e-Faktur fields (NSFP, QR code, status)
   - Add withholding tax fields
   - Add bilingual fields (nameId, descriptionId)

2. ✅ **Seed Indonesian expense categories**
   - PSAK-compliant chart of accounts (6-xxxx, 8-xxxx)
   - Bilingual names (Indonesian + English)
   - Tax configuration per category

3. ✅ **Backend module setup** (NestJS)
   - ExpensesModule with Indonesian validators
   - PPN calculation service
   - Withholding tax calculation service
   - e-Faktur validation service (basic)

4. ✅ **Basic CRUD API** with Indonesian format
   - Bukti Pengeluaran number generation
   - Account code validation
   - PPN calculation
   - Bilingual error messages

**Deliverables**:
- Indonesian-compliant database
- PSAK expense categories
- Indonesian tax calculators
- Bilingual API

### Phase 2: Core Frontend + Indonesian UI (Week 4-6)

**Goal**: Frontend pages with Indonesian formats

**Tasks**:
1. ✅ **ExpensesPage** with Indonesian formatting
   - Display in Indonesian (with English toggle)
   - Show account codes
   - PPN amount display
   - Bukti Pengeluaran numbers

2. ✅ **ExpenseCreatePage** with Indonesian fields
   - Bilingual description input
   - Vendor NPWP input
   - PPN calculator
   - Account code selector
   - e-Faktur upload

3. ✅ **Bukti Pengeluaran PDF template**
   - Indonesian format
   - All required fields
   - Proper Indonesian currency formatting

4. ✅ **Indonesian localization**
   - All UI text in Bahasa Indonesia
   - Date formatting (DD/MM/YYYY)
   - Currency formatting (Rp)

**Deliverables**:
- Bilingual UI
- Indonesian expense forms
- Bukti Pengeluaran PDF
- Indonesian reports

### Phase 3: E-Faktur Integration (Week 7-8)

**Goal**: E-Faktur validation and tracking

**Tasks**:
1. ✅ **E-Faktur upload component**
   - Receipt image/PDF upload
   - NSFP manual entry
   - QR code scanning (optional)

2. ✅ **E-Faktur validation service**
   - NSFP format validation
   - Amount matching
   - Status tracking
   - Validation history

3. ✅ **E-Faktur detail page**
   - View e-Faktur details
   - Download original receipt
   - Validation status
   - QR code display

**Deliverables**:
- E-Faktur upload working
- Basic validation
- Receipt management

### Phase 4: Tax Reporting (Week 9-10)

**Goal**: Indonesian tax report generation

**Tasks**:
1. ✅ **PPN Report** (Input VAT Report)
   - Monthly PPN Masukan report
   - By vendor, by category
   - Export to Excel (Indonesian format)
   - Ready for DGT submission

2. ✅ **Withholding Tax Report**
   - PPh Pasal 23 report
   - PPh Pasal 4(2) report
   - Bukti Potong listing
   - Monthly summary

3. ✅ **Income Statement integration**
   - Multi-step format (PSAK)
   - Operating vs. non-operating expenses
   - Indonesian terminology
   - Export to Excel/PDF

**Deliverables**:
- PPN monthly reports
- Withholding tax reports
- PSAK income statement
- Excel exports

### Phase 5: Approval Workflow (Week 11)

**Goal**: Indonesian approval workflow

**Tasks**:
1. ✅ Submit expense (with Indonesian docs check)
2. ✅ Approve/reject with Indonesian terms
3. ✅ Email notifications (bilingual)
4. ✅ Approval history in Indonesian

**Deliverables**:
- Full approval workflow
- Bilingual notifications

### Phase 6: Project Integration (Week 12)

**Goal**: Link to projects and invoices

**Tasks**:
1. ✅ Project expense tracking
2. ✅ Billable expense conversion to invoice
3. ✅ Project profitability (Revenue - Expenses)
4. ✅ Indonesian project reports

**Deliverables**:
- Project integration
- Profitability analysis

### Phase 7: Advanced Features (Week 13-14)

**Goal**: Polish and OCR

**Tasks**:
1. ✅ **OCR for receipts** (optional, can be Phase 2)
   - Extract NSFP from images
   - Extract vendor info
   - Extract amounts
   - Auto-fill expense form

2. ✅ Budget tracking
3. ✅ Mobile optimization
4. ✅ Performance optimization

**Deliverables**:
- OCR working (optional)
- Budget system
- Mobile-friendly

### Phase 8: Testing & Documentation (Week 15-16)

**Goal**: Quality assurance

**Tasks**:
1. ✅ Integration tests
2. ✅ Indonesian compliance testing
3. ✅ Tax calculation verification
4. ✅ User documentation (Indonesian + English)
5. ✅ API documentation

**Deliverables**:
- Test coverage > 80%
- Bilingual documentation
- Production-ready

---

## Updated Critical Path

### Must-Have for MVP (Phase 1-4)

🔴 **CRITICAL** (Cannot launch without):
1. Indonesian database schema
2. PSAK expense categories
3. PPN 12% calculation
4. E-Faktur NSFP tracking
5. Bukti Pengeluaran format
6. Account code system
7. Bilingual UI (Indonesian primary)
8. Basic PPN report

🟡 **HIGH** (Should have for launch):
1. Withholding tax tracking
2. Multi-step income statement
3. E-Faktur validation
4. Indonesian PDF reports
5. Tax-deductible marking

🟢 **MEDIUM** (Can add later):
1. OCR for receipts
2. Real-time DGT API integration
3. Budget tracking
4. Advanced analytics

---

## Summary of Changes

### Major Additions

1. **E-Faktur Integration**: Complete e-Faktur tracking system
2. **PPN 12% Support**: Updated VAT calculations for 2025
3. **PSAK Chart of Accounts**: Indonesian accounting standards compliance
4. **Bukti Pengeluaran**: Indonesian expense documentation format
5. **Withholding Tax**: PPh Pasal 23, 4(2), 15 tracking
6. **Bilingual Support**: Indonesian + English throughout
7. **Tax Reporting**: PPN and PPh monthly reports
8. **Multi-Step Income Statement**: PSAK-compliant format

### Database Changes

- **22 new fields** added to Expense model
- **5 new enums** for Indonesian compliance
- **Updated ExpenseCategory** with account codes and bilingual names
- **New indexes** for Indonesian fields

### Timeline Impact

- **Extended from 12 to 14-16 weeks**
- **Added 2 weeks** for Indonesian compliance
- **Added 2 weeks** for e-Faktur integration
- **Same total cost**: Complexity absorbed through better planning

---

## Recommendations

### Immediate Actions

1. **Get Indonesian accounting consultant** to review PSAK compliance
2. **Register with DGT** for e-Faktur API access (if available)
3. **Review tax rates** with Indonesian tax advisor
4. **Validate account codes** with local accountant
5. **Test Bukti Pengeluaran format** with actual users

### Phase 1 Priority

Focus on these Indonesian compliance features first:
1. Database schema with Indonesian fields
2. PPN 12% calculation
3. PSAK expense categories
4. Bukti Pengeluaran format
5. Basic e-Faktur tracking (NSFP manual entry)

### Optional Enhancements (Future)

- **OCR**: Use Tesseract or Google Vision API for receipt scanning
- **DGT API**: Real-time e-Faktur validation (if API is available)
- **Mobile App**: Dedicated mobile app for receipt capture
- **AI Categorization**: Auto-suggest expense categories based on description

---

## Appendix: Indonesian Tax Resources

### Official Resources

1. **Direktorat Jenderal Pajak (DGT)**
   - Website: https://www.pajak.go.id
   - e-Faktur: https://efaktur.pajak.go.id

2. **Ikatan Akuntan Indonesia (IAI)**
   - Website: https://iaiglobal.or.id
   - PSAK Standards: Available for purchase

3. **e-Faktur Desktop Application**
   - Download from DGT website
   - Requires electronic certificate

### Key Terms Glossary

| Indonesian | English | Abbreviation |
|------------|---------|--------------|
| Pajak Pertambahan Nilai | Value Added Tax | PPN |
| Pajak Penghasilan | Income Tax | PPh |
| Nomor Seri Faktur Pajak | Tax Invoice Serial Number | NSFP |
| Pengusaha Kena Pajak | VAT-Registered Person | PKP |
| Nomor Pokok Wajib Pajak | Tax Identification Number | NPWP |
| Dasar Pengenaan Pajak | Tax Base | DPP |
| Bukti Potong | Withholding Tax Evidence | - |
| Bukti Pengeluaran | Proof of Expenditure | - |
| Beban Operasional | Operating Expenses | - |
| Beban Lain-Lain | Other Expenses | - |
| Laporan Laba Rugi | Income Statement | - |

---

**END OF INDONESIAN COMPLIANCE ANALYSIS**

This comprehensive analysis should serve as the foundation for building a fully compliant Indonesian expense management system. All features must align with Indonesian accounting standards (PSAK), tax regulations (PPN/PPh), and e-Faktur requirements.
