# Content Planning Calendar - Setup & Deployment Guide

## Overview

The Content Planning Calendar feature has been successfully implemented! This guide will help you configure Cloudflare R2 storage and deploy the feature.

## Implementation Summary

### ✅ Completed Features

**Backend (NestJS):**
- ✅ Database schema with Prisma migrations
  - `ContentCalendarItem` model for content items
  - `ContentMedia` model for media attachments
  - Relations with User, Client, Project, Campaign
- ✅ MediaService for R2 integration
  - Upload/delete files to/from Cloudflare R2
  - S3-compatible API using `@aws-sdk/client-s3`
  - File validation (type, size)
- ✅ ContentCalendarService for business logic
  - CRUD operations
  - Publishing and archiving workflows
  - Permission-based access control
- ✅ REST API endpoints
  - `GET /content-calendar` - List all content
  - `GET /content-calendar/:id` - Get single content
  - `POST /content-calendar` - Create content
  - `PUT /content-calendar/:id` - Update content
  - `DELETE /content-calendar/:id` - Delete content
  - `POST /content-calendar/:id/publish` - Publish content
  - `POST /content-calendar/:id/archive` - Archive content
  - `POST /media/upload` - Upload single file
  - `POST /media/upload-multiple` - Upload multiple files
  - `DELETE /media/:key` - Delete file

**Frontend (React + Ant Design):**
- ✅ ContentCalendarPage with full UI
  - Table view with sorting and filtering
  - Create/Edit modal with form validation
  - Media upload with preview
  - Status management (Draft, Scheduled, Published, Archived)
  - Multi-platform selection (Instagram, TikTok, Facebook, Twitter, LinkedIn, YouTube)
- ✅ Service integration
  - Axios-based API client
  - React Query for data fetching and caching

---

## Setup Instructions

### Step 1: Cloudflare R2 Configuration

#### 1.1 Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the sidebar
3. Click **Create Bucket**
4. Enter bucket name: `content-media` (or your preferred name)
5. Select location: **Automatic** (recommended)
6. Click **Create Bucket**

#### 1.2 Configure Public Access

1. Open the bucket you just created
2. Go to **Settings** tab
3. Scroll to **Public Access**
4. Click **Allow Access** to enable public reads
5. Note the **Public Bucket URL** (e.g., `https://pub-xxxxxxxxxxxxx.r2.dev`)

#### 1.3 Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Enter token name: `content-media-api`
4. Permissions: **Object Read & Write**
5. Select bucket: `content-media` (or your bucket name)
6. Click **Create API Token**
7. **IMPORTANT**: Copy and save these values immediately:
   - **Access Key ID** (e.g., `abc123def456...`)
   - **Secret Access Key** (e.g., `xyz789uvw...`)
   - **Endpoint URL** (e.g., `https://<account_id>.r2.cloudflarestorage.com`)

   **⚠️ You won't be able to see the secret key again!**

#### 1.4 Get Account ID

1. Go to Cloudflare Dashboard home
2. Click on any domain or R2
3. Look at the URL bar or right sidebar
4. Copy your **Account ID** (e.g., `1234567890abcdef...`)

---

### Step 2: Environment Configuration

#### 2.1 Update Backend .env

Add the following R2 configuration to `backend/.env`:

```bash
# ===========================================
# CLOUDFLARE R2 STORAGE (Content Planning Calendar)
# ===========================================
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=content-media
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
MAX_FILE_SIZE_MB=100
```

**Replace the placeholders:**
- `your-cloudflare-account-id` → Your Account ID from Step 1.4
- `your-r2-access-key-id` → Access Key ID from Step 1.3
- `your-r2-secret-access-key` → Secret Access Key from Step 1.3
- `https://pub-xxxxxxxxxxxxx.r2.dev` → Public Bucket URL from Step 1.2
- `https://<account_id>.r2.cloudflarestorage.com` → Replace `<account_id>` with your Account ID

#### 2.2 Verify Configuration

The R2 configuration is **optional** - the app will work without it, but media upload will be disabled.

To verify R2 is configured correctly:
1. Start the app: `./scripts/manage-dev.sh start`
2. Check logs: `./scripts/manage-dev.sh logs -f app`
3. Look for: `✅ R2 client initialized for bucket: content-media`
4. If you see `⚠️ R2 credentials not configured`, check your `.env` file

---

### Step 3: Database Migration

The database migration has already been applied! The migration file is:
- `backend/prisma/migrations/20251108103500_add_content_planning_calendar/migration.sql`

**To verify the migration:**
```bash
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma migrate status"
```

**If you need to re-apply:**
```bash
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma migrate deploy"
```

---

### Step 4: Restart Application

After configuring R2, restart the application to load the new environment variables:

```bash
# Development
./scripts/manage-dev.sh restart

# Production
./scripts/manage-prod.sh restart
```

---

## Usage Guide

### Accessing the Content Calendar

1. **URL**: `http://localhost:3001/content-calendar` (development)
2. **Authentication**: Login with your user account
3. **Required Roles**:
   - SUPER_ADMIN (full access)
   - PROJECT_MANAGER (full access)
   - STAFF (create, read, update own content)

### Creating Content

1. Click **Create Content** button
2. Fill in the form:
   - **Title** (required)
   - **Description** (optional)
   - **Scheduled At** (optional - for scheduling)
   - **Status** (DRAFT, SCHEDULED, PUBLISHED, etc.)
   - **Platforms** (select one or more)
3. Upload media:
   - Click **Upload Media** button
   - Select images or videos (max 100MB per file)
   - Supported formats: JPEG, PNG, GIF, WebP, MP4, MOV, AVI, WebM
4. Click **OK** to save

### Publishing Content

1. Find the content item in the table
2. Click the **Rocket** icon (Publish)
3. Confirm the action
4. Content status will change to **PUBLISHED**

### Filtering Content

Use the filter dropdowns to:
- Filter by **Status** (DRAFT, SCHEDULED, PUBLISHED, etc.)
- Filter by **Platform** (Instagram, TikTok, Facebook, etc.)

---

## API Testing

### Test Media Upload

```bash
# Login first to get token
TOKEN="your-jwt-token"

# Upload a single file
curl -X POST http://localhost:5000/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg"

# Expected response:
{
  "success": true,
  "data": {
    "url": "https://pub-xxxxx.r2.dev/content/2025-01-08/abc123-image.jpg",
    "key": "content/2025-01-08/abc123-image.jpg",
    "size": 123456,
    "mimeType": "image/jpeg"
  }
}
```

### Test Content Creation

```bash
curl -X POST http://localhost:5000/content-calendar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Content",
    "description": "This is a test content item",
    "status": "DRAFT",
    "platforms": ["INSTAGRAM", "FACEBOOK"],
    "media": [
      {
        "url": "https://pub-xxxxx.r2.dev/content/2025-01-08/abc123-image.jpg",
        "key": "content/2025-01-08/abc123-image.jpg",
        "mimeType": "image/jpeg",
        "size": 123456
      }
    ]
  }'
```

### Test Content Retrieval

```bash
# Get all content items
curl -X GET http://localhost:5000/content-calendar \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "http://localhost:5000/content-calendar?status=PUBLISHED" \
  -H "Authorization: Bearer $TOKEN"

# Filter by platform
curl -X GET "http://localhost:5000/content-calendar?platform=INSTAGRAM" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### R2 Upload Fails

**Error**: `Failed to upload file: The specified bucket does not exist`

**Solution**:
1. Check bucket name in `.env` matches your R2 bucket
2. Verify bucket exists in Cloudflare Dashboard
3. Ensure API token has access to this bucket

---

**Error**: `Failed to upload file: Access Denied`

**Solution**:
1. Verify API credentials in `.env` are correct
2. Check API token permissions (should have "Object Read & Write")
3. Ensure bucket has public access enabled for reads

---

**Error**: `Media upload is not available. R2 storage is not configured.`

**Solution**:
1. Check all R2 environment variables are set in `.env`
2. Restart the application: `./scripts/manage-dev.sh restart`
3. Check logs for R2 initialization message

---

### Frontend Upload Not Working

**Error**: `Network Error` or `403 Forbidden`

**Solution**:
1. Check backend is running: `./scripts/manage-dev.sh status`
2. Verify JWT token is valid (login again if expired)
3. Check CORS settings in backend (FRONTEND_URL in `.env`)
4. Open browser console for detailed error messages

---

### Database Migration Issues

**Error**: `Migration has already been applied`

**Solution**:
- This is normal! The migration has already been applied.
- Verify with: `npx prisma migrate status`

---

**Error**: `Migration failed to apply`

**Solution**:
1. Check database is running: `./scripts/manage-dev.sh db-shell`
2. Reset database (⚠️ **DANGER** - deletes all data):
   ```bash
   docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npm run db:reset"
   ```
3. Re-apply migrations:
   ```bash
   docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma migrate deploy"
   ```

---

## Cost Analysis

### Cloudflare R2 Pricing

**Free Tier (Forever):**
- ✅ **Storage**: 10 GB/month
- ✅ **Class A Operations** (Write, List): 1 million requests/month
- ✅ **Class B Operations** (Read): 10 million requests/month
- ✅ **Egress Bandwidth**: UNLIMITED (zero cost!)

**Paid Tier (if exceeded):**
- **Storage**: $0.015/GB/month (after 10 GB)
- **Class A Operations**: $4.50 per million requests (after 1M)
- **Class B Operations**: $0.36 per million requests (after 10M)
- **Egress**: $0.00 (always free!)

**Example Costs:**
- **10GB storage + 1M uploads + 10M downloads**: **$0.00/month** ✅
- **50GB storage + 5M uploads + 50M downloads**: **$18.60/month**
  - Storage: 40GB × $0.015 = $0.60
  - Class A: 4M × $4.50 = $18.00
  - Class B: 40M × $0.36 = $0.00 (first 10M free)

---

## Security Considerations

### API Token Security

1. **Never commit** API tokens to version control
2. Store tokens in `.env` (already gitignored)
3. Use separate API tokens for dev/staging/production
4. Rotate tokens every 90 days (recommended)

### CORS Configuration

The backend automatically handles CORS based on `FRONTEND_URL` in `.env`:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

### File Upload Validation

The backend validates:
- ✅ File size (max 100MB by default)
- ✅ File type (images and videos only)
- ✅ MIME type checking
- ✅ User authentication and authorization

---

## Support & Documentation

- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/
- **AWS SDK S3 Client**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- **Prisma Docs**: https://www.prisma.io/docs/
- **NestJS Docs**: https://docs.nestjs.com/
- **Ant Design**: https://ant.design/components/overview/

---

## Next Steps

1. ✅ Configure Cloudflare R2 (Step 1)
2. ✅ Update environment variables (Step 2)
3. ✅ Restart application (Step 4)
4. Test media upload via UI
5. Create test content items
6. Integrate with existing campaigns/projects
7. Add navigation menu item for Content Calendar
8. Configure production R2 bucket

---

**🎉 Content Planning Calendar is ready to use!**

For questions or issues, check the troubleshooting section or review the implementation plan in `CONTENT_PLANNING_R2_IMPLEMENTATION_PLAN.md`.
