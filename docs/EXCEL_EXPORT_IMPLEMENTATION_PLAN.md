# Excel Export Implementation Plan for Accounting Reports

**Analysis Date**: October 19, 2025
**Scope**: Add Excel export functionality alongside existing PDF exports for all accounting pages
**Effort Estimate**: 3-4 days (1 backend dev, 1 frontend dev)

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Technical Analysis](#technical-analysis)
3. [Implementation Plan](#implementation-plan)
4. [Detailed Implementation Steps](#detailed-implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Rollout Plan](#rollout-plan)

---

## Current State Analysis

### Existing Export Functionality

#### Frontend - Accounting Pages (18 total)
| Page | Current Export | Needs Excel |
|------|----------------|-------------|
| 1. TrialBalancePage | ✅ PDF only | ✅ Yes |
| 2. GeneralLedgerPage | ✅ PDF only | ✅ Yes |
| 3. IncomeStatementPage | ✅ PDF only | ✅ Yes |
| 4. BalanceSheetPage | ✅ PDF only | ✅ Yes |
| 5. CashFlowStatementPage | ✅ PDF only | ✅ Yes |
| 6. AccountsReceivablePage | ✅ PDF only | ✅ Yes |
| 7. AccountsPayablePage | ✅ PDF only | ✅ Yes |
| 8. ARAgingPage | ✅ PDF only | ✅ Yes |
| 9. APAgingPage | ✅ PDF only | ✅ Yes |
| 10. ChartOfAccountsPage | ❌ No export | ⚠️ Optional |
| 11. JournalEntriesPage | ❌ No export | ⚠️ Optional |
| 12. AdjustingEntryWizard | ❌ No export | ❌ No (form) |
| 13. JournalEntryFormPage | ❌ No export | ❌ No (form) |
| 14. CashReceiptsPage | ⚠️ TBD | ✅ Yes |
| 15. CashDisbursementsPage | ⚠️ TBD | ✅ Yes |
| 16. BankTransfersPage | ⚠️ TBD | ✅ Yes |
| 17. BankReconciliationsPage | ⚠️ TBD | ✅ Yes |
| 18. DepreciationPage | ⚠️ TBD | ✅ Yes |
| 19. ECLProvisionPage | ⚠️ TBD | ✅ Yes |

**Priority Pages**: 9 pages with existing PDF export need Excel export immediately

#### Backend - Existing Services

**File**: `backend/src/modules/reports/excel-export.service.ts`
- ✅ **ExcelJS Integration**: Already using ExcelJS library v4.4.0
- ✅ **Indonesian Formatting**: IndonesianExcelFormatter class
- ✅ **Complex Excel Templates**: Sales/AR reports with multiple sheets
- ✅ **Professional Styling**: Headers, footers, currency formatting
- ❌ **Limitation**: Only implements Sales & Receivables reports
- ❌ **Limitation**: Not integrated with accounting module

**File**: `backend/src/modules/accounting/accounting.controller.ts`
- ✅ 12 PDF export endpoints exist (lines 604-821)
- ❌ No Excel export endpoints
- ✅ Using AccountingExportService for PDF generation

**File**: `backend/src/modules/accounting/services/accounting-export.service.ts` (assumed)
- ✅ Handles PDF generation for all accounting reports
- ❌ No Excel export methods

#### Frontend - Services

**File**: `frontend/src/services/accounting.ts`
- ✅ 9 PDF export functions exist
- ❌ No Excel export functions
- ✅ All use pattern: `apiClient.get('/accounting/export/{report}/pdf')`

### Gap Analysis

| Component | Current State | Required State | Gap |
|-----------|---------------|----------------|-----|
| Backend Endpoints | 12 PDF endpoints | 12 PDF + 12 Excel endpoints | 12 Excel endpoints |
| Backend Service | PDF generation only | PDF + Excel generation | Excel generation methods |
| Frontend Service | 9 PDF functions | 9 PDF + 9 Excel functions | 9 Excel functions |
| Frontend UI | Single "Export PDF" button | Dropdown with PDF/Excel options | UI component |
| ExcelJS Usage | Sales/AR reports only | All accounting reports | Extend to accounting |

---

## Technical Analysis

### Backend Architecture

#### Existing Excel Export Service Analysis

```typescript
// backend/src/modules/reports/excel-export.service.ts
@Injectable()
export class ExcelExportService {
  constructor(private prisma: PrismaService) {}

  // Key capabilities:
  // 1. Indonesian company info formatting
  // 2. Multi-sheet workbooks (6 sheets per report)
  // 3. Professional styling with IndonesianExcelFormatter
  // 4. Complex financial calculations (balances, aging)
  // 5. Buffer-based file generation (streaming)
}
```

**Strengths**:
- Mature Excel generation with IndonesianExcelFormatter
- Professional styling (borders, colors, fonts)
- Indonesian currency/date formatting
- Multi-sheet support
- Materai (stamp duty) compliance

**Reusability**: Can extend this service or create similar patterns for accounting reports

#### Proposed Backend Structure

```
backend/src/modules/accounting/
├── services/
│   ├── accounting-export.service.ts (existing - PDF generation)
│   └── accounting-excel-export.service.ts (NEW - Excel generation)
└── accounting.controller.ts (extend with Excel endpoints)
```

**Option A**: Create new `AccountingExcelExportService` (Recommended)
- Pros: Clean separation of concerns, easier to maintain
- Pros: Can import IndonesianExcelFormatter from reports module
- Pros: Dedicated service for Excel with focused responsibility
- Cons: Need to inject another service in controller

**Option B**: Extend existing `AccountingExportService`
- Pros: Single service for all exports
- Pros: Shared helper methods (formatters, queries)
- Cons: Service becomes large and complex
- Cons: Mixing PDF (Puppeteer) and Excel (ExcelJS) concerns

**Decision**: Go with Option A for better code organization

### Frontend Architecture

#### Current Export Pattern

```typescript
// Pattern in all accounting pages
const handleExportPDF = async () => {
  setIsExporting(true);
  try {
    await exportTrialBalancePDF({ asOfDate: ... });
    message.success('PDF exported successfully!');
  } catch (error) {
    message.error('Failed to export PDF. Please try again.');
  } finally {
    setIsExporting(false);
  }
};

// JSX
<Button icon={<DownloadOutlined />} onClick={handleExportPDF} loading={isExporting}>
  Export PDF
</Button>
```

#### Proposed UI Component - Export Dropdown

```typescript
// New component: frontend/src/components/accounting/ExportButton.tsx
interface ExportButtonProps {
  onExportPDF: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  pdfLabel?: string;
  excelLabel?: string;
  loading?: boolean;
}

// Visual design:
┌────────────────┐
│ Export ▼       │ ← Dropdown button
├────────────────┤
│ 📄 Export PDF  │ ← PDF option
│ 📊 Export Excel│ ← Excel option (NEW)
└────────────────┘
```

**Ant Design Components Used**:
- `Dropdown` with `Button`
- `Menu` for PDF/Excel options
- Icons: `FilePdfOutlined`, `FileExcelOutlined`
- Loading states during export

---

## Implementation Plan

### Phase 1: Backend Excel Export Infrastructure (Day 1)

#### Step 1.1: Create AccountingExcelExportService
**File**: `backend/src/modules/accounting/services/accounting-excel-export.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { LedgerService } from './ledger.service';
import { FinancialStatementsService } from './financial-statements.service';
import {
  IndonesianExcelFormatter,
  IndonesianCompanyInfo,
  IndonesianReportHeader,
} from '../../reports/indonesian-excel-formatter';

@Injectable()
export class AccountingExcelExportService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private financialStatementsService: FinancialStatementsService,
  ) {}

  private getIndonesianCompanyInfo(): IndonesianCompanyInfo {
    return {
      name: 'MONOMI',
      address: 'Jl. Usaha Mandiri No. 123',
      city: 'Jakarta Selatan',
      postalCode: '12345',
      phone: '+62-21-1234-5678',
      email: 'info@monomi.co.id',
      website: 'www.monomi.co.id',
      npwp: '01.234.567.8-901.234',
      siup: 'SIUP/123/2024',
    };
  }

  // Export methods (9 total):
  async exportTrialBalanceExcel(params: any): Promise<Buffer> { }
  async exportGeneralLedgerExcel(params: any): Promise<Buffer> { }
  async exportIncomeStatementExcel(params: any): Promise<Buffer> { }
  async exportBalanceSheetExcel(params: any): Promise<Buffer> { }
  async exportCashFlowStatementExcel(params: any): Promise<Buffer> { }
  async exportAccountsReceivableExcel(params: any): Promise<Buffer> { }
  async exportAccountsPayableExcel(params: any): Promise<Buffer> { }
  async exportARAgingExcel(params: any): Promise<Buffer> { }
  async exportAPAgingExcel(params: any): Promise<Buffer> { }
}
```

**Implementation Details**:
- Each method follows same pattern as PDF exports
- Use existing service methods to fetch data (LedgerService, FinancialStatementsService)
- Apply IndonesianExcelFormatter for professional styling
- Return Buffer for streaming download

#### Step 1.2: Add Excel Export Endpoints
**File**: `backend/src/modules/accounting/accounting.controller.ts`

Add 9 new endpoints after existing PDF endpoints:

```typescript
// ============ EXPORT TO EXCEL (NEW) ============
@Get('export/trial-balance/excel')
async exportTrialBalanceExcel(
  @Query() query: TrialBalanceQueryDto,
  @Res() res: Response,
) {
  try {
    const buffer = await this.excelExportService.exportTrialBalanceExcel({
      asOfDate: query.asOfDate.toISOString().split('T')[0],
      fiscalPeriodId: query.fiscalPeriodId,
      includeInactive: query.includeInactive,
      includeZeroBalances: query.includeZeroBalances,
    });
    const filename = `neraca-saldo-${query.asOfDate.toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      message: 'Error generating Excel',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ... repeat for all 9 reports
```

**Pattern for All Endpoints**:
1. Same query params as PDF endpoint
2. Call Excel export service method
3. Set MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
4. Set filename with `.xlsx` extension
5. Stream buffer to response

#### Step 1.3: Register Service in Module
**File**: `backend/src/modules/accounting/accounting.module.ts`

```typescript
import { AccountingExcelExportService } from './services/accounting-excel-export.service';

@Module({
  providers: [
    // ... existing services
    AccountingExcelExportService, // Add this
  ],
})
export class AccountingModule {}
```

### Phase 2: Frontend Excel Export Functions (Day 2)

#### Step 2.1: Add Excel Export Functions to Service
**File**: `frontend/src/services/accounting.ts`

Add 9 new export functions:

```typescript
// Excel Export Functions (NEW)
export const exportTrialBalanceExcel = async (params: TrialBalanceParams): Promise<void> => {
  const response = await apiClient.get('/accounting/export/trial-balance/excel', {
    params: {
      asOfDate: params.asOfDate,
      fiscalPeriodId: params.fiscalPeriodId,
      includeInactive: params.includeInactive,
      includeZeroBalances: params.includeZeroBalances,
    },
    responseType: 'blob', // Important for binary data
  });

  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `neraca-saldo-${params.asOfDate}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportGeneralLedgerExcel = async (params: LedgerParams): Promise<void> => { /* similar */ };
export const exportIncomeStatementExcel = async (params: StatementParams): Promise<void> => { /* similar */ };
export const exportBalanceSheetExcel = async (params: StatementParams): Promise<void> => { /* similar */ };
export const exportCashFlowStatementExcel = async (params: StatementParams): Promise<void> => { /* similar */ };
export const exportAccountsReceivableExcel = async (params: StatementParams): Promise<void> => { /* similar */ };
export const exportAccountsPayableExcel = async (params: StatementParams): Promise<void> => { /* similar */ };
export const exportARAgingExcel = async (params: AgingParams): Promise<void> => { /* similar */ };
export const exportAPAgingExcel = async (params: AgingParams): Promise<void> => { /* similar */ };
```

**Key Implementation Details**:
- `responseType: 'blob'` for binary Excel data
- Create temporary download link
- Cleanup after download
- Same filename pattern as PDF but `.xlsx` extension

#### Step 2.2: Create Reusable Export Button Component
**File**: `frontend/src/components/accounting/ExportButton.tsx`

```typescript
import React, { useState } from 'react';
import { Button, Dropdown, Menu, message } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';

interface ExportButtonProps {
  onExportPDF: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  pdfLabel?: string;
  excelLabel?: string;
  buttonText?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPDF,
  onExportExcel,
  pdfLabel = 'Export PDF',
  excelLabel = 'Export Excel',
  buttonText = 'Export',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        await onExportPDF();
      } else {
        await onExportExcel();
      }
      message.success(`${type.toUpperCase()} exported successfully!`);
    } catch (error) {
      console.error(`Export ${type} error:`, error);
      message.error(`Failed to export ${type.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const menu = (
    <Menu>
      <Menu.Item
        key="pdf"
        icon={<FilePdfOutlined />}
        onClick={() => handleExport('pdf')}
      >
        {pdfLabel}
      </Menu.Item>
      <Menu.Item
        key="excel"
        icon={<FileExcelOutlined />}
        onClick={() => handleExport('excel')}
      >
        {excelLabel}
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} placement="bottomRight">
      <Button icon={<DownloadOutlined />} loading={isExporting}>
        {buttonText}
      </Button>
    </Dropdown>
  );
};
```

**Features**:
- Single loading state for both exports
- Unified error handling
- Professional icons (FilePdfOutlined, FileExcelOutlined)
- Customizable labels
- Reusable across all accounting pages

### Phase 3: Update All Accounting Pages (Day 2-3)

#### Step 3.1: Update Each Accounting Page

**Pattern for All 9 Pages**:

1. Import new exports and component:
```typescript
import { exportTrialBalancePDF, exportTrialBalanceExcel } from '../../services/accounting';
import { ExportButton } from '../../components/accounting/ExportButton';
```

2. Add Excel export handler:
```typescript
const handleExportExcel = async () => {
  await exportTrialBalanceExcel({
    asOfDate: asOfDate.format('YYYY-MM-DD'),
    includeInactive: false,
    includeZeroBalances: false,
  });
};
```

3. Replace Export Button:
```typescript
// Before:
<Button icon={<DownloadOutlined />} onClick={handleExportPDF} loading={isExporting}>
  Export PDF
</Button>

// After:
<ExportButton
  onExportPDF={handleExportPDF}
  onExportExcel={handleExportExcel}
/>
```

#### Step 3.2: Pages to Update (Priority Order)

1. ✅ **TrialBalancePage.tsx** - Trial Balance (Neraca Saldo)
2. ✅ **IncomeStatementPage.tsx** - Income Statement (Laporan Laba Rugi)
3. ✅ **BalanceSheetPage.tsx** - Balance Sheet (Neraca)
4. ✅ **CashFlowStatementPage.tsx** - Cash Flow Statement (Laporan Arus Kas)
5. ✅ **AccountsReceivablePage.tsx** - AR Report (Laporan Piutang)
6. ✅ **AccountsPayablePage.tsx** - AP Report (Laporan Hutang)
7. ✅ **ARAgingPage.tsx** - AR Aging (Aging Piutang)
8. ✅ **APAgingPage.tsx** - AP Aging (Aging Hutang)
9. ✅ **GeneralLedgerPage.tsx** - General Ledger (Buku Besar)

### Phase 4: Excel Report Templates Implementation (Day 3-4)

#### Report 1: Trial Balance Excel Template

**Sheet Name**: "Neraca Saldo"

**Layout**:
```
Row 1:  [Company Logo Area]                    MONOMI
Row 2:  Jl. Usaha Mandiri No. 123, Jakarta Selatan 12345
Row 3:  Phone: +62-21-1234-5678 | Email: info@monomi.co.id
Row 4:  NPWP: 01.234.567.8-901.234
Row 5:
Row 6:  NERACA SALDO (TRIAL BALANCE)
Row 7:  Per Tanggal: [Date]
Row 8:
Row 9:  ┌─────────────┬─────────────────────────┬──────────┬───────────────┬───────────────┬────────┐
Row 10: │ Kode Akun   │ Nama Akun               │ Tipe     │ Debit         │ Kredit        │ Status │
        ├─────────────┼─────────────────────────┼──────────┼───────────────┼───────────────┼────────┤
Row 11: │ 1110        │ Kas                     │ ASSET    │ Rp 10,000,000 │ -             │ Normal │
...     │ ...         │ ...                     │ ...      │ ...           │ ...           │ ...    │
Row N:  ├─────────────┴─────────────────────────┴──────────┼───────────────┼───────────────┼────────┤
        │                              TOTAL                │ Rp XX,XXX,XXX │ Rp XX,XXX,XXX │ ✓/✗    │
        └──────────────────────────────────────────────────┴───────────────┴───────────────┴────────┘
Row N+2: Selisih: Rp X,XXX,XXX
Row N+3: Status: [SEIMBANG / TIDAK SEIMBANG]
Row N+5:
Row N+6: Disiapkan oleh: [System]          Tanggal: [Date]
Row N+7: Manajer Keuangan: _____________   Tanggal: _______
```

**Styling**:
- Header: Red gradient background (Monomi brand), white text, bold
- Data headers: Blue background (#4472C4), white text, bold, centered
- Data rows: Alternating white/light gray (#F2F2F2)
- Currency columns: Right-aligned, Indonesian format (Rp X,XXX,XXX)
- Total row: Yellow background (#FFF2CC), bold
- Borders: Medium black borders for table
- Footer: Light gray background, small font

**Key Fields**:
1. Account Code (Kode Akun)
2. Account Name Indonesian (Nama Akun)
3. Account Type (Tipe)
4. Debit Balance (Debit)
5. Credit Balance (Kredit)
6. Status (Normal/Abnormal)

**Summary Section**:
- Total Debit
- Total Credit
- Difference (Selisih)
- Is Balanced (Seimbang/Tidak Seimbang)
- Account Count

#### Report 2: Income Statement Excel Template

**Sheet Name**: "Laporan Laba Rugi"

**Layout**: Hierarchical structure with subtotals

```
MONOMI
LAPORAN LABA RUGI (INCOME STATEMENT)
Periode: [Start Date] s/d [End Date]

┌────────────────────────────────────────────┬─────────────────┐
│ PENDAPATAN (REVENUE)                       │                 │
├────────────────────────────────────────────┼─────────────────┤
│   4010 - Pendapatan Jasa                   │ Rp  50,000,000  │
│   4020 - Pendapatan Lain-lain             │ Rp   2,000,000  │
├────────────────────────────────────────────┼─────────────────┤
│   Total Pendapatan                         │ Rp  52,000,000  │ ← Bold, colored background
├────────────────────────────────────────────┼─────────────────┤
│                                            │                 │
│ BEBAN (EXPENSES)                           │                 │
├────────────────────────────────────────────┼─────────────────┤
│   Beban Operasional:                       │                 │
│     5010 - Gaji dan Upah                   │ Rp  20,000,000  │
│     5020 - Beban Sewa                      │ Rp   5,000,000  │
│     5030 - Beban Utilitas                  │ Rp   2,000,000  │
│   Subtotal Beban Operasional               │ Rp  27,000,000  │ ← Indented, bold
│                                            │                 │
│   Beban Non-Operasional:                   │                 │
│     5110 - Beban Bunga                     │ Rp   1,000,000  │
│   Subtotal Beban Non-Operasional           │ Rp   1,000,000  │ ← Indented, bold
├────────────────────────────────────────────┼─────────────────┤
│   Total Beban                              │ Rp  28,000,000  │ ← Bold, colored background
├────────────────────────────────────────────┼─────────────────┤
│                                            │                 │
│ LABA (RUGI) BERSIH                         │ Rp  24,000,000  │ ← Double border, large font
├────────────────────────────────────────────┼─────────────────┤
│ Margin Laba:                               │ 46.15%          │
└────────────────────────────────────────────┴─────────────────┘
```

**Styling**:
- Section headers (PENDAPATAN, BEBAN): Bold, larger font, background color
- Account items: Regular font, indented
- Subtotals: Bold, light background, indented
- Totals: Bold, colored background (#E2EFDA for revenue, #FCE4D6 for expenses)
- Net Income: Double border, large bold font, green if profit, red if loss

#### Report 3: Balance Sheet Excel Template

**Sheet Name**: "Neraca"

**Layout**: Side-by-side Assets/Liabilities+Equity

```
MONOMI
NERACA (BALANCE SHEET)
Per Tanggal: [Date]

┌─────────────────────────────────────────┬─────────────────┬──────────────────────────────────────────┬─────────────────┐
│ ASET (ASSETS)                           │                 │ KEWAJIBAN DAN EKUITAS                    │                 │
├─────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────┼─────────────────┤
│ Aset Lancar:                            │                 │ Kewajiban Jangka Pendek:                 │                 │
│   1110 - Kas                            │ Rp 10,000,000   │   2110 - Hutang Usaha                    │ Rp  5,000,000   │
│   1120 - Bank                           │ Rp 50,000,000   │   2120 - Hutang Pajak                    │ Rp  2,000,000   │
│   1130 - Piutang Usaha                  │ Rp 30,000,000   │                                          │                 │
│ Total Aset Lancar                       │ Rp 90,000,000   │ Total Kewajiban Jk. Pendek               │ Rp  7,000,000   │
│                                         │                 │                                          │                 │
│ Aset Tetap:                             │                 │ Kewajiban Jangka Panjang:                │                 │
│   1210 - Peralatan                      │ Rp 20,000,000   │   2210 - Pinjaman Bank                   │ Rp 10,000,000   │
│   1220 - Akumulasi Penyusutan           │ (Rp 2,000,000)  │                                          │                 │
│ Total Aset Tetap                        │ Rp 18,000,000   │ Total Kewajiban Jk. Panjang              │ Rp 10,000,000   │
│                                         │                 │                                          │                 │
├─────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────┼─────────────────┤
│                                         │                 │ EKUITAS (EQUITY):                        │                 │
│                                         │                 │   3110 - Modal Saham                     │ Rp 50,000,000   │
│                                         │                 │   3120 - Laba Ditahan                    │ Rp 41,000,000   │
│                                         │                 │                                          │                 │
│                                         │                 │ Total Ekuitas                            │ Rp 91,000,000   │
├─────────────────────────────────────────┼─────────────────┼──────────────────────────────────────────┼─────────────────┤
│ TOTAL ASET                              │ Rp 108,000,000  │ TOTAL KEWAJIBAN + EKUITAS                │ Rp 108,000,000  │
└─────────────────────────────────────────┴─────────────────┴──────────────────────────────────────────┴─────────────────┘

Status: ✓ SEIMBANG (BALANCED)
```

**Styling**:
- Split layout: Assets on left (columns A-B), Liabilities+Equity on right (columns D-E)
- Section headers: Bold, background color
- Subtotals: Bold, light background
- Grand totals: Double border, bold, large font
- Balance indicator: Green checkmark if balanced, red X if not

#### Report 4: General Ledger Excel Template

**Sheet Name**: "Buku Besar"

**Layout**: Transaction details with running balance

```
MONOMI
BUKU BESAR (GENERAL LEDGER)
Periode: [Start Date] s/d [End Date]
[Filter: Account Code / Account Type if applied]

┌──────────┬────────────┬────────────────────────────────────────────┬────────────────┬────────────────┬─────────────────┐
│ Tanggal  │ No. Jurnal │ Deskripsi                                  │ Debit          │ Kredit         │ Saldo Berjalan  │
├──────────┼────────────┼────────────────────────────────────────────┼────────────────┼────────────────┼─────────────────┤
│ 05/01/25 │ JE-2025001 │ 1110 - Kas                                 │ Rp 10,000,000  │ -              │ Rp 10,000,000   │
│          │            │ Setoran modal awal                         │                │                │                 │
├──────────┼────────────┼────────────────────────────────────────────┼────────────────┼────────────────┼─────────────────┤
│ 10/01/25 │ JE-2025005 │ 1110 - Kas                                 │ Rp  5,000,000  │ -              │ Rp 15,000,000   │
│          │            │ Penerimaan dari client ABC                 │                │                │                 │
├──────────┼────────────┼────────────────────────────────────────────┼────────────────┼────────────────┼─────────────────┤
│ 15/01/25 │ JE-2025010 │ 1110 - Kas                                 │ -              │ Rp  2,000,000  │ Rp 13,000,000   │
│          │            │ Pembayaran beban utilitas                  │                │                │                 │
├──────────┼────────────┼────────────────────────────────────────────┼────────────────┼────────────────┼─────────────────┤
│          │            │ TOTAL                                      │ Rp 15,000,000  │ Rp  2,000,000  │ Rp 13,000,000   │
└──────────┴────────────┴────────────────────────────────────────────┴────────────────┴────────────────┴─────────────────┘

Summary:
- Total Entri: XX
- Total Debit: Rp XX,XXX,XXX
- Total Kredit: Rp XX,XXX,XXX
- Saldo Akhir: Rp XX,XXX,XXX
```

**Styling**:
- Two-row per transaction (main + description)
- Running balance column: Bold, highlighted
- Debit amounts: Green color
- Credit amounts: Red color
- Total row: Bold, yellow background

#### Report 5-9: Similar Templates

- **Cash Flow Statement**: Operating/Investing/Financing sections
- **AR/AP Reports**: Client/Vendor listing with outstanding balances
- **AR/AP Aging**: Age brackets (Current, 1-30, 31-60, 61-90, >90 days)

### Phase 5: Testing & Quality Assurance (Day 4)

#### Unit Testing

**Backend Tests** (`backend/src/modules/accounting/services/accounting-excel-export.service.spec.ts`):

```typescript
describe('AccountingExcelExportService', () => {
  let service: AccountingExcelExportService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AccountingExcelExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LedgerService,
          useValue: mockLedgerService,
        },
      ],
    }).compile();

    service = module.get<AccountingExcelExportService>(AccountingExcelExportService);
  });

  describe('exportTrialBalanceExcel', () => {
    it('should generate valid Excel buffer', async () => {
      const result = await service.exportTrialBalanceExcel({
        asOfDate: '2025-01-31',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include all accounts in trial balance', async () => {
      // Test implementation
    });

    it('should format Indonesian currency correctly', async () => {
      // Test implementation
    });

    it('should calculate totals correctly', async () => {
      // Test implementation
    });
  });

  // Repeat for all 9 export methods
});
```

**Frontend Tests** (`frontend/src/components/accounting/ExportButton.test.tsx`):

```typescript
describe('ExportButton', () => {
  it('should render dropdown with PDF and Excel options', () => {
    const { getByText } = render(
      <ExportButton
        onExportPDF={jest.fn()}
        onExportExcel={jest.fn()}
      />
    );

    fireEvent.click(getByText('Export'));
    expect(getByText('Export PDF')).toBeInTheDocument();
    expect(getByText('Export Excel')).toBeInTheDocument();
  });

  it('should call onExportPDF when PDF option clicked', async () => {
    const onExportPDF = jest.fn().mockResolvedValue(undefined);
    // Test implementation
  });

  it('should show loading state during export', async () => {
    // Test implementation
  });
});
```

#### Integration Testing

**Test Scenarios**:
1. ✅ Export trial balance Excel → Download file → Open in Excel → Verify data
2. ✅ Export with date filters → Verify filtered data
3. ✅ Export with large dataset (1000+ rows) → Verify performance
4. ✅ Export with Indonesian characters → Verify UTF-8 encoding
5. ✅ Export with negative numbers → Verify red color formatting
6. ✅ Export all 9 reports → Verify file downloads correctly

#### Manual Testing Checklist

**For Each Report (9 total)**:
- [ ] Click Export button → Dropdown appears
- [ ] Click "Export Excel" → File downloads
- [ ] Open Excel file → No errors
- [ ] Verify company header → Correct info
- [ ] Verify column headers → Indonesian labels
- [ ] Verify data rows → Match screen data
- [ ] Verify totals/subtotals → Calculations correct
- [ ] Verify currency formatting → Rp X,XXX,XXX
- [ ] Verify date formatting → DD/MM/YYYY
- [ ] Verify borders/colors → Professional styling
- [ ] Verify footer → Signatures, date
- [ ] Test with empty data → Shows "No data" message
- [ ] Test with date filters → Correct date range
- [ ] Test with account filters → Correct accounts

#### Performance Testing

**Metrics to Measure**:
- Excel generation time (target: < 3 seconds for 1000 rows)
- File size (target: < 2MB for typical report)
- Memory usage during generation
- Browser download speed

**Test Cases**:
1. Small dataset (10 rows) → < 1 second
2. Medium dataset (100 rows) → < 2 seconds
3. Large dataset (1000 rows) → < 5 seconds
4. Very large dataset (10,000 rows) → < 30 seconds

---

## Detailed Implementation Steps

### Step-by-Step Implementation Guide

#### Day 1: Backend Foundation

**Morning (4 hours)**:
1. Create `AccountingExcelExportService` file
2. Set up service structure and dependencies
3. Implement Trial Balance Excel export
4. Implement Income Statement Excel export
5. Test both exports with sample data

**Afternoon (4 hours)**:
6. Implement Balance Sheet Excel export
7. Implement General Ledger Excel export
8. Implement Cash Flow Statement Excel export
9. Add all 9 Excel endpoints to controller
10. Register service in module
11. Test all backend endpoints with Postman/cURL

#### Day 2: Frontend Foundation

**Morning (4 hours)**:
1. Create `ExportButton` component
2. Add 9 Excel export functions to accounting service
3. Update TrialBalancePage with ExportButton
4. Update IncomeStatementPage with ExportButton
5. Update BalanceSheetPage with ExportButton
6. Test these 3 pages end-to-end

**Afternoon (4 hours)**:
7. Update CashFlowStatementPage
8. Update GeneralLedgerPage
9. Update AccountsReceivablePage
10. Update AccountsPayablePage
11. Update ARAgingPage
12. Update APAgingPage
13. Test all 9 pages

#### Day 3: Excel Templates & Refinement

**Morning (4 hours)**:
1. Refine Trial Balance template (styling, borders, colors)
2. Refine Income Statement template (hierarchical structure)
3. Refine Balance Sheet template (side-by-side layout)
4. Add company logos and watermarks
5. Test Indonesian formatting (currency, dates)

**Afternoon (4 hours)**:
6. Refine remaining templates
7. Implement AR/AP Aging Excel exports
8. Add summary sections to all reports
9. Implement footer with signatures
10. Test all exports with real database data

#### Day 4: Testing & Polish

**Morning (4 hours)**:
1. Run all unit tests
2. Run integration tests
3. Manual testing of all 9 reports
4. Fix any bugs found
5. Performance testing with large datasets

**Afternoon (4 hours)**:
6. Code review and refactoring
7. Update documentation
8. Create user guide for Excel exports
9. Final end-to-end testing
10. Prepare for deployment

---

## Testing Strategy

### Test Data Preparation

**Create Test Fixtures**:
```sql
-- Insert test journal entries
INSERT INTO journal_entry (...) VALUES (...);

-- Insert test accounts
INSERT INTO chart_of_accounts (...) VALUES (...);

-- Insert test invoices/payments
INSERT INTO invoice (...) VALUES (...);
```

**Test Scenarios**:
1. ✅ Empty database → Shows "No data" message
2. ✅ Single transaction → Correct display
3. ✅ Multiple transactions → Correct totals
4. ✅ Date range filtering → Correct dates
5. ✅ Account filtering → Correct accounts
6. ✅ Large dataset → Performance acceptable

### Test Environments

**Development**:
- Local Docker setup
- Sample data from seed
- All tests pass

**Staging**:
- Production-like data
- Performance testing
- User acceptance testing

**Production**:
- Gradual rollout
- Monitor error logs
- Collect user feedback

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to development environment
- Internal team testing
- Fix critical bugs
- Performance optimization

### Phase 2: Beta Testing (Week 2)
- Deploy to staging environment
- Select 5-10 beta users
- Collect feedback
- Fix issues

### Phase 3: Production Rollout (Week 3)
- Deploy to production
- Announce new feature
- Monitor usage
- Support users

### Success Criteria

**Metrics to Track**:
- Export success rate > 99%
- Average export time < 3 seconds
- User satisfaction score > 4.5/5
- Bug reports < 5 per week
- Excel file quality issues < 1%

---

## Appendix

### A. Excel Export Endpoint URLs

| Report | PDF Endpoint | Excel Endpoint (NEW) |
|--------|-------------|---------------------|
| Trial Balance | `/accounting/export/trial-balance/pdf` | `/accounting/export/trial-balance/excel` |
| Income Statement | `/accounting/export/income-statement/pdf` | `/accounting/export/income-statement/excel` |
| Balance Sheet | `/accounting/export/balance-sheet/pdf` | `/accounting/export/balance-sheet/excel` |
| Cash Flow | `/accounting/export/cash-flow/pdf` | `/accounting/export/cash-flow/excel` |
| AR Report | `/accounting/export/accounts-receivable/pdf` | `/accounting/export/accounts-receivable/excel` |
| AP Report | `/accounting/export/accounts-payable/pdf` | `/accounting/export/accounts-payable/excel` |
| AR Aging | `/accounting/export/ar-aging/pdf` | `/accounting/export/ar-aging/excel` |
| AP Aging | `/accounting/export/ap-aging/pdf` | `/accounting/export/ap-aging/excel` |
| General Ledger | `/accounting/export/general-ledger/pdf` | `/accounting/export/general-ledger/excel` |

### B. ExcelJS Key Methods

```typescript
// Create workbook
const workbook = new ExcelJS.Workbook();

// Add worksheet
const worksheet = workbook.addWorksheet('Sheet Name');

// Add row
worksheet.addRow(['Column 1', 'Column 2', 'Column 3']);

// Format cell
cell.font = { bold: true, size: 12 };
cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFAA00' } };
cell.border = { top: { style: 'thin' }, left: { style: 'thin' } };
cell.alignment = { vertical: 'middle', horizontal: 'center' };

// Number format
cell.numFmt = '#,##0;[Red](#,##0)'; // Indonesian currency format

// Generate buffer
const buffer = await workbook.xlsx.writeBuffer();
return Buffer.from(buffer);
```

### C. Indonesian Excel Formatting Standards

**Currency Format**:
```typescript
// Pattern: Rp #,##0
cell.numFmt = '"Rp "#,##0;[Red]"Rp "-#,##0';
```

**Date Format**:
```typescript
// Pattern: DD/MM/YYYY
cell.numFmt = 'dd/mm/yyyy';
```

**Percentage Format**:
```typescript
// Pattern: 0.00%
cell.numFmt = '0.00%';
```

**Negative Numbers**:
```typescript
// Red color for negative amounts
cell.numFmt = '#,##0;[Red](#,##0)';
```

### D. File Size Estimates

| Report | Typical Rows | Excel File Size | PDF File Size |
|--------|-------------|----------------|---------------|
| Trial Balance | 30 accounts | ~50 KB | ~100 KB |
| Income Statement | 50 accounts | ~60 KB | ~120 KB |
| Balance Sheet | 40 accounts | ~55 KB | ~110 KB |
| General Ledger | 100 entries | ~150 KB | ~300 KB |
| Cash Flow | 30 entries | ~70 KB | ~140 KB |
| AR/AP Reports | 50 clients | ~100 KB | ~200 KB |
| AR/AP Aging | 50 clients | ~120 KB | ~240 KB |

**Note**: Excel files are typically 40-50% smaller than equivalent PDFs

### E. Error Handling

**Common Errors**:
1. **ExcelJS Out of Memory**: Large datasets > 50,000 rows
   - Solution: Implement streaming write
2. **Encoding Issues**: Indonesian characters garbled
   - Solution: Ensure UTF-8 encoding
3. **Formula Errors**: Excel formulas not calculating
   - Solution: Use `cell.value =` instead of formulas
4. **Download Fails**: Browser blocks download
   - Solution: Use `Content-Disposition: attachment`

### F. Browser Compatibility

| Browser | Excel Download | PDF Download | Notes |
|---------|----------------|--------------|-------|
| Chrome 90+ | ✅ | ✅ | Fully supported |
| Firefox 88+ | ✅ | ✅ | Fully supported |
| Safari 14+ | ✅ | ✅ | Fully supported |
| Edge 90+ | ✅ | ✅ | Fully supported |
| IE 11 | ❌ | ⚠️ | Not supported |

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding Excel export functionality to all accounting pages in the Monomi Finance system.

**Key Benefits**:
1. ✅ **User Convenience**: Users can export to Excel for further analysis
2. ✅ **Data Portability**: Easy to share with accountants, auditors
3. ✅ **Professional Quality**: Indonesian formatting standards
4. ✅ **Consistent UX**: Unified export button across all pages
5. ✅ **Maintainable Code**: Reusable components and services

**Estimated Effort**: 3-4 days for full implementation
**Risk Level**: Low (using proven ExcelJS library, existing PDF patterns)
**Business Value**: High (user-requested feature, improves workflow)

---

**Document Version**: 1.0
**Last Updated**: October 19, 2025
**Owner**: Development Team
**Status**: Ready for Implementation
