# Google Places Autocomplete Implementation Plan

**For:** Claude Haiku 4.5
**Priority:** HIGH
**Estimated Time:** 30 minutes

## Overview

Replace the current Nominatim-based address autocomplete with Google Places Autocomplete for better accuracy and UX in the Call Sheet Editor.

---

## Prerequisites (User Must Do First)

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable billing (required, but free tier is generous)

### Step 2: Enable APIs
1. Go to "APIs & Services" > "Library"
2. Search and enable:
   - **Places API**
   - **Maps JavaScript API**

### Step 3: Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Click "Edit API Key" to add restrictions:
   - **Application restrictions:** HTTP referrers
   - **Website restrictions:** Add your domains:
     - `http://localhost:3000/*`
     - `http://localhost:5173/*`
     - `https://yourdomain.com/*` (production)
   - **API restrictions:** Restrict to "Places API" and "Maps JavaScript API"
4. Copy the API key

### Step 4: Add API Key to Environment
Add to `frontend/.env`:
```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

## Part 1: Install Dependencies

### File: `frontend/package.json`

Run this command:
```bash
cd frontend && npm install use-places-autocomplete @googlemaps/js-api-loader
```

---

## Part 2: Create Google Maps Loader Hook

### Create NEW File: `frontend/src/hooks/useGoogleMapsLoader.ts`

```typescript
import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export function useGoogleMapsLoader() {
  const [loaded, setLoaded] = useState(isLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError(new Error('Google Maps API key not configured'));
      return;
    }

    if (isLoaded) {
      setLoaded(true);
      return;
    }

    if (!loaderInstance) {
      loaderInstance = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['places'],
      });
    }

    if (!loadPromise) {
      loadPromise = loaderInstance.load().then(() => {
        isLoaded = true;
      });
    }

    loadPromise
      .then(() => setLoaded(true))
      .catch((err) => setError(err));
  }, []);

  return { loaded, error };
}
```

---

## Part 3: Create Address Autocomplete Component

### Create NEW File: `frontend/src/components/common/AddressAutocomplete.tsx`

```typescript
import { useRef, useEffect, useState } from 'react';
import { Input, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { useGoogleMapsLoader } from '../../hooks/useGoogleMapsLoader';
import { useTheme } from '../../theme';

interface AddressAutocompleteProps {
  value?: string;
  onChange?: (address: string, coords?: { lat: number; lng: number }) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Ketik alamat... (contoh: Jakarta, Bandung)',
  disabled = false,
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const { loaded, error } = useGoogleMapsLoader();
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'id' }, // Indonesia only
    },
    debounce: 300,
    cache: 24 * 60 * 60, // 24 hour cache
    initOnMount: loaded,
  });

  // Sync external value
  useEffect(() => {
    if (value && value !== inputValue) {
      setValue(value, false);
    }
  }, [value]);

  // Initialize when Google Maps loads
  useEffect(() => {
    if (loaded && value) {
      setValue(value, false);
    }
  }, [loaded]);

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    setShowDropdown(false);

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      onChange?.(description, { lat, lng });
    } catch (err) {
      console.error('Error getting geocode:', err);
      onChange?.(description);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setShowDropdown(true);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowDropdown(false);
      clearSuggestions();
      onBlur?.();
    }, 200);
  };

  if (error) {
    // Fallback to simple input if Google Maps fails to load
    return (
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        prefix={<EnvironmentOutlined style={{ color: theme.colors.text.tertiary }} />}
        disabled={disabled}
      />
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || !ready}
        prefix={<EnvironmentOutlined style={{ color: theme.colors.text.tertiary }} />}
        suffix={!loaded ? <Spin size="small" /> : null}
      />

      {/* Dropdown */}
      {showDropdown && status === 'OK' && data.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: theme.colors.background.primary,
            border: `1px solid ${theme.colors.border.default}`,
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 250,
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <div
                key={place_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(suggestion.description);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${theme.colors.border.light}`,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.colors.background.tertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ fontWeight: 500, color: theme.colors.text.primary }}>
                  {main_text}
                </div>
                <div style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                  {secondary_text}
                </div>
              </div>
            );
          })}
          {/* Google Attribution (required) */}
          <div
            style={{
              padding: '6px 12px',
              fontSize: 11,
              color: theme.colors.text.tertiary,
              textAlign: 'right',
              borderTop: `1px solid ${theme.colors.border.light}`,
            }}
          >
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Part 4: Update Call Sheet Editor

### File: `frontend/src/pages/CallSheetEditorPage.tsx`

#### Step 4.1: Add Import

Find the imports section at the top and add:

```typescript
import { AddressAutocomplete } from '../components/common/AddressAutocomplete';
```

#### Step 4.2: Remove Old Address State and Handler

Find and **DELETE** these lines (around line 66-68):

```typescript
  const [addressOptions, setAddressOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [localAddress, setLocalAddress] = useState<string>('');
```

Also **DELETE** the `searchTimeoutRef` and `handleAddressSearch` function (around line 73-112).

Also **DELETE** the `useEffect` that syncs `localAddress` with `callSheet.locationAddress` (around line 114-118).

#### Step 4.3: Replace Address Input Section

Find the Address input section (around line 556-630). It looks like this:

```typescript
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address (Indonesia)
            </div>
            <div style={{ position: 'relative' }}>
              <Input
                value={localAddress}
                // ... lots of code including dropdown
              />
              {/* Dropdown suggestions */}
              {addressOptions.length > 0 && (
                // ... dropdown code
              )}
            </div>
```

**REPLACE** the entire Address section (from the "Address" label to the end of the dropdown) with:

```typescript
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address (Indonesia)
            </div>
            <AddressAutocomplete
              value={callSheet.locationAddress || ''}
              onChange={(address, coords) => {
                updateMutation.mutate({ locationAddress: address });
                // If we got coordinates, could auto-fill weather/hospital
                if (coords) {
                  console.log('Address selected with coords:', coords);
                  // Optionally trigger auto-fill after selection
                  setTimeout(() => {
                    if (!autoFillAllMutation.isPending) {
                      autoFillAllMutation.mutate();
                    }
                  }, 500);
                }
              }}
              placeholder="Ketik alamat... (contoh: Jakarta, Bandung)"
            />
```

#### Step 4.4: Clean Up Unused Imports

Remove these imports if no longer used:
- Remove `Spin` from antd imports if not used elsewhere
- Remove `axios` if only used for address search

---

## Part 5: Update Environment Files

### File: `frontend/.env.example`

Add this line:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### File: `.env.example` (root)

Add this line:

```env
# Google Maps (for address autocomplete)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## Part 6: Add TypeScript Types

### File: `frontend/src/vite-env.d.ts`

Add Google Maps API key type:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## Part 7: Optional - Remove Backend Address Search

Since we're now using Google Places directly in the frontend, the backend address search endpoint is no longer needed. You can optionally remove:

### File: `backend/src/modules/call-sheets/call-sheets.controller.ts`

**DELETE** the searchAddresses endpoint:

```typescript
  /**
   * Search for addresses using Nominatim (proxy to avoid CORS)
   */
  @Get('search/addresses')
  async searchAddresses(@Query('q') query: string) {
    return this.service.searchAddresses(query);
  }
```

### File: `backend/src/modules/call-sheets/call-sheets.service.ts`

**DELETE** the searchAddresses method at the bottom of the file.

### File: `frontend/src/services/callSheets.ts`

**DELETE** the searchAddresses API method.

---

## Testing Checklist

After implementation:

1. [ ] Restart frontend: `cd frontend && npm run dev`
2. [ ] Open browser DevTools Console
3. [ ] Navigate to Call Sheet Editor
4. [ ] Type "Jakarta" in Address field
5. [ ] Verify:
   - [ ] Dropdown appears with Google suggestions
   - [ ] Only Indonesian locations shown
   - [ ] Clicking suggestion fills the input
   - [ ] "Powered by Google" attribution visible
   - [ ] Auto-fill triggers after selection
6. [ ] Check Console for any errors

---

## Troubleshooting

### "Google Maps API key not configured"
- Check `frontend/.env` has `VITE_GOOGLE_MAPS_API_KEY`
- Restart frontend dev server after adding env var

### "This API key is not authorized"
- Check API key restrictions in Google Cloud Console
- Make sure localhost is in allowed referrers
- Verify Places API and Maps JavaScript API are enabled

### No suggestions appear
- Open browser DevTools > Network tab
- Look for requests to `maps.googleapis.com`
- Check for error responses

### Dropdown hidden behind other elements
- The AddressAutocomplete component has `zIndex: 1050`
- If still hidden, check parent container for `overflow: hidden`

---

## Cost Monitoring

After deployment, monitor usage at:
https://console.cloud.google.com/google/maps-apis/metrics

**Free Tier (as of March 2025):**
- 10,000 Autocomplete requests/month
- Sessions are FREE when using session tokens (use-places-autocomplete handles this)

---

## Summary

| Step | Action |
|------|--------|
| 1 | Install `use-places-autocomplete` and `@googlemaps/js-api-loader` |
| 2 | Create `useGoogleMapsLoader.ts` hook |
| 3 | Create `AddressAutocomplete.tsx` component |
| 4 | Update `CallSheetEditorPage.tsx` to use new component |
| 5 | Add `VITE_GOOGLE_MAPS_API_KEY` to env files |
| 6 | Add TypeScript types |
| 7 | (Optional) Remove backend Nominatim code |

