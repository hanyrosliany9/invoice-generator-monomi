# Call Sheet Address - Backend Proxy Solution

**For:** Claude Haiku 4.5
**Priority:** CRITICAL

Browser CORS may be blocking direct requests to Nominatim. Let's route through our backend.

---

## Part 1: Add Backend Endpoint for Address Search

### File: `backend/src/modules/call-sheets/call-sheets.controller.ts`

**Add this new endpoint (after the other endpoints):**

```typescript
  /**
   * Search for addresses using Nominatim (proxy to avoid CORS)
   */
  @Get('search/addresses')
  async searchAddresses(@Query('q') query: string) {
    return this.service.searchAddresses(query);
  }
```

**IMPORTANT:** This route MUST be placed BEFORE any routes with `:id` parameter, otherwise Express will treat "search" as an ID.

Find where the routes are defined and add this BEFORE `@Get(':id')`:

```typescript
  // Add this BEFORE @Get(':id')
  @Get('search/addresses')
  async searchAddresses(@Query('q') query: string) {
    return this.service.searchAddresses(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // ... existing code
  }
```

---

### File: `backend/src/modules/call-sheets/call-sheets.service.ts`

**Add this method to the service:**

```typescript
  /**
   * Search addresses using Nominatim API
   */
  async searchAddresses(query: string): Promise<Array<{ value: string; label: string }>> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const response = await this.externalApisService.searchAddresses(query);
      return response;
    } catch (error) {
      console.error('Address search failed:', error);
      return [];
    }
  }
```

---

### File: `backend/src/services/external-apis.service.ts`

**Add this method to the ExternalApisService class:**

```typescript
  /**
   * Search addresses using Nominatim API
   */
  async searchAddresses(query: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const response = await this.httpClient.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
      });

      return response.data.map((item: any) => ({
        value: item.display_name,
        label: item.display_name,
      }));
    } catch (error) {
      this.logger.error(`Address search failed for "${query}":`, error);
      return [];
    }
  }
```

---

## Part 2: Add Frontend API Method

### File: `frontend/src/services/callSheets.ts`

**Add this method to the callSheetsApi object:**

```typescript
  // Address search
  searchAddresses: async (query: string): Promise<Array<{ value: string; label: string }>> => {
    const res = await apiClient.get(`/call-sheets/search/addresses`, {
      params: { q: query }
    });
    return res.data.data || res.data || [];
  },
```

---

## Part 3: Update Frontend to Use Backend Proxy

### File: `frontend/src/pages/CallSheetEditorPage.tsx`

**Find the handleAddressSearch function and replace it with:**

```typescript
  // Address autocomplete search using backend proxy
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
    console.log('Starting address search for:', searchValue);

    // Debounce: wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Making API request via backend proxy...');
        const options = await callSheetsApi.searchAddresses(searchValue);
        console.log('Address search results:', options);
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

**Also remove the axios import if it's only used for address search:**
```typescript
// Remove this line if axios is only used for address search:
// import axios from 'axios';
```

---

## Summary

1. **Backend:** Add `/call-sheets/search/addresses?q=query` endpoint
2. **Backend Service:** Add `searchAddresses()` method that calls Nominatim
3. **Frontend API:** Add `searchAddresses()` method to callSheetsApi
4. **Frontend Component:** Update `handleAddressSearch` to use backend proxy instead of direct Nominatim call

---

## Why This Works

- **No CORS issues:** Request goes to your own backend (same origin)
- **User-Agent header:** Backend can properly set the required header
- **Rate limiting:** Backend already has rate limiting for Nominatim
- **Caching:** Could add caching later if needed

---

## Testing

After implementing:

1. Restart backend: `cd backend && npm run start:dev`
2. Refresh frontend
3. Type "Jakarta" in ADDRESS field
4. Check console for:
   - "Starting address search for: Jakarta"
   - "Making API request via backend proxy..."
   - "Address search results: [...]"
5. Dropdown should appear with suggestions
