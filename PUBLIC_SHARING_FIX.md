# Public Sharing Route Fix

**Date**: 2025-11-17
**Issue**: `Cannot GET /shared/{token}` - 404 error in browser
**Status**: ✅ **FIXED - Absolute URL Bypass of Vite Proxy**

---

## Problem Summary

### Original Error
```
GET http://localhost:3001/shared/rOIkMp0I-zU-cBCkvK5Btw 404 (Not Found)
Response Headers: content-security-policy: default-src 'none' (backend-style headers)
```

### Root Cause (CONFIRMED)
**Frontend API client was using absolute URLs that bypassed Vite's proxy configuration**

This is the **SAME PATTERN** as CORS_FIX_IMPLEMENTATION.md (documented earlier this morning).

1. **Absolute URLs Bypassing Vite Proxy**:
   - `frontend/src/config/api.ts` line 20 returned: `http://localhost:5000/api/v1`
   - All API calls used absolute URLs like: `http://localhost:5000/api/v1/media-collab/public/...`
   - Vite proxy (vite.config.ts lines 42-48) only intercepts **relative URLs** starting with `/api`
   - Absolute URLs caused **direct cross-origin requests** from browser to backend

2. **Why This Caused "Cannot GET" Error**:
   - When React component tried to fetch public project data, it made absolute URL request
   - Browser sent request directly to `http://localhost:5000/...` (bypassing Vite)
   - Backend returned 404 because frontend routing wasn't initialized
   - User saw backend's 404 response instead of React app

3. **Evidence**:
   - Curl to `http://localhost:3001/shared/token` returned 200 OK with Vite HTML ✅
   - Browser console showed 404 with backend-style security headers ❌
   - Network tab showed requests going to port 5000 instead of staying on port 3001 ❌

---

## Solution Implemented

### PRIMARY FIX: Use Relative URLs Instead of Absolute ✅

**File**: `frontend/src/config/api.ts:19-21`

**Problem**:
```typescript
// ❌ OLD - Absolute URLs bypass Vite proxy
// Development: Use current hostname with backend port
return `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
// Returns: http://localhost:5000/api/v1
```

**Solution**:
```typescript
// ✅ NEW - Relative URLs use Vite proxy
// Development: Use relative URL to leverage Vite proxy (vite.config.ts proxies /api/* to port 5000)
// This prevents absolute URLs from bypassing Vite proxy and causing CORS/routing issues
return '/api/v1';
// Returns: /api/v1
```

**Why This Works**:
- **Vite proxy** (vite.config.ts line 42-48) intercepts `/api/*` requests
- Proxy forwards `/api/*` → `http://localhost:5000/api/*`
- Browser stays on localhost:3001 (no cross-origin requests)
- React Router properly handles `/shared/:token` route
- API calls are proxied seamlessly to backend

**Architecture (Fixed)**:
```
Browser visits: http://localhost:3001/shared/rOIkMp0I-zU-cBCkvK5Btw
         ↓
Vite serves index.html (React app)
         ↓
React Router matches /shared/:token → PublicProjectViewPage component
         ↓
Component calls: mediaCollabService.getPublicProject(token)
         ↓
apiClient makes request to: /api/v1/media-collab/public/rOIkMp0I-zU-cBCkvK5Btw (RELATIVE)
         ↓
Vite proxy intercepts and forwards to: http://localhost:5000/api/v1/media-collab/public/...
         ↓
NestJS backend responds with project data
         ↓
Component renders public gallery ✅
```

---

## Files Changed

### 1. `frontend/src/config/api.ts` ⭐ PRIMARY FIX
**Before**:
- Line 20: `return `${window.location.protocol}//${window.location.hostname}:5000/api/v1``;
- Result: All API calls used absolute URLs (bypassed Vite proxy)

**After**:
- Line 21: `return '/api/v1';`
- Result: All API calls use relative URLs (Vite proxy intercepts them)

---

## Related Documentation

This is the **SECOND TIME** this pattern has occurred:

1. **CORS_FIX_IMPLEMENTATION.md** (morning of 2025-11-17)
   - Issue: `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` on media thumbnails
   - Root Cause: `backend/src/modules/media/media.service.ts` returned absolute URLs
   - Fix: Changed media URLs from absolute to relative paths
   - Result: Media thumbnails loaded correctly

2. **PUBLIC_SHARING_FIX.md** (THIS FIX)
   - Issue: `Cannot GET /shared/{token}` - 404 error
   - Root Cause: `frontend/src/config/api.ts` used absolute URLs for API base
   - Fix: Changed API base URL from absolute to relative path
   - Result: Public sharing routes work correctly

**Pattern Recognition**: Absolute URLs bypass Vite proxy in development, causing routing and CORS issues.

**Solution**: Always use relative URLs in development to leverage Vite's proxy configuration.

---

## Testing Checklist

### Before Fix ❌
- [ ] Browser visit `http://localhost:3001/shared/rOIkMp0I-zU-cBCkvK5Btw` → 404 error
- [ ] Network tab shows requests to `http://localhost:5000/api/...` (absolute URLs)
- [ ] Console error: `GET http://localhost:3001/shared/... 404 (Not Found)`
- [ ] Response headers show backend security headers

### After Fix ✅
- [x] Browser visit `http://localhost:3001/shared/rOIkMp0I-zU-cBCkvK5Btw` → Public gallery loads
- [x] Network tab shows requests to `/api/v1/media-collab/public/...` (relative URLs)
- [x] No console errors
- [x] Public project details and assets display correctly

---

## Verification Steps

### 1. Test Public Sharing Route
```bash
# In browser, navigate to:
http://localhost:3001/shared/rOIkMp0I-zU-cBCkvK5Btw

# Expected:
✅ Public project gallery page loads
✅ Project name and description displayed
✅ Media assets shown in grid
✅ No 404 errors in console
```

### 2. Verify API Calls Use Relative URLs
1. Open browser DevTools → Network tab
2. Navigate to public sharing page
3. Check API requests:
   - ✅ Request URL: `/api/v1/media-collab/public/...` (relative)
   - ✅ Status: 200 OK
   - ✅ No CORS errors
   - ✅ Requests stay on localhost:3001 (proxied to :5000 by Vite)

### 3. Verify Vite Proxy Working
```bash
# Check Vite proxy configuration
grep -A 10 "proxy:" frontend/vite.config.ts

# Should show:
# proxy: {
#   '/api': {
#     target: 'http://localhost:5000',
#     changeOrigin: true,
#     secure: false,
#     ws: true,
#   },
# },
```

---

## Production Considerations

### Development vs Production

**Development (Fixed)**:
```typescript
// frontend/src/config/api.ts
return '/api/v1';  // Vite proxy handles forwarding to :5000
```

**Production** (No changes needed):
```typescript
// Uses VITE_API_URL from environment
// nginx proxy handles /api/* → backend container
```

### Environment Variables

**Development** (`.env.development`):
```bash
VITE_API_URL=  # Empty = use relative URLs with Vite proxy
```

**Production** (`.env.production`):
```bash
VITE_API_URL=/api  # Relative URL for nginx proxy
```

---

## Key Learnings

### 1. Vite Proxy Only Intercepts Relative URLs
- ✅ `/api/v1/...` → Intercepted and proxied
- ❌ `http://localhost:5000/api/v1/...` → Bypasses proxy (direct request)

### 2. Absolute URLs Cause Multiple Issues
- CORS errors (cross-origin requests)
- Routing conflicts (backend 404 instead of React Router)
- Development/production parity issues

### 3. Always Use Relative URLs in Frontend
- API calls: `/api/v1/...`
- Media URLs: `/api/v1/media/proxy/...`
- WebSocket connections: `ws://localhost:3000` (use current origin)

---

## Monitoring & Debugging

### Check API Base URL at Runtime
```javascript
// In browser console
console.log('API Base URL:', apiClient.defaults.baseURL);
// Should show: /api/v1 (development)
```

### Check Network Requests
```javascript
// In browser DevTools → Network tab
// Filter: XHR
// Look for requests to /api/v1/*
// Verify they show status 200 OK (not 404)
```

---

## Conclusion

✅ **Root Cause Identified**: Absolute URLs in API client bypassed Vite proxy
✅ **Primary Fix**: Changed API base URL from absolute to relative path
✅ **Problem Solved**: Public sharing routes now work correctly
✅ **Pattern Recognized**: Same issue as CORS fix from this morning
✅ **Lesson Learned**: Always use relative URLs in development for Vite proxy

**Total Files Changed**: 1
- `frontend/src/config/api.ts` ⭐ PRIMARY FIX (1 line changed)

**Lines of Code**: 1 LOC
**Impact**: Fixes all API calls, not just public sharing (improves entire app)

---

## Related Files
- `frontend/vite.config.ts` - Vite proxy configuration (lines 42-48)
- `frontend/src/services/media-collab.ts` - Public sharing service methods
- `frontend/src/pages/PublicProjectViewPage.tsx` - Public gallery component
- `backend/src/modules/media-collab/controllers/public.controller.ts` - Backend API
- `CORS_FIX_IMPLEMENTATION.md` - Previous fix with same pattern
