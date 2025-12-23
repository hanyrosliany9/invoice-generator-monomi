# Call Sheet Address Autocomplete Implementation Plan

**For:** Claude Haiku 4.5
**Date:** December 23, 2025
**Priority:** HIGH

---

## Summary

Add address autocomplete functionality to the call-sheet editor page. Currently, users must type the full address manually and buttons remain disabled. We need:

1. Address autocomplete dropdown (using Nominatim free API)
2. Remove dead "Preview" button from header
3. Auto-trigger weather/hospital fill after address selection

---

## Task 1: Install Dependency

```bash
cd frontend
npm install use-debounce
```

---

## Task 2: Remove Dead Preview Button

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

**Find and DELETE these lines (around line 313-316):**
```tsx
          <Button
            icon={<EyeOutlined />}
            onClick={() => {}}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}
          >
            Preview
          </Button>
```

**Reason:** Preview functionality is already inside the PDF export modal. This button does nothing.

---

## Task 3: Add Address Autocomplete

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

### Step 3.1: Add Imports

At the top of the file, add these imports:

```tsx
import { AutoComplete } from 'antd';  // Add to existing antd import
import { useDebouncedCallback } from 'use-debounce';
import axios from 'axios';
```

### Step 3.2: Add State

Inside the component function, add this state (after other useState declarations, around line 64):

```tsx
const [addressOptions, setAddressOptions] = useState<Array<{ value: string; label: string }>>([]);
const [addressSearching, setAddressSearching] = useState(false);
```

### Step 3.3: Add Debounced Search Handler

Add this function after the state declarations (before the useQuery hooks):

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
}, 1000); // 1-second debounce to respect Nominatim rate limit (1 req/sec)
```

### Step 3.4: Replace Address Input with AutoComplete

**Find this code (around lines 493-510):**
```tsx
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
            <Input.TextArea
              value={callSheet.locationAddress || ''}
              onChange={(e) => updateMutation.mutate({ locationAddress: e.target.value })}
              placeholder="Enter full address"
              rows={2}
              style={{ marginBottom: 12 }}
            />
```

**Replace with:**
```tsx
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
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

---

## Task 4: Verify AutoComplete Import

Make sure `AutoComplete` is imported from antd. The import line should look like:

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
  Spin,
  message,
  Form,
  Modal,
  Select,
  Dropdown,
  AutoComplete,  // <-- ADD THIS
} from 'antd';
```

---

## Expected Behavior After Implementation

1. **User types in address field** → After 3+ characters and 1 second delay, dropdown shows address suggestions from Nominatim
2. **User selects address from dropdown** → Address fills in, then auto-fill triggers automatically (fetches weather, sunrise/sunset, nearest hospital)
3. **Preview button removed** → Only "Export PDF" button remains in header (cleaner UI)
4. **Auto-fill buttons enabled** → Once address is filled, "Auto-Fill All Data" and "Auto-Fill Individual" buttons become clickable

---

## Testing Checklist

After implementation, test these scenarios:

- [ ] Type "Jakarta" → Should show Indonesian address suggestions
- [ ] Type "Bandung" → Should show Bandung locations
- [ ] Type "1600 Amphitheatre Parkway" → Should show Google HQ
- [ ] Select address from dropdown → Address fills in
- [ ] After selection → Auto-fill triggers automatically (weather, sun times, hospital)
- [ ] "Preview" button removed from header
- [ ] "Export PDF" button still works
- [ ] Manual typing still works (if user doesn't select from dropdown)

---

## Files Modified

1. `frontend/package.json` - Add `use-debounce` dependency
2. `frontend/src/pages/CallSheetEditorPage.tsx`:
   - Remove Preview button (lines ~313-316)
   - Add imports (AutoComplete, useDebouncedCallback, axios)
   - Add state (addressOptions, addressSearching)
   - Add handleAddressSearch function
   - Replace Input.TextArea with AutoComplete (lines ~497-503)

---

## API Used

**Nominatim (OpenStreetMap) - FREE, no API key required**
- Endpoint: `https://nominatim.openstreetmap.org/search`
- Rate limit: 1 request per second (handled by debounce)
- Returns: Array of address suggestions with display_name

---

## Notes

- The 1-second debounce is REQUIRED to respect Nominatim's rate limit policy
- User-Agent header is REQUIRED by Nominatim API policy
- AutoComplete wrapping Input.TextArea maintains multi-line capability
- Auto-fill triggers automatically after address selection for better UX
