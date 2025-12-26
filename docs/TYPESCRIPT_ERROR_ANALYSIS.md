# TypeScript Error Analysis & Fix Plan

**Date:** 2025-11-11
**Status:** 🔍 Analysis Complete - Ready to Fix

---

## Error Summary

Total errors: **~100+** across multiple categories
**Root causes identified:** 5 main categories

---

## Category 1: Function Signature Mismatches (CRITICAL)

### Error: `downloadSingleMedia` expects 2 arguments
**Files Affected:**
- `ContentPreviewModal.tsx` (lines 83, 184, 448)

**Function Signature:**
```typescript
// zipDownload.ts
export async function downloadSingleMedia(
  url: string,
  fileName: string
): Promise<void>
```

**Current Incorrect Calls:**
```typescript
// Passing entire media object (WRONG)
downloadSingleMedia(content.media[currentSlide]);
```

**Fix Required:**
```typescript
// Pass url and fileName separately (CORRECT)
const media = content.media[currentSlide];
downloadSingleMedia(media.url, media.originalName || `media-${currentSlide + 1}`);
```

**Root Cause:** API changed to require explicit fileName parameter for server filename detection

---

## Category 2: Type Imports from utils/date (FIXED)

### Error: Malformed import statements
**Files Affected:**
- ✅ `AccessibilityTester.tsx` (FIXED)
- ✅ `businessJourneyUtils.ts` (FIXED)
- ✅ `PerformanceMonitoringDashboard.tsx` (FIXED)
- ✅ `ActionableError.tsx` (FIXED)
- ✅ `AccessibilityContext.tsx` (FIXED)

**Problem:**
```typescript
// WRONG: import statement inserted inside another import
import {
import { now } from '../../utils/date'
  SomeType,
} from './somewhere'
```

**Fix Applied:**
```typescript
// CORRECT: Separate imports
import { SomeType } from './somewhere'
import { now } from '../../utils/date'
```

**Status:** ✅ Already fixed in previous step

---

## Category 3: setState Type Mismatches

### Error 3.1: JournalLineItemsEditor setState issues
**File:** `frontend/src/components/accounting/JournalLineItemsEditor.tsx`
**Lines:** 123, 133, 143, 166

**Error:**
```
Argument of type '(prevValue: any) => any[]' is not assignable to parameter of type 'JournalLineItemFormData[]'
Parameter 'prevValue' implicitly has an 'any' type.
```

**Root Cause:**
- setState updater function parameter not typed
- Should be: `(prevValue: JournalLineItemFormData[]) => JournalLineItemFormData[]`

**Fix:**
```typescript
// BEFORE:
setValue((prevValue) => [...prevValue, newItem]);

// AFTER:
setValue((prevValue: JournalLineItemFormData[]) => [...prevValue, newItem]);
```

### Error 3.2: PriceInheritanceFlow setState
**File:** `frontend/src/components/forms/PriceInheritanceFlow.tsx`
**Line:** 217

**Error:**
```
Type '(prev: UserTestingMetrics) => {...}' is not assignable to parameter of type 'SetStateAction<Partial<UserTestingMetrics>>'
Type 'Partial<UserTestingMetrics>' is not assignable to type 'UserTestingMetrics'
```

**Root Cause:** State is `Partial<UserTestingMetrics>` but updater expects full `UserTestingMetrics`

**Fix:** Either:
1. Change state type to `UserTestingMetrics` (not `Partial<>`)
2. Or ensure updater returns `Partial<UserTestingMetrics>`

---

## Category 4: undefined vs string Type Mismatches

### Error 4.1: MilestoneProgress string | undefined
**File:** `frontend/src/components/invoices/MilestoneProgress.tsx`
**Lines:** 140, 152

**Error:**
```
Argument of type 'string | undefined' is not assignable to parameter of type 'string'
Type 'undefined' is not assignable to type 'string'
```

**Fix:**
```typescript
// BEFORE:
someFunction(value); // value: string | undefined

// AFTER:
someFunction(value || ''); // Provide fallback
// OR
if (value) someFunction(value); // Guard check
```

### Error 4.2: PaymentMilestoneForm Key type
**File:** `frontend/src/components/quotations/PaymentMilestoneForm.tsx`
**Lines:** 196, 207, 221, 236

**Error:**
```
Type 'number | undefined' is not assignable to type 'Key'
Type 'undefined' is not assignable to type 'Key'
```

**Fix:**
```typescript
// BEFORE:
key={item.id} // id might be undefined

// AFTER:
key={item.id ?? `fallback-${index}`} // Nullish coalescing
```

---

## Category 5: Type Definition Mismatches

### Error 5.1: ProjectMilestoneItem vs ProjectMilestone
**File:** `frontend/src/components/projects/MilestoneManagementPanel.tsx`
**Lines:** 341, 342

**Error:**
```
Type 'ProjectMilestone[]' is not assignable to type 'ProjectMilestoneItem[]'
Property 'status' are incompatible
Type '"ACCEPTED"' is not assignable to type '"PENDING" | "IN_PROGRESS" | "COMPLETED"'
```

**Root Cause:** Two different milestone type definitions with incompatible status enums

**Fix:** Either:
1. Unify types to single source of truth
2. Create mapper function to convert between types
3. Extend ProjectMilestoneItem to include "ACCEPTED" | "BILLED" statuses

### Error 5.2: BusinessEntity Type Mismatches
**Files:** Multiple accounting pages
- `ARAgingPage.tsx`, `APAgingPage.tsx`, `ECLProvisionPage.tsx`, `IncomeStatementPage.tsx`

**Error:**
```
Type '{ id, number, title, ... }' is missing properties from type 'BusinessEntity': amount, client, createdAt, updatedAt
```

**Root Cause:** Creating ad-hoc objects that don't match BusinessEntity interface

**Fix:** Either:
1. Add missing properties
2. Create new interface for these specific use cases
3. Make BusinessEntity properties optional

---

## Category 6: Property Access Errors

### Error 6.1: ContentCalendarItem missing properties
**File:** `frontend/src/utils/pdfExport.ts`
**Lines:** 36, 39 (multiple)

**Error:**
```
Property 'title' does not exist on type 'ContentCalendarItem'
Property 'description' does not exist on type 'ContentCalendarItem'
```

**Fix:** Check ContentCalendarItem interface and either:
1. Add missing properties
2. Use correct property names (e.g., `caption` instead of `title`)

### Error 6.2: JournalEntry missing properties
**File:** `frontend/src/pages/accounting/JournalEntriesPage.tsx`
**Line:** 98

**Error:**
```
Type 'JournalEntry' is missing properties: totalDebit, totalCredit, isBalanced, isAutomatic
```

**Fix:** Check if JournalEntry interface has these properties or if mapper needs updating

### Error 6.3: Error object missing 'response' property
**Files:** Multiple accounting pages
**Example:** `JournalEntriesPage.tsx:182, 197, 210`

**Error:**
```
Property 'response' does not exist on type 'Error'
```

**Fix:**
```typescript
// BEFORE:
catch (error) {
  if (error.response) { ... }
}

// AFTER:
catch (error: any) {
  if (error.response) { ... }
}
// OR use type guard:
catch (error) {
  if (error instanceof AxiosError && error.response) { ... }
}
```

---

## Category 7: Ant Design Theme Type Issues

### Error: SeedToken not exported
**File:** `frontend/src/components/content-calendar/KanbanBoardView.tsx`
**Line:** 200

**Error:**
```
Namespace has no exported member 'SeedToken'
```

**Fix:** Update import to use correct Ant Design theme types:
```typescript
// BEFORE:
import { SeedToken } from 'antd/es/theme/interface'

// AFTER:
import type { AliasToken } from 'antd/es/theme/interface'
// OR
const { token } = theme.useToken(); // Use token directly
```

---

## Fix Priority & Order

### HIGH PRIORITY (Breaks functionality)
1. ✅ Import statement errors (DONE)
2. 🔴 `downloadSingleMedia` signature mismatch (ContentPreviewModal)
3. 🔴 Missing properties in ContentCalendarItem (pdfExport.ts)

### MEDIUM PRIORITY (Type safety)
4. 🟡 setState type annotations (JournalLineItemsEditor, PriceInheritanceFlow)
5. 🟡 undefined handling (MilestoneProgress, PaymentMilestoneForm)
6. 🟡 Error object type assertions

### LOW PRIORITY (Can suppress or fix gradually)
7. 🟢 BusinessEntity type mismatches (accounting pages)
8. 🟢 JournalEntry type mismatches
9. 🟢 ProjectMilestone type unification
10. 🟢 Ant Design theme type updates

---

## Recommended Approach

### Step 1: Fix Critical Errors (Breaks builds)
- ContentPreviewModal downloadSingleMedia calls
- pdfExport.ts ContentCalendarItem property access

### Step 2: Fix Type Annotations (Easy wins)
- Add type annotations to setState updaters
- Add nullish coalescing operators
- Type assertion for Error objects

### Step 3: Fix Structural Issues (Requires design decisions)
- Unify milestone type definitions
- Fix BusinessEntity usage or create new interfaces
- Update Ant Design theme imports

### Step 4: Test & Verify
- Run `npm run type-check` after each category
- Verify no regressions
- Document any intentional type assertions

---

## Commands for Testing

```bash
# Full type check
docker compose -f docker-compose.dev.yml exec app sh -c "cd frontend && npm run type-check"

# Check specific file
docker compose -f docker-compose.dev.yml exec app sh -c "cd frontend && npx tsc --noEmit src/components/content-calendar/ContentPreviewModal.tsx"

# Build (includes type checking)
docker compose -f docker-compose.dev.yml exec app sh -c "cd frontend && npm run build"
```

---

## Next Steps

1. Fix downloadSingleMedia calls in ContentPreviewModal (3 locations)
2. Check ContentCalendarItem interface and fix pdfExport.ts
3. Add type annotations to setState calls
4. Handle undefined cases with nullish coalescing
5. Run type-check to verify fixes
6. Create follow-up tickets for structural type refactoring

---

**Analysis Time:** 30 minutes
**Estimated Fix Time:**
- Critical: 15 minutes
- Medium: 30 minutes
- Low: 1-2 hours (can be deferred)

**Total TypeScript errors to fix:** ~100+
**Can fix immediately:** ~30-40 (critical + medium priority)
**Can defer:** ~60-70 (low priority, don't break functionality)
