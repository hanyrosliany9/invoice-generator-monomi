# Snapshot Capture Context-Awareness Fix

**Date:** 2025-11-16
**Issue:** Error shown when exporting PDF from ReportDetailPage
**Status:** ✅ Fixed

---

## Problem

When clicking "Export PDF" from the **ReportDetailPage** (report overview page), the console showed an error:

```
Report canvas not found
Snapshot capture failed, falling back to calculation-based approach
```

This was confusing for users because:
1. The error made it seem like something was broken
2. The PDF generation actually worked fine (using fallback)
3. The snapshot capture is only meant for the **ReportBuilderPage** (visual builder)

---

## Root Cause

The visual builder to PDF parity feature has **two PDF generation modes**:

1. **Snapshot Mode** (100% parity) - Used when on ReportBuilderPage with `.report-canvas` element
2. **Calculation Mode** (fallback) - Used when on ReportDetailPage or when snapshot fails

The `generatePDF()` function **always** tried to capture a snapshot, regardless of which page the user was on. When called from ReportDetailPage (which doesn't have a `.report-canvas` element), it would:
1. Try to find the canvas → fail
2. Log an error message → confusing
3. Fall back to calculation mode → works fine

---

## Solution

Made the snapshot capture **context-aware** by checking if the canvas exists before attempting capture:

### Files Changed

**1. `frontend/src/utils/pdfSnapshot.ts`**

**Before:**
```typescript
export const captureReportSnapshot = (): ReportSnapshot | null => {
  const canvas = document.querySelector('.report-canvas');

  if (!canvas) {
    console.error('Report canvas not found');  // ❌ Error message
    return null;
  }
  // ...
}
```

**After:**
```typescript
export const captureReportSnapshot = (): ReportSnapshot | null => {
  const canvas = document.querySelector('.report-canvas');

  if (!canvas) {
    // ✅ Silently return null (user may be on detail page, not builder)
    return null;
  }
  // ...
}
```

**Added early check in `captureSnapshotSafe()`:**
```typescript
export const captureSnapshotSafe = async (): Promise<ReportSnapshot | null> => {
  // ✅ Check if canvas exists first
  const canvas = document.querySelector('.report-canvas');
  if (!canvas) {
    console.log('No visual builder canvas found - will use calculation-based PDF generation');
    return null;
  }

  console.log('Visual builder canvas found, capturing snapshot for pixel-perfect PDF...');
  // ... rest of capture logic
}
```

**2. `frontend/src/features/reports/contexts/ReportContext.tsx`**

**Before:**
```typescript
generatePDF: async () => {
  if (!id) return;

  console.log('Capturing HTML snapshot for PDF generation...');
  const snapshot = await captureSnapshotSafe();

  if (snapshot) {
    console.log('Snapshot captured, generating PDF with visual builder parity');
    await reportMutations.generatePDF.mutateAsync({ id, snapshot });
  } else {
    console.warn('Snapshot capture failed, falling back to calculation-based approach');  // ❌
    await reportMutations.generatePDF.mutateAsync({ id });
  }
}
```

**After:**
```typescript
generatePDF: async () => {
  if (!id) return;

  // ✅ Try to capture snapshot (silently returns null if not on builder page)
  const snapshot = await captureSnapshotSafe();

  if (snapshot) {
    console.log('✅ Generating PDF from visual builder snapshot (100% parity mode)');
    await reportMutations.generatePDF.mutateAsync({ id, snapshot });
  } else {
    console.log('📊 Generating PDF using calculation-based approach');
    await reportMutations.generatePDF.mutateAsync({ id });
  }
}
```

---

## New User Experience

### When on ReportDetailPage (Overview)
**Console Output:**
```
No visual builder canvas found - will use calculation-based PDF generation
📊 Generating PDF using calculation-based approach
```

✅ Clear, informative, not alarming

### When on ReportBuilderPage (Visual Builder)
**Console Output:**
```
Visual builder canvas found, capturing snapshot for pixel-perfect PDF...
Snapshot captured successfully: { htmlLength: 12345, ... }
✅ Generating PDF from visual builder snapshot (100% parity mode)
```

✅ Shows the snapshot mode is working

---

## Benefits

1. **No More Confusing Errors** - Users don't see error messages when using normal features
2. **Clear Mode Indication** - Console messages clearly show which PDF mode is being used
3. **Graceful Degradation** - Snapshot capture silently falls back when not applicable
4. **Better Developer Experience** - Easier to debug when issues actually occur

---

## Testing

### Test Case 1: Export from Detail Page
1. Navigate to `/social-media-reports/{reportId}`
2. Click "Export PDF" button
3. **Expected:**
   - Console: "No visual builder canvas found..."
   - PDF generates successfully using calculation mode
   - No error messages

### Test Case 2: Export from Builder Page
1. Navigate to `/social-media-reports/{reportId}/builder/{sectionId}`
2. Add some widgets to canvas
3. Click "Export PDF"
4. **Expected:**
   - Console: "Visual builder canvas found..."
   - Console: "Snapshot captured successfully..."
   - PDF generates with 100% parity to canvas
   - No error messages

---

## Implementation Status

✅ **COMPLETE**

- [x] Updated pdfSnapshot.ts to silently handle missing canvas
- [x] Added early canvas check in captureSnapshotSafe()
- [x] Improved console logging in ReportContext
- [x] Removed confusing error messages
- [x] Added clear mode indicators

---

**Last Updated:** 2025-11-16
