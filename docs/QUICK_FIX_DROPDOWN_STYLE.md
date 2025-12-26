# Quick Fix: Ant Design dropdownStyle Deprecation Warning

**For:** Claude Haiku 4.5
**Priority:** LOW (warning only, not breaking)

---

## The Warning

```
Warning: [antd: AutoComplete] `dropdownStyle` is deprecated. Please use `styles.popup.root` instead.
```

---

## Fix

**File:** `frontend/src/pages/CallSheetEditorPage.tsx`

**Find this line (around line 545 in the AutoComplete component):**
```tsx
dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
```

**Replace with:**
```tsx
styles={{ popup: { root: { maxHeight: 300, overflow: 'auto' } } }}
```

---

## Full AutoComplete Component After Fix

The AutoComplete should look like this:

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
    updateMutation.mutate({ locationAddress: value });
    setTimeout(() => {
      if (!autoFillAllMutation.isPending) {
        autoFillAllMutation.mutate();
      }
    }, 500);
  }}
  onChange={(value) => {
    setLocalAddress(value);
  }}
  onBlur={() => {
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

---

## That's it!

Just a one-line change to fix the deprecation warning.
