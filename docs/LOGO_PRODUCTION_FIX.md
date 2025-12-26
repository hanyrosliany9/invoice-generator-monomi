# Logo Production Fix - Complete Guide

## Critical Issue Identified ✅

**Problem:** Logo assets were not being copied to production Docker images.

### Root Cause
In production builds:
1. **Backend:** Only the compiled `dist/` folder was copied, missing `src/modules/pdf/assets/`
2. **Path Resolution:** The multi-path logo loading tried to find assets, but they didn't exist in the production container

### Solution Applied
Updated root `Dockerfile` to explicitly copy PDF assets to the correct location in production builds.

---

## Changes Made

### 1. Production Dockerfile (Root `/Dockerfile`)

**Line 109 Added:**
```dockerfile
# Copy PDF assets (logo, templates) needed at runtime
COPY --chown=appuser:appuser --from=backend-build /app/backend/src/modules/pdf/assets ./backend/dist/modules/pdf/assets
```

This ensures that:
- Logo assets from `backend/src/modules/pdf/assets/` are copied to `backend/dist/modules/pdf/assets/`
- Assets are available at runtime when the compiled code runs
- Proper ownership is set for the non-root `appuser`

### 2. Backend PDF Service (Already Fixed)

The multi-path resolution in `backend/src/modules/pdf/pdf.service.ts` now tries:
1. `__dirname/assets/company-logo.png` (Production - will now work!)
2. `../../../src/modules/pdf/assets/company-logo.png` (Development fallback)
3. `process.cwd()/backend/src/modules/pdf/assets/company-logo.png` (Docker dev)
4. `process.cwd()/src/modules/pdf/assets/company-logo.png` (Alternative)

### 3. Frontend Sidebar Logo (Already Fixed)

Increased sizes for better visibility:
- Expanded: 80px → **120px** (+50%)
- Collapsed: 40px → **48px** (+20%)

---

## Production Deployment Steps

### Step 1: Rebuild Production Images

```bash
# Stop current production containers
docker compose -f docker-compose.prod.yml down

# Rebuild images with new Dockerfile changes
docker compose -f docker-compose.prod.yml build --no-cache

# Start production containers
docker compose -f docker-compose.prod.yml up -d
```

**Important:** Use `--no-cache` to ensure Docker uses the updated Dockerfile.

### Step 2: Verify Backend Logo Loading

```bash
# Check backend startup logs
docker compose -f docker-compose.prod.yml logs app | grep -i logo
```

**Expected Output:**
```
[PdfService] Logo found at: /app/backend/dist/modules/pdf/assets/company-logo.png
[PdfService] Company logo loaded successfully
```

**If you see errors:**
```
[PdfService] Failed to load company logo: Logo file not found
```

Then verify the asset was copied:
```bash
docker compose -f docker-compose.prod.yml exec app ls -la /app/backend/dist/modules/pdf/assets/
```

### Step 3: Test PDF Generation

1. Log into the production application
2. Generate a test invoice or quotation
3. Open the PDF
4. Verify the Monomi logo appears in the document header

### Step 4: Test Frontend Logo

1. Open the production application in browser
2. Clear browser cache (Ctrl+Shift+R)
3. Check sidebar - logo should be larger (120px expanded)
4. Toggle sidebar collapse - logo should smoothly resize to 48px

---

## File Structure in Production Container

After successful build, the container should have:

```
/app/
├── backend/
│   ├── dist/
│   │   └── modules/
│   │       └── pdf/
│   │           ├── assets/
│   │           │   └── company-logo.png  ← LOGO HERE
│   │           ├── pdf.service.js
│   │           └── ...
│   ├── node_modules/
│   └── package.json
├── frontend/
│   └── dist/
│       ├── index.html
│       ├── assets/
│       │   ├── monomi-logo-1-[hash].png  ← LOGO HERE
│       │   └── ...
│       ├── favicon.png  ← FAVICON HERE
│       └── logo.png     ← APPLE ICON HERE
```

---

## Verification Checklist

### Backend (PDF Generation)
- [ ] Logo file exists at `/app/backend/dist/modules/pdf/assets/company-logo.png`
- [ ] Backend logs show "Company logo loaded successfully"
- [ ] Generated invoice PDFs show logo in header
- [ ] Generated quotation PDFs show logo in header

### Frontend
- [ ] Browser tab shows Monomi favicon
- [ ] Sidebar shows larger logo (120x120px expanded)
- [ ] Sidebar shows logo when collapsed (48x48px)
- [ ] Mobile menu drawer shows logo
- [ ] No broken image icons anywhere

---

## Troubleshooting

### Issue: Logo still not in PDFs after rebuild

**Check 1:** Verify asset was copied during build
```bash
docker compose -f docker-compose.prod.yml exec app ls -la /app/backend/dist/modules/pdf/assets/
```

**Check 2:** Verify source file exists before building
```bash
ls -la backend/src/modules/pdf/assets/company-logo.png
```

**Check 3:** Check Docker build logs
```bash
docker compose -f docker-compose.prod.yml build app 2>&1 | grep -i "copy\|assets\|logo"
```

### Issue: Sidebar logo still small

**Check 1:** Verify frontend was rebuilt
```bash
docker compose -f docker-compose.prod.yml build frontend --no-cache
```

**Check 2:** Hard refresh browser (Ctrl+Shift+Delete to clear cache)

**Check 3:** Check if old JavaScript is cached
```bash
# Check frontend container logs
docker compose -f docker-compose.prod.yml logs frontend
```

### Issue: "Logo file not found" in logs

This means the asset wasn't copied correctly. Solutions:

1. **Ensure source file exists:**
   ```bash
   cp frontend/src/assets/logos/monomi-logo-1.png backend/src/modules/pdf/assets/company-logo.png
   ```

2. **Rebuild with verbose output:**
   ```bash
   docker compose -f docker-compose.prod.yml build --no-cache --progress=plain app
   ```

3. **Check Dockerfile line 109 was saved:**
   ```bash
   grep -n "Copy PDF assets" Dockerfile
   ```

---

## Production Build Time

Expected build times:
- **Backend:** ~3-5 minutes (includes TypeScript compilation)
- **Frontend:** ~2-3 minutes (includes Vite build + optimization)
- **Total:** ~5-8 minutes for full rebuild

---

## Rollback Plan

If issues occur in production:

```bash
# Stop current containers
docker compose -f docker-compose.prod.yml down

# Restore previous images (if tagged)
docker compose -f docker-compose.prod.yml up -d

# Or rebuild from previous commit
git checkout HEAD~1 Dockerfile
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Post-Deployment Verification Script

```bash
#!/bin/bash
echo "=== Logo Deployment Verification ==="
echo ""

echo "1. Checking backend logo asset..."
docker compose -f docker-compose.prod.yml exec app ls -la /app/backend/dist/modules/pdf/assets/company-logo.png

echo ""
echo "2. Checking backend logs for logo loading..."
docker compose -f docker-compose.prod.yml logs app | grep -i "logo" | tail -5

echo ""
echo "3. Checking frontend logo assets..."
docker compose -f docker-compose.prod.yml exec frontend ls -la /app/frontend/dist/ | grep -i "logo\|favicon"

echo ""
echo "4. Container health status..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Verification Complete ==="
echo "Next: Test PDF generation in browser"
```

Save as `verify-logo-deployment.sh` and run:
```bash
chmod +x verify-logo-deployment.sh
./verify-logo-deployment.sh
```

---

## Summary

### What Was Fixed
1. ✅ Production Dockerfile now copies PDF assets to correct location
2. ✅ Multi-path logo resolution handles all environments
3. ✅ Sidebar logo increased to 120px for better visibility
4. ✅ Enhanced logging for troubleshooting

### What You Need To Do
1. **Rebuild production images** with `--no-cache` flag
2. **Restart production containers**
3. **Verify logs** show successful logo loading
4. **Test PDF generation** to confirm logos appear

### Expected Result
- ✅ All PDFs (invoices & quotations) display Monomi logo
- ✅ Sidebar shows larger, more prominent logo
- ✅ Browser tabs show Monomi favicon
- ✅ No broken images anywhere in the application

---

**Status:** Ready for production deployment
**Estimated Downtime:** 5-10 minutes (during rebuild)
**Risk Level:** Low (non-breaking change, graceful fallback)

