# PDF Mode Toggle Bug Fix

## Issue Summary
When clicking "View PDF" from invoice/quotation/project detail pages, the PDF preview would default to paginated mode even though the "Digital View" button was selected in the UI.

## Root Cause Analysis

### The Bug
The issue was caused by React's `onClick` handler passing a `MouseEvent` object as the first parameter to the `handlePdfPreview` function, instead of a mode string.

### How It Manifested
1. User clicks "Preview PDF" button
2. React calls: `handlePdfPreview(MouseEvent)`
3. Function receives `MouseEvent` object as `mode` parameter
4. Code evaluated: `mode ?? 'continuous'`
5. Since `MouseEvent` is truthy (an object), `mode` was set to `MouseEvent`
6. Comparison: `MouseEvent === 'continuous'` → `false`
7. Backend received: `continuous=false` (paginated mode)
8. Result: Paginated PDF displayed despite "Digital View" being selected

### Why Segmented Control Worked
When user clicked the Segmented control toggle:
- Segmented onChange: `handlePdfPreview('continuous')` (passes string)
- Function receives string `'continuous'` as `mode` parameter
- Comparison works correctly
- Backend receives: `continuous=true`

## The Fix

### Before (Buggy Code)
```typescript
const handlePdfPreview = async (mode?: 'continuous' | 'paginated') => {
  const targetMode = mode ?? 'continuous'  // ❌ Accepts MouseEvent as truthy value
  setPdfMode(targetMode)

  const isContinuous = targetMode === 'continuous'  // ❌ Always false with MouseEvent
  const blob = await service.previewPDF(id, isContinuous)
}
```

### After (Fixed Code)
```typescript
const handlePdfPreview = async (mode?: 'continuous' | 'paginated') => {
  // Check if mode is actually a mode string (not a MouseEvent from onClick)
  const targetMode = (typeof mode === 'string' ? mode : undefined) ?? 'continuous'
  setPdfMode(targetMode)

  const isContinuous = targetMode === 'continuous'
  const blob = await service.previewPDF(id, isContinuous)
}
```

### How the Fix Works
The `typeof` check filters out non-string values:

**Button Click (MouseEvent passed):**
- `mode = MouseEvent`
- `typeof mode === 'string'` → `false`
- `undefined ?? 'continuous'` → `'continuous'` ✅
- Backend receives: `continuous=true` ✅

**Segmented Toggle (String passed):**
- `mode = 'paginated'`
- `typeof mode === 'string'` → `true`
- Uses the passed string value ✅
- Backend receives: `continuous=false` ✅

## Files Modified

1. `frontend/src/pages/InvoiceDetailPage.tsx` (line 298)
2. `frontend/src/pages/QuotationDetailPage.tsx` (line 291)
3. `frontend/src/pages/ProjectDetailPage.tsx` (line 224)

## Alternative Solutions Considered

### Option 1: Wrapper Function (Not chosen)
```typescript
onClick={() => handlePdfPreview()}  // Wrap in arrow function
```
**Pros:** Simple, explicit
**Cons:** Creates new function on every render (minor performance impact)

### Option 2: Type Guard (Chosen)
```typescript
const targetMode = (typeof mode === 'string' ? mode : undefined) ?? 'continuous'
```
**Pros:** Robust, handles any unexpected input, no performance impact
**Cons:** Slightly more complex

### Option 3: Event Type Check (Not chosen)
```typescript
if (mode && typeof mode === 'object' && 'preventDefault' in mode) {
  mode = undefined
}
```
**Pros:** Explicit MouseEvent detection
**Cons:** Too verbose, fragile to changes in event types

## Testing

### Test Cases
1. ✅ Click "View PDF" → Shows continuous PDF with "Digital View" selected
2. ✅ Click "Print Ready" toggle → Shows paginated PDF
3. ✅ Click "Digital View" toggle → Shows continuous PDF
4. ✅ Works on Invoice, Quotation, and Project detail pages

### Backend Logs Verification
```
Before fix:
GET /api/v1/pdf/invoice/.../preview?continuous=false  ❌

After fix:
GET /api/v1/pdf/invoice/.../preview?continuous=true   ✅
```

## Lessons Learned

1. **React onClick handlers always pass event objects** - Be explicit about parameter types
2. **TypeScript optional parameters can receive any value** - The `?` doesn't validate the type at runtime
3. **Always validate external inputs** - Even from trusted internal sources like event handlers
4. **Docker layer caching can mask issues** - Use `--no-cache` flag when debugging deployment issues

## Related Documentation

- [React Event Handlers](https://react.dev/learn/responding-to-events)
- [TypeScript Optional Parameters](https://www.typescriptlang.org/docs/handbook/2/functions.html#optional-parameters)
- [Ant Design Segmented Component](https://ant.design/components/segmented)

## Date
2025-11-06

## Author
Claude Code
