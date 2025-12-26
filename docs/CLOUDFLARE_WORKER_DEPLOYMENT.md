# Cloudflare Worker Manual Deployment Guide

## Issue Fixed
- ✅ Disabled aggressive caching for public token validation (was caching 401 errors)
- ✅ Added detailed logging to debug token validation flow
- ✅ Worker code updated in: `workers/media-worker.js`

## Deploy via Cloudflare Dashboard (RECOMMENDED)

### Step 1: Open Cloudflare Dashboard
1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** (left sidebar)
3. Find and click on your worker: **"media-monomi"**

### Step 2: Quick Edit
1. Click **Quick Edit** button (top right)
2. **Select All** (Ctrl+A) and **Delete** the old code
3. **Paste** the new code from `workers/media-worker.js`
4. Click **Save and Deploy** button (top right)

### Step 3: Test
Wait 10-30 seconds, then test:
```bash
curl -I "https://media.monomiagency.com/view/ps5uAHu6B2agXH-XWOumGA/thumbnails/2025-11-19/ee6b40cf-thumb-dscf7195.jpg"
# Expected: HTTP/2 200 OK
```

## Alternative: Deploy via Wrangler CLI

```bash
cd workers
npx wrangler login
npx wrangler deploy
```

## Monitor Logs
```bash
cd workers
npx wrangler tail
```

Then reload the public share page to see token validation logs.

## Success Criteria
- ✅ Media loads without 401 errors on public share page
- ✅ Worker logs show: `[Worker] ✅ Token validated as public share token`
