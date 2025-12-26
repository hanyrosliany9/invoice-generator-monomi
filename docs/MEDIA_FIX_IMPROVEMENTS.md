# Media Fix Improvements - Long-Term Robustness

**Date:** 2025-11-20
**Status:** Current fix works, but needs improvements for production robustness

---

## Current Issues

### 1. URL Parsing is Fragile

**Problem:**
```typescript
// Brittle string matching
if (url.startsWith('/api/v1/media/proxy/')) {
  return url.replace('/api/v1/media/proxy/', '');
}
```

**Better Approach:**
```typescript
export function extractR2Key(url: string): string | null {
  try {
    // Handle absolute URLs
    const urlObj = new URL(url, window.location.origin);

    // Check if it's a backend proxy URL
    if (urlObj.pathname.startsWith('/api/v1/media/proxy/')) {
      // Remove prefix and query params
      return urlObj.pathname.replace('/api/v1/media/proxy/', '');
    }

    // Handle R2 URLs
    if (urlObj.hostname.includes('r2.cloudflarestorage.com')) {
      return urlObj.pathname.substring(1);
    }

    // Handle worker URLs
    if (urlObj.hostname === 'media.monomiagency.com') {
      // Extract key from /view/{token}/{key}
      const parts = urlObj.pathname.split('/');
      if (parts[1] === 'view' && parts.length >= 4) {
        return parts.slice(3).join('/');
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to extract R2 key:', url, error);
    return null;
  }
}
```

**Why Better:**
- Uses `URL` constructor with base URL (handles relative paths properly)
- Removes query params automatically
- Domain-aware parsing (works for all URL types)
- Won't break if route changes

---

### 2. Response Parsing is Hacky

**Problem:**
```typescript
// Fallback hell - not type-safe
const responseData = response.data?.data?.data || response.data?.data;
```

**Better Approach:**

Create a proper type guard:
```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

interface MediaTokenResponse {
  token: string;
  expiresIn: number;
  expiresAt: string;
}

function isMediaTokenResponse(data: any): data is MediaTokenResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.token === 'string' &&
    typeof data.expiresAt === 'string' &&
    typeof data.expiresIn === 'number'
  );
}

// In store
const response = await apiClient.post<ApiResponse<any>>('/media/access-token');

// Try to find the token data (handle nested responses)
let tokenData: MediaTokenResponse | null = null;

if (isMediaTokenResponse(response.data)) {
  tokenData = response.data;
} else if (isMediaTokenResponse(response.data?.data)) {
  tokenData = response.data.data;
} else if (isMediaTokenResponse(response.data?.data?.data)) {
  tokenData = response.data.data.data;
}

if (!tokenData) {
  throw new Error('Invalid response structure from media token endpoint');
}
```

**Why Better:**
- Type-safe validation
- Clear error messages
- Won't silently fail on structure changes

---

### 3. Auto-Initialize is Dangerous

**Problem:**
```typescript
// Runs on import - BEFORE user is logged in!
if (typeof window !== 'undefined') {
  const store = useMediaTokenStore.getState();
  if (!store.token) {
    store.fetchToken(); // ← 401 error if not logged in
  }
}
```

**Better Approach:**

Remove auto-init from store, add to auth flow:
```typescript
// In mediaTokenStore.ts - REMOVE lines 161-168

// In auth store (frontend/src/store/auth.ts)
export const useAuthStore = create<AuthState>((set) => ({
  // ... existing auth state ...

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });

    set({ user: response.data.user, isAuthenticated: true });

    // Initialize media token AFTER successful login
    const mediaStore = useMediaTokenStore.getState();
    if (!mediaStore.token) {
      mediaStore.fetchToken();
    }
  },

  // Also fetch on page reload if user is authenticated
  initialize: async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Validate token and restore session
      const user = await validateToken(token);
      set({ user, isAuthenticated: true });

      // Fetch media token if authenticated
      const mediaStore = useMediaTokenStore.getState();
      if (!mediaStore.token) {
        mediaStore.fetchToken();
      }
    }
  }
}));
```

**Why Better:**
- Only fetches when user is authenticated
- No wasted 401 requests
- Clear separation of concerns

---

### 4. Missing URL Edge Cases

**Problem:**
No handling for:
- Query parameters: `/api/v1/media/proxy/file.jpg?v=2`
- URL encoding: `/api/v1/media/proxy/content%2Ffile.jpg`
- Hash fragments: `/api/v1/media/proxy/file.jpg#preview`

**Better Approach:**
```typescript
export function normalizeMediaUrl(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);

    // Remove query params and hash
    urlObj.search = '';
    urlObj.hash = '';

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, clean up manually
    return url.split('?')[0].split('#')[0];
  }
}

export function extractR2Key(url: string): string | null {
  const cleanUrl = normalizeMediaUrl(url);
  // ... rest of extraction logic
}
```

---

### 5. No Retry Strategy for Token Refresh

**Problem:**
```typescript
// Simple retry after 5 minutes
retryTimeout = setTimeout(() => {
  get().fetchToken();
}, 5 * 60 * 1000);
```

**Better Approach - Exponential Backoff:**
```typescript
interface MediaTokenStore {
  // ... existing fields ...
  retryCount: number;
  maxRetries: number;
}

const calculateBackoff = (retryCount: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 5min
  const backoff = Math.min(1000 * Math.pow(2, retryCount), 5 * 60 * 1000);
  // Add jitter to prevent thundering herd
  return backoff + Math.random() * 1000;
};

// In fetchToken error handler
set({
  error,
  isLoading: false,
  isFetching: false,
  retryCount: state.retryCount + 1
});

if (state.retryCount < state.maxRetries) {
  const backoff = calculateBackoff(state.retryCount);
  console.log(`[MediaToken] Retry ${state.retryCount + 1}/${state.maxRetries} in ${Math.round(backoff / 1000)}s`);

  retryTimeout = setTimeout(() => {
    get().fetchToken();
  }, backoff);
} else {
  console.error('[MediaToken] Max retries reached, giving up');
}
```

**Why Better:**
- Prevents hammering server on failures
- Jitter prevents all clients retrying at once
- Max retries prevents infinite loops

---

### 6. No Token Invalidation on Logout

**Problem:**
When user logs out, media token stays in localStorage.

**Better Approach:**
```typescript
// In auth store logout
logout: () => {
  // Clear auth
  localStorage.removeItem('authToken');
  set({ user: null, isAuthenticated: false });

  // Clear media token
  const mediaStore = useMediaTokenStore.getState();
  mediaStore.clearToken();
}
```

---

### 7. Race Conditions on Multi-Tab

**Problem:**
If user opens multiple tabs, each tries to fetch token.

**Better Approach - Broadcast Channel:**
```typescript
const tokenChannel = typeof window !== 'undefined'
  ? new BroadcastChannel('media-token-channel')
  : null;

export const useMediaTokenStore = create<MediaTokenStore>((set, get) => {
  // Listen for token updates from other tabs
  tokenChannel?.addEventListener('message', (event) => {
    if (event.data.type === 'TOKEN_UPDATED') {
      const { token, expiresAt } = event.data;

      // Update this tab's store
      set({ token, isLoading: false, error: null });

      console.log('[MediaToken] Token synced from another tab');
    }
  });

  return {
    fetchToken: async () => {
      // ... existing fetch logic ...

      if (tokenData && tokenData.token) {
        // Store locally
        localStorage.setItem('mediaToken', token);
        set({ token, ... });

        // Broadcast to other tabs
        tokenChannel?.postMessage({
          type: 'TOKEN_UPDATED',
          token,
          expiresAt
        });
      }
    }
  };
});
```

**Why Better:**
- Only one tab fetches token
- All tabs sync automatically
- Prevents duplicate requests

---

## Priority Improvements (Recommended Order)

### High Priority (Fix Now)
1. ✅ **Remove auto-initialize** - Move to auth flow (prevents 401 errors)
2. ✅ **Fix URL parsing** - Use proper URL constructor with base
3. ✅ **Add type guards** - Make response parsing type-safe

### Medium Priority (Fix Soon)
4. **Add exponential backoff** - Better retry strategy
5. **Token invalidation** - Clear on logout
6. **Multi-tab sync** - BroadcastChannel

### Low Priority (Nice to Have)
7. **URL normalization** - Handle query params/hashes
8. **Token pre-fetching** - Fetch before expiry during user activity
9. **Analytics** - Track token fetch failures

---

## Implementation Plan

### Phase 1: Critical Fixes (1 hour)
```bash
# 1. Fix URL parsing
# frontend/src/utils/mediaProxy.ts
# - Use URL constructor with base
# - Remove hardcoded path matching

# 2. Fix response parsing
# frontend/src/stores/mediaTokenStore.ts
# - Add type guards
# - Proper error handling

# 3. Remove auto-initialize
# frontend/src/stores/mediaTokenStore.ts (remove lines 161-168)
# frontend/src/store/auth.ts (add media token fetch on login)
```

### Phase 2: Robustness (2 hours)
```bash
# 4. Add exponential backoff
# 5. Token invalidation on logout
# 6. Multi-tab sync with BroadcastChannel
```

### Phase 3: Polish (1 hour)
```bash
# 7. URL normalization
# 8. Token pre-fetching
# 9. Error analytics
```

---

## Testing Checklist

- [ ] Token fetches on login (not before)
- [ ] Token persists across page reloads
- [ ] Token auto-refreshes at 90% lifetime
- [ ] Token clears on logout
- [ ] Multiple tabs don't duplicate fetches
- [ ] Retry works on network failures
- [ ] URL parsing handles all edge cases
- [ ] Response structure changes don't break silently

---

## Summary

**Current fix works for 95% of cases**, but has fragility issues:
- ❌ String-based URL parsing (breaks easily)
- ❌ Hacky response parsing (not type-safe)
- ❌ Fetches before login (causes 401s)
- ❌ No proper retry strategy
- ❌ Race conditions on multi-tab

**Recommended: Implement Phase 1 fixes immediately (1 hour), schedule Phase 2 for next sprint.**

The current solution is **good enough for now**, but should be hardened before scaling to more users.
