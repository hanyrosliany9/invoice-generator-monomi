# Share Subdomain Implementation - share.monomiagency.com

**Date:** 2025-11-20
**Decision:** Use `share.monomiagency.com` for public/guest sharing links
**Reason:** Clean separation, leaves root domain for future landing page

---

## Problem

**Current (WRONG):**
```
❌ https://admin.monomiagency.com/shared/em7XCP_KFZLEAszMr2ZWug
   - "admin" word exposes it's an admin panel
   - Unprofessional for clients

❌ http://localhost:3001/shared/em7XCP_KFZLEAszMr2ZWug
   - Localhost URLs in production (critical bug)
```

**Solution:**
```
✅ https://share.monomiagency.com/shared/em7XCP_KFZLEAszMr2ZWug
   - Clean, professional
   - Clear separation: share = public, admin = private
   - Root domain (monomiagency.com) reserved for landing page
```

---

## Architecture

### Domain Structure

| Domain | Purpose | Routes | Authentication |
|--------|---------|--------|----------------|
| `monomiagency.com` | Landing page (future) | `/`, `/about`, `/pricing` | Public |
| `admin.monomiagency.com` | Admin panel | All authenticated routes | JWT Required |
| `share.monomiagency.com` | Public sharing | `/shared/*`, `/guest/*`, `/public/*` | Token-based |
| `ws.monomiagency.com` | WebSocket | WebSocket only | JWT Required |
| `media.monomiagency.com` | Media CDN | `/view/{token}/{key}` | Token-based |

### Infrastructure Flow

```
Public User clicks: https://share.monomiagency.com/shared/abc123
  ↓
Cloudflare Tunnel #3 (share.monomiagency.com)
  ↓
Nginx (public routes only: /shared, /guest, /public)
  ↓
Frontend:3000 (React app)
  ↓
Backend API validates public token
  ↓
Media served via media.monomiagency.com
```

---

## Implementation Steps

### Phase 1: Update Backend (5 minutes) ✅

#### 1.1: Create URL Configuration Module

**File:** `backend/src/config/url.config.ts` (NEW)
```typescript
/**
 * Centralized URL configuration for all environments
 *
 * ADMIN_URL: Admin panel (authenticated users)
 * PUBLIC_URL: Public sharing (anonymous users)
 * MEDIA_URL: Media CDN
 */

export function getAdminUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:3001';
}

export function getPublicUrl(): string {
  // PUBLIC_URL for public sharing, falls back to FRONTEND_URL (backward compat)
  return process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
}

export function getMediaUrl(): string {
  return process.env.MEDIA_URL || 'https://media.monomiagency.com';
}

/**
 * Validate URLs in production
 */
export function validateUrls(): void {
  if (process.env.NODE_ENV === 'production') {
    const publicUrl = getPublicUrl();
    const adminUrl = getAdminUrl();

    if (publicUrl.includes('localhost')) {
      console.error('[URL_CONFIG] ❌ PUBLIC_URL contains localhost in production!');
      console.error('[URL_CONFIG] Set PUBLIC_URL=https://share.monomiagency.com');
    }

    if (adminUrl.includes('localhost')) {
      console.error('[URL_CONFIG] ❌ FRONTEND_URL contains localhost in production!');
      console.error('[URL_CONFIG] Set FRONTEND_URL=https://admin.monomiagency.com');
    }

    console.log('[URL_CONFIG] ✅ URLs configured:');
    console.log(`  Admin:  ${adminUrl}`);
    console.log(`  Public: ${publicUrl}`);
    console.log(`  Media:  ${getMediaUrl()}`);
  }
}
```

#### 1.2: Update Public Share Utility

**File:** `backend/src/modules/media-collab/utils/public-share.util.ts`
```typescript
import { getPublicUrl } from '../../../config/url.config';

/**
 * Generate public share URL
 *
 * Production: https://share.monomiagency.com/shared/{token}
 * Development: http://localhost:3001/shared/{token}
 */
export function generatePublicShareUrl(token: string): string {
  const baseUrl = getPublicUrl();
  return `${baseUrl}/shared/${token}`;
}
```

#### 1.3: Update Guest Invite Utility

**File:** `backend/src/modules/media-collab/utils/token.util.ts`
```typescript
import { getPublicUrl } from '../../../config/url.config';

/**
 * Generate guest invite link
 *
 * Production: https://share.monomiagency.com/guest/accept?token={token}
 * Development: http://localhost:3001/guest/accept?token={token}
 */
export function generateGuestInviteLink(token: string): string {
  const baseUrl = getPublicUrl();
  return `${baseUrl}/guest/accept?token=${token}`;
}
```

#### 1.4: Call URL Validation on App Start

**File:** `backend/src/main.ts`
```typescript
import { validateUrls } from './config/url.config';

async function bootstrap() {
  // ... existing setup ...

  // Validate URLs before starting
  validateUrls();

  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}
```

---

### Phase 2: Update Environment Variables (2 minutes)

#### 2.1: Production Environment

**File:** `docker-compose.prod.yml`
```yaml
app:
  environment:
    - NODE_ENV=production
    - FRONTEND_URL=https://admin.monomiagency.com  # Admin panel
    - PUBLIC_URL=https://share.monomiagency.com    # Public sharing (NEW)
    - MEDIA_URL=https://media.monomiagency.com     # Media CDN
    # ... rest of environment
```

#### 2.2: Development Environment

**File:** `docker-compose.dev.yml`
```yaml
app:
  environment:
    - NODE_ENV=development
    - FRONTEND_URL=http://localhost:3001  # Both admin and public in dev
    - PUBLIC_URL=http://localhost:3001    # Same as frontend in dev
    # ... rest of environment
```

#### 2.3: Environment Validation

**File:** `backend/src/config/env.validation.ts`
```typescript
export class EnvironmentVariables {
  // ... existing variables ...

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3001';

  @IsUrl({ require_tld: false })
  @IsOptional()
  PUBLIC_URL?: string; // Falls back to FRONTEND_URL if not set

  @IsUrl({ require_tld: false })
  @IsOptional()
  MEDIA_URL?: string;
}
```

---

### Phase 3: Configure Cloudflare (10 minutes)

#### 3.1: Add DNS Record

**Cloudflare Dashboard → DNS:**
```
Type: CNAME
Name: share
Content: admin.monomiagency.com (or direct tunnel)
Proxy: ✅ Enabled (orange cloud)
TTL: Auto
```

#### 3.2: Update Cloudflare Tunnel Configuration

**Option A: Add to Existing Tunnel (Easier)**

If using existing tunnel, just add hostname:
```yaml
# Cloudflare Dashboard → Zero Trust → Access → Tunnels → Edit
ingress:
  - hostname: admin.monomiagency.com
    service: http://localhost:80  # Nginx
  - hostname: share.monomiagency.com  # NEW
    service: http://localhost:80  # Same Nginx, different routes
  - hostname: ws.monomiagency.com
    service: http://localhost:5000
  - service: http_status:404
```

**Option B: Create Separate Tunnel (More Isolated)**

```bash
# Create new tunnel
cloudflared tunnel create monomi-share

# Configure
# ~/.cloudflared/config.yml
tunnels:
  - tunnel: <TUNNEL_ID>
    ingress:
      - hostname: share.monomiagency.com
        service: http://localhost:80
      - service: http_status:404
```

---

### Phase 4: Configure Nginx (5 minutes)

#### 4.1: Update Nginx Configuration

**File:** `nginx/nginx-cloudflare.conf`

```nginx
# Admin Panel (authenticated users)
server {
    listen 80;
    server_name admin.monomiagency.com;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $real_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /api/ {
        proxy_pass http://app:5000;
        # ... proxy headers
    }
}

# Public Sharing (anonymous users)
server {
    listen 80;
    server_name share.monomiagency.com;

    # Only allow public routes
    location ~ ^/(shared|guest|public) {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $real_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # API for public endpoints only
    location ~ ^/api/v1/(media-collab/public|media-collab/guest) {
        proxy_pass http://app:5000;
        # ... proxy headers
    }

    # Redirect everything else to admin (safety fallback)
    location / {
        return 301 https://admin.monomiagency.com$request_uri;
    }
}
```

---

### Phase 5: Frontend Updates (Optional - Auto-works)

The frontend doesn't need changes - it just responds to whatever domain it's accessed from. But for clarity:

**File:** `frontend/src/config/api.ts`
```typescript
// API client automatically uses current domain
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  // ... config
});

// No changes needed - works for both admin.* and share.*
```

---

## Testing Plan

### Test 1: Generate Public Share Link

```bash
# 1. Login to admin panel
curl -X POST https://admin.monomiagency.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@monomi.id","password":"password123"}'

# 2. Get project and enable public sharing
curl -X POST https://admin.monomiagency.com/api/v1/media-collab/projects/{projectId}/enable-public-sharing \
  -H "Authorization: Bearer {JWT}"

# Expected response:
{
  "publicShareUrl": "https://share.monomiagency.com/shared/em7XCP_KFZLEAszMr2ZWug",
  "publicShareToken": "em7XCP_KFZLEAszMr2ZWug"
}
```

### Test 2: Access Public Link (No Auth)

```bash
# Should work without any authentication
curl https://share.monomiagency.com/shared/em7XCP_KFZLEAszMr2ZWug
# Returns: HTML page with project media
```

### Test 3: Guest Invite Link

```bash
# Generate guest invite
curl -X POST https://admin.monomiagency.com/api/v1/media-collab/projects/{projectId}/invite-guest \
  -H "Authorization: Bearer {JWT}" \
  -d '{"email":"guest@example.com","role":"VIEWER"}'

# Expected:
{
  "inviteLink": "https://share.monomiagency.com/guest/accept?token=abc123xyz",
  "guestEmail": "guest@example.com"
}
```

### Test 4: Verify Redirect on Wrong Routes

```bash
# Should redirect to admin
curl -I https://share.monomiagency.com/dashboard
# Expected: 301 → https://admin.monomiagency.com/dashboard
```

---

## Rollout Checklist

### Pre-Deploy
- [ ] Backup current configuration
- [ ] Test URL generation in development
- [ ] Review Nginx config for syntax errors

### Deploy Backend
- [ ] Create `url.config.ts` module
- [ ] Update `public-share.util.ts`
- [ ] Update `token.util.ts`
- [ ] Add URL validation to `main.ts`
- [ ] Update environment variables in `docker-compose.prod.yml`
- [ ] Rebuild and deploy backend

### Configure Cloudflare
- [ ] Add DNS record: `share.monomiagency.com`
- [ ] Update tunnel ingress
- [ ] Wait for DNS propagation (1-5 min)

### Configure Nginx
- [ ] Update `nginx-cloudflare.conf`
- [ ] Test Nginx config: `nginx -t`
- [ ] Reload Nginx: `docker compose exec nginx nginx -s reload`

### Verify
- [ ] Check backend logs for URL validation
- [ ] Generate new public share link
- [ ] Verify link uses `share.monomiagency.com`
- [ ] Test anonymous access (incognito browser)
- [ ] Test guest invite link
- [ ] Test redirect from wrong routes

---

## Migration Notes

**Existing Links:**
- Old links with `admin.monomiagency.com` will still work
- Backend will generate new links with `share.monomiagency.com`
- Users can regenerate share links if needed

**Backward Compatibility:**
- `PUBLIC_URL` falls back to `FRONTEND_URL` if not set
- Development uses same URL for both (localhost:3001)
- No breaking changes to API

---

## Summary

**Changes:**
- ✅ New subdomain: `share.monomiagency.com`
- ✅ Backend uses `PUBLIC_URL` for share links
- ✅ Nginx routes public paths to share subdomain
- ✅ URL validation on startup
- ✅ Clean separation: admin vs public

**Benefits:**
- ✅ Professional appearance (no "admin" in URL)
- ✅ Clear separation of concerns
- ✅ Root domain reserved for landing page
- ✅ Backward compatible
- ✅ Easy to maintain

**Timeline:**
- Backend updates: 5 minutes
- Cloudflare setup: 10 minutes
- Nginx config: 5 minutes
- Testing: 5 minutes
- **Total: ~25 minutes**
