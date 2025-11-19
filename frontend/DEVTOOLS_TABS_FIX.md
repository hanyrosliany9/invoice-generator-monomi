# Fix: Browser Tabs/DevTools Opening Repeatedly

## Problem
Browser dev tools or new tabs keep opening repeatedly during development.

## Root Causes

### 1. **Zustand DevTools** (FIXED ✅)
- The Zustand `devtools` middleware was always enabled
- Caused Redux DevTools to connect and potentially trigger browser DevTools
- **Solution**: Made conditional - only enabled with `VITE_ENABLE_REDUX_DEVTOOLS=true`

### 2. **React StrictMode** (FIXED ✅)
- StrictMode causes intentional double-rendering in development
- Can trigger effects twice, causing issues with browser APIs
- **Solution**: Disabled StrictMode in development, enabled in production

### 3. **Browser Extensions** (CHECK THIS)
Common culprits:
- Redux DevTools Extension
- React DevTools Extension
- Other debugging extensions

**How to Test:**
```bash
# Open browser in incognito/private mode (disables extensions)
# OR disable extensions temporarily:
# Chrome: chrome://extensions
# Firefox: about:addons
```

### 4. **HMR (Hot Module Replacement)** Issues
File watching can cause excessive reloads if:
- Polling is too aggressive
- Circular dependencies exist
- Large files trigger multiple updates

## Solutions Applied

### Fix 1: Disable Zustand DevTools by Default
**File:** `frontend/src/store/builder.ts`
```typescript
// Only enable when explicitly needed
const shouldEnableDevtools =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_REDUX_DEVTOOLS === 'true';
```

**Enable when needed:**
```bash
# Add to .env.development
VITE_ENABLE_REDUX_DEVTOOLS=true
```

### Fix 2: Disable StrictMode in Development
**File:** `frontend/src/main.tsx`
```typescript
// Use Fragment in dev, StrictMode in prod
const AppWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode;
```

**Why:**
- StrictMode double-renders components in dev
- Can cause window.open() or other side effects to fire twice
- Not needed in development (mainly for finding lifecycle issues)

## Testing

### Step 1: Clear Everything
```bash
# Stop dev server
# Clear browser cache and local storage
# Close all browser tabs
# Disable browser extensions (or use incognito)
```

### Step 2: Restart Clean
```bash
cd /home/jeff-pc/Project/invoice-generator-monomi

# Make sure env is correct
cat frontend/.env.development
# Should NOT have VITE_ENABLE_REDUX_DEVTOOLS=true

# Rebuild containers (ensures changes are applied)
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml build --no-cache frontend
docker compose -f docker-compose.dev.yml up -d

# Check logs
docker compose -f docker-compose.dev.yml logs -f frontend | grep -i error
```

### Step 3: Test in Browser
1. Open **incognito/private window**
2. Navigate to `http://localhost:3001`
3. Watch for:
   - No new tabs opening
   - No dev tools auto-opening
   - No infinite reload loops

## If Issue Persists

### Check for Console Errors
```javascript
// Open browser console (F12) and look for:
// - Uncaught errors
// - Infinite loops
// - Network errors causing redirects
```

### Check HMR Frequency
```bash
# Watch frontend logs for excessive rebuilds
docker compose -f docker-compose.dev.yml logs -f frontend

# Should see:
# ✓ vite 6.x.x dev server running at http://localhost:3000
# ✓ page reload on file change

# Should NOT see:
# Page reload... (repeated every second)
# [vite] hmr update (repeated constantly)
```

### Disable HMR Temporarily
**File:** `frontend/vite.config.ts`
```typescript
server: {
  hmr: false, // Disable HMR temporarily
  // ... rest of config
}
```

### Check for Redirect Loops
```bash
# Look for 30x redirects in network tab
# Common causes:
# - Authentication redirects (/login → /dashboard → /login)
# - Missing route handlers
# - Incorrect API proxy config
```

## Additional Debugging

### 1. Check React Query DevTools
The `<ReactQueryDevtools />` has `initialIsOpen={false}` which is correct.
If it's causing issues, temporarily remove it:

```typescript
// frontend/src/main.tsx
// Comment out:
// <ReactQueryDevtools initialIsOpen={false} />
```

### 2. Check for window.open() Calls
```bash
# Search for suspicious window.open calls
grep -r "window\.open" frontend/src/ --include="*.tsx"

# Most are intentional (WhatsApp, PDF downloads)
# Look for ones without user interaction (useEffect, etc.)
```

### 3. Browser Extension Issues
Known problematic extensions:
- **Redux DevTools** - Can auto-open dev tools
- **React DevTools** - Can cause excessive re-renders
- **Vite Plugin DevTools** - Check browser for this
- **Any auto-refresh extensions**

**Solution:** Disable extensions one by one to identify culprit

## Quick Fixes Summary

| Issue | Fix | Location |
|-------|-----|----------|
| Zustand DevTools auto-opening | Made conditional (disabled by default) | `frontend/src/store/builder.ts` |
| StrictMode double-render | Disabled in dev | `frontend/src/main.tsx` |
| Browser extensions | Disable or use incognito | Browser settings |
| HMR too aggressive | Polling interval set to 1000ms | `frontend/vite.config.ts` |

## Expected Behavior After Fixes

✅ Dev tools should NOT auto-open
✅ No new tabs should appear automatically
✅ HMR should work normally (file changes reload page)
✅ Console should be clean (no errors)
✅ Performance should be smooth

## If Still Having Issues

Please provide:
1. Browser name and version
2. Extensions installed
3. Console errors (screenshot)
4. Network tab showing any redirects
5. Docker logs: `docker compose -f docker-compose.dev.yml logs frontend --tail=100`

This will help identify if it's:
- A specific browser issue
- Extension conflict
- Application code problem
- Docker/HMR configuration issue
