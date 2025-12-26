# Call Sheet Address - FINAL FIX

**For:** Claude Haiku 4.5
**Priority:** CRITICAL

The AutoComplete component doesn't work well with async API calls. We'll use a simpler approach with `Select` in search mode.

---

## Complete Replacement Solution

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

### Step 1: Find and Replace the Address AutoComplete Section

**Find this entire block (around lines 542-579):**
```tsx
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
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
              styles={{ popup: { root: { maxHeight: 300, overflow: 'auto' } } }}
            />
```

**Replace with this simpler solution:**
```tsx
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
            <Select
              showSearch
              value={localAddress || undefined}
              placeholder="Start typing address... (e.g., 'Jakarta', 'Bandung')"
              style={{ width: '100%', marginBottom: 12 }}
              filterOption={false}
              onSearch={(value) => {
                setLocalAddress(value);
                if (value.length >= 3) {
                  handleAddressSearch(value);
                } else {
                  setAddressOptions([]);
                }
              }}
              onChange={(value) => {
                if (value) {
                  setLocalAddress(value);
                  updateMutation.mutate({ locationAddress: value });
                  setAddressOptions([]);
                  // Auto-trigger weather/hospital auto-fill
                  setTimeout(() => {
                    if (!autoFillAllMutation.isPending) {
                      autoFillAllMutation.mutate();
                    }
                  }, 500);
                }
              }}
              onBlur={() => {
                if (localAddress && localAddress !== callSheet?.locationAddress) {
                  updateMutation.mutate({ locationAddress: localAddress });
                }
              }}
              notFoundContent={addressSearching ? <Spin size="small" /> : (localAddress && localAddress.length >= 3 ? 'No results found' : 'Type at least 3 characters')}
              options={addressOptions}
              allowClear
              onClear={() => {
                setLocalAddress('');
                setAddressOptions([]);
                updateMutation.mutate({ locationAddress: '' });
              }}
            />
```

### Step 2: Update Imports

Make sure `Spin` is imported from antd. Find the antd import line and add `Spin` if not present:

```tsx
import {
  Layout,
  Typography,
  Button,
  Card,
  Space,
  Input,
  TimePicker,
  Tag,
  Divider,
  Empty,
  Spin,  // <-- Make sure this is here
  message,
  Form,
  Modal,
  Select,
  Dropdown,
  Tooltip,
  AutoComplete,  // Can remove this now since we're not using it
} from 'antd';
```

### Step 3: Update handleAddressSearch to NOT use debounce

The Select component already handles the typing smoothly. Let's simplify the search function.

**Find this function (around lines 75-108):**
```tsx
  // Address autocomplete search using Nominatim (free API)
  const handleAddressSearch = useDebouncedCallback(async (searchValue: string) => {
    if (!searchValue || searchValue.length < 3) {
      setAddressOptions([]);
      return;
    }

    setAddressSearching(true);
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchValue,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'invoice-generator-app/1.0 (Call Sheet Address Search)',
        },
      });

      const options = response.data.map((item: any) => ({
        value: item.display_name,
        label: item.display_name,
      }));

      setAddressOptions(options);
    } catch (error) {
      console.error('Address search failed:', error);
      setAddressOptions([]);
    } finally {
      setAddressSearching(false);
    }
  }, 1000);
```

**Replace with this (using a ref for debouncing):**
```tsx
  // Address autocomplete search using Nominatim (free API)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddressSearch = (searchValue: string) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchValue || searchValue.length < 3) {
      setAddressOptions([]);
      setAddressSearching(false);
      return;
    }

    setAddressSearching(true);

    // Debounce: wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: searchValue,
            format: 'json',
            limit: 5,
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'invoice-generator-app/1.0 (Call Sheet Address Search)',
          },
        });

        const options = response.data.map((item: any) => ({
          value: item.display_name,
          label: item.display_name,
        }));

        console.log('Address search results:', options); // Debug log
        setAddressOptions(options);
      } catch (error) {
        console.error('Address search failed:', error);
        setAddressOptions([]);
      } finally {
        setAddressSearching(false);
      }
    }, 500); // 500ms debounce
  };
```

### Step 4: Add useRef Import

Make sure `useRef` is imported:

```tsx
import { useState, useEffect, useRef } from 'react';
```

### Step 5: Remove use-debounce Import (Optional)

Since we're not using useDebouncedCallback anymore, you can remove this import:

```tsx
// Remove this line:
import { useDebouncedCallback } from 'use-debounce';
```

---

## Summary of Changes

1. Replace `AutoComplete` with `Select showSearch`
2. Use manual setTimeout debounce instead of useDebouncedCallback
3. Add `Spin` for loading indicator
4. Add `useRef` for timeout reference
5. Show debug log in console to verify API calls

---

## Why This Fix Works

1. **Select with showSearch** - Ant Design's Select handles typing much better than AutoComplete for async data
2. **filterOption={false}** - Tells Select we're providing our own options (from API)
3. **Manual debounce with setTimeout** - More reliable than useDebouncedCallback in this context
4. **500ms debounce** - Shorter than 1000ms, feels more responsive
5. **Loading spinner** - Shows user that search is in progress

---

## Testing

After implementing, open browser console (F12) and:

1. Type "Jakarta" in the address field
2. Should see "Address search results: [...]" in console after 500ms
3. Dropdown should appear with suggestions
4. Click a suggestion → address fills + auto-fill triggers

If you see the console log but no dropdown, it's a CSS/styling issue.
If you don't see the console log, the API call isn't happening.
