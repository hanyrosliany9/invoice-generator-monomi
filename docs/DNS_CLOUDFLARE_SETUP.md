# DNS and Cloudflare Tunnel Configuration for share.monomiagency.com

## Status: Backend and Frontend Deployed ✅
- Backend URL validation successful
- Public sharing URLs now use `share.monomiagency.com`
- Containers rebuilt and deployed

---

## Required Setup Steps (External Configuration)

### 1. Create Cloudflare DNS Record

Navigate to Cloudflare Dashboard → DNS → Records:

**Add CNAME Record:**
```
Type:    CNAME
Name:    share
Target:  <your-tunnel-id>.cfargotunnel.com
Proxy:   Proxied (orange cloud ON)
TTL:     Auto
```

**How to find your tunnel ID:**
```bash
# List all tunnels
docker compose -f docker-compose.prod.yml exec cloudflared cloudflare-tunnel list

# Or from Cloudflare Dashboard:
# Zero Trust → Networks → Tunnels → Copy tunnel ID
```

---

### 2. Update Cloudflare Tunnel Configuration

**Option A: Via Cloudflare Dashboard (Recommended)**

1. Go to **Zero Trust → Networks → Tunnels**
2. Click on your main tunnel (currently serving `admin.monomiagency.com`)
3. Navigate to **Public Hostname** tab
4. Click **Add a public hostname**
5. Configure:
   - **Subdomain**: `share`
   - **Domain**: `monomiagency.com`
   - **Path**: Leave empty
   - **Service Type**: `HTTP`
   - **URL**: `http://nginx:80` (internal Docker service)

**Additional Headers (Optional - for better security):**
```yaml
X-Forwarded-For: {client_ip}
X-Forwarded-Proto: https
X-Real-IP: {client_ip}
```

**Option B: Via Configuration File (Advanced)**

If you're using a config file for your tunnel, add this ingress rule:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  # Public sharing subdomain
  - hostname: share.monomiagency.com
    service: http://nginx:80
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s

  # Admin panel (existing)
  - hostname: admin.monomiagency.com
    service: http://nginx:80

  # WebSocket tunnel (existing)
  - hostname: ws.monomiagency.com
    service: http://app:5000

  # Catch-all
  - service: http_status:404
```

Then restart the tunnel:
```bash
docker compose -f docker-compose.prod.yml restart cloudflared
```

---

### 3. Verify DNS Propagation

```bash
# Check DNS resolution
dig share.monomiagency.com

# Expected output:
# share.monomiagency.com. 300 IN CNAME <tunnel-id>.cfargotunnel.com.
# <tunnel-id>.cfargotunnel.com. 300 IN A 104.x.x.x (Cloudflare IP)

# Test HTTP access
curl -I https://share.monomiagency.com/api/v1/health
# Expected: 200 OK
```

---

### 4. Update Nginx Configuration (If Needed)

The current `nginx-cloudflare.conf` should handle all domains via the default server block. If you need domain-specific routing, add:

```nginx
# /nginx/nginx-cloudflare.conf

server {
    listen 80;
    server_name share.monomiagency.com;

    # Public sharing routes - NO authentication required
    location /shared/ {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /guest/ {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /api/v1/media-collab/public/ {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Health check
    location /api/v1/health {
        proxy_pass http://app:5000;
    }
}
```

**Apply changes:**
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Testing Checklist

### 1. DNS Resolution
- [ ] `dig share.monomiagency.com` resolves to Cloudflare IP
- [ ] `nslookup share.monomiagency.com` returns CNAME record

### 2. HTTP Access
- [ ] `curl https://share.monomiagency.com/api/v1/health` returns 200 OK
- [ ] Browser access to `https://share.monomiagency.com` (should show frontend)

### 3. Public Sharing Links
```bash
# Generate a test public share link via API
curl -X POST https://admin.monomiagency.com/api/v1/media-collab/projects/1/public-share \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 7}'

# Expected response:
{
  "url": "https://share.monomiagency.com/shared/<token>",
  "token": "<token>",
  "expiresAt": "2025-11-26T..."
}
```

- [ ] Generated URL uses `share.monomiagency.com` (not localhost)
- [ ] URL is accessible without authentication
- [ ] Media loads correctly on public share page
- [ ] Anonymous users can view shared projects

### 4. Guest Invite Links
```bash
# Generate a test guest invite
curl -X POST https://admin.monomiagency.com/api/v1/media-collab/projects/1/guests \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest@example.com",
    "permissions": ["VIEW"],
    "expiresIn": 7
  }'

# Expected response:
{
  "inviteUrl": "https://share.monomiagency.com/guest/accept?token=<token>",
  "email": "guest@example.com",
  "expiresAt": "2025-11-26T..."
}
```

- [ ] Invite URL uses `share.monomiagency.com`
- [ ] Guest can accept invite without existing account
- [ ] Guest can access assigned project media

---

## Rollback Plan (If Issues Occur)

### Remove DNS Record
1. Go to Cloudflare DNS settings
2. Delete `share.monomiagency.com` CNAME record
3. Wait 5 minutes for propagation

### Remove Tunnel Configuration
1. Go to Zero Trust → Tunnels → Public Hostnames
2. Delete `share.monomiagency.com` hostname entry
3. Or remove from config file and restart tunnel

### Revert Backend Code (Emergency Only)
```bash
# Temporarily use FRONTEND_URL for public sharing
docker compose -f docker-compose.prod.yml exec app sh -c "echo 'export PUBLIC_URL=\$FRONTEND_URL' >> /app/.env"
docker compose -f docker-compose.prod.yml restart app
```

---

## Architecture Overview

```
User Request: https://share.monomiagency.com/shared/abc123
           ↓
   Cloudflare DNS (CNAME → tunnel)
           ↓
   Cloudflare Tunnel (ingress rule)
           ↓
   Docker Network: nginx:80
           ↓
   Frontend Container (React app serves /shared route)
           ↓
   API Call: /api/v1/media-collab/public/abc123
           ↓
   Backend Container: app:5000
           ↓
   Database: PostgreSQL (public_shares table)
           ↓
   Cloudflare R2: Media storage
```

---

## Current Configuration Summary

**Environment Variables (`docker-compose.prod.yml`):**
```yaml
FRONTEND_URL: https://admin.monomiagency.com   # Admin panel
PUBLIC_URL:   https://share.monomiagency.com   # Public sharing ✅ NEW
MEDIA_URL:    https://media.monomiagency.com   # Media CDN
```

**Backend Startup Logs:**
```
[URL_CONFIG] ✅ URLs configured correctly:
[URL_CONFIG]    Admin:  https://admin.monomiagency.com
[URL_CONFIG]    Public: https://share.monomiagency.com
[URL_CONFIG]    Media:  https://media.monomiagency.com
```

**Code Changes:**
- ✅ `backend/src/config/url.config.ts` - Centralized URL management
- ✅ `backend/src/modules/media-collab/utils/public-share.util.ts` - Uses `getPublicUrl()`
- ✅ `backend/src/modules/media-collab/utils/token.util.ts` - Uses `getPublicUrl()`
- ✅ `backend/src/main.ts` - Validates URLs on startup
- ✅ `docker-compose.prod.yml` - Added PUBLIC_URL environment variable
- ✅ `backend/src/config/env.validation.ts` - Added PUBLIC_URL to schema

---

## Next Steps

1. **Create DNS Record** (5 minutes)
   - Add CNAME: `share.monomiagency.com` → `<tunnel-id>.cfargotunnel.com`

2. **Update Tunnel Configuration** (5 minutes)
   - Add ingress rule for `share.monomiagency.com` → `http://nginx:80`

3. **Test End-to-End** (10 minutes)
   - Generate new public share link
   - Verify URL uses `share.monomiagency.com`
   - Test anonymous access
   - Verify media loads

4. **Monitor Logs** (Ongoing)
   ```bash
   docker compose -f docker-compose.prod.yml logs -f app frontend nginx cloudflared
   ```

---

## Support

**Documentation References:**
- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- DNS Configuration: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/

**Troubleshooting:**
- Check tunnel status: `docker compose -f docker-compose.prod.yml logs cloudflared`
- Test backend URL generation: `docker compose -f docker-compose.prod.yml exec app node -e "console.log(process.env.PUBLIC_URL)"`
- Verify nginx routing: `docker compose -f docker-compose.prod.yml logs nginx | grep share`
