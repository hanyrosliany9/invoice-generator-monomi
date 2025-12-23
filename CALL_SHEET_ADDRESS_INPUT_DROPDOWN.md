# Call Sheet Address - Input + Dropdown Solution

**For:** Claude Haiku 4.5
**Priority:** CRITICAL

The Select/AutoComplete components don't work well for our use case. Let's use a simple **Input with a dropdown list below it**.

---

## Complete Solution

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

### Step 1: Replace the Select with Input + Dropdown List

**Find the Address section (around lines 554-600):**

```tsx
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
            <Select
              showSearch
              value={localAddress || undefined}
              ... everything until the closing />
            />
```

**Replace the entire Select with this Input + dropdown approach:**

```tsx
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
            <div style={{ position: 'relative' }}>
              <Input
                value={localAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalAddress(value);
                  if (value.length >= 3) {
                    handleAddressSearch(value);
                  } else {
                    setAddressOptions([]);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on dropdown option
                  setTimeout(() => {
                    setAddressOptions([]);
                    if (localAddress && localAddress !== callSheet?.locationAddress) {
                      updateMutation.mutate({ locationAddress: localAddress });
                    }
                  }, 200);
                }}
                placeholder="Start typing address... (e.g., 'Jakarta', 'Bandung')"
                style={{ width: '100%' }}
                suffix={addressSearching ? <Spin size="small" /> : null}
              />
              {/* Dropdown suggestions */}
              {addressOptions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: theme.colors.background.primary,
                    border: `1px solid ${theme.colors.border.default}`,
                    borderRadius: 4,
                    maxHeight: 200,
                    overflowY: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {addressOptions.map((option, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: index < addressOptions.length - 1 ? `1px solid ${theme.colors.border.default}` : 'none',
                        fontSize: 13,
                        color: theme.colors.text.primary,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur from firing first
                        setLocalAddress(option.value);
                        setAddressOptions([]);
                        updateMutation.mutate({ locationAddress: option.value });
                        // Auto-trigger weather/hospital auto-fill
                        setTimeout(() => {
                          if (!autoFillAllMutation.isPending) {
                            autoFillAllMutation.mutate();
                          }
                        }, 500);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = theme.colors.background.tertiary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ height: 12 }} /> {/* Spacer */}
```

---

### Step 2: Verify the handleAddressSearch function has console.log

Make sure the search function has the debug log (should already be there):

```tsx
const handleAddressSearch = (searchValue: string) => {
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }

  if (!searchValue || searchValue.length < 3) {
    setAddressOptions([]);
    setAddressSearching(false);
    return;
  }

  setAddressSearching(true);
  console.log('Starting address search for:', searchValue); // ADD THIS DEBUG LOG

  searchTimeoutRef.current = setTimeout(async () => {
    try {
      console.log('Making API request to Nominatim...'); // ADD THIS DEBUG LOG
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

      console.log('Address search results:', options); // Should already be here
      setAddressOptions(options);
    } catch (error) {
      console.error('Address search failed:', error);
      setAddressOptions([]);
    } finally {
      setAddressSearching(false);
    }
  }, 500);
};
```

---

### Step 3: Remove unused imports (optional cleanup)

If you switched from Select to Input, you can remove AutoComplete from imports since it's not used:

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
  Select,  // Keep if used elsewhere
  Dropdown,
  Tooltip,
  // AutoComplete,  // Remove if not used
} from 'antd';
```

---

## How This Works

1. **Regular Input** - User can type freely, no need to click dropdown first
2. **onChange triggers search** - Every keystroke updates localAddress and triggers search if >= 3 chars
3. **Custom dropdown** - Positioned absolutely below the input, shows suggestions
4. **onMouseDown** - Uses mouseDown instead of onClick to fire before onBlur
5. **Loading spinner** - Shows in input suffix while searching
6. **Auto-fill on select** - Clicking an option saves address and triggers auto-fill

---

## Testing

After implementing:

1. Type "Jakarta" in the ADDRESS field (not Location Name!)
2. Check browser console for:
   - "Starting address search for: Jakarta"
   - "Making API request to Nominatim..."
   - "Address search results: [...]"
3. Check Network tab for request to `nominatim.openstreetmap.org`
4. Should see dropdown with suggestions
5. Click suggestion → fills in + triggers auto-fill

---

## Why This Will Work

- **Input component** allows typing immediately (no click required)
- **Custom dropdown** is just styled divs, no complex component behavior
- **Clear debug logs** to trace exactly where things fail
- **onMouseDown** prevents race condition with onBlur
