# Media Cleanup Service

Automated cleanup system for Cloudflare R2 storage to reduce costs by removing orphaned thumbnails and old temporary files.

## Features

### 1. Automatic Scheduled Cleanup

**Daily Thumbnail Cleanup** (2 AM)
- Runs every day at 2:00 AM
- Deletes thumbnails from soft-deleted assets
- Logs all operations for audit

**Weekly Old File Cleanup** (Sunday 3 AM)
- Runs every Sunday at 3:00 AM
- Permanently deletes soft-deleted assets older than 7 days
- Removes both main files and thumbnails
- Purges database records

### 2. Manual Cleanup Trigger

**Endpoint:** `POST /api/v1/media/cleanup`
**Auth:** Requires `SUPER_ADMIN` role
**Use case:** Testing or immediate cleanup needs

```bash
curl -X POST http://localhost:5000/api/v1/media/cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "data": {
    "deletedThumbnails": 5,
    "deletedFiles": 3,
    "errors": 0
  }
}
```

### 3. Cascade Delete on Asset Deletion

When an asset is deleted via the API, the system automatically:
1. Deletes the main file from R2
2. Extracts thumbnail key from URL
3. Deletes the thumbnail from R2
4. Removes database record (cascade deletes frames, comments, etc.)

**Example:**
```typescript
// In media-assets.service.ts:deleteAsset()
await this.mediaService.deleteFileWithThumbnail(asset.key, asset.thumbnailUrl);
```

## Cost Savings Estimate

### Scenario: Medium Agency (100 videos/month)
- Videos with thumbnails: 100/month
- Thumbnail size: ~200KB average
- Old deleted assets: ~50 files (5GB) accumulate over time

**Without Cleanup:**
- Storage: 5GB × $0.015 = **$0.075/month** (wasted on orphaned files)
- Annual waste: **$0.90/year**

**With Cleanup:**
- Storage cost: **$0** (files deleted within 7 days)
- Annual savings: **$0.90/year**

### Scenario: Large Production Studio (500 videos/month)
- Videos with thumbnails: 500/month
- Thumbnail size: ~200KB average
- Old deleted assets: ~200 files (30GB) accumulate

**Without Cleanup:**
- Storage: 30GB × $0.015 = **$0.45/month** (wasted)
- Annual waste: **$5.40/year**

**With Cleanup:**
- Storage cost: **$0**
- Annual savings: **$5.40/year**

### Enterprise (2000+ videos/month)
- Old files accumulate: ~150GB over time
- **Without cleanup:** $2.25/month = **$27/year wasted**
- **With cleanup:** $0 = **$27/year saved**

## How It Works

### 1. Thumbnail Cleanup Flow
```
Daily at 2 AM
    ↓
Find all assets with thumbnailUrl
    ↓
Filter soft-deleted assets (deletedAt != null)
    ↓
Extract thumbnail key from URL
    ↓
Delete from R2 using MediaService
    ↓
Log results
```

### 2. Old File Cleanup Flow
```
Weekly on Sunday at 3 AM
    ↓
Find soft-deleted assets older than 7 days
    ↓
Delete main file from R2
    ↓
Delete thumbnail from R2 (if exists)
    ↓
Permanently delete database record
    ↓
Log results
```

### 3. Key Extraction Logic
```typescript
// URL: /api/v1/media/proxy/thumbnails/2025-01-08/abc123-video-thumb.jpg
// Extracted key: thumbnails/2025-01-08/abc123-video-thumb.jpg

private extractKeyFromUrl(url: string): string | null {
  const match = url.match(/\/api\/v1\/media\/proxy\/(.+)/);
  return match ? match[1] : null;
}
```

## Configuration

### Environment Variables
No additional env vars required. Uses existing R2 configuration:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Disable Cleanup (Optional)
If you want to disable automated cleanup, comment out the `@Cron` decorators in `media-cleanup.service.ts`:

```typescript
// @Cron(CronExpression.EVERY_DAY_AT_2AM)
async cleanupOrphanedThumbnails() { ... }

// @Cron('0 3 * * 0')
async cleanupOldTemporaryFiles() { ... }
```

## Monitoring

### Check Cleanup Logs
```bash
# Development
docker compose -f docker-compose.dev.yml logs -f app | grep "MediaCleanupService"

# Production
docker compose -f docker-compose.prod.yml logs -f app | grep "MediaCleanupService"
```

### Sample Log Output
```
[MediaCleanupService] 🧹 Starting orphaned thumbnail cleanup...
[MediaCleanupService] ✅ Deleted orphaned thumbnail: thumbnails/2025-01-08/abc123-video-thumb.jpg (soft-deleted asset)
[MediaCleanupService] 🧹 Thumbnail cleanup completed in 1247ms. Deleted: 5, Errors: 0
```

## Testing

### Manual Test (Development)
```bash
# 1. Login as SUPER_ADMIN
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@monomi.id","password":"password123"}'

# 2. Copy JWT token from response

# 3. Trigger manual cleanup
curl -X POST http://localhost:5000/api/v1/media/cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Scheduled Job
```typescript
// In media-cleanup.service.ts, change cron to run every minute
@Cron('* * * * *') // Every minute (for testing only)
async cleanupOrphanedThumbnails() { ... }
```

## Production Recommendations

1. **Monitor First Week** - Check logs daily to ensure cleanup works correctly
2. **Adjust Timing** - Change cron schedule if 2 AM doesn't work for your timezone
3. **Adjust Retention** - Change 7-day retention period if needed (line 100 in service)
4. **Alert on Errors** - Integrate with monitoring service (Sentry, Datadog, etc.)

## Troubleshooting

### Cleanup Not Running
1. Check if ScheduleModule is imported in MediaModule
2. Verify R2 credentials are valid
3. Check server timezone: `date` in container

### High Error Count
1. Check R2 bucket permissions
2. Verify thumbnail URLs are correctly formatted
3. Check network connectivity to R2

### Files Not Deleted
1. Verify assets have `deletedAt` timestamp (soft delete)
2. Check if files are older than 7 days
3. Manually trigger cleanup to test: `POST /api/v1/media/cleanup`

## Architecture

```
MediaModule
├── MediaService (R2 operations)
├── MediaController (API endpoints)
└── MediaCleanupService (scheduled jobs)
    ├── @Cron daily at 2 AM → cleanupOrphanedThumbnails()
    ├── @Cron weekly Sunday 3 AM → cleanupOldTemporaryFiles()
    └── manualCleanup() → Manual trigger API
```

## Related Files

- `backend/src/modules/media/services/media-cleanup.service.ts` - Main cleanup logic
- `backend/src/modules/media/media.service.ts` - R2 delete operations
- `backend/src/modules/media/media.controller.ts` - Manual cleanup endpoint
- `backend/src/modules/media/media.module.ts` - Module configuration
- `backend/src/modules/media-collab/services/media-assets.service.ts` - Asset deletion with cascade

## Future Enhancements

- [ ] Add Cloudflare R2 lifecycle policies (alternative to cron jobs)
- [ ] Implement cleanup dashboard with statistics
- [ ] Add webhook notifications for cleanup events
- [ ] Support for selective cleanup by project/folder
- [ ] Dry-run mode for testing without actual deletion
