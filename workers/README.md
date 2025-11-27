# Cloudflare Worker - Media Delivery

This Worker serves media files from the private R2 bucket with token authentication.

## Architecture

```
User → https://media.monomiagency.com/view/TOKEN/content/file.jpg
  ↓
Cloudflare Worker (validates token)
  ↓
R2 Bucket (fetches file)
  ↓
CDN Cache (24h)
  ↓
User (< 50ms globally)
```

## Setup & Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2. Deploy Worker

```bash
cd workers
wrangler deploy
```

### 3. Bind R2 Bucket

The R2 bucket binding is already configured in `wrangler.toml`:
- Binding name: `MY_BUCKET`
- Bucket: `monomi-finance`

Verify in Cloudflare Dashboard:
- Go to Workers & Pages → media-monomi → Settings → Variables
- Ensure R2 bucket binding exists

### 4. Add Custom Domain

```bash
# Add custom domain to worker
wrangler custom-domain add media.monomiagency.com

# Or configure in Cloudflare Dashboard:
# Workers & Pages → media-monomi → Settings → Triggers
# Custom Domains → Add Custom Domain → media.monomiagency.com
```

### 5. Set Secrets (Optional - for production token validation)

```bash
# Backend URL for token validation
wrangler secret put BACKEND_URL
# Enter: https://admin.monomiagency.com

# JWT secret for local token validation
wrangler secret put TOKEN_SECRET
# Enter: your-jwt-secret (same as backend JWT_SECRET)
```

## Testing

### Test with curl

```bash
# 1. Get media token from backend
TOKEN=$(curl -X POST https://admin.monomiagency.com/api/v1/media/access-token \
  -H "Authorization: Bearer YOUR_JWT" | jq -r '.token')

# 2. Request media through worker
curl "https://media.monomiagency.com/view/$TOKEN/content/2025-11-19/test.jpg" \
  -o test.jpg

# Should download the file successfully
```

### Test in Browser

1. Login to admin.monomiagency.com
2. Open browser console
3. Run:
```javascript
// Fetch media token
const response = await fetch('/api/v1/media/access-token', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
});
const { token } = await response.json();

// Test media URL
const img = new Image();
img.src = `https://media.monomiagency.com/view/${token}/content/2025-11-19/test.jpg`;
document.body.appendChild(img);
```

## URL Format

```
https://media.monomiagency.com/view/{TOKEN}/{KEY}

Examples:
- https://media.monomiagency.com/view/abc123.../content/2025-11-19/photo.jpg
- https://media.monomiagency.com/view/abc123.../thumbnails/2025-11-19/video-thumb.jpg
```

## Token Validation

**Current (Simple)**: Accepts any token > 10 characters (for testing)

**Production (TODO)**:
1. Call backend API to validate token
2. Or verify JWT locally with TOKEN_SECRET

Update `validateToken()` function in `media-worker.js`.

## Performance

- **First load**: ~200ms (R2 fetch)
- **Cached load**: ~10ms (CDN edge)
- **Cache duration**: 24 hours
- **Global latency**: < 50ms (Cloudflare's 300+ locations)

## Free Tier Limits

- Workers: 100,000 requests/day ✅
- R2 Storage: 10GB ✅
- R2 Bandwidth: Unlimited ✅

## Troubleshooting

### Worker not found
```bash
# Check worker status
wrangler deployments list

# Redeploy
wrangler deploy
```

### R2 binding error
```bash
# Verify R2 binding in dashboard
# Workers & Pages → media-monomi → Settings → Variables → R2 Bucket Bindings
```

### CORS errors
- Worker already includes CORS headers
- Check browser console for specific error

### 404 File not found
- Verify file exists in R2 bucket
- Check key path matches exactly (content/2025-11-19/file.jpg)

## Files

- `media-worker.js` - Worker code
- `wrangler.toml` - Configuration
- `README.md` - This file

## Next Steps

After worker is deployed:
1. Update backend to generate media tokens
2. Update frontend to use Worker URLs
3. Test with real media files
4. Monitor worker analytics in Cloudflare Dashboard
