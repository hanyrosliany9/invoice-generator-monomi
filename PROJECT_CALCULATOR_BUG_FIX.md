# Project Calculator - Bug Fix Report

**Date:** October 20, 2025
**Issue:** 400 Bad Request when calculating projections from frontend
**Status:** ✅ FIXED

---

## Problem Description

When users opened the Create Project page, the projection calculator immediately threw a 400 Bad Request error:

```
POST http://localhost:3000/api/v1/projects/calculate-projection 400 (Bad Request)
Failed to calculate projection: AxiosError
```

---

## Root Cause Analysis

### Backend Error Details
From backend logs:
```
Request body: {
  "products": [
    {
      "name": "",
      "description": "",
      "price": 0,
      "quantity": 1
    }
  ],
  "estimatedExpenses": []
}

Validation failed: {
  general: 'products.0.Harga item harus lebih dari 0'
}
```

### Why This Happened

1. **Form Initialization**: The ProjectCreatePage initializes with one empty product row by default:
   ```typescript
   initialValue={[
     { name: '', description: '', price: 0, quantity: 1 }
   ]}
   ```

2. **Debounced Calculation**: The `useEffect` hook triggers projection calculation whenever products or expenses change:
   ```typescript
   useEffect(() => {
     if (products && products.length > 0) {
       calculateProjectionDebounced(products, estimatedExpenses || [])
     }
   }, [products, estimatedExpenses, calculateProjectionDebounced])
   ```

3. **Validation Rejection**: The backend DTO validation correctly rejects `price: 0`:
   ```typescript
   @Transform(({ value }) => parseFloat(value))
   @IsPositive({ message: "Harga item harus lebih dari 0" })
   price: number;
   ```

4. **Result**: Empty form data was sent to API → validation failed → 400 error

---

## Solution Implemented

### Fix Location
File: `frontend/src/pages/ProjectCreatePage.tsx`

### Changes Made

#### 1. Added Validation Filter to Debounced Calculation
**Before:**
```typescript
const calculateProjectionDebounced = useCallback(
  debounce(async (products: ProductItem[], expenses: EstimatedExpense[]) => {
    if (!products || products.length === 0) {
      setProjection(null)
      return
    }

    setCalculatingProjection(true)
    try {
      const result = await projectService.calculateProjection({
        products,
        estimatedExpenses: expenses || [],
      })
      setProjection(result)
    } catch (error) {
      console.error('Failed to calculate projection:', error)
      setProjection(null)
    } finally {
      setCalculatingProjection(false)
    }
  }, 500),
  []
)
```

**After:**
```typescript
const calculateProjectionDebounced = useCallback(
  debounce(async (products: ProductItem[], expenses: EstimatedExpense[]) => {
    // ✅ Filter out incomplete/invalid products
    const validProducts = (products || []).filter(
      (p) => p.name && p.description && p.price > 0 && p.quantity > 0
    )

    // ✅ Filter out incomplete/invalid expenses
    const validExpenses = (expenses || []).filter(
      (e) => e.categoryId && e.amount > 0
    )

    // ✅ Need at least one valid product to calculate
    if (validProducts.length === 0) {
      setProjection(null)
      return
    }

    setCalculatingProjection(true)
    try {
      const result = await projectService.calculateProjection({
        products: validProducts,
        estimatedExpenses: validExpenses,
      })
      setProjection(result)
    } catch (error) {
      console.error('Failed to calculate projection:', error)
      setProjection(null)
    } finally {
      setCalculatingProjection(false)
    }
  }, 500),
  []
)
```

#### 2. Added Same Filter to Form Submission
Applied the same validation filter to:
- `handleSubmit()` - Create project
- `handleSaveAndCreateQuotation()` - Create project + quotation

---

## Validation Rules

Products are considered **valid** when:
- ✅ `name` is not empty
- ✅ `description` is not empty
- ✅ `price` > 0
- ✅ `quantity` > 0

Expenses are considered **valid** when:
- ✅ `categoryId` is not empty
- ✅ `amount` > 0

---

## Testing Results

### Before Fix
❌ Opening Create Project page → Immediate 400 error
❌ Cannot calculate projections
❌ Error displayed in console

### After Fix
✅ Opening Create Project page → No errors
✅ Empty form shows "Belum ada proyeksi" message
✅ Adding valid product → Projection calculates automatically after 500ms
✅ Removing product data → Projection clears gracefully
✅ Creating project with valid data → Success

---

## User Experience Flow (Fixed)

1. **User opens Create Project page**
   - Empty form displays
   - Projection card shows: "Belum ada proyeksi" (No projection yet)
   - ✅ No errors

2. **User starts filling product form**
   - Enters product name
   - Enters description
   - Enters price
   - ✅ Still no API call (data incomplete)

3. **User enters valid price**
   - All required fields now complete
   - After 500ms debounce delay
   - ✅ API call with valid data only
   - ✅ Projection displays

4. **User adds expense estimates**
   - Selects category
   - Enters amount
   - ✅ Projection recalculates with new data

5. **User submits form**
   - Only valid products/expenses sent to backend
   - ✅ Project created successfully

---

## Technical Details

### Filter Function
```typescript
// Products filter
const validProducts = (products || []).filter(
  (p) => p.name && p.description && p.price > 0 && p.quantity > 0
)

// Expenses filter
const validExpenses = (expenses || []).filter(
  (e) => e.categoryId && e.amount > 0
)
```

### Guard Clause
```typescript
// Prevent API call if no valid products
if (validProducts.length === 0) {
  setProjection(null)
  return
}
```

---

## Impact Assessment

### Files Changed
- ✅ `frontend/src/pages/ProjectCreatePage.tsx` (1 file)

### Lines Changed
- Added: ~30 lines (validation filters)
- Modified: 3 functions

### Backwards Compatibility
- ✅ Fully backwards compatible
- ✅ No database changes
- ✅ No API changes
- ✅ Only client-side validation logic

### Performance
- ✅ Reduced unnecessary API calls
- ✅ Prevents validation errors from reaching backend
- ✅ Better UX with graceful handling

---

## Additional Improvements Made

1. **Better Error Handling**
   - Gracefully shows empty state instead of error
   - User sees helpful message: "Tambahkan produk/layanan dan estimasi biaya untuk melihat proyeksi"

2. **Reduced API Load**
   - No API calls for incomplete data
   - Only valid data reaches backend
   - Debouncing prevents spam

3. **Improved UX**
   - Silent validation (no error messages for incomplete forms)
   - Real-time updates when data becomes valid
   - Clear visual feedback

---

## Verification Steps

To verify the fix:

1. ✅ Open Create Project page → No console errors
2. ✅ Leave form empty → Projection shows info message
3. ✅ Fill in partial product → No API call yet
4. ✅ Complete product fields → Projection calculates
5. ✅ Add expense → Projection updates
6. ✅ Submit form → Project created successfully

All tests passed ✅

---

## Lessons Learned

1. **Form Initialization**
   - Be careful with default/empty values in forms
   - Consider validation before auto-triggering API calls

2. **Validation Strategy**
   - Client-side validation should match backend validation
   - Filter invalid data before sending to API
   - Graceful handling is better than error messages

3. **Real-time Calculations**
   - Debouncing helps but needs proper guards
   - Check data validity before expensive operations
   - Empty states should be intentional, not accidental

---

## Status

**Bug Status:** ✅ RESOLVED
**Build Status:** ✅ Passing
**Testing Status:** ✅ Verified
**Deployment Status:** ✅ Ready for Production

---

**Fixed by:** Claude Code AI Assistant
**Fix Date:** October 20, 2025
**Verification:** Complete
