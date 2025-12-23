# Call Sheet Address Autocomplete - FIX PLAN

**For:** Claude Haiku 4.5
**Date:** December 23, 2025
**Priority:** CRITICAL - Fixing bugs from previous implementation

---

## Problems Identified

### Problem 1: EXTREME LAG when typing
**Cause:** The `onChange` handler calls `updateMutation.mutate()` on EVERY keystroke, sending an API request to the backend for each character typed.

**Current buggy code (line ~551-555):**
```tsx
onChange={(value) => {
  if (typeof value === 'string') {
    updateMutation.mutate({ locationAddress: value });  // ❌ VERY BAD - API call per keystroke!
  }
}}
```

### Problem 2: Dropdown not showing
**Cause:** `AutoComplete` wrapping `Input.TextArea` doesn't work properly. The dropdown positioning gets confused.

---

## Solution

1. Use **local state** to store the address while typing (no API calls during typing)
2. Only save to backend when user **selects from dropdown** or **blurs the input**
3. Use regular `Input` instead of `Input.TextArea` inside AutoComplete (or use AutoComplete alone)

---

## Implementation Steps

### Step 1: Add Local State for Address Input

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

Find the existing state declarations (around line 63-66):
```tsx
const [addressOptions, setAddressOptions] = useState<Array<{ value: string; label: string }>>([]);
const [addressSearching, setAddressSearching] = useState(false);
```

**Add this new state right after:**
```tsx
const [localAddress, setLocalAddress] = useState<string>('');
```

### Step 2: Initialize Local Address from CallSheet Data

Find the useEffect hooks area (or add a new one after the useQuery). Add this:

```tsx
// Sync local address state with callSheet data
useEffect(() => {
  if (callSheet?.locationAddress) {
    setLocalAddress(callSheet.locationAddress);
  }
}, [callSheet?.locationAddress]);
```

### Step 3: Replace the AutoComplete Component

**Find this code (around lines 536-564):**
```tsx
            <AutoComplete
              value={callSheet.locationAddress || ''}
              options={addressOptions}
              onSearch={handleAddressSearch}
              onSelect={(value) => {
                updateMutation.mutate({ locationAddress: value });
                setAddressOptions([]); // Clear suggestions after selection
                // Auto-trigger weather/hospital auto-fill after address selection
                setTimeout(() => {
                  if (!autoFillAllMutation.isPending) {
                    autoFillAllMutation.mutate();
                  }
                }, 500);
              }}
              onChange={(value) => {
                if (typeof value === 'string') {
                  updateMutation.mutate({ locationAddress: value });
                }
              }}
              placeholder="Start typing address... (e.g., 'Jakarta', 'Bandung')"
              style={{ width: '100%', marginBottom: 12 }}
              notFoundContent={addressSearching ? 'Searching...' : 'Type at least 3 characters'}
            >
              <Input.TextArea
                rows={2}
                placeholder="Start typing address..."
              />
            </AutoComplete>
```

**Replace with this fixed version:**
```tsx
            <AutoComplete
              value={localAddress}
              options={addressOptions}
              onSearch={(value) => {
                setLocalAddress(value);
                handleAddressSearch(value);
              }}
              onSelect={(value) => {
                setLocalAddress(value);
                setAddressOptions([]);
                // Save to backend
                updateMutation.mutate({ locationAddress: value });
                // Auto-trigger weather/hospital auto-fill after address selection
                setTimeout(() => {
                  if (!autoFillAllMutation.isPending) {
                    autoFillAllMutation.mutate();
                  }
                }, 500);
              }}
              onChange={(value) => {
                // Only update local state - NO API CALL HERE
                setLocalAddress(value);
              }}
              onBlur={() => {
                // Save to backend when user clicks away (if changed)
                if (localAddress !== callSheet?.locationAddress) {
                  updateMutation.mutate({ locationAddress: localAddress });
                }
              }}
              placeholder="Start typing address... (e.g., 'Jakarta', 'Bandung')"
              style={{ width: '100%', marginBottom: 12 }}
              notFoundContent={addressSearching ? 'Searching...' : 'Type at least 3 characters'}
              popupMatchSelectWidth={true}
              dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
            />
```

**Key changes:**
1. Uses `localAddress` instead of `callSheet.locationAddress` for the value
2. `onChange` only updates `localAddress` - NO API call
3. `onBlur` saves to backend when user clicks away
4. `onSelect` saves to backend AND triggers auto-fill
5. Removed `<Input.TextArea>` child - AutoComplete renders its own input
6. Added `popupMatchSelectWidth` and `dropdownStyle` for better dropdown visibility

---

### Step 4: Add Missing useEffect Import (if needed)

Make sure `useEffect` is imported at the top of the file:

```tsx
import { useState, useEffect } from 'react';
```

---

## Summary of Changes

| What | Before | After |
|------|--------|-------|
| Address value source | `callSheet.locationAddress` | `localAddress` (local state) |
| API calls while typing | Every keystroke (laggy!) | None |
| Save to backend | On every change | On select OR blur only |
| AutoComplete child | `Input.TextArea` (broken) | None (uses default input) |
| Dropdown visibility | Not showing | Should show properly |

---

## Testing Checklist

After implementing:

- [ ] Type "Jakarta" - NO LAG while typing
- [ ] After ~1 second, dropdown should appear with suggestions
- [ ] Click on a suggestion - address fills in + auto-fill triggers
- [ ] Type something and click away - address should save (onBlur)
- [ ] Weather, sun times, hospital should populate after selection

---

## Files to Modify

1. `frontend/src/pages/CallSheetEditorPage.tsx`
   - Add `localAddress` state
   - Add `useEffect` to sync with callSheet data
   - Replace AutoComplete component with fixed version

---

## Expected Outcome

**Before:**
- Typing causes lag (API call per keystroke)
- Dropdown doesn't appear
- Poor user experience

**After:**
- Smooth typing (no API calls during typing)
- Dropdown appears after 1 second with suggestions
- Select from dropdown → saves + auto-fills
- Click away → saves address to backend
