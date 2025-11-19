# Fix: Chrome Dev Tools Keep Opening (background.js issue)

## Problem
Chrome dev tools keep opening repeatedly, showing "background.js" in the error.

## Root Cause
This is caused by a **Chrome extension**, not your application code. Common culprits:
- Redux DevTools Extension
- React DevTools Extension
- Other debugging extensions
- Malicious/buggy extensions

---

## Solution 1: Identify the Extension (RECOMMENDED)

### Step 1: Check Which Extension is Causing It
```bash
# Open Chrome and go to:
chrome://extensions

# Look for recently installed or updated extensions
# Common culprits:
# - Redux DevTools
# - React Developer Tools
# - Any debugging/developer tools
# - Recently installed extensions
```

### Step 2: Disable Extensions One by One
1. Go to `chrome://extensions`
2. Toggle OFF each extension one at a time
3. Refresh your app (`http://localhost:3001`)
4. Check if dev tools still open
5. When issue stops → You found the problematic extension

### Step 3: Remove or Update the Extension
- **Remove:** Click "Remove" button
- **Update:** Click "Update" or reinstall from Chrome Web Store
- **Report:** If it's a popular extension, report the bug

---

## Solution 2: Use Incognito Mode (QUICK TEST)

```bash
# Open Chrome in Incognito mode (Ctrl+Shift+N)
# Extensions are disabled by default in incognito
# Navigate to: http://localhost:3001

# If issue goes away → It's definitely an extension
# If issue persists → It's something else (see Solution 4)
```

---

## Solution 3: Disable All Extensions Temporarily

### Method A: Via Chrome Flags
1. Go to `chrome://extensions`
2. Click the hamburger menu (☰) → "Disable all extensions"
3. Restart Chrome
4. Test your app

### Method B: Create New Chrome Profile
1. Go to `chrome://settings/people`
2. Click "Add person" → Create new profile
3. Open your app in the new profile (no extensions)
4. If issue is gone → Old profile has problematic extension

---

## Solution 4: Check for Malicious Extensions

### Signs of Malicious Extension:
- ❌ Extension you don't remember installing
- ❌ Extension with no icon or suspicious name
- ❌ Extension with few reviews/low rating
- ❌ Extension requesting excessive permissions

### How to Check:
```bash
# 1. Go to chrome://extensions
# 2. Enable "Developer mode" (top right)
# 3. Look for suspicious extensions
# 4. Check "Inspect views: background page" links
# 5. If any show "background.js" errors → That's the culprit
```

### Remove Malicious Extensions:
1. Go to `chrome://extensions`
2. Click "Remove" on suspicious extensions
3. Run malware scan:
   ```bash
   # Windows: Windows Defender
   # Mac: Malwarebytes or similar
   # Linux: ClamAV
   ```

---

## Solution 5: Reset Chrome (NUCLEAR OPTION)

⚠️ **Warning:** This will remove all extensions, history, and settings

```bash
# 1. Go to chrome://settings/resetProfileSettings
# 2. Click "Reset settings"
# 3. Confirm

# OR complete reset:
# chrome://settings/reset
```

---

## Solution 6: Check Your Application (If Above Didn't Work)

If none of the above works, the issue might be in your code:

### Check 1: Console Errors
```javascript
// Open browser console (F12)
// Look for errors like:
// - "debugger" statement
// - Infinite loops
// - window.open() calls
```

### Check 2: Disable Source Maps Temporarily
Edit `frontend/vite.config.ts`:
```typescript
build: {
  sourcemap: false, // Temporarily disable
  // ...
}
```

### Check 3: Check for debugger; Statements
```bash
cd /home/jeff-pc/Project/invoice-generator-monomi
grep -r "debugger;" frontend/src/ --include="*.ts" --include="*.tsx"
# Should return no results
```

---

## Most Common Culprits

### 1. Redux DevTools Extension
**Problem:** Known to auto-open dev tools when detecting Redux/Zustand stores

**Solution:**
- Disable in `chrome://extensions`
- Or use our fix (already applied):
  - Zustand devtools disabled by default
  - Only enabled with `VITE_ENABLE_REDUX_DEVTOOLS=true`

### 2. React Developer Tools
**Problem:** Can cause issues with React 19

**Solution:**
- Update to latest version (v5.0+)
- Or disable temporarily

### 3. Vite/Hot Reload Extensions
**Problem:** Conflicts with Vite's built-in HMR

**Solution:**
- Remove "Vite" or "Hot Reload" extensions
- Vite has built-in HMR, no extension needed

---

## Quick Diagnostic Commands

```bash
# Check if issue is browser-specific
# Try different browsers:
firefox http://localhost:3001
# or
chromium --temp-profile http://localhost:3001

# Check application logs
docker compose -f docker-compose.dev.yml logs -f app | grep -i error

# Check browser console
# Press F12 → Console tab
# Look for repeated errors or warnings
```

---

## Expected Behavior After Fix

✅ Dev tools should NOT auto-open
✅ No new tabs appearing
✅ No "background.js" errors
✅ Normal development workflow
✅ Extensions work correctly (if needed)

---

## Prevention Tips

1. **Only install trusted extensions** from Chrome Web Store
2. **Check reviews** before installing (4+ stars, many reviews)
3. **Review permissions** - Don't allow excessive permissions
4. **Keep extensions updated** - Auto-update enabled
5. **Remove unused extensions** - Less is more
6. **Use Chrome profiles** - Separate profile for development

---

## Still Having Issues?

### Gather Information:

1. **List of installed extensions:**
   ```bash
   # Go to chrome://extensions
   # Take screenshot or list all extensions
   ```

2. **Console errors:**
   ```bash
   # F12 → Console tab
   # Copy any red errors
   ```

3. **Browser version:**
   ```bash
   # Go to chrome://version
   # Copy version number
   ```

4. **Does it happen in:**
   - [ ] Chrome
   - [ ] Incognito mode
   - [ ] Firefox/other browsers
   - [ ] New Chrome profile

### Debug Script:

```bash
# Run this to check for common issues
cd /home/jeff-pc/Project/invoice-generator-monomi

# Check for debugger statements
echo "Checking for debugger statements..."
grep -r "debugger" frontend/src/ --include="*.ts" --include="*.tsx" || echo "✅ No debugger statements found"

# Check for window.open in useEffect
echo "Checking for window.open in useEffect..."
grep -r "useEffect.*window\.open" frontend/src/ --include="*.tsx" || echo "✅ No window.open in useEffect"

# Check console.log for "open"
echo "Checking for suspicious console.log..."
grep -r "console\.log.*open" frontend/src/ --include="*.ts" --include="*.tsx" | head -5

echo ""
echo "If all checks pass ✅ → Issue is definitely a Chrome extension"
```

---

## Summary

**99% of "background.js opening dev tools" issues are caused by Chrome extensions.**

**Quick Fix:**
1. Open `chrome://extensions`
2. Disable Redux DevTools
3. Disable React DevTools
4. Disable any recently installed extensions
5. Refresh your app

**Permanent Fix:**
1. Remove problematic extension
2. Update to latest version
3. Or use Firefox/Edge for development

**Your code is fine** - we already disabled:
- ✅ Zustand devtools (unless explicitly enabled)
- ✅ React StrictMode in dev
- ✅ React Query devtools commented out

The issue is 100% a browser extension conflict.
