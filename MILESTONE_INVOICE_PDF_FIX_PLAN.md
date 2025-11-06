# Milestone Invoice PDF Display Fix - Implementation Plan

## Problem Statement

When generating PDF for milestone-based invoices, the current display is confusing:
- **Current Behavior:** Shows all products/services (Rp 21,000,000) but subtotal only shows milestone amount (Rp 10,500,000)
- **Customer Confusion:** Disconnect between listed services and final total
- **Missing Context:** No clear indication of payment progress or remaining balance

## Example Scenario

**Quotation:** Rp 21,000,000 total, 50-50% payment terms (2 milestones)

**Milestone 1 Invoice (Down Payment 50%):**
```
Products/Services: Rp 21,000,000 (all services listed)
Subtotal: Rp 10,500,000 ❌ WRONG
Total (Milestone 1 - DP 50%): Rp 10,500,000
```

**Desired behavior:**
```
Products/Services: Rp 21,000,000 (all services listed)
Subtotal (Full Project): Rp 21,000,000 ✅
Milestone 1 - Down Payment (50%): Rp 10,500,000 ✅
TOTAL DUE (This Invoice): Rp 10,500,000 ✅
```

## Technical Analysis

### Database Structure (Already Exists ✅)

**Quotation Model:**
- `totalAmount` - Full project amount (Rp 21,000,000)
- `paymentMilestones[]` - Array of all milestones

**PaymentMilestone Model:**
- `milestoneNumber` - Sequence (1, 2, 3...)
- `paymentPercentage` - Percentage (50.00)
- `paymentAmount` - Calculated amount (Rp 10,500,000)
- `nameId` - Indonesian name ("DP", "Tahap 1", "Pelunasan")
- `name` - English name ("Down Payment", "Phase 1", "Final Payment")
- `isInvoiced` - Invoice generated flag

**Invoice Model:**
- `quotationId` - Reference to parent quotation
- `paymentMilestoneId` - Which milestone this invoice is for
- `amountPerProject` - This invoice amount (milestone amount)
- `totalAmount` - This invoice total (with tax if applicable)

### Current Data Loading (REQUIRES MINOR UPDATE ⚠️)

**Location:** `backend/src/modules/invoices/invoices.service.ts:399-436`

The `findOne()` method currently loads:
```typescript
{
  client: true,
  project: true,
  quotation: {
    include: {
      paymentMilestones: true,
      invoices: {
        where: { status: 'PAID' },
        select: {
          id: true,
          totalAmount: true,  // ⚠️ ONLY these fields loaded
        }
      }
    }
  },
  paymentMilestone: true
}
```

**⚠️ ISSUE:** The `quotation.invoices` select is TOO LIMITED. We need:
- `invoiceNumber` (for display in PDF)
- `status` (for filtering - already filtered but good to have)
- `paymentMilestone` relation (for milestone number and name)

**REQUIRED BACKEND CHANGE:**
Update the `select` clause in `invoices.service.ts:412-415` to include additional fields needed for PDF display.

## Implementation Strategy

### Phase 0: Fix Data Loading (PREREQUISITE)

**File to Modify:** `backend/src/modules/invoices/invoices.service.ts`
**Lines:** 408-416

**Current Code:**
```typescript
invoices: {
  where: {
    status: 'PAID',
  },
  select: {
    id: true,
    totalAmount: true,
  },
},
```

**Updated Code:**
```typescript
invoices: {
  where: {
    status: 'PAID',
  },
  select: {
    id: true,
    invoiceNumber: true,
    totalAmount: true,
    status: true,
    paymentMilestone: {
      select: {
        milestoneNumber: true,
        name: true,
        nameId: true,
      },
    },
  },
},
```

**⚠️ IMPORTANT:** Prisma does NOT allow both `select` and `include` at the same level. Use nested `select` instead.

**Why This Change:**
- Needed for displaying invoice numbers in "Previous Payments" section
- Needed for milestone details in payment breakdown
- No performance impact (adds ~3 fields to already filtered result)

### Phase 1: PDF Template Modification

**File to Modify:** `backend/src/modules/pdf/pdf.service.ts:174-890`

**Current Summary Section (Lines 820-853):**
```typescript
<div class="summary-section">
  <table class="summary-table">
    <tr>
      <td>Subtotal</td>
      <td>${formatIDR(subTotal)}</td>  // ❌ Uses invoice.amountPerProject
    </tr>
    ${includeTax ? `
    <tr>
      <td>Tax (${taxLabel} ${Math.round(taxRate * 100)}%)</td>
      <td>${formatIDR(taxAmount)}</td>
    </tr>
    ` : ""}
    <tr class="summary-total">
      <td>TOTAL${paymentMilestone ? ` (Milestone ${paymentMilestone.milestoneNumber}...)` : ''}</td>
      <td>${formatIDR(finalTotal)}</td>
    </tr>
  </table>
</div>
```

**New Summary Section (Multi-scenario support):**

```typescript
<div class="summary-section">
  <table class="summary-table">

    <!-- SCENARIO 1: Milestone-based invoice -->
    ${paymentMilestone && quotation ? `
      <!-- Full Project Subtotal -->
      <tr>
        <td>Subtotal (Full Project)</td>
        <td>${formatIDR(quotation.totalAmount)}</td>
      </tr>

      <!-- This Milestone -->
      <tr>
        <td>Milestone ${paymentMilestone.milestoneNumber} - ${paymentMilestone.nameId || paymentMilestone.name} (${paymentMilestone.paymentPercentage}%)</td>
        <td>${formatIDR(paymentMilestone.paymentAmount)}</td>
      </tr>

      <!-- Tax if applicable -->
      ${includeTax ? `
      <tr>
        <td>Tax (${taxLabel} ${Math.round(taxRate * 100)}%)</td>
        <td>${formatIDR(taxAmount)}</td>
      </tr>
      ` : ""}

      <!-- Calculate previous payments from other PAID invoices -->
      ${(() => {
        const previousInvoices = quotation.invoices?.filter(inv =>
          inv.id !== invoiceData.id &&
          inv.status === 'PAID' &&
          inv.paymentMilestone?.milestoneNumber < paymentMilestone.milestoneNumber
        ) || [];

        const previousPaymentsTotal = previousInvoices.reduce((sum, inv) =>
          sum + Number(inv.totalAmount), 0
        );

        if (previousPaymentsTotal > 0) {
          return `
          <tr style="border-top: 2px solid #e5e7eb;">
            <td>Previous Payments</td>
            <td>${formatIDR(previousPaymentsTotal)}</td>
          </tr>
          ${previousInvoices.map(inv => `
          <tr style="font-size: 8px; color: #6b7280;">
            <td>&nbsp;&nbsp;↳ ${inv.invoiceNumber} - Milestone ${inv.paymentMilestone?.milestoneNumber}</td>
            <td>${formatIDR(inv.totalAmount)}</td>
          </tr>
          `).join('')}
          `;
        }
        return '';
      })()}

      <!-- Total Due for this invoice -->
      <tr class="summary-total">
        <td>TOTAL DUE (This Invoice)</td>
        <td>${formatIDR(finalTotal)}</td>
      </tr>

      <!-- Remaining balance calculation -->
      ${(() => {
        const paidInvoicesTotal = quotation.invoices?.reduce((sum, inv) =>
          inv.status === 'PAID' ? sum + Number(inv.totalAmount) : sum, 0
        ) || 0;
        const remainingBalance = Number(quotation.totalAmount) - paidInvoicesTotal - Number(finalTotal);

        if (remainingBalance > 0) {
          return `
          <tr style="background-color: #fffbeb; border-top: 1px solid #f59e0b;">
            <td style="color: #92400e; font-weight: 600;">Remaining Receivable</td>
            <td style="color: #92400e; font-weight: 600;">${formatIDR(remainingBalance)}</td>
          </tr>
          `;
        }
        return '';
      })()}

    <!-- SCENARIO 2: Non-milestone invoice (fallback to current behavior) -->
    ` : `
      <tr>
        <td>Subtotal</td>
        <td>${formatIDR(subTotal)}</td>
      </tr>
      ${includeTax ? `
      <tr>
        <td>Tax (${taxLabel} ${Math.round(taxRate * 100)}%)</td>
        <td>${formatIDR(taxAmount)}</td>
      </tr>
      ` : ""}
      <tr class="summary-total">
        <td>TOTAL</td>
        <td>${formatIDR(finalTotal)}</td>
      </tr>
    `}

  </table>
</div>
```

### Key Logic Breakdown

**1. Full Project Subtotal:**
```typescript
quotation.totalAmount  // Already loaded, no query needed
```

**2. Previous Payments Calculation:**
```typescript
const previousInvoices = quotation.invoices?.filter(inv =>
  inv.id !== invoiceData.id &&           // Not this invoice
  inv.status === 'PAID' &&               // Only PAID invoices
  inv.paymentMilestone?.milestoneNumber < paymentMilestone.milestoneNumber  // Earlier milestones
) || [];

const previousPaymentsTotal = previousInvoices.reduce((sum, inv) =>
  sum + Number(inv.totalAmount), 0
);
```

**3. Remaining Balance:**
```typescript
const paidInvoicesTotal = quotation.invoices?.reduce((sum, inv) =>
  inv.status === 'PAID' ? sum + Number(inv.totalAmount) : sum, 0
) || 0;

const remainingBalance = Number(quotation.totalAmount) - paidInvoicesTotal - Number(finalTotal);
```

## Implementation Steps

### Step 0: Update Invoice Service Data Loading (REQUIRED FIRST)
**File:** `backend/src/modules/invoices/invoices.service.ts`
**Lines:** 408-416

**Action:** Replace the `select` with `include` + expanded select to include:
- `invoiceNumber` (for display)
- `status` (for clarity, already filtered)
- `paymentMilestone` relation with fields

**Validation:** After change, verify in console/logs that `quotation.invoices[0]` includes all needed fields.

### Step 1: Modify PDF Service
**File:** `backend/src/modules/pdf/pdf.service.ts`
**Lines:** 820-853 (Summary section in `generateInvoiceHTML`)

1. Replace the summary section with the new multi-scenario template
2. Add logic for previous payments calculation
3. Add logic for remaining balance calculation
4. Ensure backward compatibility for non-milestone invoices

### Step 2: Add Helper Variables (OPTIONAL - Inline is Fine)
**Location:** `generateInvoiceHTML` function, before HTML template (around line 220)

**NOTE:** Helper variables can be calculated inline within the template. This step is OPTIONAL for cleaner code but NOT required.

```typescript
// Calculate previous milestone payments
const previousMilestonePayments = paymentMilestone && quotation ?
  (quotation.invoices || [])
    .filter(inv =>
      inv.id !== invoiceData.id &&
      inv.status === 'PAID' &&
      inv.paymentMilestone?.milestoneNumber < paymentMilestone.milestoneNumber
    )
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
  : 0;

// Calculate remaining balance
const remainingBalance = paymentMilestone && quotation ?
  Number(quotation.totalAmount) -
  (quotation.invoices || []).reduce((sum, inv) =>
    inv.status === 'PAID' ? sum + Number(inv.totalAmount) : sum, 0
  ) -
  Number(finalTotal)
  : 0;
```

### Step 3: Testing Scenarios

**Test Case 1: Milestone 1 Invoice (No previous payments)**
- ✅ Expected: Show full project subtotal (Rp 21,000,000)
- ✅ Expected: Show milestone 1 amount (Rp 10,500,000)
- ✅ Expected: No "Previous Payments" section displayed
- ✅ Expected: Show remaining balance (Rp 10,500,000)
- ✅ Expected: Invoice status = DRAFT or SENT (not yet paid)

**Test Case 2: Milestone 2 Invoice (After milestone 1 paid)**
- ✅ Expected: Show full project subtotal (Rp 21,000,000)
- ✅ Expected: Show milestone 2 amount (Rp 10,500,000)
- ✅ Expected: Show "Previous Payments" section with milestone 1 invoice number
- ✅ Expected: Show remaining balance (Rp 0 for 50-50)
- ✅ Expected: Previous payment detail line shows: "Invoice-001 - Milestone 1"

**Test Case 3: Non-milestone Invoice (Legacy/Manual)**
- ✅ Expected: Fallback to current behavior (simple subtotal + total)
- ✅ Expected: No milestone-specific sections
- ✅ Expected: No errors or missing data

**Test Case 4: Milestone with Tax (11% PPN)**
- ✅ Expected: Tax calculated on milestone amount only (not full project)
- ✅ Expected: Clear display: Subtotal (Full) → Milestone Amount → Tax (on milestone) → Total Due
- ✅ Example: Milestone Rp 10,500,000 → Tax Rp 1,155,000 → Total Due Rp 11,655,000

**Test Case 5: 3-Milestone Project (30-40-30 split)**
- ✅ Expected: Milestone 2 shows payment from Milestone 1
- ✅ Expected: Milestone 3 shows combined payments from Milestone 1 + 2
- ✅ Expected: Final remaining balance = 0 after all milestones

## Benefits of This Approach

### ✅ Efficiency
- **Minimal backend changes** - only expand existing data select (1 change)
- **No NEW database queries added** - uses existing query structure
- **Minimal code changes** - backend (1 select update) + PDF template
- **No breaking changes** - backward compatible with non-milestone invoices

### ✅ Clarity for Customers
- Clear distinction between full project and milestone amount
- Transparent payment progress tracking
- Easy-to-understand remaining balance
- Professional presentation

### ✅ Business Requirements Met
- Shows full project scope (Subtotal)
- Shows milestone percentage and amount
- Shows payment history (previous milestones)
- Shows remaining receivable

### ✅ Maintainability
- Self-contained logic in PDF template
- Easy to modify display format
- No complex backend business logic
- Clear separation of concerns

## Risk Assessment

### Low Risk ✅
- **No database schema changes** - uses existing structure
- **No API changes** - same endpoints
- **No data migration needed** - works with current data
- **No frontend changes** - only PDF generation affected

### Potential Issues (Mitigated)
1. **Tax calculation on milestone:** ✅ Tax applied to milestone amount only (already correct)
2. **Status filtering:** ✅ Only PAID invoices counted in previous payments
3. **Milestone ordering:** ✅ Uses milestoneNumber for correct sequencing
4. **Non-milestone invoices:** ✅ Fallback to current behavior
5. **Prisma select/include conflict:** ✅ Fixed - use nested select for relations
6. **Current invoice in calculations:** ✅ Filtered out using `inv.id !== invoiceData.id`
7. **Null/undefined quotation:** ✅ Conditional rendering with `paymentMilestone && quotation`
8. **Edge case - SENT status invoices:** ⚠️ Currently only PAID counted; SENT invoices excluded from previous payments (intentional - only confirmed payments count)

## Estimated Implementation Time

- **Step 0 - Backend data loading fix:** 10 minutes
- **Step 1 - PDF template changes:** 30 minutes
- **Step 2 - Optional helper variables:** 10 minutes (if used)
- **Testing (5 scenarios):** 60 minutes
- **PDF visual verification:** 20 minutes
- **Total:** ~120 minutes (2 hours)

## Success Criteria

1. ✅ Milestone 1 PDF shows full project subtotal correctly (full quotation amount)
2. ✅ Milestone 2 PDF shows previous payments with invoice numbers from Milestone 1
3. ✅ Remaining balance calculates correctly across all milestone scenarios
4. ✅ Non-milestone invoices still work (backward compatible - fallback behavior)
5. ✅ Tax calculations remain accurate (applied to milestone amount only)
6. ✅ No performance degradation (minimal query expansion, no new queries)
7. ✅ Invoice numbers display correctly in "Previous Payments" breakdown
8. ✅ All 5 test cases pass validation

## Future Enhancements (Optional)

1. **Payment Schedule Table:** Show all milestones with status
2. **Visual Progress Bar:** Graphical representation of payment progress
3. **Multi-currency Support:** For international projects
4. **Installment Plan Details:** Add timeline/due dates for remaining milestones

---

## Implementation Checklist

- [x] **Step 0:** Update `invoices.service.ts` line 408-416 to expand invoice data select ✅ COMPLETED
- [x] **Step 1:** Replace PDF summary section in `pdf.service.ts` line 820-853 ✅ COMPLETED
- [ ] **Step 2:** (Optional) Add helper variables for cleaner code - SKIPPED (inline logic used)
- [ ] **Test Case 1:** Verify Milestone 1 invoice (no previous payments)
- [ ] **Test Case 2:** Verify Milestone 2 invoice (with previous payment from M1)
- [ ] **Test Case 3:** Verify non-milestone invoice (backward compatibility)
- [ ] **Test Case 4:** Verify milestone with tax calculation
- [ ] **Test Case 5:** Verify 3-milestone project scenario
- [ ] **Visual Check:** PDF layout, formatting, alignment in both modes (continuous/paginated)
- [ ] **Regression Test:** Verify existing invoices still generate correctly

---

**Status:** ✅ IMPLEMENTATION COMPLETED (2025-11-06)
**Priority:** High (Customer clarity issue)
**Complexity:** Low (2 file changes - 1 backend select, 1 PDF template)
**Risk:** Minimal (No schema changes, backward compatible)
**Estimated Effort:** 2 hours (including testing)

---

## Implementation Summary (2025-11-06)

### ✅ Phase 0 - Data Loading (COMPLETED)
**File:** `backend/src/modules/invoices/invoices.service.ts:408-424`
**Changes:**
- Expanded `quotation.invoices` select to include:
  - `invoiceNumber` (for display in Previous Payments)
  - `status` (for filtering clarity)
  - `paymentMilestone` relation with `milestoneNumber`, `name`, `nameId`

### ✅ Phase 1 - PDF Template (COMPLETED)
**File:** `backend/src/modules/pdf/pdf.service.ts:820-934`
**Changes:**
- Replaced simple summary section with multi-scenario template
- **Scenario 1 (Milestone Invoice):**
  - Shows "Subtotal (Full Project)" using `quotation.totalAmount`
  - Shows milestone details with percentage and amount
  - Calculates and displays previous PAID milestone payments with invoice numbers
  - Shows "TOTAL DUE (This Invoice)"
  - Calculates and displays "Remaining Receivable" if applicable
- **Scenario 2 (Non-Milestone Invoice):**
  - Falls back to original simple display (backward compatible)
  - Shows Subtotal → Tax (if applicable) → TOTAL

### Key Features Implemented:
1. ✅ Full project subtotal always visible for milestone invoices
2. ✅ Clear milestone breakdown with percentage
3. ✅ Previous payments tracking with invoice numbers
4. ✅ Remaining balance calculation
5. ✅ Backward compatibility for non-milestone invoices
6. ✅ Tax exempt reason support maintained
7. ✅ Inline logic (no helper variables needed)

### Next Steps:
- Testing required (see checklist above for 5 test cases)
- Visual verification in both continuous and paginated PDF modes
- Regression testing for existing invoices
