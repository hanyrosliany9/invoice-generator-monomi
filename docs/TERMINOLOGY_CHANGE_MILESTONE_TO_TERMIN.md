# Terminology Change: "Milestone" → "Termin" (Payment Milestones)

**Date**: 2025-11-07
**Objective**: Replace customer-facing "Milestone" terminology with "Termin" to reduce confusion, as "Termin" is more commonly understood in Indonesian business contexts for payment installments.

## Context

The system has two types of milestones:
1. **Payment Milestones** (for quotations) - Indonesian "termin pembayaran" (payment installments)
2. **Project Milestones** (for project execution tracking) - Technical project phases

This change ONLY affects **Payment Milestones** terminology in customer-facing areas to use "Termin" instead of "Milestone".

## Files Changed

### 1. Backend - PDF Invoice Template
**File**: `backend/src/modules/pdf/pdf.service.ts`

**Changes**:
- Line 945: HTML comment `<!-- SCENARIO 1: Milestone-based invoice -->` → `<!-- SCENARIO 1: Termin-based invoice -->`
- Line 955: `Milestone ${number}` → `Termin ${number}`
- Line 996: Previous payments list now shows `Termin ${number}` instead of `Milestone ${number}`
- Line 1029: HTML comment `<!-- SCENARIO 2: Non-milestone invoice -->` → `<!-- SCENARIO 2: Non-termin invoice -->`

**Impact**: All generated invoice PDFs will now show "Termin" in payment breakdowns.

### 2. Frontend - Indonesian Translation (Primary Language)
**File**: `frontend/src/i18n/locales/id.json`

**Changes**:
- Line 223: Title changed from "Syarat Pembayaran & Milestone" → "Syarat Pembayaran & Termin"
- Line 243: "Hari Setelah Milestone Sebelumnya" → "Hari Setelah Termin Sebelumnya"
- Line 257: Validation message updated to use "termin"
- Line 258: Validation message updated to use "termin"
- Line 259: Validation message updated to use "termin"
- Line 262: Info text updated: "Setiap milestone" → "Setiap termin"
- Line 263: "untuk setiap milestone" → "untuk setiap termin"
- Line 264: "Belum ada milestone" → "Belum ada termin"
- Line 265: "Tambah Milestone Pertama" → "Tambah Termin Pertama"
- Line 266: "Tambah Milestone Lainnya" → "Tambah Termin Lainnya"
- Line 267: "Hapus Milestone" → "Hapus Termin"
- Line 268: Confirmation dialog updated to use "termin"
- Line 272: "Total Milestone" → "Total Termin"

**Impact**: All Indonesian UI text now uses "Termin" consistently.

### 3. Frontend - English Translation
**File**: `frontend/src/i18n/locales/en.json`

**Changes**:
- Line 130: Title changed to "Payment Terms & Termin"
- Line 150: "Days After Previous Milestone" → "Days After Previous Termin"
- Line 164-166: All validation messages updated to use "termin"
- Line 169-175: All info and action messages updated to use "termin"
- Line 179: "Total Milestones" → "Total Termin"
- Line 414: "milestone": "Milestone" → "milestone": "Termin"
- Line 432: "All Milestones" → "All Termin"
- Line 453: "Milestone Analytics" → "Termin Analytics"
- Line 456: Description updated to use "termin"
- Line 458: "Percentage of milestones paid" → "Percentage of termin paid"
- Line 460: "Number of active milestones" → "Number of active termin"
- Line 466: "Total Milestones" → "Total Termin"
- Line 475-479: All notification titles updated to use "Termin"
- Line 503: Success message updated to "Termin deleted successfully"
- Line 512: Error message updated to "Failed to delete termin"
- Line 516: Confirmation dialog updated to use "termin"

**Impact**: English UI now uses "Termin" for consistency with Indonesian business terminology.

### 4. Frontend - Invoice Pages (Hardcoded Text)

**Files Updated**:

**`frontend/src/pages/InvoiceDetailPage.tsx`**:
- Line 423: Tag display `Milestone ${number}` → `Termin ${number}`
- Line 700: Payment term tag `Milestone ${number}` → `Termin ${number}`
- Line 885: Description label `Milestone Number` → `Termin Number`

**`frontend/src/pages/InvoiceCreatePage.tsx`**:
- Line 256: Error message `Silakan pilih payment milestone terlebih dahulu` → `Silakan pilih termin pembayaran terlebih dahulu`
- Line 299: Error message (duplicate) updated to use "termin pembayaran"
- Line 610: Help text `Pilih milestone untuk melanjutkan` → `Pilih termin untuk melanjutkan`
- Line 727: Alert message `Jumlah invoice diambil dari milestone yang dipilih` → `Jumlah invoice diambil dari termin yang dipilih`

**`frontend/src/pages/InvoiceEditPage.tsx`**:
- Line 355: Payment term display `Milestone ${number}` → `Termin ${number}`
- Line 408: Card title `Payment Milestone` → `Payment Termin`
- Line 419: Label `Milestone Number` → `Termin Number`

**Impact**: All invoice form pages now display "Termin" consistently.

### 5. Frontend - Quotation Components

**File**: `frontend/src/components/quotations/MilestonePaymentTerms.tsx`
- Line 127: Template deliverable text `Milestone 1 completed` → `Termin 1 completed`
- Line 134: Template deliverable text `Milestone 2 completed` → `Termin 2 completed`

**Impact**: Quotation payment term templates now use "Termin" in example deliverables.

## What Remains Unchanged

The following areas still use "Milestone" terminology (intentionally):

1. **Code/API layer**: Variable names, function names, database fields (e.g., `PaymentMilestone`, `paymentMilestoneId`)
2. **Project Milestones**: Technical project execution milestones remain as "Project Milestones"
3. **Backend service names**: `payment-milestones.service.ts`, etc.
4. **Database schema**: Model names and field names in Prisma
5. **Internal logging and debugging messages**
6. **Documentation files** (*.md files)

## Testing Recommendations

1. **PDF Generation**: Generate test invoices with payment milestones and verify "Termin X" appears correctly
2. **Quotation Forms**: Test quotation creation/editing forms to verify all labels show "Termin"
3. **Validation Messages**: Test validation errors to confirm "termin" appears in error messages
4. **Analytics Page**: Check milestone analytics page titles and labels
5. **Notifications**: Verify notification messages use "Termin"
6. **Both Languages**: Test in both English and Indonesian language modes

## Benefits

✅ **Clearer for Indonesian customers**: "Termin" is universally understood in Indonesian business as payment installments
✅ **Reduced confusion**: No mixing of technical "milestone" with business "payment terms"
✅ **Better alignment with local business practices**: Matches how Indonesian contracts and quotations are written
✅ **Professional appearance**: Uses proper business terminology in all customer-facing documents

## Migration Notes

- No database migration required (only UI/display text changes)
- No API breaking changes (internal naming unchanged)
- Changes take effect immediately after frontend rebuild
- Existing invoices regenerated will show new "Termin" terminology

---

## Summary of Changes

**Total Files Modified**: 8 files
- 1 Backend file (PDF service)
- 2 Translation files (en.json, id.json)
- 3 Frontend page files (InvoiceDetailPage, InvoiceCreatePage, InvoiceEditPage)
- 1 Frontend component file (MilestonePaymentTerms)
- 1 Documentation file (this file)

**Total Lines Changed**: ~50+ customer-facing text instances

**Languages Affected**:
- ✅ Indonesian (Bahasa Indonesia) - Primary
- ✅ English - Secondary

**Areas Updated**:
- ✅ PDF Invoice Generation
- ✅ Invoice Detail Pages
- ✅ Invoice Create/Edit Forms
- ✅ Quotation Templates
- ✅ Validation Messages
- ✅ Error Messages
- ✅ UI Labels and Tags
- ✅ Analytics Descriptions
- ✅ Notification Messages

---

**Author**: Claude Code Assistant
**Status**: ✅ Complete (Verified & Comprehensive)
